const fs = require('fs');
const TARGET_FILE = './formants-wasm/pkg/formants_wasm.js';

const REGION_DELIMITER = 'const { instance, module } = await load(await input, imports);'

let replacement_targets = [
    {
        find: 'const { instance, module } = await load(await input, imports);',
        replace: 'const instance = { exports : await initialize(imports) };'
    },
    {
        find: 'init.__wbindgen_wasm_module = module;\n',
        replace: ''
    }
]

let js_src = fs.readFileSync(TARGET_FILE).toString();
js_src = 'import initialize from "./formants_wasm_bg.wasm";\n' + js_src;

replacement_targets.forEach(replacement => {
    js_src = js_src.replace(replacement.find, replacement.replace);
});

fs.writeFileSync(TARGET_FILE, js_src);


