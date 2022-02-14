import _, {BlockData} from 'formants-wasm';

export interface BlockMemory {
	signal_length : number,
	signal_data : Float32Array,

	envelope_length: number,
	envelope_data: Float32Array,
	envelope_frequencies : Float32Array,

	pole_real_values : Float32Array,
	pole_imag_values : Float32Array,
	pole_frequencies : Float32Array,
	pole_bandwidths : Float32Array,

    formants: Uint32Array
};

export const get_block_memory = (block_data : BlockData, block_length : number, memory : WebAssembly.Memory, frequency_bins: number, model_order: number) : BlockMemory => {
	const data_pointer = block_data.signal_pointer();
	const memory_layout = new Float32Array(memory.buffer, data_pointer, block_length);

	const pole_real_pointer = block_data.pole_real_pointer();
	const pole_real_values = new Float32Array(memory.buffer, pole_real_pointer, model_order);

	const pole_imag_pointer = block_data.pole_imag_pointer();
	const pole_imag_values = new Float32Array(memory.buffer, pole_imag_pointer, model_order);
	
	const pole_frequencies_pointer = block_data.pole_frequencies_pointer();
	const pole_frequencies = new Float32Array(memory.buffer, pole_frequencies_pointer, model_order);
	
	const pole_bandwidths_pointer = block_data.pole_bandwidths_pointer();
	const pole_bandwidths = new Float32Array(memory.buffer, pole_bandwidths_pointer, model_order);
	
	const magnitude_pointer = block_data.filter_magnitude_pointer();
	const magnitudes = new Float32Array(memory.buffer, magnitude_pointer, frequency_bins);

	const frequency_pointer = block_data.filter_frequencies_pointer();
	const frequencies = new Float32Array(memory.buffer, frequency_pointer, frequency_bins);

    const formants_pointer = block_data.formants_pointer();
    const formants = new Uint32Array(memory.buffer, formants_pointer, model_order);

	return {
		signal_length: block_length,
		signal_data: memory_layout,

		envelope_length : frequency_bins,
		envelope_data : magnitudes,
		envelope_frequencies : frequencies,

		pole_real_values: pole_real_values,
		pole_imag_values: pole_imag_values,
		pole_frequencies: pole_frequencies,
		pole_bandwidths: pole_bandwidths, 

        formants: formants
	};
};


export const memcpy_from_to = (source : Float32Array, dest : Float32Array) => {
	for (let i = 0; i < dest.length && i < source.length; i++)
	{
		dest[i] = source[i];
	}
}