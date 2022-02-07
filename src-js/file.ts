import * as math from 'mathjs';
import { pi } from 'mathjs';
import {GlobalConfiguration} from './configuration';

// @ts-ignore
const get_hann_weights = (settings : GlobalConfiguration) : Matrix => {
    const twopi = 2.0 * math.pi;
    let N = math.floor(settings.sample_rate_hz * settings.sample_window_length_ms);
    let c = math.cos(math.multiply(twopi / N, math.range(0, N)));
    let hann_weights = math.multiply(0.5, math.subtract(1.0, c));

    return hann_weights;
}


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




export function get_blocks_from_signal(signal : math.Matrix, settings: GlobalConfiguration) {
    let t_start = performance.now();
	const weights = get_hann_weights(settings)
	const overlap = 0.5;

	let N = signal.size()[0];
	let N_w = weights.size()[0];
	let step_size = math.floor(N_w * (1.0 - overlap));
	let N_b = math.floor((N - N_w) / step_size) + 1

	let blocks = []

	for (let i = 0; i < N_b; i++){
		let offset = i * step_size;
		let row = math.subset(signal, math.index(math.range(offset, offset+N_w)))
		let res = math.dotMultiply(row, weights)
		blocks.push(res)
	}

	let t_end = performance.now();
	console.log(`get blocks from signal: ${t_end - t_start}ms`);

	return blocks
}