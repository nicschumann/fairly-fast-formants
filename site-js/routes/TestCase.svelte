<script lang='ts'>
    import { onMount } from 'svelte';
    import { GlobalConfiguration, settings } from '../lib/configuration';
    import { audio, formants } from '../data/train-signal-0-data.js';

    import { FormantAnalyzer, FormantFilter } from '../../formants-js';
    import TrackingCanvas from '../components/TrackingCanvas.svelte';
    import { amp2y, ind2x } from '../lib/visualization';



    const test_case_state = {
        audio,
        formants,
        block_index: 0,
        initialized: false,
        results: [],
        timing: []
    };

    const analyze_audio_data = async () => {

        let filter = new FormantFilter();

        let low_order_formant_analyzer = new FormantAnalyzer({
            sample_rate_hz: settings.sample_rate_hz,
            model_order: 8,
            window_length_s: settings.sample_window_length_s,
            frequency_bins: settings.frequency_bins
        })

        filter.update_state();
        filter.update_uncertainty();


        await low_order_formant_analyzer.init();

        test_case_state.audio.forEach((frame, i) => {
            let data_window = new Float32Array(frame);
            let s = performance.now();
            let res = low_order_formant_analyzer.analyze(data_window, i);
            let e = performance.now()
            
            test_case_state.results.push(res);
            test_case_state.timing.push(e - s);
        });

        test_case_state.initialized = true;
    };


    const render = (f, h, a, ctx : CanvasRenderingContext2D, s : GlobalConfiguration, o : number) => {
        let nyquist_limit = s.sample_rate_hz / 2;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        ctx.strokeStyle = '#aaaaaa';
        ctx.beginPath();

        let num_samples = test_case_state.audio.length * 245;

        test_case_state.audio.forEach((block, i) => {
            block.forEach((datapoint, j) => {
                let x = ind2x(i * 245 + j, num_samples, ctx.canvas.width);
                let y = amp2y(datapoint * 5, ctx.canvas.height, 0);
                if (i == 0) { ctx.moveTo(x, y); }
                else { ctx.lineTo(x, y); }
            });
        });

        ctx.stroke();

        // ctx.fillStyle = 'blue';
        // ctx.strokeStyle = 'blue';
        // [0, 1, 2].forEach(f_index => {
        //     ctx.beginPath();

        //     test_case_state.results.forEach((result, i) => {
        //         if (result.success && typeof result.formants[f_index] !== 'undefined') {
        //             let f = result.formants[f_index];
        //             let y = ctx.canvas.height - ind2x(f.frequency, nyquist_limit, ctx.canvas.height);
        //             let x = ind2x(i - o, test_case_state.formants.length, ctx.canvas.width);

        //             if (i == 0) { ctx.moveTo(x, y); }
        //             else { ctx.lineTo(x, y); }
        //             ctx.fillRect(x - 4, y - 2, 4, 4);
        //         }
        //     });

        //     ctx.stroke();

        // });

        ctx.fillStyle = 'red';
        ctx.strokeStyle = 'red';
        [0, 1, 2].forEach(f_index => {
            ctx.beginPath();

            test_case_state.results.forEach((result, i) => {
                if (result.success && typeof result.poles[f_index] !== 'undefined') {
                    let f = result.poles[f_index];
                    let y = ctx.canvas.height - ind2x(f.frequency, nyquist_limit, ctx.canvas.height);
                    let x = ind2x(i - o, test_case_state.formants.length, ctx.canvas.width);

                    if (i == 0) { ctx.moveTo(x, y); }
                    else { ctx.lineTo(x, y); }
                    ctx.fillRect(x - 4, y - 2, 4, 4);
                }
            });

            ctx.stroke();

        });

        

        ctx.fillStyle = "black";
        ctx.strokeStyle = "black";
        [0, 1, 2].forEach(f_index => {
            ctx.beginPath()

            test_case_state.formants.forEach((true_formant_slice, i) => {
                let f = true_formant_slice[f_index] * 1000;
                let y = ctx.canvas.height - ind2x(f, nyquist_limit, ctx.canvas.height);
                let x = ind2x(i - o, test_case_state.formants.length, ctx.canvas.width);
                if (i == 0) { ctx.moveTo(x, y); }
                else { ctx.lineTo(x, y); }
                ctx.fillRect(x - 2, y - 2, 4, 4);
            });

            ctx.stroke();
        })


        
    }

    const render_waveform = (f, h, a, ctx : CanvasRenderingContext2D, s : GlobalConfiguration, o : number) => {
        
    };


    onMount(async () => {
        await analyze_audio_data();
    })
</script>

<section class="file-overview file-section">
    <h1 class="file-name">Signal 0 (VTR Formants Dataset)</h1>
</section>

<section class="file-analysis file-section">
    {#if test_case_state.initialized }
        <section class="analysis-tool">
            <div class="analysis-tool-title">Ground Truth vs. Raw Measurements</div>
            <div class="canvas-container">
                <div class="y-axis-label axis-label"><h6>Freq (Hz)</h6></div>
                <div class="x-axis-label axis-label"><h6>True /<span class="blue">&nbsp;Peak</span> / <span class="red">Pole</span></h6></div>
                <TrackingCanvas id="timeslice-canvas" render="{render}" />
            </div> 
        </section>
    {/if}
</section>

<style>
    h6 {
        margin:0;
        padding:0;
    }
    
    .file-section {
        padding:var(--component-margin);
        box-sizing: border-box;
    }

   .file-analysis {
       width:100%;
       display: flex;
       flex-flow: row wrap;
   }

   .analysis-tool {
       width:100%;
       margin-left:calc(0.5 * var(--component-margin));
       margin-right:calc(var(--component-margin));
       margin-bottom: 50px;

       height:400px;
       /* display:flex;
       flex-flow: column; */
       box-sizing: border-box;
   }

   .waveform-tool {
       height: 200px;
   }

   .canvas-container {
        flex: 0 1 auto;
        border:1px solid black;
        position: relative;
   }

   .axis-label {
        position: absolute;

        background-color: white;
        padding:5px;
        border: 1px solid black;
        border-radius: 20px;
   }

   .y-axis-label {
       top:50%;
       left:0%;
       transform:translate(-50%,-50%)rotate(-90deg); 
   }

   .x-axis-label {
       top:100%;
       left:50%;
       transform: translate(-50%,-50%);
   }

   .analysis-tool-title {
       background-color: black;
       color:white;
       padding:calc(0.5 * var(--component-margin));
       box-sizing: border-box;
       justify-content: center;
   }


    .blue {
        color: blue;
    }

    .red {
        color:red;
    }
   
</style>