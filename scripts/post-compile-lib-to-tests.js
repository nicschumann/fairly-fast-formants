const fs = require('fs');
const SOURCE_FILE = './dist/formants.es.js';
const TARGET_FILE = './dist/formants.test.es.mjs';


let replacement_targets = [
    // This replacement inserts a dummy variable
    // that's required to avert a undefined-dereference 
    // in the second param of a new URL() constructor.
    // The second param is the base url param, which is not relevant,
    // because we're loading an inlined base64 wasm application.
    {
        find: 'async function init(input) {\n',
        replace: 'async function init(input) {\n\tlet self = {};'
    }
]

let js_src = fs.readFileSync(SOURCE_FILE).toString();
js_src = 'import fetch from "node-fetch";\n' + js_src;

replacement_targets.forEach(replacement => {
    js_src = js_src.replace(replacement.find, replacement.replace);
});

fs.writeFileSync(TARGET_FILE, js_src);


