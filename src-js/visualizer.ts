import { GlobalConfiguration } from "./configuration";
import { Formant } from "./formants";


interface RenderingContext {
    ctx : CanvasRenderingContext2D 
};

export const  get_fullscreen_canvas_context = (canvas_id : string) => {
	let canvas = <HTMLCanvasElement> document.getElementById(canvas_id);
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	return canvas.getContext('2d');
};

export const plot_formant_average = (formant, index,  N, ctx, offset=0) => {
	let x = ind2x(formant[0], N);
	let y = amp2y(0, offset);

	ctx.beginPath();
	ctx.moveTo(x, y - 300);
	ctx.lineTo(x, y + 300);
	ctx.stroke();
	
	ctx.fillText(` F${index + 1}: ${Math.floor(formant[1])} Hz (avg)`, x + 2, y - 200 + 20 * index);
}


export const plot_formant = (formant : Formant, settings : GlobalConfiguration, ctx : CanvasRenderingContext2D, offset : number = 0, scalefactor : number = 1.0) => {
	let w = 5;
	let h = 5;

	let x = ind2x(formant.frequency, settings.sample_rate_hz / 2) - w / 2;
	let y = amp2y(formant.amplitude * scalefactor, offset) - h / 2;

    ctx.fillRect(x, y, w, h);
	ctx.fillText(`F: ${formant.frequency.toFixed(0)} Hz`, x + 2, y - h);
}


export const plot_samples = (b, N, ctx, offset=0) => {
	ctx.beginPath()
	ctx.moveTo(0, amp2y(b._data[0], offset))
	
	for (let i = 0; i < b._data.length; i++) {
		let amplitude = b._data[i]
		ctx.lineTo(ind2x(i, N), amp2y(amplitude, offset));
	}

	ctx.stroke();
}

export const plot_samples_f32a = (b : Float32Array, N, ctx, offset=0, scalefactor=1.0) => {
	ctx.beginPath()
	ctx.moveTo(0, amp2y(b[0], offset))
	
	for (let i = 1; i < N; i++) {
		let amplitude = scalefactor * b[i];
		ctx.lineTo(ind2x(i, N), amp2y(amplitude, offset));
	}

	ctx.stroke();
}


/* NOTE(Nic): these need to be refactored to take a "rendering rect" that says 
 * where they should be rendered, and what the width and height of the renderable area is.
 */
const amp2y = (amplitude : number, offset : number = 0) => {
	return Math.floor(((amplitude + 1.0) / 2.0) * window.innerHeight) + offset;
}

const ind2x = (index : number, samples : number) => {
	return Math.floor(index * (window.innerWidth / samples))
}