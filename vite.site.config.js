import { defineConfig } from 'vite';
import wasmPack from 'vite-plugin-wasm-pack';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';

export default defineConfig({
  build: {
    minify: false
  },
  plugins: [
    svelte({ preprocess: preprocess() }),
    wasmPack(['./formants-wasm']),
  ],
  rollupDedupe: ['svelte']
});
