import * as math from 'mathjs';


const autocorrelate = (x : math.Matrix, p : number) : math.Matrix => {
	let t_start = performance.now();
	let r = []
	for (let i = 0; i < p; i++) {
		let x_l = math.subset(x, math.index(math.range(i, x.size()[0])))
		let x_r = math.subset(x, math.index(math.range(0, x.size()[0] - i)))
		let res = math.multiply(x_l, x_r);

		r.push(res)
	}

	let result = math.matrix(r);

	let t_end = performance.now()
	console.log(`autocorrelate: ${t_end - t_start}ms`);

	return result;
};


const toeplitz = (x : math.Matrix) : math.Matrix => {
	let t_start = performance.now()
	let r = []
	for (let i = 0; i < x.size()[0]; i++) {
		let l_ind = [...Array(i).keys()].map(x => x + 1).reverse();
		let r_ind = [...Array(x.size()[0] - i).keys()]

		let row_ind = l_ind.concat(r_ind);
		let row = math.subset(x, math.index(row_ind))

		r.push(row);
	}

	let result = math.matrix(r)
	let t_end = performance.now()
	console.log(`build toeplitz: ${t_end - t_start}ms`);

	return result;

};


export const lpc = (signal : math.Matrix, order : number) : math.Matrix => {
	let t_start, t_end;
	let p = order + 1;
	let r = autocorrelate(signal, p)
	console.log('ac:', r);

	t_start = performance.now();
	let a = math.subset(r, math.index(math.range(0, r.size()[0] - 1)));
	let b = math.multiply(-1, math.subset(r, math.index(math.range(1, r.size()[0]))));

	// let b = math.subset(r, math.index(math.range(1, r._size[0])));
	t_end = performance.now();
	console.log(`prep toeplitz: ${t_end - t_start}ms`);

	let X = toeplitz(a)

	
	t_start = performance.now()
	let X_inv = math.inv(X)
	let coeffs = math.multiply(X_inv, b);
	let result = math.matrix([1.0].concat(coeffs._data)); // don't forget to add that leading 1...
	t_end = performance.now();
	console.log(`solve system: ${t_end - t_start}ms`);
	
	return result;
};