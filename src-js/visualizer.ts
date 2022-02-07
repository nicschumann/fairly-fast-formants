export const  get_fullscreen_canvas_context = (canvas_id) => {
	let canvas = document.getElementById(canvas_id);
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


export const plot_formant = (formant, index, N, ctx, offset=0) => {
	let w = 5;
	let h = 5;

	let x = ind2x(formant[0], N) - w / 2;
	let y = amp2y(formant[2], offset) - h / 2;

	ctx.fillRect(x, y, w, h);
	ctx.fillText(`${(index > 1) ? '?' : ''} F${index + 1}: ${Math.floor(formant[1])} Hz`, x + 2, y - h);
}


export const plot_samples = (b, N, ctx, offset=0) => {
	ctx.beginPath()
	ctx.moveTo(0, amp2y(b._data[0]))
	
	for (let i = 0; i < b._data.length; i++) {
		let amplitude = b._data[i]
		ctx.lineTo(ind2x(i, N), amp2y(amplitude, offset));
	}

	ctx.stroke();
}

export const plot_samples_f32a = (b, N, ctx, offset=0, scalefactor=1.0) => {
	ctx.beginPath()
	ctx.moveTo(0, amp2y(b[0]))
	
	for (let i = 1; i < N; i++) {
		let amplitude = scalefactor * b[i];
		ctx.lineTo(ind2x(i, N), amp2y(amplitude, offset));
	}

	ctx.stroke();
}


/* NOTE(Nic): these need to be refactored to take a "rendering rect" that says 
 * where they should be rendered, and what the width and height of the renderable area is.
 */
const amp2y = (amplitude, offset=0) => {
	return parseInt(((amplitude + 1.0) / 2.0) * window.innerHeight) + offset;
}

const ind2x = (index, samples) => {
	return parseInt(index * (window.innerWidth / samples))
}