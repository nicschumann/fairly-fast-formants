import { BlockData } from 'src-wasm';
import { BlockMemory } from './memory';

export interface Formant {
    bin_index : number,
    frequency : number,
    amplitude : number,
};

export const get_formants_from_memory = (block_data: BlockData, block_memory: BlockMemory) : Formant[] => {
    let formant_count = block_data.formants_count();

    let formant_data = block_memory.formants.slice(0, formant_count);
    let formants = <Formant[]> [];

    formant_data.forEach((index, i) => {
        formants.push({
            bin_index: index,
            frequency: block_memory.envelope_frequencies[index],
            amplitude: block_memory.envelope_data[index]
        });
    });

    // console.log(formants);
    // return formants;
    return normalize_formants(formants);
};

// My least favorite transform:
// PS. it takes more time to do this entire normalization
// in javascript than it does to run the entire LPC analysis in wasm.
// :c
const normalize_formants = (candidates : Formant[]) : Formant[] => {
	// candidates.length <= 5
	// candidats is in order of frequency.
	let formants = <Formant[]> [], i = 0;
	const FORMANT_CUTOFF = 120; 
	// ^^ If two formants are within Hz of eachother,
	// consider them as spurious detections and average them
	// based on their amplitudes?

	while (candidates.length > 0) {
		let max_formant_i = -1;
		let max_formant = <Formant> {bin_index: -1, frequency: 0.0, amplitude: -Infinity};

		for (let i = 0; i < candidates.length; i++) {
			if (candidates[i].amplitude > max_formant.amplitude) {
				max_formant = candidates[i]
				max_formant_i = i
			}
		}

		// some logic to smooth formants that are within
		// formant bandwidth of eachother...
		let remove_until = max_formant_i;

		for (let i = 0; i < candidates.length; i++) {
			if (i == max_formant_i) continue;

            let candidate = candidates[i];

			if (Math.abs(candidate.frequency - max_formant.frequency) < FORMANT_CUTOFF ) {

				// do a better way of weighting these?
				let amp_sum = candidate.amplitude + max_formant.amplitude;
				let a = candidate.amplitude / amp_sum;
				let b = max_formant.amplitude / amp_sum;
				
				max_formant.frequency = Math.floor(a * candidate.frequency + b * max_formant.frequency)
                max_formant.amplitude = a * candidate.amplitude + b * max_formant.amplitude
				max_formant.bin_index = a * candidate.bin_index + b * max_formant.bin_index; 

				// we'll get the ones that are less on the next pass.
				remove_until = Math.max(max_formant_i, i);
			}
		}

		formants.push(max_formant);
		candidates.splice(0, remove_until + 1);
	}

	return formants;
}