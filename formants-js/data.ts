import { BlockData } from '../formants-wasm/pkg';
import { BlockMemory } from './memory';

export interface Formant {
    time_step : number,
    bin_index : number,
    frequency : number,
    amplitude : number,
};

export interface Pole {
    time_step : number,
    imag: number,
    real: number,
    frequency : number,
    bandwidth : number,
}

export interface FormantAverage {
    mean : number,
    stdev : number,
    formant_data : Formant[]
};

export interface FormantHistoryData {
    max_length : number,
    raw_formants: Formant[][],
    averages : FormantAverage[]
};

export const initialize_history = (max_length : number) : FormantHistoryData => {
    return {
        max_length: max_length,
        raw_formants: [],
        averages: [],
    };
};

const cma = (prev: number, curr: number, n : number = 5) : number => {
    return (prev * n + curr) / (n + 1);
}

const ewma = (prev: number, curr: number, alpha : number = 0.5) : number => {
    return alpha * curr + (1 - alpha) * prev;
}


const formant_to_average = (formant: Formant) : FormantAverage => {
    return {
        mean: formant.frequency,
        stdev: 50, // update this with a principled base
        formant_data: [formant]
    }
};

const update_average_with_formant = (average : FormantAverage, formant: Formant, history: FormantHistoryData): FormantAverage => {
    if (average.formant_data.length > history.max_length) { average.formant_data.shift(); }
    average.formant_data.push(formant);

    let N = average.formant_data.length;
    let alpha = 0.8;
    let mean = average.formant_data.reduce((a,b) => a + b.frequency, 0) / N;
    let stdev = Math.sqrt(average.formant_data.reduce((a,b) => a + Math.pow(average.mean - b.frequency, 2), 0) / N);

    average.mean = mean
    average.stdev = ewma(average.stdev, stdev, alpha);

    return average;
}

export const add_formants_to_history = (formants : Formant[], history: FormantHistoryData) : FormantHistoryData => {
    let local_formants = [...formants];
    let local_averages = [...history.averages];
    if (history.raw_formants.length >= history.max_length) { history.raw_formants.shift(); }

    const VALID_STDEVS = 3.25;

    history.raw_formants.push(formants);
    let new_averages : FormantAverage[] = [];

    while (local_averages.length > 0) {
        let average = local_averages.shift();
        
        let scores = local_formants.map((f, i) => {return { error: Math.abs(f.frequency - average.mean), index: i}});
        scores.sort((a,b) => { return a.error - b.error});

        if (scores.length > 0) {
            let min_score = scores[0];
            let best_candidate = local_formants[min_score.index];

            // maybe add some decaying weighting over time here?
            // or do this as a function of the length?
            let MAX_ERROR = 150;
            if (min_score.error < MAX_ERROR) {
                average = update_average_with_formant(average, best_candidate, history);
                new_averages.push(average);
                local_formants.splice(min_score.index, 1);
            }
        }
        
        if (local_formants.length == 0) { break; }
    }

    while (local_formants.length > 0) {
        let formant = local_formants.shift();
        new_averages.push(formant_to_average(formant));
    }

    new_averages.sort((a,b) => { return a.mean - b.mean });

    history.averages = new_averages
    return history
}


export const get_formants_from_memory = (block_data: BlockData, block_memory: BlockMemory, time_step: number) : Formant[] => {
    let formant_count = block_data.formants_count();

    let formant_data = block_memory.formants.slice(0, formant_count);
    let formants : Formant[] =  [];

    formant_data.forEach((index, i) => {
        formants.push({
            time_step: time_step,
            bin_index: index,
            frequency: block_memory.envelope_frequencies[index],
            amplitude: block_memory.envelope_data[index]
        });
    });

    return formants;
    // return normalize_formants(formants);
};

export const get_poles_from_memory = (block_data: BlockData, block_memory: BlockMemory, time_step: number) : Pole[] => {
    let pole_count = block_data.pole_count();
    
    let pole_real_values = block_memory.pole_imag_values.slice(0, pole_count);
    let pole_imag_values = block_memory.pole_real_values.slice(0, pole_count);
    let pole_frequencies = block_memory.pole_frequencies.slice(0, pole_count);
    let pole_bandwidths = block_memory.pole_bandwidths.slice(0, pole_count);

    let poles : Pole[] = [];

    for (let i = 0; i < pole_count; i++) { 
        poles.push({
            time_step,
            real: pole_real_values[i],
            imag: pole_imag_values[i],
            frequency: pole_frequencies[i],
            bandwidth: pole_bandwidths[i]
        });
    }

    poles.sort((a,b) => a.frequency - b.frequency);

    return poles;
}

// VVV below here might not be needed VVV

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