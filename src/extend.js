// Document classes and environments the core renderer (latex.js) doesn't
// know, added around it: two-column documents and multicols, and beamer
// slide decks (frames, blocks, columns, title page).
//
// The source is rewritten so that each boundary becomes an unnumbered
// heading holding a marker, \subsubsection*{@@HX…@@}. The core then renders
// the whole document as usual, so labels, citations and equation numbers
// stay document-wide, and the marker headings in its HTML are finally
// turned into wrappers. Rewrites keep the line count, so data-line
// attributes still point at the right source lines.
//
// window.hatexExtend = { prepare(source) → { source, info }, finish(html, info, inline) → html }
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

  function prepare(source) {
    let src = String(source || '').replace(/\r\n?/g, '\n');
    // \frame{\titlepage} is the short form of a title frame.
    src = src.replace(/\\frame\s*\{\s*\\(titlepage|maketitle)\s*\}/g, '\\begin{frame}\\$1\\end{frame}');
    const m = masked(src);
    const info = { twocolumn: false, beamer: false, meta: {}, sections: [], aspect: [16, 9] };
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
      info.twocolumn = !info.beamer && list.includes('twocolumn');
      const ar = list.map(o => /^aspectratio\s*=\s*(\d+)$/.exec(o)).find(Boolean);
      const RATIOS = { 169: [16, 9], 1610: [16, 10], 149: [14, 9], 141: [1.41, 1], 54: [5, 4], 43: [4, 3], 32: [3, 2] };
      info.aspect = (ar && RATIOS[ar[1]]) || (info.beamer ? [4, 3] : [16, 9]);
      edit(cls.index, cls.index + cls[0].length, '');
    }
    if (!info.beamer && /\\begin\{frame\}/.test(m)) info.beamer = true;
    each(/\\(twocolumn|onecolumn)(?![a-zA-Z])(\s*\[[^\]]*\])?/g, (x) => {
      if (x[1] === 'twocolumn') info.twocolumn = !info.beamer;
      edit(x.index, x.index + x[0].length, '');
    });

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

    if (info.beamer) prepareBeamer(src, m, info, edit, each);

    edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    for (const [s, e, r] of edits) src = src.slice(0, s) + r + src.slice(e);
    // Appended, not prepended, so every line keeps its number.
    if (info.beamer) src += '\n\\definecolor{hxalert}{HTML}{B3261E}';
    return { source: src, info };
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
        default: return all; // slide markers, handled by deck()
      }
    });
  }

  function finish(html, info, inline) {
    html = wrappers(html);
    if (info.beamer) return deck(html, info, inline);
    if (info.twocolumn) html = `<div class="hatex-cols hatex-twocolumn"><div class="hatex-cols-flow">${html}</div></div>`;
    return html;
  }

  function deck(html, info, inline) {
    const [w, h] = info.aspect;
    const W = 960, H = Math.round(W * h / w);
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
      const head = s.title ? `<header class="hatex-slide-title">${s.title}${s.subtitle ? `<small>${s.subtitle}</small>` : ''}</header>` : '';
      const plain = s.flags.includes('plain') || s.titlepage;
      const footer = plain ? '' : `<footer class="hatex-slide-foot"><span>${foot}</span><span>${shortTitle}</span><span>${k + 1} / ${N}</span></footer>`;
      return `<div class="hatex-slide-frame"><section class="${cls}" data-slide="${k + 1}">${head}` +
        `<div class="hatex-slide-body"><div class="hatex-slide-content">${s.body}</div></div>${footer}</section></div>`;
    }).join('');
    return (before.trim() ? before : '') +
      `<div class="hatex-deck" data-w="${W}" data-h="${H}" style="--hx-ratio:${W}/${H}">${out}</div>` + after;
  }

  function titlePage(meta) {
    const row = (k, tag) => meta[k] ? `<${tag} class="hatex-tp-${k}">${meta[k]}</${tag}>` : '';
    return '<div class="hatex-titlepage">' + row('title', 'h1') + row('subtitle', 'p') + row('author', 'p') +
      row('institute', 'p') + row('date', 'p') + '</div>';
  }

  window.hatexExtend = { prepare, finish };
})();
