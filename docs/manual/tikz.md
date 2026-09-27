# TikZ

HaTeX doesn't reimplement TikZ. Each picture is compiled by real TeX: [TikZJax](https://github.com/drgrice1/tikzjax) runs TeX in WebAssembly in the browser and produces an SVG. Because compiling is slow, HaTeX can instead load the SVG from a file that you saved earlier, so readers never wait.

```latex
\usetikzlibrary{arrows.meta,positioning}
\begin{figure}
  \centering
  \begin{tikzpicture}[node distance=15mm]
    \node[draw] (a) {A};
    \node[draw, right=of a] (b) {B};
    \draw[-Stealth] (a) -- node[above] {$f$} (b);
  \end{tikzpicture}
  \caption{A map.}\label{fig:ab}
\end{figure}
```

## What is supported

- `tikzpicture` and `tikzcd` (commutative diagrams, with the `tikz-cd` package loaded for you);
- pgfplots: `axis`, `semilogxaxis`, `semilogyaxis`, `loglogaxis` and `polaraxis`, and `\addplot`, with the `pgfplots` package loaded for you;
- any TikZ library, declared with `\usetikzlibrary` or detected from the code;
- `\tikzset`, `\tikzstyle`, `\pgfplotsset` and `\usepgfplotslibrary` from the document;
- your `\definecolor` colours and `\newcommand` macros;
- maths in labels: `node {$x_t$}`;
- the built-in [neural-network styles](#neural-network-diagrams).

## How a picture gets on the page

When parsing, each picture becomes

```html
<div class="latex-tikz" data-tikz-hash="751aa11b">
  <script type="text/x-tikz" data-tikz-libraries="…" data-tex-packages="…" data-add-to-preamble="…">
    \begin{tikzpicture} … \end{tikzpicture}
  </script>
</div>
```

The script is inert: browsers don't run a script of an unknown type. The hash is a 32-bit FNV-1a hash of the picture's code together with its libraries, packages and preamble, written as 8 hex digits. It changes only when something that affects the drawing changes.

When the page is enhanced (`render` or `enhance`), the runtime tries these for each picture, in order:

1. **This session's cache.** A picture compiled earlier on the same page (e.g. before an editor re-rendered) is put back at once. Re-rendering never compiles the same picture twice.
2. **A pre-rendered file** at `<tikzSvgBase><hash>.svg`, by default `tikz/<hash>.svg` relative to the page. A response counts only if it is OK and starts with `<svg`, and a missing file is remembered, so it isn't requested again.
3. **Compiling live** with TikZJax, if `tikzLive` is true (the default). The TikZJax script (about 6 MB on first use, then cached by the browser) is loaded the first time it is needed. Pictures compile one at a time and take 1–10 s each, and a label under each one says "Compiling with TeX… 2 of 5".

If none of these works (no file and `tikzLive: false`), the box stays empty with `data-tikz-state="missing"`.

### Picture states

The box's `data-tikz-state` attribute says where a picture is, which is useful for styling or tests:

| State | Meaning |
|---|---|
| `loading` | Looking for an SVG |
| `static` | Shown from a pre-rendered file or the session cache |
| `live` | Waiting for or being compiled by TikZJax |
| `compiled` | Compiled live in this session |
| `failed` | TeX reported an error (only with `tikzErrors: true`) |
| `missing` | No SVG and live compiling is off |

## Pre-rendering

Compile once while writing, save the SVGs next to the page, and readers only download small files:

1. Open the page with live compiling and without looking up files: `HaTeX.render(el, source, { tikzSvgBase: null })`. [`examples/editor.html`](../../examples/editor.html) does this, and so does [`examples/tikz.html?live`](../../examples/tikz.html).
2. When the pictures have compiled, call `HaTeX.tikzSvgs(el)`. It returns `[{ hash, file, svg }]` for every picture in `el` that was compiled in this session, where `file` is `<hash>.svg`. Save each `svg` under that name in your `tikz/` folder. The editor example shows them as download links:

   ```js
   HaTeX.tikzSvgs(out).forEach(({ file, svg }) => {
     const a = document.createElement('a');
     a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
     a.download = file;
     a.textContent = file;
     document.body.append(a);
   });
   ```

3. Deploy the page with its `tikz/` folder. Readers get `tikz/<hash>.svg`, and TikZJax is never loaded for them.

The `hatex:tikz` event fires on each picture's box when it compiles (see [Events](api.md#events)), so you can collect the files as they come in.

When you edit a picture, its hash changes, so the page compiles it live again until you save the new SVG. The old file is simply no longer requested and can be deleted.

### What changes a picture's hash

- its code, including the options on `\begin{tikzpicture}[…]`;
- the libraries it gets: those declared with `\usetikzlibrary` before it in the document, plus those detected in its code;
- the packages it gets (`pgfplots`, `tikz-cd`, `amsmath`);
- the preamble it gets: every `\tikzset`, `\tikzstyle`, `\pgfplotsset` and `\usepgfplotslibrary` in the document, and the `\definecolor` and `\newcommand` definitions of the colours and macros that it mentions.

So adding a `\definecolor` for a colour that a picture doesn't use doesn't invalidate its SVG, but adding a `\tikzset` anywhere invalidates all of them. A `\usetikzlibrary` applies only to the pictures after it, as in LaTeX, so adding one near the end of a document doesn't change the pictures above it.

### Where the files live

`tikzSvgBase` is a URL prefix, and the file name is appended to it directly:

```js
HaTeX.render(el, tex, { tikzSvgBase: '/static/tikz/' });   // → /static/tikz/751aa11b.svg
HaTeX.render(el, tex, { tikzSvgBase: 'https://cdn.example.com/p/' });
HaTeX.render(el, tex, { tikzSvgBase: null });              // never look for files
```

Remember the trailing slash. Saved SVGs are exactly what TeX produced. On screen, HaTeX adds 1pt of room around the drawing (TikZJax's box cuts off the outer half of lines along its edges) and draws every line 0.2pt heavier, so that TeX's 0.4pt default lines don't vanish between pixel rows. Text is left alone.

## Libraries

`\usetikzlibrary{…}` anywhere in the document applies to the pictures after it. You rarely need it, because HaTeX detects the libraries that a picture obviously uses:

| Library | Detected from |
|---|---|
| `positioning` | `right=of a`, `above left=`, `node distance`, `pin`, `label distance` |
| `arrows.meta` | `-{…}`, `Stealth`, `Latex[…]`, `To[…]`, `Circle]`, `Bar]`, `Square]` |
| `calc` | `($…$)` coordinate calculations, `let \p`, `\pgfextra` |
| `fit` | `fit=` |
| `backgrounds` | `on background layer`, `background rectangle`, `show background` |
| `shapes.geometric` | `ellipse`, `diamond`, `trapezium`, `regular polygon`, `star`, `cylinder`, `semicircle`, `kite`, `dart` |
| `shapes.misc` | `rounded rectangle`, `cross out`, `strike out`, `chamfered rectangle` |
| `shapes.symbols` | `cloud`, `starburst`, `signal`, `tape`, `magnifying glass` |
| `shapes.multipart` | `rectangle split` |
| `shapes.arrows` | `single arrow`, `double arrow`, `arrow box` |
| `shapes.callouts` | `callout` |
| `chains` | `start chain`, `on chain`, `join=` |
| `matrix` | `\matrix`, `matrix of nodes` |
| `decorations.pathreplacing` | `decoration=brace`, `mirror`, `bracket`, `decorate` |
| `decorations.pathmorphing` | `decoration=snake`, `coil`, `zigzag`, `bumps`, `random steps`, `wave` |
| `decorations.markings` | `decoration=markings`, `text along path` |
| `patterns` | `pattern=` |
| `intersections` | `name path`, `name intersections` |
| `3d` | `canvas is …`, `plane origin` |
| `shadows` | `drop shadow`, `copy shadow` |
| `spy` | `spy using`, `spy scope` |
| `quotes` | `edge node`, `to["label"]` |
| `math` | `\tikzmath`, `evaluate=` |
| `mindmap` | `mindmap`, `concept` |
| `trees` | `folder`, `grow via three points` |
| `datavisualization` | `barchart`, `datavisualization` |

Loading a library that isn't needed does no harm, so detection errs on the side of loading.

## Packages

| Package | Added when |
|---|---|
| `tikz-cd` | The picture is a `tikzcd` |
| `pgfplots` | The picture has an `axis` environment or `\addplot`, or the document has any `\pgfplotsset` or `\usepgfplotslibrary` |
| `amsmath`, `amssymb` | The picture (or its preamble) uses `\mathbb`, `\mathfrak`, `\text`, `\operatorname`, `\boldsymbol`, `align`, `pmatrix`, `bmatrix` or `cases` |

Other packages can't be added.

## What a picture can see

A picture is compiled on its own, not as part of your document. It gets:

- the colours from `\definecolor` that it mentions by name;
- the macros from `\newcommand`, `\renewcommand`, `\providecommand` and `\def` that it uses. `\DeclareMathOperator` operators are not passed; write `\operatorname{…}` in pictures instead;
- every `\tikzset`, `\tikzstyle`, `\pgfplotsset` and `\usepgfplotslibrary` in the document.

It doesn't see the rest of your preamble, `\usepackage` lines included.

## Rules for picture text

- **Text in a picture must be ASCII.** TikZJax runs plain TeX with Computer Modern fonts, which have no CJK glyphs, and a non-ASCII character stops the compile. `HaTeX.lint` warns about any non-ASCII character in a picture. To label a picture in Chinese, put the text in the caption, or draw the picture elsewhere and include it as an image.
- Maths in labels works: `node {$\nabla_\theta L$}`.
- `\\` in a node needs `align=center` (or `left`/`right`) on the node, as in TikZ. The `nn` style sets it for every node.
- The fonts are TeX's, not the page's. HaTeX shows pictures 1.2× larger than their TeX size, so that a 10pt label matches the body text, and 1.8× on slides.

## Errors

TikZ errors don't reach the page by default: a picture that fails to compile just keeps its "Compiling…" label. While writing, pass `tikzErrors: true`:

```js
HaTeX.render(el, tex, { tikzSvgBase: null, tikzErrors: true });
el.addEventListener('hatex:tikz-error', e => console.warn(e.detail.hash, e.detail.message));
```

The failed picture is then replaced by "TikZ: " followed by TeX's first error line (e.g. `Undefined control sequence`), its state becomes `failed`, and a `hatex:tikz-error` event fires. This works by listening to the console, where TikZJax prints TeX's log, so it wraps `console.log`, `console.warn` and `console.error`. Keep it for editors and leave it off on published pages.

## Dark mode

TikZ drawings are black ink on transparent paper. In [dark mode](theming.md#dark-mode) they are inverted in lightness with their hues kept (`--hx-tikz-filter: invert(0.9) hue-rotate(180deg)`), so black lines become light while red stays red. To show them on a light sheet instead:

```css
[data-theme="dark"] .hatex {
  --hx-tikz-filter: none;
  --hx-tikz-sheet: #fff;
  --hx-tikz-sheet-pad: 0.75rem;
}
```

## Self-hosting TikZJax

By default, TikZJax comes from `https://cdn.jsdelivr.net/npm/@drgrice1/tikzjax@1.0.0-beta24/dist/`. To serve it yourself, copy that `dist/` folder and point `tikzjaxBase` at it (with the trailing slash):

```js
HaTeX.render(el, tex, { tikzjaxBase: '/vendor/tikzjax/' });
```

HaTeX loads `<tikzjaxBase>tikzjax.js` for live compiling, and `<tikzjaxBase>fonts.css` whenever a picture is shown, pre-rendered ones included, because the SVGs use TeX's fonts for their text. TikZJax is GPL-3.0-or-later; it is loaded at runtime and not bundled into hatex.

## Neural-network diagrams

HaTeX ships TikZ styles for drawing network architectures. Using any `nn…` style, or the `nn` picture option, adds their definitions and the libraries they need to the picture. Writing `\usennstyles` anywhere in a picture does the same without using a style.

```latex
\begin{tikzpicture}[nn]
  \node[nndata] (x) {Image};
  \node[nnconv, right=of x] (c) {Conv 3x3\\64};
  \node[nnpool, right=of c] (p) {Max pool};
  \node[nnfc, right=of p] (f) {FC};
  \node[nnloss, right=of f] (l) {Loss};
  \draw[nnflow] (x) -- (c);
  \draw[nnflow] (c) -- (p);
  \draw[nnflow] (p) -- (f);
  \draw[nnflow] (f) -- (l);
  \draw[nnskip] (c.north) to[out=30, in=150] (f.north);
  \node[nngroup, fit=(c)(p)] {};
  \draw[nnbrace] (c.south east) -- (c.south west) node[midway, below=3pt, nnlabel] {encoder};
\end{tikzpicture}
```

### Picture style

| Style | Effect |
|---|---|
| `nn` | `font=\small`, `node distance=8mm and 10mm`, and centred multi-line text in every node |

### Layers

Each layer is a rounded box, filled with a light tint of its colour and outlined in a darker shade.

| Style | Colour | Minimum width |
|---|---|---|
| `nnconv` | sage `#8AAA8C` | 16mm |
| `nnpool` | terracotta `#C47C5A` | 14mm |
| `nnfc` | slate blue `#6E8CA8` | 16mm |
| `nnact` | ochre `#C9A227` | 12mm |
| `nnnorm` | mauve `#9B8AA6` | 14mm |
| `nnattn` | teal `#4F8A8B` | 18mm |
| `nnembed` | tan `#B0836A` | 16mm |
| `nnout` | green `#7A9E7E` | 16mm |
| `nnloss` | red `#B3524B` | 14mm |
| `nndata` | grey `#8A8278` | A trapezium, 14mm |
| `nnsum` | | A 5mm circle for `+` or `×` |

`nnbox={colour}{width}` is the style behind them, for a layer type of your own: `\node[nnbox={teal}{20mm}] {Mixer};`. The colours are defined as `nnconvc`, `nnpoolc`, `nnencc`, … (the style name plus `c`), and can be used elsewhere in the picture.

### Encoders, decoders and feature vectors

| Style | Colour | Shape |
|---|---|---|
| `nnenc` | steel blue `#5F80A6` | A trapezium that narrows along a left-to-right flow (an encoder), 16mm × 14mm |
| `nndec` | dusty rose `#A6707F` | A trapezium that widens along the flow (a decoder) |
| `nnfeat` | amber `#D29A4A` | A feature vector: a 6mm × 18mm column of 5 cells, alternately shaded |

- For a flow from top to bottom, turn the trapezia: `\node[nnenc, shape border rotate=180]` and `\node[nndec, shape border rotate=0]`.
- `nnfeat=7` draws seven cells. The count must be at least 2, and an odd count keeps a label such as `$z$` inside one cell.
- `nncodec=colour` is the style behind `nnenc` and `nndec`, for a trapezium in another colour (add a `shape border rotate` to point it).

```latex
\begin{tikzpicture}[nn]
  \node[nndata] (x) {x};
  \node[nnenc, right=of x] (e) {Encoder};
  \node[nnfeat, right=of e] (z) {$z$};
  \node[nndec, right=of z] (d) {Decoder};
  \node[nnout, right=of d] (y) {$\hat x$};
  \draw[nnflow] (x) -- (e);
  \draw[nnflow] (e) -- (z);
  \draw[nnflow] (z) -- (d);
  \draw[nnflow] (d) -- (y);
\end{tikzpicture}
```

### Arrows

| Style | Effect |
|---|---|
| `nnflow` | A thick grey arrow with a Stealth tip |
| `nnskip` | The same, dashed with rounded corners, for residual connections |
| `nnback` | A dashed red arrow, for gradients |

### Grouping and labels

| Style | Effect |
|---|---|
| `nngroup` | A dashed rounded frame; use with `fit=(a)(b)` |
| `nngrouplabel` | Small italic grey text, for naming a group |
| `nnbrace` | A brace along a path |
| `nnlabel` | Small grey text, for annotating arrows |

### Feature maps

`nnfeatmap` is a pic that draws a 3-D block:

```latex
\pic at (0,0) {nnfeatmap={w=1.2, h=2, d=0.5, fill=nnconvc, label=64}};
```

| Key | Default | Meaning |
|---|---|---|
| `w` | 1.2 | Width of the front face |
| `h` | 2 | Height of the front face |
| `d` | 0.5 | Depth |
| `fill` | `nnconvc` | Colour |
| `label` | empty | Text under the block |

The definitions are in [`src/tikz-nn.js`](../../src/tikz-nn.js).

---
Previous: [Figures and images](figures.md) · [Contents](README.md) · Next: [Theorems, proofs and algorithms](theorems.md)
