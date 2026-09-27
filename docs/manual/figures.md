# Figures and images

## Images

```latex
\includegraphics[width=0.6\linewidth]{assets/plot.png}
```

`\includegraphics` becomes an `<img>` with `loading="lazy"`, and its `alt` text is the file name. The options are:

| Option | Result |
|---|---|
| `width=0.6\linewidth` (also `\textwidth`, `\columnwidth`, `\hsize`) | `width: 60%` of the containing block |
| `width=5cm` (`cm`, `mm`, `in`, `pt`, `em`, `px`) | That width |
| `height=3cm` | That height |
| `scale=0.5` | `width: 50%`, if there is no `width`. The largest is 100%. |
| Anything else (`angle`, `trim`, `clip`, `keepaspectratio`, `page`) | Ignored |

Without options, an image is shown at its natural size, but never wider than its container.

**Paths are relative to the page, not to the `.tex` file.** HaTeX doesn't know where the source came from. If the page is `/posts/a.html` and it fetches `/posts/src/a.tex`, then `\includegraphics{fig.png}` loads `/posts/fig.png`. Absolute URLs (`https://…`) and `data:` URIs work too.

**Write the file extension.** `\includegraphics{plot}` requests a file called `plot`, because a browser can't try `.pdf`, `.png` and `.jpg` in turn as LaTeX does. PDF images don't display in `<img>`, so convert them to SVG or PNG.

`HaTeX.images(source)` lists the local image paths in a source, so a build step can check that they exist; see [Checking sources](checking.md#images).

Clicking an image opens it full-size in an overlay, and a click or Esc closes it. The `zoom: false` [option](api.md#options) turns this off.

## Figures

```latex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.6\linewidth]{assets/plot.png}
  \caption{Training loss.}\label{fig:loss}
\end{figure}
```

- A float becomes a `<figure>` with centred content, and its caption becomes a `<figcaption>`.
- **It is numbered only if it has a `\caption`.** Figures, tables and algorithms each have their own counter ("Figure 1", "Table 1", "Algorithm 1").
- The caption appears where you wrote it, above or below the content.
- `\caption[short]{…}` and `\caption*{…}` are accepted; both show the long caption with a number.
- `\label` inside the float, before or after the caption, makes the float the target of `\ref`.
- The placement (`[htbp]`, `[H]`) is dropped. Floats stay exactly where they are in the source: a web page has no pages to float them to.
- `wrapfigure` (with its `{r}{0.4\textwidth}` arguments) is rendered as an ordinary figure. Text doesn't flow around it.
- `figure*` is the same as `figure`, except that in a [two-column layout](columns.md) it spans both columns.

A figure can hold anything: images, [TikZ pictures](tikz.md), tables, code, several of them side by side.

## Sub-figures

```latex
\begin{figure}
  \centering
  \begin{subfigure}[b]{0.45\linewidth}
    \includegraphics[width=\linewidth]{a.png}
    \caption{Before}\label{fig:before}
  \end{subfigure}
  \hfill
  \begin{subfigure}[b]{0.45\linewidth}
    \includegraphics[width=\linewidth]{b.png}
    \caption{After}\label{fig:after}
  \end{subfigure}
  \caption{Before and after.}\label{fig:both}
\end{figure}
```

- `subfigure` and `subtable` get the captions (a), (b), (c), … in order within their float.
- `\ref{fig:after}` gives "1b", and `\ref{fig:both}` gives "1". `\autoref{fig:after}` gives "Figure 1b".
- The width argument sets the sub-figure's width, e.g. `0.45\linewidth` gives 45%. The position option (`[b]`, `[t]`) is dropped, and sub-figures are aligned at the top.
- Sub-figures sit side by side while they fit, and wrap otherwise. `\hfill` and `\quad` between them are dropped. The space between them is fixed by the stylesheet.

## Minipages

```latex
\begin{figure}
  \begin{minipage}{0.48\linewidth}
    \includegraphics[width=\linewidth]{a.png}
    \caption{First}\label{fig:first}
  \end{minipage}\hfill
  \begin{minipage}{0.48\linewidth}
    \includegraphics[width=\linewidth]{b.png}
    \caption{Second}\label{fig:second}
  \end{minipage}
\end{figure}
```

- A **captioned `minipage` inside a float** is a float of its own, as in LaTeX: the example gives "Figure 1" and "Figure 2" side by side. The outer figure needs no caption.
- A `minipage` **without a caption**, inside or outside a float, is just a box of the given width. Two minipages side by side are an easy way to put an image next to a table.
- Widths are read as for sub-figures: `0.48\linewidth` gives 48%, `5cm` gives 5cm.

## Floats in slides and columns

In [slides](slides.md), floats have smaller margins and captions, and their content is scaled with the slide. In [two columns](columns.md), a `figure` stays in its column and its pictures shrink to the column width, while `figure*` spans the page.

---
Previous: [Tables](tables.md) · [Contents](README.md) · Next: [TikZ](tikz.md)
