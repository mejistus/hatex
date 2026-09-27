// Builds the manual (docs/manual/*.md and docs/syntax.md) into static HTML
// pages for the project site: one page per chapter, a sidebar in the order of
// the manual's contents, and links between chapters rewritten to the pages.
// Links to anything else in the repository go to it on GitHub.
//
//   node scripts/docs.mjs [out-dir]   (default: ../mejistus.github.io/hatex/docs)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked, Renderer } from 'marked';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, process.argv[2] || '../mejistus.github.io/hatex/docs');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const GITHUB = 'https://github.com/mejistus/hatex';

// Repository path of each source → its page.
const pages = new Map([['docs/manual/README.md', 'index.html'], ['docs/syntax.md', 'syntax.html']]);
for (const f of readdirSync(join(root, 'docs/manual')).filter(f => f.endsWith('.md') && f !== 'README.md')) {
  pages.set(`docs/manual/${f}`, f.replace(/\.md$/, '.html'));
}

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// GitHub's heading anchors, so links such as tables.md#wide-tables still land.
function slugger() {
  const seen = new Map();
  return (text) => {
    const base = text.toLowerCase().trim().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').replace(/\s/g, '-');
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
}

// A link in the source file `from`, as it should read on the site.
function linkFor(from, href) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) return href;
  const [path, hash] = href.split('#');
  if (!path) return href;
  const target = posix.normalize(posix.join(posix.dirname(from), path));
  const page = pages.get(target);
  if (page) return page + (hash ? '#' + hash : '');
  const kind = path.endsWith('/') ? 'tree' : 'blob';
  return `${GITHUB}/${kind}/main/${target.replace(/\/$/, '')}${hash ? '#' + hash : ''}`;
}

function render(from, md) {
  const slug = slugger();
  const headings = [];
  let title = null;
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const id = slug(plain(html));
        if (depth === 1 && !title) title = plain(html);
        if (depth === 2) headings.push({ id, html });
        return `<h${depth} id="${esc(id)}"><a class="anchor" href="#${esc(id)}" aria-hidden="true">#</a>${html}</h${depth}>\n`;
      },
      link({ href, title: t, tokens }) {
        const url = linkFor(from, href);
        const ext = /^https?:/.test(url) ? ' rel="noopener"' : '';
        return `<a href="${esc(url)}"${t ? ` title="${esc(t)}"` : ''}${ext}>${this.parser.parseInline(tokens)}</a>`;
      },
      code({ text, lang }) {
        const l = (lang || '').trim().split(/\s/)[0];
        const cls = l ? ` class="language-${esc({ tex: 'latex', html: 'markup', sh: 'bash', shell: 'bash' }[l] || l)}"` : '';
        return `<pre><code${cls}>${esc(text)}</code></pre>\n`;
      },
      table(token) {
        return `<div class="table">${Renderer.prototype.table.call(this, token)}</div>\n`;
      },
    },
  });
  const body = marked.parse(md);
  return { title: title || from, body, headings };
}

// The chapters in the order of the manual's contents, then the cheat sheet.
const index = readFileSync(join(root, 'docs/manual/README.md'), 'utf8');
const order = ['index.html'];
for (const m of index.matchAll(/^\s*\d+\.\s+\[[^\]]*\]\(([^)#]+)\)/gm)) {
  const page = pages.get(posix.join('docs/manual', m[1]));
  if (page && !order.includes(page)) order.push(page);
}
for (const page of pages.values()) if (!order.includes(page)) order.push(page);

const sources = new Map([...pages].map(([src, page]) => [page, src]));
const rendered = new Map(order.map(page => {
  const src = sources.get(page);
  return [page, render(src, readFileSync(join(root, src), 'utf8'))];
}));
const navTitle = (page) => page === 'index.html' ? 'Contents' : page === 'syntax.html' ? 'Syntax cheat sheet' : rendered.get(page).title;

mkdirSync(out, { recursive: true });
order.forEach((page, i) => {
  const { title, body, headings } = rendered.get(page);
  const src = sources.get(page);
  const prev = order[i - 1], next = order[i + 1];
  const nav = order.map(p => `<li${p === page ? ' class="here"' : ''}><a href="${p}">${esc(navTitle(p))}</a></li>`).join('\n      ');
  const toc = headings.length > 2 ? `<nav class="toc" aria-label="On this page"><b>On this page</b><ul>${headings.map(h => `<li><a href="#${esc(h.id)}">${h.html}</a></li>`).join('')}</ul></nav>` : '';
  writeFileSync(join(out, page), `<!doctype html>
<!-- Built from ${src} by scripts/docs.mjs in ${GITHUB}; edit the Markdown, not this file. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page === 'index.html' ? 'hatex manual' : `${title} · hatex manual`)}</title>
<link rel="stylesheet" href="docs.css">
</head>
<body>
<header class="top">
  <a class="brand" href="../">hatex</a>
  <span class="sep">/</span>
  <a href="index.html">manual</a>
  <span class="ver">${esc(version)}</span>
  <button class="menu" type="button" aria-expanded="false" aria-controls="side">Chapters</button>
</header>
<div class="layout">
  <aside id="side" class="side">
    <ul>
      ${nav}
    </ul>
  </aside>
  <main>
    <article>
${toc ? body.replace(/<\/h1>\n/, `</h1>\n${toc}\n`) : body}    </article>
    <nav class="pager">
      ${prev ? `<a class="prev" href="${prev}"><small>Previous</small>${esc(navTitle(prev))}</a>` : '<span></span>'}
      ${next ? `<a class="next" href="${next}"><small>Next</small>${esc(navTitle(next))}</a>` : '<span></span>'}
    </nav>
    <footer>hatex ${esc(version)} · MIT License · <a href="${GITHUB}/blob/main/${src}">edit this page on GitHub</a></footer>
  </main>
</div>
<script>
  document.querySelector('.menu').addEventListener('click', (e) => {
    const open = document.body.classList.toggle('side-open');
    e.currentTarget.setAttribute('aria-expanded', open);
  });
</script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-latex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"></script>
</body>
</html>
`);
});
writeFileSync(join(out, 'docs.css'), readFileSync(join(root, 'scripts/docs.css'), 'utf8'));
console.log(`manual ${version}: ${order.length} pages → ${out}`);
