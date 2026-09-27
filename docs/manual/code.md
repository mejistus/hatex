# Code

## Code blocks

```latex
\begin{lstlisting}[language=python]
def f(x):
    return x ** 2
\end{lstlisting}

\begin{minted}{javascript}
const f = (x) => x ** 2;
\end{minted}

\begin{verbatim}
Plain text, shown exactly as written: \no \commands {here}.
\end{verbatim}
```

| Environment | Language from |
|---|---|
| `lstlisting` | The `language=` option. The other options (`caption`, `numbers`, `frame`, …) are ignored. |
| `minted` | The mandatory argument. Its options (`[linenos]`, …) are ignored. |
| `verbatim`, `verbatim*` | None: always plain text |

The content of these environments is taken out before anything else is read, so comments, `$`, braces and backslashes inside them are kept exactly. A blank first line and a blank last line are trimmed. Tabs and indentation are kept.

Each block becomes `<pre class="language-xxx"><code class="language-xxx">…</code></pre>`, with `language-plaintext` when there is no highlighting.

## Inline code

| You write | Result |
|---|---|
| `\verb\|x = 1\|`, `\verb+a|b+` | Inline code. Any delimiter that isn't a letter, a space or `{` works. |
| `\lstinline\|x = 1\|` | The same |
| `\mintinline{py}{x = 1}` | The same, unhighlighted; the code can't contain `}` |
| `\texttt{…}` | Monospace *text*: commands inside it are still interpreted |

## Highlighting

Highlighting is done by [Prism](https://prismjs.com), if it is on the page when the source is parsed. Load Prism's core and a component for every language you use:

```html
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
```

- The language name is lowercased and looked up in `Prism.languages`, so it must be a Prism language id or alias: `python`/`py`, `javascript`/`js`, `bash`/`shell`, `c`, `cpp`, `rust`, `latex`/`tex`, and so on. Some components need another one first (`cpp` needs `c`); see Prism's documentation.
- An unknown language, or no Prism at all, gives plain, escaped text. Nothing fails.
- The core `prism.min.js` already includes `markup` (HTML), `css`, `clike` and `javascript`.
- **Don't load a Prism theme.** `hatex.css` colours the tokens from its own palette (One Light, or One Dark in dark mode), through the `--hx-tok-*` variables; see [Theming](theming.md#code-colours).

In Node, pass Prism in with `HaTeX.use({ Prism })`; see [Node](node.md).

## Copy buttons

Every code block gets a "copy" button in its top-right corner. It appears when the pointer is over the block or the button has keyboard focus, and it copies the code's text to the clipboard and says "copied". If the clipboard is unavailable (an insecure `http:` page, for example), the button says "press ⌘C" instead. The `copyButtons: false` [option](api.md#options) turns the buttons off.

## Wide code

Long lines don't wrap: a code block scrolls sideways inside itself. This is also true in [two-column layouts](columns.md) and on slides, where code has a smaller font size.

## Not supported

- `\lstinputlisting{file}` and `\inputminted{lang}{file}`: files aren't read, so they degrade to their argument text (the file name, preceded by the language for `\inputminted`). Paste the code into the source.
- `lstlisting` captions and line numbers. To number and caption code, put it in a `figure` or `algorithm` with a `\caption`.
- `\lstset` and `\setminted` are ignored.

---
Previous: [Theorems, proofs and algorithms](theorems.md) · [Contents](README.md) · Next: [Cross-references, citations and footnotes](references.md)
