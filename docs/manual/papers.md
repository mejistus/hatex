# Papers

HaTeX is made for putting research papers on the web, in computer science and AI in particular. Hand it the LaTeX source of a paper written with a conference template and it renders the paper as it is: the title block, two columns where the template has them, numbered equations, tables, figures, algorithms, citations and the bibliography, and the appendix.

```js
const [tex, bib] = await Promise.all([
  fetch('paper/main.tex').then(r => r.text()),
  fetch('paper/refs.bib').then(r => r.text()),
]);
HaTeX.render('#paper', tex, { bib });
```

## Conference templates

The template's own packages and commands (`\usepackage[final]{neurips_2024}`, `\iclrfinalcopy`, `\icmltitlerunning`, `\pdfinfo`, `\def\paperID`, …) are read where they matter and otherwise skipped without leaving text behind.

| Template | Columns | Title block | Citations |
|---|---|---|---|
| NeurIPS | one | `\title`, `\author` with `\And` / `\AND`, `\thanks` | natbib, author–year |
| ICLR | one | `\title`, `\author` with `\And` / `\AND`, `\thanks` | natbib, author–year |
| ICML | two (`\twocolumn[…]`) | `\icmltitle`, `\icmlauthor`, `\icmlaffiliation`, `\icmlsetsymbol`, `\icmlcorrespondingauthor` | natbib, author–year |
| CVPR, ICCV | two (class option) | `\title`, `\author` with `\and` | numbers |
| ACL, EMNLP, NAACL | two (the `acl` style) | `\title`, `\author` with `\And` / `\AND` | natbib, author–year |
| AAAI | two (the `aaai…` style) | `\title`, `\author`, `\affiliations` | numbers |
| IJCAI | two (the `ijcai…` style) | `\title`, `\author` | numbers |
| IEEE (`IEEEtran`) | two, unless `onecolumn` | `\title`, `\author` | numbers |
| ACM (`acmart`) | two with `sigconf` / `sigplan` | `\title`, `\author` | numbers |

The citation column is what HaTeX chooses when it builds the bibliography from a `.bib` (below): author–year when the paper uses natbib's `\citep` / `\citet` without the `numbers` option, numbers otherwise. With a `.bbl`, the labels in it decide.

Each row was tested with a skeleton that follows the template's instructions: its class and style options, title block and citation commands. A paper that loads packages of its own may use commands HaTeX doesn't know: they [degrade](documents.md) to their text. Look through the rendered paper once, and see [Limitations](troubleshooting.md).

## The title block

`\maketitle` shows the title, the authors and, if set, the date (a bare `\today` is left out, as conference styles do):

- Authors separated by `\and`, `\And` or `\AND` are set side by side. Within an author, `\\` breaks the lines: name first, then affiliation and e-mail.
- `\thanks{…}` becomes a symbol (\*, †, ‡, …) after the name, and its text a note under the authors.
- ICML's authors are listed on one line with affiliation numbers and symbols, followed by the numbered affiliations, "Equal contribution" when `equal` is used, and the correspondence line. ICML has no `\maketitle`: the block stands where `\icmltitle` is.
- AAAI's `\affiliations{…}` is shown under the authors.

In a two-column paper the title block spans both columns, like the abstract. When the page already shows the title, leave the block out with `titleBlock: false`:

```js
HaTeX.render('#paper', tex, { titleBlock: false });
```

## Citations and the bibliography

HaTeX reads one file, so the bibliography comes in as an option, as the text of either file:

| Option | What it is | Where it comes from |
|---|---|---|
| `bib` | The `.bib` database | Your `refs.bib` |
| `bbl` | The bibliography BibTeX produced | `main.bbl` next to the source; arXiv includes it in every source download |

Either one takes the place of `\bibliography{…}` (or biblatex's `\printbibliography`) in the text:

- From a **`.bbl`**, the entries are exactly the ones in the file, formatted as the paper's `.bst` formatted them. This is the most faithful choice.
- From a **`.bib`**, HaTeX lists the entries the text cites (all of them with `\nocite{*}`), formatted in one plain style: authors, title, venue, year. With author–year citations they are sorted by author, otherwise numbered in the order of first citation; `\bibliographystyle{plain}`, `abbrv` or `alpha` sort numbered entries by author too.

With natbib labels (from a `.bbl`, or built from a `.bib`), citations are author–year, as natbib sets them:

| Command | Result |
|---|---|
| `\citet{vaswani2017}` | Vaswani et al. (2017) |
| `\citep{vaswani2017}` | (Vaswani et al., 2017) |
| `\citep{a,b}` | (Vaswani et al., 2017; He et al., 2016) |
| `\citep[see][Sec.~3]{a}` | (see Vaswani et al., 2017, Sec. 3) |
| `\citet[p.~5]{a}` | Vaswani et al. (2017, p. 5) |
| `\citealp{a}` | Vaswani et al., 2017 |
| `\citeauthor{a}`, `\citeyear{a}`, `\citeyearpar{a}` | Vaswani et al., 2017, (2017) |
| `\cite{a}` | as `\citet` |

Each citation links to its entry. Without either option, `\bibliography{…}` produces nothing and citations show their keys; see [Cross-references, citations and footnotes](references.md).

## From an arXiv source

1. Download the source ("Other formats" → "Download source") and unpack it.
2. If the paper is split into files with `\input` / `\include`, join them into one: `latexpand main.tex > paper.tex` (latexpand comes with TeX Live), or paste the parts in by hand. HaTeX doesn't follow `\input`.
3. Serve `paper.tex`, `main.bbl` and the figures together, and render with `{ bbl }`.
4. Figures in PDF format don't show in browsers: convert them to PNG or SVG and change the `\includegraphics` paths, or keep the file names and change only the extension.

---
Previous: [Getting started](getting-started.md) · [Contents](README.md) · Next: [How HaTeX reads a document](documents.md)
