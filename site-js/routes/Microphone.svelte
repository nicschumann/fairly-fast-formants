<script lang="ts">
    import { onDestroy } from 'svelte';
    import { settings } from '../lib/configuration';
    import { init, signal } from '../state';
    import TrackingCanvas from '../components/TrackingCanvas.svelte';
    import { render_formant_bars, render_timeslice, render_formant_plane } from '../lib/visualization';

    let microphone_data = {
        initialized: false,
        signal: null,
        node: null,
        interval_id: null,
        timestep: 0,
    };

    const prepare_analyzer_node = async () => {
        await init(settings.history_length);

        let audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
        let user_audio = await navigator.mediaDevices.getUserMedia({audio: true});
	
        let source_node = audio_context.createMediaStreamSource(user_audio);
        let gain_node = audio_context.createGain();
        let analyzer_node = new AnalyserNode(audio_context, {fftSize: settings.frequency_bins});

        source_node.connect(gain_node);
        gain_node.connect(analyzer_node);

        let block_size = Math.floor(settings.sample_window_length_ms * settings.sample_rate_hz)
        microphone_data.node = analyzer_node;
        microphone_data.initialized = true;
        microphone_data.signal = new Float32Array(block_size);

        microphone_data.interval_id = setInterval(() => {
            if (microphone_data.initialized) {
                analyzer_node.getFloatTimeDomainData(microphone_data.signal);
                if (microphone_data.signal.length == block_size) {
                    signal.set({signal: microphone_data.signal, timestep: microphone_data.timestep});
                    microphone_data.timestep += 1;
                }
            }
        }, settings.frametime_ms);
    }

    onDestroy(async () => {
        if (microphone_data.initialized) { clearInterval(microphone_data.interval_id); }
    });

    $: offset = Math.max(0, microphone_data.timestep - settings.history_length);
</script>



<section class="file-overview file-section">
    <h1 class="file-name">Mic Input</h1>
    {#if !microphone_data.initialized}
        <button on:click="{prepare_analyzer_node}">Begin Analysis</button>
    {/if}
</section>


<section class="file-analysis file-section">
    {#if microphone_data.initialized }
        <section class="analysis-tool">
            <div class="analysis-tool-title">Timeslice View</div>
            <div class="canvas-container">
                <div class="y-axis-label axis-label"><h6>Amplitude</h6></div>
                <div class="x-axis-label axis-label"><h6>Time (ms) / <span class="blue">Freq (Hz)</span></h6></div>
                <TrackingCanvas offset="{offset}" id="timeslice-canvas" render="{render_timeslice}" />
            </div> 
        </section>

        <section class="analysis-tool">
            <div class="analysis-tool-title">Formant Tracker</div>
            <div class="canvas-container">
                <div class="y-axis-label axis-label"><h6>Freq (Hz)</h6></div>
                <div class="x-axis-label axis-label"><h6>Timeslice</h6></div>
                <TrackingCanvas offset="{offset}" id="formants-canvas" render="{render_formant_bars}" />
            </div> 
        </section>

        <section class="analysis-tool">
            <div class="analysis-tool-title">Formant Plot</div>
            <div class="canvas-container">
                <div class="y-axis-label axis-label"><h6>F1 (Hz)</h6></div>
                <div class="x-axis-label axis-label"><h6>F2 (Hz)</h6></div>
                <TrackingCanvas id="plot-canvas" render="{render_formant_plane}" />
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
   }

   .analysis-tool {
       width:50%;
       margin-left:calc(0.5 * var(--component-margin));
       margin-right:calc(var(--component-margin));

       height:400px;
       /* display:flex;
       flex-flow: column; */
       box-sizing: border-box;
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
   
</style>