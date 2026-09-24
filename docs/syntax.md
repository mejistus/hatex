# Syntax reference

What hatex understands, grouped by what you're writing. For a working document that uses all of it, see [`examples/document/example.tex`](../examples/document/example.tex).

Anything not listed here is either ignored (layout commands, see the end of this page) or replaced by its argument text.

## Document

| You write | You get |
|---|---|
| `\documentclass`, `\usepackage`, `\begin{document}` | Optional. Anything before `\begin{document}` is read only for definitions. |
| `% comments` | Removed. A `% ---` front-matter block (`% title: …`) is ignored by the renderer; read it yourself if you want it. |
| `\section{…}` `\subsection` `\subsubsection` | `<h2>` `<h3>` `<h4>`, numbered 1, 1.1, 1.1.1. Starred forms aren't numbered. |
| `\paragraph{Title}` | A bold run-in heading. |
| `\begin{abstract}` | A centred abstract block with a title. |
| `\label{key}` after a heading, float, equation, theorem or item | A target for `\ref`. |
| Blank line, `\par` | A new paragraph. |
| `\\`, `\newline` | A line break. |

## Text

| You write | You get |
|---|---|
| `\textbf` `\emph` `\textit` `\underline` `\texttt` `\textsc` `\textsf` `\sout` `\hl` | Bold, italic, underline, monospace, small caps, sans, strikethrough, highlight. The declaration forms (`{\bfseries …}`, `{\itshape …}`) work too. |
| `\textcolor{red}{…}` `\color{…}` `\colorbox{yellow!30}{…}` | Colour. Accepts named colours, `\definecolor{c}{HTML}{3AA35B}`, `rgb`/`RGB` and `red!60` mixes. |
| `\tiny` … `\Huge` | Relative font sizes. |
| `\footnote{…}` | A numbered footnote, collected at the end, with links both ways. |
| `\href{url}{text}` `\url{url}` | Links. Only `http(s)`, `mailto`, `tel` and relative URLs are allowed. |
| ` ``…'' ` `` `…' `` `--` `---` `~` | “…”, ‘…’, –, —, a non-breaking space. |
| `\'e` `\"o` `\c{c}` … | Accented letters. |
| `\LaTeX` `\TeX` `\ldots` `\S` `\textbackslash` … | The usual symbols and logos. |

## Lists

```latex
\begin{itemize}  \item …  \end{itemize}
\begin{enumerate} \item … \end{enumerate}      % nested levels: 1. → a. → i.
\begin{description} \item[Term] … \end{description}
\item[custom] …                                  % custom label in itemize/enumerate
```

## Maths (KaTeX)

| You write | Notes |
|---|---|
| `$…$` `\(…\)` | Inline. |
| `\[…\]` `$$…$$` | Display, not numbered. |
| `equation` `align` `gather` `multline` `alignat` `flalign` `eqnarray` | Numbered: every row of `align`/`gather` gets its own number. The `*` forms and `\nonumber`/`\notag` turn numbering off. |
| `\label{eq:x}` + `\eqref{eq:x}` | `(3)`, which links to the equation. |
| `\newcommand{\R}{\mathbb{R}}` `\DeclareMathOperator{\tr}{tr}` `\def` | Work in maths and in text. Arguments `[n]` are supported. |

Whatever KaTeX supports works, including `cases`, `pmatrix`, `\boldsymbol` and `\operatorname`. Packages KaTeX doesn't have, such as `siunitx`, don't.

## Tables

```latex
\begin{table}[htbp]
  \centering
  \caption{Results.}\label{tab:main}
  \resizebox{\linewidth}{!}{%                  % shrink a wide table to the column
  \begin{tabular}{l|cc}
    \toprule
    \multirow{2}{*}{Method} & \multicolumn{2}{c}{Score} \\
    \cmidrule(lr){2-3}
     & A & B \\
    \midrule
    Ours & \textbf{1.0} & \underline{0.9} \\
    \rowcolor{yellow!20} Base & 0.5 & \cellcolor{red!10} 0.4 \\
    \bottomrule
  \end{tabular}}
\end{table}
```

- The column types `l c r` and `|` are supported, and `p{…}`, `X` and `m{…}` are treated as `l`.
- `tabular`, `tabular*`, `tabularx` and `longtable` all work.
- The rules are `\toprule`, `\midrule`, `\bottomrule`, `\hline`, `\cline{2-3}` and `\cmidrule(lr){2-3}`.
- `\resizebox`, `\scalebox` and `\adjustbox` around a table scale it down to fit (not below 55%, after which it scrolls).

## Figures

```latex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.6\linewidth]{assets/plot.png}   % path relative to the page
  \caption{…}\label{fig:plot}
\end{figure}

\begin{figure}
  \begin{subfigure}[b]{0.45\linewidth} \includegraphics{a.png} \caption{A}\label{fig:a} \end{subfigure}
  \hfill
  \begin{subfigure}[b]{0.45\linewidth} \includegraphics{b.png} \caption{B}\label{fig:b} \end{subfigure}
  \caption{Both.}\label{fig:both}              % \ref{fig:a} → 2a
\end{figure}
```

- `width=` accepts `x\linewidth` (or `\textwidth`/`\columnwidth`) and absolute units, and `height=` and `scale=` also work.
- `minipage`s side by side, each with its own `\caption`, are numbered separately.
- `wrapfigure` renders as an ordinary figure.
- Figures, tables and algorithms each keep their own counters.

## TikZ

```latex
\usetikzlibrary{arrows.meta,positioning}
\begin{figure}
  \centering
  \begin{tikzpicture}[node distance=15mm]
    \node[draw] (a) {A};
    \node[draw, right=of a] (b) {B};
    \draw[-Stealth] (a) -- node[above] {$f$} (b);
  \end{tikzpicture}
  \caption{…}\label{fig:ab}
\end{figure}
```

- `tikzpicture` and `tikzcd` work, and so does `axis`, which loads pgfplots.
- `\tikzset`, `\pgfplotsset`, `\definecolor` and `\newcommand` from the document are passed into the picture.
- Common libraries are detected from the code, and any others you declare with `\usetikzlibrary`.
- **Labels must be ASCII.** Maths inside `$…$` is fine.
- The `nn*` styles for architecture diagrams are listed in the [README](../README.md#tikz).

## Theorems and proofs

```latex
\newtheorem{hyp}{Hypothesis}                 % your own environment
\begin{theorem}[Name]\label{thm:x} … \end{theorem}
\begin{proof} … \end{proof}                  % ends with ∎
```

The built-in environments are `theorem`, `lemma`, `corollary`, `proposition`, `definition`, `remark`, `example` and `proof`. `\newtheorem{a}[b]{…}`, which shares `b`'s counter, is supported.

## Algorithms

```latex
\begin{algorithm}
  \caption{Training}\label{alg:train}
  \begin{algorithmic}[1]                     % [1] numbers every line
    \Require data $x$
    \For{$t = 1, \dots, T$}
      \State $\theta \gets \theta - \eta \nabla L$ \Comment{step}
    \EndFor
    \State \Return $\theta$
  \end{algorithmic}
\end{algorithm}
```

The supported commands are `\State`, `\Statex`, `\If`/`\ElsIf`/`\Else`/`\EndIf`, `\For`/`\ForAll`/`\EndFor`, `\While`/`\EndWhile`, `\Repeat`/`\Until`, `\Loop`/`\EndLoop`, `\Function`/`\Procedure` with their `\End…`, `\Require`, `\Ensure`, `\Return`, `\Call` and `\Comment`.

## Code

```latex
\begin{lstlisting}[language=python] … \end{lstlisting}
\begin{minted}{js} … \end{minted}
\begin{verbatim} … \end{verbatim}
\verb|inline| \lstinline|inline| \mintinline{py}{inline}
```

Code is highlighted when Prism and the language's component are loaded, and shown as plain text otherwise.

## References and citations

| You write | You get |
|---|---|
| `\ref{key}` | The number, linked. |
| `\eqref{eq}` | `(n)`, linked. |
| `\autoref{key}` `\cref{key}` `\Cref{key}` | The type word plus the number, e.g. “Figure 2” (in Chinese sources, 图 2). |
| `\cite{a,b}` `\citep` `\citet` `\parencite` `\textcite` `\autocite` | Framed numbers `[1, 2]`, linked to the bibliography. |
| `\begin{thebibliography}{9} \bibitem{key} … \end{thebibliography}` | A numbered reference list, in the order of the `\bibitem`s. |

Every link scrolls to its target and flashes it, and the URL doesn't change.

## Two columns

```latex
\documentclass[twocolumn]{article}   % the whole document; \twocolumn works too
\begin{figure*} … \end{figure*}      % spans both columns (so does table*)
\begin{multicols}{2}[Optional intro spanning the top]
  … \columnbreak …
\end{multicols}
```

- Columns appear once there is room: 50rem for a two-column document and 32rem for `multicols`.
- Headings, the abstract, `figure*` and `table*` span all columns. Everything else stays in its column: wide equations are scaled down to fit, pictures shrink, and wide tables and code scroll.

## Slides (beamer)

```latex
\documentclass[aspectratio=169]{beamer}
\title{Talk}  \subtitle{…}  \author{A \and B}  \institute{…}  \date{\today}
\begin{document}
\begin{frame} \titlepage \end{frame}
\begin{frame}{Outline} \tableofcontents \end{frame}
\section{Part one}
\begin{frame}[t]{Title}{Subtitle}
  \begin{columns}[T]
    \begin{column}{0.5\textwidth} \begin{itemize} \item<2-> … \end{itemize} \end{column}
    \begin{column}{0.5\textwidth} \begin{alertblock}{Careful} … \end{alertblock} \end{column}
  \end{columns}
\end{frame}
\end{document}
```

| Supported | Notes |
|---|---|
| `frame` with `[plain]`, `[t]`, `[b]`, `{title}{subtitle}`; `\frametitle`, `\framesubtitle` | `fragile` is accepted and not needed |
| `\titlepage` / `\maketitle`, `\frame{\titlepage}` | from `\title`, `\subtitle`, `\author`, `\institute`, `\date` |
| `\tableofcontents` | lists the `\section`s placed between frames |
| `block`, `alertblock`, `exampleblock`; `columns`, `column` | usable in articles too |
| `\alert`, `\structure` | `\note` is dropped |
| `\pause`, `<…>` overlay specs, `\only`, `\uncover`, `\visible`, `\onslide` | every step is shown at once |
| `aspectratio=169` / `43` / `1610` / `1` / … or `W:H` | beamer's slide sizes; 4:3 by default |
| `\usetheme`, `\setbeamertemplate`, … | ignored: the look comes from the page's CSS |

## Ignored on purpose

These produce nothing, but their arguments are still consumed so they don't leak into the text:

`\title` `\author` `\date` `\maketitle` `\tableofcontents` `\vspace` `\hspace` `\newpage` `\clearpage` `\pagestyle` `\setlength` `\setcounter` `\bibliographystyle` `\bibliography` `\printbibliography` `\addbibresource` `\input` `\include` `\hypersetup` `\geometry` `\captionsetup` `\lstset` `\newenvironment` `\index` `\phantom` and float placement options such as `[htbp]`.
