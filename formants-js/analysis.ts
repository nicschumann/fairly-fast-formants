import init, { BlockData, run_lpc } from 'formants-wasm';
import { BlockMemory, get_block_memory, memcpy_from_to } from './memory';
import { Formant, Pole, get_formants_from_memory, get_poles_from_memory } from './data';


export interface FormantAnalysisSettings {
    model_order: number,
    window_length_s: number,
    sample_rate_hz: number,
    frequency_bins: number,
}

export interface FormantAnalysisResult {
    valid_input : boolean,
    success : boolean,
    formants : Formant[]
    poles: Pole[]
}

export class FormantAnalyzer {
    #model_order : number;
    #window_length_s : number;
    #window_length_samples : number;
    #sample_rate_hz : number;
    #frequency_bins : number;

    #wasm_memory : WebAssembly.Memory;
    #block_data : BlockData;
    #block_memory : BlockMemory;

	constructor(settings : FormantAnalysisSettings) {
        this.#model_order = settings.model_order;
        this.#window_length_s = settings.window_length_s;
        this.#sample_rate_hz = settings.sample_rate_hz;
        this.#frequency_bins = settings.frequency_bins;

        this.#window_length_samples = Math.floor(this.#window_length_s * this.#sample_rate_hz);
	}

	async init () : Promise<void> {
        let { memory } = await init();
        this.#wasm_memory = memory;

		this.#block_data = BlockData.new(
            this.#window_length_samples, 
            this.#model_order, 
            this.#frequency_bins, 
            this.#sample_rate_hz
        );

		this.#block_memory = get_block_memory(
            this.#block_data,
            this.#window_length_samples,
            this.#wasm_memory,
            this.#frequency_bins,
            this.#model_order
        );
	}

	analyze( signal : Float32Array, timestep : number = 0 ) : FormantAnalysisResult {
        console.log(signal);
        if (signal.length != this.#window_length_samples) { 
            // TODO(Nic): add a verbose mode and a log statement here.
            return { valid_input: false, success: false, formants: [], poles: []};
        }

        memcpy_from_to(signal, this.#block_memory.signal_data);

        let success = run_lpc(this.#block_data);

        if (success) {
           
            let formants = get_formants_from_memory(
                this.#block_data, 
                this.#block_memory, 
                timestep
            );

            let poles = get_poles_from_memory(
                this.#block_data,
                this.#block_memory,
                timestep
            );
            
            return {
                valid_input: true,
                success,
                formants,
                poles
            }
            
        } else {

            return {
                valid_input: true,
                success,
                formants: [],
                poles: []
            };

        }
	}

    get_signal() : Float32Array {
        return this.#block_memory.signal_data;
    }

    get_envelope() : Float32Array {
        return this.#block_memory.envelope_data;
    }

    get_block_length () : number {
        return this.#window_length_samples;
    }

    destroy () {
        // no-op right now.
    }
}