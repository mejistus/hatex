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
