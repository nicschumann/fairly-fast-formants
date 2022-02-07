extern crate cfg_if;
extern crate wasm_bindgen;
extern crate nalgebra as na;
extern crate js_sys;
extern crate web_sys;

mod utils;
mod weights;
mod autocorrelate;

use cfg_if::cfg_if;
use wasm_bindgen::prelude::*;
use na::{DMatrix, Complex};
use std::f32::consts::{ PI };

cfg_if! {
    if #[cfg(feature = "wee_alloc")] {
        extern crate wee_alloc;
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}

#[allow(unused_macros)]
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

#[wasm_bindgen]
pub struct BlockData {
    block_size : usize,
    model_order : usize,
    frequency_bins: usize,
    sample_rate: u32,
  
    signal : Vec<f32>, // the memory
   
    correlation : Vec<f32>, // the autocorrelation of the memory
    input : Vec<f32>,
    target : Vec<f32>,

    toeplitz_indices : Vec<usize>,
    toeplitz : Vec<f32>,
    coefficients : Vec<f32>,

    filter_inputs : Vec<Complex<f32>>,
    filter_frequencies : Vec<f32>,
    filter_outputs : Vec<Complex<f32>>,
    filter_magnitude : Vec<f32>,
}

pub struct FormantData {

}

#[wasm_bindgen]
impl BlockData {
    pub fn new(block_size : usize, model_order: usize, sample_rate : u32) -> BlockData {
        utils::set_panic_hook();

        let p = model_order + 1;
        let signal : Vec<f32> = vec![0.0; block_size];
        let frequency_bins = 512;
        
        let correlation : Vec<f32> = vec![0.0; p];
        let input : Vec<f32> = vec![0.0; model_order];
        let target : Vec<f32> = vec![0.0; model_order];

        let mut toeplitz_indices : Vec<usize> = vec![20; model_order * model_order];
        let toeplitz : Vec<f32> = vec![0.0; model_order * model_order];
        let coefficients : Vec<f32> = vec![1.0; p];

        let mut filter_inputs : Vec<Complex<f32>> = vec![Complex::new(0.0, 0.0); frequency_bins];
        let mut filter_frequencies : Vec<f32> = vec![0.0; frequency_bins];
        let filter_outputs : Vec<Complex<f32>> = vec![Complex::new(0.0, 0.0); frequency_bins];
        let filter_magnitude : Vec<f32> = vec![0.0; frequency_bins];

        
        // prepare toeplitz indices; we'll use these 
        // to make the toeplitz matrix later.
        for r in 0..model_order {
                if r > 0 {
                    for j in (0..r).rev() {
                        toeplitz_indices[r * model_order + j] = r - j;
                    }
                }
    
                for j in r..model_order {
                    toeplitz_indices[r * model_order + j] = j - r;
                }
        }

        // Make the unit frequencies; we'll use these
        // to evaluate the filter polynomial later.
        let fs = sample_rate as f32;
        for i in 0..frequency_bins {
            let n = frequency_bins as f32;
            let omega = (PI / n) * (i as f32);
            let freq = omega * fs / (2.0 * PI);
            let z : Complex<f32> = omega.cos() + Complex::i() * omega.sin(); 

            filter_inputs[i] = z;
            filter_frequencies[i] = freq;
        }
        
        BlockData {
            block_size: block_size,
            model_order : model_order,
            frequency_bins : frequency_bins,
            sample_rate: sample_rate,

            signal: signal, 

            correlation: correlation,
            input : input,
            target : target,

            toeplitz_indices: toeplitz_indices,
            toeplitz: toeplitz,
            coefficients: coefficients,

            filter_inputs: filter_inputs,
            filter_frequencies: filter_frequencies,
            filter_outputs: filter_outputs,
            filter_magnitude: filter_magnitude,
        }
    }

    pub fn signal_pointer(&self) -> *const f32 {
        self.signal.as_ptr()
    }

    pub fn coefficient_pointer(&self) -> *const f32 {
        self.coefficients.as_ptr()
    }

    pub fn filter_magnitude_pointer(&self) -> *const f32 {
        self.filter_magnitude.as_ptr()
    }

    pub fn filter_frequencies_pointer(&self) -> *const f32 {
        self.filter_frequencies.as_ptr()
    }
}

#[wasm_bindgen]
pub fn block_sum(block : &BlockData) -> f32 {
    let mut total = 0.0;

    for i in 0..block.block_size {
        total += block.signal[i]
    }

    total
}

#[wasm_bindgen]
pub fn apply_weights(block : &mut BlockData) {
    weights::apply_hann_weights(block);
}

#[wasm_bindgen]
pub fn run_lpc(block : &mut BlockData) {
    autocorrelate::autocorrelate(block);

    // set input and output data as 
    // to appropriate subsets of the correlation.
    build_vector_pair(block);
    build_toeplitz_matrix(block);
    solve_coefficients(block);
    evaluate_envelope(block);
}


pub fn build_vector_pair(block: &mut BlockData) {
    for i in 0..block.model_order {
        block.input[i] = block.correlation[i];
        block.target[i] = -1.0 * block.correlation[i + 1];
    }
}

pub fn build_toeplitz_matrix(block: &mut BlockData) {
    for i in 0..(block.model_order * block.model_order) {
        let t_i = block.toeplitz_indices[i];
        block.toeplitz[i] = block.input[t_i];
    }
}

pub fn solve_coefficients(block: &mut BlockData) {
    let forward = DMatrix::from_row_slice(block.model_order, block.model_order, &block.toeplitz);
    let mut inverse = DMatrix::identity(block.model_order, block.model_order);
    let _result = na::linalg::try_invert_to(forward.transpose(), &mut inverse);


    let target = DMatrix::from_vec(block.model_order, 1, block.target.clone());
    let coefficients = inverse * target;

    for i in 0..block.model_order {
        block.coefficients[i + 1] = coefficients[(i, 0)];
    }
}

pub fn evaluate_envelope(block: &mut BlockData) {
    for i in 0..block.frequency_bins {
        let mut sum : Complex<f32> = Complex::new(block.coefficients[0], 0.0);
        let z = block.filter_inputs[i];
        
        for j in 1..(block.model_order + 1) {
            let term = block.coefficients[j] * z.powu(j as u32);
            sum += term;
        }

        let y = sum.inv();
        block.filter_outputs[i] = y;
        block.filter_magnitude[i] = y.norm_sqr().sqrt()
    }
}