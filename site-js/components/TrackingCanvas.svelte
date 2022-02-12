<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { formants } from '../state';
    import { GlobalConfiguration, settings } from '../lib/configuration';
    import { FormantAnalyzer, FormantHistory } from '../../formants-js';

    export let id : string = "tracking-canvas";
    export let render : (F: FormantAnalyzer, H: FormantHistory, C: CanvasRenderingContext2D, S: GlobalConfiguration, O:number) => void = () => {};
    export let offset : number = 0;

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
        let canvas = <HTMLCanvasElement> document.getElementById(id);
        canvas_state.ctx = canvas.getContext('2d');
        set_canvas_size();
        window.addEventListener('resize', set_canvas_size);
    });

    onDestroy(async () => {
        window.removeEventListener('resize', set_canvas_size);
    })

    $: if (canvas_state.ctx != null) {
        render($formants.analyzer, $formants.history, canvas_state.ctx, settings, offset);
    }
</script>

<div class="timeslice-canvas">
    <canvas {id} class="timeslice-canvas-analyzer"></canvas>
</div>

<style>
    .timeslice-canvas { 
        width:100%;
        height:100%;

        border:1px solid black;
        border-radius: 5px;
        box-shadow: black 1px 1px 0px;
    }

    .timeslice-canvas-analyzer {
        width:100%;
        height:100%;
    }
</style>