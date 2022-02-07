import * as math from 'mathjs';

import init, { BlockData, run_lpc } from 'src-wasm';
import {settings} from './configuration';
import {get_signal, get_blocks_from_signal} from './file';
import { get_block_memory, get_formants_from_memory } from './memory';
// import {lpc} from './lpc';
// import {envelope} from './envelope';
import { get_fullscreen_canvas_context, plot_samples_f32a } from './visualizer';


const sample_file_path : string = 'test/uh-fu.wav';

console.log(`lpc model order: ${settings.lpc_model_order}`);

window.addEventListener('click', async () => {
	let {memory} = await init();
	let ctx = get_fullscreen_canvas_context('debug-output-canvas');
	
	let audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
	let data = await get_signal(sample_file_path, audio_context);
	let file_signal = math.matrix(Array.from(data))
	let blocks = get_blocks_from_signal(file_signal, settings);
	let block = blocks[4];

	const block_length = math.floor(settings.sample_window_length_ms * settings.sample_rate_hz);
	let block_data = BlockData.new(block_length, settings.lpc_model_order, settings.frequency_bins, settings.sample_rate_hz);
	const block_memory = get_block_memory(block_data, block_length, memory, settings);

	// write the data into WASM memory
	for (let i = 0; i < block_memory.signal_length; i++)
	{
		block_memory.signal_data[i] = block._data[i];
	}

	let s = performance.now();
	run_lpc(block_data);
	let e = performance.now();
	console.log(`[wasm] run_lpc: ${e - s}ms`)
	let formant_indices = get_formants_from_memory(block_data, block_memory);

	formant_indices.forEach((index, i) => {
		let [f, a] = [
			block_memory.envelope_frequencies[index],
			block_memory.envelope_data[index]
		];

		console.log(`F${i}: ${f}Hz`);
	})

	s = performance.now()
	plot_samples_f32a(block_memory.signal_data, block_memory.signal_length, ctx);

	ctx.strokeStyle = 'red';
	plot_samples_f32a(block_memory.envelope_data, block_memory.envelope_length, ctx, 100, -0.01);
	e = performance.now()
	console.log(`[canvas] paint: ${e - s}ms`)
});