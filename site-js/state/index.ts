import { settings } from '../lib/configuration';
import { FormantAnalyzer, FormantHistory } from '../../formants-js';
import { writable, derived } from 'svelte/store';

const window_length_samples = Math.floor(settings.sample_window_length_ms * settings.sample_rate_hz);

let initialized : boolean = false;

let formant_analyzer = null;

let formant_history = null; 

export interface SignalData {
    signal : Float32Array,
    timestep : number
};

export interface FormantData {
    updated : boolean,
    analyzer : FormantAnalyzer,
    history : FormantHistory,
}

const create_signal = () => {
    let { subscribe, set } = writable({ signal: new Float32Array(window_length_samples), timestep: -1 });

    return {
        subscribe,
        set: (data: SignalData) => {
            // this only does something if 
            // init has been called.
            if (initialized) { set(data); }
        }
    }
}

/**
 * 
 */
export const init = async (length : number = settings.history_length) => {
    if (initialized) { return; }

    formant_analyzer = new FormantAnalyzer({
        model_order: settings.lpc_model_order,
        window_length_ms: settings.sample_window_length_ms,
        sample_rate_hz: settings.sample_rate_hz,
        frequency_bins: settings.frequency_bins,
    });

    formant_history = new FormantHistory({
        history_max_length: length
    });

    await formant_analyzer.init();
    formant_history.init();

    initialized = true;
};


/**
 * call set on signal to begin the analysis
 */
export const signal = create_signal();

export const formants = derived(
    signal,
    $signal => {
        if (initialized) {
            let result = formant_analyzer.analyze($signal.signal, $signal.timestep);
            if (result.success) {
                formant_history.add_formants_for_timestep(result.formants, $signal.timestep);
                return {
                    updated: true,
                    analyzer: formant_analyzer,
                    history: formant_history
                }
            } else {
                return {
                    updated: false,
                    analyzer: formant_analyzer,
                    history: formant_history
                };
            }

        } else {
            return {
                updated: false,
                analyzer: formant_analyzer,
                history: formant_history
            }
        }
        
    }
);

