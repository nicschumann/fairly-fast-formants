import path from 'path';
import { defineConfig } from 'vite';
import wasmPack from 'vite-plugin-wasm-pack';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src-js/formants/index.ts'),
      name: 'formants',
      fileName: (format) => `formants.${format}.js`
    },
    minify: false
  },
  plugins: [wasmPack(['./src-wasm'])]
});
