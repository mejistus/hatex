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
