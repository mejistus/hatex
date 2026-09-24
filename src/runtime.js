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
    watchWidth(root);
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
      spanWide(root);
      fitBoxesNow(root);
      root.querySelectorAll('.hatex-deck').forEach(fitDeck);
    });
  }

  // The element can change width without the window resizing (a sidebar
  // closing, a preview pane widening), so each root watches its own width.
  const watched = new WeakSet();
  function watchWidth(root) {
    if (!hasDOM || !window.ResizeObserver || watched.has(root)) return;
    watched.add(root);
    let last = root.clientWidth;
    new ResizeObserver(() => {
      if (root.clientWidth === last) return;
      last = root.clientWidth;
      layout(root);
    }).observe(root);
  }

  // In a multi-column layout an equation, table, listing or picture wider
  // than its column spans all columns instead of overflowing.
  function spanWide(root) {
    root.querySelectorAll('.hatex-cols-flow').forEach(flow => {
      flow.querySelectorAll('.hatex-span-auto').forEach(el => el.classList.remove('hatex-span-auto'));
      const cs = getComputedStyle(flow);
      const n = parseInt(cs.columnCount, 10);
      if (!(n > 1)) return;
      const gap = parseFloat(cs.columnGap) || 0;
      const col = (flow.clientWidth - gap * (n - 1)) / n;
      const wide = new Set();
      // KaTeX centres a formula across the full width and pins its number to
      // the right edge, so a numbered equation needs the number's width (and
      // a gap) clear on both sides of the formula.
      flow.querySelectorAll('.katex-display').forEach(d => {
        const html = d.querySelector('.katex-html');
        if (!html) return;
        let formula = 0, tag = 0;
        for (const part of html.children) {
          const w = part.getBoundingClientRect().width;
          if (part.classList.contains('tag')) tag = w; else formula += w;
        }
        if (formula + (tag ? 2 * (tag + 20) : 0) > d.clientWidth) wide.add(d.closest('.latex-float') || d);
      });
      flow.querySelectorAll('pre, .latex-table-wrap').forEach(el => {
        if (el.scrollWidth > el.clientWidth + 4) wide.add(el.closest('.latex-float') || el);
      });
      flow.querySelectorAll('.latex-fit').forEach(box => {
        const inner = box.firstElementChild;
        if (inner && inner.scrollWidth * 0.8 > col) wide.add(box.closest('.latex-float') || box);
      });
      flow.querySelectorAll('.latex-tikz svg').forEach(svg => {
        if (parseFloat(svg.style.width) > col + 1) wide.add(svg.closest('.latex-float') || svg.closest('.latex-tikz'));
      });
      wide.forEach(el => {
        if (el.classList.contains('katex-display')) detachDisplay(el);
        el.classList.add('hatex-span-auto');
      });
    });
  }

  // A spanning equation inside a paragraph leaves an empty fragment of that
  // paragraph behind, which the columns then balance against the text that
  // follows (an empty column beside it). So the equation, with its label
  // anchor, moves out between the paragraph's two halves.
  function detachDisplay(d) {
    const p = d.parentElement;
    if (!p || p.tagName !== 'P') return;
    const anchor = d.previousElementSibling && d.previousElementSibling.classList.contains('latex-anchor') ? d.previousElementSibling : null;
    const range = document.createRange();
    range.setStartAfter(d);
    range.setEndAfter(p.lastChild);
    const rest = range.extractContents();
    p.after(d);
    if (anchor) d.before(anchor);
    if (rest.textContent.trim() || (rest.querySelector && rest.querySelector('.katex, img, svg'))) {
      const next = document.createElement('p');
      next.appendChild(rest);
      d.after(next);
    }
    if (!p.textContent.trim() && !p.querySelector('.katex, img, svg')) p.remove();
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
      if (window.ResizeObserver) new ResizeObserver(() => fitDeck(deck)).observe(deck);
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
    use, parse, render, enhance, lint, images, tikzSvgs,
    Bib: window.Bib,
  };
  window.HaTeX = HaTeX;
  if (typeof module === 'object' && module && module.exports) module.exports = HaTeX;
})();
