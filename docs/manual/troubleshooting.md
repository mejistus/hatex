# Limitations and troubleshooting

## Limitations

HaTeX renders the LaTeX that articles, notes and talks use. It is not a TeX engine, and these are deliberate limits:

**Document**

- There is no page layout. `\vspace`, `\newpage`, float placement and `\pagestyle` are ignored, and floats stay where they are in the source.
- The title block is dropped in articles: `\title`, `\author`, `\date` and `\maketitle` produce nothing. Put the title in your HTML.
- One file per document. `\input` and `\include` are ignored.
- Definitions (`\newcommand`, `\newtheorem`, …) apply to the whole document, even before the line that defines them.
- An optional default in `\newcommand{\x}[2][d]{…}` is read but not used, and `\def` doesn't take parameters.
- `\newenvironment` is ignored, so custom environments render as their content.
- `enumerate` labels are always 1., a., i., A. by level, and `\appendix` doesn't switch sections to letters.
- `\vskip` and `\kern` are removed, but the dimension after them (`2mm`) is not, and shows up as text. Use `\vspace{…}`, which is fully ignored.

**Maths**

- Maths is whatever KaTeX supports; `siunitx`, `physics` and similar packages are not available.
- Equations are numbered through the whole document; `\numberwithin` isn't supported.
- A row with `\tag{…}` still uses up an equation number, and `\ref` to its label gives that number, not the tag.

**Floats, tables and theorems**

- Column widths (`p{3cm}`, `X`), `\arraystretch` and `\tabcolsep` are ignored.
- `\multirow` can't wrap `\multicolumn` (the other way round works).
- Theorem numbers are global, and `\newtheorem{…}{…}[section]` numbers globally too.
- `\begin{proof}[Title]` adds "(Title)" after "Proof" instead of replacing it.

**Bibliography**

- BibTeX files aren't read: write `thebibliography`, using `HaTeX.Bib` to generate the entries.
- Citations are always numeric, in the order of the `\bibitem`s.

**Layout**

- `\onecolumn` doesn't end two-column mode, and the optional argument of `\twocolumn[…]` is dropped.
- Beamer overlays are flattened: every step is shown at once.
- Text between frames is added to the frame before it.

**TikZ**

- Text in pictures must be ASCII.
- Pictures are compiled with only TikZ, their libraries, pgfplots, tikz-cd and amsmath; other packages aren't available.

**Security**

- The output is meant for trusted sources. `\href` is limited to safe URL schemes, but HaTeX is not a sanitiser; see [Security](node.md#security).

## Troubleshooting

### Maths shows up as LaTeX code

KaTeX wasn't available when the document was parsed. Load `katex.min.js` before calling `render`, or pass it in with `HaTeX.use({ katex })` in Node or a bundler.

### Maths is typeset but looks wrong (boxes, wrong sizes, overlapping)

`katex.min.css` is missing, or its version doesn't match `katex.min.js`. Load both from the same version.

### Nothing renders, or the console says fetch failed

Browsers don't let pages opened as `file://` fetch other files. Serve the folder over HTTP: `npm start` in the HaTeX repository, or `npx serve`, or `python3 -m http.server`.

### Stray words appear in the text

A command that HaTeX doesn't know degraded to its argument text: for example, `\numberwithin{equation}{section}` shows "equationsection", and `\usetheme{Madrid}` in a slide body shows "Madrid". Move such commands to the preamble (before `\begin{document}`), where they are ignored, or remove them. [How HaTeX reads a document](documents.md#the-rule-for-unknown-input) explains the rule.

### A reference shows `??`

The label doesn't exist, is misspelt, or belongs to something unnumbered (a starred section, or a float without a `\caption`). `HaTeX.lint` reports the first two.

### A space is missing after a command

TeX drops the spaces after a control word, and so does HaTeX: `\LaTeX is` gives "LaTeXis". Write `\LaTeX{} is` or `\LaTeX\ is`.

### The captions are in Chinese, but the document is in English

The source contains a CJK character somewhere, perhaps in a comment or a name. Any CJK character switches the labels to Chinese ([Chinese documents](documents.md#chinese-documents)).

### Code isn't highlighted

- Prism, or the component for that language, wasn't loaded before `render`.
- The language name isn't a Prism id or alias. Check `Object.keys(Prism.languages)` in the console.
- `verbatim` is never highlighted; use `lstlisting` or `minted`.

### Code colours look wrong or clash

A Prism theme stylesheet is loaded. Remove it; `hatex.css` colours the tokens itself.

### An image doesn't appear

- The path is relative to the page, not to the `.tex` file.
- The extension is missing: write `plot.png`, not `plot`.
- It's a PDF, which `<img>` can't show. Convert it to SVG or PNG.

### TikZ pictures stay at "Compiling with TeX…"

- The picture has an error. Render with `tikzErrors: true` to see TeX's message.
- It contains non-ASCII text (`HaTeX.lint` warns about this).
- TikZJax can't be loaded: check the network tab for `tikzjax.js`. It comes from `cdn.jsdelivr.net` unless you set `tikzjaxBase`. A Content Security Policy must allow that script and WebAssembly (`'wasm-unsafe-eval'`).
- Pictures compile one at a time, and a large pgfplots picture can take 10 s or more. The label says how many are queued.

### The console shows 404s for `tikz/xxxxxxxx.svg`

That is the lookup for pre-rendered pictures, which you haven't saved. Either pre-render them ([TikZ](tikz.md#pre-rendering)), or pass `tikzSvgBase: null` to skip the lookup.

### A pre-rendered SVG isn't used

- The picture's hash changed: you edited it, or added a `\tikzset` or `\pgfplotsset` anywhere in the document, or changed a colour or macro it uses. Compare `data-tikz-hash` on the box with the file name. See [What changes a picture's hash](tikz.md#what-changes-a-pictures-hash).
- `tikzSvgBase` is wrong or lacks its trailing slash. It is relative to the page.
- The server answers with an HTML page instead of the SVG (e.g. an SPA fallback). HaTeX only accepts a response that starts with `<svg`.

### Two columns don't appear

- The container is narrower than 50rem (32rem for `multicols`). That is intended, so that phones get one column.
- `enhance` (or `render`) was never called on this HTML; pre-rendered HTML without `hatex.js` stays in one column.
- The container's width changed without a window resize. Call `HaTeX.layout(root)`.

### The columns are unbalanced after images load

Images without a known size change height when they load. Give them a `width` in LaTeX, or call `HaTeX.layout(root)` when they have loaded. TikZ pictures re-run the layout by themselves.

### Slides are small, or not as wide as the page

A slide is never taller than the space it is shown in: the nearest scrolling ancestor, or the window. In a short preview pane, the slides are narrow so that each one fits. That is intended. Make the pane taller, or present full screen.

### The styles leak into or from my site

All of hatex's rules are scoped to `.hatex`, and slides use classed `div`s rather than `header`/`footer`/`section`, so element styles on your site don't reach them. Your site's generic rules for `p`, `a`, `table`, `pre` or `img` do apply inside `.hatex`, as to any HTML. If one of them clashes, override it with a `.hatex …` rule, or reset it.

### Inline styles are blocked by the Content Security Policy

The output uses `style` attributes for widths, colours and scaling. A policy without `style-src 'unsafe-inline'` blocks them, which breaks image widths, colours and slide scaling.

---
Previous: [Checking sources](checking.md) · [Contents](README.md) · Next: [Developing HaTeX](development.md)
