<script lang='ts'>
    import { settings } from '../lib/configuration';
    import { get_file_blocks_f32a } from '../lib/file';
    import { test_data, AudioFileHandle } from '../state/data';
    import { init, signal } from '../state';
    import TrackingCanvas from '../components/TrackingCanvas.svelte';
    import { render_formant_bars, render_timeslice } from '../lib/visualization';


    export let name : string = '';

    const data : AudioFileHandle = test_data[name];

    const file_state = {
        initialized : false,
        block_index: 0,
        block_data: [],
    }

    const prepare_audio_context = async () => {
        let audio_context = new AudioContext({sampleRate: settings.sample_rate_hz});
		let {blocks} = await get_file_blocks_f32a(data.filepath, audio_context, settings);
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

<section class="file-overview">
    <h1 class="file-name">{data.name}</h1>
    {#if !file_state.initialized}
        <button class="start-analysis" on:click="{prepare_audio_context}">Begin Analysis</button>
    {:else}
        <button class="prev-block" on:click="{go_to_prev_block}">Prev</button>   
        <button class="next-block" on:click="{go_to_next_block}">Next</button>   
    {/if}
</section>

<section class="file-analysis">
    {#if file_state.initialized }
        <div class="timeslice-canvas-container"><TrackingCanvas id="timeslice-canvas" render="{render_timeslice}" /></div>
        <div class="formants-canvas-container"><TrackingCanvas id="formants-canvas" render="{render_formant_bars}" /></div>
    {/if}
</section>

<style>
    section {
        padding:var(--component-margin);
    }

   .file-overview {
       border-bottom: 1px solid black;
   }

   .file-analysis {
       display: flex;
       width:100%;
   }

   .timeslice-canvas-container {
       width:calc(45% - var(--component-margin) / 2);
       margin-right:var(--component-margin);
       height:400px;
   }
</style>