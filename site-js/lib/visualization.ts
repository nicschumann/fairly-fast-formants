import { GlobalConfiguration } from "./configuration";
import { FormantHistory, FormantAnalyzer, FormantTracker } from "../../formants-js";
import { FormantAverage, Formant, Pole } from "../../formants-js/data";

export const get_fullscreen_canvas_context = (canvas_id : string) => {
	let canvas = <HTMLCanvasElement> document.getElementById(canvas_id);
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	return canvas.getContext('2d');
};


export const get_canvas_context = (canvas_id : string) => {
	let canvas = <HTMLCanvasElement> document.getElementById(canvas_id);

	let client_rect = canvas.getBoundingClientRect();
	canvas.width = client_rect.width;
	canvas.height = client_rect.height;

	return canvas.getContext('2d');
};

export const resize_canvas = (ctx: CanvasRenderingContext2D) => {
	let rect = ctx.canvas.getBoundingClientRect();
	ctx.canvas.width = rect.width;
	ctx.canvas.height = rect.height;
}

export const plot_formant_bars = (history : FormantHistory, settings: GlobalConfiguration, ctx: CanvasRenderingContext2D, offset : number = 0) => {
    let nyquist_limit = settings.sample_rate_hz / 2;
    let x, y;

	let raw_formants = history.get_raw_formants();
	let averages = history.get_averages();
	let max_length = history.get_max_length();

	ctx.fillStyle = 'blue';
	raw_formants.forEach(formants => {
		formants.forEach(formant => {
			let y = ctx.canvas.height - ind2x(formant.frequency, nyquist_limit, ctx.canvas.height);
			let x = ind2x(formant.time_step - offset, max_length, ctx.canvas.width);
			ctx.fillRect(x - 2, y - 2, 4, 4);
		});
	})

	ctx.fillStyle = 'red';
	ctx.strokeStyle = 'red';
	averages.forEach((average, i) => {

		let y_mean = ctx.canvas.height - ind2x(average.mean, nyquist_limit, ctx.canvas.height);
		let y_std_min = ctx.canvas.height - ind2x(average.mean - average.stdev, nyquist_limit, ctx.canvas.height);
		let y_std_max = ctx.canvas.height - ind2x(average.mean + average.stdev, nyquist_limit, ctx.canvas.height);

		let x_min = ind2x(0, max_length, ctx.canvas.width);
		let x_max = ind2x(max_length, max_length, ctx.canvas.width);

		ctx.beginPath();
		ctx.moveTo(x_min, y_mean);
		ctx.lineTo(x_max, y_mean);
		ctx.stroke();

		ctx.globalAlpha = 0.2;
		ctx.fillRect(x_min, y_std_min, x_max, 2 * (y_mean - y_std_min));
		ctx.globalAlpha = 1.0;
		ctx.fillText(`[F${i + 1}] mean: ${average.mean.toFixed(0)}Hz, stdev: ${average.stdev.toFixed(0)}Hz (${average.formant_data.length} samples)`, x_min + 5, y_std_min + 10);


		ctx.beginPath();
		average.formant_data.forEach((formant, i) => {
			y = ctx.canvas.height - ind2x(formant.frequency, nyquist_limit, ctx.canvas.height);
            x = ind2x(formant.time_step - offset, max_length, ctx.canvas.width);
			
			ctx.fillRect(x - 2, y - 2, 4, 4);

			if (i == 0) { ctx.moveTo(x, y); }
			else { ctx.lineTo(x, y); }
		})
		ctx.stroke();
	})
};

const plot_tracks = (tracker: FormantTracker, settings: GlobalConfiguration, ctx: CanvasRenderingContext2D, offset : number = 0) => {
    let nyquist_limit = settings.sample_rate_hz / 2;
    let w = 5;

	let raw_poles = tracker.get_raw_poles();
	let tracks = tracker.get_tracks();
	let max_length = tracker.get_max_length();

    ctx.fillStyle = 'blue';
	raw_poles.forEach(poles => {
		poles.forEach(pole => {
            let w = 1.5;
			let y = ctx.canvas.height - ind2x(pole.frequency, nyquist_limit, ctx.canvas.height);
			let x = ind2x(pole.time_step - offset, max_length, ctx.canvas.width);
			ctx.fillRect(x - w/2, y - w/2, w, w);
		});
	})


    ctx.fillStyle = "red";
    ctx.strokeStyle = "red";
    tracks.forEach(track => {
        ctx.beginPath()
        track.poles.forEach((pole, i) => {
            let x = ind2x(pole.time_step - offset, max_length, ctx.canvas.width);
            let y = ctx.canvas.height - ind2x(pole.frequency, nyquist_limit, ctx.canvas.height);
            let y_band_min = ctx.canvas.height - ind2x(pole.frequency - pole.bandwidth / 2, nyquist_limit, ctx.canvas.height);
            let y_band_max = ctx.canvas.height - ind2x(pole.frequency + pole.bandwidth / 2, nyquist_limit, ctx.canvas.height);

            if (i == 0) { ctx.moveTo(x - w/2, y - w/2); }

            ctx.lineTo(x, y);
            ctx.moveTo(x, y_band_min);
            ctx.lineTo(x, y_band_max);
            ctx.moveTo(x, y);
            ctx.fillRect(x - w/2, y - w/2, w, w);
        });
        ctx.stroke()
    })
}

// export const plot_formant_bars = (history : FormantHistory, settings: GlobalConfiguration, ctx: CanvasRenderingContext2D) => {
//     let nyquist_limit = settings.sample_rate_hz / 2;

//     for (let f_i = 0; f_i < history.formant_count; f_i++ ) {
//         ctx.beginPath();
//         let freq: number, x : number, y : number;

//         for (let i = 0; i < history.smooth_formants.length; i++) {
//             if (f_i < history.smooth_formants[i].length) {
//                 let formant = history.smooth_formants[i][f_i];
                
//                 freq = formant.frequency;
//                 y = ctx.canvas.height - ind2x(freq, nyquist_limit, ctx.canvas.height);
//                 x = ind2x(i, history.max_length, ctx.canvas.width);
//                 if (i == 0) { ctx.moveTo(x, y); }
//                 ctx.lineTo(x, y);
//             }
//         }

//         ctx.fillText(`F: ${freq.toFixed(0)} Hz`, x, y - 10);

//         ctx.stroke();
//     }
// };

export const plot_formant_average = (formant : FormantAverage, settings : GlobalConfiguration, ctx : CanvasRenderingContext2D, offset : number = 0, scalefactor : number = 1.0) => {
	let x = ind2x(formant.mean, settings.sample_rate_hz / 2, ctx.canvas.width);
	let x_min = ind2x(formant.mean - formant.stdev, settings.sample_rate_hz / 2, ctx.canvas.width);
	let y = amp2y(0, ctx.canvas.height, offset);

	ctx.fillStyle = 'red';
	ctx.globalAlpha = 0.2;
	ctx.fillRect(x_min, 0, 2 * (x - x_min), ctx.canvas.height);
	ctx.globalAlpha = 1.0;

	ctx.strokeStyle = 'red';
	ctx.beginPath();
	ctx.moveTo(x, 0);
	ctx.lineTo(x, ctx.canvas.height);
	ctx.stroke();
    ctx.fillText(`F: ${formant.mean.toFixed(0)} Hz (${formant.formant_data.length} samples)`, x + 2, y - 200);
}


export const plot_formant = (formant : Formant, settings : GlobalConfiguration, ctx : CanvasRenderingContext2D, offset : number = 0, scalefactor : number = 1.0, index : number = -1) => {
	let w = 5;
	let h = 5;

	let x = ind2x(formant.frequency, settings.sample_rate_hz / 2, ctx.canvas.width) - w / 2;
	let y = amp2y(formant.amplitude * scalefactor, ctx.canvas.height, offset) - h / 2;

    ctx.fillRect(x, y, w, h);
	ctx.fillText(`F${(index > 0) ? index : ''}: ${formant.frequency.toFixed(0)} Hz`, x + 2, y - h);
}

export const plot_pole = (pole : Pole, settings : GlobalConfiguration, ctx : CanvasRenderingContext2D, offset : number = 0, scalefactor : number = 1.0, index : number = -1) => {
	let w = 5;
	let h = 5;

	let x = ind2x(pole.frequency, settings.sample_rate_hz / 2, ctx.canvas.width) - w / 2;
	let y = amp2y(28, ctx.canvas.height, offset) - h / 2;

    ctx.fillRect(x, y, w, h);
	ctx.fillText(`F${(index > 0) ? index : ''}: ${pole.frequency.toFixed(0)} Hz`, x + 2, y - h);
}


export const plot_samples = (b, N, ctx, offset=0) => {
	ctx.beginPath()
	ctx.moveTo(0, amp2y(b._data[0], ctx.canvas.height, offset))
	
	for (let i = 0; i < b._data.length; i++) {
		let amplitude = b._data[i]
		ctx.lineTo(ind2x(i, N, ctx.canvas.width), amp2y(amplitude, ctx.canvas.height, offset));
	}

	ctx.stroke();
}

export const plot_samples_f32a = (signal: Float32Array, N: number, ctx : CanvasRenderingContext2D, offset: number = 0, scalefactor: number = 1.0) => {
	ctx.beginPath()
	ctx.moveTo(ind2x(0, N, ctx.canvas.width), amp2y(signal[0], ctx.canvas.height, offset))
	
	for (let i = 1; i < N; i++) {
		let amplitude = scalefactor * signal[i];
		ctx.lineTo(ind2x(i, N, ctx.canvas.width), amp2y(amplitude, ctx.canvas.height, offset));
	}

	ctx.stroke();
}

export const highlight_timeslice = (start:number, end:number, N:number, ctx:CanvasRenderingContext2D) => {

	let x_start = ind2x(start, N, ctx.canvas.width);
	let x_end = ind2x(end, N, ctx.canvas.width);
	let y = 0;
	let h = ctx.canvas.height;
	let w = x_end - x_start;

	ctx.strokeStyle = 'red';
	ctx.beginPath()
	ctx.moveTo(x_start, y);
	ctx.lineTo(x_start, y + h);
	ctx.stroke()

	ctx.beginPath()
	ctx.moveTo(x_end, y);
	ctx.lineTo(x_end, y + h);
	ctx.stroke()

	ctx.fillStyle = 'red';
	ctx.globalAlpha = 0.2;
	ctx.fillRect(x_start, y, w, h);
	ctx.globalAlpha = 1.0;

}

export const render_timeslice = (formant_analyzer: FormantAnalyzer, formant_history: FormantHistory, tracker : FormantTracker, ctx : CanvasRenderingContext2D, settings :GlobalConfiguration, offset : number = 0) => {

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    let signal = formant_analyzer.get_signal();
    let envelope = formant_analyzer.get_envelope();
    let raw_formants = formant_history.get_raw_formants()
    let averages = formant_history.get_averages();

    let tracks = tracker.get_tracks()
    
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

    tracks.forEach(t => {
        let latest = t.poles[t.poles.length - 1];
        plot_pole(latest, settings, ctx);
    })
}

export const render_formant_bars = (_ : FormantAnalyzer, formant_history : FormantHistory, tracker : FormantTracker, ctx : CanvasRenderingContext2D, settings : GlobalConfiguration, offset : number = 0) => {
	ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
	// plot_formant_bars(formant_history, settings, ctx, offset);
    plot_tracks(tracker, settings, ctx, offset);
}

export const render_formant_plane = (_: FormantAnalyzer, formant_history: FormantHistory, tracker : FormantTracker, ctx: CanvasRenderingContext2D, settings : GlobalConfiguration, offset : number = 0) => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let tracks = tracker.get_tracks()
    let averages = tracks.slice(0,2)

    console.log(tracks);
    console.log(averages);

    // taken from a table on wikipedia
    // url: https://en.wikipedia.org/wiki/Formant#cite_note-6
    let references = [
        // {name: 'i', f1: 294, f2: 2343},
        {name: "i",	f1: 240, f2: 2400},
        {name: "y",	f1: 235, f2: 2100},
        {name: "e",	f1: 390, f2: 2300},
        {name: "ø",	f1: 370, f2: 1900},
        {name: "ɛ",	f1: 610, f2: 1900},
        {name: "œ",	f1: 585, f2: 1710},
        {name: "a",	f1: 850, f2: 1610},
        {name: "ɶ",	f1: 820, f2: 1530},
        {name: "ɑ",	f1: 750, f2: 940},
        {name: "ɒ",	f1: 700, f2: 76},
        {name: "ʌ",	f1: 600, f2: 1170},
        {name: "ɔ",	f1: 500, f2: 700},
        {name: "ɤ",	f1: 460, f2: 1310},
        {name: "o",	f1: 360, f2: 640},
        {name: "ɯ",	f1: 300, f2: 1390},
        {name: "u",	f1: 250, f2: 595},
    ]

    let f1_range = {min: 200, max: 950};
    let f2_range = {min: 400, max: 2500};

    references.forEach(ref => {
        let y = ind2x(ref.f1 - f1_range.min, (f1_range.max - f1_range.min), ctx.canvas.height);
        let x = ctx.canvas.width - ind2x(ref.f2 - f2_range.min, (f2_range.max - f2_range.min), ctx.canvas.width);

        ref.x = x;
        ref.y = y;

        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'black';
        ctx.fillRect(x, y, 5, 5);
        ctx.fillText(`${ref.name}`, x + 10, y + 5)
        // ctx.fillText(`F1: ${Math.floor(ref.f1)},`, x + 10, y + 5);
        // ctx.fillText(`F2: ${Math.floor(ref.f2)}`, x + 10, y + 17);
    })

    
    if (averages.length == 2) { // we have enough formants to plot
        let f1 = averages[0];
        let f2 = averages[1];

        let f1_hist = f1.poles.slice(0,5);
        let f1_freq = f1_hist.reduce((a,b) => a + b.frequency, 0) / f1_hist.length;

        let f2_hist = f2.poles.slice(0,5);
        let f2_freq = f2_hist.reduce((a,b) => a + b.frequency, 0) / f2_hist.length;

        console.log(f1_freq)
        console.log(f2_freq)

        let result = references.map(ref => {
            

            return {
                name: ref.name, 
                x: ref.x, 
                y: ref.y,
                err: Math.sqrt(Math.pow(f1_freq - ref.f1, 2) + Math.pow(f2_freq - ref.f2, 2))}
        });

        result.sort((a,b) => a.err - b.err);
        let guess = result[0];

        
        // 2500 = max f2 freq on plot
        let y = ind2x(f1_freq - f1_range.min, (f1_range.max - f1_range.min), ctx.canvas.height);
        let x = ctx.canvas.width - ind2x(f2_freq - f2_range.min, (f2_range.max - f2_range.min), ctx.canvas.width);


        ctx.fillStyle = 'red';
        ctx.strokeStyle = 'red';
        ctx.fillRect(x, y, 5, 5);
        ctx.fillText(`${guess.name}`, x + 10, y - 10);
        ctx.fillText(`F1: ${Math.floor(f1_freq)},`, x + 10, y + 5);
        ctx.fillText(`F2: ${Math.floor(f2_freq)}`, x + 10, y + 17);

        ctx.beginPath()
        ctx.moveTo(x + 2.5, y + 2.5);
        ctx.lineTo(guess.x + 2.5, guess.y + 2.5);
        ctx.stroke();

        
    }
}


/* NOTE(Nic): these need to be refactored to take a "rendering rect" that says 
 * where they should be rendered, and what the width and height of the renderable area is.
 */
export const amp2y = (amplitude : number, height : number, offset : number = 0) => {
	return Math.floor(((amplitude + 1.0) / 2.0) * height) + offset;
}

export const ind2x = (index : number, samples : number, width: number) => {
	return Math.floor(index * (width / samples))
}