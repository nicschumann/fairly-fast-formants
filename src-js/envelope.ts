import * as math from "mathjs";

const eval_poly = (z, c) => {
	let t_start = performance.now();
	let r = [];

	for (let i = 0; i < z._size[0]; i++) {
		let sum = c._data[0];
		let z_t = z._data[i];
		for (let n = 1; n < c._size[0]; n++) {
			let term = math.multiply(c._data[n], math.pow(z_t, n))
			sum = math.add(sum, term);
		}

		// console.log(sum);
		r.push(sum);
	}

	let result = math.matrix(r);
	
	return result;
};

const frequency_response = (coefficients : math.Matrix, sample_rate : number) : math.Matrix[] => {
	let t_start = performance.now();
	let N = 512;

	let omega = math.multiply( math.pi/N, math.range(0, N));
	let freqs = math.multiply(omega, sample_rate / (2 * math.pi));

	let z = math.exp(math.multiply(math.complex(0,1), omega));
	let A = eval_poly(z, coefficients);
	let h = math.dotDivide(1, A);

	let t_end = performance.now();
	console.log(`eval filter: ${t_end - t_start}ms`);

	return [freqs, h];
};

export const envelope = (coefficients : math.Matrix, sample_rate : number) : math.Matrix[] => {
   let [f, h] = frequency_response(coefficients, sample_rate)
    return [f, math.abs(h)];
};