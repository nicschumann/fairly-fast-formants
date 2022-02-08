import { GlobalConfiguration } from "./configuration";

export const get_microphone_node = async (audio_context : AudioContext, settings: GlobalConfiguration) : Promise<AnalyserNode> => {
	let user_audio = await navigator.mediaDevices.getUserMedia({audio: true});
	
	let source_node = audio_context.createMediaStreamSource(user_audio);
	let gain_node = audio_context.createGain();
	let analyzer_node = new AnalyserNode(audio_context, {fftSize: settings.frequency_bins});

	source_node.connect(gain_node);
	gain_node.connect(analyzer_node);

	return analyzer_node;
}