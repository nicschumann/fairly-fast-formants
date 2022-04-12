use crate::BlockData;

pub fn autocorrelate(block: &mut BlockData) {
    let n = block.block_size;
    let p = block.model_order + 1;

    for i in 0..p {
        let mut inner_product : f32 = 0.0;
        
        let mut k = 0;

        // single inner product loop...
        for j in i..n { 
               
            let a = block.signal[j];
            let b = block.signal[k];
            inner_product += a * b;
            
            k += 1;
        }

        block.correlation[i] = inner_product;
    }
}