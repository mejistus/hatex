// Render a .tex file to a static HTML page ahead of time (build step, SSG,
// no JavaScript needed to read it). The runtime is still included so TikZ
// pictures, \ref links and \resizebox fitting work.
//
//   npm install                     (installs KaTeX)
//   node examples/node/prerender.mjs [in.tex] [out.html]
//   default: examples/document/example.tex → examples/document/static.html
import { readFileSync, writeFileSync } from 'node:fs';
import katex from 'katex';
import HaTeX from '../../dist/hatex.mjs';

const input = process.argv[2] || 'examples/document/example.tex';
const output = process.argv[3] || 'examples/document/static.html';

HaTeX.use({ katex }); // Prism works the same way: HaTeX.use({ Prism }) with the prismjs package
const source = readFileSync(input, 'utf8');
const title = (/^%\s*title:\s*(.+)$/m.exec(source) || [, 'Document'])[1].trim();

for (const p of HaTeX.lint(source)) console.warn(`${input}:${p.line}: ${p.severity}: ${p.message}`);

writeFileSync(output, `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/</g, '&lt;')}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<link rel="stylesheet" href="../../dist/hatex.css">
<style>body { max-width: 46rem; margin: 3rem auto; padding: 0 1.25rem; font-family: system-ui, sans-serif; }</style>
</head>
<body>
<article class="hatex">
${HaTeX.parse(source)}
</article>
<script src="../../dist/hatex.js"></script>
<script>HaTeX.enhance(document.querySelector('.hatex'), { tikzSvgBase: 'tikz/' });</script>
</body>
</html>
`);
console.log(`${input} → ${output}`);
