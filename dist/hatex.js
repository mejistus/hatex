/*! hatex v1.1.1 — LaTeX to HTML in the browser. Built from src/ by scripts/build.mjs. */
(function (window) {
// ── src/tikz-nn.js ──
// TikZ preamble for neural-network diagrams.
//
// It is added to a picture's preamble automatically when the picture uses any
// nn* style or the \usennstyles marker, so posts can draw architectures without
// carrying a preamble around:
//
//   \begin{tikzpicture}[nn]
//     \node[nnconv] (c1) {Conv 3×3\\64};
//     \node[nnpool, right=of c1] (p1) {Max pool};
//     \draw[nnflow] (c1) -- (p1);
//   \end{tikzpicture}
//
// Styles: nnconv nnpool nnfc nnact nnnorm nnattn nnembed nnout nndata nnloss
//         (layers), nnflow nnskip nnback (arrows), nngroup nnbrace (grouping),
//         and the pic "nnfeatmap" for a 3-D feature-map block.
(function () {
  'use strict';

  window.TIKZ_NN_PREAMBLE = String.raw`
\definecolor{nnconvc}{HTML}{8AAA8C}
\definecolor{nnpoolc}{HTML}{C47C5A}
\definecolor{nnfcc}{HTML}{6E8CA8}
\definecolor{nnactc}{HTML}{C9A227}
\definecolor{nnnormc}{HTML}{9B8AA6}
\definecolor{nnattnc}{HTML}{4F8A8B}
\definecolor{nnembedc}{HTML}{B0836A}
\definecolor{nnoutc}{HTML}{7A9E7E}
\definecolor{nndatac}{HTML}{8A8278}
\definecolor{nnlossc}{HTML}{B3524B}
\tikzset{
  nn/.style={
    font=\small,
    node distance=8mm and 10mm,
    every node/.append style={align=center},
  },
  nnbox/.style 2 args={
    draw=#1!75!black, fill=#1!18, rounded corners=2pt, align=center,
    inner sep=3pt, minimum width=#2, minimum height=8mm, font=\small,
  },
  nnconv/.style={nnbox={nnconvc}{16mm}},
  nnpool/.style={nnbox={nnpoolc}{14mm}},
  nnfc/.style={nnbox={nnfcc}{16mm}},
  nnact/.style={nnbox={nnactc}{12mm}},
  nnnorm/.style={nnbox={nnnormc}{14mm}},
  nnattn/.style={nnbox={nnattnc}{18mm}},
  nnembed/.style={nnbox={nnembedc}{16mm}},
  nnout/.style={nnbox={nnoutc}{16mm}},
  nnloss/.style={nnbox={nnlossc}{14mm}},
  nndata/.style={
    draw=nndatac!75!black, fill=nndatac!15, align=center, font=\small,
    trapezium, trapezium left angle=70, trapezium right angle=110,
    minimum width=14mm, minimum height=8mm, inner sep=3pt,
  },
  nnsum/.style={
    draw=black!65, fill=white, circle, inner sep=0pt, minimum size=5mm, font=\footnotesize,
  },
  nnflow/.style={-{Stealth[length=2mm,width=1.6mm]}, draw=black!65, thick},
  nnskip/.style={nnflow, dashed, rounded corners=3mm},
  nnback/.style={nnflow, draw=nnlossc!80!black, dashed},
  nnlabel/.style={font=\scriptsize, text=black!60, inner sep=1.5pt},
  nngroup/.style={draw=black!30, dashed, rounded corners=4pt, inner sep=3.5mm},
  nngrouplabel/.style={font=\scriptsize\itshape, text=black!55},
  nnbrace/.style={decorate, decoration={brace, amplitude=4pt, raise=1pt}, draw=black!45},
  % 3-D feature map: \pic[…] (name) {nnfeatmap={w=1.2, h=2, d=0.5, fill=nnconvc, label=64}};
  nnfeatmap/.pic={
    \tikzset{nnfm/.cd, #1}
    \def\w{\pgfkeysvalueof{/tikz/nnfm/w}}
    \def\h{\pgfkeysvalueof{/tikz/nnfm/h}}
    \def\d{\pgfkeysvalueof{/tikz/nnfm/d}}
    \def\c{\pgfkeysvalueof{/tikz/nnfm/fill}}
    \fill[\c!22, draw=\c!70!black] (0,0) rectangle (\w,\h);
    \fill[\c!38, draw=\c!70!black] (0,\h) -- (\d,\h+\d) -- (\w+\d,\h+\d) -- (\w,\h) -- cycle;
    \fill[\c!30, draw=\c!70!black] (\w,0) -- (\w+\d,\d) -- (\w+\d,\h+\d) -- (\w,\h) -- cycle;
    \node[font=\scriptsize, text=black!70] at (\w/2,-0.28) {\pgfkeysvalueof{/tikz/nnfm/label}};
  },
  nnfm/.cd, w/.initial=1.2, h/.initial=2, d/.initial=0.5, fill/.initial=nnconvc, label/.initial={},
}
`;
})();

// ── src/latex.js ──
// LaTeX → HTML renderer for blog posts.
//
// Covers the article-level subset people actually write in posts: sections,
// lists, tabular (booktabs / \hline / \multicolumn / \multirow), figures and
// tables with captions, theorem-like environments, footnotes, \label/\ref,
// \newcommand, verbatim/lstlisting/minted. Math goes to KaTeX, code to Prism.
// Unknown commands degrade to their argument text instead of failing.
//
// Exposes window.parseLatex(source) → HTML string.
(function () {
  'use strict';

  const MATH_ENVS = [
    'equation', 'equation*', 'align', 'align*', 'gather', 'gather*',
    'multline', 'multline*', 'eqnarray', 'eqnarray*', 'alignat', 'alignat*',
    'flalign', 'flalign*', 'displaymath', 'math',
  ];
  const TABULAR_ENVS = ['tabular', 'tabular*', 'tabularx', 'tabulary', 'longtable', 'longtable*'];
  const FLOAT_ENVS = {
    figure: 'figure', 'figure*': 'figure', wrapfigure: 'figure',
    table: 'table', 'table*': 'table',
    algorithm: 'algorithm', 'algorithm*': 'algorithm',
  };
  const LIST_ENVS = { itemize: 'ul', enumerate: 'ol', description: 'dl' };
  const QUOTE_ENVS = ['quote', 'quotation', 'verse'];

  const NAMES = {
    en: {
      figure: 'Figure', table: 'Table', abstract: 'Abstract', proof: 'Proof',
      theorem: 'Theorem', lemma: 'Lemma', corollary: 'Corollary', proposition: 'Proposition',
      definition: 'Definition', remark: 'Remark', example: 'Example', section: 'Section', equation: 'Equation',
      references: 'References', algorithm: 'Algorithm',
    },
    zh: {
      figure: '图', table: '表', abstract: '摘要', proof: '证明',
      theorem: '定理', lemma: '引理', corollary: '推论', proposition: '命题',
      definition: '定义', remark: '注', example: '例', section: '节', equation: '式',
      references: '参考文献', algorithm: '算法',
    },
  };

  const SIZES = {
    tiny: 0.6, scriptsize: 0.7, footnotesize: 0.8, small: 0.9, normalsize: 1,
    large: 1.2, Large: 1.44, LARGE: 1.73, huge: 2.07, Huge: 2.49,
  };
  const DECLARATIONS = {
    bf: ['<strong>', '</strong>'], bfseries: ['<strong>', '</strong>'],
    it: ['<em>', '</em>'], itshape: ['<em>', '</em>'], em: ['<em>', '</em>'],
    sl: ['<em>', '</em>'], slshape: ['<em>', '</em>'],
    tt: ['<code class="latex-tt">', '</code>'], ttfamily: ['<code class="latex-tt">', '</code>'],
    sc: ['<span class="latex-sc">', '</span>'], scshape: ['<span class="latex-sc">', '</span>'],
    sf: ['<span class="latex-sf">', '</span>'], sffamily: ['<span class="latex-sf">', '</span>'],
    rm: ['', ''], rmfamily: ['', ''], upshape: ['', ''], mdseries: ['', ''], normalfont: ['', ''],
  };
  const WRAPPERS = {
    textbf: ['<strong>', '</strong>'], textit: ['<em>', '</em>'], emph: ['<em>', '</em>'],
    textsl: ['<em>', '</em>'], underline: ['<u>', '</u>'], uline: ['<u>', '</u>'],
    texttt: ['<code class="latex-tt">', '</code>'], textsc: ['<span class="latex-sc">', '</span>'],
    textsf: ['<span class="latex-sf">', '</span>'], sout: ['<s>', '</s>'], st: ['<s>', '</s>'],
    hl: ['<mark>', '</mark>'], textsuperscript: ['<sup>', '</sup>'], textsubscript: ['<sub>', '</sub>'],
    textrm: ['', ''], textup: ['', ''], textmd: ['', ''], textnormal: ['', ''],
    mbox: ['', ''], hbox: ['', ''], text: ['', ''], fbox: ['<span class="latex-fbox">', '</span>'],
  };
  const SYMBOLS = {
    ldots: '…', dots: '…', textellipsis: '…', textbackslash: '\\', textasciitilde: '~',
    textasciicircum: '^', textbar: '|', textless: '&lt;', textgreater: '&gt;', textbullet: '•',
    textendash: '–', textemdash: '—', textquoteleft: '‘', textquoteright: '’',
    textquotedblleft: '“', textquotedblright: '”', copyright: '©', textcopyright: '©',
    textregistered: '®', texttrademark: '™', S: '§', P: '¶', dag: '†', ddag: '‡',
    pounds: '£', euro: '€', texteuro: '€', textdegree: '°', textperiodcentered: '·',
    quad: '&emsp;', qquad: '&emsp;&emsp;', enspace: '&ensp;', thinspace: '&thinsp;',
    newline: '<br>', linebreak: '<br>', par: ' ', hfill: ' ', hfil: ' ', indent: '',
    noindent: '', centering: '', raggedright: '', raggedleft: '', nolinebreak: '',
    maketitle: '', tableofcontents: '', newpage: '', clearpage: '', cleardoublepage: '',
    bigskip: '', medskip: '', smallskip: '', protect: '', relax: '', null: '',
    appendix: '', frontmatter: '', mainmatter: '', backmatter: '', item: '',
    TeX: '<span class="latex-logo">T<span class="e">e</span>X</span>',
    LaTeX: '<span class="latex-logo">L<span class="a">a</span>T<span class="e">e</span>X</span>',
    LaTeXe: '<span class="latex-logo">L<span class="a">a</span>T<span class="e">e</span>X&thinsp;2<sub>ε</sub></span>',
    XeTeX: '<span class="latex-logo">X<span class="e">Ǝ</span>T<span class="e">e</span>X</span>',
  };
  // Commands whose arguments are consumed and dropped (preamble / layout noise).
  const DROP_ARGS = {
    title: 1, author: 1, date: 1, thanks: 1, vspace: 1, 'vspace*': 1, hspace: 1, 'hspace*': 1,
    pagestyle: 1, thispagestyle: 1, pagenumbering: 1, setlength: 2, addtolength: 2,
    setcounter: 2, addtocounter: 2, stepcounter: 1, bibliographystyle: 1, bibliography: 1,
    graphicspath: 1, hypersetup: 1, geometry: 1, captionsetup: 1, lstset: 1, setminted: 1,
    usetikzlibrary: 1, addbibresource: 1, printbibliography: 0, phantom: 1,
    vskip: 0, kern: 0, index: 1, nocite: 1, input: 1, include: 1, usepackage: 1,
    documentclass: 1, newenvironment: 3, renewenvironment: 3, linespread: 1, color: 1,
  };
  const ACCENTS = {
    "'": '́', '`': '̀', '^': '̂', '"': '̈', '~': '̃',
    '=': '̄', '.': '̇', u: '̆', v: '̌', H: '̋', c: '̧', r: '̊',
  };

  // Source line markers: "\u0005<line>\u0005" is put at the start of every
  // non-blank source line and ends up as data-line attributes / anchors in the
  // HTML, which is what the editor's source ↔ preview jumps use.
  const MARK_RE = /\u0005(\d+)\u0005/g;
  const stripMarks = (t) => t.replace(MARK_RE, '');
  const lineAnchor = (n) => `<span class="latex-line" data-line="${n}"></span>`;

  const CJK = /[　-〿぀-ヿ㐀-鿿＀-￯]/;
  const SLOT = '\u0001';
  const REF = '\u0002';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Low-level scanning helpers ──

  // Read a balanced {...} group starting at or after i (skipping whitespace).
  function readGroup(s, i) {
    let j = i;
    while (j < s.length && /[ \t\n]/.test(s[j])) j++;
    if (s[j] !== '{') return null;
    let depth = 0;
    for (let k = j; k < s.length; k++) {
      const c = s[k];
      if (c === '\\') { k++; continue; }
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) return { content: s.slice(j + 1, k), end: k + 1 };
    }
    return { content: s.slice(j + 1), end: s.length };
  }

  // Read an optional [...] argument (brace-aware) at or after i.
  function readOptional(s, i) {
    let j = i;
    while (j < s.length && /[ \t]/.test(s[j])) j++;
    if (s[j] !== '[') return null;
    let depth = 0;
    for (let k = j + 1; k < s.length; k++) {
      const c = s[k];
      if (c === '\\') { k++; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === ']' && depth === 0) return { content: s.slice(j + 1, k), end: k + 1 };
    }
    return null;
  }

  // Read a mandatory argument: a {group} or a single token.
  function readArg(s, i) {
    const g = readGroup(s, i);
    if (g) return g;
    let j = i;
    while (j < s.length && /[ \t\n]/.test(s[j])) j++;
    if (j >= s.length) return { content: '', end: j };
    if (s[j] === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(j));
      return { content: m[0], end: j + m[0].length };
    }
    return { content: s[j], end: j + 1 };
  }

  // Find the \end{name} matching a \begin{name} whose body starts at i.
  function findEnd(s, name, i) {
    const b = '\\begin{' + name + '}', e = '\\end{' + name + '}';
    let depth = 1, k = i;
    while (k < s.length) {
      const nb = s.indexOf(b, k), ne = s.indexOf(e, k);
      if (ne < 0) break;
      if (nb >= 0 && nb < ne) { depth++; k = nb + b.length; continue; }
      if (--depth === 0) return { bodyEnd: ne, end: ne + e.length };
      k = ne + e.length;
    }
    return { bodyEnd: s.length, end: s.length };
  }

  // Split s at top-level occurrences of a separator matcher, ignoring
  // anything inside braces or nested environments.
  function splitTopLevel(s, matchAt) {
    const parts = [];
    let depth = 0, envDepth = 0, last = 0;
    for (let k = 0; k < s.length; k++) {
      const c = s[k];
      if (c === '{') { depth++; continue; }
      if (c === '}') { depth--; continue; }
      if (c === '\\') {
        if (s.startsWith('\\begin{', k)) { envDepth++; k += 6; continue; }
        if (s.startsWith('\\end{', k)) { envDepth--; k += 4; continue; }
      }
      if (depth === 0 && envDepth === 0) {
        const len = matchAt(s, k);
        if (len) {
          parts.push(s.slice(last, k));
          last = k + len;
          k = last - 1;
          continue;
        }
      }
      if (c === '\\') k++;
    }
    parts.push(s.slice(last));
    return parts;
  }

  // ── Renderer ──

  function parseLatex(source) {
    const ctx = {
      uid: 'tex' + Math.random().toString(36).slice(2, 8),
      slots: [],
      footnotes: [],
      labels: {},
      macros: {},
      katexMacros: {},
      theorems: {
        theorem: { name: 'theorem', counter: 'theorem' }, lemma: { name: 'lemma', counter: 'lemma' },
        corollary: { name: 'corollary', counter: 'corollary' }, proposition: { name: 'proposition', counter: 'proposition' },
        definition: { name: 'definition', counter: 'definition' }, remark: { name: 'remark', counter: 'remark' },
        example: { name: 'example', counter: 'example' }, proof: { name: 'proof', counter: null },
      },
      counters: { section: 0, subsection: 0, subsubsection: 0, figure: 0, table: 0, equation: 0, algorithm: 0 },
      bib: {},
      tikzLibs: new Set(),
      tikzPreamble: [],
      tikzPgfplots: false,
      currentRef: null,
      listDepth: 0,
      names: NAMES.en,
    };

    let s = String(source || '').replace(/\r\n?/g, '\n');
    if (CJK.test(s)) ctx.names = NAMES.zh;
    s = s.split('\n').map((line, i) => line.trim() ? line.replace(/^[ \t]*/, (ws) => `${ws}\u0005${i + 1}\u0005`) : line).join('\n');

    // 1. Verbatim-like content first, before comments or math touch it.
    s = s.replace(/\\begin\{(verbatim\*?|lstlisting|minted)\}([\s\S]*?)\\end\{\1\}/g, (m, env, body) => {
      let lang = '';
      if (env === 'lstlisting') {
        const opt = /^\s*\[([^\]]*)\]/.exec(body);
        if (opt) {
          body = body.slice(opt[0].length);
          const l = /language\s*=\s*\{?([\w+#-]+)/i.exec(opt[1]);
          if (l) lang = l[1];
        }
      } else if (env === 'minted') {
        const opt = /^\s*(\[[^\]]*\])?\s*\{([^}]*)\}/.exec(body);
        if (opt) { body = body.slice(opt[0].length); lang = opt[2]; }
      }
      body = stripMarks(body);
      return slot(ctx, codeBlock(body.replace(/^[ \t]*\n/, '').replace(/\n[ \t]*$/, ''), lang), true);
    });
    s = s.replace(/\\(?:verb\*?|lstinline)([^a-zA-Z\s{])([\s\S]*?)\1/g, (m, d, code) =>
      slot(ctx, '<code>' + esc(stripMarks(code)) + '</code>', false));
    s = s.replace(/\\mintinline\{[^}]*\}\{([^}]*)\}/g, (m, code) => slot(ctx, '<code>' + esc(code) + '</code>', false));

    // 2. Comments (this also removes the "% ---" front matter block).
    s = s.replace(/(^|[^\\])%.*$/gm, '$1');

    // \definecolor{name}{HTML|rgb|RGB}{value}
    userColors = {};
    s = s.replace(/\\definecolor\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}/g, (m, name, model, val) => {
      const v = val.split(',').map(x => parseFloat(x));
      if (/^html$/i.test(model.trim())) userColors[name.trim()] = '#' + val.trim();
      else if (model.trim() === 'rgb' && v.length === 3) userColors[name.trim()] = `rgb(${v.map(x => Math.round(x * 255)).join(',')})`;
      else if (model.trim() === 'RGB' && v.length === 3) userColors[name.trim()] = `rgb(${v.join(',')})`;
      ctx.tikzPreamble.push({ text: m, color: name.trim() });
      return '';
    });

    // TikZ setup commands feed the preamble of every tikzpicture.
    s = s.replace(/\\(tikzset|pgfplotsset|usepgfplotslibrary|tikzstyle)(?![a-zA-Z])/g, (m) => '\u0004' + m);
    {
      let out = '', i = 0, k;
      while ((k = s.indexOf('\u0004', i)) >= 0) {
        out += s.slice(i, k);
        const cmd = /^\u0004\\([a-zA-Z]+)/.exec(s.slice(k));
        let j = k + cmd[0].length;
        if (cmd[1] === 'tikzstyle') {
          // \tikzstyle{name}=[...]
          const g = readGroup(s, j); if (g) j = g.end;
          const eq = /^\s*=\s*/.exec(s.slice(j)); if (eq) j += eq[0].length;
          const o = readOptional(s, j); if (o) j = o.end;
        } else {
          const g = readGroup(s, j); if (g) j = g.end;
        }
        ctx.tikzPreamble.push({ text: stripMarks(s.slice(k + 1, j)) });
        if (cmd[1] !== 'tikzstyle' && cmd[1] !== 'tikzset') ctx.tikzPgfplots = true;
        i = j;
      }
      s = out + s.slice(i);
    }

    // Bibliography numbers are needed before any \cite is rendered.
    const bibRe = /\\bibitem\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g;
    for (let b; (b = bibRe.exec(s));) {
      const key = b[1].trim();
      if (!ctx.bib[key]) ctx.bib[key] = Object.keys(ctx.bib).length + 1;
    }

    // 3. Preamble: keep only the document body when there is one.
    const docStart = s.indexOf('\\begin{document}');
    if (docStart >= 0) {
      collectDefinitions(ctx, s.slice(0, docStart));
      const bodyStart = docStart + '\\begin{document}'.length;
      const docEnd = s.indexOf('\\end{document}', bodyStart);
      s = s.slice(bodyStart, docEnd < 0 ? s.length : docEnd);
    }
    s = collectDefinitions(ctx, s);

    // TikZ is compiled by real TeX (TikZJax), so it leaves before math does.
    s = extractTikz(ctx, s);

    // 4. Math → KaTeX slots.
    s = extractMath(ctx, s);

    // 5. Line breaks between CJK characters vanish, as with ctex.
    s = s.replace(new RegExp('(' + CJK.source + ')[ \\t]*\\n[ \\t]*(?=(?:\\u0005\\d+\\u0005)?' + CJK.source + ')', 'g'), '$1');

    // Scaling wrappers around tables/figures only matter on paper.
    s = unwrapBoxes(s);

    // 6. Blocks + inline.
    let html = renderBlocks(ctx, s);

    if (ctx.footnotes.length) {
      html += '<div class="latex-footnotes"><ol>' + ctx.footnotes.map((fn, n) =>
        `<li id="${ctx.uid}-fn${n + 1}">${fn} <a href="#${ctx.uid}-fnref${n + 1}" class="latex-fn-back">↩</a></li>`
      ).join('') + '</ol></div>';
    }

    // Resolve slots (they may nest) then cross-references.
    for (let pass = 0; pass < 4 && html.includes(SLOT); pass++) {
      html = html.replace(/\u0001(\d+)\u0001/g, (m, n) => ctx.slots[+n].html);
    }
    html = html.replace(/\u0002([^\u0002]*)\u0002/g, (m, key) => {
      // \autoref / \cref put "@type:key" in front of the number for the type word.
      if (key.startsWith('@type:')) {
        const l = ctx.labels[key.slice(6)];
        const word = l && (ctx.names[l.type] || (ctx.theorems[l.type] && ctx.theorems[l.type].title));
        return word ? esc(word) + '&nbsp;' : '';
      }
      const l = ctx.labels[key];
      return l ? esc(l.num) : '??';
    });
    return html;
  }

  // \resizebox{w}{h}{X}, \scalebox{s}{X}, \adjustbox{opts}{X}, \rotatebox{a}{X} → X
  function unwrapBoxes(s) {
    const re = /\\(resizebox\*?|scalebox|adjustbox|rotatebox)(?![a-zA-Z])/g;
    const skip = { resizebox: 2, 'resizebox*': 2, scalebox: 1, adjustbox: 1, rotatebox: 1 };
    let m;
    while ((m = re.exec(s))) {
      let i = m.index + m[0].length;
      const o = readOptional(s, i); if (o) i = o.end;
      for (let k = 0; k < skip[m[1]]; k++) { const g = readGroup(s, i); if (!g) break; i = g.end; }
      const body = readGroup(s, i);
      if (!body) continue;
      const fit = m[1].startsWith('resizebox') || m[1] === 'adjustbox';
      s = s.slice(0, m.index) +
        (fit ? '\\begin{latexfit}' + body.content + '\\end{latexfit}' : body.content) + s.slice(body.end);
      re.lastIndex = m.index;
    }
    return s;
  }

  // TikZ libraries a picture needs, guessed from what it uses, so posts don't
  // have to remember \usetikzlibrary.
  const TIKZ_LIBS = [
    [/(?:above|below|left|right)\s*=\s*(?:[^,\]\n]*\s+)?of\s|node distance|(?:above|below) (?:left|right)=/, 'positioning'],
    [/-\{|\}-|Stealth|Latex\[|\bTo\[|Circle\]|Bar\]|Square\]|arrows\.meta/, 'arrows.meta'],
    [/\(\$|\$\)|let\s+\\p|\\pgfextra|\bcalc\b/, 'calc'],
    [/\bfit\s*=/, 'fit'],
    [/on background layer|background rectangle|framed\]|show background/, 'backgrounds'],
    [/\b(?:ellipse|diamond|trapezium|regular polygon|star|cylinder|semicircle|kite|dart)\b/, 'shapes.geometric'],
    [/rounded rectangle|cross out|strike out|forbidden sign|\bchamfered rectangle\b/, 'shapes.misc'],
    [/\bcloud\b|\bstarburst\b|\bsignal\b|\btape\b|\bmagnifying glass\b/, 'shapes.symbols'],
    [/rectangle split/, 'shapes.multipart'],
    [/single arrow|double arrow|arrow box/, 'shapes.arrows'],
    [/\bcallout\b/, 'shapes.callouts'],
    [/\bstart chain\b|\bon chain\b|\bjoin\s*=|\bchain\b/, 'chains'],
    [/\\matrix|matrix of (?:nodes|math nodes)/, 'matrix'],
    [/decoration\s*=\s*\{?\s*(?:brace|mirror|bracket)|\bdecorate\b/, 'decorations.pathreplacing'],
    [/decoration\s*=\s*\{?\s*(?:snake|coil|zigzag|bumps|random steps|wave)/, 'decorations.pathmorphing'],
    [/decoration\s*=\s*\{?\s*(?:markings|text along path|text effects)/, 'decorations.markings'],
    [/pattern\s*=/, 'patterns'],
    [/name path|name intersections/, 'intersections'],
    [/canvas is |plane origin|\bz\s*=\s*\{/, '3d'],
    [/drop shadow|copy shadow|circular drop shadow/, 'shadows'],
    [/spy using|spy scope/, 'spy'],
    [/\bedge node\b|\bto\s*\[[^\]]*"/, 'quotes'],
    [/\\tikzmath|\bevaluate\s*=/, 'math'],
    [/\bmindmap\b|\bconcept\b/, 'mindmap'],
    [/\bfolder\b|\bgrow via three points\b/, 'trees'],
    [/\bbarchart\b|\bdatavisualization\b/, 'datavisualization'],
    [/\bpin\b|\blabel distance\b|\bcoordinate label\b/, 'positioning'],
  ];

  function tikzLibrariesFor(code) {
    const found = new Set();
    TIKZ_LIBS.forEach(([re, lib]) => { if (re.test(code)) found.add(lib); });
    return found;
  }

  // tikzpicture / tikzcd → <script type="text/tikz">, which TikZJax (loaded
  // on demand by the page) compiles to SVG in the browser.
  function extractTikz(ctx, s) {
    // One pass in document order: a \usetikzlibrary applies to the pictures
    // after it (as in LaTeX), so adding one later doesn't change the earlier
    // pictures — and their pre-rendered SVGs stay valid.
    return s.replace(/\\usetikzlibrary\s*\{([^}]*)\}|\\begin\{(tikzpicture|tikzcd)\}[\s\S]*?\\end\{\2\}/g, (whole, declared, env) => {
      if (declared !== undefined) {
        declared.split(',').map(x => x.trim()).filter(Boolean).forEach(l => ctx.tikzLibs.add(l));
        return '';
      }
      let m = stripMarks(whole);
      const packages = {};
      if (env === 'tikzcd') packages['tikz-cd'] = '';
      if (ctx.tikzPgfplots || /\\begin\{(axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis)\}|\\addplot/.test(m)) {
        packages.pgfplots = '';
      }
      // Only colours and macros this picture uses go into its preamble, so an
      // unrelated \definecolor elsewhere doesn't change the hash (and thereby
      // invalidate the pre-rendered SVG).
      const preamble = ctx.tikzPreamble.filter(p =>
        p.color ? new RegExp('(^|[^a-zA-Z0-9])' + p.color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-zA-Z0-9]|$)').test(m)
        : p.macro ? new RegExp('\\\\' + p.macro + '(?![a-zA-Z])').test(m)
        : true).map(p => p.text);
      if (/\\(mathbb|mathfrak|text|operatorname|boldsymbol)\b|\\begin\{(align|pmatrix|bmatrix|cases)/.test(m + preamble.join(''))) {
        packages.amsmath = ''; packages.amssymb = '';
      }
      const libs = new Set([...ctx.tikzLibs, ...tikzLibrariesFor(m)]);
      // Neural-network styles ship with the site; pull them in when used.
      if (/\\usennstyles|\bnn(?:conv|pool|fc|act|norm|attn|embed|out|data|loss|sum|flow|skip|back|label|group|grouplabel|brace|box|featmap|fm)\b|\[\s*nn\s*[,\]]/.test(m) && window.TIKZ_NN_PREAMBLE) {
        preamble.unshift(window.TIKZ_NN_PREAMBLE);
        ['positioning', 'arrows.meta', 'calc', 'fit', 'backgrounds', 'shapes.geometric', 'decorations.pathreplacing'].forEach(l => libs.add(l));
      }
      const attrs = [
        libs.size ? `data-tikz-libraries="${esc([...libs].sort().join(','))}"` : '',
        Object.keys(packages).length ? `data-tex-packages="${esc(JSON.stringify(packages))}"` : '',
        preamble.length ? `data-add-to-preamble="${esc(preamble.join('\n'))}"` : '',
      ].filter(Boolean).join(' ');
      const code = m.replace(/\\usennstyles\b/g, '').replace(/<\/(script)/gi, '<\\/$1');
      // The page looks for a pre-rendered notes/tikz/<hash>.svg first and only
      // hands the (inert) script to TikZJax when there is none.
      const hash = fnv1a(attrs + '\n' + code);
      return slot(ctx, `<div class="latex-tikz" data-tikz-hash="${hash}"><script type="text/x-tikz" ${attrs}>${code}</script></div>`, true);
    });
  }

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  function slot(ctx, html, block) {
    ctx.slots.push({ html, block });
    return SLOT + (ctx.slots.length - 1) + SLOT;
  }

  function codeBlock(code, lang) {
    lang = String(lang || '').toLowerCase();
    const P = window.Prism;
    const grammar = P && P.languages[lang];
    const body = grammar ? P.highlight(code, grammar, lang) : esc(code);
    const cls = 'language-' + (grammar ? lang : 'plaintext');
    return `<pre class="${cls}"><code class="${cls}">${body}</code></pre>`;
  }

  // \newcommand / \def / \DeclareMathOperator / \newtheorem → registries.
  function collectDefinitions(ctx, s) {
    const re = /\\(newcommand|renewcommand|providecommand|DeclareMathOperator|def|newtheorem)(\*?)/g;
    let out = '', last = 0, m;
    while ((m = re.exec(s))) {
      let i = m.index + m[0].length;
      const kind = m[1];
      if (kind === 'newtheorem') {
        const env = readGroup(s, i); if (!env) continue;
        i = env.end;
        const shared = readOptional(s, i); if (shared) i = shared.end;
        const title = readGroup(s, i); if (!title) continue;
        i = title.end;
        const within = readOptional(s, i); if (within) i = within.end;
        ctx.theorems[env.content.trim()] = {
          title: title.content.trim(),
          counter: m[2] ? null : (shared ? shared.content.trim() : env.content.trim()),
        };
      } else {
        let name;
        if (kind === 'def') {
          const nm = /^\s*\\([a-zA-Z]+)/.exec(s.slice(i)); if (!nm) continue;
          name = nm[1]; i += nm[0].length;
          while (s[i] && s[i] !== '{') i++;
        } else {
          const g = readArg(s, i); if (!g) continue;
          name = g.content.trim().replace(/^\\/, ''); i = g.end;
        }
        let nargs = 0;
        const n = readOptional(s, i);
        if (n && /^\d$/.test(n.content.trim())) { nargs = +n.content.trim(); i = n.end; }
        const dflt = readOptional(s, i); if (dflt) i = dflt.end;
        const body = readGroup(s, i); if (!body) continue;
        i = body.end;
        const expansion = stripMarks(kind === 'DeclareMathOperator'
          ? `\\operatorname${m[2] ? '*' : ''}{${body.content}}` : body.content);
        ctx.macros[name] = { nargs, body: expansion };
        ctx.katexMacros['\\' + name] = expansion;
        if (kind !== 'DeclareMathOperator') ctx.tikzPreamble.push({ text: stripMarks(s.slice(m.index, i)), macro: name });
      }
      out += s.slice(last, m.index);
      last = i;
      re.lastIndex = i;
    }
    return out + s.slice(last);
  }

  function renderMath(ctx, tex, display) {
    const K = window.katex;
    if (!K) return '<code>' + esc(tex) + '</code>';
    try {
      // KaTeX writes every formula twice: the visual HTML and a hidden MathML
      // copy for screen readers. The MathML costs about three quarters of the
      // layout time of a maths-heavy post, so it is dropped and the source is
      // handed to assistive tech as a label instead.
      const html = K.renderToString(tex, {
        displayMode: display, throwOnError: false, macros: ctx.katexMacros, output: 'html',
      });
      const label = esc(tex.replace(/\s+/g, ' ').trim());
      return html.replace('<span class="katex">',
        `<span class="katex" role="math" aria-label="${label}">`);
    } catch (e) {
      return '<code>' + esc(tex) + '</code>';
    }
  }

  // Split an alignment body into its rows: "\\\\" at the top level only, so a
  // nested matrix or cases keeps its own row breaks.
  function splitRows(body) {
    const rows = [];
    let depth = 0, start = 0;
    for (let i = 0; i < body.length; i++) {
      if (body[i] !== '\\') continue;
      if (/^\\begin\b/.test(body.slice(i))) { depth++; i += 5; continue; }
      if (/^\\end\b/.test(body.slice(i))) { depth = Math.max(0, depth - 1); i += 3; continue; }
      if (body[i + 1] === '\\') {
        if (!depth) { rows.push(body.slice(start, i)); start = i + 2; }
        i++;
      } else i++;                                  // skip the escaped character
    }
    rows.push(body.slice(start));
    return rows;
  }

  function extractMath(ctx, s) {
    // Numbered display environments: record \label → equation number.
    const envRe = new RegExp('\\\\begin\\{(' + MATH_ENVS.map(e => e.replace('*', '\\*')).join('|') + ')\\}([\\s\\S]*?)\\\\end\\{\\1\\}', 'g');
    s = s.replace(envRe, (m, env, body) => {
      body = stripMarks(body);
      const numbered = !env.endsWith('*') && env !== 'displaymath' && env !== 'math';
      const rows = /^(multline|equation)$/.test(env) ? [body] : splitRows(body);
      let anchors = '';
      const numbers = rows.map(row => {
        const isNumbered = numbered && row.trim() && !/\\(nonumber|notag)\b/.test(row);
        if (!isNumbered) return null;
        ctx.counters.equation++;
        const lbl = /\\label\{([^}]*)\}/.exec(row);
        if (lbl) {
          const key = lbl[1].trim();
          ctx.labels[key] = { num: String(ctx.counters.equation), type: 'equation' };
          anchors += `<span class="latex-anchor" id="${esc(ctx.uid + '-' + key)}"></span>`;
        }
        return ctx.counters.equation;
      });
      // Show the number the way LaTeX does; KaTeX takes \tag per row.
      body = rows.map((row, i) => (numbers[i] && !/\\tag\b/.test(row) ? `${row}\\tag{${numbers[i]}}` : row))
        .join('\\\\');
      body = body.replace(/\\label\{[^}]*\}/g, '');
      let tex;
      if (env === 'math') return slot(ctx, renderMath(ctx, body, false), false);
      if (env === 'displaymath') tex = body;
      else if (env.startsWith('eqnarray')) tex = `\\begin{array}{rcl}${body}\\end{array}`;
      else tex = `\\begin{${env}}${body}\\end{${env}}`;
      return slot(ctx, anchors + renderMath(ctx, tex, true), false);
    });

    // \[..\], \(..\), $$..$$, $..$ — scanned so that \$ is left alone.
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\\' && (s[i + 1] === '[' || s[i + 1] === '(')) {
        const close = s[i + 1] === '[' ? '\\]' : '\\)';
        const j = s.indexOf(close, i + 2);
        if (j >= 0) {
          const tex = stripMarks(s.slice(i + 2, j)).replace(/\\label\{[^}]*\}/g, '');
          out += slot(ctx, renderMath(ctx, tex, s[i + 1] === '['), false);
          i = j + 1;
          continue;
        }
      }
      if (c === '\\') { out += c + (s[i + 1] || ''); i++; continue; }
      if (c === '$') {
        const display = s[i + 1] === '$';
        const open = display ? 2 : 1;
        let j = i + open;
        while (j < s.length) {
          if (s[j] === '\\') { j += 2; continue; }
          if (s[j] === '$' && (!display || s[j + 1] === '$')) break;
          j++;
        }
        if (j < s.length) {
          out += slot(ctx, renderMath(ctx, stripMarks(s.slice(i + open, j)), display), false);
          i = j + open - 1;
          continue;
        }
      }
      out += c;
    }
    return out;
  }

  // ── Block level ──

  const BLOCK_RE = /\\begin\{([^}]+)\}|\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)(\*?)|\n[ \t]*\n|\\par\b|\\(?:hrule|noindent|maketitle|tableofcontents|newpage|clearpage)\b|\\rule\s*(?:\[[^\]]*\])?\s*\{[^}]*\}\s*\{[^}]*\}/g;

  const LAYOUT_GLUE = /\\(?:hfill|hfil|quad|qquad|centering|par|medskip|bigskip|smallskip|vfill|noindent)(?![a-zA-Z])|\\[hv]space\*?\s*\{[^}]*\}|~|\\\\/g;

  function renderBlocks(ctx, s) {
    let out = '', para = '';
    const flush = () => {
      const text = para.trim();
      para = '';
      if (!text) return;
      // A paragraph made only of block-level slots is emitted bare.
      // Layout glue between them (\hfill, \quad, ...) is dropped, as on paper.
      const glueless = text.replace(LAYOUT_GLUE, '');
      const bare = stripMarks(glueless).trim();
      const onlySlots = /^(\u0001\d+\u0001\s*)+$/.test(bare) &&
        bare.match(/\u0001(\d+)\u0001/g).every(t => ctx.slots[+t.slice(1, -1)].block);
      if (onlySlots) { out += glueless.replace(MARK_RE, (x, n) => lineAnchor(n)).trim(); return; }
      const first = /^\s*\u0005(\d+)\u0005/.exec(text);
      const html = renderInline(ctx, first ? text.slice(first[0].length) : text).trim();
      if (html.replace(/<(?!img|hr|br|\u0001)[^>]*>/g, '').trim()) {
        out += (first ? `<p data-line="${first[1]}">` : '<p>') + html + '</p>';
      }
    };

    // The marker of the line a block starts on tags that block's element.
    const takeLine = () => {
      const t = /\u0005(\d+)\u0005[ \t]*$/.exec(para);
      if (!t) return null;
      para = para.slice(0, t.index);
      return t[1];
    };
    const tagLine = (html, line) => line ? html.replace(/^<([a-zA-Z][\w-]*)/, `<$1 data-line="${line}"`) : html;

    const re = new RegExp(BLOCK_RE.source, 'g');
    let last = 0, m;
    while ((m = re.exec(s))) {
      para += s.slice(last, m.index);
      last = re.lastIndex;
      const tok = m[0];
      const line = /^\\/.test(tok) ? takeLine() : null;
      if (m[1]) {
        const env = m[1].trim();
        const { bodyEnd, end } = findEnd(s, env, re.lastIndex);
        const body = s.slice(re.lastIndex, bodyEnd);
        flush();
        out += tagLine(renderEnvironment(ctx, env, body), line);
        last = end;
        re.lastIndex = end;
      } else if (m[2]) {
        let i = re.lastIndex;
        const short = readOptional(s, i); if (short) i = short.end;
        const title = readGroup(s, i);
        if (!title) continue;
        last = re.lastIndex = title.end;
        if (m[2] === 'paragraph' || m[2] === 'subparagraph') {
          if (line) para += `\u0005${line}\u0005`;
          para += slot(ctx, '<strong class="latex-paragraph">' + renderInline(ctx, title.content) + '</strong> ', false);
          continue;
        }
        flush();
        out += tagLine(renderHeading(ctx, m[2], !!m[3], title.content, s.slice(last)), line);
      } else if (/^\\(hrule|rule)/.test(tok)) {
        flush();
        out += tagLine('<hr class="latex-rule">', line);
      } else if (/^\n|^\\par/.test(tok)) {
        flush();
      }
      // \noindent, \maketitle, ... are dropped (their line marker stays with the text).
      else if (line) para += `\u0005${line}\u0005`;
    }
    para += s.slice(last);
    flush();
    return out;
  }

  function renderHeading(ctx, kind, starred, title, rest) {
    const level = { part: 2, chapter: 2, section: 2, subsection: 3, subsubsection: 4 }[kind];
    let num = '';
    if (!starred && /section$/.test(kind)) {
      const c = ctx.counters;
      if (kind === 'section') { c.section++; c.subsection = 0; c.subsubsection = 0; num = `${c.section}`; }
      if (kind === 'subsection') { c.subsection++; c.subsubsection = 0; num = `${c.section}.${c.subsection}`; }
      if (kind === 'subsubsection') { c.subsubsection++; num = `${c.section}.${c.subsection}.${c.subsubsection}`; }
    }
    // A \label right after the heading names it.
    const lbl = /^\s*\\label\{([^}]*)\}/.exec(rest);
    const id = lbl ? `${ctx.uid}-${lbl[1].trim()}` : '';
    // The heading carries the id itself, so the same \label must not also
    // render its own anchor further down — that would be a duplicate id.
    if (lbl) (ctx.headingLabels || (ctx.headingLabels = new Set())).add(lbl[1].trim());
    if (lbl && num) ctx.labels[lbl[1].trim()] = { num, type: 'section' };
    ctx.currentRef = num ? { num, type: 'section' } : null;
    return `<h${level}${id ? ` id="${esc(id)}"` : ''}>` +
      (num ? `<span class="latex-secnum">${num}</span>` : '') +
      renderInline(ctx, title) + `</h${level}>`;
  }

  function renderEnvironment(ctx, env, body) {
    const base = env.replace(/\*$/, '');
    if (LIST_ENVS[env]) return renderList(ctx, env, body);
    if (TABULAR_ENVS.includes(env)) return renderTabular(ctx, env, body, null);
    if (FLOAT_ENVS[env]) return renderFloat(ctx, FLOAT_ENVS[env], env, body);
    if (env === 'subfigure' || env === 'subtable') {
      return renderSubfloat(ctx, env === 'subtable' ? 'table' : 'figure', String(ctx.counters.figure + 1), body);
    }
    if (QUOTE_ENVS.includes(env)) return '<blockquote class="latex-quote">' + renderBlocks(ctx, body) + '</blockquote>';
    if (env === 'center') return '<div class="latex-center">' + renderBlocks(ctx, body) + '</div>';
    if (env === 'flushright') return '<div class="latex-right">' + renderBlocks(ctx, body) + '</div>';
    if (env === 'flushleft') return '<div>' + renderBlocks(ctx, body) + '</div>';
    if (env === 'abstract') {
      return '<div class="latex-abstract"><p class="latex-abstract-title">' + ctx.names.abstract + '</p>' +
        renderBlocks(ctx, body) + '</div>';
    }
    if (env === 'thebibliography') return renderBibliography(ctx, body);
    if (env === 'algorithmic' || env === 'algorithmic*') {
      const opt = readOptional(body, 0);
      return renderAlgorithmic(ctx, opt ? body.slice(opt.end) : body, !!opt);
    }
    if (env === 'adjustbox') {
      const g = readGroup(body, 0);
      return '<div class="latex-fit"><div>' + renderBlocks(ctx, g ? body.slice(g.end) : body) + '</div></div>';
    }
    if (env === 'latexfit') return '<div class="latex-fit"><div>' + renderBlocks(ctx, body) + '</div></div>';
    if (env === 'minipage') {
      const opt = readOptional(body, 0);
      const w = readGroup(body, opt ? opt.end : 0);
      const width = w ? cssWidth(w.content) : '';
      return `<div class="latex-minipage"${width ? ` style="width:${width}"` : ''}>` +
        renderBlocks(ctx, w ? body.slice(w.end) : body) + '</div>';
    }
    if (ctx.theorems[env] || ctx.theorems[base]) return renderTheorem(ctx, ctx.theorems[env] || ctx.theorems[base], env, body);
    // document, unknown environments, ...: just their content.
    return renderBlocks(ctx, body);
  }

  function renderList(ctx, env, body) {
    const tag = LIST_ENVS[env];
    const chunks = splitTopLevel(body, (s, k) => {
      if (!s.startsWith('\\item', k) || /[a-zA-Z]/.test(s[k + 5] || '')) return 0;
      return 5;
    });
    // The line marker in front of each \item trails the previous chunk.
    const lines = [];
    for (let k = 0; k < chunks.length - 1; k++) {
      const t = /\u0005(\d+)\u0005[ \t]*$/.exec(chunks[k]);
      lines.push(t ? t[1] : null);
      if (t) chunks[k] = chunks[k].slice(0, t.index);
    }
    const items = chunks.slice(1);
    ctx.listDepth++;
    const types = ['1', 'a', 'i', 'A'];
    const inner = items.map((raw, n) => {
      const dl = lines[n] ? ` data-line="${lines[n]}"` : '';
      let label = null;
      const opt = readOptional(raw, 0);
      if (opt) { label = opt.content; raw = raw.slice(opt.end); }
      let html = renderBlocks(ctx, raw);
      // A single paragraph stays tight inside its list item.
      if (/^<p[ >][\s\S]*<\/p>$/.test(html) && html.indexOf('<p', 1) < 0) html = html.replace(/^<p[^>]*>/, '').slice(0, -4);
      if (tag === 'dl') return `<dt${dl}>${label != null ? renderInline(ctx, label) : ''}</dt><dd>${html}</dd>`;
      if (label != null) return `<li${dl} class="latex-custom-label"><span class="latex-item-label">${renderInline(ctx, label)}</span>${html}</li>`;
      return `<li${dl}>${html}</li>`;
    }).join('');
    ctx.listDepth--;
    const type = tag === 'ol' ? ` type="${types[ctx.listDepth % 4]}"` : '';
    return `<${tag} class="latex-list"${type}>${inner}</${tag}>`;
  }

  const SUBFLOAT_ENVS = ['subfigure', 'subtable', 'minipage'];

  // \caption{...} → a block slot rendered in place (above or below the content).
  function replaceCaptions(ctx, body, label) {
    body = body.replace(/\\caption\*?\s*(?:\[[^\]]*\])?\s*(?=\{)/g, '\\caption');
    let out = '', i = 0, k;
    while ((k = body.indexOf('\\caption', i)) >= 0) {
      const g = readGroup(body, k + 8);
      if (!g) break;
      out += body.slice(i, k);
      // The caption's own source line goes on the <figcaption>.
      const t = /\u0005(\d+)\u0005[ \t]*$/.exec(out);
      if (t) out = out.slice(0, t.index);
      const cap = `<figcaption${t ? ` data-line="${t[1]}"` : ''}><span class="latex-cap-label">${label}</span> ` +
        renderInline(ctx, g.content) + '</figcaption>';
      out += '\n\n' + slot(ctx, cap, true) + '\n\n';
      i = g.end;
    }
    return out + body.slice(i);
  }

  function takeLabels(ctx, body, num, type) {
    let id = '';
    body = body.replace(/\\label\{([^}]*)\}/g, (m, key) => {
      key = key.trim();
      if (num) ctx.labels[key] = { num, type };
      if (!id) id = `${ctx.uid}-${key}`;
      return '';
    });
    return { body, id };
  }

  function capLabel(ctx, kind, num) {
    return `${ctx.names[kind]} ${num}${ctx.names === NAMES.zh ? '' : ':'}`;
  }

  // Like LaTeX, a float is numbered by its own \caption; sub-figures inside it
  // are rendered first so their captions and labels stay theirs.
  function renderFloat(ctx, kind, env, body) {
    const prev = ctx.currentRef;
    if (env === 'wrapfigure') {
      const o = readOptional(body, 0);
      let j = o ? o.end : 0;
      for (let a = 0; a < 2; a++) { const g = readGroup(body, j); if (g) j = g.end; }
      body = body.slice(j);
    } else {
      const o = readOptional(body, 0); // placement like [htbp]
      if (o && /^[!htbpH]*$/.test(o.content.trim())) body = body.slice(o.end);
    }

    // Mask nested sub-floats so the top-level caption check sees only ours.
    const nested = [];
    let top = '', i = 0;
    const openRe = new RegExp('\\\\begin\\{(' + SUBFLOAT_ENVS.join('|') + ')\\}', 'g');
    let m;
    while ((m = openRe.exec(body))) {
      const { bodyEnd, end } = findEnd(body, m[1], m.index + m[0].length);
      top += body.slice(i, m.index) + `\u0003${nested.length}\u0003`;
      nested.push({ env: m[1], body: body.slice(m.index + m[0].length, bodyEnd) });
      i = end;
      openRe.lastIndex = end;
    }
    top += body.slice(i);

    const hasCaption = /\\caption/.test(top);
    const n = hasCaption ? String(++ctx.counters[kind]) : null;
    ctx.currentRef = n ? { num: n, type: kind } : prev;
    ctx.subCounter = 0;

    top = top.replace(/\u0003(\d+)\u0003/g, (x, idx) => {
      const { env: e, body: b } = nested[+idx];
      if (e === 'minipage' && !/\\caption/.test(b)) return slot(ctx, renderEnvironment(ctx, e, b), true);
      if (e === 'minipage') return slot(ctx, renderMinipageFloat(ctx, kind, b), true);
      return slot(ctx, renderSubfloat(ctx, e === 'subtable' ? 'table' : kind, n || String(ctx.counters[kind] + 1), b), true);
    });

    if (n) top = replaceCaptions(ctx, top, capLabel(ctx, kind, n));
    const lab = takeLabels(ctx, top, n, kind);
    const html = renderBlocks(ctx, lab.body);
    ctx.currentRef = prev;
    return `<figure class="latex-float latex-float-${kind}"${lab.id ? ` id="${esc(lab.id)}"` : ''}>${html}</figure>`;
  }

  // A captioned minipage inside a float is a float of its own (side-by-side figures).
  function renderMinipageFloat(ctx, kind, body) {
    const o = readOptional(body, 0);
    const w = readGroup(body, o ? o.end : 0);
    const width = w ? cssWidth(w.content) : '';
    const inner = renderFloat(ctx, kind, 'minipage', w ? body.slice(w.end) : body);
    return inner.replace('<figure class="latex-float', `<figure${width ? ` style="width:${width}"` : ''} class="latex-subfloat latex-float`);
  }

  // subfigure / subtable: "(a) caption", referenced as "1a".
  function renderSubfloat(ctx, kind, parentNum, body) {
    const o = readOptional(body, 0);
    const w = readGroup(body, o ? o.end : 0);
    const width = w ? cssWidth(w.content) : '';
    body = w ? body.slice(w.end) : body;
    const letter = String.fromCharCode(97 + (ctx.subCounter++ % 26));
    const prev = ctx.currentRef;
    ctx.currentRef = { num: parentNum + letter, type: kind };
    body = replaceCaptions(ctx, body, `(${letter})`);
    const lab = takeLabels(ctx, body, parentNum + letter, kind);
    const html = renderBlocks(ctx, lab.body);
    ctx.currentRef = prev;
    return `<figure class="latex-subfloat"${width ? ` style="width:${width}"` : ''}${lab.id ? ` id="${esc(lab.id)}"` : ''}>${html}</figure>`;
  }

  // "0.45\linewidth" → "45%", "5cm" → "5cm"
  function cssWidth(w) {
    const rel = /^\s*([\d.]*)\s*\\(linewidth|textwidth|columnwidth|hsize)/.exec(w);
    if (rel) return Math.round(parseFloat(rel[1] || '1') * 1000) / 10 + '%';
    const abs = /^\s*([\d.]+)\s*(cm|mm|in|pt|em|px)\s*$/.exec(w);
    return abs ? abs[1] + abs[2] : '';
  }

  // algorithmicx / algpseudocode: \State, \If{…}, \For{…}, \Function{…}{…} …
  // Rendered as indented, optionally numbered lines with bold keywords.
  const ALG_OPEN = {
    If: ['if', 'then', 1], ElsIf: ['else if', 'then', 0], For: ['for', 'do', 1],
    ForAll: ['for all', 'do', 1], While: ['while', 'do', 1], Until: ['until', '', -1],
    Function: ['function', '', 1], Procedure: ['procedure', '', 1],
  };
  const ALG_PLAIN = {
    Else: ['else', 0], Loop: ['loop', 1], Repeat: ['repeat', 1],
    EndIf: ['end if', -1], EndFor: ['end for', -1], EndWhile: ['end while', -1],
    EndLoop: ['end loop', -1], EndFunction: ['end function', -1], EndProcedure: ['end procedure', -1],
  };
  const ALG_LABELLED = {
    Require: 'Require', Ensure: 'Ensure', Input: 'Input', Output: 'Output', Initialize: 'Initialize',
  };

  function renderAlgorithmic(ctx, body, numbered) {
    const kw = (t) => `<span class="latex-alg-kw">${t}</span>`;
    const lines = [];
    let indent = 0, i = 0;
    const push = (html, opts = {}) => lines.push({ indent: Math.max(0, indent), html, numbered: opts.plain !== true });

    while (i < body.length) {
      const m = /^\\([A-Za-z]+)\*?/.exec(body.slice(i));
      if (!m) { i++; continue; }
      const name = m[1];
      i += m[0].length;
      const arg = () => { const g = readGroup(body, i); if (g) { i = g.end; return renderInline(ctx, g.content); } return ''; };
      const rest = () => {
        // text up to the next algorithmic command on its own
        const next = /\\(State|Statex|If|ElsIf|Else|EndIf|For|ForAll|EndFor|While|EndWhile|Repeat|Until|Loop|EndLoop|Function|EndFunction|Procedure|EndProcedure|Require|Ensure|Input|Output|Initialize|Return|Comment)\b/.exec(body.slice(i));
        const chunk = body.slice(i, next ? i + next.index : body.length);
        i = next ? i + next.index : body.length;
        return renderInline(ctx, chunk.trim());
      };
      if (name === 'State' || name === 'Statex') {
        // "\State \Return x" is one line, so an empty \State adds nothing.
        const text = rest();
        if (text) push(text, { plain: name === 'Statex' });
      } else if (ALG_LABELLED[name]) {
        push(`${kw(ALG_LABELLED[name] + ':')} ${rest()}`, { plain: true });
      } else if (ALG_OPEN[name]) {
        const [open, close, delta] = ALG_OPEN[name];
        // \ElsIf and \Until sit one level out, like \Else.
        if (delta < 0 || name === 'ElsIf') indent -= 1;
        if (name === 'Function' || name === 'Procedure') {
          const fn = arg(), args = arg();
          push(`${kw(open)} ${fn}(${args})`);
        } else {
          const cond = arg();
          push(`${kw(open)} ${cond}${close ? ' ' + kw(close) : ''}${rest()}`);
        }
        if (name === 'ElsIf') indent += 1;
        if (delta > 0) indent += delta;
      } else if (ALG_PLAIN[name]) {
        const [text, delta] = ALG_PLAIN[name];
        if (delta < 0) indent += delta;
        if (name === 'Else') { indent -= 1; push(kw(text)); indent += 1; }
        else push(kw(text) + rest());
        if (delta > 0) indent += delta;
      } else if (name === 'Return') {
        push(`${kw('return')} ${rest()}`);
      } else if (name === 'Comment') {
        const c = arg();
        const last = lines[lines.length - 1];
        const note = `<span class="latex-alg-comment">▷ ${c}</span>`;
        if (last) last.html += ' ' + note; else push(note);
      } else if (name === 'Call') {
        const fn = arg(), args = arg();
        const last = lines[lines.length - 1];
        const call = `${fn}(${args})`;
        if (last) last.html += call; else push(call);
      } else if (name === 'algstore' || name === 'algrestore' || name === 'algsetup') {
        readGroup(body, i);
      }
    }

    const items = lines.map((l, n) =>
      `<div class="latex-alg-line" style="padding-left:${l.indent * 1.4}em">` +
      (numbered ? `<span class="latex-alg-num">${l.numbered ? lines.slice(0, n + 1).filter(x => x.numbered).length : ''}</span>` : '') +
      `<span>${l.html}</span></div>`).join('');
    return `<div class="latex-alg${numbered ? ' numbered' : ''}">${items}</div>`;
  }

  function renderBibliography(ctx, body) {
    const w = readGroup(body, 0); // widest-label argument
    const items = splitTopLevel(w ? body.slice(w.end) : body, (s, k) =>
      s.startsWith('\\bibitem', k) && !/[a-zA-Z]/.test(s[k + 8] || '') ? 8 : 0);
    // As with \item: the marker before each \bibitem trails the previous chunk.
    const lines = items.map((c, k) => {
      const t = /\u0005(\d+)\u0005[ \t]*$/.exec(c);
      if (t) items[k] = c.slice(0, t.index);
      return t && t[1];
    });
    const lis = items.slice(1).map((raw, n) => {
      const o = readOptional(raw, 0);
      const key = readGroup(raw, o ? o.end : 0);
      if (!key) return '';
      const k = key.content.trim();
      return `<li id="${esc(ctx.uid + '-bib-' + k)}"${lines[n] ? ` data-line="${lines[n]}"` : ''}><span class="latex-bib-num">[${ctx.bib[k]}]</span>` +
        renderInline(ctx, raw.slice(key.end).trim()) + '</li>';
    }).join('');
    return `<div class="latex-bib"><h2>${ctx.names.references}</h2><ol>${lis}</ol></div>`;
  }

  function renderTheorem(ctx, def, env, body) {
    const key = env.replace(/\*$/, '');
    const title = def.title || ctx.names[def.name || key] || key;
    let num = '';
    if (def.counter && !env.endsWith('*')) {
      ctx.counters['thm-' + def.counter] = (ctx.counters['thm-' + def.counter] || 0) + 1;
      num = String(ctx.counters['thm-' + def.counter]);
    }
    let note = '';
    const opt = readOptional(body, 0);
    if (opt) { note = opt.content; body = body.slice(opt.end); }
    let id = '';
    body = body.replace(/\\label\{([^}]*)\}/, (m, k) => {
      k = k.trim();
      if (num) ctx.labels[k] = { num, type: key };
      id = `${ctx.uid}-${k}`;
      return '';
    });
    const isProof = key === 'proof';
    const head = `<span class="latex-thm-head">${esc(title)}${num ? ' ' + num : ''}` +
      (note ? ` <span class="latex-thm-note">(${renderInline(ctx, note)})</span>` : '') +
      (isProof ? '.' : (ctx.names === NAMES.zh ? '' : '.')) + '</span> ';
    let html = renderBlocks(ctx, body);
    if (/^<p[ >]/.test(html)) html = html.replace(/^(<p[^>]*>)/, '$1' + head);
    else html = '<p>' + head + '</p>' + html;
    if (isProof) {
      const qed = '<span class="latex-qed">∎</span>';
      html = html.endsWith('</p>') ? html.slice(0, -4) + qed + '</p>' : html + qed;
    }
    return `<div class="latex-theorem latex-${isProof ? 'proof' : 'thm'}"${id ? ` id="${esc(id)}"` : ''}>${html}</div>`;
  }

  // ── Tables ──

  function parseColumnSpec(spec) {
    const cols = [];
    let pendingLeftRule = false;
    for (let i = 0; i < spec.length; i++) {
      const c = spec[i];
      if (c === '|') {
        if (cols.length && !pendingLeftRule) cols[cols.length - 1].right = true;
        else pendingLeftRule = true;
        if (!cols.length) pendingLeftRule = true;
        continue;
      }
      if (c === '@' || c === '!' || c === '>' || c === '<') {
        const g = readGroup(spec, i + 1); if (g) i = g.end - 1;
        continue;
      }
      if (c === '*') {
        const n = readGroup(spec, i + 1); if (!n) continue;
        const sub = readGroup(spec, n.end); if (!sub) continue;
        const rep = sub.content.repeat(Math.max(0, parseInt(n.content, 10) || 0));
        spec = spec.slice(0, i) + rep + spec.slice(sub.end);
        i--;
        continue;
      }
      let align = null;
      if (c === 'l' || c === 'L') align = 'left';
      else if (c === 'c' || c === 'C') align = 'center';
      else if (c === 'r' || c === 'R' || c === 'S') align = 'right';
      else if (c === 'p' || c === 'm' || c === 'b') {
        align = 'left';
        const g = readGroup(spec, i + 1); if (g) i = g.end - 1;
      } else if (c === 'X' || c === 'J') align = 'left';
      if (align) {
        cols.push({ align, left: pendingLeftRule, right: false });
        pendingLeftRule = false;
      }
    }
    return cols;
  }

  const RULE_RE = /^\s*\\(hline|toprule|midrule|bottomrule|cline|cmidrule|specialrule|addlinespace|morecmidrules|endhead|endfirsthead|endfoot|endlastfoot)\b/;

  function renderTabular(ctx, env, body, captionHtml) {
    let i = 0;
    if (env.startsWith('tabular*') || env === 'tabularx' || env === 'tabulary') {
      const w = readGroup(body, i); if (w) i = w.end;
    }
    const pos = readOptional(body, i); if (pos) i = pos.end;
    const specG = readGroup(body, i);
    const cols = parseColumnSpec(specG ? specG.content : '');
    body = specG ? body.slice(specG.end) : body.slice(i);

    // longtable may carry its own caption.
    body = body.replace(/\\caption\*?\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}\s*(\\\\)?/, (m, cap) => {
      const n = ++ctx.counters.table;
      captionHtml = `<figcaption><span class="latex-cap-label">${ctx.names.table} ${n}${ctx.names === NAMES.zh ? '' : ':'}</span> ${renderInline(ctx, cap)}</figcaption>`;
      return '';
    });

    const rawRows = splitTopLevel(body, (s, k) => {
      if (s.startsWith('\\\\', k)) {
        const opt = /^\\\\\*?\s*(\[[^\]]*\])?/.exec(s.slice(k));
        return opt[0].length;
      }
      if (s.startsWith('\\tabularnewline', k)) return 15;
      return 0;
    });

    const rows = [];
    let pending = [];
    rawRows.forEach(raw => {
      const lm = /\u0005(\d+)\u0005/.exec(raw);
      let rest = stripMarks(raw);
      let m;
      while ((m = RULE_RE.exec(rest))) {
        let j = m[0].length;
        const kind = m[1];
        let trim = '';
        if (kind === 'cmidrule') {
          const t = /^\s*\(([^)]*)\)/.exec(rest.slice(j));
          if (t) { j += t[0].length; trim = t[1]; }
        }
        let range = null;
        if (kind === 'cline' || kind === 'cmidrule') {
          const g = readGroup(rest, j);
          if (g) { j = g.end; const r = /(\d+)\s*-\s*(\d+)/.exec(g.content); if (r) range = [+r[1], +r[2]]; }
        }
        if (kind === 'specialrule') { for (let a = 0; a < 3; a++) { const g = readGroup(rest, j); if (g) j = g.end; } }
        if (kind === 'addlinespace') { const o = readOptional(rest, j); if (o) j = o.end; }
        if (!/^(addlinespace|endhead|endfirsthead|endfoot|endlastfoot|morecmidrules)$/.test(kind)) pending.push({ kind, range, trim });
        rest = rest.slice(j);
      }
      // \rowcolor must open the row.
      let bg = null;
      const rc = /^\s*\\rowcolor\s*(?:\[([^\]]*)\])?\s*\{([^}]*)\}/.exec(rest);
      if (rc) { bg = safeColor(rc[2], rc[1]); rest = rest.slice(rc[0].length); }
      if (rest.trim()) {
        rows.push({ cells: splitTopLevel(rest, (s, k) => (s[k] === '&' ? 1 : 0)), rules: pending, bg, line: lm && lm[1] });
        pending = [];
      }
    });
    const bottomRules = pending;

    // Header rows: everything before the first \midrule, or the first row
    // when the table opens with a rule and has one right after row 1.
    let headerCount = 0;
    const mid = rows.findIndex((r, k) => k > 0 && r.rules.some(x => x.kind === 'midrule'));
    if (mid > 0) headerCount = mid;
    else if (rows.length > 1 && rows[0].rules.length && rows[1].rules.some(x => x.kind === 'hline' || x.kind === 'midrule')) headerCount = 1;

    const rowspanLeft = [];
    const trHtml = rows.map((row, r) => {
      const isHead = r < headerCount;
      const tag = isHead ? 'th' : 'td';
      const topClass = ruleClass(row.rules);
      const partial = row.rules.filter(x => x.range);
      let col = 0;
      const cells = [];
      row.cells.forEach(raw => {
        while (rowspanLeft[col] > 0 && !raw.trim()) { rowspanLeft[col]--; col++; return; }
        let span = 1, rowspan = 1, align = cols[col] ? cols[col].align : 'left', content = raw.trim();
        let colSpec = cols[col];
        const mc = /^\\multicolumn\s*\{(\d+)\}\s*/.exec(content);
        if (mc) {
          span = +mc[1];
          const spec = readGroup(content, mc[0].length);
          const inner = spec && readGroup(content, spec.end);
          if (spec) {
            const c = parseColumnSpec(spec.content)[0];
            if (c) { align = c.align; colSpec = { ...c, left: c.left, right: spec.content.trim().endsWith('|') }; }
          }
          content = inner ? inner.content : '';
        }
        const mr = /^\\multirow\s*(?:\[[^\]]*\])?\s*\{(\d+)\}\s*/.exec(content);
        if (mr) {
          rowspan = +mr[1];
          const w = readGroup(content, mr[0].length);
          const inner = w && readGroup(content, w.end);
          content = inner ? inner.content : '';
          for (let k = 0; k < span; k++) rowspanLeft[col + k] = rowspan - 1;
        }
        let cellBg = null;
        content = content.replace(/\\cellcolor\s*(?:\[([^\]]*)\])?\s*\{([^}]*)\}/, (m, model, c) => {
          cellBg = safeColor(c, model);
          return '';
        }).trim();
        const cls = [];
        if (colSpec && colSpec.left) cls.push('vl');
        const lastCol = cols[col + span - 1];
        if ((mc ? colSpec && colSpec.right : lastCol && lastCol.right)) cls.push('vr');
        // \cmidrule(lr) is trimmed only at the ends of its range.
        const cl = partial.find(p => col + 1 <= p.range[1] && col + span >= p.range[0]);
        if (cl) {
          cls.push('cline');
          if (cl.trim && cl.trim.includes('l') && col + 1 <= cl.range[0]) cls.push('cl-l');
          if (cl.trim && cl.trim.includes('r') && col + span >= cl.range[1]) cls.push('cl-r');
        }
        if (align !== 'left') cls.push('a-' + align);
        cells.push(`<${tag}${span > 1 ? ` colspan="${span}"` : ''}${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}` +
          `${cls.length ? ` class="${cls.join(' ')}"` : ''}${cellBg ? ` style="background-color:${cellBg}"` : ''}>` +
          `${renderInline(ctx, content)}</${tag}>`);
        col += span;
      });
      // class stays first: the bottom-rule pass below merges into it.
      return `<tr${topClass ? ` class="${topClass}"` : ''}${row.line ? ` data-line="${row.line}"` : ''}${row.bg ? ` style="background-color:${row.bg}"` : ''}>${cells.join('')}</tr>`;
    });

    const bottom = ruleClass(bottomRules).replace(/rule-top/g, 'rule-bottom');
    const head = trHtml.slice(0, headerCount).join('');
    const bodyRows = trHtml.slice(headerCount);
    if (bottom && bodyRows.length) bodyRows[bodyRows.length - 1] = bodyRows[bodyRows.length - 1].replace(/^<tr( class="([^"]*)")?/, (m, a, c) => `<tr class="${c ? c + ' ' : ''}${bottom}"`);
    const table = '<div class="latex-table-wrap"><table class="latex-table">' +
      (head ? '<thead>' + head + '</thead>' : '') + '<tbody>' + bodyRows.join('') + '</tbody></table></div>';
    return captionHtml ? `<figure class="latex-float latex-table-float">${captionHtml}${table}</figure>` : table;
  }

  function ruleClass(rules) {
    const full = rules.filter(x => !x.range);
    if (!full.length) return '';
    const heavy = full.some(x => x.kind === 'toprule' || x.kind === 'bottomrule' || x.kind === 'specialrule');
    const double = full.length > 1;
    return 'rule-top' + (heavy ? ' rule-heavy' : '') + (double ? ' rule-double' : '');
  }

  // ── Inline ──

  function renderInline(ctx, s) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\u0005') {
        const j = s.indexOf('\u0005', i + 1);
        out += lineAnchor(s.slice(i + 1, j));
        i = j;
        continue;
      }
      if (c === SLOT) {
        const j = s.indexOf(SLOT, i + 1);
        out += s.slice(i, j + 1);
        i = j;
        continue;
      }
      if (c === '\\') {
        const r = renderCommand(ctx, s, i);
        if (r.rest != null) return out + r.html + renderInline(ctx, r.rest) + r.close;
        out += r.html;
        i = r.end - 1;
        continue;
      }
      if (c === '{') {
        const g = readGroup(s, i);
        out += renderInline(ctx, g.content);
        i = g.end - 1;
        continue;
      }
      if (c === '}') continue;
      if (c === '~') { out += '&nbsp;'; continue; }
      if (c === '-' && s[i + 1] === '-') {
        if (s[i + 2] === '-') { out += '—'; i += 2; } else { out += '–'; i += 1; }
        continue;
      }
      if (c === '`') { if (s[i + 1] === '`') { out += '“'; i++; } else out += '‘'; continue; }
      if (c === "'") { if (s[i + 1] === "'") { out += '”'; i++; } else out += '’'; continue; }
      if (c === '\n') { out += ' '; continue; }
      if (c === '&') { out += '&amp;'; continue; }
      if (c === '<') { out += '&lt;'; continue; }
      if (c === '>') { out += '&gt;'; continue; }
      if (c === '"') { out += '&quot;'; continue; }
      out += c;
    }
    return out;
  }

  // Returns { html, end } or, for declarations like \bfseries that affect
  // the rest of the group, { html, rest, close }.
  function renderCommand(ctx, s, i) {
    const m = /^\\([a-zA-Z]+\*?|.)/.exec(s.slice(i));
    if (!m) return { html: '\\', end: i + 1 };
    const name = m[1];
    let end = i + m[0].length;

    // Control symbols.
    if (name.length === 1 && !/[a-zA-Z]/.test(name)) {
      if (name === '\\') {
        const opt = /^\*?\s*\[[^\]]*\]/.exec(s.slice(end));
        return { html: '<br>', end: end + (opt ? opt[0].length : 0) };
      }
      if (ACCENTS[name]) {
        const a = readArg(s, end);
        return { html: esc((a.content + ACCENTS[name]).normalize('NFC')), end: a.end };
      }
      const map = { ',': '&thinsp;', ';': '&ensp;', ':': '&ensp;', '!': '', ' ': ' ', '\n': ' ', '-': '', '/': '', '@': '', '&': '&amp;', '%': '%', '$': '$', '#': '#', '_': '_', '{': '{', '}': '}' };
      return { html: map[name] != null ? map[name] : esc(name), end };
    }

    // Letter accents like \c{c}, \v{s}.
    if (ACCENTS[name] && name.length === 1) {
      const a = readArg(s, end);
      return { html: esc((a.content + ACCENTS[name]).normalize('NFC')), end: a.end };
    }

    if (DECLARATIONS[name]) {
      const [open, close] = DECLARATIONS[name];
      return { html: open, rest: s.slice(end), close };
    }
    if (SIZES[name] != null) {
      return { html: `<span style="font-size:${SIZES[name]}em">`, rest: s.slice(end), close: '</span>' };
    }
    if (name === 'color') {
      const g = readGroup(s, end);
      if (g) return { html: `<span style="color:${safeColor(g.content)}">`, rest: s.slice(g.end), close: '</span>' };
    }

    if (WRAPPERS[name]) {
      const a = readArg(s, end);
      const [open, close] = WRAPPERS[name];
      return { html: open + renderInline(ctx, a.content) + close, end: a.end };
    }
    if (SYMBOLS[name] != null) {
      // TeX drops the spaces after a control word: "\textbackslash hline" → "\hline".
      if (/[a-zA-Z]$/.test(name)) while (s[end] === ' ' || s[end] === '\t') end++;
      return { html: SYMBOLS[name], end };
    }
    if (name === 'today') {
      return { html: esc(new Date().toLocaleDateString(ctx.names === NAMES.zh ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })), end };
    }

    switch (name) {
      case 'textcolor': {
        const o = readOptional(s, end); if (o) end = o.end;
        const col = readGroup(s, end); const txt = col && readArg(s, col.end);
        if (!txt) break;
        // The colour travels as a variable so the page can adapt it to a dark
        // theme without losing what the author wrote.
        return { html: `<span class="latex-color" style="--author-color:${safeColor(col.content, o && o.content)}">${renderInline(ctx, txt.content)}</span>`, end: txt.end };
      }
      case 'colorbox': {
        const col = readGroup(s, end); const txt = col && readArg(s, col.end);
        if (!txt) break;
        return { html: `<span class="latex-colorbox" style="background:${safeColor(col.content)}">${renderInline(ctx, txt.content)}</span>`, end: txt.end };
      }
      case 'href': {
        const u = readGroup(s, end); const t = u && readArg(s, u.end);
        if (!t) break;
        return { html: `<a href="${esc(safeUrl(unescapeUrl(u.content)))}">${renderInline(ctx, t.content)}</a>`, end: t.end };
      }
      case 'url': {
        const u = readGroup(s, end); if (!u) break;
        const url = unescapeUrl(u.content);
        return { html: `<a href="${esc(safeUrl(url))}" class="latex-url">${esc(url)}</a>`, end: u.end };
      }
      case 'footnote': {
        const o = readOptional(s, end); if (o) end = o.end;
        const a = readArg(s, end);
        ctx.footnotes.push(renderInline(ctx, a.content));
        const n = ctx.footnotes.length;
        return { html: `<sup class="latex-fn-ref" id="${ctx.uid}-fnref${n}"><a href="#${ctx.uid}-fn${n}">${n}</a></sup>`, end: a.end };
      }
      case 'includegraphics':
      case 'includegraphics*': {
        const o = readOptional(s, end); if (o) end = o.end;
        const p = readGroup(s, end); if (!p) break;
        return { html: imageTag(p.content.trim(), o ? o.content : ''), end: p.end };
      }
      case 'label': {
        const a = readGroup(s, end); if (!a) break;
        const key = a.content.trim();
        if (ctx.currentRef && !ctx.labels[key]) ctx.labels[key] = { ...ctx.currentRef };
        if (ctx.headingLabels && ctx.headingLabels.has(key)) return { html: '', end: a.end };
        return { html: `<span id="${esc(ctx.uid + '-' + key)}"></span>`, end: a.end };
      }
      case 'ref': case 'eqref': case 'autoref': case 'cref': case 'Cref': case 'pageref': case 'nameref': {
        const a = readGroup(s, end); if (!a) break;
        const keys = a.content.split(',').map(k => k.trim()).filter(Boolean);
        const html = keys.map(key => {
          const link = `<a class="latex-ref" href="#${esc(ctx.uid + '-' + key)}">${REF}${key}${REF}</a>`;
          if (name === 'eqref') return `(${link})`;
          if (name === 'ref' || name === 'pageref' || name === 'nameref') return link;
          return `${REF}@type:${key}${REF}${link}`;
        }).join(', ');
        return { html, end: a.end };
      }
      case 'cite': case 'citep': case 'citet': case 'parencite': case 'textcite': case 'autocite': {
        const o = readOptional(s, end); if (o) end = o.end;
        const o2 = readOptional(s, end); if (o2) end = o2.end;
        const a = readGroup(s, end); if (!a) break;
        const links = a.content.split(',').map(k => k.trim()).filter(Boolean).map(k =>
          `<a class="latex-cite-link" href="#${esc(ctx.uid + '-bib-' + k)}">${ctx.bib[k] || esc(k)}</a>`).join(', ');
        const note = (o2 || o) && (o2 || o).content.trim() ? ', ' + renderInline(ctx, (o2 || o).content) : '';
        return { html: `<span class="latex-cite">[${links}${note}]</span>`, end: a.end };
      }
      case 'caption': {
        const a = readArg(s, end);
        return { html: renderInline(ctx, a.content), end: a.end };
      }
      case 'begin': {
        // Inline environment (e.g. tabular inside a paragraph or cell).
        const g = readGroup(s, end); if (!g) break;
        const env = g.content.trim();
        const { bodyEnd, end: e } = findEnd(s, env, g.end);
        return { html: renderEnvironment(ctx, env, s.slice(g.end, bodyEnd)), end: e };
      }
      case 'end': {
        const g = readGroup(s, end);
        return { html: '', end: g ? g.end : end };
      }
    }

    // User macros from \newcommand / \def.
    const macro = ctx.macros[name];
    if (macro) {
      let body = macro.body;
      for (let k = 1; k <= macro.nargs; k++) {
        const a = readArg(s, end);
        body = body.split('#' + k).join(a.content);
        end = a.end;
      }
      return { html: renderInline(ctx, body), end };
    }

    if (DROP_ARGS[name] != null) {
      const o = readOptional(s, end); if (o) end = o.end;
      for (let k = 0; k < DROP_ARGS[name]; k++) {
        const g = readGroup(s, end); if (!g) break;
        end = g.end;
      }
      return { html: '', end };
    }

    // Unknown: keep the text of any immediately following {arguments}.
    let html = '';
    const o = readOptional(s, end);
    if (o && s[end] === '[') end = o.end;
    while (s[end] === '{') {
      const g = readGroup(s, end);
      html += renderInline(ctx, g.content);
      end = g.end;
    }
    return { html, end };
  }

  function unescapeUrl(u) {
    return u.trim().replace(/\\([#%&_~$])/g, '$1');
  }

  let userColors = {};
  function safeColor(c, model) {
    c = String(c || '').trim();
    if (model && /html/i.test(model) && /^[0-9a-fA-F]{6}$/.test(c)) return '#' + c;
    const named = (n) => userColors[n] || (/^[a-zA-Z]+$/.test(n) ? n : null);
    const mix = /^([a-zA-Z0-9]+)!(\d+)/.exec(c); // xcolor "red!60"
    if (mix && named(mix[1])) return `color-mix(in srgb, ${named(mix[1])} ${mix[2]}%, white)`;
    return named(c) || 'inherit';
  }

  // A post is the author's own, but a link should still only be able to point
  // somewhere — not run something.
  function safeUrl(u) {
    const v = String(u || '').trim();
    return /^(?:https?:|mailto:|tel:|#|\/|\.{0,2}\/|[^:]*$)/i.test(v) ? v : '#';
  }

  function imageTag(path, opts) {
    const style = [];
    const width = /(?:^|,)\s*width\s*=\s*([\d.]*)\s*\\(linewidth|textwidth|columnwidth|hsize)/.exec(opts);
    if (width) style.push(`width:${Math.round((parseFloat(width[1] || '1')) * 100)}%`);
    else {
      const abs = /(?:^|,)\s*width\s*=\s*([\d.]+)\s*(cm|mm|in|pt|em|px)/.exec(opts);
      if (abs) style.push(`width:${abs[1]}${abs[2]}`);
    }
    const height = /(?:^|,)\s*height\s*=\s*([\d.]+)\s*(cm|mm|in|pt|em|px)/.exec(opts);
    if (height) style.push(`height:${height[1]}${height[2]}`);
    const scale = /(?:^|,)\s*scale\s*=\s*([\d.]+)/.exec(opts);
    if (scale && !width) style.push(`width:${Math.min(100, Math.round(parseFloat(scale[1]) * 100))}%`);
    const alt = path.split('/').pop();
    return `<img class="latex-img" src="${esc(path)}" alt="${esc(alt)}" loading="lazy"${style.length ? ` style="${style.join(';')}"` : ''}>`;
  }

  window.parseLatex = parseLatex;
})();

// ── src/lint.js ──
// Errors and warnings for a post's source, shown in the editor's Problems list.
//
// Checks: unmatched \begin/\end, unbalanced braces, unclosed $ math,
// \ref / \cite to something that doesn't exist, duplicate \label, rows whose
// cell count doesn't match the tabular's column spec, missing front matter.
//
// window.lintSource(text) → [{ line, severity: 'error'|'warning', message }]
// Image paths are checked separately by the editor (it can look in the repo).
(function () {
  'use strict';

  const lineOf = (text, pos) => text.slice(0, pos).split('\n').length;

  // Blank out verbatim-ish content and comments so the structural checks don't
  // trip over them, keeping every character position (and line) intact.
  function mask(text) {
    let out = text;
    const blank = (s) => s.replace(/[^\n]/g, ' ');
    out = out.replace(/\\begin\{(verbatim\*?|lstlisting|minted)\}[\s\S]*?\\end\{\1\}/g, blank);
    out = out.replace(/\\(?:verb\*?|lstinline)([^a-zA-Z\s{])[\s\S]*?\1/g, blank);
    out = out.replace(/(^|[^\\])%[^\n]*/g, (m, p) => p + blank(m.slice(p.length)));
    return out;
  }

  function frontMatterProblems(text) {
    const out = [];
    const m = /^%[ \t]*---[ \t]*\n((?:%.*\n)*?)%[ \t]*---[ \t]*(?:\n|$)/.exec(text);
    if (!m) {
      out.push({ line: 1, severity: 'warning',
        message: 'No front matter: add a "% ---" block with title, date and tag' });
      return out;
    }
    const fields = m[1].split('\n').map(l => l.replace(/^%[ \t]?/, ''));
    const get = (k) => (fields.find(l => l.startsWith(k + ':')) || '').slice(k.length + 1).trim();
    if (!get('title')) out.push({ line: 2, severity: 'warning', message: 'Front matter has no title' });
    if (!get('date')) out.push({ line: 2, severity: 'warning', message: 'Front matter has no date' });
    else if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(get('date'))) {
      out.push({ line: 2, severity: 'warning', message: `Date "${get('date')}" is not YYYY-MM-DD` });
    }
    if (!get('tag')) out.push({ line: 2, severity: 'warning', message: 'Front matter has no tag (it decides the folder)' });
    return out;
  }

  function lintLatex(text) {
    const problems = [];
    const src = mask(text);

    // \begin / \end pairing
    const stack = [];
    const envRe = /\\(begin|end)\s*\{([^}]*)\}/g;
    for (let m; (m = envRe.exec(src));) {
      const name = m[2].trim();
      if (m[1] === 'begin') stack.push({ name, pos: m.index });
      else {
        const top = stack.pop();
        if (!top) problems.push({ line: lineOf(src, m.index), severity: 'error', message: `\\end{${name}} without \\begin{${name}}` });
        else if (top.name !== name) {
          problems.push({ line: lineOf(src, m.index), severity: 'error', message: `\\end{${name}} closes \\begin{${top.name}} (line ${lineOf(src, top.pos)})` });
        }
      }
    }
    stack.forEach(s => problems.push({ line: lineOf(src, s.pos), severity: 'error', message: `\\begin{${s.name}} is never closed` }));

    // braces
    const braces = [];
    for (let i = 0; i < src.length; i++) {
      if (src[i] === '\\') { i++; continue; }
      if (src[i] === '{') braces.push(i);
      else if (src[i] === '}' && !braces.pop()) {
        problems.push({ line: lineOf(src, i), severity: 'error', message: 'Unmatched "}"' });
      }
    }
    braces.slice(0, 3).forEach(i => problems.push({ line: lineOf(src, i), severity: 'error', message: 'Unclosed "{"' }));

    // $ … $ and \[ … \]
    let open = null;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === '\\') {
        if (src[i + 1] === '[') { if (!open) open = { pos: i, kind: '\\[' }; i++; continue; }
        if (src[i + 1] === ']') { if (open && open.kind === '\\[') open = null; i++; continue; }
        i++;
        continue;
      }
      if (c === '$') {
        const dd = src[i + 1] === '$';
        const kind = dd ? '$$' : '$';
        if (open && open.kind === kind) open = null;
        else if (!open) open = { pos: i, kind };
        if (dd) i++;
      }
    }
    if (open) problems.push({ line: lineOf(src, open.pos), severity: 'error', message: `Unclosed ${open.kind === '\\[' ? '\\[ … \\]' : open.kind + ' math'}` });

    // labels, refs, citations
    const labels = new Map();
    for (let m, re = /\\label\{([^}]*)\}/g; (m = re.exec(src));) {
      const key = m[1].trim();
      if (labels.has(key)) {
        problems.push({ line: lineOf(src, m.index), severity: 'warning', message: `Duplicate \\label{${key}} (first on line ${labels.get(key)})` });
      } else labels.set(key, lineOf(src, m.index));
    }
    for (let m, re = /\\(?:eq|auto|c|C|page|name)?ref\{([^}]*)\}/g; (m = re.exec(src));) {
      m[1].split(',').map(k => k.trim()).filter(Boolean).forEach(key => {
        if (!labels.has(key)) problems.push({ line: lineOf(src, m.index), severity: 'warning', message: `Reference to unknown label "${key}"` });
      });
    }
    const bib = new Set();
    for (let m, re = /\\bibitem\s*(?:\[[^\]]*\])?\{([^}]*)\}/g; (m = re.exec(src));) bib.add(m[1].trim());
    for (let m, re = /\\(?:cite|citep|citet|parencite|textcite|autocite)(?:\[[^\]]*\])*\{([^}]*)\}/g; (m = re.exec(src));) {
      m[1].split(',').map(k => k.trim()).filter(Boolean).forEach(key => {
        if (!bib.has(key)) {
          problems.push({ line: lineOf(src, m.index), severity: 'warning',
            message: bib.size ? `Citation "${key}" has no \\bibitem` : `Citation "${key}" but the post has no thebibliography` });
        }
      });
    }

    // TikZJax runs plain TeX with Computer Modern only.
    for (let m, re = /\\begin\{(tikzpicture|tikzcd)\}([\s\S]*?)\\end\{\1\}/g; (m = re.exec(src));) {
      const bad = /[^\x00-\x7F]/.exec(m[2]);
      if (bad) {
        problems.push({ line: lineOf(src, m.index + m[0].indexOf(bad[0])), severity: 'warning',
          message: `TikZ can't typeset "${bad[0]}": pictures are compiled by plain TeX, so labels must be ASCII` });
      }
    }

    // tabular rows vs column spec
    const tabRe = /\\begin\{(tabular\*?|tabularx|tabulary|longtable)\}/g;
    for (let m; (m = tabRe.exec(src));) {
      const endIdx = src.indexOf('\\end{' + m[1] + '}', m.index);
      const body = src.slice(m.index + m[0].length, endIdx < 0 ? src.length : endIdx);
      const specM = /^\s*(?:\{[^{}]*\}\s*)?(?:\[[^\]]*\]\s*)?\{([\s\S]*?)\}/.exec(body);
      if (!specM) continue;
      let spec = specM[1].replace(/[@!><]\{[^{}]*\}/g, '').replace(/\|/g, '');
      spec = spec.replace(/\*\{(\d+)\}\{([^{}]*)\}/g, (x, n, sub) => sub.repeat(+n));
      const cols = (spec.match(/[lcrpmbXSJ]/g) || []).length;
      if (!cols) continue;
      const rows = body.slice(specM[0].length).split(/\\\\/);
      let offset = m.index + m[0].length + specM[0].length;
      rows.forEach((row, i) => {
        const start = offset;
        offset += row.length + 2;
        const clean = row.replace(/\\(?:hline|toprule|midrule|bottomrule|addlinespace)\b/g, '')
          .replace(/\\(?:cline|cmidrule)\s*(?:\([^)]*\))?\s*\{[^}]*\}/g, '')
          .replace(/\\rowcolor\s*(?:\[[^\]]*\])?\s*\{[^}]*\}/g, '');
        if (!clean.trim() || i === rows.length - 1 && !clean.includes('&')) return;
        let count = 0, depth = 0;
        for (let j = 0; j < clean.length; j++) {
          const c = clean[j];
          if (c === '\\') { j++; continue; }
          if (c === '{') depth++;
          else if (c === '}') depth--;
          else if (c === '&' && depth === 0) count++;
        }
        let cells = count + 1;
        for (let mm, mre = /\\multicolumn\s*\{(\d+)\}/g; (mm = mre.exec(clean));) cells += +mm[1] - 1;
        if (cells !== cols) {
          problems.push({ line: lineOf(src, start + (row.length - row.trimStart().length)), severity: 'warning',
            message: `Row has ${cells} cell${cells === 1 ? '' : 's'}, but the table has ${cols} columns` });
        }
      });
    }

    return problems;
  }

  window.lintSource = function (text) {
    const problems = lintLatex(text).concat(frontMatterProblems(text));
    problems.sort((a, b) => a.line - b.line || (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
    return problems;
  };

  // Image paths a post references, for the editor to look up in the repo.
  window.referencedImages = function (text) {
    const out = [];
    const src = mask(text);
    const re = /\\includegraphics\*?\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g;
    for (let m; (m = re.exec(src));) {
      const path = m[1].trim();
      if (path && !/^(https?:|data:)/.test(path)) out.push({ path, line: lineOf(src, m.index) });
    }
    return out;
  };
})();

// ── src/bib.js ──
// References: parse BibTeX, fetch it for a DOI or arXiv id, and turn entries
// into the \bibitem lines the site's renderer shows.
//
// Browsers can reach doi.org's content negotiation (which also covers arXiv
// through its 10.48550 DOIs) but not arXiv's own API, so every lookup goes
// through https://doi.org/<doi> asking for application/x-bibtex.
//
// window.Bib = { parse, format, key, lookup, isLookup }
(function () {
  'use strict';

  // ── BibTeX ──
  function parse(text) {
    const entries = [];
    const re = /@(\w+)\s*\{\s*([^,\s]*)\s*,/g;
    for (let m; (m = re.exec(text));) {
      const fields = {};
      let i = m.index + m[0].length, depth = 1, key = '', value = '', inKey = true, quote = false;
      for (; i < text.length; i++) {
        const c = text[i];
        if (inKey) {
          if (c === '=') { inKey = false; value = ''; continue; }
          if (c === '}' && !key.trim()) { depth--; break; }
          if (c === ',') { key = ''; continue; }
          key += c;
          continue;
        }
        if (c === '{') { depth++; if (depth === 2) continue; }
        else if (c === '}') { depth--; if (depth === 1) continue; if (depth === 0) break; }
        else if (c === '"' && depth === 1) { quote = !quote; continue; }
        else if (c === ',' && depth === 1 && !quote) {
          fields[key.trim().toLowerCase()] = clean(value);
          key = ''; value = ''; inKey = true;
          continue;
        }
        value += c;
      }
      if (!inKey && key.trim()) fields[key.trim().toLowerCase()] = clean(value);
      entries.push({ type: m[1].toLowerCase(), key: m[2], fields });
      re.lastIndex = i;
    }
    return entries;
  }

  function clean(v) {
    return String(v).replace(/[{}]/g, '').replace(/\s+/g, ' ').trim().replace(/,$/, '');
  }

  // "Ho, Jonathan and Jain, Ajay" → ["Jonathan Ho", "Ajay Jain"]
  function authorList(raw) {
    if (!raw) return [];
    return raw.split(/\s+and\s+/i).map(a => {
      a = a.trim();
      if (a.includes(',')) {
        const [last, first] = a.split(',', 2);
        return `${first.trim()} ${last.trim()}`.trim();
      }
      return a;
    }).filter(Boolean);
  }

  // "Jonathan Ho" → "J. Ho"
  function abbreviate(name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return name;
    const last = parts.pop();
    return parts.map(p => (p.length > 1 && !p.endsWith('.') ? p[0] + '.' : p)).join(' ') + ' ' + last;
  }

  function venueOf(e) {
    const f = e.fields;
    const arxiv = arxivIdOf(e);
    const venue = f.booktitle || f.journal || f.journaltitle || f.school || f.institution ||
      (/^arxiv$/i.test(f.publisher || '') ? '' : f.publisher);
    if (venue) return venue;
    return arxiv ? `arXiv:${arxiv}` : (f.howpublished || '');
  }

  function arxivIdOf(e) {
    const f = e.fields;
    if (f.eprint && /^\d{4}\.\d{4,5}/.test(f.eprint)) return f.eprint;
    const doi = f.doi || '';
    const m = /10\.48550\/arxiv\.(.+)$/i.exec(doi);
    if (m) return m[1];
    const url = /arxiv\.org\/(?:abs|pdf)\/([^\s/]+)/i.exec(f.url || '');
    return url ? url[1].replace(/v\d+$/, '') : '';
  }

  // A stable, readable citation key: ho2020denoising
  function key(e) {
    if (e.key && !/^https?:/i.test(e.key) && !/^10\./.test(e.key)) return e.key;
    const first = authorList(e.fields.author)[0] || '';
    const last = (first.split(/\s+/).pop() || 'ref').toLowerCase().replace(/[^a-z]/g, '');
    const year = (e.fields.year || (e.fields.date || '').slice(0, 4) || '').replace(/\D/g, '');
    const word = (e.fields.title || '').split(/\s+/)
      .map(w => w.toLowerCase().replace(/[^a-z]/g, ''))
      .find(w => w.length > 3 && !['the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'towards'].includes(w)) || '';
    return `${last}${year}${word}` || 'ref';
  }

  // → "\bibitem{key} J. Ho, A. Jain. Title. In \emph{NeurIPS}, 2020."
  function format(e) {
    const f = e.fields;
    const authors = authorList(f.author).map(abbreviate);
    const people = authors.length > 6
      ? authors.slice(0, 3).join(', ') + ' et al.'
      : authors.join(', ');
    const title = (f.title || 'Untitled').replace(/\.$/, '');
    const venue = venueOf(e);
    const year = (f.year || (f.date || '').slice(0, 4) || '').replace(/\D/g, '');
    // Join with ". " without doubling a period ("et al." already ends with one).
    const bits = [people, title].filter(Boolean).map(x => x.replace(/\.$/, ''));
    let tail = '';
    if (venue) tail = /^arXiv:/i.test(venue) ? venue : `In \\emph{${venue}}`;
    if (tail && year) tail += `, ${year}`;
    else if (year) tail = year;
    return `\\bibitem{${key(e)}} ${bits.join('. ')}${tail ? '. ' + tail : ''}.`;
  }

  // ── Lookups ──
  const ARXIV = /(?:arxiv\.org\/(?:abs|pdf)\/|arxiv[:\s]+)?(\d{4}\.\d{4,5})(v\d+)?/i;
  const DOI = /(10\.\d{4,9}\/[^\s"'<>]+)/;

  function isLookup(text) {
    const t = text.trim();
    if (t.includes('@')) return false; // looks like BibTeX already
    return ARXIV.test(t) || DOI.test(t);
  }

  async function lookup(text) {
    const t = text.trim();
    let doi = (DOI.exec(t) || [])[1];
    if (!doi) {
      const a = ARXIV.exec(t);
      if (!a) throw new Error('Not a DOI or arXiv id');
      doi = `10.48550/arXiv.${a[1]}`;
    }
    doi = doi.replace(/[.,;]+$/, '');
    const resp = await fetch(`https://doi.org/${doi}`, { headers: { Accept: 'application/x-bibtex' } });
    if (!resp.ok) throw new Error(resp.status === 404 ? `Nothing found for ${doi}` : `Lookup failed (${resp.status})`);
    const bibtex = await resp.text();
    const entries = parse(bibtex);
    if (!entries.length) throw new Error('Could not read the returned BibTeX');
    return entries;
  }

  window.Bib = { parse, format, key, lookup, isLookup, authorList };
})();

// ── src/runtime.js ──
// hatex runtime: puts parseLatex() output into a page and does what the HTML
// can't do by itself — \resizebox fitting, TikZ pictures (pre-rendered SVG or
// live TikZJax), in-document links (\ref, \eqref, \cite, footnotes), copy
// buttons on code and click-to-zoom figures.
//
// window.HaTeX = { version, use, parse, render, enhance, lint, images, tikzSvgs, Bib }
(function () {
  'use strict';

  const DEFAULTS = {
    tikzSvgBase: 'tikz/', // pre-rendered pictures live at <tikzSvgBase><hash>.svg; null skips the lookup
    tikzLive: true,       // compile pictures without an SVG in the browser (TikZJax, ~6 MB on first use)
    tikzErrors: false,    // show TeX errors in place of a failed picture (listens to the console)
    tikzjaxBase: 'https://cdn.jsdelivr.net/npm/@drgrice1/tikzjax@1.0.0-beta24/dist/',
    copyButtons: true,
    zoom: true,
    animate: true,        // false: links jump without scrolling or flashing, zoom has no fade
  };
  const hasDOM = typeof document !== 'undefined';
  const optionsOf = new WeakMap(); // root element → options it was enhanced with

  // Hand in KaTeX / Prism where they aren't globals (Node, bundlers).
  function use(libs) {
    if (libs && libs.katex) window.katex = libs.katex;
    if (libs && libs.Prism) window.Prism = libs.Prism;
    return HaTeX;
  }

  function parse(source) {
    return window.parseLatex(source);
  }

  function render(target, source, options) {
    const root = typeof target === 'string' ? document.querySelector(target) : target;
    root.classList.add('hatex');
    root.innerHTML = parse(source);
    return enhance(root, options);
  }

  function enhance(root, options) {
    const opts = Object.assign({}, DEFAULTS, options);
    root.classList.add('hatex');
    optionsOf.set(root, opts);
    if (opts.tikzErrors) root.setAttribute('data-hatex-tikz-errors', '');
    fitBoxes(root);
    if (opts.copyButtons) addCopyButtons(root);
    if (opts.zoom) makeZoomable(root);
    loadTikz(root, opts);
    return root;
  }

  const rootOf = (el) => el.closest('.hatex');
  const optsFor = (el) => optionsOf.get(rootOf(el)) || DEFAULTS;
  const reducedMotion = () => hasDOM && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = (el) => reducedMotion() || optsFor(el).animate === false;
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ── \resizebox{\linewidth}{!}{...} ──
  // Scale the content down to the available width (not below 55%, after
  // which it scrolls instead).
  function fitBoxes(root) {
    requestAnimationFrame(() => {
      root.querySelectorAll('.latex-fit').forEach(box => {
        const inner = box.firstElementChild;
        if (!inner) return;
        inner.style.zoom = '';
        const avail = box.clientWidth, need = inner.scrollWidth;
        if (avail > 0 && need > avail) inner.style.zoom = Math.max(0.55, avail / need).toFixed(3);
      });
    });
  }

  // ── In-document links ──
  // \ref, \eqref, \cite and footnotes scroll to their target without touching
  // the URL, then flash it.
  function followLink(e) {
    const a = e.target.closest('.hatex a[href^="#tex"]');
    if (!a) return;
    const root = rootOf(a);
    let target = root.querySelector('#' + CSS.escape(a.getAttribute('href').slice(1)));
    if (!target) return;
    e.preventDefault();
    // Equation anchors are empty markers: flash the equation that follows.
    if (target.classList.contains('latex-anchor')) {
      const eq = target.nextElementSibling;
      if (eq && eq.classList.contains('katex-display')) target = eq;
    }
    if (still(a)) {
      target.scrollIntoView({ block: 'center' });
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.remove('latex-flash');
    void target.offsetWidth;
    target.classList.add('latex-flash');
  }

  // ── Code blocks ──
  function addCopyButtons(root) {
    root.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.hatex-copy')) return;
      const btn = document.createElement('button');
      btn.className = 'hatex-copy';
      btn.type = 'button';
      btn.textContent = 'copy';
      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code') || pre;
        try { await navigator.clipboard.writeText(code.textContent); btn.textContent = 'copied'; }
        catch (_) { btn.textContent = 'press ⌘C'; }
        setTimeout(() => { btn.textContent = 'copy'; }, 1400);
      });
      pre.appendChild(btn);
    });
  }

  // ── Click to zoom ──
  // TikZ pictures arrive after the rest, so this also runs when one lands.
  function makeZoomable(scope) {
    scope.querySelectorAll('img, .latex-tikz svg').forEach(el => {
      if (el.dataset.zoom) return;
      el.dataset.zoom = '1';
      el.classList.add('hatex-zoomable');
      el.addEventListener('click', () => openZoom(el));
    });
  }

  function openZoom(el) {
    const overlay = document.createElement('div');
    overlay.className = 'hatex-zoom';
    const instant = still(el);
    if (instant) overlay.style.transition = 'none';
    // The overlay sits outside .hatex, so it borrows the page's paper colour.
    const paper = getComputedStyle(el).getPropertyValue('--hx-paper').trim();
    if (paper) overlay.style.setProperty('--hx-paper', paper);
    const copy = el.cloneNode(true);
    copy.classList.remove('hatex-zoomable');
    copy.removeAttribute('style');
    overlay.appendChild(copy);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    const close = () => {
      overlay.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => overlay.remove(), instant ? 0 : 200);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
  }

  // ── TikZ ──
  // Each picture is <div class="latex-tikz" data-tikz-hash="…"> holding its
  // code in <script type="text/x-tikz">. A pre-rendered <hash>.svg is used
  // when there is one; otherwise TikZJax (real TeX in WebAssembly) compiles it.
  const tikzMissing = new Set(); // SVG URLs known not to exist
  const tikzFetched = new Map(); // SVG URL → its text, so a re-render puts it back without a flash
  const tikzCompiled = new Map(); // hash → SVG compiled in this session, so a re-render doesn't compile again
  const loaded = { fonts: false, script: false };

  function loadTikzFonts(base) {
    if (loaded.fonts) return;
    loaded.fonts = true;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = base + 'fonts.css';
    document.head.appendChild(css);
  }
  function loadTikzJaxScript(base) {
    loadTikzFonts(base);
    if (loaded.script) return;
    loaded.script = true;
    const js = document.createElement('script');
    js.src = base + 'tikzjax.js';
    document.head.appendChild(js);
  }

  // TeX sizes are in pt; show pictures 1.2× so their 10pt labels match the body text.
  function scaleTikzSvg(svg) {
    const w = parseFloat(svg && svg.getAttribute('width'));
    if (!w) return;
    svg.style.width = (w * 4 / 3 * 1.2).toFixed(1) + 'px';
    svg.style.height = 'auto';
  }

  async function prerenderedTikz(url) {
    if (tikzMissing.has(url)) return null;
    try {
      const resp = await fetch(url);
      const text = resp.ok ? await resp.text() : '';
      if (text.trim().startsWith('<svg')) {
        tikzFetched.set(url, text);
        return text;
      }
    } catch (_) {}
    tikzMissing.add(url);
    return null;
  }

  function loadTikz(root, opts) {
    root.querySelectorAll('.latex-tikz[data-tikz-hash]:not([data-tikz-state])').forEach(async (box) => {
      box.dataset.tikzState = 'loading';
      const pending = box.querySelector('script[type="text/x-tikz"]');
      const hash = box.dataset.tikzHash;
      const url = opts.tikzSvgBase != null ? opts.tikzSvgBase + hash + '.svg' : null;
      // Pictures seen before in this session go in synchronously.
      const svg = tikzCompiled.get(hash) || (url && tikzFetched.get(url)) ||
        (url ? await prerenderedTikz(url) : null);
      if (!box.isConnected) return;
      if (svg) {
        loadTikzFonts(opts.tikzjaxBase);
        box.innerHTML = svg;
        scaleTikzSvg(box.querySelector('svg'));
        box.dataset.tikzState = 'static';
        if (opts.zoom) makeZoomable(box);
        return;
      }
      if (!opts.tikzLive || !pending) {
        box.dataset.tikzState = 'missing';
        return;
      }
      // A fresh <script type="text/tikz"> is what TikZJax's observer picks up.
      box.appendChild(Object.assign(document.createElement('div'), { className: 'latex-tikz-status' }));
      const live = document.createElement('script');
      live.type = 'text/tikz';
      [...pending.attributes].forEach(a => { if (a.name !== 'type') live.setAttribute(a.name, a.value); });
      if (opts.tikzErrors) { live.setAttribute('data-show-console', 'true'); watchTikzConsole(); }
      live.textContent = pending.textContent;
      pending.replaceWith(live);
      box.dataset.tikzState = 'live';
      loadTikzJaxScript(opts.tikzjaxBase);
      updateTikzProgress();
    });
  }

  // TikZJax compiles one picture at a time and only on a reader's first
  // visit, so say how far along it is instead of showing bare spinners.
  function updateTikzProgress() {
    const boxes = [...document.querySelectorAll('.hatex .latex-tikz[data-tikz-state="live"]')];
    const done = document.querySelectorAll('.hatex .latex-tikz[data-tikz-state="compiled"]').length;
    const total = boxes.length + done;
    boxes.forEach((box, i) => {
      const label = box.querySelector('.latex-tikz-status');
      if (!label) return;
      label.textContent = total > 1
        ? `Compiling with TeX… ${done + 1} of ${total}${i ? ' (queued)' : ''}`
        : 'Compiling with TeX… (first time only)';
    });
  }

  function tikzFinished(e) {
    const box = e.target.closest && e.target.closest('.latex-tikz[data-tikz-hash]');
    if (!box) return;
    const hash = box.dataset.tikzHash;
    const svg = svgFile(e.target);
    tikzCompiled.set(hash, svg);
    // A re-render may have replaced this box while TeX was busy; its
    // successor, still waiting in the queue, takes the result now.
    const boxes = [...document.querySelectorAll(`.hatex .latex-tikz[data-tikz-hash="${hash}"][data-tikz-state="live"]`)];
    if (box.isConnected) {
      box.dataset.tikzState = 'compiled';
      delete box.dataset.tikzError;
      const label = box.querySelector('.latex-tikz-status');
      if (label) label.remove();
      scaleTikzSvg(e.target);
      if (optsFor(box).zoom) makeZoomable(box);
    }
    boxes.filter(b => b !== box).forEach(b => {
      b.innerHTML = svg;
      scaleTikzSvg(b.querySelector('svg'));
      b.dataset.tikzState = 'compiled';
      if (optsFor(b).zoom) makeZoomable(b);
    });
    updateTikzProgress();
    [...new Set([box, ...boxes])].filter(b => b.isConnected).forEach(b =>
      b.dispatchEvent(new CustomEvent('hatex:tikz', { bubbles: true, detail: { hash, svg } })));
  }

  // TeX prints its log to the console (data-show-console); pictures compile
  // one at a time, so a "!" line belongs to the picture still waiting.
  let consoleWatched = false;
  function watchTikzConsole() {
    if (consoleWatched) return;
    consoleWatched = true;
    ['log', 'error', 'warn'].forEach(kind => {
      const orig = console[kind].bind(console);
      console[kind] = (...args) => {
        try { noteTikzLog(args.map(a => (a && a.stack) || String(a)).join(' ')); } catch (_) {}
        orig(...args);
      };
    });
  }
  function noteTikzLog(line) {
    const failed = /^!\s?(.+)/m.exec(line);
    const crashed = line.includes('Could not find file input.dvi');
    if (!failed && !crashed) return;
    const box = document.querySelector('.hatex[data-hatex-tikz-errors] .latex-tikz[data-tikz-state="live"]');
    if (!box || box.dataset.tikzError) return;
    const message = failed ? failed[1].trim() : 'TeX could not produce the picture';
    // TeX stops at the first "!" error, so the picture will not appear.
    box.dataset.tikzError = message;
    box.dataset.tikzState = 'failed';
    box.innerHTML = `<div class="latex-tikz-error">TikZ: ${esc(message)}</div>`;
    updateTikzProgress();
    box.dispatchEvent(new CustomEvent('hatex:tikz-error', {
      bubbles: true, detail: { hash: box.dataset.tikzHash, message },
    }));
  }

  // The SVG file to save as <hash>.svg so the next visit skips compiling.
  function svgFile(svg) {
    const copy = svg.cloneNode(true);
    copy.removeAttribute('style');
    copy.removeAttribute('data-zoom');
    copy.classList.remove('hatex-zoomable');
    if (!copy.getAttribute('class')) copy.removeAttribute('class');
    return copy.outerHTML + '\n';
  }

  // Pictures in `root` that were compiled live in this session, as the files
  // to put under tikzSvgBase: [{ hash, file: '<hash>.svg', svg }].
  function tikzSvgs(root) {
    const hashes = [...root.querySelectorAll('.latex-tikz[data-tikz-hash]')].map(box => box.dataset.tikzHash);
    return [...new Set(hashes)].filter(h => tikzCompiled.has(h))
      .map(hash => ({ hash, file: hash + '.svg', svg: tikzCompiled.get(hash) }));
  }

  // ── Checks ──
  // Structural problems in a source: [{ line, severity, message }]. The blog
  // front-matter checks are left out unless asked for.
  function lint(source, options) {
    if (!window.lintSource) return [];
    const all = window.lintSource(source);
    return options && options.frontMatter ? all : all.filter(p => !/front matter/i.test(p.message));
  }

  // Local image paths the source refers to: [{ path, line }].
  function images(source) {
    return window.referencedImages ? window.referencedImages(source) : [];
  }

  if (hasDOM) {
    document.addEventListener('click', followLink);
    document.addEventListener('tikzjax-load-finished', tikzFinished);
    let queued = false;
    window.addEventListener('resize', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        document.querySelectorAll('.hatex').forEach(fitBoxes);
      });
    });
  }

  const HaTeX = {
    version: '1.1.1',
    use, parse, render, enhance, lint, images, tikzSvgs,
    Bib: window.Bib,
  };
  window.HaTeX = HaTeX;
  if (typeof module === 'object' && module && module.exports) module.exports = HaTeX;
})();
}).call(this, typeof window !== 'undefined' ? window : globalThis);
