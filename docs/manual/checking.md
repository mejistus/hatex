# Checking sources

hatex never fails on a bad source; it renders what it can. That is convenient for readers, but it means that mistakes don't announce themselves. `HaTeX.lint` finds the structural ones before they reach a page.

```js
const problems = HaTeX.lint(source);
// [{ line: 12, severity: 'error', message: '\\begin{itemize} is never closed' }, …]
```

It needs no DOM and no KaTeX, so it runs in an editor, in a build step, or in a pre-commit hook. It ignores comments and the contents of `verbatim`, `lstlisting`, `minted`, `\verb` and `\lstinline`, and line numbers stay correct.

## The checks

### Errors

| Message | Cause |
|---|---|
| `\end{X} without \begin{X}` | An `\end` with nothing open |
| `\end{X} closes \begin{Y} (line n)` | Environments closed in the wrong order, or a typo in a name |
| `\begin{X} is never closed` | A missing `\end` |
| `Unmatched "}"` | One `}` too many |
| `Unclosed "{"` | A missing `}`. At most three are reported. |
| `Unclosed $ math`, `Unclosed $$ math`, `Unclosed \[ … \]` | Maths that never ends; everything after it would be read as maths |

### Warnings

| Message | Cause |
|---|---|
| `Duplicate \label{key} (first on line n)` | Two labels with the same key; references go to the first one |
| `Reference to unknown label "key"` | `\ref`, `\eqref`, `\autoref`, `\cref`, `\Cref`, `\pageref` or `\nameref` to a key that has no `\label`; it would show `??` |
| `Citation "key" has no \bibitem` | A `\cite` (or `\citep`, `\citet`, `\parencite`, `\textcite`, `\autocite`) key missing from `thebibliography` |
| `Citation "key" but the post has no thebibliography` | Citations without any bibliography |
| `TikZ can't typeset "字": pictures are compiled by plain TeX, so labels must be ASCII` | A non-ASCII character in a `tikzpicture` or `tikzcd`; the picture would fail to compile |
| `Row has n cells, but the table has m columns` | A tabular row with the wrong number of `&`. `\multicolumn{k}` counts as `k` cells, and rule-only rows are skipped. |

### Front matter

With `{ frontMatter: true }`, lint also checks the `% ---` block at the top of the source ([Comments and front matter](documents.md#comments-and-front-matter)):

| Message | Cause |
|---|---|
| `No front matter: add a "% ---" block with title, date and tag` | The source doesn't start with the block |
| `Front matter has no title` | No `title:` line |
| `Front matter has no date` | No `date:` line |
| `Date "…" is not YYYY-MM-DD` | The date isn't in the form `2024-05-01` (or `2024/5/1`) |
| `Front matter has no tag (it decides the folder)` | No `tag:` line |

These checks come from the blog that hatex was taken from, where the tag decides the folder a post goes into. They are off by default.

## What lint doesn't check

- KaTeX syntax inside maths: an unknown command in `$…$` is reported by KaTeX in red in the output, not by lint.
- TikZ syntax other than non-ASCII text: use the `tikzErrors` option while writing ([TikZ errors](tikz.md#errors)).
- Commands that hatex doesn't support, which degrade to their text: read the output.
- Whether image files exist: use `HaTeX.images` (below).

## Images

```js
HaTeX.images(source);   // → [{ path: 'assets/plot.png', line: 14 }, …]
```

This lists the path of every `\includegraphics` in the source, except `http(s):` and `data:` URLs and those in comments or verbatim blocks. Since paths are relative to the page ([Images](figures.md#images)), resolve them against the page's location before checking:

```js
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

for (const { path, line } of HaTeX.images(source)) {
  if (!existsSync(join(dirname(pagePath), path))) console.warn(`line ${line}: missing image ${path}`);
}
```

## Using lint in a build

```js
import { readFileSync } from 'node:fs';
import HaTeX from 'hatex';

let failed = false;
for (const file of process.argv.slice(2)) {
  for (const p of HaTeX.lint(readFileSync(file, 'utf8'))) {
    console.log(`${file}:${p.line}: ${p.severity}: ${p.message}`);
    if (p.severity === 'error') failed = true;
  }
}
process.exit(failed ? 1 : 0);
```

The `file:line: severity: message` format is understood by most editors and CI annotators.

---
Previous: [Node, bundlers and static sites](node.md) · [Contents](README.md) · Next: [Limitations and troubleshooting](troubleshooting.md)
