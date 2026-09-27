# Theorems, proofs and algorithms

## Theorem-like environments

```latex
\begin{theorem}[Cauchy--Schwarz]\label{thm:cs}
For all $u, v$: $|\langle u, v\rangle| \le \|u\|\,\|v\|$.
\end{theorem}

\begin{proof}
Expand $\|u - tv\|^2 \ge 0$ and take the discriminant.
\end{proof}
```

This renders as **Theorem 1 (Cauchy–Schwarz).** *For all …*, followed by *Proof.* … ∎

### Built-in environments

| Environment | Head | Head in Chinese documents | Numbered |
|---|---|---|---|
| `theorem` | Theorem | 定理 | Yes |
| `lemma` | Lemma | 引理 | Yes |
| `corollary` | Corollary | 推论 | Yes |
| `proposition` | Proposition | 命题 | Yes |
| `definition` | Definition | 定义 | Yes |
| `remark` | Remark | 注 | Yes |
| `example` | Example | 例 | Yes |
| `proof` | Proof | 证明 | No; ends with ∎ |

- **Each environment has its own counter**: Theorem 1, Lemma 1, Theorem 2, Lemma 2. Numbers count through the whole document, not per section.
- The starred forms (`theorem*`, `lemma*`, …) are not numbered.
- The optional argument is a note shown in parentheses after the number: `\begin{theorem}[Name]` gives "Theorem 1 (Name)." On `proof` it is added the same way: `\begin{proof}[of Theorem 1]` gives "Proof (of Theorem 1)." It does not replace the word "Proof" as `amsthm` does.
- A `\label` anywhere inside the environment makes it the target of `\ref` (the number) and `\autoref`/`\cref` ("Theorem 1").
- The head is set in bold, and the body continues on the same line. The body may contain several paragraphs, lists, maths and other blocks.
- The ∎ goes at the end of the proof's last paragraph. `\qedhere` is dropped, since the ∎ is placed automatically.

### Your own environments

`\newtheorem` works in the preamble or the body:

| You write | Result |
|---|---|
| `\newtheorem{hyp}{Hypothesis}` | `hyp` environments numbered Hypothesis 1, 2, … |
| `\newtheorem{conj}[theorem]{Conjecture}` | Shares `theorem`'s counter: Theorem 1, Conjecture 2, Theorem 3 |
| `\newtheorem*{claim}{Claim}` | Unnumbered |
| `\newtheorem{lem}{Lemma}[section]` | The `[section]` is accepted and ignored; numbering stays global |
| `\newtheorem{theorem}{Satz}` | Renames a built-in environment |

`\theoremstyle{…}` degrades to nothing visible (its argument text is kept, so write it in the preamble), and every theorem-like environment looks the same. `amsthm`'s `\newtheoremstyle` is not supported.

## Algorithms

HaTeX implements the `algorithmicx` / `algpseudocode` commands:

```latex
\begin{algorithm}
  \caption{Gradient descent}\label{alg:gd}
  \begin{algorithmic}[1]
    \Require step size $\eta$, iterations $T$
    \Ensure parameters $\theta$
    \State $\theta \gets \theta_0$
    \For{$t = 1, \dots, T$}
      \State $g \gets \nabla L(\theta)$ \Comment{gradient}
      \If{$\|g\| < \epsilon$}
        \State \textbf{break}
      \EndIf
      \State $\theta \gets \theta - \eta g$
    \EndFor
    \State \Return $\theta$
  \end{algorithmic}
\end{algorithm}
```

### The float

`algorithm` is a float like `figure`: with a `\caption` it is numbered "Algorithm 1:" (算法 1), with its own counter, and `\label` makes it a target. The caption is left-aligned above the lines. `algorithmic` also works without the float.

### Line numbers

`\begin{algorithmic}[1]` numbers every line. Any optional argument turns numbering on, since LaTeX's "number every n-th line" isn't supported. Lines from `\Statex`, `\Require`, `\Ensure`, `\Input`, `\Output` and `\Initialize` are not numbered.

### Commands

| Command | Line |
|---|---|
| `\State text` | *text*. An empty `\State` adds no line, so `\State \Return x` is one line. |
| `\Statex text` | *text*, unnumbered |
| `\If{c}` … `\ElsIf{c}` … `\Else` … `\EndIf` | **if** c **then** … **else if** c **then** … **else** … **end if** |
| `\For{c}` … `\EndFor` | **for** c **do** … **end for** |
| `\ForAll{c}` … `\EndFor` | **for all** c **do** … **end for** |
| `\While{c}` … `\EndWhile` | **while** c **do** … **end while** |
| `\Repeat` … `\Until{c}` | **repeat** … **until** c |
| `\Loop` … `\EndLoop` | **loop** … **end loop** |
| `\Function{name}{args}` … `\EndFunction` | **function** name(args) … **end function** |
| `\Procedure{name}{args}` … `\EndProcedure` | **procedure** name(args) … **end procedure** |
| `\Require`, `\Ensure`, `\Input`, `\Output`, `\Initialize` | **Require:** …, **Ensure:** …, and so on |
| `\Return x` | **return** x |
| `\Call{name}{args}` | name(args), in the current line |
| `\Comment{text}` | ▷ *text*, at the end of the current line |
| `\algstore`, `\algrestore`, `\algsetup` | Ignored |

The body of each block is indented by one level (1.4em). The text of a line runs up to the next algorithmic command, so it can contain maths, formatting and `\textbf`.

### Not supported

- `algorithm2e` (`\KwIn`, `\eIf`, `\SetKwFunction`, …) and the older `algorithmic` package (`\STATE`, `\IF`): their commands degrade to text. Rewrite them with `algpseudocode` commands.
- `\algnewcommand`, `\algrenewcommand` and custom block definitions.

---
Previous: [TikZ](tikz.md) · [Contents](README.md) · Next: [Code](code.md)
