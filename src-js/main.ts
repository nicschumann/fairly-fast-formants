import * as math from 'mathjs';

import init, { BlockData, run_lpc } from 'src-wasm';
import {settings} from './configuration';
import {get_signal, get_blocks_from_signal} from './file';
// import {lpc} from './lpc';
// import {envelope} from './envelope';
import { get_fullscreen_canvas_context, plot_samples_f32a, plot_samples } from './visualizer';


const sample_file_path : string = 'test/uh-fu.wav';

console.log(`lpc model order: ${settings.lpc_model_order}`);


window.addEventListener('click', async () => {
	let {memory} = await init();
	let ctx = get_fullscreen_canvas_context('debug-output-canvas');

	let audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
	let data = await get_signal(sample_file_path, audio_context);
	let file_signal = math.matrix(Array.from(data))
	let blocks = get_blocks_from_signal(file_signal, settings);
	let block = blocks[2];

	// let js_coeffs = lpc(block, settings.lpc_model_order);
	// let [_, js_h] = envelope(js_coeffs, settings.sample_rate_hz);
	// console.log(coeffs._data);

	const block_length = math.floor(settings.sample_window_length_ms * settings.sample_rate_hz);
	let blockdata = BlockData.new(block_length, settings.lpc_model_order, settings.sample_rate_hz);
	let data_pointer = blockdata.signal_pointer();
	const memory_layout = new Float32Array(memory.buffer, data_pointer, block_length);

	// write the data into WASM memory
	for (let i = 0; i < block_length; i++)
	{
		memory_layout[i] = block._data[i];
	}

	let s = performance.now();
	run_lpc(blockdata);
	let e = performance.now();
	console.log(`time in wasm: ${e - s}ms`)

	let coeffs_pointer = blockdata.coefficient_pointer();
	let coeffs = new Float32Array(memory.buffer, coeffs_pointer, settings.lpc_model_order + 1);
	let coeff_matrix = math.matrix(Array.from(coeffs));

	let magnitude_pointer = blockdata.filter_magnitude_pointer();
	let magnitudes = new Float32Array(memory.buffer, magnitude_pointer, 512);
	console.log(magnitudes);

	plot_samples_f32a(memory_layout, 240, ctx);
	// ctx.strokeStyle = 'blue';
	// plot_samples(math.multiply(-0.01, h), 512, ctx, 100);
	ctx.strokeStyle = 'red';
	plot_samples_f32a(magnitudes, 512, ctx, 100);
	// plot_samples(math.multiply(-0.01, js_h), 512, ctx, 150);
});