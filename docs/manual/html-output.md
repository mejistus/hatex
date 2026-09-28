# The HTML output

This chapter lists the HTML that `parse` produces and the elements that `enhance` adds, for styling and scripting. Classes that start with `latex-` come from the core renderer, and those that start with `hatex-` come from the extensions (columns, slides, vertical text) and the runtime.

The output is a sequence of block elements, meant to go inside an element with the class `hatex`. It has no `<html>`, `<head>` or `<body>`, and no wrapper of its own, except in [two-column documents](#columns) and [decks](#slides).

## Ids

Element ids have the form `<prefix>-<label>`, where the prefix is random for each `parse` call (`tex` and six characters, e.g. `tex3k9f2a`):

| Target | Id |
|---|---|
| Something with `\label{key}` | `tex3k9f2a-key` |
| Bibliography entry `\bibitem{key}` | `tex3k9f2a-bib-key` |
| Footnote *n* | `tex3k9f2a-fn<n>` |
| Footnote mark *n* | `tex3k9f2a-fnref<n>` |

## Text and structure

| LaTeX | HTML |
|---|---|
| Paragraph | `<p data-line>` |
| `\section`, `\part`, `\chapter` | `<h2>`; `\subsection` `<h3>`; `\subsubsection` `<h4>` |
| Section number | `<span class="latex-secnum">` inside the heading |
| `\paragraph{…}` | `<strong class="latex-paragraph">` at the start of the paragraph |
| `abstract` | `<div class="latex-abstract">` with `<p class="latex-abstract-title">` |
| `itemize`, `enumerate`, `description` | `<ul class="latex-list">`, `<ol class="latex-list" type="1\|a\|i\|A">`, `<dl class="latex-list">` |
| `\item[label]` | `<li class="latex-custom-label">` with `<span class="latex-item-label">` |
| `quote`, `quotation`, `verse` | `<blockquote class="latex-quote">` |
| `center`, `flushright` | `<div class="latex-center">`, `<div class="latex-right">` |
| `minipage` | `<div class="latex-minipage" style="width:…">` |
| `\hrule`, `\rule` | `<hr class="latex-rule">` |
| `\textbf`, `\emph`, `\underline`, `\sout`, `\hl` | `<strong>`, `<em>`, `<u>`, `<s>`, `<mark>` |
| `\texttt` | `<code class="latex-tt">` |
| `\textsc`, `\textsf` | `<span class="latex-sc">`, `<span class="latex-sf">` |
| `\fbox` | `<span class="latex-fbox">` |
| `\textcolor` | `<span class="latex-color" style="--author-color:…">` |
| `\colorbox` | `<span class="latex-colorbox" style="background:…">` |
| Size commands | `<span style="font-size:…em">` |
| `\href`, `\url` | `<a href>`; `\url` adds `class="latex-url"` |
| `\TeX`, `\LaTeX` | `<span class="latex-logo">` |
| Source-line marker | `<span class="latex-line" data-line="n"></span>` (empty) |

## Maths

| LaTeX | HTML |
|---|---|
| Inline and display maths | KaTeX's `<span class="katex" role="math" aria-label="…">`; display maths is inside `<span class="katex-display">` |
| `\label` in an equation | `<span class="latex-anchor" id="…"></span>` directly before the display |
| Maths without KaTeX | `<code>` with the source |

## Floats and images

| LaTeX | HTML |
|---|---|
| `figure`, `table`, `algorithm` | `<figure class="latex-float latex-float-figure">` (or `-table`, `-algorithm`) |
| `\caption` | `<figcaption>` with `<span class="latex-cap-label">Figure 1:</span>` |
| `subfigure`, `subtable`, captioned `minipage` | `<figure class="latex-subfloat" style="width:…">` |
| `\includegraphics` | `<img class="latex-img" loading="lazy" alt="file.png">` |
| `\resizebox`, `adjustbox` | `<div class="latex-fit"><div>…</div></div>`; the runtime sets `zoom` on the inner `div` |

## Tables

```html
<div class="latex-table-wrap">
  <table class="latex-table">
    <thead><tr class="rule-top rule-heavy"><th>…</th></tr></thead>
    <tbody><tr class="rule-top"><td class="a-center vl">…</td></tr></tbody>
  </table>
</div>
```

| Class | Meaning |
|---|---|
| `rule-top`, `rule-bottom` | A rule above or below the row |
| `rule-heavy` | The rule is `\toprule`, `\bottomrule` or `\specialrule` |
| `rule-double` | Two rules (`\hline\hline`) |
| `cline`, `cl-l`, `cl-r` | A partial rule above this cell, trimmed on the left or right |
| `vl`, `vr` | A vertical rule on the left or right of the cell |
| `a-center`, `a-right` | Alignment |

`\rowcolor` and `\cellcolor` become inline `background-color` styles on the `<tr>` or cell.

## TikZ

```html
<div class="latex-tikz" data-tikz-hash="751aa11b" data-tikz-state="static">
  <svg>…</svg>
</div>
```

Before it is enhanced, the box holds `<script type="text/x-tikz">` with the code. While compiling, it holds `<div class="latex-tikz-status">`, and after a failure `<div class="latex-tikz-error">`. The states are listed in [TikZ](tikz.md#picture-states).

## Theorems and algorithms

| LaTeX | HTML |
|---|---|
| Theorem-like environment | `<div class="latex-theorem latex-thm">` |
| `proof` | `<div class="latex-theorem latex-proof">` |
| Head ("Theorem 1 (Note).") | `<span class="latex-thm-head">` with `<span class="latex-thm-note">` |
| ∎ | `<span class="latex-qed">` |
| `algorithmic` | `<div class="latex-alg">` (plus `numbered`) |
| Each line | `<div class="latex-alg-line" style="padding-left:…em">` with `<span class="latex-alg-num">` |
| Keywords, comments | `<span class="latex-alg-kw">`, `<span class="latex-alg-comment">` |

## Code

| LaTeX | HTML |
|---|---|
| Code block | `<pre class="language-x"><code class="language-x">`, with Prism's `<span class="token …">` inside |
| Inline code | `<code>` |
| Copy button (runtime) | `<button class="hatex-copy">` inside the `<pre>` |
| Code line (runtime) | `<span class="hatex-code-line" style="--hx-indent:N">` around each line of a code block, newline included; `N` is the line's indentation in characters, and a wrapped part hangs `N + 2` characters in |

## References

| LaTeX | HTML |
|---|---|
| `\ref`, `\eqref`, `\autoref`, … | `<a class="latex-ref" href="#…">` (the type word of `\autoref` is outside the link) |
| `\cite` | `<span class="latex-cite">[<a class="latex-cite-link">1</a>]</span>` |
| `thebibliography` | `<div class="latex-bib"><h2>References</h2><ol><li>` with `<span class="latex-bib-num">[1]</span>`; with natbib labels `<div class="latex-bib latex-bib-ay">` and no numbers |
| Title block (`\maketitle`) | `<div class="hatex-span hatex-titleblock">` with `.hatex-title`, `.hatex-authors` > `.hatex-author` > `.hatex-author-name` / `.hatex-author-affil`, `.hatex-affiliations`, `.hatex-date`, `.hatex-title-notes` |
| Author–year citation | `<span class="latex-cite latex-cite-ay">` around the text, with a link per key |
| `\footnote` mark | `<sup class="latex-fn-ref"><a>` |
| Footnotes | `<div class="latex-footnotes"><ol><li>…<a class="latex-fn-back">↩</a>` at the end |
| A clicked link's target (runtime) | Gets `latex-flash` for the highlight animation |

## Columns

```html
<div class="hatex-cols hatex-twocolumn">          <!-- or: hatex-cols hatex-multicols, style="--hx-cols:3" -->
  <div class="hatex-cols-flow">
    <h2>…</h2>                                     <!-- full-width items stay here -->
    <div class="hatex-cols-chunk">                 <!-- added by the runtime -->
      <div class="hatex-col">…</div>
      <div class="hatex-col">…</div>
    </div>
  </div>
</div>
```

| Class | Meaning |
|---|---|
| `hatex-span` | Wraps `figure*` and `table*`, which span all columns |
| `hatex-colbreak` | `\columnbreak` (hidden) |
| `hatex-split-before`, `hatex-split-after` | The two halves of an element split between columns |

## Blocks and columns (beamer)

| LaTeX | HTML |
|---|---|
| `block`, `alertblock`, `exampleblock` | `<div class="hatex-block plain\|alert\|example">` with `<div class="hatex-block-title">` and `<div class="hatex-block-body">` |
| `columns` | `<div class="hatex-columns">` (plus `top` for `[T]`) |
| `column` | `<div class="hatex-column" style="flex:0 1 50%">` |

## Slides

```html
<div class="hatex-deck" data-w="960" data-h="540" style="--hx-ratio:960/540">
  <div class="hatex-deck-bar">…<button class="hatex-present">Present</button></div>  <!-- runtime -->
  <div class="hatex-slide-frame">
    <div class="hatex-slide top" role="group" aria-roledescription="slide" aria-label="2 / 12" data-slide="2">
      <div class="hatex-slide-title" role="heading" aria-level="2">Title<small>Subtitle</small></div>
      <div class="hatex-slide-body"><div class="hatex-slide-content">…</div></div>
      <div class="hatex-slide-foot"><span>Author</span><span>Title</span><span>2 / 12</span></div>
    </div>
  </div>
</div>
```

| Class | Meaning |
|---|---|
| `hatex-slide` + `plain`, `top`, `bottom`, `titlepage` | The frame options and title-page slides |
| `hatex-titlepage` | The title page, with `hatex-tp-title`, `hatex-tp-subtitle`, `hatex-tp-author`, `hatex-tp-institute` and `hatex-tp-date` |
| `hatex-toc` | `\tableofcontents` |
| `hatex-presenting` | On the deck while presenting |
| `current` | On the frame being presented |

## Vertical text

| LaTeX | HTML |
|---|---|
| `guji` | `<div class="hatex-guji-wrap"><div class="hatex-guji" style="--hx-guji-chars:n">` |
| `vertical` | `<div class="hatex-vertical-wrap"><div class="hatex-vertical">` |
| 句 and 讀 marks | `<span class="hatex-ju">。</span>`, `<span class="hatex-dou">，</span>` |
| `\jiazhu` | `<span class="hatex-jiazhu">`; in `guji`, the runtime may split it into several spans with the same `data-jz` |

## Added by the runtime

| Element or class | Where |
|---|---|
| `hatex` | On the root |
| `data-hatex-tikz-errors` | On the root, with `tikzErrors: true` |
| `hatex-zoomable` | On images and TikZ SVGs that open in the zoom overlay |
| `<div class="hatex-zoom">` | The overlay, appended to `<body>` (outside `.hatex`) while it is open |

---
Previous: [Theming](theming.md) · [Contents](README.md) · Next: [Node, bundlers and static sites](node.md)
