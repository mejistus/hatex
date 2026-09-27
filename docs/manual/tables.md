# Tables

## A complete example

```latex
\begin{table}[htbp]
  \centering
  \caption{Results on the test set.}\label{tab:main}
  \resizebox{\linewidth}{!}{%
  \begin{tabular}{l|cc}
    \toprule
    \multirow{2}{*}{Method} & \multicolumn{2}{c}{Score} \\
    \cmidrule(lr){2-3}
     & A & B \\
    \midrule
    Ours     & \textbf{1.0} & \underline{0.9} \\
    \rowcolor{yellow!20}
    Baseline & 0.5 & \cellcolor{red!10} 0.4 \\
    \bottomrule
  \end{tabular}}
\end{table}
```

The `table` float provides the number and the caption, `tabular` provides the grid, and `\resizebox` shrinks it when it is too wide. Each part is described below.

## Table environments

`tabular`, `tabular*`, `tabularx`, `tabulary` and `longtable` are all rendered as an HTML `<table>`. The width argument of `tabular*`, `tabularx` and `tabulary` and the position argument (`[t]`, `[b]`) are read and dropped: the table is as wide as its content.

A tabular can appear on its own, in a `table` float, inside a paragraph, or inside another table's cell.

## Column specification

| Spec | Meaning in hatex |
|---|---|
| `l`, `c`, `r` | Left, centred, right |
| `L`, `C`, `R` | Same as `l`, `c`, `r` (common custom column types) |
| `S` (siunitx) | Right-aligned |
| `p{…}`, `m{…}`, `b{…}`, `X`, `J` | Left-aligned. The width is ignored. |
| `\|` | A vertical rule between columns, or at the left or right edge |
| `*{3}{c}` | Repeats: `ccc` |
| `@{…}`, `!{…}`, `>{…}`, `<{…}` | Read and dropped |

## Rows and cells

- `\\` ends a row, and so does `\tabularnewline`. `\\[4pt]` works, and the space is dropped.
- `&` separates cells, but not inside braces or a nested environment.
- The last row doesn't need a trailing `\\`.
- A cell can contain any inline content: formatting, maths, links, `\cite`, even a nested `tabular`.

## Rules

| Command | Result |
|---|---|
| `\toprule`, `\bottomrule` | A heavy rule |
| `\midrule`, `\hline` | A thin rule |
| Two rules in a row (`\hline\hline`) | A double rule |
| `\cline{2-3}` | A rule under columns 2 to 3 |
| `\cmidrule{2-3}`, `\cmidrule(lr){2-3}` | The same; `(l)`, `(r)` and `(lr)` trim the rule at that end, so that adjacent `\cmidrule`s don't touch |
| `\specialrule{w}{a}{b}` | A heavy rule (the sizes are ignored) |
| `\addlinespace`, `\morecmidrules` | Ignored |

## Header rows

The rows above the first `\midrule` become the header: they are put in a `<thead>` and their cells are `<th>` (bold by default). When there is no `\midrule` but the table opens with a rule and has a `\hline` or `\midrule` after the first row, that first row is the header. Otherwise there is no header row.

## Spanning cells

```latex
\multicolumn{2}{c|}{Two columns, centred, with a rule on the right}
\multirow{3}{*}{Three rows}
\multirow{2}{*}{\multicolumn{2}{c}{…}}   % not supported: put \multicolumn outside
\multicolumn{2}{c}{\multirow{2}{*}{…}}   % works
```

- `\multicolumn{n}{spec}{text}` spans `n` columns. Its own spec sets the alignment and the vertical rules for that cell.
- `\multirow{n}{width}{text}` spans `n` rows. The optional `[vpos]` is accepted. Leave the corresponding cells in the next `n − 1` rows empty, as in LaTeX; they are skipped.

## Colours

| Command | Where | Result |
|---|---|---|
| `\rowcolor{colour}` | At the start of a row | The row's background |
| `\cellcolor{colour}` | Anywhere in a cell | The cell's background |

Both accept an optional model, e.g. `\rowcolor[HTML]{EEF3FF}`, and the colours described in [Colour](documents.md#colour). In dark mode, the text on these backgrounds turns dark so that it stays readable.

## Captions and numbering

A table is numbered when it has a `\caption`: `\begin{table}…\caption{…}…\end{table}` gives "Table 1: …". Tables have their own counter, separate from figures and algorithms. The caption appears where you wrote it, above or below the tabular. `\caption*{…}` and the short form `\caption[short]{…}` are accepted, and both are numbered.

`longtable` may carry its own `\caption`, which numbers it as a table. The `\endhead`, `\endfirsthead`, `\endfoot` and `\endlastfoot` markers are dropped, because a web page doesn't break tables across pages.

`table*` is the same as `table`, except that in a [two-column layout](columns.md) it spans both columns.

## Wide tables

A table is only as wide as its content. When that is wider than the page:

- **By default** the table scrolls sideways inside its own box (`.latex-table-wrap`), and the page doesn't.
- **Inside `\resizebox{\linewidth}{!}{…}`** (or `\resizebox*` or `\adjustbox{…}{…}`, or the `adjustbox` environment), it is scaled down to fit the width, to 55% at the smallest. Below that it scrolls. The fitting is redone whenever the width changes.
- `\scalebox{…}{…}` and `\rotatebox{…}{…}` are dropped, leaving their content as it is.

The same fitting works for anything inside `\resizebox`, not only tables.

## What doesn't work

- Column widths from `p{3cm}` or `X`, and `\arraystretch`, `\tabcolsep`: the layout is left to the browser.
- `\multirow` wrapped around `\multicolumn` (put `\multicolumn` outside instead).
- `\hhline` and `\Xhline` degrade to their argument text. (`\makecell{a\\b}` happens to work: it degrades to its text, and the `\\` inside it is a line break.)
- Cell counts that don't match the column spec: HTML tables don't mind, but it is usually a mistake, so [lint](checking.md) warns about it.

---
Previous: [Maths](maths.md) · [Contents](README.md) · Next: [Figures and images](figures.md)
