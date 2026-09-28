# Getting started

## What you need

| File | Required | What it does |
|---|---|---|
| `katex.min.css` + `katex.min.js` | Yes, for maths | Typesets `$…$` and the equation environments. Without KaTeX, maths is shown as its source in `<code>`. |
| `dist/hatex.css` | Yes | Styles for the output: typography, tables, theorems, columns, slides, code tokens and dark mode. |
| `dist/hatex.js` | Yes | The renderer and the page runtime. Defines `window.HaTeX`. |
| `prism.min.js` + language components | No | Highlights code blocks. Without it, code is shown as plain text. |
| TikZJax | Loaded by HaTeX itself | Compiles TikZ pictures. It is fetched from jsDelivr the first time a picture has no pre-rendered SVG; see [TikZ](tikz.md). |

HaTeX has no build-time dependencies and bundles none of the libraries above. KaTeX 0.16 or later is supported.

## A first page

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<!-- optional: highlighting for Python code blocks -->
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>

<link rel="stylesheet" href="hatex.css">
<script src="hatex.js"></script>
</head>
<body>
<article id="post"></article>
<script>
  fetch('post.tex')
    .then(r => r.text())
    .then(tex => HaTeX.render('#post', tex));
</script>
</body>
</html>
```

`HaTeX.render` parses the source, puts the HTML into `#post`, adds the class `hatex` to it, and then runs the page behaviour: column layout, table fitting, TikZ, link scrolling, copy buttons and image zoom.

**Order matters for KaTeX and Prism:** they must be loaded before `render` runs, because maths and code are typeset while parsing. Loading HaTeX itself with `defer` is fine as long as the call to `render` comes after it.

**Don't load a Prism theme.** `hatex.css` colours code tokens from its own palette, and a Prism theme would fight it.

## Where the source can come from

`render` takes a string, so the source can come from anywhere.

**A `.tex` file next to the page** (as above). The page must be served over HTTP, because browsers refuse `fetch` from `file://`.

**A `<script>` block in the page.** A script element of an unknown type is not run, and its content is kept exactly as written: backslashes, `<`, `>` and `&` need no escaping.

```html
<script type="text/x-latex" id="source">
\section{Hello}
Euler: $e^{i\pi} + 1 = 0$.
</script>
<article id="out"></article>
<script>
  HaTeX.render('#out', document.getElementById('source').textContent);
</script>
```

The only thing that can't appear inside it is the literal text `</script>`.

**A `<textarea>` in an editor.** Call `render` again whenever the text changes; see [`examples/editor.html`](../../examples/editor.html) and [Building an editor](api.md#building-an-editor).

**Pre-rendered HTML.** Render at build time with `HaTeX.parse` and call `HaTeX.enhance` on the page instead of `render`; see [Node, bundlers and static sites](node.md).

## What the source may contain

Any LaTeX body, with or without a preamble:

```latex
\documentclass{article}
\usepackage{amsmath}
\newcommand{\R}{\mathbb{R}}
\begin{document}
\section{Introduction}
Let $x \in \R$.
\end{document}
```

and

```latex
\section{Introduction}
Let $x \in \mathbb{R}$.
```

render the same way (apart from the macro). The preamble is read only for definitions; see [How HaTeX reads a document](documents.md).

## Running the examples

```sh
git clone https://github.com/mejistus/hatex
cd hatex
npm start                 # http://localhost:8000/examples/
```

`npm start` runs a small static server (`scripts/serve.mjs`) with no dependencies. `node scripts/serve.mjs 9000` uses a different port.

| Example | Shows |
|---|---|
| [`examples/basic.html`](../../examples/basic.html) | The smallest setup: source in a `<script>` block and one `render` call |
| [`examples/editor.html`](../../examples/editor.html) | A live editor with a problems list, double-click to jump to the source line, DOI/arXiv import and dark mode |
| [`examples/tikz.html`](../../examples/tikz.html) | TikZ, the `nn` styles and pgfplots; add `?live` to compile the pictures instead of loading SVGs |
| [`examples/document/`](../../examples/document/) | A full article that uses nearly every feature |
| [`examples/node/prerender.mjs`](../../examples/node/prerender.mjs) | Static HTML rendered in Node |

## Next steps

- Writing documents: start with [How HaTeX reads a document](documents.md).
- Putting HaTeX into a site: [JavaScript API](api.md) and [Theming](theming.md).
- Slides: [Slides](slides.md).

---
[Contents](README.md) · Next: [Papers](papers.md)
