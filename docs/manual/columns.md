# Two columns and multicols

## Two-column documents

```latex
\documentclass[twocolumn]{article}
\begin{document}
\begin{abstract} … \end{abstract}
\section{Introduction}
…
\begin{figure*} … \end{figure*}     % spans both columns
\end{document}
```

`\documentclass[twocolumn]{…}`, or `\twocolumn` anywhere in the source, sets the whole document in two columns. `\twocolumn` can't be switched off halfway: `\onecolumn` is removed and does nothing. The optional argument of `\twocolumn[…]` is removed together with its content, so put a spanning introduction in an `abstract` or before the first `\section` instead. In a beamer document, `twocolumn` is ignored.

### When the columns appear

The columns need room. A two-column document is laid out in two columns only while its container is at least **50rem** wide (800px at the default font size), and in one column below that, e.g. on a phone. The check is redone whenever the window is resized.

### What spans both columns

Web pages scroll, so hatex doesn't fill pages. It cuts the document into stretches at every item that spans the full width, and balances each stretch over two columns of about equal height:

- `\section`, `\part` and `\chapter` headings. `\subsection` and lower stay in their column;
- the `abstract`;
- `figure*` and `table*`;
- a `multicols` block inside the document.

A reader therefore reads down one short column, up to the top of the next one, and on to the next full-width item. They never have to scroll back up a whole page.

### What stays in its column

Everything else stays in its column, as in LaTeX:

| Item | When it is too wide for the column |
|---|---|
| Display equation | Scaled down to fit, to 60% at the smallest; after that it scrolls sideways |
| Image, TikZ picture | Shrinks to the column width |
| Table | Scrolls sideways, unless it is in `\resizebox`, which scales it (see [Wide tables](tables.md#wide-tables)) |
| Code block | Scrolls sideways |

### Where a column breaks

The runtime measures the stretch and picks the break closest to half its height. A column can break:

- between any two blocks (paragraphs, lists, floats, theorems, code);
- between the paragraphs or items of a theorem, proof, quote, list, bibliography or the footnotes;
- inside a paragraph, just before or just after a display equation.

A column never breaks inside a line of text, and never directly after a heading. When the break falls inside a list or theorem, the element is split into two copies (the second has the class `hatex-split-after`), and a numbered list continues its numbering in the second column.

## multicols

```latex
\begin{multicols}{3}[\subsection*{Glossary}]
  … \columnbreak …
\end{multicols}
```

- `\begin{multicols}{n}` sets its content in `n` balanced columns. `n` is between 1 and 4, and 2 if it can't be read.
- The optional `[…]` after it is set across the full width above the columns, as in the `multicol` package.
- `multicols*` is treated as `multicols`: the columns are always balanced.
- The columns appear while the block is at least **32rem** wide.
- `\columnbreak` ends the current column there. Without it, the breaks are chosen as described above.

Unlike a two-column document, `multicols` doesn't have spanning items: a heading inside it stays in its column. A `multicols` block inside a two-column document spans the page.

## How it works, and when to call `layout`

The runtime lays out the columns itself instead of using CSS multi-column layout, which misplaces KaTeX's inline maths in Safari. The HTML from `parse` contains the whole document in one flow (`.hatex-cols-flow`), and `enhance` splits it into columns (`.hatex-cols-chunk` > `.hatex-col`):

- when the document is rendered, and again when web fonts have loaded;
- whenever the window is resized;
- whenever a TikZ picture arrives, since that changes the heights.

If the container changes width for any other reason (a sidebar closes, a split pane is dragged, a tab becomes visible), call:

```js
HaTeX.layout(document.querySelector('.hatex'));
```

Pre-rendered HTML that is never enhanced (no `hatex.js` on the page) shows in one column.

---
Previous: [Cross-references, citations and footnotes](references.md) · [Contents](README.md) · Next: [Slides](slides.md)
