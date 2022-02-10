import { GlobalConfiguration } from "./configuration";
import { FormantHistory  } from "./formants";
import { FormantAverage, Formant } from "./formants/data";

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

/* NOTE(Nic): these need to be refactored to take a "rendering rect" that says 
 * where they should be rendered, and what the width and height of the renderable area is.
 */
const amp2y = (amplitude : number, height : number, offset : number = 0) => {
	return Math.floor(((amplitude + 1.0) / 2.0) * height) + offset;
}

const ind2x = (index : number, samples : number, width: number) => {
	return Math.floor(index * (width / samples))
}