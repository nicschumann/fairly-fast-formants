<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { formants } from '../state';
    import { settings } from '../lib/configuration';
    import { render_timeslice } from '../lib/visualization';

    interface ComponentState {
        ctx : CanvasRenderingContext2D
    }

    let canvas_state : ComponentState = {
        ctx : null
    };

    const set_canvas_size = () => {
        let rect = canvas_state.ctx.canvas.getBoundingClientRect();
        canvas_state.ctx.canvas.width = rect.width;
        canvas_state.ctx.canvas.height = rect.height;
    }

    onMount(async () => {
        let canvas = <HTMLCanvasElement> document.getElementById('timeslice-canvas-analyzer');
        canvas_state.ctx = canvas.getContext('2d');
        set_canvas_size();
        window.addEventListener('resize', set_canvas_size);
    });

    onDestroy(async () => {
        window.removeEventListener('resize', set_canvas_size);
    })

    $: if (canvas_state.ctx != null) {
        render_timeslice($formants.analyzer, $formants.history, canvas_state.ctx, settings);
    }
</script>

<div class="timeslice-canvas">
    <canvas id="timeslice-canvas-analyzer"></canvas>
</div>

<style>
    .timeslice-canvas { 
        width:100%;
        height:100%;

        border:1px solid black;
        border-radius: 5px;
        box-shadow: black 1px 1px 0px;
    }

    #timeslice-canvas-analyzer {
        width:100%;
        height:100%;
    }
</style>