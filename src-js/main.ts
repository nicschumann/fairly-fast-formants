import * as math from 'mathjs';

import './style/reset.css';
import './style/main.css';

import init, { BlockData, run_lpc } from 'src-wasm';

import {GlobalConfiguration, settings} from './configuration';
import { get_file_blocks } from './file';
import { get_microphone_node } from './microphone';

import { BlockMemory, get_block_memory, memcpy_from_to } from './memory';
import { add_formants_to_history, FormantHistory, get_formants_from_memory, initialize_history } from './formants';
import { get_canvas_context, resize_canvas, plot_formant, plot_formant_average, plot_samples_f32a, plot_formant_bars, highlight_timeslice } from './visualizer';

const good_tests = [
	'test/uh-fu.wav',
	'test/um-fu.wav',
	'test/lm-fu.wav',
	'test/lm-fr.wav',
	'test/nic-ah.m4a'
]

const sample_file_path = good_tests[2];
console.log(`[config] lpc model order: ${settings.lpc_model_order}`);


enum AnalysisMode {
	Static = 0,
	Dynamic,
}

interface ApplicationState {
	mode : AnalysisMode,
	initialized : boolean,
	timestep : number,
};

const application_state : ApplicationState = {
	mode : AnalysisMode.Static,
	initialized : false,
	timestep : 0,
	
};


const render_formant_bars = (block_memory : BlockMemory, formant_history : FormantHistory, ctx : CanvasRenderingContext2D, offset : number = 0) => {
	let s = performance.now()

	ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	plot_formant_bars(formant_history, settings, ctx, offset);

	let e = performance.now()
	console.log(`[js] paint: ${e - s}ms`)
}

const render_filter_envelope = (block_memory : BlockMemory, formant_history : FormantHistory, ctx : CanvasRenderingContext2D, offset : number = 0) => {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	ctx.strokeStyle = 'black';
	plot_samples_f32a(block_memory.signal_data, block_memory.signal_length, ctx);

	ctx.strokeStyle = 'red';
	plot_samples_f32a(block_memory.envelope_data, block_memory.envelope_length, ctx, 100, -0.01);

	if (formant_history.raw_formants.length > 0) {
		let last_formant_set = formant_history.raw_formants[formant_history.raw_formants.length - 1];

		last_formant_set.forEach(formant => {
			plot_formant(formant, settings, ctx, 100, -0.01);
		});
	}

	formant_history.averages.forEach(avg => {
		plot_formant_average(avg, settings, ctx, 100, -0.01);
	});
};

const render_entire_waveform = (signal : Float32Array, ctx: CanvasRenderingContext2D, block_index : number, settings: GlobalConfiguration) => {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	plot_samples_f32a(signal, signal.length, ctx);
	let window_length = math.floor(settings.sample_window_length_ms * settings.sample_rate_hz);
	let sample_window_start = block_index * window_length * settings.window_overlap;
	let sample_window_end = sample_window_start + window_length;

	highlight_timeslice(sample_window_start, sample_window_end, signal.length, ctx);
};


const setup_dynamic_mode = (application_state : ApplicationState) => {
	return async () => {
		if (application_state.initialized) return;

		let {memory} = await init();
		let timeseries_ctx = get_canvas_context('timeslice-canvas');
		let formant_ctx = get_canvas_context('formant-canvas');
		const audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
		
		const block_length = math.floor(settings.sample_window_length_ms * settings.sample_rate_hz);
		const block_data = BlockData.new(block_length, settings.lpc_model_order, settings.frequency_bins, settings.sample_rate_hz);
		const block_memory = get_block_memory(block_data, block_length, memory, settings);
		
		let formant_history = initialize_history(settings.history_length); 

		const analyzer_node = await get_microphone_node(audio_context, settings);
		const time_domain_data = new Float32Array(block_length);

		application_state.initialized = true;

		let timing = {
			frame_start: 0,
			frame_end: 0,
			analysis_start: 0
		};

		timing.frame_start = performance.now();
		application_state.timestep = 0;

		const run = () => {
			timing.analysis_start = performance.now();
			analyzer_node.getFloatTimeDomainData(time_domain_data);
			memcpy_from_to(time_domain_data, block_memory.signal_data);

			let s = performance.now();
			
			/**
			 * NOTE(Nic): should we be pre-filtering the signal
			 * into a better frequency range? [done.]
			 * 
			 * It's possible for the inversion of the toeplitz
			 * matrix to fail in degenerate cases (signal is all zeros, etc).
			 * In this case, areas of the wasm heap will contain garbage
			 * data that you should not read.
			 * 
			 * Always check to see if the solve was successful before continuing.
			 */
			let solved = run_lpc(block_data);
			let e = performance.now();
			console.log(`[wasm] solved: ${solved}`)
			console.log(`[wasm] run_lpc: ${e - s}ms`);

			if (solved) {
				s = performance.now()
				let formants = get_formants_from_memory(block_data, block_memory, application_state.timestep);
				formant_history = add_formants_to_history(formants, formant_history);
				e = performance.now()
				console.log(`[js] normalize: ${e - s}ms`);

				let offset = Math.max(0, application_state.timestep + 1 - settings.history_length);
				render_formant_bars(block_memory, formant_history, formant_ctx, offset);
				render_filter_envelope(block_memory, formant_history, timeseries_ctx);
			}

			application_state.timestep += 1;
			timing.frame_end = performance.now();
			
			console.log(`[summary] work time: ${timing.frame_end - timing.analysis_start}`);
			console.log(`[summary] frame time: ${timing.frame_end - timing.frame_start}\n\n`);
			timing.frame_start = timing.frame_end;
		};

		let intervalID = window.setInterval(run, settings.frametime_ms);
	}
};




const setup_static_mode = (state : ApplicationState) => {
	return async () => {
		if (application_state.initialized) return;

		let {memory} = await init();

		let timeseries_ctx = get_canvas_context('timeslice-canvas');
		let formant_ctx = get_canvas_context('formant-canvas');
		let clip_ctx = get_canvas_context('clip-canvas');

		let audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
		let {blocks, signal} = await get_file_blocks(sample_file_path, audio_context, settings);
		let block_index = 0;
		
		const block_length = math.floor(settings.sample_window_length_ms * settings.sample_rate_hz);
		const block_data = BlockData.new(block_length, settings.lpc_model_order, settings.frequency_bins, settings.sample_rate_hz);
		const block_memory = get_block_memory(block_data, block_length, memory, settings);
		let formant_history = initialize_history(blocks.length);

		application_state.initialized = true;

		const run = () => {
			let block = blocks[block_index];

			memcpy_from_to(block._data, block_memory.signal_data);

			// WASM block
			let s = performance.now();
			run_lpc(block_data);
			let e = performance.now();
			console.log(`\n [wasm] run_lpc: ${e - s}ms`)

			// JS block
			s = performance.now()
			let formants = get_formants_from_memory(block_data, block_memory, block_index);
			formant_history = add_formants_to_history(formants, formant_history);
			e = performance.now()
			console.log(`[js] normalize: ${e - s}ms`);
		}

		const render = () => {
			render_filter_envelope(block_memory, formant_history, timeseries_ctx);
			render_formant_bars(block_memory, formant_history, formant_ctx);
			render_entire_waveform(signal._data, clip_ctx, block_index, settings);
		};

		window.addEventListener('keydown', e => {
			if (e.key == 'ArrowRight') {
				block_index = Math.min(block_index + 1, blocks.length - 1);
				run();
				render()
			}

			if (e.key == 'ArrowLeft') {
				block_index = Math.max(block_index - 1, 0);
				run();
				render()
			}
		});

		window.addEventListener('resize', () => {
			resize_canvas(formant_ctx)
			resize_canvas(timeseries_ctx);
			render()
		});

		run();
		render();
	}
}


window.addEventListener('click', setup_static_mode(application_state));
// window.addEventListener('click', setup_dynamic_mode(application_state));