import _, {BlockData} from 'src-wasm';
import { GlobalConfiguration } from './configuration';

export interface BlockMemory {
	signal_length : number,
	signal_data : Float32Array,

	envelope_length: number,
	envelope_data: Float32Array,
	envelope_frequencies : Float32Array,

    formants: Uint32Array
};

export const get_block_memory = (block_data : BlockData, block_length : number, memory : WebAssembly.Memory, settings: GlobalConfiguration) : BlockMemory => {
	const data_pointer = block_data.signal_pointer();
	const memory_layout = new Float32Array(memory.buffer, data_pointer, block_length);

	const magnitude_pointer = block_data.filter_magnitude_pointer();
	const magnitudes = new Float32Array(memory.buffer, magnitude_pointer, settings.frequency_bins);

	const frequency_pointer = block_data.filter_frequencies_pointer();
	const frequencies = new Float32Array(memory.buffer, frequency_pointer, settings.frequency_bins);

    const formants_pointer = block_data.formants_pointer();
    const formants = new Uint32Array(memory.buffer, formants_pointer, settings.lpc_model_order);

	return {
		signal_length: block_length,
		signal_data: memory_layout,

		envelope_length : settings.frequency_bins,
		envelope_data : magnitudes,
		envelope_frequencies : frequencies,

        formants: formants
	};
};


export const get_formants_from_memory = (block_data: BlockData, block_memory: BlockMemory) : Uint32Array => {
    let formant_count = block_data.formants_count();
    return block_memory.formants.slice(0, formant_count);
}