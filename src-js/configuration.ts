export interface GlobalConfiguration {
	sample_window_length_ms: number, // float
	sample_rate_hz: number // integer
	lpc_model_order: number, // integer
};

export const settings : GlobalConfiguration = {
	sample_window_length_ms: 0.03,
	sample_rate_hz: 8000, 
	lpc_model_order: 10,
};


