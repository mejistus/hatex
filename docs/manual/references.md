# Cross-references, citations and footnotes

## Labels

`\label{key}` names the thing it belongs to:

| Where the `\label` is | What `\ref{key}` shows |
|---|---|
| Right after `\section`, `\subsection` or `\subsubsection` | The section number, e.g. `2.1` |
| In a numbered equation row | The equation number, e.g. `3` |
| In a `figure`, `table` or `algorithm` with a caption | The float number, e.g. `2` |
| In a `subfigure` or `subtable` | The float number and the letter, e.g. `2b` |
| In a numbered theorem-like environment | Its number, e.g. `4` |
| Anywhere else | The number of the enclosing section, float or sub-float, if there is one |

The label also puts an `id` on the page, and that is where references link to. Keys can contain any characters except `}`: `fig:loss`, `sec-intro` and `eq.1` all work.

A label on something unnumbered (a starred section, a float without a caption) still works as a link target, but it has no number, so `\ref` shows `??`, as LaTeX does.

## References

| Command | Result |
|---|---|
| `\ref{key}` | `2` |
| `\eqref{key}` | `(3)` |
| `\autoref{key}`, `\cref{key}`, `\Cref{key}` | `Figure 2`, `Section 1`, `Equation 3`, `Theorem 4` |
| `\pageref{key}`, `\nameref{key}` | `2`, the number (there are no pages or names) |
| `\ref{a,b}` | `1, 2`: several keys at once, each linked |

The word that `\autoref` and `\cref` put in front comes from the kind of target: Figure, Table, Algorithm, Section, Equation, or the theorem's name, such as Theorem, Lemma or your `\newtheorem` title. In Chinese documents they are 图, 表, 算法, 节 and 式. `\cref` and `\Cref` give the same result, capitalised. A non-breaking space joins the word and the number.

A reference to a label that doesn't exist shows `??`. [Lint](checking.md) reports it.

Labels can be used before they are defined: all numbers are resolved after the whole document has been rendered.

## Clicking a reference

References, citations and footnote marks are ordinary `<a href="#…">` links, but the runtime handles clicks on them itself:

- the target is scrolled smoothly to the middle of the view;
- the target is briefly highlighted (the `latex-flash` class, coloured by `--hx-flash`); for an equation, the whole display flashes;
- the URL doesn't change, so the back button doesn't have to step through every reference.

With `animate: false`, or when the reader's system asks for reduced motion, the page jumps without scrolling or flashing.

**Target ids are not stable.** Each call to `parse` gives its ids a random prefix (e.g. `tex3k9f2a-fig:loss`), so that two documents on one page can't clash. Don't link to them from outside the document.

## Citations

```latex
Diffusion models \cite{ho2020,song2021} generate …
As shown by \citet[Thm.~2]{song2021}, …

\begin{thebibliography}{9}
  \bibitem{ho2020} J. Ho, A. Jain, P. Abbeel. Denoising diffusion probabilistic models. In \emph{NeurIPS}, 2020.
  \bibitem{song2021} Y. Song et al. Score-based generative modeling through SDEs. In \emph{ICLR}, 2021.
\end{thebibliography}
```

| Command | Result |
|---|---|
| `\cite{a}` | `[1]` |
| `\cite{a,b}` | `[1, 2]` |
| `\cite[p.~7]{a}` | `[1, p. 7]` |
| `\citep`, `\citet`, `\parencite`, `\textcite`, `\autocite` | The same as `\cite` with numbered entries; author–year with natbib labels (below) |

- Numbers follow the order of the `\bibitem`s, not the order of citation.
- Each number links to its entry in the bibliography.
- A key without a `\bibitem` shows the key itself, e.g. `[smith99]`. [Lint](checking.md) reports it.
- With two optional arguments (natbib's `\citep[see][p.~7]{a}`), only the second is shown.
- Citation brackets never break across lines. By default they look like plain numbers; set `--hx-cite` to draw hyperref-style boxes around them ([Theming](theming.md)).

## The bibliography

`thebibliography` becomes a numbered list headed "References" (参考文献). The `{9}` argument (the widest label) is read and dropped. `\bibitem[label]{key}` is accepted, but entries are always numbered `[1]`, `[2]`, …. The entry text can contain any inline formatting, links and maths.

An entry with a natbib label, `\bibitem[Vaswani et~al.(2017)Vaswani, Shazeer, …]{vaswani2017}` as BibTeX writes into a `.bbl`, is author–year: `\citet` gives "Vaswani et al. (2017)", `\citep` "(Vaswani et al., 2017)", and such entries have no numbers in the list. [Papers](papers.md#citations-and-the-bibliography) lists every form.

A `.bib` or `.bbl` file can be given with the options `bib` and `bbl`: it replaces `\bibliography{…}`; see [Papers](papers.md#citations-and-the-bibliography). Without them, `\bibliography{refs}`, `\addbibresource` and `\printbibliography` are ignored. Write the entries into the document. `HaTeX.Bib` turns BibTeX into `\bibitem` lines, and can look a reference up from its DOI or arXiv id:

```js
const [entry] = await HaTeX.Bib.lookup('2006.11239');   // or a DOI, or an arxiv.org URL
HaTeX.Bib.format(entry);
// e.g. "\bibitem{ho2020denoising} J. Ho, A. Jain, P. Abbeel. Denoising Diffusion Probabilistic Models. arXiv:2006.11239, 2020."
```

See [`HaTeX.Bib`](api.md#hatexbib) for all the functions, and [`examples/editor.html`](../../examples/editor.html) for an "add reference" box built with them.

## Footnotes

`\footnote{text}` puts a superscript number in the text and the note at the end of the document, in a numbered list. The number links to the note, and the note has a ↩ link back. Footnotes are numbered through the whole document. `\footnote[5]{…}` is accepted, but the number is ignored.

`\footnotemark` and `\footnotetext` are not supported.

---
Previous: [Code](code.md) · [Contents](README.md) · Next: [Two columns and multicols](columns.md)
