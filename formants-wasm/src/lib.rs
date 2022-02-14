extern crate cfg_if;
extern crate wasm_bindgen;
extern crate nalgebra as na;
extern crate automatica as aut;
extern crate web_sys;

mod utils;
mod weights;
mod autocorrelate;

use cfg_if::cfg_if;
use wasm_bindgen::prelude::*;
use na::{DMatrix, Complex};
use aut::polynomial::{ Poly };
use std::f32::consts::{ PI };
use std::convert::TryInto;

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
    solved: bool,
  
    signal : Vec<f32>,
   
    correlation : Vec<f32>,
    input : Vec<f32>,
    target : Vec<f32>,

    toeplitz_indices : Vec<usize>,
    toeplitz : Vec<f32>,
    coefficients : Vec<f32>,

    filter_inputs : Vec<Complex<f32>>,
    filter_frequencies : Vec<f32>,
    filter_outputs : Vec<Complex<f32>>,
    filter_magnitude : Vec<f32>,

    formant_indices : Vec<u32>,
    formant_count : u32,

    pole_real_values : Vec<f32>,
    pole_imag_values : Vec<f32>,
    pole_frequencies : Vec<f32>,
    pole_bandwidths : Vec<f32>,
    pole_count : u32,
}

#[wasm_bindgen]
impl BlockData {
    pub fn new(block_size : usize, model_order: usize, frequency_bins: usize, sample_rate : u32) -> BlockData {
        utils::set_panic_hook();

        let p = model_order + 1;
        let signal : Vec<f32> = vec![0.0; block_size];
        
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

        let expected_num_formants = model_order as usize;
        let formant_indices : Vec<u32> = Vec::with_capacity(expected_num_formants);

        let pole_real_values : Vec<f32> = vec![0.0; expected_num_formants];
        let pole_imag_values : Vec<f32> = vec![0.0; expected_num_formants];
        let pole_frequencies : Vec<f32> = vec![0.0; expected_num_formants];
        let pole_bandwidths : Vec<f32> = vec![0.0; expected_num_formants];
        
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

        // Make the #{frequency_bins} complex roots of unity; we'll use these
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
            solved: false,

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

            formant_indices: formant_indices,
            formant_count: 0,
            
            pole_real_values: pole_real_values,
            pole_imag_values: pole_imag_values,
            pole_frequencies: pole_frequencies,
            pole_bandwidths: pole_bandwidths,
            pole_count: 0
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

    pub fn formants_pointer(&self) -> *const u32 {
        self.formant_indices.as_ptr()
    }

    pub fn formants_count(&self) -> u32 {
        self.formant_count
    }

    pub fn pole_real_pointer(&self) -> *const f32 {
        self.pole_real_values.as_ptr()
    }

    pub fn pole_imag_pointer(&self) -> *const f32 {
        self.pole_imag_values.as_ptr()
    }

    pub fn pole_frequencies_pointer(&self) -> *const f32 {
        self.pole_frequencies.as_ptr()
    }

    pub fn pole_bandwidths_pointer(&self) -> *const f32 {
        self.pole_bandwidths.as_ptr()
    }

    pub fn pole_count(&self) -> u32 {
        self.pole_count
    }

    pub fn get_solved_state(&self) -> bool {
        self.solved
    }
}


#[wasm_bindgen]
pub fn run_lpc(block : &mut BlockData) -> bool {
    // apply hann weights???
    weights::apply_hann_weights(block);
    
    // pre-emphasis
    preemphasis_filter(block);

    // run main
    autocorrelate::autocorrelate(block);
    build_vector_pair(block);
    build_toeplitz_matrix(block);

    let succeeded = solve_coefficients(block);

    // only continue of the data is real.
    if succeeded {
        block.solved = succeeded;
        evaluate_envelope(block);
        extract_maxima(block);
        find_roots(block);
    }

    succeeded
}

pub fn preemphasis_filter(block: &mut BlockData) {
    let mut prev_signal_step = block.signal[0];

    const A : f32  = 1.0;
    const B : f32 = -0.68;
    
    for i in 1..block.block_size {
        let updated_signal_step = A * block.signal[i] + B * prev_signal_step;
        prev_signal_step = block.signal[i];
        block.signal[i] = updated_signal_step;
    }
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

pub fn solve_coefficients(block: &mut BlockData) -> bool {
    let forward = DMatrix::from_row_slice(block.model_order, block.model_order, &block.toeplitz);
    let mut inverse = DMatrix::identity(block.model_order, block.model_order);
    let result = na::linalg::try_invert_to(forward.transpose(), &mut inverse);
    
    if !result { return false }


    let target = DMatrix::from_vec(block.model_order, 1, block.target.clone());
    let coefficients = inverse * target;

    for i in 0..block.model_order {
        block.coefficients[i + 1] = coefficients[(i, 0)];
    }

    return true;
}

// Try to solve for the roots of the LPC polynomial
// and evaluate the formants that way...

pub fn find_roots(block: &mut BlockData) {
    let poly = Poly::new_from_coeffs(&block.coefficients);
    let roots = poly.iterative_roots();
    let twopi = 2.0 * PI;
    let f_s = block.sample_rate as f32;

    block.pole_count = 0;

    // log!("\nrun:");

    let mut j = 0;
    for i in 0..roots.len() {
        let root = roots[i];

        // ignore purely real or imaginary roots;
        if root.im.abs() < 0.0001 || root.re.abs() < 0.0001 { continue; }
        // ignore conjugate pairs, by randomly selecting the positive pair.
        if root.im < 0.0 { continue; }

        let angle = root.arg();
        let magnitude = root.norm();
        let freq = (f_s / twopi) * angle;
        let bandwidth = (f_s / PI) * (1.0 / magnitude).ln().abs();

        block.pole_real_values[j] = root.re;
        block.pole_imag_values[j] = root.im;
        block.pole_frequencies[j] = freq;
        block.pole_bandwidths[j] = bandwidth;
        block.pole_count += 1;
        j += 1;

        // log!("{:?}", roots[i]);
        // log!("\nfreq: {} Hz", freq);
        // log!("bw: {} Hz", bandwidth);
        // log!("mag: {}\n", magnitude);

    }
    // log!("end run\n");
}


// Directly evaluate the spectrum of the filter envelope
// and return the maxima of the filter.
pub fn evaluate_envelope(block: &mut BlockData) {
    for i in 0..block.frequency_bins {
        let mut sum : Complex<f32> = Complex::new(block.coefficients[0], 0.0);
        let z = block.filter_inputs[i];

        
        for j in 1..(block.model_order + 1) {
            // remove all real and imaginary roots.
            let term = block.coefficients[j] * z.powu(j as u32);
            sum += term;
        }

        let y = sum.inv();
        block.filter_outputs[i] = y;
        block.filter_magnitude[i] = y.norm_sqr().sqrt()
    }
}

pub fn extract_maxima(block: &mut BlockData) {
    const WINDOW_WIDTH : usize = 1;

    block.formant_count = 0;
    block.formant_indices.clear();

    for i in WINDOW_WIDTH..(block.frequency_bins - WINDOW_WIDTH) {
        let mut is_maximum = true;
        let candidate_point = block.filter_magnitude[i];

        for di in (i - WINDOW_WIDTH)..(i + WINDOW_WIDTH + 1) {
            let j : usize = di.try_into().unwrap();
            is_maximum &= block.filter_magnitude[j] <= candidate_point;
        }

        if is_maximum { 
            // log!("{}", i as u32);
            block.formant_indices.push(i as u32);
            block.formant_count += 1;
        }
    }
}