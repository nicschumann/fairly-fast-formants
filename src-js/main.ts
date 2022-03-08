import * as math from 'mathjs';

import './style/reset.css';
import './style/main.css';

import {GlobalConfiguration, settings} from './configuration';
import { get_file_blocks_f32a } from './file';
import { get_microphone_node } from './microphone';

import { FormantAnalyzer, FormantHistory } from '../formants-js';
import { get_canvas_context, resize_canvas, plot_formant, plot_formant_average, plot_samples_f32a, plot_formant_bars, highlight_timeslice } from './visualizer';

const good_tests = [
	'/test/uh-fu.wav',
	'/test/um-fu.wav',
	'/test/lm-fu.wav',
	'/test/lm-fr.wav',
	'/test/nic-ah.m4a'
]

const sample_file_path = good_tests[3];
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


const render_formant_bars = (_ : FormantAnalyzer, formant_history : FormantHistory, ctx : CanvasRenderingContext2D, offset : number = 0) => {
	ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
	plot_formant_bars(formant_history, settings, ctx, offset);
}

const render_filter_envelope = (formant_analyzer : FormantAnalyzer, formant_history : FormantHistory, ctx : CanvasRenderingContext2D, offset : number = 0) => {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

	let signal = formant_analyzer.get_signal();
	let envelope = formant_analyzer.get_envelope();
	let raw_formants = formant_history.get_raw_formants()
	let averages = formant_history.get_averages();
	
	ctx.strokeStyle = 'black';
	plot_samples_f32a(signal, signal.length, ctx);

	ctx.strokeStyle = 'blue';
	plot_samples_f32a(envelope, envelope.length, ctx, 100, -0.01);

	if (raw_formants.length > 0) {
		let last_formant_set = raw_formants[raw_formants.length - 1];

		last_formant_set.forEach(formant => {
			plot_formant(formant, settings, ctx, 100, -0.01);
		});
	}

	averages.forEach(avg => {
		plot_formant_average(avg, settings, ctx, 100, -0.01);
	});
};

const render_entire_waveform = (signal : Float32Array, ctx: CanvasRenderingContext2D, block_index : number, settings: GlobalConfiguration) => {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	ctx.strokeStyle = 'black';
	plot_samples_f32a(signal, signal.length, ctx);
	let window_length = math.floor(settings.sample_window_length_ms * settings.sample_rate_hz);
	let sample_window_start = block_index * window_length * settings.window_overlap;
	let sample_window_end = sample_window_start + window_length;

	highlight_timeslice(sample_window_start, sample_window_end, signal.length, ctx);
};


const setup_dynamic_mode = (application_state : ApplicationState) => {
	return async () => {
		if (application_state.initialized) return;

		let formant_analyzer = new FormantAnalyzer({
			model_order: settings.lpc_model_order,
			window_length_s: settings.sample_window_length_ms,
			sample_rate_hz: settings.sample_rate_hz,
			frequency_bins: settings.frequency_bins,
		});

		let formant_history = new FormantHistory({
			history_max_length: settings.history_length
		})

		await formant_analyzer.init();
		formant_history.init();

		let timeseries_ctx = get_canvas_context('timeslice-canvas');
		let formant_ctx = get_canvas_context('formant-canvas');
		const audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
		
		const analyzer_node = await get_microphone_node(audio_context, settings);
		const time_domain_data = new Float32Array(formant_analyzer.get_block_length());

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
			let result = formant_analyzer.analyze(time_domain_data, application_state.timestep);
			let e = performance.now();
			console.log(`[wasm] solved: ${result.success}`)
			console.log(`[wasm] run_lpc: ${e - s}ms`);

			if (result.success) {
				s = performance.now()
				let formants = result.formants;
				formant_history.add_formants_for_timestep(formants, application_state.timestep);
				e = performance.now()
				console.log(`[js] normalize: ${e - s}ms`);

				let offset = Math.max(0, application_state.timestep + 1 - settings.history_length);
				render_formant_bars(formant_analyzer, formant_history, formant_ctx, offset);
				render_filter_envelope(formant_analyzer, formant_history, timeseries_ctx);
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

		let timeseries_ctx = get_canvas_context('timeslice-canvas');
		let formant_ctx = get_canvas_context('formant-canvas');
		let clip_ctx = get_canvas_context('clip-canvas');

		let audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
		let {blocks, signal} = await get_file_blocks_f32a(sample_file_path, audio_context, settings);
		let block_index = 0;

		let formant_analyzer = new FormantAnalyzer({
			model_order: settings.lpc_model_order,
			window_length_ms: settings.sample_window_length_ms,
			sample_rate_hz: settings.sample_rate_hz,
			frequency_bins: settings.frequency_bins,
		});

		await formant_analyzer.init();

		let formant_history = new FormantHistory({
			history_max_length: blocks.length
		});

		formant_history.init();



		application_state.initialized = true;
		let total_work_ms = 0;

		const run = () => {
			
			let block = blocks[block_index];


			// WASM block
			let s = performance.now();
			let result = formant_analyzer.analyze(block, block_index);
			let e = performance.now();
			console.log(`\n[wasm] lpc, envelope, and maxima: ${e - s}ms`)
			total_work_ms += e - s

			if (result.success) {
				// JS block
				s = performance.now()
				let formants = result.formants;
				formant_history.add_formants_for_timestep(formants, block_index);
				e = performance.now()
				console.log(`[js] normalize and average: ${e - s}ms`);
				total_work_ms += e - s
			}
		}

		const render = () => {
			let s = performance.now()
			render_filter_envelope(formant_analyzer, formant_history, timeseries_ctx);
			render_formant_bars(formant_analyzer, formant_history, formant_ctx);
			render_entire_waveform(signal, clip_ctx, block_index, settings);
			let e = performance.now()
			total_work_ms += e - s;
			console.log(`[render] draw plots: ${e - s}ms`);
			console.log(`[total]: ${total_work_ms}ms`);
			total_work_ms = 0;
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