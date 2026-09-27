# Theming

Everything in `hatex.css` is scoped to elements with the class `hatex` and coloured through CSS custom properties (`--hx-*`). To restyle the output, override the variables; you rarely need to override the rules.

```css
.hatex {
  --hx-accent: #0b57d0;          /* blue links and section numbers */
  --hx-cite: #3aa35b;            /* hyperref-style green boxes around citations */
  --hx-font-body: Georgia, serif;
}
```

## The default look

The default is plain, like a LaTeX article: black on white, set in KaTeX's Computer Modern (`KaTeX_Main`, which `katex.min.css` loads), with no rules under headings. `\ref` and `\cite` show as plain numbers that are underlined on hover. The body text is `1rem` with a line height of 1.7, and headings are `1.4rem` (section), `1.15rem` (subsection) and `1rem` (subsubsection).

HaTeX doesn't set a width: the output fills its container. A comfortable measure for an article is about `46rem`; see the examples.

## Colours

| Variable | Light | Dark | Used for |
|---|---|---|---|
| `--hx-ink` | `#000` | `#eee` | Headings, rules, table text, slide text |
| `--hx-text` | `#000` | `#e6e6e6` | Paragraphs, lists, captions |
| `--hx-muted` | `#666` | `#999` | Secondary text: algorithm line numbers, comments, slide footers and subtitles |
| `--hx-accent` | `#000` | `#eee` | Links, section numbers, inline code, quote bars |
| `--hx-accent-2` | `#555` | `#bbb` | Link hover |
| `--hx-code-bg` | `#f6f6f6` | `#222` | Code blocks, inline code, block titles |
| `--hx-border` | `#ccc` | `#444` | Borders of code blocks, blocks and slides; `\hrule`; the rule above the footnotes |
| `--hx-surface` | `#fff` | `#1e1e1e` | The copy button |
| `--hx-paper` | `#fff` | `#fff` | Behind images and TikZ drawings in the zoom overlay |
| `--hx-danger` | `#b3261e` | `#e4796f` | TikZ errors, `alertblock` titles |
| `--hx-example` | `#2e7d32` | `#2e7d32` | `exampleblock` titles (not defined by default; the fallback is used) |
| `--hx-cite` | `transparent` | `transparent` | The frame around citation numbers |
| `--hx-flash` | `rgba(0,0,0,.08)` | `rgba(255,255,255,.12)` | The highlight on a clicked reference's target |
| `--hx-slide-bg` | `#fff` | `#161616` | Slide background |
| `--hx-mark-bg` | the system `Mark` colour | `#e8d98a` | `\hl` background |
| `--hx-on-highlight` | the current colour | `#1d1b19` | Text on author-chosen backgrounds (`\hl`, `\colorbox`, `\rowcolor`, `\cellcolor`) |
| `--hx-color-keep` | `100%` | `62%` | How much of an author's `\textcolor` is kept; the rest is white |
| `--hx-tikz-filter` | none | `invert(0.9) hue-rotate(180deg)` | A CSS filter on TikZ drawings |
| `--hx-tikz-sheet` | transparent | transparent | A background behind TikZ drawings |
| `--hx-tikz-sheet-pad` | `0` | `0` | Padding around TikZ drawings on that background |

## Fonts

| Variable | Default | Used for |
|---|---|---|
| `--hx-font-body` | `KaTeX_Main, "Latin Modern Roman", "Times New Roman", serif` | All text |
| `--hx-font-heading` | `var(--hx-font-body)` | Headings, slide titles, title pages |
| `--hx-font-sans` | `system-ui, -apple-system, "Segoe UI", sans-serif` | `\textsf`, the copy button |
| `--hx-font-mono` | `"JetBrains Mono", "Fira Code", ui-monospace, monospace` | Code |
| `--hx-font-guji` | Traditional-Chinese Song faces | [Vertical Chinese](vertical-chinese.md#styling) |

To use your site's font, set `--hx-font-body: inherit`. Maths always uses KaTeX's fonts, whatever the body font is.

HaTeX loads no fonts itself: `KaTeX_Main` comes from `katex.min.css`, and the others must be installed or loaded by your page. The fallbacks in each list take over otherwise.

## Code colours

Code tokens (from Prism) are coloured from these variables. The defaults are Atom's One Light, and One Dark in dark mode.

| Variable | Tokens | Light | Dark |
|---|---|---|---|
| `--hx-tok-comment` | comments | `#a0a1a7` | `#7f848e` |
| `--hx-tok-command` | functions, class names | `#4078f2` | `#61afef` |
| `--hx-tok-env` | keywords, at-rules, attribute values | `#a626a4` | `#c678dd` |
| `--hx-tok-math` | numbers, constants, booleans, properties, tags | `#0184bc` | `#56b6c2` |
| `--hx-tok-regex` | regular expressions, `important` | `#e45649` | `#e06c75` |
| `--hx-tok-punct` | punctuation | `#383a42` | `#abb2bf` |
| `--hx-tok-verbatim` | strings, characters, built-ins, selectors | `#50a14f` | `#98c379` |

Operators, variables and URLs use `--hx-ink`.

## Dark mode

Dark mode is switched with a `data-theme` attribute, on the `.hatex` element or on any ancestor, such as `<html>`:

| Attribute | Effect |
|---|---|
| `data-theme="dark"` | Dark palette |
| `data-theme="auto"` | Dark palette when the system is in dark mode (`prefers-color-scheme: dark`) |
| `data-theme="light"`, or none | Light palette |

```js
document.documentElement.dataset.theme = 'dark';
```

The dark palette does more than swap black and white, because author-chosen colours were chosen for paper:

- **`\textcolor` colours** are mixed towards white (`--hx-color-keep: 62%`), so a dark blue stays blue but becomes readable.
- **Author-chosen backgrounds** (`\hl`, `\colorbox`, `\rowcolor`, `\cellcolor`) are usually light tints, so the text on them turns dark (`--hx-on-highlight`).
- **TikZ drawings** are black ink on transparent paper. They are inverted in lightness with their hues kept (`--hx-tikz-filter`), so black lines become light while a red curve stays red.

HaTeX doesn't colour the page background; set it on your `body` for each theme.

### Keeping TikZ on a light sheet

If you'd rather show TikZ drawings as they are, on a white card:

```css
[data-theme="dark"] .hatex {
  --hx-tikz-filter: none;
  --hx-tikz-sheet: #fff;
  --hx-tikz-sheet-pad: 0.75rem;
}
```

### Custom dark palettes

The dark values are set on `.hatex[data-theme="dark"]` and `[data-theme="dark"] .hatex`. To override them, use a selector at least as specific:

```css
[data-theme="dark"] .hatex { --hx-text: #d0d0d0; --hx-accent: #8ab4f8; }
```

## Recipes

**Blue links and numbers, hyperref-style citation boxes:**

```css
.hatex { --hx-accent: #0b57d0; --hx-accent-2: #174ea6; --hx-cite: #3aa35b; }
```

**Sans-serif body with serif headings:**

```css
.hatex { --hx-font-body: system-ui, sans-serif; --hx-font-heading: Georgia, serif; }
```

**A rule under section headings:**

```css
.hatex h2 { border-bottom: 1px solid var(--hx-border); padding-bottom: 0.3rem; }
```

**A red proof mark:**

```css
.hatex .latex-qed { color: #b3261e; }
```

For other selectors, see [The HTML output](html-output.md).

## Motion

The page animates three things: scrolling to a clicked reference, the flash on its target, and the fade of the zoom overlay. The reader's `prefers-reduced-motion: reduce` setting turns all three off, and so does the `animate: false` [option](api.md#options).

## Prism themes

Don't load a Prism theme. It would set token colours and backgrounds that fight `hatex.css`. The `--hx-tok-*` variables are the way to change code colours.

---
Previous: [JavaScript API](api.md) · [Contents](README.md) · Next: [The HTML output](html-output.md)
