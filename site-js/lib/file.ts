import * as math from 'mathjs';
import {GlobalConfiguration} from './configuration';


/**
 * 
 * @param audio_file_path string containing a path to an audio file.
 * @param audio_context an AudioContext instance. Usually, you can only initialize this once someone has interacted w/ the page.
 * @returns Float32Array containing the normalized PCM data from the audio file pointed to by audio_file_path.
 */
export async function get_signal(audio_file_path : string, audio_context : AudioContext ) : Promise<Float32Array> {
    let source = audio_context.createBufferSource();

    let response = await fetch(audio_file_path);
    let buffer = await response.arrayBuffer();
    let decoded = await audio_context.decodeAudioData(buffer);

    source.buffer = decoded;

    return source.buffer.getChannelData(0);
};




export function get_blocks_from_signal(signal : math.Matrix, settings: GlobalConfiguration) : math.Matrix[] {
    let t_start = performance.now();
	// const weights = get_hann_weights(settings)
	const overlap = settings.window_overlap;

	let N = signal.size()[0];
	let N_w = math.floor(settings.sample_rate_hz * settings.sample_window_length_s);
	let step_size = math.floor(N_w * (1.0 - overlap));
	let N_b = math.floor((N - N_w) / step_size) + 1

	let blocks = []

	for (let i = 0; i < N_b; i++){
		let offset = i * step_size;
		let row = math.subset(signal, math.index(math.range(offset, offset+N_w)))
		blocks.push(row)
	}

	let t_end = performance.now();
	console.log(`[file] get blocks from signal: ${t_end - t_start}ms`);

	return blocks
}

export function get_blocks_from_signal_f32a(signal : Float32Array, settings: GlobalConfiguration) : Float32Array[] {
    let t_start = performance.now();
	// const weights = get_hann_weights(settings)
	const overlap = settings.window_overlap;

	let N = signal.length;
	let N_w = math.floor(settings.sample_rate_hz * settings.sample_window_length_s);
	let step_size = math.floor(N_w * (1.0 - overlap));
	let N_b = math.floor((N - N_w) / step_size) + 1

	let blocks = []

	for (let i = 0; i < N_b; i++){
		let offset = i * step_size;
		let row = signal.slice(offset, offset+N_w)
		blocks.push(row)
	}

	let t_end = performance.now();
	console.log(`get blocks from signal: ${t_end - t_start}ms`);

	return blocks
}


export const get_file_blocks = async (filepath : string, audio_context: AudioContext, settings : GlobalConfiguration) : Promise<{blocks: math.Matrix[], signal: math.Matrix}> => {
	let data = await get_signal(filepath, audio_context);
	let file_signal = math.matrix(Array.from(data))
	let blocks = get_blocks_from_signal(file_signal, settings);

	return {blocks, signal: file_signal};
}


export const get_file_blocks_f32a = async (filepath : string, audio_context: AudioContext, settings : GlobalConfiguration) : Promise<{blocks: Float32Array[], signal: Float32Array}> => {
	let data = await get_signal(filepath, audio_context);
	let blocks = get_blocks_from_signal_f32a(data, settings);

	return {blocks, signal: data};
}