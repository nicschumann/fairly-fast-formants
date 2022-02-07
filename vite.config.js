import { defineConfig } from 'vite';
import wasmPack from 'vite-plugin-wasm-pack';

export default defineConfig({
  publicDir: './dist',
  build: {
    minify: false
  },
  plugins: [wasmPack(['./src-wasm'])]
});
