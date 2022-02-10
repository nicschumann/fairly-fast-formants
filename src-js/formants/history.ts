import { Formant, FormantAverage, FormantHistoryData, initialize_history, add_formants_to_history } from './data';

export interface FormantHistorySettings {
    history_max_length: number
};


export class FormantHistory {
    #max_length : number;
    #history_data : FormantHistoryData;

    constructor (settings : FormantHistorySettings) {
        this.#max_length = settings.history_max_length;
    }

    init () {
        this.#history_data = initialize_history(this.#max_length);
    }

    add_formants_for_timestep (formants: Formant[], timestep: number) {
        formants.forEach(f => { f.time_step = timestep; });
        add_formants_to_history(formants, this.#history_data);
    }

    get_averages () : FormantAverage[] {
        return this.#history_data.averages;
    }

    get_raw_formants() : Formant[][] {
        return this.#history_data.raw_formants;
    }

    get_max_length () : number {
        return this.#max_length;
    }
}