# JavaScript API

## Loading

| How | You get |
|---|---|
| `<script src="dist/hatex.js">` | `window.HaTeX` |
| `require('hatex')` (CommonJS) | `HaTeX`, from `dist/hatex.js` |
| `import HaTeX from 'hatex'` (ES module) | `HaTeX`, from `dist/hatex.mjs` |
| `import { render, parse } from 'hatex'` | The same functions as named exports: `use`, `parse`, `render`, `enhance`, `layout`, `lint`, `images`, `tikzSvgs` and `Bib` |

The stylesheet is `dist/hatex.css`, or `hatex/hatex.css` through the package's exports.

In every case, the library also sets a few globals that its modules share: `window.parseLatex`, `window.hatexExtend`, `window.lintSource`, `window.referencedImages`, `window.Bib` and `window.TIKZ_NN_PREAMBLE`. Outside a browser, `window` means `globalThis`.

## Overview

| Function | Needs a DOM | Summary |
|---|---|---|
| [`HaTeX.render(target, source, options?)`](#hatexrender) | Yes | Parse into an element and enhance it |
| [`HaTeX.parse(source)`](#hatexparse) | No | LaTeX → HTML string |
| [`HaTeX.enhance(root, options?)`](#hatexenhance) | Yes | Page behaviour for HTML already on the page |
| [`HaTeX.layout(root)`](#hatexlayout) | Yes | Redo the width-dependent layout |
| [`HaTeX.lint(source, options?)`](#hatexlint) | No | Problems in a source |
| [`HaTeX.images(source)`](#hateximages) | No | Local image paths in a source |
| [`HaTeX.tikzSvgs(root)`](#hatextikzsvgs) | Yes | TikZ pictures compiled in this session, as files |
| [`HaTeX.use({ katex, Prism })`](#hatexuse) | No | Supply KaTeX and Prism |
| [`HaTeX.Bib`](#hatexbib) | No (lookup needs `fetch`) | BibTeX parsing, formatting and DOI lookup |
| `HaTeX.version` | No | The version string, e.g. `"1.5.0"` |

---

## `HaTeX.render`

```ts
HaTeX.render(target: Element | string, source: string, options?: Options): Element
```

Renders `source` into `target` and returns the element.

- `target` is an element or a CSS selector; a selector uses the first match. The element's content is replaced.
- The element gets the class `hatex`, which the stylesheet is scoped to.
- It is equivalent to `el.innerHTML = HaTeX.parse(source); HaTeX.enhance(el, options)`.

Calling `render` again on the same element replaces the document and is cheap: an editor can call it on every keystroke (debounced). TikZ pictures that were already compiled come back from the session cache without compiling again.

```js
const el = HaTeX.render('#post', tex, { zoom: false });
```

## `HaTeX.parse`

```ts
HaTeX.parse(source: string): string
```

Converts a LaTeX source to an HTML string. It is pure: no DOM, no network, and it works in Node and in workers. KaTeX must be available (as a global, or through `use`) for maths, and Prism for highlighting; otherwise formulas come out as their source in `<code>` and code as plain text.

The HTML is the document body only. Put it in an element with the class `hatex`:

```js
article.className = 'hatex';
article.innerHTML = HaTeX.parse(tex);
HaTeX.enhance(article);        // optional: see below
```

Each call gives its element ids a new random prefix, so two documents on one page never clash; see [Target ids](references.md#clicking-a-reference).

What `parse` alone does not do is listed under `enhance`. Without `enhance`, the HTML is a complete, readable document in one column, with no TikZ pictures (their boxes stay empty), and in-document links work as plain anchor jumps.

## `HaTeX.enhance`

```ts
HaTeX.enhance(root: Element, options?: Options): Element
```

Adds the page behaviour to HTML produced by `parse`, e.g. HTML rendered at build time. It returns `root` and:

1. adds the class `hatex` to `root` and remembers `options` for it;
2. sets up slide decks: the deck bar, the Present button, double-click to present;
3. runs [`layout`](#hatexlayout): two columns, fitting `\resizebox` content and wide equations, and slide scaling; and runs it again once web fonts have loaded;
4. adds copy buttons to code blocks (unless `copyButtons: false`);
5. makes images and TikZ pictures zoomable (unless `zoom: false`);
6. loads TikZ pictures: from the session cache, from `tikzSvgBase`, or live ([TikZ](tikz.md#how-a-picture-gets-on-the-page)).

Calling it again on the same root is safe. Decks, copy buttons, zoom handlers and pictures that are already set up are skipped.

A few things work for every `.hatex` element on the page, whether it was enhanced or not, because hatex listens on `document` from the moment it loads:

- clicks on `\ref`, `\eqref`, `\cite` and footnote links scroll to the target and flash it;
- window resizes re-run `layout` on every `.hatex` element;
- finished TikZJax compiles are picked up.

## `HaTeX.layout`

```ts
HaTeX.layout(root: Element): void
```

Recomputes everything that depends on the rendered width:

- the split into columns in [two-column documents and `multicols`](columns.md);
- the scale of display equations in columns;
- the scale of `\resizebox` and `adjustbox` content;
- the scale of slides, and the shrinking of slides whose content is too tall;
- the splitting of `\jiazhu` notes in `guji`.

It runs on the next animation frame, not synchronously. hatex runs it by itself after `render`/`enhance`, when fonts load, on window resize and when a TikZ picture arrives. Call it yourself when the element changes width in any other way:

```js
sidebarToggle.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-open');
  HaTeX.layout(document.querySelector('#post'));
});
```

For a container whose size changes often, a `ResizeObserver` can do it:

```js
new ResizeObserver(() => HaTeX.layout(el)).observe(el);
```

## `HaTeX.lint`

```ts
HaTeX.lint(source: string, options?: { frontMatter?: boolean }): Problem[]
type Problem = { line: number, severity: 'error' | 'warning', message: string }
```

Returns the structural problems in a source, sorted by line, with errors before warnings on the same line. `frontMatter: true` also checks the `% ---` front-matter block. The checks and messages are listed in [Checking sources](checking.md).

```js
for (const p of HaTeX.lint(tex)) console.log(`${p.line}: ${p.severity}: ${p.message}`);
```

## `HaTeX.images`

```ts
HaTeX.images(source: string): { path: string, line: number }[]
```

Lists the paths of the `\includegraphics` in a source, with their lines, leaving out `http(s):` and `data:` URLs. Commented-out images and those in verbatim blocks are not listed. Use it to check that the files exist; see [Checking sources](checking.md#images).

## `HaTeX.tikzSvgs`

```ts
HaTeX.tikzSvgs(root: Element): { hash: string, file: string, svg: string }[]
```

Returns the TikZ pictures in `root` that were compiled live during this session, one entry per distinct picture: `file` is `<hash>.svg`, and `svg` is the file content (exactly what TeX produced, ending with a newline). Save them under your `tikzSvgBase` so that readers skip compiling; see [Pre-rendering](tikz.md#pre-rendering). Pictures that were loaded from files are not included.

## `HaTeX.use`

```ts
HaTeX.use(libs: { katex?: object, Prism?: object }): HaTeX
```

Supplies KaTeX and Prism when they aren't globals, as in Node or with a bundler. It sets `window.katex` and `window.Prism` (i.e. `globalThis` outside a browser) and returns `HaTeX`, so calls can be chained. Call it before `parse` or `render`.

```js
import katex from 'katex';
import Prism from 'prismjs';
import 'prismjs/components/prism-python.js';
import HaTeX from 'hatex';

HaTeX.use({ katex, Prism });
```

## `HaTeX.Bib`

Helpers for turning references into `\bibitem` lines. None of them needs a DOM.

### `Bib.parse(text)`

```ts
Bib.parse(text: string): { type: string, key: string, fields: Record<string, string> }[]
```

Parses BibTeX. Entry types and field names are lowercased, braces in values are removed and whitespace is collapsed.

```js
HaTeX.Bib.parse('@article{ho2020, author = {Ho, Jonathan and Jain, Ajay}, title = {{Denoising} Diffusion}, year = 2020}');
// → [{ type: 'article', key: 'ho2020', fields: { author: 'Ho, Jonathan and Jain, Ajay', title: 'Denoising Diffusion', year: '2020' } }]
```

### `Bib.format(entry)`

```ts
Bib.format(entry): string
```

Formats a parsed entry as a `\bibitem` line: `\bibitem{key} Authors. Title. In \emph{Venue}, Year.`

- Authors are abbreviated to initials ("J. Ho"). More than six authors become the first three and "et al.".
- The venue is the first of `booktitle`, `journal`, `journaltitle`, `school`, `institution` and `publisher` (unless the publisher is arXiv). For an arXiv paper without a venue, it is `arXiv:<id>`, found from `eprint`, the DOI or the URL.
- The key is the entry's own key, unless it is a URL or a DOI; then `Bib.key` makes one.

### `Bib.key(entry)`

Returns the entry's key, or makes a readable one from the first author's last name, the year and the first significant word of the title: `ho2020denoising`.

### `Bib.lookup(text)`

```ts
Bib.lookup(text: string): Promise<Entry[]>
```

Fetches BibTeX for a DOI or an arXiv id and parses it. It accepts `10.1000/xyz`, `https://doi.org/10.1000/xyz`, `2006.11239`, `arXiv:2006.11239v2` and `https://arxiv.org/abs/2006.11239`. Every lookup goes to `https://doi.org/<doi>` with `Accept: application/x-bibtex`; arXiv ids go through arXiv's DOIs (`10.48550/arXiv.<id>`), because browsers can reach doi.org but not arXiv's own API. It rejects with an `Error` when the text is neither a DOI nor an arXiv id, when nothing is found (404) or when the response isn't BibTeX.

```js
const [entry] = await HaTeX.Bib.lookup('10.48550/arXiv.2006.11239');
source += '\n' + HaTeX.Bib.format(entry);
```

### `Bib.isLookup(text)`

Returns true when the text looks like a DOI or an arXiv id and not like BibTeX (BibTeX contains `@`). Use it to decide whether pasted text should be looked up or parsed.

### `Bib.authorList(raw)`

Splits a BibTeX author field into names in reading order: `"Ho, Jonathan and Jain, Ajay"` → `["Jonathan Ho", "Ajay Jain"]`.

---

## Options

Options are passed to `render` and `enhance`, and apply to that root.

| Option | Default | Description |
|---|---|---|
| `tikzSvgBase` | `'tikz/'` | URL prefix of pre-rendered TikZ pictures, loaded as `<tikzSvgBase><hash>.svg`. Relative prefixes are relative to the page. `null` skips the lookup, and every picture is compiled live. |
| `tikzLive` | `true` | Compile pictures that have no SVG in the browser with TikZJax. `false` leaves them empty (`data-tikz-state="missing"`). |
| `tikzErrors` | `false` | Show TeX's error in place of a picture that fails to compile, and fire `hatex:tikz-error`. It works by wrapping `console.log`/`warn`/`error` (TikZJax prints TeX's log there), so it is meant for editors. |
| `tikzjaxBase` | `'https://cdn.jsdelivr.net/npm/@drgrice1/tikzjax@1.0.0-beta24/dist/'` | Where `tikzjax.js` and `fonts.css` come from, for self-hosting. Keep the trailing slash. |
| `copyButtons` | `true` | Add a "copy" button to each code block. |
| `zoom` | `true` | Open an image or TikZ picture in a full-window overlay when it is clicked. |
| `animate` | `true` | `false` makes in-document links jump without smooth scrolling or flashing, and the zoom overlay open and close without a fade. The reader's `prefers-reduced-motion` setting has the same effect. |

## Events

Both events are dispatched on the TikZ picture's box (`.latex-tikz`) and bubble, so they can be caught on the root or on `document`.

| Event | `detail` | When |
|---|---|---|
| `hatex:tikz` | `{ hash, svg }` | A picture has been compiled live. `svg` is the file content, as in `tikzSvgs`. |
| `hatex:tikz-error` | `{ hash, message }` | A picture failed to compile. Only with `tikzErrors: true`. |

```js
el.addEventListener('hatex:tikz', (e) => saveFile(`tikz/${e.detail.hash}.svg`, e.detail.svg));
```

## Source lines

The output keeps track of where everything came from, so a preview can be linked back to the source:

- every block element (paragraph, heading, list, table, float, theorem, …) has `data-line`, the line in the source where it starts;
- list items, table rows, bibliography entries and captions have their own `data-line`;
- inside a block, an empty `<span class="latex-line" data-line="n">` marks where each later source line begins.

Lines count from 1, and they stay correct in two-column documents, slides and vertical text.

To find the source line of a click, take the last `[data-line]` element that starts at or before the clicked node:

```js
out.addEventListener('dblclick', (e) => {
  let line = null;
  for (const m of out.querySelectorAll('[data-line]')) {
    const before = m.contains(e.target) ||
      (m.compareDocumentPosition(e.target) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (!before) break;
    line = Number(m.dataset.line);
  }
  if (line) goToLine(line);
});
```

## Building an editor

[`examples/editor.html`](../../examples/editor.html) is a complete editor in about 150 lines. Its core:

```js
let timer;
textarea.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const keep = out.scrollTop;
    HaTeX.render(out, textarea.value, { tikzSvgBase: null, tikzErrors: true });
    out.scrollTop = keep;                        // re-rendering keeps the reader's place
    showProblems(HaTeX.lint(textarea.value));
  }, 300);
});
```

- `tikzSvgBase: null` compiles every picture live, so that you see your edits rather than an old SVG; the session cache means that each version of a picture compiles only once.
- `tikzErrors: true` shows TeX errors in place of broken pictures.
- `HaTeX.lint` gives the problem list, and the [source lines](#source-lines) let a double-click jump to the source.
- `HaTeX.tikzSvgs(out)` gives the compiled pictures to save for publishing.

## Several documents on one page

Each `render` or `parse` call is independent: numbering, labels, macros and footnotes don't leak from one document to another, and the ids can't clash. Options are remembered per root. The TikZ session cache is shared, so the same picture in two documents compiles once.

---
Previous: [Vertical Chinese](vertical-chinese.md) · [Contents](README.md) · Next: [Theming](theming.md)
