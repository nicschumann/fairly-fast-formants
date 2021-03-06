<script lang='ts'>
    import { settings } from '../lib/configuration';
    import { get_file_blocks_f32a } from '../lib/file';
    import { test_data, AudioFileHandle } from '../state/data';
    import { init, signal } from '../state';
    import TrackingCanvas from '../components/TrackingCanvas.svelte';
    import { render_formant_bars, render_timeslice, render_formant_plane } from '../lib/visualization';


    export let name : string = '';

    const data : AudioFileHandle = test_data[name];

    const file_state = {
        data: test_data[name],
        initialized: false,
        block_index: 0,
        block_data: [],
    }

    const prepare_audio_context = async () => {
        let audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
		let {blocks} = await get_file_blocks_f32a(file_state.data.filepath, audio_context, settings);
		await init(blocks.length);

        file_state.block_index = 2;
        file_state.block_data = blocks;
        file_state.initialized = true;

        signal.set({
            signal: file_state.block_data[file_state.block_index], 
            timestep: file_state.block_index
        });
    }

    const go_to_next_block = async () => {
        let prev_index =  file_state.block_index;
        file_state.block_index = Math.min(prev_index + 1, file_state.block_data.length);

        signal.set({
            signal: file_state.block_data[file_state.block_index], 
            timestep: file_state.block_index
        });
    }

    const go_to_prev_block = async () => {
        let prev_index =  file_state.block_index;
        file_state.block_index = Math.max(prev_index - 1, 0);

        signal.set({
            signal: file_state.block_data[file_state.block_index], 
            timestep: file_state.block_index
        });
    }
</script>

<section class="file-overview file-section">
    <h1 class="file-name">{file_state.data.name}</h1>
    {#if !file_state.initialized}
        <button class="start-analysis" on:click="{prepare_audio_context}">Begin Analysis</button>
    {:else}
        <button class="prev-block" on:click="{go_to_prev_block}">Prev</button>   
        <button class="next-block" on:click="{go_to_next_block}">Next</button>   
    {/if}
</section>

<section class="file-analysis file-section">
    {#if file_state.initialized }
        <section class="analysis-tool">
            <div class="analysis-tool-title">Timeslice View</div>
            <div class="canvas-container">
                <div class="y-axis-label axis-label"><h6>Amplitude</h6></div>
                <div class="x-axis-label axis-label"><h6>Time (ms) / <span class="blue">Freq (Hz)</span></h6></div>
                <TrackingCanvas id="timeslice-canvas" render="{render_timeslice}" />
            </div> 
        </section>

        <section class="analysis-tool">
            <div class="analysis-tool-title">Formant Tracker</div>
            <div class="canvas-container">
                <div class="y-axis-label axis-label"><h6>Freq (Hz)</h6></div>
                <div class="x-axis-label axis-label"><h6>Timeslice</h6></div>
                <TrackingCanvas id="formants-canvas" render="{render_formant_bars}" />
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
       width:33%;
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