export interface GlobalConfiguration {
	sample_window_length_ms: number, // float
	sample_rate_hz: number // integer
	lpc_model_order: number, // integer
	frequency_bins: number,

	window_overlap: number,

	history_length: number,
	frametime_ms: number
};

export const settings : GlobalConfiguration = {
	sample_window_length_ms: 0.03,
	sample_rate_hz: 8192, 
	lpc_model_order: 10,
	frequency_bins: 512,

	window_overlap: 0.5,


	// parameters that are relevant for microphone input mode.
	history_length: 1000,
	frametime_ms: 16,
};


