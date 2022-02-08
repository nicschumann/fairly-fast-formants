import * as math from 'mathjs';

import init, { BlockData, run_lpc } from 'src-wasm';

import {settings} from './configuration';
import { get_file_blocks } from './file';
import { get_microphone_node } from './microphone';

import { get_block_memory, memcpy_from_to } from './memory';
import { add_formants_to_history, get_formants_from_memory, initialize_history } from './formants';
// import {lpc} from './lpc';
// import {envelope} from './envelope';
import { get_fullscreen_canvas_context, plot_formant, plot_formant_average, plot_samples_f32a, plot_formant_bars } from './visualizer';



// const sample_file_path : string = 'test/um-fu.wav'; // good example of an issue when the envelope doesn't work right at first.
const sample_file_path : string = 'test/lm-fu.wav'; // good example of an issue when the envelope doesn't work right at first.
let running = false;

console.log(`[config] lpc model order: ${settings.lpc_model_order}`);

// helper for writing to wasm memory





// window.addEventListener('click', async () => {
// 	if (running) return;

// 	let {memory} = await init();
// 	const ctx = get_fullscreen_canvas_context('debug-output-canvas');
// 	const audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
	
// 	const block_length = math.floor(settings.sample_window_length_ms * settings.sample_rate_hz);
// 	const block_data = BlockData.new(block_length, settings.lpc_model_order, settings.frequency_bins, settings.sample_rate_hz);
// 	const block_memory = get_block_memory(block_data, block_length, memory, settings);
	
// 	// getting the right alpha constant is pretty important
// 	let formant_history = initialize_history(3, 1000, 0.2); 

// 	const analyzer_node = await get_microphone_node(audio_context, settings);
// 	const time_domain_data = new Float32Array(block_length);

// 	running = true;

// 	let timing = {
// 		frame_start: 0,
// 		frame_end: 0,
// 		analysis_start: 0
// 	};

// 	timing.frame_start = performance.now();

// 	let intervalID = window.setInterval(() => {
// 		timing.analysis_start = performance.now();
// 		analyzer_node.getFloatTimeDomainData(time_domain_data);
// 		memcpy_from_to(time_domain_data, block_memory.signal_data);
		

// 		let s = performance.now();
		
// 		/**
// 		 * NOTE(Nic): should we be pre-filtering the signal
// 		 * into a better frequency range?
// 		 * 
// 		 * It's possible for the inversion of the toeplitz
// 		 * matrix to fail in degenerate cases (signal is all zeros, etc).
// 		 * In this case, areas of the wasm heap will contain garbage
// 		 * data that you should not read.
// 		 * 
// 		 * Always check to see if the solve was successful before continuing.
// 		 */
// 		let solved = run_lpc(block_data);
// 		let e = performance.now();
// 		console.log(`[wasm] solved: ${solved}`)
// 		console.log(`[wasm] run_lpc: ${e - s}ms`);

// 		if (solved) {
// 			s = performance.now()
// 			let formants = get_formants_from_memory(block_data, block_memory);
// 			formant_history = add_formants_to_history(formants, formant_history);
// 			e = performance.now()
// 			console.log(`[js] normalize: ${e - s}ms`);

// 			s = performance.now()
// 			ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

// 			ctx.strokeStyle = 'red';
// 			plot_formant_bars(formant_history, settings, ctx);
// 			ctx.strokeStyle = 'black';
// 			ctx.fillStyle = 'black';
// 			plot_samples_f32a(block_memory.signal_data, block_memory.signal_length, ctx);

// 			ctx.strokeStyle = 'red';
// 			plot_samples_f32a(block_memory.envelope_data, block_memory.envelope_length, ctx, 100, -0.01);

// 			formants.forEach(formant => {
// 				plot_formant(formant, settings, ctx, 100, -0.01);
// 			});

// 			ctx.fillStyle = 'red';
// 			formant_history.current_average.forEach(formant => {
// 				plot_formant_average(formant, settings, ctx, 100, -0.01);
// 			});

// 			e = performance.now()
// 			console.log(`[js] paint: ${e - s}ms`)
// 		}

// 		timing.frame_end = performance.now();
		
// 		console.log(`[summary] work time: ${timing.frame_end - timing.analysis_start}`);
// 		console.log(`[summary] frame time: ${timing.frame_end - timing.frame_start}\n\n`);
// 		timing.frame_start = timing.frame_end;
// 	}, 30);
// });






window.addEventListener('click', async () => {
	if (running) return;

	let {memory} = await init();
	let ctx = get_fullscreen_canvas_context('debug-output-canvas');

	let audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
	let blocks = await get_file_blocks(sample_file_path, audio_context, settings);
	let block_index = 0;
	

	const block_length = math.floor(settings.sample_window_length_ms * settings.sample_rate_hz);
	const block_data = BlockData.new(block_length, settings.lpc_model_order, settings.frequency_bins, settings.sample_rate_hz);
	const block_memory = get_block_memory(block_data, block_length, memory, settings);
	let formant_history = initialize_history(3, blocks.length + 1, 0.4);

	running = true;

	const run = () => {
		let block = blocks[block_index];

		memcpy_from_to(block._data, block_memory.signal_data);

		let s = performance.now();
		run_lpc(block_data);
		let e = performance.now();
		console.log(`\n [wasm] run_lpc: ${e - s}ms`)

		s = performance.now()
		let formants = get_formants_from_memory(block_data, block_memory);
		formant_history = add_formants_to_history(formants, formant_history);

		console.log('formants')
		formants.forEach(f => {
			console.log(f);
		})
		
		console.log('average')
		formant_history.current_average.forEach(f => {
			console.log(f);
		})

		e = performance.now()
		console.log(`[js] normalize: ${e - s}ms`);

		
		s = performance.now()
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.fillStyle = 'black';
		ctx.strokeStyle = 'black';
		plot_samples_f32a(block_memory.signal_data, block_memory.signal_length, ctx);

		ctx.strokeStyle = 'red';
		plot_samples_f32a(block_memory.envelope_data, block_memory.envelope_length, ctx, 100, -0.01);

		// plot_formant_bars(formant_history, settings, ctx);

		formants.forEach(formant => {
			plot_formant(formant, settings, ctx, 100, -0.01);
		});


		ctx.fillStyle = 'red';
		formant_history.current_average.forEach(formant => {
			plot_formant_average(formant, settings, ctx, 0, -0.01);
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