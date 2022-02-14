<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { formants } from '../state';
    import { GlobalConfiguration, settings } from '../lib/configuration';
    import { FormantAnalyzer, FormantHistory, FormantTracker } from '../../formants-js';

    export let id : string = "tracking-canvas";
    export let render : (F: FormantAnalyzer, H: FormantHistory, P: FormantTracker, C: CanvasRenderingContext2D, S: GlobalConfiguration, O:number) => void = () => {};
    export let offset : number = 0;

    interface ComponentState {
        ctx : CanvasRenderingContext2D
    }

    let canvas_state : ComponentState = {
        ctx : null
    };

    const set_canvas_size = () => {
        let rect = canvas_state.ctx.canvas.getBoundingClientRect();
        // console.log(rect);
        canvas_state.ctx.canvas.width = rect.width;

        // TODO(Nic): make it dynamic...
        canvas_state.ctx.canvas.height = 400;
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
        render($formants.analyzer, $formants.history, $formants.poles, canvas_state.ctx, settings, offset);
    }
</script>

<canvas {id} class="canvas-analyzer"></canvas>

<style>
    .canvas-analyzer {
        width:100%;
        height:100%;
    }
</style>