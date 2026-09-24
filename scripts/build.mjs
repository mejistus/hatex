// Builds dist/ from src/: one script (classic <script>, CommonJS) and one
// ES module holding the same code, plus the stylesheet. No dependencies.
//
//   node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const { version } = JSON.parse(read('package.json'));

// Order matters only for the runtime, which picks up window.Bib when it loads.
const MODULES = ['src/tikz-nn.js', 'src/latex.js', 'src/extend.js', 'src/lint.js', 'src/bib.js', 'src/runtime.js'];
const banner = `/*! hatex v${version} — LaTeX to HTML in the browser. MIT License. Built from src/ by scripts/build.mjs. */\n`;
const body = MODULES.map(p => `// ── ${p} ──\n${read(p).trim()}\n`).join('\n').replace('__VERSION__', version);

// The modules write to `window`; outside a browser that is globalThis.
const host = `typeof window !== 'undefined' ? window : globalThis`;
const script = `${banner}(function (window) {\n${body}}).call(this, ${host});\n`;
const esm = `${banner}const HaTeX = (function (window) {\n${body}return window.HaTeX;\n}).call(undefined, ${host});\n` +
  `export default HaTeX;\nexport const { use, parse, render, enhance, lint, images, tikzSvgs, Bib } = HaTeX;\n`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/hatex.js'), script);
writeFileSync(join(root, 'dist/hatex.mjs'), esm);
writeFileSync(join(root, 'dist/hatex.css'), banner + read('src/hatex.css'));
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log(`hatex v${version}: dist/hatex.js ${kb(script)}, dist/hatex.mjs ${kb(esm)}, dist/hatex.css ${kb(read('src/hatex.css'))}`);
