import { BlockData } from 'src-wasm';
import { BlockMemory } from './memory';

export interface Formant {
    bin_index : number,
    frequency : number,
    amplitude : number,
};

export interface FormantHistory {
    alpha : number,
    formant_count: number,
    max_length : number,
    raw_formants: Formant[][],
    smooth_formants: Formant[][],
    current_average: Formant[],
};


export const initialize_history = (formants_to_track: number, max_length: number, alpha : number = 0.01) : FormantHistory => {
    return {
        alpha: alpha,
        formant_count : formants_to_track,
        max_length: max_length,
        raw_formants: [],
        smooth_formants: [],
        current_average: [],
    }
};

const cma = (prev: Formant, curr: Formant, n : number = 5) : Formant => {
    return {
        bin_index: (prev.bin_index * n + curr.bin_index) / (n + 1),
        frequency: (prev.frequency * n + curr.frequency) / (n + 1),
        amplitude: (prev.amplitude * n + curr.amplitude) / (n + 1),
    }
}

const ewma = (prev: Formant, curr: Formant, alpha : number = 0.5) : Formant => {
    let one_minus_alpha = 1.0 - alpha;
    return {
        bin_index: alpha * curr.bin_index + one_minus_alpha * prev.bin_index,
        frequency: alpha * curr.frequency + one_minus_alpha * prev.frequency,
        amplitude: alpha * curr.amplitude + one_minus_alpha * prev.amplitude,
    }
}


export const add_formants_to_history = (formants : Formant[], history: FormantHistory) : FormantHistory => {
    let local_formants = [...formants];
    if (history.raw_formants.length >= history.max_length) { history.raw_formants.shift(); }
    if (history.current_average.length == 0) { history.current_average = local_formants.slice(0, history.formant_count); }
    if (history.smooth_formants.length >= history.max_length) { history.smooth_formants.shift(); }

    let a = history.alpha;
    let one_minus_a = 1 - a;

    // step 0: push the raw detections onto the raw formant history
    history.raw_formants.push(formants);

    let new_average : Formant[] = []

    for (let fa_i = 0; fa_i < history.formant_count; fa_i++) {
        let formant_average = history.current_average[fa_i];
        let formant : Formant = null;
        let min_error = Infinity;
        let index = -1;

        // scan formants for the closest matches with the current averages.
        if (local_formants.length > 0) {
            for (let i = 0; i < local_formants.length; i++) {
                let current_formant = local_formants[i];
    
                let current_error = Math.pow(formant_average.frequency - current_formant.frequency, 2);
    
                if (current_error < min_error) {
                    formant = current_formant;
                    min_error = current_error;
                    index = i;
                }
            }
    
            local_formants.splice(index, 1);
            new_average.push(cma(formant_average, formant, 5));

        } else {

            // no new detections, just push the old average in...
            new_average.push(formant_average);
        }
    }
    
    history.current_average = new_average;
    history.smooth_formants.push(new_average);
    
    return history;
};

export const get_formants_from_memory = (block_data: BlockData, block_memory: BlockMemory) : Formant[] => {
    let formant_count = block_data.formants_count();

    let formant_data = block_memory.formants.slice(0, formant_count);
    let formants : Formant[] =  [];

    formant_data.forEach((index, i) => {
        formants.push({
            bin_index: index,
            frequency: block_memory.envelope_frequencies[index],
            amplitude: block_memory.envelope_data[index]
        });
    });

    console.log(formants);

    // console.log(formants);
    return formants;
    // return normalize_formants(formants);
};




/**
 * This is my least favorite transform in this entire project. It's job
 * Is to go through the raw formants from wasm and remove spurious low 
 * frequency spikes, and merge formant detections that are "too close together"
 * by some arbitrary metric. It takes a long time to do, and is annoying.
 * 
 * @param candidates 
 * @returns Formant[] array of formants with spurious candidates removed.
 */
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