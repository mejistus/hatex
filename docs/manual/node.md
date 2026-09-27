# Node, bundlers and static sites

`HaTeX.parse` doesn't need a DOM, so documents can be rendered at build time and shipped as plain HTML. Readers then need no JavaScript to read them, and the page appears without waiting for KaTeX or the renderer.

## Installing

hatex isn't published to npm. Install it from the repository, or copy `dist/` into your project:

```sh
npm install github:mejistus/hatex katex
```

KaTeX is a peer dependency, used when you render at build time. Prism (`prismjs`) is optional.

## Rendering in Node

```js
import { readFileSync, writeFileSync } from 'node:fs';
import katex from 'katex';
import HaTeX from 'hatex';                     // dist/hatex.mjs

HaTeX.use({ katex });                          // before parse
const html = HaTeX.parse(readFileSync('post.tex', 'utf8'));
writeFileSync('post.html', `<article class="hatex">${html}</article>`);
```

CommonJS works the same way:

```js
const katex = require('katex');
const HaTeX = require('hatex');                // dist/hatex.js
HaTeX.use({ katex });
```

With highlighting:

```js
import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index.js';
loadLanguages(['python', 'bash']);
HaTeX.use({ katex, Prism });
```

[`examples/node/prerender.mjs`](../../examples/node/prerender.mjs) is a complete script that renders a `.tex` file to a standalone page, taking the title from the front matter and printing lint warnings:

```sh
npm install
node examples/node/prerender.mjs in.tex out.html
```

## The page around pre-rendered HTML

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<link rel="stylesheet" href="hatex.css">

<article class="hatex">…output of parse…</article>

<!-- optional: page behaviour -->
<script src="hatex.js"></script>
<script>HaTeX.enhance(document.querySelector('.hatex'));</script>
```

- `katex.min.css` and `hatex.css` are always needed. `katex.min.js` is not: the maths is already typeset.
- `hatex.js` and `enhance` are needed only for what HTML can't do by itself: TikZ pictures, two columns, `\resizebox` fitting, slides, `\jiazhu` in `guji`, smooth reference scrolling, copy buttons and zoom. Without them, the page is a readable single-column document, and TikZ boxes are empty.
- When enhancing, pass the same options you would pass to `render`, e.g. `{ tikzSvgBase: '/tikz/' }`.

## TikZ at build time

TikZ can't be compiled in Node, because TikZJax needs a browser. The output of `parse` contains each picture's code and hash, and `enhance` in the reader's browser loads `<tikzSvgBase><hash>.svg`. So:

1. compile the pictures once in a browser (in the editor example, or on the page itself with `tikzSvgBase: null`);
2. save the SVGs from `HaTeX.tikzSvgs` into the folder that your build publishes;
3. build.

The hashes that `parse` computes in Node are the same as in the browser, so the saved files match. See [Pre-rendering](tikz.md#pre-rendering).

## Bundlers

With Vite, webpack, esbuild or Rollup, import the ES module and the stylesheet:

```js
import katex from 'katex';
import 'katex/dist/katex.min.css';
import HaTeX from 'hatex';
import 'hatex/hatex.css';

HaTeX.use({ katex });
HaTeX.render(document.querySelector('#post'), source);
```

The library is about 135 KB before minification (plus 26 KB of CSS) and has no dependencies of its own. TikZJax is not bundled; it is loaded from `tikzjaxBase` when needed.

A `.tex` file can be imported as a string with your bundler's raw import, e.g. `import source from './post.tex?raw'` in Vite.

## Frameworks

hatex writes into a DOM element, so in React, Vue or Svelte, give it an element and render in an effect:

```jsx
function Post({ source }) {
  const ref = useRef(null);
  useEffect(() => { HaTeX.render(ref.current, source); }, [source]);
  return <article ref={ref} />;
}
```

Don't let the framework manage the element's children, since `render` replaces them. For server-side rendering, call `parse` on the server, send the HTML with `dangerouslySetInnerHTML` (or your framework's equivalent), and call `enhance` on the client after hydration.

## Static-site generators

The pattern is the same for Eleventy, Hugo (through a Node step), Astro and others: a transform that turns `.tex` files into HTML with `parse`, a layout that includes the two stylesheets, and optionally `hatex.js` with an `enhance` call. The front matter in the `% ---` block can feed the generator's metadata; `HaTeX.lint(source, { frontMatter: true })` checks it.

## Security

The output is meant for your own writing. `\href` and `\url` accept only safe URL schemes, and text is HTML-escaped, but the renderer doesn't aim to be a sanitiser. If you render sources written by other people, pass the output through an HTML sanitiser such as DOMPurify, and allow `<script type="text/x-tikz">` if you want their TikZ pictures.

---
Previous: [The HTML output](html-output.md) · [Contents](README.md) · Next: [Checking sources](checking.md)
