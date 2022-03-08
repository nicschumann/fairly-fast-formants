import path from 'path';
import { defineConfig } from 'vite';
import wasmPack from 'vite-plugin-wasm-pack';

export default defineConfig({
  publicDir: "./fake-public",
  build: {
    lib: {
      entry: path.resolve(__dirname, 'formants-js/index.ts'),
      name: 'FairlyFastFormants',
      fileName: (format) => `formants.${format}.js`
    },
    minify: false
  },
  plugins: [wasmPack(['./formants-wasm'])]
});
