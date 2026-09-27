# The hatex manual

hatex turns LaTeX (articles and beamer slides) into HTML in the browser, or in Node at build time. This manual describes everything it does: what LaTeX it understands, how to put it on a page, the JavaScript API, styling, and what it deliberately leaves out.

The [README](../../README.md) is the short tour. [`docs/syntax.md`](../syntax.md) is a one-page cheat sheet of the supported LaTeX. This manual is the full reference and explains how each feature behaves and why.

## Contents

**Using hatex**

1. [Getting started](getting-started.md): loading the files, a first page, where the source can come from, and serving locally
2. [How hatex reads a document](documents.md): the preamble, comments, paragraphs, sectioning, text formatting, lists and Chinese documents
3. [Maths](maths.md): inline and display maths, numbered environments, macros and what KaTeX can't do
4. [Tables](tables.md): `tabular` and its relatives, rules, spans, colours and fitting wide tables
5. [Figures and images](figures.md): `\includegraphics`, floats, captions, sub-figures and minipages
6. [TikZ](tikz.md): how pictures are compiled, pre-rendering, libraries, pgfplots, tikz-cd and the neural-network styles
7. [Theorems, proofs and algorithms](theorems.md)
8. [Code](code.md): listings, minted, verbatim and syntax highlighting
9. [Cross-references, citations and footnotes](references.md)
10. [Two columns and multicols](columns.md)
11. [Slides](slides.md): beamer frames, the title page, blocks, columns, aspect ratios and presenting
12. [Vertical Chinese](vertical-chinese.md): `guji`, `vertical` and `\jiazhu`

**Integrating hatex**

13. [JavaScript API](api.md): every function, option and event
14. [Theming](theming.md): the CSS variables, dark mode and fonts
15. [The HTML output](html-output.md): the structure and class names the renderer produces, for styling and scripting
16. [Node, bundlers and static sites](node.md)
17. [Checking sources](checking.md): `HaTeX.lint` and `HaTeX.images`

**Reference**

18. [Limitations and troubleshooting](troubleshooting.md)
19. [Developing hatex](development.md): the source layout, building and syncing with the blog

## Conventions

- "The source" is the LaTeX text you hand to hatex. "The root" is the element that the output goes into; it always carries the class `hatex`.
- Commands are written as you would type them in LaTeX, e.g. `\section{…}`. Optional arguments are in `[…]`.
- **Degrades** means that the command is not understood and hatex keeps the text of its arguments instead of failing. **Ignored** means that the command and its arguments produce nothing.
- The examples use the files in [`dist/`](../../dist/). Everything described here is in version 1.5.0.
