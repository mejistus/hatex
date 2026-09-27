# Vertical Chinese (古籍)

HaTeX can set Chinese text vertically, in the manner of old books: columns read from top to bottom and from right to left, with old-style punctuation and two-line interlinear notes.

```latex
\begin{guji}[20]
洛陽伽藍記序

\begin{flushright}
魏撫軍府司馬楊衒之撰
\end{flushright}

三墳五典之說，\jiazhu{孔安國尚書序：伏犧、神農、黃帝之書，謂之三墳。}九流百代之言，……
\end{guji}
```

## `guji`: a manuscript-scroll page

`\begin{guji}[n] … \end{guji}` sets its content like a manuscript scroll (卷子本):

- **Columns** run from right to left, with `n` characters each (行款). `n` is 20 if it is left out.
- **Rules:** a thin rule between the columns (烏絲欄) and a double frame around the page, along the top and bottom (天頭、地腳).
- **Paragraphs** (separated by a blank line) start a new column.
- **`flushright`** puts its text at the foot of its column, as for an author's name or a date.
- **Scrolling:** when the scroll is wider than the page, it scrolls sideways inside its own box, starting at the right (the beginning).

### Punctuation (句讀)

Old books have no modern punctuation. A reader marks the end of a sentence with a small circle beside the character (句) and a pause with a dot (讀). Inside `guji`, you write modern punctuation as usual and it is shown the old way:

| You write | Shown as |
|---|---|
| 。！？ and `.` `!` `?` | A small circle (句) beside the preceding character |
| ，、；： and `,` `;` `:` | A dot (讀) beside the preceding character |
| 「」『』《》〈〉“”‘’· | Nothing: quotation and title marks are removed |

The marks take no room in the column, so each character stays in its place on the grid. The circle and dot are drawn by CSS; the original punctuation stays in the text, invisible, so copying the text still copies it. (Removed quotation marks are really gone.)

Because every `.`, `,`, `;` and `:` in a `guji` becomes a mark, keep maths and Latin text with punctuation out of `guji`.

## `vertical`: vertical text only

`\begin{vertical}[n] … \end{vertical}` uses the same vertical layout and column length, but without the rules, the frame or the punctuation changes. Use it for modern vertical text.

## `\jiazhu`: interlinear notes

`\jiazhu{…}` sets a note in two small lines inside one line of text (雙行小字夾注), as commentaries do in old editions. The command name comes from the CTAN `jiazhu` package.

- The note is half the size of the text, and its box is as long as half its characters, so two lines of note fill the space of one line of text.
- **In `guji`,** a note that doesn't fit in what is left of its column continues at the top of the next column, as in printed books, instead of leaving a gap. The runtime splits the note into pieces that each fit, and redoes this whenever the layout changes.
- `\jiazhu` also works in ordinary horizontal text, where the two lines sit inside the line of text.

## Styling

| Variable | Default | Effect |
|---|---|---|
| `--hx-font-guji` | Songti TC, Noto Serif CJK TC, Source Han Serif TC, Songti SC, … | The typeface of `guji` and `vertical`. A traditional-Chinese Song (Ming) face suits old texts. |
| `--hx-guji-paper` | transparent | The paper colour of `guji` |
| `--hx-guji-rule` | the ink colour at 45% | The colour of the rules between columns |
| `--hx-judou` | the ink colour | The colour of the 句讀 marks. Set it to a red, such as `#c0392b`, for 朱筆圈點. |
| `--hx-guji-pitch` | `1.9em` | The distance between columns |
| `--hx-guji-chars` | 20 | Characters per column. Normally set with `[n]` in the source. |

The first four can be set anywhere on or above the `.hatex` element. `--hx-guji-pitch` and `--hx-guji-chars` are set on the `guji` element itself, so a page must override them there:

```css
.hatex { --hx-judou: #c0392b; --hx-guji-paper: #f7f0e1; }
.hatex .hatex-guji, .hatex .hatex-vertical { --hx-guji-pitch: 2.2em; }
```

The text is `1.3rem` in size.

## Browser support

Vertical text uses CSS `writing-mode: vertical-rl`, which all current browsers support. The rules are a background gradient, which lines up with the columns as long as the font gives every character a full em square, as CJK fonts do.

---
Previous: [Slides](slides.md) · [Contents](README.md) · Next: [JavaScript API](api.md)
