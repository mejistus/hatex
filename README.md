# hatex

**hatex = html + latex.** A LaTeX front end for web pages: it turns articles and beamer slides written in LaTeX into HTML in the browser, including maths, booktabs tables, figures, TikZ, theorems, algorithms, citations, cross-references and two-column layouts.

It is the renderer behind [mejistus.github.io](https://mejistus.github.io), taken out of the site (v9.0.0) as a standalone package. The project page, with a playground, is at [mejistus.github.io/hatex](https://mejistus.github.io/hatex/). The demos are at [mejistus.github.io/hatex/demo](https://mejistus.github.io/hatex/demo/): a two-column paper, a Chinese document and a slide deck, each typeset from a single `.tex` file. It has no build-time dependencies. [KaTeX](https://katex.org) typesets the maths, [Prism](https://prismjs.com) highlights code (optional), and [TikZJax](https://github.com/drgrice1/tikzjax) compiles TikZ pictures (loaded only when a picture needs it).

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

This is the subset of LaTeX that articles and blog posts use. **Commands it doesn't know degrade to their argument text instead of failing.** Each item links to its chapter in the [manual](docs/manual/README.md), and [docs/syntax.md](docs/syntax.md) is a one-page cheat sheet.

- **Structure:** `\section`/`\subsection`/`\subsubsection` (numbered; `*` for unnumbered), `\paragraph`, `abstract`, `itemize`/`enumerate`/`description` (nested), `quote`, `center`, footnotes. See [How hatex reads a document](docs/manual/documents.md).
- **Maths:** `$…$`, `\(…\)`, `\[…\]`, `$$…$$`, and `equation`/`align`/`gather`/`multline`/… with numbering, `\label`/`\eqref` and `\nonumber`/`\notag`. `\newcommand` and `\DeclareMathOperator` work inside maths too. See [Maths](docs/manual/maths.md).
- **Tables:** `tabular` with booktabs rules, `\hline`, `|` column rules, `\multicolumn`, `\multirow`, `\cline`/`\cmidrule(lr)`, `\rowcolor`/`\cellcolor`. `\resizebox{\linewidth}{!}{…}` scales a wide table down to fit the column. See [Tables](docs/manual/tables.md).
- **Figures:** `\includegraphics[width=0.5\linewidth]`, `subfigure` (numbered (a), (b), …), `minipage` side by side, `\caption` and `\label`. See [Figures](docs/manual/figures.md).
- **TikZ:** `tikzpicture`, `tikzcd` and pgfplots `axis`, compiled by real TeX in the browser or loaded as pre-rendered SVGs, plus built-in styles for neural-network diagrams. See [TikZ](docs/manual/tikz.md).
- **Theorems and algorithms:** `theorem`/`lemma`/`definition`/… and `proof` with ∎, `\newtheorem`, and `algorithm` + `algorithmic` (algpseudocode). See [Theorems, proofs and algorithms](docs/manual/theorems.md).
- **Code:** `lstlisting[language=…]`, `minted{…}`, `verbatim`, `\verb|…|`, `\lstinline`, highlighted by Prism. See [Code](docs/manual/code.md).
- **References:** `\ref`, `\eqref`, `\autoref`, `\cref`, `\cite` (several keys at once), `thebibliography`/`\bibitem`. Clicking a reference scrolls to its target and flashes it. See [References](docs/manual/references.md).
- **Text:** `\textbf`, `\emph`, `\underline`, `\texttt`, `\sout`, `\hl`, `\textcolor`, `\colorbox`, `\definecolor`, `\href`, `\url`, the size commands, accents, `---`/`--`, ``` ``quotes'' ```, `\LaTeX`.
- **Chinese:** when the source contains CJK text, captions and labels switch to 图/表/定理/证明/参考文献, and a line break between CJK characters doesn't add a space.
- **Layout:** `\documentclass[twocolumn]` and `multicols`, balanced by the runtime. See [Two columns](docs/manual/columns.md).
- **Slides:** `\documentclass{beamer}` with frames, title page, outline, blocks and columns, every aspect ratio, and a full-screen presenter. See [Slides](docs/manual/slides.md).
- **Vertical Chinese:** `guji` (a manuscript-scroll page read from right to left, with 句讀 marks), `vertical`, and `\jiazhu` two-line interlinear notes. See [Vertical Chinese](docs/manual/vertical-chinese.md).

## Documentation

The **[hatex manual](docs/manual/README.md)** describes everything in detail:

| | |
|---|---|
| **Using hatex** | [Getting started](docs/manual/getting-started.md) · [How hatex reads a document](docs/manual/documents.md) · [Maths](docs/manual/maths.md) · [Tables](docs/manual/tables.md) · [Figures and images](docs/manual/figures.md) · [TikZ](docs/manual/tikz.md) · [Theorems, proofs and algorithms](docs/manual/theorems.md) · [Code](docs/manual/code.md) · [References](docs/manual/references.md) · [Two columns](docs/manual/columns.md) · [Slides](docs/manual/slides.md) · [Vertical Chinese](docs/manual/vertical-chinese.md) |
| **Integrating hatex** | [JavaScript API](docs/manual/api.md) · [Theming](docs/manual/theming.md) · [The HTML output](docs/manual/html-output.md) · [Node, bundlers and static sites](docs/manual/node.md) · [Checking sources](docs/manual/checking.md) |
| **Reference** | [Limitations and troubleshooting](docs/manual/troubleshooting.md) · [Developing hatex](docs/manual/development.md) · [Syntax cheat sheet](docs/syntax.md) |

## API at a glance

Everything is on `window.HaTeX`. In Node or a bundler it is the default export. The [API chapter](docs/manual/api.md) has the details, the options and the events.

| Call | What it does |
|---|---|
| `HaTeX.render(target, source, options?)` | Parses `source` into `target` (an element or a selector) and enhances it. |
| `HaTeX.parse(source)` | LaTeX → HTML string. Pure: no DOM, works in Node. |
| `HaTeX.enhance(root, options?)` | Page behaviour for HTML already on the page: columns, TikZ, `\resizebox` fitting, slides, copy buttons, zoom. |
| `HaTeX.layout(root)` | Redoes the width-dependent layout when the element changes width without a window resize. |
| `HaTeX.lint(source, { frontMatter? })` | Lists structural problems: unclosed environments, unbalanced braces or `$`, unknown `\ref`/`\cite`, duplicate labels, wrong cell counts, non-ASCII TikZ text. |
| `HaTeX.images(source)` | Lists the local image paths the source uses. |
| `HaTeX.tikzSvgs(root)` | Lists the TikZ pictures compiled in this session, as files to save for pre-rendering. |
| `HaTeX.use({ katex, Prism })` | Supplies KaTeX and Prism when they aren't globals. |
| `HaTeX.Bib` | BibTeX `parse`, `format` → `\bibitem`, and `lookup(doiOrArxiv)`. |

The options are `tikzSvgBase`, `tikzLive`, `tikzErrors`, `tikzjaxBase`, `copyButtons`, `zoom` and `animate`, and they are described in [Options](docs/manual/api.md#options). Styling is done with `--hx-*` CSS variables and `data-theme="dark"` or `"auto"`; see [Theming](docs/manual/theming.md).

## License

hatex is released under the [MIT License](LICENSE): use, copy, modify and sell it for any purpose, as long as the copyright notice travels with it. It is original code, not a modification of another project. KaTeX and Prism (MIT) and TikZJax (GPL-3.0-or-later) are loaded from a CDN at runtime, and none of them is bundled into `dist/`, so their licenses apply to them alone. If you bundle any of them yourself, keep its license with it.

Nothing more is required. If hatex is useful to you, a ⭐ on [GitHub](https://github.com/mejistus/hatex) is the nicest way to say thanks.


## Limitations

hatex is not a TeX engine: there is no page layout, the article title block is dropped, maths is whatever KaTeX supports, `\input` and `.bib` files aren't read, and the input is assumed to be trusted. [Limitations and troubleshooting](docs/manual/troubleshooting.md) has the full list and fixes for common problems.

## Development

| Command | |
|---|---|
| `npm run build` | Builds `src/` into `dist/hatex.js` (a classic script, also usable from CommonJS), `dist/hatex.mjs` (an ES module) and `dist/hatex.css`. |
| `npm start` | Serves the repo at <http://localhost:8000/examples/>. |
| `npm run sync [-- path/to/mejistus.github.io]` | Copies the four renderer modules from the blog's `assets/` and rebuilds. |
| `npm run docs [-- path/to/out]` | Builds the manual into HTML pages for the project site (default `../mejistus.github.io/hatex/docs`). |
| `npm run prerender` | Renders `examples/document/example.tex` to `static.html` (after `npm install`). |

[Developing hatex](docs/manual/development.md) explains the source layout, how the renderer works and how to add commands.
