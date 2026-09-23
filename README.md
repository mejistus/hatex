# hatex

A LaTeX front end for web pages: it turns an article written in LaTeX into HTML in the browser, including maths, booktabs tables, figures, TikZ, theorems, algorithms, citations and cross-references.

It is the renderer behind [mejistus.github.io](https://mejistus.github.io), taken out of the site (v9.0.0) as a standalone package. For a live demo, see [mejistus.github.io/hatex-demo](https://mejistus.github.io/hatex-demo/), a paper typeset from a single `.tex` file. It has no build-time dependencies. [KaTeX](https://katex.org) typesets the maths, [Prism](https://prismjs.com) highlights code (optional), and [TikZJax](https://github.com/drgrice1/tikzjax) compiles TikZ pictures (loaded only when a picture needs it).

```
.tex source ──parse()──▶ HTML string ──render()/enhance()──▶ live page
                         (runs in Node too)   (TikZ, \ref links, fitting, zoom)
```

## Quick start

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<!-- optional: code highlighting (no Prism theme needed; hatex.css colours the tokens) -->
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>

<link rel="stylesheet" href="dist/hatex.css">
<script src="dist/hatex.js"></script>

<article id="post"></article>
<script>
  fetch('post.tex').then(r => r.text()).then(tex => HaTeX.render('#post', tex));
</script>
```

The source can be any LaTeX body, with or without `\documentclass … \begin{document}`. The preamble is read for `\newcommand`, `\definecolor`, `\newtheorem` and `\usetikzlibrary`, and everything else in it is ignored.

To try the examples, run `npm start` and open <http://localhost:8000/examples/>. A local server is needed because `.tex` sources and TikZ SVGs are fetched, and browsers block that on `file://`.

| Example | Shows |
|---|---|
| [`basic.html`](examples/basic.html) | The smallest setup: LaTeX in a `<script type="text/x-latex">` block and one `render` call |
| [`editor.html`](examples/editor.html) | A live editor: re-renders as you type, lists problems, double-click jumps to the source line, adds a `\bibitem` from a DOI or arXiv id, dark mode |
| [`tikz.html`](examples/tikz.html) | TikZ, the built-in `nn` styles and pgfplots; pre-rendered SVGs vs. compiling live (`?live`) |
| [`document/`](examples/document/) | A full article (`example.tex`) that uses every feature, with images and TikZ |
| [`node/prerender.mjs`](examples/node/prerender.mjs) | Renders a `.tex` file to static HTML in Node (`npm install && npm run prerender`) |

## What it renders

This is the subset of LaTeX that articles and blog posts use. **Commands it doesn't know degrade to their argument text instead of failing.** [docs/syntax.md](docs/syntax.md) has the full list, with the things it deliberately ignores.

- **Structure:** `\section`/`\subsection`/`\subsubsection` (numbered; `*` for unnumbered), `\paragraph`, `abstract`, `itemize`/`enumerate`/`description` (nested), `quote`, `center`, footnotes.
- **Maths:** `$…$`, `\(…\)`, `\[…\]`, `$$…$$`, and `equation`/`align`/`gather`/`multline`/… with numbering, `\label`/`\eqref` and `\nonumber`/`\notag`. `\newcommand` and `\DeclareMathOperator` work inside maths too.
- **Tables:** `tabular` with booktabs rules, `\hline`, `|` column rules, `\multicolumn`, `\multirow`, `\cline`/`\cmidrule(lr)`, `\rowcolor`/`\cellcolor`. `\resizebox{\linewidth}{!}{…}` scales a wide table down to fit the column.
- **Figures:** `\includegraphics[width=0.5\linewidth]`, `subfigure` (numbered (a), (b), …), `minipage` side by side, `\caption` and `\label`.
- **TikZ:** `tikzpicture`, `tikzcd`, pgfplots `axis`; see [TikZ](#tikz).
- **Theorems:** `theorem`/`lemma`/`definition`/… and `proof` with ∎. `\newtheorem{hyp}{Hypothesis}` adds your own.
- **Algorithms:** `algorithm` + `algorithmic` (algpseudocode: `\State`, `\If`, `\For`, `\While`, `\Repeat`/`\Until`, `\Function`, `\Comment`, …).
- **Code:** `lstlisting[language=…]`, `minted{…}`, `verbatim`, `\verb|…|`, `\lstinline`.
- **References:** `\ref`, `\eqref`, `\autoref`, `\cref`, `\cite` (several keys at once), `thebibliography`/`\bibitem`. Clicking a reference scrolls to its target and flashes it.
- **Text:** `\textbf`, `\emph`, `\underline`, `\texttt`, `\sout`, `\hl`, `\textcolor`, `\colorbox`, `\definecolor`, `\href`, `\url`, the size commands, accents, `---`/`--`, ``` ``quotes'' ```, `\LaTeX`.
- **Chinese:** when the source contains CJK text, captions and labels switch to 图/表/定理/证明/参考文献, and a line break between CJK characters doesn't add a space.

## API

Everything is on `window.HaTeX`. In Node or a bundler it is the default export.

| Call | Returns | What it does |
|---|---|---|
| `HaTeX.render(target, source, options?)` | the element | Parses `source` into `target` (an element or a selector), adds class `hatex` and calls `enhance`. |
| `HaTeX.parse(source)` | HTML string | Pure: no DOM, works in Node. Needs KaTeX for maths (see `use`). |
| `HaTeX.enhance(root, options?)` | `root` | For HTML already on the page (for example output pre-rendered with `parse`). Fits `\resizebox`, loads TikZ, adds copy buttons and zoom. |
| `HaTeX.lint(source, { frontMatter? })` | `[{ line, severity, message }]` | Catches unclosed environments, unbalanced braces or `$`, unknown `\ref`/`\cite`, duplicate `\label`, tabular rows with the wrong cell count, and non-ASCII TikZ labels. |
| `HaTeX.images(source)` | `[{ path, line }]` | Lists the local image paths the source uses, so you can check that they exist. |
| `HaTeX.tikzSvgs(root)` | `[{ hash, file, svg }]` | Lists the pictures in `root` that were compiled live, as the files to save for pre-rendering. |
| `HaTeX.use({ katex, Prism })` | `HaTeX` | Supplies KaTeX and Prism when they aren't globals (Node, bundlers). |
| `HaTeX.Bib` | | Works with BibTeX: `parse(text)`, `format(entry)` → `\bibitem…`, `lookup(doiOrArxiv)` (fetched through doi.org), `isLookup(text)`. |

**Options** for `render` and `enhance`:

| Option | Default | |
|---|---|---|
| `tikzSvgBase` | `'tikz/'` | Where pre-rendered pictures are, as `<base><hash>.svg`. `null` skips the lookup. |
| `tikzLive` | `true` | Compiles pictures that have no SVG in the browser with TikZJax. |
| `tikzErrors` | `false` | Shows a TeX error in place of a failed picture. It works by listening to the console, so it's best kept for editors. |
| `tikzjaxBase` | jsDelivr | Where `tikzjax.js` and `fonts.css` come from, if you self-host them. |
| `copyButtons` | `true` | Adds a "copy" button to code blocks. |
| `zoom` | `true` | Opens an image or TikZ picture in an overlay when clicked. |
| `animate` | `true` | `false` makes in-document links jump without scrolling or flashing, and the zoom overlay appear without a fade. The reader's reduced-motion setting does the same automatically. |

**Events**, which bubble from the picture's box: `hatex:tikz` (`detail: { hash, svg }`) fires when a picture compiles, and `hatex:tikz-error` (`detail: { hash, message }`) fires when it fails.

**Source lines:** every block in the output has `data-line` (the source line it starts on), and empty `<span class="latex-line" data-line>` markers inside it mark where each later line begins. That is all an editor needs to jump from the preview to the source; `editor.html` does it in about 10 lines.

## TikZ

Each picture renders to `<div class="latex-tikz" data-tikz-hash="…">`. The hash is FNV-1a of the picture's code and options, so it changes only when the picture does. The runtime then does the first of these that works:

1. It uses a picture already compiled in this session, so re-rendering in an editor never compiles the same picture twice.
2. It loads `<tikzSvgBase><hash>.svg`.
3. It compiles the picture live with TikZJax. This is real TeX in WebAssembly: about 6 MB on first use and 1–10 s per picture.

**Pre-render for readers.** Compile once, save the SVGs, and readers never wait:

1. Open the page with `tikzSvgBase: null`, or open `examples/tikz.html?live`, and let the pictures compile.
2. Save each `{ file, svg }` from `HaTeX.tikzSvgs(root)` into your `tikz/` folder. `editor.html` and `tikz.html` show them as download links.
3. Deploy. From then on `tikz/<hash>.svg` is fetched instead of compiled.

**Rules:**
- **Labels inside a picture must be ASCII.** TikZJax runs plain TeX, which has no CJK fonts. `HaTeX.lint` warns you about it.
- Maths in labels (`$x_t$`) works.
- `\usetikzlibrary{…}` anywhere in the document applies to the pictures after it. The libraries a picture obviously needs (`positioning`, `arrows.meta`, `calc`, …), pgfplots (for `axis`) and tikz-cd are added automatically.
- `\definecolor` and `\newcommand` from the document are available inside pictures.
- **Neural-network diagrams:** use any `nn*` style and the definitions are added for you.

```latex
\begin{tikzpicture}[nn]
  \node[nndata] (x) {Image};
  \node[nnconv, right=of x] (c) {Conv 3x3\\64};
  \node[nnpool, right=of c] (p) {Max pool};
  \draw[nnflow] (x) -- (c);
  \draw[nnflow] (c) -- (p);
\end{tikzpicture}
```

The layer styles are `nnconv`, `nnpool`, `nnfc`, `nnact`, `nnnorm`, `nnattn`, `nnembed`, `nnout`, `nndata`, `nnloss` and `nnsum`. The arrows are `nnflow`, `nnskip` and `nnback`. For grouping and labels there are `nngroup`, `nngrouplabel`, `nnbrace` and `nnlabel`, and the pic `nnfeatmap={w=…, h=…, d=…, fill=…, label=…}` draws a 3-D feature map. They are defined in [`src/tikz-nn.js`](src/tikz-nn.js).

## Theming

All colours are CSS variables on `.hatex`, so you can override any of them:

```css
.hatex {
  --hx-ink: #111;          /* headings, tables, rules */
  --hx-muted: #333;        /* paragraphs, captions */
  --hx-accent: #0b57d0;    /* links, section numbers, inline code */
  --hx-code-bg: #f4f4f4;
  --hx-font-heading: Georgia, serif;
}
```

- **Dark mode:** put `data-theme="dark"` on the `.hatex` element or any ancestor, or `data-theme="auto"` to follow the system. In dark mode, author colours (`\textcolor`) are lifted so they stay readable, text on `\rowcolor`/`\hl` backgrounds turns dark, and TikZ pictures keep a light sheet to draw on.
- **Font:** the body font is inherited from your page. Headings use `--hx-font-heading`, and code uses `--hx-font-mono`.
- Don't load a Prism theme, because it would fight `hatex.css` over code colours.

## Node and static sites

`parse` needs no DOM, so you can render at build time and ship plain HTML:

```js
import katex from 'katex';
import HaTeX from 'hatex';              // dist/hatex.mjs
HaTeX.use({ katex });
const html = HaTeX.parse(source);       // put it inside <article class="hatex">…</article>
```

Add `katex.min.css` and `hatex.css` to the page. Include `hatex.js` and call `HaTeX.enhance(article)` only if you want TikZ, the `\ref` scrolling or the `\resizebox` fitting. `examples/node/prerender.mjs` is a complete script.

## Limitations

- **It isn't a TeX engine.** Unknown commands and environments degrade to their content instead of failing, and there is no page layout: `\vspace`, `\newpage` and floats' `[htbp]` are ignored.
- **The title block is dropped.** `\title`, `\author`, `\date` and `\maketitle` produce nothing, so put the title block in your HTML.
- **Maths is whatever KaTeX supports.** Packages like `siunitx` aren't available (`\SI{3}{m}` becomes `3m`).
- **One file per document.** `\input` and `\include` are ignored, and so are `\bibliography{…}` files: write `thebibliography` (the editor example's DOI import does it for you).
- **`enumerate` labels aren't configurable.** The levels go 1., a., i. whatever you ask for, and `\appendix` sections keep numbers instead of switching to letters.
- **Trusted input only.** `\href` is limited to safe URL schemes, but the output is meant for your own writing. If you render other people's sources, sanitise the HTML first (and allow `<script type="text/x-tikz">` if you want TikZ).

## Project layout

```
src/latex.js      the renderer: parseLatex(source) → HTML
src/tikz-nn.js    the nn* TikZ styles
src/lint.js       problems in a source
src/bib.js        BibTeX parse / format / DOI lookup
src/runtime.js    HaTeX API and page behaviour (TikZ, links, fitting, zoom, copy)
src/hatex.css     styles for the output
dist/             built files; commit them after `npm run build`
examples/         see above
scripts/          build.mjs · serve.mjs · sync.mjs
```

| Command | |
|---|---|
| `npm run build` | Builds `src/` into `dist/hatex.js` (a classic script, also usable from CommonJS), `dist/hatex.mjs` (an ES module) and `dist/hatex.css`. |
| `npm start` | Serves the repo at <http://localhost:8000/examples/>. |
| `npm run sync [-- path/to/mejistus.github.io]` | Copies the four renderer modules from the blog's `assets/` and rebuilds. The blog is where they're developed, and `runtime.js` and `hatex.css` belong to hatex. |
| `npm run prerender` | Renders `examples/document/example.tex` to `static.html` (after `npm install`). |
