# How HaTeX reads a document

This chapter covers the parts of LaTeX that every document uses: the preamble, comments, paragraphs, headings, text formatting and lists. Later chapters cover maths, tables, figures and the rest.

## The rule for unknown input

HaTeX implements the subset of LaTeX that articles and blog posts use. It is not a TeX engine, and it never stops on input it doesn't understand:

- An **unknown command** keeps the text of the `{…}` groups directly after it and drops a leading `[…]`. `\foo[x]{bar}{baz}` becomes `barbaz`, and `\foo` alone becomes nothing.
- An **unknown environment** renders its content as if the `\begin` and `\end` weren't there.
- A small set of layout and preamble commands are **ignored** together with their arguments, so that nothing leaks into the text. They are listed [at the end of this chapter](#ignored-commands).

When something looks wrong, the most likely cause is a command in the first group: it degraded to its argument text. [Checking sources](checking.md) catches the structural mistakes (unbalanced braces, unclosed environments and so on).

## The preamble

If the source contains `\begin{document}`, only the text between it and `\end{document}` is rendered. The part before it is read for definitions only:

| Read from the preamble | Effect |
|---|---|
| `\newcommand`, `\renewcommand`, `\providecommand`, `\def` | User macros, in text and maths ([below](#macros)) |
| `\DeclareMathOperator` (and `*`) | A maths operator such as `\tr` |
| `\newtheorem` | A new theorem-like environment ([Theorems](theorems.md)) |
| `\definecolor` | A named colour for `\textcolor` and TikZ |
| `\usetikzlibrary`, `\tikzset`, `\pgfplotsset`, `\usepgfplotslibrary`, `\tikzstyle` | Passed to TikZ pictures ([TikZ](tikz.md)) |
| `\documentclass[…]{…}` | `twocolumn` switches on [two columns](columns.md), and `beamer` switches on [slides](slides.md) |

Everything else in the preamble (`\usepackage`, `\geometry`, `\hypersetup`, …) is ignored. Without `\begin{document}`, the whole source is the body, and definitions can appear anywhere in it.

The definitions are collected before anything is rendered. A macro defined halfway through the document therefore also works before its definition, which is different from LaTeX.

## Comments and front matter

`%` starts a comment that runs to the end of the line, and `\%` is a literal percent sign. Comments are removed before anything else is read, apart from the contents of `verbatim`, `lstlisting`, `minted`, `\verb` and `\lstinline`, which are taken out first and kept exactly.

A block of comment lines between two `% ---` lines at the top is conventionally used as **front matter**:

```latex
% ---
% title: Denoising score matching
% date: 2024-05-01
% tag: notes
% ---
```

The renderer ignores it, since it's a comment. Your own code can read it (the [prerender example](../../examples/node/prerender.mjs) takes the page title from it), and `HaTeX.lint(source, { frontMatter: true })` checks that it is there and complete; see [Checking sources](checking.md#front-matter).

## Paragraphs and line breaks

| You write | You get |
|---|---|
| A blank line, or `\par` | A new paragraph (`<p>`) |
| A single line break | A space, as in LaTeX |
| `\\`, `\newline`, `\linebreak` | A line break (`<br>`). An optional `\\[2mm]` is dropped. |
| `~` | A non-breaking space |
| `\hrule`, `\rule{w}{h}` | A horizontal rule (`<hr>`) |
| `\noindent`, `\indent`, `\centering`, `\raggedright`, … | Nothing: web paragraphs aren't indented |

A paragraph made only of block elements (a table, a picture, a figure) is emitted without a `<p>` around it. Layout glue between blocks (`\hfill`, `\quad`, `\hspace{…}`, `~`, `\\`) is dropped, so two `minipage`s separated by `\hfill` simply sit side by side.

## Headings

| Command | Element | Numbering |
|---|---|---|
| `\part{…}`, `\chapter{…}` | `<h2>` | Never numbered |
| `\section{…}` | `<h2>` | 1, 2, 3, … |
| `\subsection{…}` | `<h3>` | 1.1, 1.2, … |
| `\subsubsection{…}` | `<h4>` | 1.1.1, … |
| `\paragraph{…}`, `\subparagraph{…}` | A bold run-in heading at the start of the paragraph | Never numbered |

- The starred forms (`\section*{…}`) are not numbered and don't advance the counters.
- The optional short title (`\section[Short]{Long title}`) is accepted and dropped: there is no table of contents in articles.
- A `\label{…}` right after the heading gives the heading an `id`, and `\ref` then shows its number ([References](references.md)).
- The number is in a `<span class="latex-secnum">` before the title, so it can be styled separately.
- `\appendix` is ignored: sections after it keep counting with numbers, not letters.

## The abstract

```latex
\begin{abstract}
We show that …
\end{abstract}
```

This becomes a centred block titled "Abstract" (摘要 in a Chinese document). In a [two-column document](columns.md) it spans both columns.

## Title, author and date

In an article, `\maketitle` shows a title block made from `\title`, `\author` (with `\and`, `\And`, `\AND` and `\thanks`) and `\date`, as do the title commands of the common conference templates; see [Papers](papers.md#the-title-block). Without `\maketitle`, or with the option `titleBlock: false`, they produce nothing, for a page that shows its own title. In a [beamer document](slides.md), these commands fill the title page.

## Text formatting

| Command | Declaration form | Result |
|---|---|---|
| `\textbf{…}` | `\bfseries`, `\bf` | Bold (`<strong>`) |
| `\emph{…}`, `\textit{…}`, `\textsl{…}` | `\itshape`, `\it`, `\em`, `\slshape`, `\sl` | Italic (`<em>`) |
| `\underline{…}`, `\uline{…}` | | Underline (`<u>`) |
| `\texttt{…}` | `\ttfamily`, `\tt` | Monospace (`<code class="latex-tt">`) |
| `\textsc{…}` | `\scshape`, `\sc` | Small caps |
| `\textsf{…}` | `\sffamily`, `\sf` | Sans serif |
| `\sout{…}`, `\st{…}` | | Strike-through (`<s>`) |
| `\hl{…}` | | Highlight (`<mark>`) |
| `\textsuperscript{…}`, `\textsubscript{…}` | | `<sup>`, `<sub>` |
| `\fbox{…}` | | A thin frame |
| `\textrm`, `\textup`, `\textmd`, `\textnormal`, `\mbox`, `\hbox`, `\text` | `\rmfamily`, `\upshape`, `\mdseries`, `\normalfont`, `\rm` | Just the text |

A declaration applies to the rest of its group: `{\bfseries bold} normal`. The nesting is kept, but an "upright inside italic" declaration can't undo an outer `\emph`; it's just text.

### Sizes

`\tiny`, `\scriptsize`, `\footnotesize`, `\small`, `\normalsize`, `\large`, `\Large`, `\LARGE`, `\huge` and `\Huge` apply to the rest of their group. They are relative (`0.6em` up to `2.49em`), so they scale with the surrounding text.

### Colour

| Command | Result |
|---|---|
| `\textcolor{red}{…}`, `\textcolor[HTML]{3AA35B}{…}` | Coloured text |
| `{\color{blue} …}` | Colours the rest of the group |
| `\colorbox{yellow!30}{…}` | Text on a coloured background |
| `\definecolor{brand}{HTML}{3AA35B}` | Defines a name; also available as `rgb` (0–1) and `RGB` (0–255) models |

A colour can be:

- a name you defined with `\definecolor`;
- any CSS colour name (`red`, `teal`, `orange`, …);
- an xcolor tint such as `red!60`, meaning 60% red and 40% white. Only the first mix is used, so `red!60!blue` is read as `red!60`.

Anything else becomes `inherit`, i.e. no colour.

In [dark mode](theming.md#dark-mode), `\textcolor` colours are lifted towards white so that they stay readable, and text on a `\colorbox`, `\hl`, `\rowcolor` or `\cellcolor` background turns dark.

### Links

| Command | Result |
|---|---|
| `\href{https://example.com}{text}` | A link |
| `\url{https://example.com}` | A link that shows the URL in monospace |

Only `http:`, `https:`, `mailto:`, `tel:`, in-page `#…` and relative URLs are allowed. Anything else, such as `javascript:`, becomes `#`. Escaped characters (`\#`, `\%`, `\&`, `\_`, `\~`, `\$`) in the URL are unescaped.

### Punctuation, symbols and accents

| You write | You get |
|---|---|
| ` ``quoted'' `, `` `single' `` | “quoted”, ‘single’ |
| `--`, `---` | – (en dash), — (em dash) |
| `\ldots`, `\dots` | … |
| `\,` `\;` `\:` `\!` | Thin space, en space, en space, nothing |
| `\%` `\$` `\#` `\_` `\&` `\{` `\}` | The character itself |
| `\S` `\P` `\dag` `\ddag` `\copyright` `\textregistered` `\texttrademark` | § ¶ † ‡ © ® ™ |
| `\pounds` `\euro` `\textdegree` `\textbullet` `\textperiodcentered` | £ € ° • · |
| `\textbackslash` `\textasciitilde` `\textasciicircum` `\textbar` `\textless` `\textgreater` | \ ~ ^ \| < > |
| `\quad`, `\qquad`, `\enspace`, `\thinspace` | Horizontal spaces |
| `\TeX`, `\LaTeX`, `\LaTeXe`, `\XeTeX` | The logos, typeset with lowered and raised letters |
| `\today` | Today's date, e.g. "September 27, 2026" (or 2026年9月27日 in a Chinese document) |
| `\'e` `` \`a `` `\^o` `\"u` `\~n` `\=a` `\.z` `\u{a}` `\v{s}` `\H{o}` `\c{c}` `\r{a}` | é à ô ü ñ ā ż ă š ő ç å |

As in TeX, the spaces after a control word are dropped: `\ldots and` gives "…and". Write `\ldots{} and` or `\ldots\ and` to keep a space.

## Lists

```latex
\begin{itemize}
  \item First
  \item[$\star$] A custom label
\end{itemize}

\begin{enumerate}
  \item One
  \begin{enumerate}
    \item Nested
  \end{enumerate}
\end{enumerate}

\begin{description}
  \item[Term] Its description.
\end{description}
```

- `itemize` becomes `<ul>`, `enumerate` becomes `<ol>` and `description` becomes `<dl>`.
- Nested `enumerate` levels are numbered 1., a., i., A., whatever the options say. `enumitem` options such as `[label=(\alph*)]` are ignored.
- `\item[label]` in `itemize` or `enumerate` replaces the bullet or number with your label.
- An item that is a single paragraph stays tight (no `<p>` inside the `<li>`).
- Lists nest to any depth and can contain maths, tables, code and other blocks.

## Quotes and alignment

| Environment | Result |
|---|---|
| `quote`, `quotation`, `verse` | An indented block quote |
| `center` | Centred content |
| `flushright` | Right-aligned content (in [vertical text](vertical-chinese.md), the foot of the column) |
| `flushleft` | Content as usual |

## Macros

```latex
\newcommand{\R}{\mathbb{R}}
\newcommand{\norm}[1]{\left\lVert #1 \right\rVert}
\renewcommand{\vec}[1]{\mathbf{#1}}
\def\eps{\varepsilon}
\DeclareMathOperator{\tr}{tr}
\DeclareMathOperator*{\argmax}{arg\,max}
```

- Macros work in text and in maths. In maths they are handed to KaTeX as macros; in text they are expanded, and the expansion is rendered.
- Up to 9 arguments, `#1` … `#9`. An optional default for the first argument (`\newcommand{\x}[2][0]{…}`) is read but not used: every argument is read as a mandatory one.
- `\def` works for macros without parameters (`\def\eps{\varepsilon}`). A `\def` with a parameter text (`\def\f#1{…}`) is not supported.
- `\newcommand`, `\renewcommand` and `\providecommand` are handled alike: the last definition wins.
- Macros that a TikZ picture uses are passed into the picture; see [TikZ](tikz.md#what-a-picture-can-see).
- `\newenvironment` and `\renewenvironment` are ignored. An environment defined with them therefore renders as its plain content.

## Chinese documents

If the source contains any CJK character (Chinese, Japanese kana, full-width forms), even in a comment, HaTeX switches to Chinese labels:

| English | Chinese |
|---|---|
| Figure 1: | 图 1 |
| Table 1: | 表 1 |
| Algorithm 1: | 算法 1 |
| Theorem, Lemma, Corollary, Proposition, Definition, Remark, Example | 定理, 引理, 推论, 命题, 定义, 注, 例 |
| Proof | 证明 |
| Abstract | 摘要 |
| References | 参考文献 |
| Section, Equation (in `\autoref`/`\cref`) | 节, 式 |

The colon after a caption label and the period after a theorem head are left out in Chinese, following ctex. 证明 keeps its period.

A line break between two CJK characters produces no space, as with ctex, so you can wrap Chinese text in the source freely. A line break between Chinese and Latin text still produces a space.

For text set vertically, see [Vertical Chinese](vertical-chinese.md).

## Ignored commands

These produce nothing, and their arguments are consumed so that they don't appear in the text:

- **Title block:** `\title`, `\author`, `\date`, `\thanks` in an article without `\maketitle` (see [Title, author and date](#title-author-and-date))
- **Page layout:** `\vspace`, `\hspace`, `\newpage`, `\clearpage`, `\cleardoublepage`, `\pagestyle`, `\thispagestyle`, `\pagenumbering`, `\linespread`, `\bigskip`, `\medskip`, `\smallskip`, `\vfill`
- **Settings:** `\setlength`, `\addtolength`, `\setcounter`, `\addtocounter`, `\stepcounter`, `\geometry`, `\hypersetup`, `\captionsetup`, `\lstset`, `\setminted`, `\graphicspath`
- **Structure:** `\tableofcontents` (in articles), `\appendix`, `\frontmatter`, `\mainmatter`, `\backmatter`
- **Bibliography files:** `\bibliographystyle`, `\addbibresource`, `\nocite`; and `\bibliography`, `\printbibliography` unless a `.bib` or `.bbl` is given ([Papers](papers.md#citations-and-the-bibliography))
- **Files and packages:** `\input`, `\include`, `\usepackage`, `\documentclass` (after reading its options)
- **Other:** `\index`, `\phantom`, `\protect`, `\relax`, `\newenvironment`, `\renewenvironment`
- **Float placement:** `[htbp]`, `[H]` and similar after `\begin{figure}` or `\begin{table}`

---
Previous: [Papers](papers.md) · [Contents](README.md) · Next: [Maths](maths.md)
