# Maths

HaTeX hands every formula to [KaTeX](https://katex.org). What KaTeX supports works, including `cases`, `pmatrix`, `\boldsymbol`, `\operatorname`, `\underbrace`, `\xrightarrow` and `\mathbb`; see KaTeX's [list of supported functions](https://katex.org/docs/supported.html). HaTeX adds numbering, labels and your macros around it.

KaTeX must be loaded before `render` or `parse` runs. Without KaTeX, each formula is shown as its source in `<code>`.

## Inline and display maths

| You write | Result |
|---|---|
| `$…$`, `\(…\)`, `\begin{math}…\end{math}` | Inline maths |
| `\[…\]`, `$$…$$`, `\begin{displaymath}…\end{displaymath}` | Display maths, not numbered |
| `\$` | A literal dollar sign, outside or inside maths |

A display formula inside a paragraph stays in that paragraph, as in LaTeX. The text after it continues the same paragraph unless there is a blank line.

## Numbered environments

| Environment | Numbering |
|---|---|
| `equation` | One number |
| `multline` | One number |
| `align`, `gather`, `alignat`, `flalign`, `eqnarray` | One number per row |
| The `*` forms of all of the above | None |

```latex
\begin{align}
  f(x) &= (x + 1)^2              \label{eq:square} \\
       &= x^2 + 2x + 1 \nonumber \\
  g(x) &= \sin x                 \label{eq:sine}
\end{align}
By \eqref{eq:square}, …
```

- Equations share one counter through the whole document: 1, 2, 3, …, never per section.
- `\nonumber` or `\notag` on a row leaves it unnumbered. Empty rows (e.g. a trailing `\\`) are never numbered.
- Rows are split only at top-level `\\`, so a `pmatrix`, `cases` or `aligned` inside a row keeps its own rows.
- `\tag{…}` on a row shows your tag instead of the number. The row still uses up a number, and a `\label` on it resolves to that number, not to the tag.
- `eqnarray` is rendered as an `array` with `rcl` columns.
- `split`, `aligned` and `gathered` work inside `equation`, as they do in LaTeX.

## Labels and references

`\label{key}` inside a numbered row makes that row's number the target of `\ref{key}` (`3`) and `\eqref{key}` (`(3)`), which link to the equation. Clicking one scrolls to the equation and briefly highlights it. `\autoref{key}` and `\cref{key}` give "Equation 3" (式 3 in Chinese documents). See [References](references.md).

A `\label` inside `\[…\]`, `$$…$$` or a starred environment is removed, because there is no number for it to refer to.

## Macros

`\newcommand`, `\renewcommand`, `\def` and `\DeclareMathOperator` are passed to KaTeX as macros:

```latex
\newcommand{\E}{\mathbb{E}}
\newcommand{\norm}[1]{\left\lVert #1 \right\rVert}
\DeclareMathOperator*{\argmin}{arg\,min}

$\E\norm{x}^2$ and $\argmin_\theta L(\theta)$
```

They can be defined in the preamble or anywhere in the body, and they apply to the whole document. See [Macros](documents.md#macros) for the details and restrictions.

## Errors

A formula that KaTeX can't parse is shown with KaTeX's own error rendering (the source in red) instead of breaking the page, and the rest of the document renders as usual. hatex's [lint](checking.md) reports unclosed `$`, `$$` and `\[`, but not KaTeX syntax errors. To find those, look for red formulas in the output.

## Maths in two columns

A display equation that is too wide for its line, in a [two-column layout](columns.md) or on a narrow screen, is scaled down until it fits. It never scrolls sideways, as a typeset page has no scrollbars. A numbered equation needs room for its number on both sides of the formula, because KaTeX centres the formula across the full width, and the fitting takes that into account.

## Accessibility and speed

KaTeX normally writes each formula twice: once as visible HTML and once as hidden MathML for screen readers. The MathML accounts for about three quarters of the layout time of a page full of maths, so HaTeX asks KaTeX for HTML only, and gives every formula `role="math"` and an `aria-label` holding its TeX source.

## What doesn't work

- **Packages KaTeX doesn't implement**, such as `siunitx` (`\SI{3}{m}` degrades to `3m`), `physics` or `tensor`. Define what you need with `\newcommand`.
- **`\label` inside inline maths** or a starred environment, as described above.
- **Equation numbering per section.** `\numberwithin{equation}{section}` isn't known, so it degrades to the text "equationsection". Leave it out, or keep it in the preamble, where it is ignored.
- **`\intertext`**, which KaTeX doesn't support. Close the environment, write the text, and open a new one.

---
Previous: [How HaTeX reads a document](documents.md) · [Contents](README.md) · Next: [Tables](tables.md)
