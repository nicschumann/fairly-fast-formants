# Fairly Fast Formants

This project builds a set of fast primitives for entirely client-side formant detection. Formants are the resonant frequencies of the vocal tract, and we can use them approximately identify different vowels in speech. This project was build as part of a stack to help people learn how to pronounce different vowel sounds in different languages.


## Installation

1. Get `rustup`
2. Get `wasm-pack`
3. `npm install`
4. `npm run wasm`
5. `npm run dev`

You should now have a dev server running the application at `localhost:3000`.


## Tests

- IPA Vowel Samples. [Available here](https://linguistics.ucla.edu/people/hayes/103/Charts/VChart/).

## Optimization Routes

 Main routes for optimization of this are pretty easy to figure out based on looking at where the work is going. Looks like the biggest per-frame time-sucks are:

 1. Evaluating the filter polynomial `F(z) = 1/|A(z)|`, which looks like evaluating 512 unit complex numbers. Best candidate for this would be offloading it the work the GPU via a shader, of offloading it to a `wasm` module. This takes about `20ms` / frame.

 2. Autocorrelation. Autocorellating the samples is a bit of a time-suck because you have to calculate `O(p)` inner products between `O(N_w)` vectors (`p` is the order of the LPC model, and `N_w` is width of the window in samples). This could be offloaded to a `wasm` module. Not really a great candidate for the `GPU` because it uses a lot of variable size buffers, but it could probably be orchestrated if that seems productive overall, this takes about `4ms` on average.

 3. Almost everything else takes less than `1ms`, and isn't worth considering at this stage. For example, forming and inverting the toeplitz system of the LPC takes about `1ms`. Probably because the heavy lifting is basically just inverting a well-conditioned `p x p` matrix. In practice, `p = 10` is pretty good, so this is basically trivial.


## References

- Kim, Hyung-Suk. *Linear Predictive Coding is All-pole Resonance Modeling*. Center for Computer Research in Music and Acoustics at Stanform. [Available here](https://ccrma.stanford.edu/~hskim08/lpc/)

- An overview of Fourier Analysis and LPC from a phonetics perspective. Notes from a Stanford Phonetics class, I think. October 18, 2005. [Available here](https://web.stanford.edu/class/linguist205/index_files/Handout%207%20-%20Spectral%20Analysis%20&%20Meas%20Formants.pdf)

- Formant Estimation with LPC Coefficients. An formant analysis tutorial using MATLAB. [Available here](https://www.mathworks.com/help/signal/ug/formant-estimation-with-lpc-coefficients.html)

- Chart of vowels with a bunch of samples, and formant frequency estimates, [here](https://linguistics.ucla.edu/people/hayes/103/Charts/VChart/).

- LPC in Python. Available [here](https://www.kuniga.me/blog/2021/05/13/lpc-in-python.html).

- Formants from LPC Analysis Data [here](https://www.ee.columbia.edu/~dpwe/papers/SnelM93-fmnt.pdf)

- Spectral Envelope Extraction. Explanitory and fairly technical article available [here](https://www.dsprelated.com/freebooks/sasp/Spectral_Envelope_Extraction.html#eq:lpdef). *Note: This was by far the most useful reference I found.*

- Fast Formant Estimation by Complex Analysis of LPC Coefficients. Available [here](https://eurasip.org/Proceedings/Eusipco/Eusipco2004/defevent/papers/cr1750.pdf)

### Uncategorized

- https://www.titanwolf.org/Network/q/897cc8a1-83eb-44c1-810f-75e485f5c28d/y

- https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.148.4905&rep=rep1&type=pdf