
import { Pole } from './data';

export interface FormantTrackerSettings {
    history_max_length: number
};

export interface FormantTrack {
    poles: Pole[]
};


export class FormantTracker {
    #max_length : number;
    #raw_poles : Pole[][];
    #tracks : FormantTrack[];

    constructor (settings : FormantTrackerSettings) {
        this.#max_length = settings.history_max_length;
        this.#raw_poles = [];
        this.#tracks = [];

    }

    init () {
        // it's a nop right now.
    }

    add_poles_for_timestep (poles: Pole[], timestep: number) {
        // the basic idea is to look at all the previous 
        let local_poles = [...poles];
        let local_tracks = [...this.#tracks];
        if (this.#raw_poles.length >= this.#max_length) { this.#raw_poles.shift(); }

        this.#raw_poles.push(poles);
        let new_tracks : FormantTrack[] = [];

        // heuristic fun...
        console.log('before:');
        local_poles.forEach(f => {
            console.log(f.frequency, f.bandwidth);
        })
        local_poles = local_poles.filter(p => p.bandwidth < 250);

        console.log('after:');
        local_poles.forEach(f => {
            console.log(f.frequency, f.bandwidth);
        })
    
        while (local_tracks.length > 0) {
            let track = local_tracks.shift();
            let latest = track.poles[track.poles.length - 1];
            
            let scores = local_poles.map((p, i) => {

                let freq_error_sq = Math.pow(p.frequency - latest.frequency, 2);
                let band_error_sq = Math.pow(p.bandwidth - latest.bandwidth, 2);
                let error = Math.sqrt(freq_error_sq + band_error_sq);

                return { error, index: i}
            });
            scores.sort((a,b) => { return a.error - b.error});
    
            if (scores.length > 0) {
                let min_score = scores[0];
                let best_candidate = local_poles[min_score.index];
    
                // maybe add some decaying weighting over time here?
                // or do this as a function of the length?
                let MAX_ERROR = 200;
                if (min_score.error < MAX_ERROR) {
                    track.poles.push(best_candidate);
                    new_tracks.push(track);
                    local_poles.splice(min_score.index, 1);
                }
            }
            
            if (local_poles.length == 0) { break; }
        }
    
        while (local_poles.length > 0) {
            let pole = local_poles.shift();
            new_tracks.push({
                poles: [pole]
            });
        }
    
        new_tracks.sort((a,b) => { return a.poles[a.poles.length - 1].frequency - b.poles[b.poles.length - 1].frequency });
    
        this.#tracks = new_tracks;
    }

    get_tracks () : FormantTrack[] {
        return this.#tracks;
    }

    get_raw_poles () : Pole[][] {
        return this.#raw_poles;
    }

    get_max_length () : number {
        return this.#max_length;
    }
}