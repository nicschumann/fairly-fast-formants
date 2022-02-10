use crate::BlockData;
use std::f32::consts::{ PI };

pub fn apply_hann_weights(block : &mut BlockData) {
    let twopi : f32 = 2.0 * PI; 
    let denom : f32 = block.block_size as f32;

    for i in 0..block.block_size {
        let index : f32 = i as f32;
        block.signal[i] *= 0.5 * (1.0 - (twopi * index / denom).cos());
    }
}