# Slides

A source with `\documentclass{beamer}`, or with any `frame` environment, renders as a slide deck: a column of slides on the page, with a **Present** button that shows them full screen.

```latex
\documentclass[aspectratio=169]{beamer}
\title[Short title]{A talk}
\subtitle{With a subtitle}
\author[A. Author]{Ann Author \and Bo Author}
\institute{Some University}
\date{\today}

\begin{document}
\begin{frame}
  \titlepage
\end{frame}

\begin{frame}{Outline}
  \tableofcontents
\end{frame}

\section{Motivation}
\begin{frame}[t]{Why}{A subtitle}
  \begin{columns}[T]
    \begin{column}{0.5\textwidth}
      \begin{itemize}
        \item<1-> First point
        \item<2-> Second point
      \end{itemize}
    \end{column}
    \begin{column}{0.5\textwidth}
      \begin{alertblock}{Careful}
        $x \neq y$ in general.
      \end{alertblock}
    \end{column}
  \end{columns}
\end{frame}
\end{document}
```

## Frames

```latex
\begin{frame}[options]{Title}{Subtitle}
  …
\end{frame}
```

- The title and subtitle can also be given with `\frametitle{…}` and `\framesubtitle{…}` inside the frame. If there are several, the first one counts.
- An overlay specification right after `\begin{frame}` (`\begin{frame}<2>`) is dropped.
- A slide without a title has no title bar.

| Frame option | Effect |
|---|---|
| `plain` | No footer |
| `t` | Content at the top of the slide |
| `b` | Content at the bottom |
| (none) | Content centred vertically, as in beamer |
| `fragile` | Accepted; it isn't needed, since code works in any frame |
| `allowframebreaks`, `shrink`, `squeeze`, `label=…` | Ignored. Content that is too tall is shrunk anyway ([below](#sizes-and-scaling)). |

`\frame{\titlepage}` is short for a frame holding only the title page.

Anything between two frames other than `\section` and `\subsection` is added to the end of the frame before it. Anything before the first frame is shown above the deck, and anything after the last frame below it.

## The title page

`\titlepage` (or `\maketitle`) inside a frame shows the data from these commands, which can appear before or after `\begin{document}`:

| Command | Shown as |
|---|---|
| `\title[short]{…}` | The title, large. The short form goes in the footer. |
| `\subtitle{…}` | Below the title |
| `\author[short]{A \and B}` | The authors, with `\and` becoming a comma. The short form goes in the footer. |
| `\institute{…}` | Smaller, below the authors |
| `\date{…}` | Smaller, at the bottom. `\today` works. |

`\inst{1}` in the author or institute becomes a superscript. Title-page slides have no footer and are centred.

## Outline

`\tableofcontents` in a frame lists the `\section`s of the deck as a numbered list, using the short titles if given (`\section[Short]{Long}`). `\section` and `\subsection` are not shown anywhere else: they only feed this list. The entries are not links, and the `[currentsection]`-style options are ignored.

## Blocks

```latex
\begin{block}{Definition}      … \end{block}
\begin{alertblock}{Warning}    … \end{alertblock}
\begin{exampleblock}{Example}  … \end{exampleblock}
```

A block is a titled box. The title of `alertblock` is red (`--hx-danger`), that of `exampleblock` is green (`--hx-example`), and that of `block` is the ink colour. `\begin{block}{}` has no title bar. Blocks also work in articles.

## Columns

```latex
\begin{columns}[T]
  \begin{column}{0.6\textwidth} … \end{column}
  \begin{column}{0.4\textwidth} … \end{column}
\end{columns}
```

- The width of each `column` is taken as a fraction of the slide width: `0.6\textwidth` gives 60%. `\linewidth`, `\columnwidth` and `\paperwidth` also work. A column without a readable width shares the remaining space equally.
- `[T]` or `[t]` on `columns` aligns the columns at the top. By default they are centred vertically. The other options are ignored.
- Columns also work in articles.

## Overlays

The web version shows every step at once:

- `\pause` is removed;
- overlay specifications such as `<2->` or `<1-3>` on `\item`, `\only`, `\uncover`, `\visible`, `\invisible`, `\onslide`, `\alt`, `\temporal`, `\alert`, `\structure`, `\action`, `\textbf`, `\textit`, `\emph`, `\color`, `\textcolor`, `\includegraphics`, `\frametitle` and on the `block`, `itemize` and `enumerate` environments are removed;
- `\only{…}`, `\uncover{…}` and `\visible{…}` show their content, and `\onslide` without arguments is removed.

## Emphasis and notes

| Command | Result |
|---|---|
| `\alert{…}` | Red text (`#B3261E`) |
| `\structure{…}` | Bold |
| `\note{…}`, `\note[item]{…}` | Removed |

## Themes

`\usetheme`, `\usecolortheme`, `\usefonttheme`, `\setbeamertemplate`, `\setbeamercolor` and the like belong in the preamble, where they are ignored. The look of the slides comes from `hatex.css` and its [variables](theming.md). Written in the body, these commands would degrade to their argument text.

## Aspect ratio

`\documentclass[aspectratio=…]{beamer}` accepts all of beamer's values, and any `W:H`:

| `aspectratio=` | Ratio | Slide size |
|---|---|---|
| `43` (default) | 4:3 | 768 × 576 |
| `169` | 16:9 | 960 × 540 |
| `1610` | 16:10 | 960 × 600 |
| `149` | 14:9 | 840 × 540 |
| `141` | 1.41:1 (A4) | 891 × 630 |
| `54` | 5:4 | 750 × 600 |
| `32` | 3:2 | 810 × 540 |
| `219` | 21:9 | 1260 × 540 |
| `2013` | 20:13 | 1200 × 780 |
| `1` | 1:1 | 576 × 576 |
| `W:H`, e.g. `1:1` or `4:5` | W:H | 558 × W/H wide, 558 tall |

The sizes are beamer's own paper sizes at 6 px per mm, so text keeps the same proportion to the slide as in the PDF: a 4:3 slide has room for less text across than a 16:9 one, just as in beamer.

## Sizes and scaling

Each slide is laid out at its fixed size in pixels, with 24px body text and 34px titles, and then scaled to the width of its frame on the page. It therefore looks identical at any width, and the sizes in the stylesheet are in slide pixels.

- **A slide is never taller than the space it's shown in:** the nearest scrolling ancestor (for example an editor's preview pane) or else the window, minus the deck bar and a margin. On a wide screen the slides are narrower than the page, so that a whole slide is always visible.
- **Content taller than the slide is shrunk** to fit, down to half size. After that it is cut off at the bottom. Split the frame.
- TikZ pictures are shown 1.8× their TeX size on slides (1.2× elsewhere), so that their labels match the larger slide text.

## Footer

Each slide except the title page and `plain` frames has a footer with three parts: the author (short form if given), the title (short form if given), and the slide number as `3 / 12`.

## Presenting

Above the deck is a bar saying "12 slides · double-click one to present from it" and a **Present** button. `deckBar: false` leaves the bar out; double-clicking a slide works either way.

- **Present** starts at the first slide, and a double-click on a slide starts at that slide.
- The deck goes full screen (if the browser allows it) and shows one slide at a time, letterboxed on black, with the mouse cursor hidden.

| Key or action | Effect |
|---|---|
| → ↓ Page Down, Space, Enter | Next slide |
| ← ↑ Page Up, Backspace | Previous slide |
| Home, End | First, last slide |
| Click in the right two thirds | Next slide |
| Click in the left third | Previous slide |
| Esc, or leaving full screen | Stop presenting, and scroll to the slide you were on |

Links and buttons inside slides still work while presenting.

## Styling slides

| Variable | Default | Effect |
|---|---|---|
| `--hx-slide-bg` | `#fff` (dark: `#161616`) | Slide background |
| `--hx-ink` | | Slide text, titles |
| `--hx-muted` | | Subtitles, footer, institute and date |
| `--hx-danger` | `#b3261e` | `alertblock` title |
| `--hx-example` | `#2e7d32` | `exampleblock` title |
| `--hx-font-heading` | the body font | Slide titles and title page |

For anything else, style the classes listed in [The HTML output](html-output.md#slides), remembering that sizes inside `.hatex-slide` are in slide pixels.

---
Previous: [Two columns and multicols](columns.md) · [Contents](README.md) · Next: [Vertical Chinese](vertical-chinese.md)
