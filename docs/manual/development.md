# Developing hatex

## Layout of the repository

```
src/latex.js      the core renderer: parseLatex(source) → HTML
src/extend.js     two columns, multicols, beamer, blocks, guji/vertical, \jiazhu
src/tikz-nn.js    the nn* TikZ styles (a TeX preamble as a string)
src/lint.js       lintSource(source) and referencedImages(source)
src/bib.js        BibTeX parse / format / DOI lookup
src/runtime.js    the HaTeX API and page behaviour
src/hatex.css     styles for the output
dist/             built files, committed
docs/             syntax.md (cheat sheet) and this manual
examples/         runnable examples
scripts/          build.mjs, serve.mjs, sync.mjs, docs.mjs (+ docs.css)
```

hatex was taken out of the blog [mejistus.github.io](https://mejistus.github.io), where the renderer is still developed. The four modules `latex.js`, `tikz-nn.js`, `lint.js` and `bib.js` come from the blog's `assets/` folder. `extend.js`, `runtime.js` and `hatex.css` belong to hatex.

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Builds `dist/` from `src/` |
| `npm start` | Serves the repository at <http://localhost:8000/examples/> (`node scripts/serve.mjs [port]`) |
| `npm run sync [-- path/to/mejistus.github.io]` | Copies the four renderer modules from the blog's `assets/` (default `../mejistus.github.io`) and rebuilds |
| `npm run docs [-- path/to/out]` | Builds this manual into HTML pages (default `../mejistus.github.io/hatex/docs`) |
| `npm install && npm run prerender` | Renders `examples/document/example.tex` to `examples/document/static.html` |

The build has no dependencies. `npm install` only installs KaTeX, for the prerender example.

## How the build works

`scripts/build.mjs` concatenates the modules in this order:

```
src/tikz-nn.js → src/latex.js → src/extend.js → src/lint.js → src/bib.js → src/runtime.js
```

and writes:

- `dist/hatex.js`: the modules inside `(function (window) { … }).call(this, window or globalThis)`. It works as a classic script and from CommonJS (`module.exports` is set by `runtime.js`).
- `dist/hatex.mjs`: the same code in an ES module, with `HaTeX` as the default export and its functions as named exports.
- `dist/hatex.css`: `src/hatex.css` with a banner.

The version in `package.json` goes into the banners and replaces `__VERSION__` in `runtime.js`, which becomes `HaTeX.version`.

Each module is an IIFE that reads its dependencies from `window` and puts its API on `window`. The order matters only for `runtime.js`, which picks up `window.Bib` when it loads. Everything else is looked up when it is called.

**`dist/` is committed.** Rebuild and commit it with every change to `src/`, so that the examples, the CDN and `npm install github:…` get the new code.

## How rendering works

### The core renderer (`latex.js`)

`parseLatex(source)` works in passes over the source string:

1. Every non-blank line gets an invisible marker, `\u0005<line>\u0005`, which ends up as `data-line` attributes and `span.latex-line` elements.
2. Verbatim content (`verbatim`, `lstlisting`, `minted`, `\verb`, `\lstinline`, `\mintinline`) is rendered and replaced by a **slot**: a placeholder `\u0001<n>\u0001` that holds finished HTML, so later passes can't touch it.
3. Comments are removed, and `\definecolor`, the TikZ setup commands and the `\bibitem` keys (for citation numbers) are collected.
4. The body is cut out of `\begin{document}…\end{document}`, and definitions (`\newcommand`, `\newtheorem`, …) are collected from the preamble and the body.
5. TikZ pictures become slots (before maths, since their `$` belong to TeX).
6. Maths becomes slots, rendered with KaTeX, and equation numbers and labels are recorded.
7. Line breaks between CJK characters are removed, and `\resizebox` and friends are unwrapped.
8. **Blocks:** `renderBlocks` walks the source for environments, headings, blank lines and rules, and renders each environment with `renderEnvironment`. Text between them becomes paragraphs through `renderInline`, and commands through `renderCommand`.
9. Footnotes are appended, slots are filled in (they may nest), and references (`\u0002key\u0002`) are resolved to numbers, now that every label is known.

To support a new command:

| Kind of command | Where |
|---|---|
| A symbol or fixed text (`\foo` → "…") | `SYMBOLS` |
| A one-argument wrapper (`\foo{x}` → `<tag>x</tag>`) | `WRAPPERS` |
| A declaration (`{\foo x}`) | `DECLARATIONS` |
| A command to ignore with its arguments | `DROP_ARGS` (name → number of `{…}` arguments) |
| Anything else | The `switch` in `renderCommand` |
| An environment | `renderEnvironment` |

Since `latex.js` comes from the blog, make the change there and bring it over with `npm run sync`, or port it back afterwards.

### Extensions (`extend.js`)

Document classes and environments that the core doesn't know are added around it, without changing it:

1. `prepare(source)` rewrites the source. Every boundary (the start of a slide, a column, a block, a `guji`, …) becomes an unnumbered heading holding a marker, `\subsubsection*{@@HX<KIND> <arg>@@<text>}`, and document-level information (two columns, beamer, slide size, title data, sections) is collected in `info`.
2. The core renders the whole rewritten document as one, so labels, citations, footnotes and equation numbers stay document-wide.
3. `finish(html, info)` finds the marker headings in the HTML and turns them into wrapper elements: `<div class="hatex-block">`, the slide deck, the column flow and so on.

Every rewrite keeps the number of lines, so `data-line` still points at the right source lines. Searches run on a copy of the source in which comments and verbatim content are blanked out, so that nothing inside them is rewritten.

### The runtime (`runtime.js`)

`runtime.js` defines `HaTeX` and everything that needs a browser: `enhance`, `layout` (columns, fitting, slide scaling, `\jiazhu` splitting), TikZ loading, presenting, link scrolling, copy buttons and zoom. It installs three listeners on load: clicks on `document` (in-document links), window resize (layout), and TikZJax's `tikzjax-load-finished` event.

## Testing changes

There is no automated test suite. Before committing:

1. `npm run build`.
2. `npm start`, and check every page under `examples/`: `basic.html`, `editor.html`, `tikz.html` and `tikz.html?live`, and `document/`, which uses nearly every feature. Resize the window across 50rem to check the columns, and try dark mode in the editor.
3. For slides and vertical text, use the demos (a slide deck and a Chinese document), or paste them into the editor.
4. Check at least one other browser engine: Safari (WebKit) is where the column layout and KaTeX differ most.
5. `node -e "require('./dist/hatex.js').parse('…')"` is a quick way to look at the HTML for a snippet.

## Releases

1. Update `version` in `package.json` ([semantic versioning](https://semver.org): new syntax or options are a minor release, fixes a patch).
2. `npm run build`.
3. Update the README, `docs/syntax.md` and this manual for anything a user can see.
4. Commit `src/`, `dist/` and the docs together, with a message in the form `hatex 1.4.0: vertical Chinese in the manner of old books`, and a body listing the changes.
5. Publish on the project site: copy `dist/` to the site's `hatex/lib/`, and run `npm run docs` to rebuild the manual pages in its `hatex/docs/`.
6. Copy `dist/hatex.js` and `dist/hatex.css` to `lib/` in [hatex-demo](https://github.com/mejistus/hatex-demo) too, which keeps its own copy, and point the site's `hatex/demo` submodule at the new commit.

---
Previous: [Limitations and troubleshooting](troubleshooting.md) · [Contents](README.md)
