/* proto-deck.js — Nib deck/slides engine.
   - Auto-ids each slide and assigns a sequential data-num
   - Injects slide-header chrome + section watermark from data-num + data-title
   - Builds the side-rail dot navigation
   - Highlights the active slide via IntersectionObserver
   - Wires keyboard navigation (arrow / pgup-pgdn / space / home / end, E=export)
   - Scales .slides--fit fixed-canvas decks uniformly to the viewport
   - Exports the current slide as a standalone .svg

   The "All slides →" home link in the slide header is opt-in. Set it via
   data-deck-home on <main class="slides"> or window.WIREFRAME_CONFIG.deckHome.
   If neither is present, the link is omitted entirely.

   Pairs with core/proto-deck.css. See docs/Decks.md / ref/decks.md.
   The context bar (.wf-ctx-bar), when present, comes from proto-nav.js and is
   restyled by proto-deck.css — the deck also works standalone without it. */

(function() {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const nav = document.querySelector('.slidenav');
  if (!slides.length) return;

  // Resolve the optional "all slides" home link.
  const slidesEl = document.querySelector('.slides');
  const deckHome =
    (slidesEl && slidesEl.dataset.deckHome) ||
    (window.WIREFRAME_CONFIG && window.WIREFRAME_CONFIG.deckHome) ||
    '';

  // Auto-give each slide an id if missing (s1, s2, ...) and a sequential data-num if missing
  slides.forEach((s, i) => {
    if (!s.id) s.id = 's' + (i + 1);
    if (!s.dataset.num && !s.classList.contains('cover') && !s.classList.contains('closing')) {
      s.dataset.num = String(i).padStart(2, '0');
    }
  });

  // Auto-inject slide-header + section watermark on every non-cover/non-closing slide,
  // so per-deck HTML stays slim (data-num + data-title + body content only).
  // Section numbering is computed from the content slides only, so decks that
  // aren't shaped exactly cover+content+closing still number correctly.
  const contentSlides = Array.from(slides).filter(
    s => !s.classList.contains('cover') && !s.classList.contains('closing'));
  const contentTotal = contentSlides.length;
  slides.forEach((s) => {
    if (s.classList.contains('cover') || s.classList.contains('closing')) return;
    // In fixed-canvas mode the chrome lives inside the scaled stage.
    const host = s.querySelector('.slide-stage') || s;
    // Skip if author already supplied a slide-header (allow override)
    if (host.querySelector('.slide-header')) return;
    // 1-based position of this content slide within the content slides.
    const contentIdx = contentSlides.indexOf(s) + 1;
    const num = s.dataset.num || String(contentIdx).padStart(2, '0');
    const title = s.dataset.title || '';

    const watermark = document.createElement('div');
    watermark.className = 'slide-numwatermark';
    watermark.setAttribute('aria-hidden', 'true');
    watermark.textContent = num;

    const header = document.createElement('div');
    header.className = 'slide-header';
    const homeLink = deckHome
      ? ' · <a href="' + deckHome + '">All slides →</a>'
      : '';
    header.innerHTML =
      '<div class="left">' +
        '<span class="pill">' + num + ' / ' + String(contentTotal).padStart(2, '0') + '</span>' +
        '<span class="dim">' + title + '</span>' +
      '</div>' +
      '<div class="right">Section ' + contentIdx + ' of ' + contentTotal + homeLink + '</div>';

    host.insertBefore(header, host.firstChild);
    host.insertBefore(watermark, host.firstChild);
  });

  // Build dot navigation from slide ids + data-title
  if (nav) {
    slides.forEach((s, i) => {
      const a = document.createElement('a');
      a.href = '#' + s.id;
      a.dataset.idx = i;
      const tip = document.createElement('span');
      tip.className = 'tip';
      tip.textContent = (i + 1).toString().padStart(2, '0') + ' · ' + (s.dataset.title || '');
      a.appendChild(tip);
      nav.appendChild(a);
    });
  }
  const dots = nav ? Array.from(nav.querySelectorAll('a')) : [];

  // Active dot follows the slide currently in view
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio > 0.5) {
        const id = e.target.id;
        dots.forEach(d => d.classList.toggle('active', d.getAttribute('href') === '#' + id));
      }
    });
  }, { threshold: [0.5] });
  slides.forEach(s => io.observe(s));

  // Keyboard navigation — arrow keys, page up/down, space, home/end
  function currentIdx() {
    // Prefer the IntersectionObserver-driven active dot — offsetTop/scrollY
    // are pre-transform and so wrong when a .slides--fit deck is CSS-scaled.
    const activeDot = dots.findIndex(d => d.classList.contains('active'));
    if (activeDot !== -1) return activeDot;
    const top = window.scrollY + window.innerHeight / 2;
    let idx = 0;
    slides.forEach((s, i) => { if (s.offsetTop <= top) idx = i; });
    return idx;
  }
  function jump(idx) {
    idx = Math.max(0, Math.min(slides.length - 1, idx));
    slides[idx].scrollIntoView({ behavior: 'smooth' });
  }
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
      e.preventDefault(); jump(currentIdx() + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
      e.preventDefault(); jump(currentIdx() - 1);
    } else if (e.key === 'Home') {
      e.preventDefault(); jump(0);
    } else if (e.key === 'End') {
      e.preventDefault(); jump(slides.length - 1);
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault(); exportCurrentSlideAsSVG();
    }
  });

  // ============================================================
  // FIXED-CANVAS SCALING — when <main> carries .slides--fit, scale
  // every 1600x900 stage uniformly so the deck fills any viewport at
  // a constant ratio (a 1440 laptop and a 4K monitor render the same
  // composition). Recomputed on resize.
  // ============================================================
  if (document.querySelector('.slides--fit')) {
    const CW = 1600, CH = 900;
    let barH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--deck-bar-h'), 10);
    if (isNaN(barH)) barH = 36;
    const setScale = () => {
      const scale = Math.min(window.innerWidth / CW, (window.innerHeight - barH) / CH);
      document.documentElement.style.setProperty('--deck-scale', scale.toFixed(4));
    };
    setScale();
    window.addEventListener('resize', setScale);
    window.addEventListener('orientationchange', setScale);
  }

  // ============================================================
  // SVG EXPORT — current slide → standalone .svg file via foreignObject
  // Press 'E' or click the export button.
  // ============================================================
  async function exportCurrentSlideAsSVG() {
    const slide = slides[currentIdx()];
    if (!slide) return;

    showToast('Exporting slide…');

    const rect = slide.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    // Clone the slide and remove things that don't serialize well
    const clone = slide.cloneNode(true);
    clone.querySelectorAll('script').forEach(s => s.remove());
    // Replace iframes with placeholder cards (foreignObject can't embed cross-origin iframes)
    clone.querySelectorAll('iframe').forEach(f => {
      const ph = document.createElement('div');
      const src = (f.getAttribute('src') || '').replace(/^\.\.\/\.\.\//, '');
      ph.style.cssText = 'background:#fafbfd;border:1px dashed #b0bdd0;padding:24px;text-align:center;font-family:monospace;font-size:11px;color:#6b6258;height:100%;display:flex;align-items:center;justify-content:center;';
      ph.textContent = src;
      f.replaceWith(ph);
    });

    // Inline all <style> blocks + fetched stylesheet contents so the SVG renders standalone
    const styleParts = [];
    document.querySelectorAll('style').forEach(s => styleParts.push(s.textContent));
    let sheetsInlined = false;
    // Fallback: read a stylesheet's rules straight from document.styleSheets
    // (cross-origin sheets throw on .cssRules — swallow those).
    const readSheetRules = (href) => {
      for (let i = 0; i < document.styleSheets.length; i++) {
        const ss = document.styleSheets[i];
        if (ss.href !== href) continue;
        try {
          let css = '';
          const rules = ss.cssRules;
          for (let j = 0; j < rules.length; j++) css += rules[j].cssText + '\n';
          return css;
        } catch (_) { return ''; }
      }
      return '';
    };
    const sheetLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    await Promise.all(sheetLinks.map(async link => {
      try {
        const r = await fetch(link.href);
        if (r.ok) {
          let css = await r.text();
          // Resolve relative url() references against the stylesheet's URL so fonts still load
          css = css.replace(/url\(([^)]+)\)/g, (m, p) => {
            const raw = p.trim().replace(/^['"]|['"]$/g, '');
            if (/^(data:|https?:|\/)/.test(raw)) return 'url(' + raw + ')';
            try { return 'url(' + new URL(raw, link.href).href + ')'; }
            catch (_) { return m; }
          });
          styleParts.push(css);
          sheetsInlined = true;
        }
      } catch (_) {
        // fetch() fails on file:// — read the parsed rules instead.
        const css = readSheetRules(link.href);
        if (css) { styleParts.push(css); sheetsInlined = true; }
      }
    }));
    const allCSS = styleParts.join('\n');

    // Build the SVG document. The width/height attributes are explicit so SVG viewers can size it.
    const xhtmlNS = 'http://www.w3.org/1999/xhtml';
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgDoc =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="' + svgNS + '" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">\n' +
      '  <foreignObject width="100%" height="100%">\n' +
      '    <div xmlns="' + xhtmlNS + '" style="width:' + w + 'px;min-height:' + h + 'px;font-family:\'Hanken Grotesk\',sans-serif;background:#f5f0e6;">\n' +
      '      <style><![CDATA[\n' + allCSS.replace(/]]>/g, ']] >') + '\n]]></style>\n' +
      '      ' + new XMLSerializer().serializeToString(clone) + '\n' +
      '    </div>\n' +
      '  </foreignObject>\n' +
      '</svg>';

    const blob = new Blob([svgDoc], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fname = 'deck-' + (slide.id || 'slide') + '-' + (slide.dataset.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.svg';
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    if (sheetLinks.length && !sheetsInlined) {
      showToast('Export incomplete — serve the deck over http:// for full styling');
    } else {
      showToast('Downloaded ' + fname);
    }
  }

  // Tiny toast for export feedback
  let toastEl = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'wf-deck-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  // Floating "Export current slide" button
  if (slides.length > 1) {
    const btn = document.createElement('button');
    btn.className = 'wf-deck-export-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Export current slide as SVG');
    btn.innerHTML = '<span class="wf-deck-export-icon">↓</span><span class="wf-deck-export-label">Export SVG</span>';
    btn.addEventListener('click', exportCurrentSlideAsSVG);
    document.body.appendChild(btn);
  }
})();
