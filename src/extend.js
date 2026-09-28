// Document classes and environments the core renderer (latex.js) doesn't
// know, added around it: two-column documents and multicols, beamer slide
// decks (frames, blocks, columns, title page), and vertical Chinese text
// (guji, vertical) with two-line interlinear notes (\jiazhu).
//
// The source is rewritten so that each boundary becomes an unnumbered
// heading holding a marker, \subsubsection*{@@HX…@@}. The core then renders
// the whole document as usual, so labels, citations and equation numbers
// stay document-wide, and the marker headings in its HTML are finally
// turned into wrappers. Rewrites keep the line count, so data-line
// attributes still point at the right source lines.
//
// window.hatexExtend = { prepare(source, options) → { source, info }, finish(html, info, inline) → html }
(function () {
  'use strict';

  const mark = (kind, arg, text) => `\\subsubsection*{@@HX${kind}${arg ? ' ' + arg : ''}@@${text || ''}}`;
  const lines = (s) => (s.match(/\n/g) || []).length;

  // Comments and verbatim-like content blanked to spaces, positions kept, so
  // searches never match inside them while edits still apply to the source.
  function masked(src) {
    const blank = (m) => m.replace(/[^\n]/g, ' ');
    return src
      .replace(/\\begin\{(verbatim\*?|lstlisting|minted)\}[\s\S]*?\\end\{\1\}/g, blank)
      .replace(/\\(?:verb\*?|lstinline)([^a-zA-Z\s{])[\s\S]*?\1/g, blank)
      .replace(/(^|[^\\])(%[^\n]*)/g, (m, p, c) => p + blank(c));
  }

  // {…} starting at i (after optional spaces and at most one line break).
  function group(m, src, i) {
    const ws = /^[ \t]*\n?[ \t]*/.exec(m.slice(i))[0];
    let j = i + ws.length;
    if (m[j] !== '{') return null;
    for (let k = j, depth = 0; k < m.length; k++) {
      const c = m[k];
      if (c === '\\') { k++; continue; }
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) return { text: src.slice(j + 1, k), end: k + 1 };
    }
    return null;
  }
  // […] or <…> starting at i (after optional spaces).
  function bracket(m, src, i, open, close) {
    const ws = /^[ \t]*/.exec(m.slice(i))[0];
    const j = i + ws.length;
    if (m[j] !== open) return null;
    for (let k = j + 1, depth = 0; k < m.length; k++) {
      const c = m[k];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === close && depth <= 0) return { text: src.slice(j + 1, k), end: k + 1 };
    }
    return null;
  }

  function prepare(source, options) {
    options = options || {};
    let src = String(source || '').replace(/\r\n?/g, '\n');
    // \frame{\titlepage} is the short form of a title frame.
    src = src.replace(/\\frame\s*\{\s*\\(titlepage|maketitle)\s*\}/g, '\\begin{frame}\\$1\\end{frame}');
    const m = masked(src);
    const info = { twocolumn: false, beamer: false, meta: {}, sections: [], size: [768, 576], paper: null, titleBlock: options.titleBlock !== false };
    const edits = []; // [start, end, replacement]
    const edit = (start, end, repl) => {
      const orig = src.slice(start, end);
      edits.push([start, end, repl + '\n'.repeat(Math.max(0, lines(orig) - lines(repl)))]);
    };
    const each = (re, fn) => { re.lastIndex = 0; for (let x; (x = re.exec(m));) fn(x); };

    // ── Document class ──
    const cls = /\\documentclass\s*(?:\[([^\]]*)\])?\s*\{([^}]*)\}/.exec(m);
    if (cls) {
      const opts = src.slice(cls.index, cls.index + cls[0].length).match(/\[([^\]]*)\]/);
      const list = opts ? opts[1].split(',').map(s => s.trim()) : [];
      info.beamer = cls[2].trim() === 'beamer';
      const name = cls[2].trim();
      info.twocolumn = !info.beamer && (list.includes('twocolumn') ||
        // IEEE's class is two-column unless told otherwise; ACM's in its
        // proceedings formats.
        (name === 'IEEEtran' && !list.includes('onecolumn') && !list.includes('draftcls')) ||
        (name === 'acmart' && list.some(o => /^(sigconf|sigplan)$/.test(o))));
      // Slide sizes are beamer's own (in mm, 6px per mm), so text keeps the
      // same proportion to the slide in every format; W:H (for example
      // aspectratio=1:1) gives a slide about 560px tall.
      const ar = list.map(o => /^aspectratio\s*=\s*([\d.]+)(?::([\d.]+))?$/.exec(o)).find(Boolean);
      const SIZES = { 169: [160, 90], 1610: [160, 100], 149: [140, 90], 141: [148.5, 105], 54: [125, 100],
        43: [128, 96], 32: [135, 90], 219: [210, 90], 2013: [200, 130], 1: [96, 96] };
      let mm = ar && !ar[2] && SIZES[ar[1]];
      if (ar && ar[2] && +ar[1] > 0 && +ar[2] > 0) mm = [93 * ar[1] / ar[2], 93];
      mm = mm || SIZES[43];
      info.size = [Math.round(mm[0] * 6), Math.round(mm[1] * 6)];
      edit(cls.index, cls.index + cls[0].length, '');
    }
    if (!info.beamer && /\\begin\{frame\}/.test(m)) info.beamer = true;
    // Conference styles that set the paper in two columns themselves: ACL
    // (and EMNLP, NAACL, which use it), AAAI, IJCAI, ICASSP/Interspeech.
    each(/\\usepackage\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g, (x) => {
      if (!info.beamer && x[1].split(',').some(p => /^(acl|aaai\d*|ijcai\d*|spconf)$/.test(p.trim()))) info.twocolumn = true;
    });
    each(/\\(twocolumn|onecolumn)(?![a-zA-Z])/g, (x) => {
      if (x[1] === 'twocolumn') info.twocolumn = !info.beamer;
      // \twocolumn[…] sets its argument across both columns: keep what is in
      // it, drop the brackets.
      const b = bracket(m, src, x.index + x[0].length, '[', ']');
      if (b) {
        const open = src.indexOf('[', x.index + x[0].length);
        edit(x.index, open + 1, '');
        edit(b.end - 1, b.end, '');
      } else edit(x.index, x.index + x[0].length, '');
    });
    // \vskip 0.3in: the core drops the command; the length goes too.
    each(/\\vskip\s*-?[\d.]+\s*(?:pt|in|cm|mm|em|ex|bp|pc|sp)(?:\s*(?:plus|minus)\s*-?[\d.]+\s*(?:pt|in|cm|mm|em|ex|fil+))*/g,
      (x) => edit(x.index, x.index + x[0].length, ''));
    if (!info.beamer) preparePaper(src, m, info, edit, each);
    if (!info.beamer && (options.bib || options.bbl)) prepareBibliography(src, m, info, edit, each, options);

    // ── multicols, and figure*/table* spanning both columns ──
    each(/\\begin\{multicols\*?\}/g, (x) => {
      const n = group(m, src, x.index + x[0].length);
      const pre = n && bracket(m, src, n.end, '[', ']');
      const end = pre ? pre.end : n ? n.end : x.index + x[0].length;
      const cols = Math.min(4, Math.max(1, parseInt(n && n.text, 10) || 2));
      edit(x.index, end, (pre ? '\\par ' + pre.text + '\\par ' : '') + mark('COLS', String(cols)));
    });
    each(/\\end\{multicols\*?\}/g, (x) => edit(x.index, x.index + x[0].length, mark('COLSEND')));
    each(/\\columnbreak(?![a-zA-Z])/g, (x) => edit(x.index, x.index + x[0].length, mark('COLBREAK')));
    each(/\\begin\{(figure|table)\*\}/g, (x) => edit(x.index, x.index, mark('SPAN') + ' '));
    each(/\\end\{(figure|table)\*\}/g, (x) => edit(x.index + x[0].length, x.index + x[0].length, ' ' + mark('SPANEND')));

    // ── Blocks and columns (beamer's, usable anywhere) ──
    each(/\\begin\{(block|alertblock|exampleblock)\}/g, (x) => {
      const t = group(m, src, x.index + x[0].length);
      const kind = { block: 'plain', alertblock: 'alert', exampleblock: 'example' }[x[1]];
      edit(x.index, t ? t.end : x.index + x[0].length, mark('BLOCK', kind, t ? t.text : ''));
    });
    each(/\\end\{(block|alertblock|exampleblock)\}/g, (x) => edit(x.index, x.index + x[0].length, mark('BLOCKEND')));
    each(/\\begin\{columns\}/g, (x) => {
      const o = bracket(m, src, x.index + x[0].length, '[', ']');
      const top = o && /\b[tT]\b/.test(o.text);
      edit(x.index, o ? o.end : x.index + x[0].length, mark('COLUMNS', top ? 'top' : ''));
    });
    each(/\\end\{columns\}/g, (x) => edit(x.index, x.index + x[0].length, mark('COLUMNSEND')));
    each(/\\begin\{column\}/g, (x) => {
      const o = bracket(m, src, x.index + x[0].length, '[', ']');
      const w = group(m, src, o ? o.end : x.index + x[0].length);
      const f = w && /^\s*([\d.]*)\s*\\(?:textwidth|linewidth|columnwidth|paperwidth)/.exec(w.text);
      const pct = f ? Math.round(parseFloat(f[1] || '1') * 1000) / 10 : 0;
      edit(x.index, w ? w.end : x.index + x[0].length, mark('COLUMN', pct ? String(pct) : ''));
    });
    each(/\\end\{column\}/g, (x) => edit(x.index, x.index + x[0].length, mark('COLUMNEND')));

    // ── Vertical text: guji (a manuscript-scroll page) and vertical ──
    each(/\\begin\{(guji|vertical)\}/g, (x) => {
      const o = bracket(m, src, x.index + x[0].length, '[', ']');
      const chars = o && parseInt(o.text, 10);
      edit(x.index, o ? o.end : x.index + x[0].length, mark(x[1] === 'guji' ? 'GUJI' : 'VERT', chars > 0 ? String(chars) : ''));
    });
    each(/\\end\{(guji|vertical)\}/g, (x) => edit(x.index, x.index + x[0].length, mark(x[1] === 'guji' ? 'GUJIEND' : 'VERTEND')));
    // \jiazhu{…}: a two-line interlinear note. It rides through the core
    // renderer as small caps with a marker, and becomes its own span later.
    each(/\\jiazhu(?![a-zA-Z])/g, (x) => {
      const g = group(m, src, x.index + x[0].length);
      if (g) edit(x.index, g.end, '\\textsc{@@HXJZ@@' + g.text + '}');
    });

    if (info.beamer) prepareBeamer(src, m, info, edit, each);

    edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    for (const [s, e, r] of edits) src = src.slice(0, s) + r + src.slice(e);
    // Appended, not prepended, so every line keeps its number.
    if (info.beamer) src += '\n\\definecolor{hxalert}{HTML}{B3261E}';
    return { source: src, info };
  }

  // ── Papers: the title block ──
  // \title, \author (\and, \And, \AND, \thanks), \date, AAAI's \affiliations,
  // and ICML's \icmltitle / \icmlauthor / \icmlaffiliation, shown where
  // \maketitle (or \icmltitle) stands. The core drops them all otherwise.
  function preparePaper(src, m, info, edit, each) {
    const p = { title: null, author: null, date: null, affiliations: null, icml: null, at: -1 };
    const arg = (x) => {
      const short = bracket(m, src, x.index + x[0].length, '[', ']');
      return group(m, src, short ? short.end : x.index + x[0].length);
    };
    const authors = []; // every \author, for ACM's one-per-author style
    each(/\\(title|author|date|affiliations)(?![a-zA-Z])/g, (x) => {
      const g = arg(x); if (!g) return;
      p[x[1]] = g.text;
      if (x[1] === 'author') authors.push({ at: x.index, name: g.text, lines: [] });
      edit(x.index, g.end, '');
    });
    // ACM: \email, \affiliation{\institution{…}\city{…}…} and \orcid follow
    // the \author they belong to.
    each(/\\(email|affiliation|additionalaffiliation|orcid)(?![a-zA-Z])/g, (x) => {
      const g = group(m, src, x.index + x[0].length); if (!g) return;
      const owner = authors.filter(a => a.at < x.index).pop();
      if (owner && x[1] !== 'orcid') {
        const parts = [];
        g.text.replace(/\\(institution|department|city|state|country)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (all, k, v) => { parts.push(v.trim()); return ''; });
        owner.lines.push(x[1] === 'email' ? `\\texttt{${g.text.trim()}}` : parts.length ? parts.join(', ') : g.text.trim());
      }
      edit(x.index, g.end, '');
    });
    if (authors.length > 1 || authors.some(a => a.lines.length)) p.authors = authors;
    each(/\\begin\{CCSXML\}[\s\S]*?\\end\{CCSXML\}/g, (x) => edit(x.index, x.index + x[0].length, ''));
    each(/\\(ccsdesc|acmBooktitle|acmConference|acmDOI|acmISBN|acmPrice|acmYear|copyrightyear|setcopyright|received|settopmatter|shortauthors)(?![a-zA-Z])\*?/g, (x) => {
      let i = x.index + x[0].length;
      for (let n = 0; n < 4; n++) {
        const o = bracket(m, src, i, '[', ']'); if (o) { i = o.end; continue; }
        const g = /^\s*\{/.test(m.slice(i, i + 40)) ? group(m, src, i) : null; if (g) { i = g.end; continue; }
        break;
      }
      edit(x.index, i, '');
    });
    each(/\\keywords(?![a-zA-Z])/g, (x) => {
      const g = group(m, src, x.index + x[0].length); if (!g) return;
      edit(x.index, g.end, `\\par\\noindent\\textbf{Keywords:} ${g.text.replace(/\s*\n\s*/g, ' ')}\\par`);
    });
    // ICML
    const icml = { authors: [], affils: [], symbols: {}, corr: [] };
    each(/\\icmltitle(?![a-zA-Z])/g, (x) => {
      const g = group(m, src, x.index + x[0].length); if (!g) return;
      p.title = g.text; if (p.at < 0) p.at = x.index;
      edit(x.index, g.end, '');
    });
    each(/\\icmlauthor(?![a-zA-Z])/g, (x) => {
      const a = group(m, src, x.index + x[0].length), b = a && group(m, src, a.end); if (!b) return;
      icml.authors.push({ name: a.text, keys: b.text.split(',').map(k => k.trim()).filter(Boolean) });
      edit(x.index, b.end, '');
    });
    each(/\\icmlaffiliation(?![a-zA-Z])/g, (x) => {
      const a = group(m, src, x.index + x[0].length), b = a && group(m, src, a.end); if (!b) return;
      icml.affils.push({ key: a.text.trim(), text: b.text });
      edit(x.index, b.end, '');
    });
    each(/\\icmlsetsymbol(?![a-zA-Z])/g, (x) => {
      const a = group(m, src, x.index + x[0].length), b = a && group(m, src, a.end); if (!b) return;
      icml.symbols[a.text.trim()] = b.text.trim();
      edit(x.index, b.end, '');
    });
    each(/\\icmlcorrespondingauthor(?![a-zA-Z])/g, (x) => {
      const a = group(m, src, x.index + x[0].length), b = a && group(m, src, a.end); if (!b) return;
      icml.corr.push(`${a.text} (${b.text})`);
      edit(x.index, b.end, '');
    });
    // The rest of ICML's title-block commands carry nothing to show.
    each(/\\(icmltitlerunning|icmlkeywords|printAffiliationsAndNotice)(?![a-zA-Z])/g, (x) => {
      const g = group(m, src, x.index + x[0].length);
      edit(x.index, g ? g.end : x.index + x[0].length, '');
    });
    each(/\\(begin|end)\{icmlauthorlist\}/g, (x) => edit(x.index, x.index + x[0].length, ''));
    if (icml.authors.length) p.icml = icml;
    each(/\\maketitle(?![a-zA-Z])/g, (x) => {
      if (p.at < 0) {
        // ACM writes the abstract before \maketitle; the title still comes first.
        const doc = m.indexOf('\\begin{document}');
        const abs = m.indexOf('\\begin{abstract}', doc < 0 ? 0 : doc);
        p.at = abs >= 0 && abs < x.index ? abs : x.index;
      }
      edit(x.index, x.index + x[0].length, '');
    });
    if (p.at >= 0 && info.titleBlock && (p.title || p.author || p.icml || p.authors)) {
      info.paper = p;
      edit(p.at, p.at, mark('TITLEBLOCK'));
    }
  }

  // Top-level {…} after position i in plain text (no masking needed here).
  function braced(t, i) {
    if (t[i] !== '{') return null;
    for (let k = i, d = 0; k < t.length; k++) {
      if (t[k] === '\\') { k++; continue; }
      if (t[k] === '{') d++;
      else if (t[k] === '}' && --d === 0) return { text: t.slice(i + 1, k), end: k + 1 };
    }
    return null;
  }

  // IEEE: \IEEEauthorblockN{name}\IEEEauthorblockA{affiliation} → name \\ affiliation
  function ieee(t) {
    for (const [cmd, after] of [['\\IEEEauthorblockN', '\\\\ '], ['\\IEEEauthorblockA', '']]) {
      let out = '', i = 0;
      for (let k; (k = t.indexOf(cmd, i)) >= 0;) {
        const g = braced(t, k + cmd.length + (/^\s*/.exec(t.slice(k + cmd.length))[0].length));
        if (!g) break;
        out += t.slice(i, k) + g.text + after;
        i = g.end;
      }
      t = out + t.slice(i);
    }
    return t;
  }

  function titleBlock(p, inline) {
    const notes = [];
    const SYM = ['*', '†', '‡', '§', '¶', '‖'];
    // \thanks{…} becomes a symbol, and its text a note under the authors.
    const thanks = (t) => {
      let out = '', i = 0;
      for (let k; (k = t.indexOf('\\thanks', i)) >= 0;) {
        const g = braced(t, k + 7 + (/^\s*/.exec(t.slice(k + 7))[0].length));
        if (!g) break;
        const sym = SYM[notes.length % SYM.length];
        notes.push(`<span class="hatex-sym">${sym}</span>${inline(g.text)}`);
        out += t.slice(i, k) + `\\textsuperscript{${sym}}`;
        i = g.end;
      }
      return out + t.slice(i);
    };
    let authors = '', affils = '';
    if (p.icml) {
      const order = [];
      p.icml.authors.forEach(a => a.keys.forEach(k => { if (!p.icml.symbols[k] && !order.includes(k)) order.push(k); }));
      const used = new Set();
      authors = p.icml.authors.map(a => {
        const marks = a.keys.map(k => { if (p.icml.symbols[k]) { used.add(k); return p.icml.symbols[k]; } const n = order.indexOf(k); return n >= 0 ? String(n + 1) : ''; })
          .filter(Boolean).join(',');
        return `<span class="hatex-author-name">${inline(a.name)}${marks ? `<sup>${marks}</sup>` : ''}</span>`;
      }).join('<span class="hatex-author-sep">, </span>');
      authors = `<div class="hatex-authors hatex-authors-inline">${authors}</div>`;
      affils = order.map((k, n) => {
        const af = p.icml.affils.find(a => a.key === k);
        return af ? `<div><sup>${n + 1}</sup>${inline(af.text)}</div>` : '';
      }).join('');
      if (used.has('equal') || Object.keys(p.icml.symbols).some(k => used.has(k))) {
        Object.keys(p.icml.symbols).filter(k => used.has(k)).forEach(k =>
          notes.push(`<span class="hatex-sym">${p.icml.symbols[k]}</span>${k === 'equal' ? 'Equal contribution' : inline(k)}`));
      }
      if (p.icml.corr.length) notes.push('Correspondence to: ' + p.icml.corr.map(c => inline(c)).join('; '));
    } else if (p.authors) {
      authors = '<div class="hatex-authors">' + p.authors.map(a =>
        `<div class="hatex-author"><div class="hatex-author-name">${inline(thanks(a.name))}</div>` +
        (a.lines.length ? `<div class="hatex-author-affil">${a.lines.map(l => inline(l)).join('<br>')}</div>` : '') + '</div>').join('') + '</div>';
    } else if (p.author && /\\affiliations(?![a-zA-Z{])/.test(p.author)) {
      // IJCAI: \author{A \and B \affiliations … \emails …}
      const [names, rest] = p.author.split(/\\affiliations(?![a-zA-Z])/);
      const [aff, emails] = rest.split(/\\emails(?![a-zA-Z])/);
      authors = `<div class="hatex-authors hatex-authors-inline">${thanks(names).split(/\\(?:and|And|AND)(?![a-zA-Z])/).map(n => `<span class="hatex-author-name">${inline(n.trim())}</span>`).join('<span class="hatex-author-sep">, </span>')}</div>`;
      affils = aff.split(/\\\\(?:\s*\[[^\]]*\])?/).map(l => l.trim()).filter(Boolean).map(l => `<div>${inline(l)}</div>`).join('') +
        (emails && emails.trim() ? `<div>${inline(emails.trim())}</div>` : '');
    } else if (p.author) {
      const blocks = thanks(ieee(p.author)).split(/\\(?:and|And|AND)(?![a-zA-Z])/).map(b => b.trim()).filter(Boolean);
      authors = '<div class="hatex-authors">' + blocks.map(b => {
        const lines = b.split(/\\\\(?:\s*\[[^\]]*\])?/).map(l => l.trim()).filter(Boolean);
        return `<div class="hatex-author"><div class="hatex-author-name">${inline(lines[0] || '')}</div>` +
          (lines.length > 1 ? `<div class="hatex-author-affil">${lines.slice(1).map(l => inline(l)).join('<br>')}</div>` : '') + '</div>';
      }).join('') + '</div>';
      if (p.affiliations) affils = p.affiliations.split(/\\\\(?:\s*\[[^\]]*\])?/).map(l => l.trim()).filter(Boolean).map(l => `<div>${inline(l)}</div>`).join('');
    }
    const title = p.title ? `<div class="hatex-title" role="heading" aria-level="1">${inline(thanks(p.title).replace(/\\\\(?:\s*\[[^\]]*\])?/g, ' '))}</div>` : '';
    const date = p.date && p.date.trim() && !/^\\today\s*$/.test(p.date.trim()) ? `<div class="hatex-date">${inline(p.date)}</div>` : '';
    return `<div class="hatex-span hatex-titleblock">${title}${authors}` +
      (affils ? `<div class="hatex-affiliations">${affils}</div>` : '') + date +
      (notes.length ? `<div class="hatex-title-notes">${notes.map(n => `<div>${n}</div>`).join('')}</div>` : '') + '</div>';
  }

  // ── Papers: the bibliography from a .bbl or a .bib ──
  // \bibliography{…} (or biblatex's \printbibliography) is replaced by the
  // .bbl as given, or by a thebibliography built from the .bib with the
  // entries the text cites: author-year labels for natbib's \citep/\citet
  // styles, numbers otherwise. It is set on one line, so the lines after it
  // keep their numbers.
  function prepareBibliography(src, m, info, edit, each, options) {
    const at = /\\(?:bibliography\s*\{[^}]*\}|printbibliography(?:\s*\[[^\]]*\])?)/.exec(m);
    if (!at) return;
    let bib = '';
    if (options.bbl) {
      bib = String(options.bbl).replace(/(^|[^\\])%[^\n]*/g, '$1');
    } else if (window.Bib) {
      const entries = window.Bib.parse(String(options.bib));
      const byKey = new Map(entries.map(e => [e.key, e]));
      const cited = [];
      let all = false;
      each(/\\(?:no)?cite[a-zA-Z]*\*?\s*(?:\[[^\]]*\]\s*){0,2}\{([^}]*)\}/g, (x) => {
        x[1].split(',').map(k => k.trim()).filter(Boolean).forEach(k => {
          if (k === '*') all = true; else if (!cited.includes(k)) cited.push(k);
        });
      });
      const keys = (all ? cited.concat(entries.map(e => e.key).filter(k => !cited.includes(k))) : cited).filter(k => byKey.has(k));
      const style = (/\\bibliographystyle\s*\{([^}]*)\}/.exec(m) || [])[1] || '';
      const natOpts = (/\\usepackage\s*\[([^\]]*)\]\s*\{natbib\}/.exec(m) || [])[1] || '';
      const numeric = /\bnumbers\b/.test(natOpts) || !/\\cite[pt]\b|\\citeauthor\b|\\citealp\b/.test(m) ||
        /^(plain|unsrt|abbrv|alpha)$|^(ieee|IEEE|splncs|ACM-Reference-Format)/.test(style.trim());
      const last = (a) => a.replace(/[{}]/g, '').trim().split(/\s+/).pop() || '';
      const year = (e) => (e.fields.year || (e.fields.date || '').slice(0, 4) || '').replace(/[^\d]/g, '') || 'n.d.';
      const shortOf = (e) => {
        const a = window.Bib.authorList(e.fields.author || e.fields.editor || '').map(last);
        return a.length === 0 ? (e.fields.title || e.key).split(/\s+/).slice(0, 3).join(' ') :
          a.length === 1 ? a[0] : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a[0]} et~al.`;
      };
      let list = keys.map(k => byKey.get(k));
      if (!numeric) list.sort((a, b) => shortOf(a).localeCompare(shortOf(b)) || year(a).localeCompare(year(b)));
      const seen = {};
      list.forEach(e => { const t = shortOf(e) + '|' + year(e); seen[t] = (seen[t] || 0) + 1; });
      const n = {};
      const items = list.map(e => {
        const text = window.Bib.format(e).replace(/^\\bibitem\{[^}]*\}\s*/, '');
        let label = '';
        if (!numeric) {
          const t = shortOf(e) + '|' + year(e);
          const suffix = seen[t] > 1 ? String.fromCharCode(97 + (n[t] = (n[t] || 0) + 1) - 1) : '';
          label = `[${shortOf(e)}(${year(e)}${suffix})]`;
        }
        return `\\bibitem${label}{${e.key}} ${text}`;
      });
      if (items.length) bib = `\\begin{thebibliography}{${items.length}} ${items.join(' ')} \\end{thebibliography}`;
    }
    if (bib) edit(at.index, at.index + at[0].length, bib.replace(/\s*\n\s*/g, ' ').trim());
  }

  function prepareBeamer(src, m, info, edit, each) {
    // Title page data; the core drops \title and friends, so they are kept here.
    each(/\\(title|subtitle|author|institute|date)(?![a-zA-Z])/g, (x) => {
      const short = bracket(m, src, x.index + x[0].length, '[', ']');
      const g = group(m, src, short ? short.end : x.index + x[0].length);
      if (!g) return;
      info.meta[x[1]] = g.text;
      if (short) info.meta[x[1] + 'Short'] = short.text;
      edit(x.index, g.end, '');
    });
    // Sections live between frames: they feed \tableofcontents.
    each(/\\(section|subsection)\*?(?![a-zA-Z])/g, (x) => {
      const short = bracket(m, src, x.index + x[0].length, '[', ']');
      const g = group(m, src, short ? short.end : x.index + x[0].length);
      if (!g) return;
      if (x[1] === 'section') info.sections.push(short ? short.text : g.text);
      edit(x.index, g.end, '');
    });
    // Frames.
    let n = 0;
    each(/\\begin\{frame\}/g, (x) => {
      let i = x.index + x[0].length;
      const ov = bracket(m, src, i, '<', '>'); if (ov) i = ov.end;
      const opt = bracket(m, src, i, '[', ']'); if (opt) i = opt.end;
      const title = group(m, src, i); if (title) i = title.end;
      const sub = title && group(m, src, i); if (sub) i = sub.end;
      const flags = [];
      if (opt) {
        const o = opt.text.split(',').map(s => s.trim());
        if (o.includes('plain')) flags.push('plain');
        if (o.includes('t')) flags.push('top');
        if (o.includes('b')) flags.push('bottom');
      }
      n++;
      edit(x.index, i, mark('SLIDE', [n].concat(flags).join(' ')) +
        (title ? mark('TITLE', '', title.text) : '') + (sub ? mark('SUBTITLE', '', sub.text) : ''));
    });
    each(/\\end\{frame\}/g, (x) => edit(x.index, x.index + x[0].length, mark('SLIDEEND')));
    each(/\\(frametitle|framesubtitle)(?![a-zA-Z])/g, (x) => {
      const ov = bracket(m, src, x.index + x[0].length, '<', '>');
      const g = group(m, src, ov ? ov.end : x.index + x[0].length);
      if (g) edit(x.index, g.end, mark(x[1] === 'frametitle' ? 'TITLE' : 'SUBTITLE', '', g.text));
    });
    each(/\\(titlepage|maketitle)(?![a-zA-Z])/g, (x) => edit(x.index, x.index + x[0].length, mark('TITLEPAGE')));
    each(/\\tableofcontents(?![a-zA-Z])(\s*\[[^\]]*\])?/g, (x) => edit(x.index, x.index + x[0].length, mark('TOC')));
    // Overlays: every step is shown at once.
    each(/\\pause(?![a-zA-Z])(\s*\[[^\]]*\])?/g, (x) => edit(x.index, x.index + x[0].length, ''));
    each(/(\\(?:item|only|onslide|uncover|visible|invisible|alt|temporal|alert|structure|action|textbf|textit|emph|color|textcolor|includegraphics|frametitle|framesubtitle|begin\{(?:block|alertblock|exampleblock|itemize|enumerate)\})\*?)\s*<[^<>{}\n$\\]*>/g,
      (x) => edit(x.index + x[1].length, x.index + x[0].length, ''));
    each(/\\onslide(?![a-zA-Z])(?!\s*[<{])/g, (x) => edit(x.index, x.index + x[0].length, ''));
    each(/\\(note)(?![a-zA-Z])/g, (x) => {
      const o = bracket(m, src, x.index + x[0].length, '[', ']');
      const g = group(m, src, o ? o.end : x.index + x[0].length);
      if (g) edit(x.index, g.end, '');
    });
    each(/\\alert(?![a-zA-Z])/g, (x) => edit(x.index, x.index + x[0].length, '\\textcolor{hxalert}'));
    each(/\\structure(?![a-zA-Z])/g, (x) => edit(x.index, x.index + x[0].length, '\\textbf'));
  }

  // ── HTML ──
  const MARK_RE = /<h4\b[^>]*>\s*(?:<span class="latex-line"[^>]*><\/span>\s*)*@@HX([A-Z]+)(?: ([^@]*))?@@\s*([\s\S]*?)<\/h4>/g;

  function wrappers(html) {
    return html.replace(MARK_RE, (all, kind, arg = '', text) => {
      switch (kind) {
        case 'COLS': return `<div class="hatex-cols hatex-multicols" style="--hx-cols:${+arg || 2}"><div class="hatex-cols-flow">`;
        case 'COLSEND': return '</div></div>';
        case 'COLBREAK': return '<div class="hatex-colbreak"></div>';
        case 'SPAN': return '<div class="hatex-span">';
        case 'SPANEND': return '</div>';
        case 'BLOCK': return `<div class="hatex-block ${arg}">` + (text.trim() ? `<div class="hatex-block-title">${text}</div>` : '') + '<div class="hatex-block-body">';
        case 'BLOCKEND': return '</div></div>';
        case 'COLUMNS': return `<div class="hatex-columns${arg ? ' ' + arg : ''}">`;
        case 'COLUMN': return `<div class="hatex-column"${+arg ? ` style="flex:0 1 ${+arg}%"` : ''}>`;
        case 'COLUMNEND': case 'COLUMNSEND': return '</div>';
        case 'GUJI': return `<div class="hatex-guji-wrap"><div class="hatex-guji"${+arg ? ` style="--hx-guji-chars:${+arg}"` : ''}>`;
        case 'GUJIEND': return '</div></div>';
        case 'VERT': return `<div class="hatex-vertical-wrap"><div class="hatex-vertical"${+arg ? ` style="--hx-guji-chars:${+arg}"` : ''}>`;
        case 'VERTEND': return '</div></div>';
        default: return all; // slide markers, handled by deck()
      }
    });
  }

  // Old books have no modern punctuation: a reader marks a full stop with a
  // small circle beside the character (句) and a pause with a dot (讀), and
  // there are no quotation or title marks. Inside guji, punctuation becomes
  // those marks (the original character stays in the text for copying).
  const HEAD = '<h4\\b[^>]*>\\s*(?:<span class="latex-line"[^>]*><\\/span>\\s*)*';
  const GUJI_RE = new RegExp('(' + HEAD + '@@HXGUJI(?: [^@]*)?@@[\\s\\S]*?<\\/h4>)([\\s\\S]*?)(' + HEAD + '@@HXGUJIEND@@)', 'g');
  function judou(body) {
    return body.replace(/(<[^>]*>)|([，、；：,;:])|([。！？.!?])|([「」『』《》〈〉“”‘’·])/g, (all, tag, dou, ju) =>
      tag ? tag : dou ? `<span class="hatex-dou">${dou}</span>` : ju ? `<span class="hatex-ju">${ju}</span>` : '');
  }

  function finish(html, info, inline) {
    html = html.replace(MARK_RE, (all, kind) => kind === 'TITLEBLOCK' ? (info.paper ? titleBlock(info.paper, inline) : '') : all);
    html = html.replace(GUJI_RE, (all, open, body, close) => open + judou(body) + close);
    html = html.replace(/<span class="latex-sc">@@HXJZ@@/g, '<span class="hatex-jiazhu">');
    html = wrappers(html);
    if (info.beamer) return deck(html, info, inline);
    if (info.twocolumn) html = `<div class="hatex-cols hatex-twocolumn"><div class="hatex-cols-flow">${html}</div></div>`;
    return html;
  }

  function deck(html, info, inline) {
    const [W, H] = info.size;
    const meta = {};
    for (const k of ['title', 'subtitle', 'author', 'institute', 'date', 'titleShort', 'authorShort']) {
      if (info.meta[k] != null) meta[k] = inline(info.meta[k].replace(/\s*\\and(?![a-zA-Z])\s*/g, ', ').replace(/\\inst\s*\{([^}]*)\}/g, '\\textsuperscript{$1}'));
    }
    const parts = html.split(/<h4\b[^>]*>\s*(?:<span class="latex-line"[^>]*><\/span>\s*)*@@HXSLIDE ([^@]*)@@\s*<\/h4>/);
    let before = parts[0], after = '';
    const slides = [];
    for (let i = 1; i < parts.length; i += 2) {
      const flags = parts[i].split(' ');
      let body = parts[i + 1] || '';
      const end = body.search(/<h4\b[^>]*>\s*(?:<span class="latex-line"[^>]*><\/span>\s*)*@@HXSLIDEEND@@/);
      if (end >= 0) {
        const rest = body.slice(end).replace(/^<h4\b[^>]*>[\s\S]*?<\/h4>/, '');
        body = body.slice(0, end);
        if (i + 2 >= parts.length) after = rest; else if (rest.trim()) body += rest;
      }
      let title = '', subtitle = '', titlepage = false;
      body = body.replace(MARK_RE, (all, kind, arg, text) => {
        if (kind === 'TITLE') { if (!title) title = text; return ''; }
        if (kind === 'SUBTITLE') { if (!subtitle) subtitle = text; return ''; }
        if (kind === 'TITLEPAGE') { titlepage = true; return titlePage(meta); }
        if (kind === 'TOC') return '<ul class="hatex-toc">' + info.sections.map(s => `<li>${inline(s)}</li>`).join('') + '</ul>';
        return all;
      });
      slides.push({ flags, title, subtitle, titlepage, body });
    }
    const N = slides.length;
    const foot = meta.authorShort || meta.author || '';
    const shortTitle = meta.titleShort || meta.title || '';
    const out = slides.map((s, k) => {
      const cls = ['hatex-slide'].concat(s.flags.slice(1)).concat(s.titlepage ? ['titlepage'] : []).join(' ');
      // Classed divs rather than header/footer/section/h1, so a page's own
      // element styles can't leak into the slides.
      const head = s.title ? `<div class="hatex-slide-title" role="heading" aria-level="2">${s.title}${s.subtitle ? `<small>${s.subtitle}</small>` : ''}</div>` : '';
      const plain = s.flags.includes('plain') || s.titlepage;
      const footer = plain ? '' : `<div class="hatex-slide-foot"><span>${foot}</span><span>${shortTitle}</span><span>${k + 1} / ${N}</span></div>`;
      return `<div class="hatex-slide-frame"><div class="${cls}" role="group" aria-roledescription="slide" aria-label="${k + 1} / ${N}" data-slide="${k + 1}">${head}` +
        `<div class="hatex-slide-body"><div class="hatex-slide-content">${s.body}</div></div>${footer}</div></div>`;
    }).join('');
    return (before.trim() ? before : '') +
      `<div class="hatex-deck" data-w="${W}" data-h="${H}" style="--hx-ratio:${W}/${H}">${out}</div>` + after;
  }

  function titlePage(meta) {
    const row = (k, attrs) => meta[k] ? `<div class="hatex-tp-${k}"${attrs || ''}>${meta[k]}</div>` : '';
    return '<div class="hatex-titlepage">' + row('title', ' role="heading" aria-level="1"') + row('subtitle') + row('author') +
      row('institute') + row('date') + '</div>';
  }

  window.hatexExtend = { prepare, finish };
})();
