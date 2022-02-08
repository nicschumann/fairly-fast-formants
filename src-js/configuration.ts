export interface GlobalConfiguration {
	sample_window_length_ms: number, // float
	sample_rate_hz: number // integer
	lpc_model_order: number, // integer
	frequency_bins: number,
};

export const settings : GlobalConfiguration = {
	sample_window_length_ms: 0.03,
	sample_rate_hz: 8192, 
	lpc_model_order: 10,
	frequency_bins: 512,
};


