import * as math from 'mathjs';

import init, { BlockData, run_lpc } from 'src-wasm';
import {settings} from './configuration';
import {get_signal, get_blocks_from_signal} from './file';
import { get_block_memory } from './memory';
import { get_formants_from_memory } from './formants';
// import {lpc} from './lpc';
// import {envelope} from './envelope';
import { get_fullscreen_canvas_context, plot_formant, plot_samples_f32a } from './visualizer';


const sample_file_path : string = 'test/lh-fu.wav';
let running = false;

console.log(`[config] lpc model order: ${settings.lpc_model_order}`);

window.addEventListener('click', async () => {
	if (running) return;

	let {memory} = await init();
	let ctx = get_fullscreen_canvas_context('debug-output-canvas');
	
	let audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
	let data = await get_signal(sample_file_path, audio_context);
	let file_signal = math.matrix(Array.from(data))
	let blocks = get_blocks_from_signal(file_signal, settings);
	let block_index = 0;
	

	const block_length = math.floor(settings.sample_window_length_ms * settings.sample_rate_hz);
	const block_data = BlockData.new(block_length, settings.lpc_model_order, settings.frequency_bins, settings.sample_rate_hz);
	const block_memory = get_block_memory(block_data, block_length, memory, settings);

	running = true;

	const run = () => {
		let block = blocks[block_index];

		for (let i = 0; i < block_memory.signal_length; i++)
		{
			// write the data into WASM memory
			block_memory.signal_data[i] = block._data[i];
		}

		let s = performance.now();
		run_lpc(block_data);
		let e = performance.now();
		console.log(`\n [wasm] run_lpc: ${e - s}ms`)

		s = performance.now()
		let formants = get_formants_from_memory(block_data, block_memory);
		e = performance.now()
		console.log(`[js] normalize: ${e - s}ms`);
		
		s = performance.now()
		ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
		ctx.strokeStyle = 'black';
		plot_samples_f32a(block_memory.signal_data, block_memory.signal_length, ctx);

		ctx.strokeStyle = 'red';
		plot_samples_f32a(block_memory.envelope_data, block_memory.envelope_length, ctx, 100, -0.01);

		formants.forEach(formant => {
			plot_formant(formant, settings, ctx, 100, -0.01);
		});

		e = performance.now()
		console.log(`[js] paint: ${e - s}ms\n `)
	}

	window.addEventListener('keydown', e => {
		if (e.key == 'ArrowRight') {
			block_index = Math.min(block_index + 1, blocks.length - 1);
			run();
		}

		if (e.key == 'ArrowLeft') {
			block_index = Math.max(block_index - 1, 0);
			run();
		}
	});
});