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
    const X = window.hatexExtend;
    if (!X) return window.parseLatex(source);
    const { source: prepared, info } = X.prepare(source);
    return X.finish(window.parseLatex(prepared), info, inline);
  }

  // A fragment (a title, an author line) rendered without its paragraph.
  function inline(tex) {
    return window.parseLatex(tex).trim()
      .replace(/<span class="latex-line"[^>]*><\/span>/g, '')
      .replace(/^<p\b[^>]*>([\s\S]*)<\/p>$/, '$1').trim();
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
    setupDecks(root);
    layout(root);
    if (hasDOM && document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout(root));
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

  // ── Layout ──
  // Everything that depends on the rendered width: which wide items span
  // both columns, \resizebox fitting, and slide scaling. Runs again on
  // resize, when fonts arrive and when a TikZ picture lands.
  function layout(root) {
    if (!root || !hasDOM) return;
    requestAnimationFrame(() => {
      columnize(root);
      fitBoxesNow(root);
      root.querySelectorAll('.hatex-deck').forEach(fitDeck);
    });
  }

  // ── Columns ──
  // Two-column documents and multicols. CSS multi-column layout misplaces
  // KaTeX's inline maths in Safari, so the runtime lays the columns out
  // itself: the flow is cut into chunks at every full-width item (section
  // headings, the abstract, figure* / table*, and anything wider than a
  // column), and each chunk's blocks are shared out over side-by-side
  // columns of about equal height. A reader only ever goes down one short
  // column and up to the next. Below a minimum width it stays one column.
  function columnize(root) {
    root.querySelectorAll('.hatex-cols-flow').forEach(flow => {
      const box = flow.parentElement;
      const doc = box.classList.contains('hatex-twocolumn');
      flow.querySelectorAll(':scope > .hatex-cols-chunk').forEach(chunk => {
        chunk.querySelectorAll(':scope > .hatex-col').forEach(c => c.replaceWith(...c.childNodes));
        chunk.replaceWith(...chunk.childNodes);
      });
      flow.querySelectorAll(':scope > .hatex-span-auto').forEach(el => el.classList.remove('hatex-span-auto'));
      const n = doc ? 2 : parseInt(getComputedStyle(box).getPropertyValue('--hx-cols'), 10) || 2;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const gap = (doc ? 2.4 : 2) * rem;
      if (n < 2 || flow.clientWidth < (doc ? 50 : 32) * rem) return;
      const col = (flow.clientWidth - gap * (n - 1)) / n;

      // Measured now, while everything is laid out at full width.
      const wide = new Set();
      const add = (el) => { const f = el.closest('.latex-float'); wide.add(f && flow.contains(f) ? f : el); };
      flow.querySelectorAll('.katex-display').forEach(d => { if (displayWidth(d) > col) add(d); });
      flow.querySelectorAll('pre').forEach(pre => {
        const code = pre.querySelector('code') || pre;
        if (code.getBoundingClientRect().width + 40 > col) add(pre);
      });
      flow.querySelectorAll('.latex-table-wrap > table').forEach(t => { if (t.getBoundingClientRect().width > col) add(t.parentElement); });
      flow.querySelectorAll('.latex-fit').forEach(f => {
        const inner = f.firstElementChild;
        if (inner && inner.scrollWidth * 0.8 > col) add(f);
      });
      flow.querySelectorAll('.latex-tikz svg').forEach(svg => {
        if (parseFloat(svg.style.width) > col) add(svg.closest('.latex-tikz'));
      });
      wide.forEach(el => { const top = hoist(el, flow); if (top) top.classList.add('hatex-span-auto'); });

      const chunks = [];
      let chunk = null;
      [...flow.childNodes].forEach(node => {
        if (node.nodeType === 1 && node.matches('h2, .latex-abstract, .hatex-span, .hatex-span-auto, .hatex-cols')) {
          chunk = null;
          return;
        }
        if (!chunk) {
          if (node.nodeType !== 1 && !node.textContent.trim()) return;
          chunk = document.createElement('div');
          chunk.className = 'hatex-cols-chunk';
          node.before(chunk);
          chunks.push(chunk);
        }
        chunk.appendChild(node);
      });
      chunks.forEach(c => balance(c, n, gap));
    });
  }

  // Share a chunk's content out over n side-by-side columns of about equal
  // height. A column can break before any block; inside a theorem, proof,
  // quote or list before any of its paragraphs or items; and inside a
  // paragraph just before or after a displayed equation. The break closest
  // to an even share wins; a \columnbreak forces it, and a heading never
  // ends a column.
  function balance(chunk, n, gap) {
    const nodes = [...chunk.childNodes];
    const cols = [];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'hatex-col';
      cols.push(c);
    }
    chunk.style.gap = gap + 'px';
    chunk.append(...cols);
    cols[0].append(...nodes);
    for (let c = 0; c < n - 1; c++) {
      const from = cols[c];
      const forced = from.querySelector(':scope > .hatex-colbreak');
      let node = forced ? forced.nextSibling : null;
      if (!forced) {
        const target = from.scrollHeight / (n - c);
        let best = null;
        for (const p of breakPoints(from)) {
          if (!best || Math.abs(p.y - target) < Math.abs(best.y - target)) best = p;
        }
        node = best && best.node;
      }
      if (!node) continue;
      node = splitUpTo(node, from);
      const move = [];
      for (let k = node; k; k = k.nextSibling) move.push(k);
      cols[c + 1].append(...move);
    }
  }

  // Candidate places to start the next column, with their height in the
  // column: [{ node, y }], where the column would start at `node`.
  function breakPoints(col) {
    const out = [];
    const total = col.scrollHeight;
    const add = (node, y) => {
      if (!node || y <= 0 || y >= total) return;
      const prev = node.previousElementSibling;
      if (prev && /^H[2-6]$/.test(prev.tagName)) return; // a heading never ends a column
      out.push({ node, y });
    };
    const walk = (el, depth) => {
      [...el.children].forEach((k, i) => {
        if (i > 0 || el === col) add(k, k.offsetTop);
        if (depth > 3) return;
        if (k.matches('div.latex-theorem, blockquote, ul, ol, li, div.latex-center')) walk(k, depth + 1);
        else if (k.tagName === 'P') {
          k.querySelectorAll(':scope > .katex-display').forEach(d => {
            const prev = d.previousElementSibling;
            const start = prev && prev.classList.contains('latex-anchor') ? prev : d;
            if (start.previousSibling) add(start, d.offsetTop);
            if (d.nextSibling && d.nextSibling.textContent.trim()) add(d.nextSibling, d.offsetTop + d.offsetHeight);
          });
        }
      });
    };
    walk(col, 0);
    return out;
  }

  // Make `node` start a top-level block of `col` by splitting each element
  // between them: everything from `node` on moves into a copy of its parent.
  function splitUpTo(node, col) {
    while (node.parentElement && node.parentElement !== col) {
      const parent = node.parentElement;
      const rest = parent.cloneNode(false);
      rest.removeAttribute('id');
      rest.removeAttribute('data-line');
      rest.classList.add('hatex-split-after');
      if (parent.tagName === 'OL') {
        const before = [...parent.children].indexOf(node);
        rest.setAttribute('start', (parseInt(parent.getAttribute('start'), 10) || 1) + before);
      }
      for (let k = node; k;) { const next = k.nextSibling; rest.appendChild(k); k = next; }
      parent.classList.add('hatex-split-before');
      parent.after(rest);
      node = rest;
    }
    return node;
  }

  // KaTeX centres a formula across the full width and pins its number to
  // the right edge, so a numbered equation needs the number's width (and a
  // gap) clear on both sides of the formula.
  function displayWidth(d) {
    const html = d.querySelector('.katex-html');
    if (!html) return 0;
    let formula = 0, tag = 0;
    for (const part of html.children) {
      const w = part.getBoundingClientRect().width;
      if (part.classList.contains('tag')) tag = w; else formula += w;
    }
    return formula + (tag ? 2 * (tag + 20) : 0);
  }

  // Bring a wide item up to the top of the flow so it can sit between two
  // chunks, splitting the paragraphs, theorems or quotes around it. Items
  // inside lists or tables stay where they are (and scroll).
  function hoist(el, flow) {
    const prev = el.previousElementSibling;
    const anchor = prev && prev.classList.contains('latex-anchor') ? prev : null;
    const meaningful = (node) => node.textContent.trim() || node.querySelector('.katex, img, svg, table, pre');
    while (el.parentElement && el.parentElement !== flow) {
      const parent = el.parentElement;
      if (!parent.matches('p, blockquote, div.latex-theorem, div.latex-center, div.latex-right')) return null;
      const after = parent.cloneNode(false);
      after.removeAttribute('id');
      after.removeAttribute('data-line');
      after.classList.add('hatex-split-after');
      while (el.nextSibling) after.appendChild(el.nextSibling);
      parent.after(el);
      if (meaningful(after)) el.after(after);
      if (meaningful(parent)) parent.classList.add('hatex-split-before');
      else parent.remove();
    }
    if (anchor && anchor.nextElementSibling !== el) el.before(anchor);
    return el.parentElement === flow ? el : null;
  }

  // ── \resizebox{\linewidth}{!}{...} ──
  // Scale the content down to the available width (not below 55%, after
  // which it scrolls instead).
  function fitBoxesNow(root) {
    root.querySelectorAll('.latex-fit').forEach(box => {
      const inner = box.firstElementChild;
      if (!inner) return;
      inner.style.zoom = '';
      const avail = box.clientWidth, need = inner.scrollWidth;
      if (avail > 0 && need > avail) inner.style.zoom = Math.max(0.55, avail / need).toFixed(3);
    });
  }

  // ── Slides ──
  // A deck is a column of slide frames. Each slide is laid out at a fixed
  // design size (960px wide, the deck's aspect ratio) and scaled to its
  // frame, so it looks the same at any width; content taller than a slide
  // is shrunk to fit. "Present" shows one slide at a time, full screen.
  function setupDecks(root) {
    root.querySelectorAll('.hatex-deck:not([data-ready])').forEach(deck => {
      deck.dataset.ready = '1';
      const W = +deck.dataset.w, H = +deck.dataset.h;
      deck.querySelectorAll('.hatex-slide').forEach(s => { s.style.width = W + 'px'; s.style.height = H + 'px'; });
      const frames = [...deck.querySelectorAll('.hatex-slide-frame')];
      const bar = document.createElement('div');
      bar.className = 'hatex-deck-bar';
      bar.innerHTML = `<span>${frames.length} slides · double-click one to present from it</span>` +
        '<button type="button" class="hatex-present">Present</button>';
      deck.prepend(bar);
      bar.querySelector('button').addEventListener('click', () => present(deck, 0));
      frames.forEach((f, i) => f.addEventListener('dblclick', () => { if (!deck.classList.contains('hatex-presenting')) present(deck, i); }));
      if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(() => fitDeck(deck))).observe(deck);
    });
  }

  function fitDeck(deck) {
    const W = +deck.dataset.w;
    deck.querySelectorAll('.hatex-slide-frame').forEach(frame => {
      if (!frame.offsetParent && !deck.classList.contains('hatex-presenting')) return;
      const slide = frame.firstElementChild;
      slide.style.transform = `scale(${frame.clientWidth / W})`;
      const body = slide.querySelector('.hatex-slide-body'), content = body && body.firstElementChild;
      if (!content) return;
      content.style.zoom = '';
      for (let k = 0; k < 2; k++) {
        const room = body.clientHeight, need = content.scrollHeight * (parseFloat(content.style.zoom) || 1);
        if (!(need > room + 1)) break;
        content.style.zoom = Math.max(0.5, room / need * (parseFloat(content.style.zoom) || 1)).toFixed(3);
      }
    });
  }

  function present(deck, start) {
    const frames = [...deck.querySelectorAll('.hatex-slide-frame')];
    let i = Math.max(0, Math.min(frames.length - 1, start));
    const show = () => {
      frames.forEach((f, k) => f.classList.toggle('current', k === i));
      fitDeck(deck);
    };
    const go = (d) => { i = Math.max(0, Math.min(frames.length - 1, i + d)); show(); };
    const onKey = (e) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === 'Home') { i = 0; show(); }
      else if (e.key === 'End') { i = frames.length - 1; show(); }
      else if (e.key === 'Escape') stop();
    };
    const onClick = (e) => {
      if (e.target.closest('a, button')) return;
      go(e.clientX < window.innerWidth / 3 ? -1 : 1);
    };
    const onFs = () => { if (!document.fullscreenElement) stop(); };
    function stop() {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
      deck.removeEventListener('click', onClick);
      deck.classList.remove('hatex-presenting');
      frames.forEach(f => f.classList.remove('current'));
      if (document.fullscreenElement === deck && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      requestAnimationFrame(() => { fitDeck(deck); frames[i].scrollIntoView({ block: 'center' }); });
    }
    deck.classList.add('hatex-presenting');
    show();
    document.addEventListener('keydown', onKey);
    deck.addEventListener('click', onClick);
    if (deck.requestFullscreen) {
      deck.requestFullscreen().then(() => {
        document.addEventListener('fullscreenchange', onFs);
        fitDeck(deck);
      }).catch(() => {});
    }
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

  // Put a picture on screen. TikZJax's viewBox ends exactly at the outline of
  // the drawing, cutting off the outer half of every line along its edges,
  // and TeX's default 0.4pt line comes out at about 0.64 CSS px here: a
  // horizontal edge that falls between two pixel rows all but disappears.
  // So on screen the viewBox gets 1pt of room on each side and every line
  // is drawn 0.2pt heavier (text is stroke="none" and stays as it is).
  // Saved SVG files are left exactly as TeX made them.
  function showTikzSvg(svg) {
    if (!svg || svg.hasAttribute('data-hatex-shown')) return;
    svg.setAttribute('data-hatex-shown', '');
    const vb = svg.viewBox && svg.viewBox.baseVal;
    if (vb && vb.width) {
      const pad = 1;
      svg.setAttribute('viewBox', [vb.x - pad, vb.y - pad, vb.width + 2 * pad, vb.height + 2 * pad].join(' '));
      ['width', 'height'].forEach(dim => {
        const v = svg.getAttribute(dim), n = parseFloat(v);
        if (n) svg.setAttribute(dim, (n + 2 * pad) + v.replace(/^[\d.]+/, ''));
      });
    }
    svg.querySelectorAll('[stroke-width]').forEach(el => {
      const w = parseFloat(el.getAttribute('stroke-width'));
      if (w >= 0) el.setAttribute('stroke-width', +(w + 0.2).toFixed(4));
    });
    scaleTikzSvg(svg);
  }

  // TeX sizes are in pt; show pictures 1.2× so their 10pt labels match the
  // body text (1.8× on a slide, whose text is larger).
  function scaleTikzSvg(svg) {
    const w = parseFloat(svg && svg.getAttribute('width'));
    if (!w) return;
    const k = svg.closest('.hatex-slide') ? 1.8 : 1.2;
    svg.style.width = (w * 4 / 3 * k).toFixed(1) + 'px';
    svg.style.height = 'auto';
    // Its width can change which items span columns or how a slide fits.
    layout(svg.closest('.hatex'));
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
        showTikzSvg(box.querySelector('svg'));
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
      showTikzSvg(e.target);
      if (optsFor(box).zoom) makeZoomable(box);
    }
    boxes.filter(b => b !== box).forEach(b => {
      b.innerHTML = svg;
      showTikzSvg(b.querySelector('svg'));
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
    copy.removeAttribute('data-hatex-shown');
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
        document.querySelectorAll('.hatex').forEach(layout);
      });
    });
  }

  const HaTeX = {
    version: '__VERSION__',
    use, parse, render, enhance, layout, lint, images, tikzSvgs,
    Bib: window.Bib,
  };
  window.HaTeX = HaTeX;
  if (typeof module === 'object' && module && module.exports) module.exports = HaTeX;
})();
