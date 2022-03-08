# Fairly Fast Formants

This project builds a set of fast primitives for entirely client-side formant detection. Formants are the resonant frequencies of the vocal tract, and we can use them approximately identify different vowels in speech. This project was build as part of a stack to help people learn how to pronounce different vowel sounds in different languages.

## API

This library provides interfaces to two systems: a **Formant Analysis System** and a **Formant Tracking System**. The Formant Analysis system is concerned with instantaneous analysis of a time-domain signal, and the extraction of instantaneous estimates of formant frequencies from it. The Formant Tracking System is concerned with the correlating these observations over time. These two components are intended to be loosely coupled; you can use the independently or feed the output of analysis into the tracking system.

*Note: The analysis subsystem is currently in better shape than the tracking subsystem! Improving tracking and providing uncertainty bounds on formant tracks is an eventual goal of this project.*

### Formant Analysis

This library exposes a class `FormantAnalysis` which houses all analysis features. Note that the numerical analysis associated with this class is implemented in web assembly. The `FormantAnalysis` class manages the bridge between youer code and the web assembly datastructure and memory layout. This section of the README outlines the lifecycle of the analyzer.

#### Instantiation

The `FormantAnalysis` class needs to be instantiated with some parameters that control the performance of the analyzer.

```js
import { FormantAnalyzer } from 'fairly-fast-formants';

const analyzer = new FormantAnalyzer({
    /**
     * The order of the LPC model used to analyzer the 
     * time series data. You can think of this as the
     * degree of the polynomial in the denominator of the
     * Vocal Tract Filter's transfer function.
     * 
     * A common formula for this is:
     * sample_frequency (kHz) + 2.
     */
    model_order: 10
    /**
     * This is the length in seconds of the 
     * timeseries you want to analyze. We typically 
     * analyze 30ms = 0.03s windows. We multiply this number
     * by the sample frequency to get the number of samples / window.
     * 
     * For example, for a sample rate of 8192Hz, we would expect
     * Windows of length 245 samples. 
     */
    window_length_s: 0.03
    /**
     * We recommend sampling your audio signal at about 8kHz. This 
     * is high-resolution enough for speech. Remember, the Nyquist limit
     * for this sampling frequency is around 4kHz, and all of the formants 
     * we're interested in are below this frequency. This 8kHz is basically
     * the lowest frequency we can workwith and still have high-enough 
     * resolution to capture the formants data we want.
     */
    sample_rate_hz: 8192,

    /**
     * This is the number of buckets to divide the frequency spectrum
     * into when doing frequency domain analysis. Typically, we pick
     * a power of two. Choosing our default of 512 means we have bins
     * that represent about a 8Hz spread, which is totally fine for 
     * the level of accuracy we want. You can increase this to whatever
     * resolution you need for your data, at the cost of performance. 
     */
    frequency_bins: 512,
});
```

#### Initialization

Once you've constucted an instance of the analyzer, you need to instantiate it. This is done in a separate step, because this method
needs to initialize `wasm`, which must be done asynchronously in the browser.

```js
await analyzer.init();
```

Once this promise is resolved, `wasm` memory has been allocated, and you're ready to start analysis.

#### Analysis

The analyzer exposes a single method for analysis, conveniently named `.analyze()`. This method accepts a single argument: a `Float32Array` of values representing the time-domain window you want to analyze. The output of `WebAudio`'s `AnalyzerNode`'s `getFloatTimeDomainData()` method is a great input for `.analyze()`. The length of this arary **must** be equal to `Math.floor(window_length_s * sample_rate_hz)`. In otherwords, if you're sampling your signal at `8192`Hz and you want to analyze windows of length `0.03`s, you **must** pass a `Float32Array` of length `245` to `analyze()`. 

The `analyze()` method returns a `FormantAnalysisResult` object, which has the following shape:

```ts
interface FormantAnalysisResult {
    valid_input: boolean,
    success: boolean,
    formants: Formant[],
    poles: Pole[]
}
```

As is hopefully evident from this result type, the analysis can fail in at least two ways. The first failure mode is tripped if you pass an invalid input to `analyze()`: specifically if your input array is the wrong length. In this case, the method will return:

```js
const result = {
    valid_input: false,
    success: false,
    formants: [],
    poles: [],
}
```

If you pass a valid input, then the analyzer will try to process is. At this stage, analysis can still fail: specifically, solving the LPC system can fail if its toeplitz matrix is singular (this can happen if your input is correct but degenerate: all zeros, for example). In this case, the method will return:

```js
const result = {
    valid_input: true,
    success: false,
    formants: [],
    poles: []
}
```

If both `valid_input` and `success` are `true`, then the analysis has completed successfully (at least, it should have c:). The formants array will contain an array of `Formant` objects, and the `poles` array will contain an array of `Pole` objects.

##### Formant Objects

Formant objects represent peaks of the frequency-domain LPC polynomial spectrum, analyzed by looking at local maxima this spectrum. They have the following shape:

```ts
interface Formant {
    /**
     * The time step at which this formant was captured
     * This is mostly just helpful for rendering and as an input
     * into the FormantTracking algorithms. It does not have
     * meaning for this window by itself.
     */
    time_step: integer, 
    /**
     * The index of the frequency bin that this formant falls into. 
     * You can use this to index the FFT frequency spectrum of the
     * time domain signal and corellate this formant with any data 
     * you have attached to an FFT spectrum for this window.
     */
    bin_index: integer,
    /**
     * The amplitude of this formant. This number is proportional to
     * the amplitude in dB of this formant in the frequency spectrum.
     * It is *not* exactly equal to the amplitude in dB. (this is because
     * The exact amplitude is not important for current applications and 
     * deriving it required computing an expensive error term for the 
     * LPC polynomial).
     */
    amplitude: float,
    /**
     * What we all really care about: the frequency in Hz of the formant.
     */
    frequency: float
}
```

##### Pole Objects

Pole objects represent zeros of the LPC polynomial. These are poles of the transfer function of the LPC system ~ a well-known representation of formant frequencies. Relative to `Formant` objects, poles give slightly different information. Each pole is a complex number, and formant information can be extracted from it. `wasm` pre-extracts this information for you, as well as passing the original complex number to you as well.

```ts
interface Pole {
    /**
     * The time step at which this pole was captured
     * This is mostly just helpful for rendering and as an input
     * into the FormantTracking algorithms. It does not have
     * meaning for this window by itself.
     */
    time_step: integer,
    /**
     * The imaginary component of this pole.
     */
    imag: float,
    /**
     * The real component of this pole.
     */
    real: float,
    /**
     * Frequency of the formant represented by this pole. Suppose
     * this pole has the form Ae^ia. Then the frequency is 
     * (sampling_freq / two * pi) * a
     */
    frequency: float,
    /**
     * The bandwidth of the formant represented by this pole.
     * Suppose the pole has the form Ae^ia. Then the bandwidth is
     * (sampling_freq / pi) * ln(1 / A)
     */
    bandwidth: float
}
```

##### Why Formants and Poles?

#### Helper Methods

#### Cleanup

When you're done with the class, you can deallocate and clean up it's memory by calling it's `.destroy()` method to deallocate `wasm` structures. Remember, this is a web assembly datastructure. It is your responsibility as the programmer to manage it's lifetime in memory.

```js
analyzer.destroy();
```


## Installation for Development

1. Get `rustup`
2. Get `wasm-pack`
3. `npm install`
4. `npm run build-wasm`
5. `npm run dev`

*Note: you can follow the tutorial [here](https://rustwasm.github.io/book/game-of-life/setup.html) as a rust setup guide.*

You should now have a dev server running the application at `localhost:3000`.


## Tests

- IPA Vowel Samples. [Available here](https://linguistics.ucla.edu/people/hayes/103/Charts/VChart/).

## Optimization Routes

 Main routes for optimization of this are pretty easy to figure out based on looking at where the work is going. Looks like the biggest per-frame time-sucks are:

 1. Evaluating the filter polynomial `F(z) = 1/|A(z)|`, which looks like evaluating 512 unit complex numbers. Best candidate for this would be offloading it the work the GPU via a shader, of offloading it to a `wasm` module. This takes about `20ms` / frame. 
    - After offloading to wasm, I was able to reduce the time cost of evaluating the polynomial by a factor of `100`.

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

- https://wiki.aalto.fi/display/ITSP/Pre-emphasis (pre-emphasis filtering...)

- https://github.com/BYU-ODH/VowelCat (university project building a realtime formant tracking interface... a bit old, but has some references worth looking at.)

- http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.81.136&rep=rep1&type=pdf (formant and phonetic modeling using a hidden markov model...)

- https://www.researchgate.net/publication/251572340_SourceFilter_Factorial_Hidden_Markov_Model_With_Application_to_Pitch_and_Formant_Tracking (More formant tracking.)

- https://www.researchgate.net/publication/237110905_Algorithm_for_formant_tracking_modification_and_synthesis