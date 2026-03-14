/* ========================================================================
   Nib WebGL Paper Curl Transition (proto-scatter-gl.js)

   Every visible element becomes an individual scrap of roughly torn paper,
   held to the surface by invisible glue stick adhesive.

   Scatter-Out: A strong gust catches unglued edges — scraps flutter,
   peel from their glue anchor, and drift off-screen. No fading — scraps
   physically leave the viewport. Occasional scraps tear at the glue line.

   Scatter-In: Scraps drift down gently, glue edge touches first, paper
   settles flat. Unglued edges bounce/flutter briefly after landing.
   Focus elements flap briefly after settling — drawing the eye.

   Load AFTER proto-nav.js. Optional — CSS fallback if omitted.
   ======================================================================== */

(function() {
  'use strict';

  /* ======================================================================
     1. WebGL Infrastructure
     ====================================================================== */

  function wfGLCreate(opts) {
    var canvas = document.createElement('canvas');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
    var fidelity = document.documentElement.getAttribute('data-wf-fidelity');
    if (fidelity === 'napkin') {
      canvas.style.filter = 'grayscale(0.85) sepia(0.3)';
    }
    /* For transparent overlays, disable premultiplied alpha so
       straight-alpha blending composites correctly over the page */
    var glAttrs = (opts && opts.transparent) ? { alpha: true, premultipliedAlpha: false } : undefined;
    var gl = canvas.getContext('webgl2', glAttrs) || canvas.getContext('webgl', glAttrs);
    if (!gl) return null;
    return { canvas: canvas, gl: gl, dpr: dpr };
  }

  (function detectGL() {
    var test = document.createElement('canvas');
    var ctx = test.getContext('webgl2') || test.getContext('webgl');
    window._wfGLAvailable = !!ctx;
    if (ctx) {
      var ext = ctx.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  })();

  function compileShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('proto-scatter-gl: shader error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    var vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('proto-scatter-gl: link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  function buildPlaneGeometry(subdivisions) {
    var n = subdivisions || 12;
    var verts = (n + 1) * (n + 1);
    var positions = new Float32Array(verts * 2);
    var texcoords = new Float32Array(verts * 2);
    var indices = new Uint16Array(n * n * 6);
    var vi = 0;
    for (var row = 0; row <= n; row++) {
      for (var col = 0; col <= n; col++) {
        var u = col / n, v = row / n;
        positions[vi] = u; positions[vi + 1] = v;
        texcoords[vi] = u; texcoords[vi + 1] = v;
        vi += 2;
      }
    }
    var ii = 0;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var tl = r * (n + 1) + c, tr = tl + 1;
        var bl = tl + (n + 1), br = bl + 1;
        indices[ii++] = tl; indices[ii++] = bl; indices[ii++] = tr;
        indices[ii++] = tr; indices[ii++] = bl; indices[ii++] = br;
      }
    }
    return { positions: positions, texcoords: texcoords, indices: indices, indexCount: ii };
  }

  /* ======================================================================
     2. Atomic Element Decomposition + Focus Detection
     ====================================================================== */

  var ATOM_SELECTORS = [
    '.btn', '.btn-primary', '.btn-secondary', '.btn-ghost', '.btn-danger',
    '.wf-badge',
    '.ds-kpi-card',
    '.wf-tab',
    '.slack-message',
    '.slack-nav-item',
    '.slack-rail-btn',
    '.slack-rail-workspace',
    '.slack-workspace-header',
    '.slack-nav-section',
    '.slack-nav-section-title',
    '.sfdc-header-bar',
    '.slack-channel-header',
    '.slack-channel-tab',
    '.slack-composer',
    '.slack-bot-card',
    '.slack-lane-header',
    '.sfdc-card', '.sfdc-chart-card',
    '.sfdc-highlights-bar',
    '.sfdc-path-bar',
    '.ds-card',
    '.ds-sidebar-card',
    '.wf-table thead',
    '.wf-table tbody tr',
    '.wf-ctx-bar',
    'h1', 'h2', 'h3',
    '.wf-form-group',
    '.wf-card-header', '.wf-card-body',
    '.ds-card-header', '.ds-card-body'
  ];

  var FOCUS_SELECTORS = [
    '.btn-primary',
    '.sfdc-btn-primary',
    '[data-wf-confidence="confirmed"]',
    '.active',
    '.slack-nav-item-active',
    'h1',
    '.ds-kpi-card',
    '.slack-channel-name',
    '.wf-ctx-bar'
  ];

  function collectAtoms() {
    var selector = ATOM_SELECTORS.join(',');
    var candidates = document.querySelectorAll(selector);
    var atoms = [];
    var seen = new Set();

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
      if (el.closest('.wf-design-notes')) continue;
      if (el.closest('.wf-modal-overlay')) continue;

      var dominated = false;
      var parent = el.parentElement;
      while (parent) {
        if (seen.has(parent)) { dominated = true; break; }
        parent = parent.parentElement;
      }
      if (dominated) continue;

      var dominated_children = [];
      seen.forEach(function(prev) {
        if (el.contains(prev)) dominated_children.push(prev);
      });
      if (dominated_children.length > 0) continue;

      seen.add(el);
      atoms.push(el);
    }

    if (atoms.length < 3 && window.WF_SCATTER_SELECTORS) {
      var fallback = document.querySelectorAll(window.WF_SCATTER_SELECTORS.join(','));
      for (var j = 0; j < fallback.length; j++) {
        if (fallback[j].offsetWidth > 0 && !fallback[j].closest('.wf-design-notes')) {
          atoms.push(fallback[j]);
        }
      }
    }

    return atoms;
  }

  function isFocusElement(el) {
    var focusSelector = FOCUS_SELECTORS.join(',');
    return el.matches(focusSelector) || !!el.closest(focusSelector);
  }

  /* ======================================================================
     3. DOM-to-Texture: Torn Paper Scrap (Glue Stick — No Tape)
     ====================================================================== */

  var PAPER_PAD = 20;

  function wfCaptureScrap(gl, el, scrapIndex) {
    return new Promise(function(resolve) {
      var rect = el.getBoundingClientRect();
      var ew = Math.ceil(rect.width);
      var eh = Math.ceil(rect.height);
      if (ew === 0 || eh === 0) { resolve(null); return; }

      var scrapSeed = ((scrapIndex || 0) * 7919 + ew * 13 + eh * 37) | 0;

      // Glue stick properties — randomized per scrap
      var seedState = scrapSeed;
      function seedRand() { seedState = (seedState * 16807 + 0) % 2147483647; return (seedState & 0x7fffffff) / 2147483647; }
      var glueEdge = Math.floor(seedRand() * 4);      // 0=top, 1=right, 2=bottom, 3=left
      var glueStrength = 0.3 + seedRand() * 0.7;      // 0.3-1.0
      var glueCoverage = 0.3 + seedRand() * 0.5;      // 0.3-0.8
      var restAngle = (seedRand() - 0.5) * 8 * Math.PI / 180; // -4 to +4 degrees

      // No tape padding — scraps are just torn paper
      var tw = ew + PAPER_PAD * 2;
      var th = eh + PAPER_PAD * 2;
      var c = document.createElement('canvas');
      c.width = tw; c.height = th;
      var ctx = c.getContext('2d');

      drawTornPaper(ctx, 0, 0, tw, th, scrapSeed);

      captureElementToImage(el, ew, eh, function(img) {
        if (img) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          ctx.drawImage(img, PAPER_PAD, PAPER_PAD, ew, eh);
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          var bg = getComputedStyle(el).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)') {
            ctx.fillStyle = bg;
            ctx.fillRect(PAPER_PAD, PAPER_PAD, ew, eh);
          }
          ctx.fillStyle = getComputedStyle(el).color || '#1e2a3a';
          ctx.font = getComputedStyle(el).font || '13px sans-serif';
          var text = (el.textContent || '').trim().substring(0, 60);
          if (text) ctx.fillText(text, PAPER_PAD + 4, PAPER_PAD + eh / 2 + 4);
          ctx.restore();
        }

        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);

        resolve({
          texture: tex,
          x: rect.left - PAPER_PAD,
          y: rect.top - PAPER_PAD,
          w: tw,
          h: th,
          elementArea: ew * eh,
          glueEdge: glueEdge,
          glueStrength: glueStrength,
          glueCoverage: glueCoverage,
          restAngle: restAngle,
          isFocus: isFocusElement(el)
        });
      });
    });
  }

  function drawTornPaper(ctx, x, y, w, h, scrapSeed) {
    ctx.save();
    ctx.beginPath();
    var seed = scrapSeed || ((w * 7 + h * 13) | 0);
    function rand() { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 2147483647; }

    // Per-element tear variation
    var tearSize = 2 + rand() * 3;
    var step = 4 + rand() * 3;

    ctx.moveTo(x, y + rand() * tearSize);
    for (var tx = x + step; tx < x + w; tx += step) {
      var depth = (rand() < 0.1) ? tearSize * 4 : tearSize * 2;
      ctx.lineTo(tx, y + (rand() - 0.5) * depth);
    }
    ctx.lineTo(x + w, y + rand() * tearSize);
    for (var ry = y + step; ry < y + h; ry += step) {
      var depth2 = (rand() < 0.1) ? tearSize * 4 : tearSize * 2;
      ctx.lineTo(x + w - rand() * depth2 * 0.5, ry);
    }
    ctx.lineTo(x + w - rand() * tearSize, y + h);
    for (var bx = x + w - step; bx > x; bx -= step) {
      var depth3 = (rand() < 0.1) ? tearSize * 4 : tearSize * 2;
      ctx.lineTo(bx, y + h + (rand() - 0.5) * depth3);
    }
    ctx.lineTo(x, y + h + rand() * tearSize);
    for (var ly = y + h - step; ly > y; ly -= step) {
      var depth4 = (rand() < 0.1) ? tearSize * 4 : tearSize * 2;
      ctx.lineTo(x + rand() * depth4 * 0.5, ly);
    }
    ctx.closePath();

    // Varied paper tint: lerp between warm white and slightly aged
    var tintMix = rand();
    var r = Math.round(245 + (239 - 245) * tintMix);
    var g = Math.round(240 + (232 - 240) * tintMix);
    var b = Math.round(232 + (219 - 232) * tintMix);
    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    ctx.fill();

    // Per-element shadow variation based on seed
    var shadowVariation = rand();
    var ambientBlur = 16 + shadowVariation * 8;     // 16-24
    var ambientOffX = 4 + shadowVariation * 3;       // 4-7
    var ambientOffY = 8 + shadowVariation * 5;       // 8-13
    var primaryBlur = 10 + shadowVariation * 6;      // 10-16
    var primaryAlpha = 0.2 + shadowVariation * 0.1;  // 0.2-0.3

    // Ambient occlusion layer
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = ambientBlur;
    ctx.shadowOffsetX = ambientOffX;
    ctx.shadowOffsetY = ambientOffY;
    ctx.fill();
    // Primary shadow
    ctx.shadowColor = 'rgba(0,0,0,' + primaryAlpha.toFixed(2) + ')';
    ctx.shadowBlur = primaryBlur;
    ctx.shadowOffsetX = 2 + shadowVariation * 2;
    ctx.shadowOffsetY = 4 + shadowVariation * 3;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.restore();
  }

  // Parse an rgb/rgba color string and return luminance (0=dark, 1=light)
  function colorLuminance(colorStr) {
    if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return 1.0;
    var m = colorStr.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return 1.0;
    var r = parseInt(m[1]) / 255, g = parseInt(m[2]) / 255, b = parseInt(m[3]) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function isButtonElement(el) {
    return el.matches && el.matches('.btn, .btn-primary, .btn-secondary, .btn-ghost, .btn-danger, [class*="btn"]');
  }

  function captureElementToImage(el, w, h, callback) {
    try {
      var clone = el.cloneNode(true);
      var computed = getComputedStyle(el);
      var props = ['background', 'backgroundColor', 'color', 'font', 'fontSize',
        'fontFamily', 'fontWeight', 'lineHeight', 'padding', 'border', 'borderRadius',
        'boxShadow', 'textAlign', 'display', 'flexDirection', 'gap', 'overflow',
        'whiteSpace', 'letterSpacing'];
      for (var i = 0; i < props.length; i++) {
        clone.style[props[i]] = computed[props[i]];
      }

      // Override dark backgrounds to paper color
      var bgLum = colorLuminance(computed.backgroundColor);
      if (bgLum < 0.4) {
        clone.style.backgroundColor = '#f5f0e8';
        clone.style.background = '#f5f0e8';
        clone.style.color = '#3a2e24';
      }

      // Buttons get sharpie-outline treatment
      if (isButtonElement(el)) {
        clone.style.backgroundColor = 'transparent';
        clone.style.background = 'transparent';
        clone.style.border = '2px solid #3a2e24';
        clone.style.color = '#3a2e24';
        clone.style.borderRadius = '3px';
      }

      // Use system font for scatter animation
      clone.style.fontFamily = "var(--wf-font), sans-serif";

      var serialized = new XMLSerializer().serializeToString(clone);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
        '<foreignObject width="100%" height="100%">' +
        '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + w + 'px;height:' + h + 'px;overflow:hidden;">' +
        serialized +
        '</div></foreignObject></svg>';
      var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      var blobUrl = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function() { URL.revokeObjectURL(blobUrl); callback(img); };
      img.onerror = function() { URL.revokeObjectURL(blobUrl); callback(null); };
      img.src = blobUrl;
    } catch (e) {
      callback(null);
    }
  }

  /* ======================================================================
     4. Shaders — Glue Stick Mechanic
     ====================================================================== */

  // u_mode: 0 = blow-off (scatter-out), 1 = drop-in (scatter-in)
  //
  // Glue stick: each scrap has a glued edge (0-3). Unglued portions flutter
  // freely. On blow-off, the gust catches unglued edges first; the glue
  // resists proportionally to glueStrength, then releases.
  //
  // Blow-off phases:
  //   Phase A (flutter): unglued edges lift and flutter. Duration scales
  //     with (1 - glueStrength). Gentle gust amplitude.
  //   Phase B (release): glue lets go. Paper peels from glued edge,
  //     curls, and drifts off-screen.
  //
  // Drop-in: scraps drift down gently. Glue edge touches first, paper
  //   settles. Unglued edges may bounce/flutter briefly after landing.

  var VERT_SRC = [
    'attribute vec2 a_position;',
    'attribute vec2 a_texcoord;',
    '',
    'uniform vec2 u_offset;',
    'uniform vec2 u_size;',
    'uniform vec2 u_viewport;',
    'uniform float u_progress;',
    'uniform float u_windAngle;',
    'uniform float u_curlRadius;',
    'uniform float u_flutter;',
    'uniform float u_time;',
    'uniform float u_mode;',
    'uniform float u_focusFlutter;',
    'uniform float u_dropSeed;',
    '',
    '// Glue stick uniforms',
    'uniform float u_glueEdge;',      // 0=top, 1=right, 2=bottom, 3=left
    'uniform float u_glueStrength;',  // 0.3-1.0
    'uniform float u_glueCoverage;',  // 0.3-0.8
    'uniform float u_restAngle;',     // resting rotation in radians (-4 to +4 deg)
    'uniform float u_zLayer;',        // per-element z-depth offset
    'uniform float u_elementArea;',   // w*h in pixels for deformation scaling
    '',
    'varying vec2 v_texcoord;',
    'varying float v_foldShadow;',
    '',
    'float wiggle(float t, float seed) {',
    '  return sin(t * 3.7 + seed * 13.0) * 0.5',
    '       + sin(t * 7.3 + seed * 29.0) * 0.25',
    '       + sin(t * 13.1 + seed * 43.0) * 0.15',
    '       + sin(t * 21.7 + seed * 67.0) * 0.1;',
    '}',
    '',
    'vec2 rotate2d(vec2 point, vec2 center, float angle) {',
    '  float c = cos(angle);',
    '  float s = sin(angle);',
    '  vec2 d = point - center;',
    '  return center + vec2(d.x * c - d.y * s, d.x * s + d.y * c);',
    '}',
    '',
    '// Distance from glued edge (0 at glue, 1 at opposite edge)',
    'float distFromGlue(vec2 uv) {',
    '  float edge = u_glueEdge;',
    '  if (edge < 0.5) return uv.y;',              // top glued: dist = y
    '  if (edge < 1.5) return 1.0 - uv.x;',        // right glued: dist = 1-x
    '  if (edge < 2.5) return 1.0 - uv.y;',        // bottom glued: dist = 1-y
    '  return uv.x;',                               // left glued: dist = x
    '}',
    '',
    'void main() {',
    '  v_texcoord = a_texcoord;',
    '  float foldShadow = 0.0;',
    '  vec2 pos = u_offset + a_position * u_size;',
    '  float z = u_zLayer;',
    '',
    '  // Scale mesh deformation by element area — small elements stay rigid',
    '  float deformScale = min(1.0, u_elementArea / 40000.0);',
    '',
    '  float cosW = cos(u_windAngle);',
    '  float sinW = sin(u_windAngle);',
    '  vec2 windDir = vec2(cosW, sinW);',
    '  vec2 perpDir = vec2(-sinW, cosW);',
    '',
    '  vec2 center = u_offset + u_size * 0.5;',
    '',
    '  float dGlue = distFromGlue(a_position);',
    '',
    '  // Apply resting rotation (scraps sit at slight angles)',
    '  pos = rotate2d(pos, center, u_restAngle);',
    '',
    '  if (u_mode < 0.5) {',
    '    // ============ BLOW-OFF MODE (glue stick) ============',
    '    // Phase A boundary shifts with glue strength:',
    '    // weak glue (0.3) = longer flutter (phase split at 0.3)',
    '    // strong glue (1.0) = shorter flutter (phase split at 0.6)',
    '    float phaseSplit = 0.2 + u_glueStrength * 0.4;',
    '    float phaseA = clamp(u_progress / phaseSplit, 0.0, 1.0);',
    '    float phaseB = clamp((u_progress - phaseSplit) / (1.0 - phaseSplit), 0.0, 1.0);',
    '',
    '    // Phase A: unglued edges lift and flutter (gentle gust)',
    '    float liftAmount = dGlue * phaseA;',
    '    float flutterFreq = 8.0 + u_dropSeed * 6.0;',
    '    float flutterAmp = (1.0 - u_glueStrength) * 0.4 + 0.1;',
    '',
    '    // Mesh curl on unglued portions',
    '    float curlAngle = liftAmount * phaseA * 2.0 * deformScale;',
    '    float arcLen = dGlue * max(u_size.x, u_size.y) * 0.5;',
    '    z += arcLen * sin(curlAngle) * 0.6 * deformScale;',
    '',
    '    // Flutter vibration on unglued edges',
    '    float flutterZ = sin(u_time * flutterFreq + dGlue * 6.28) * flutterAmp * 12.0 * dGlue * phaseA;',
    '    z += flutterZ * deformScale;',
    '',
    '    // Gentle lateral wiggle during flutter',
    '    float lateralFlutter = wiggle(u_time * 2.0, u_dropSeed) * dGlue * phaseA * 6.0;',
    '    pos += perpDir * lateralFlutter;',
    '',
    '    foldShadow = liftAmount * phaseA * 0.4;',
    '',
    '    // Phase A rotation rattle',
    '    float rattleAngle = wiggle(u_time * 2.5, u_dropSeed) * phaseA * 0.1;',
    '    pos = rotate2d(pos, center, rattleAngle);',
    '',
    '    // Phase B: glue releases — paper peels and drifts off',
    '    if (phaseB > 0.0) {',
    '      // Peel rotation from glue edge direction',
    '      float peelDir = 1.0;',
    '      if (u_glueEdge < 0.5) peelDir = 1.0;',        // top: peel downward
    '      else if (u_glueEdge < 1.5) peelDir = -1.0;',   // right: peel left
    '      else if (u_glueEdge < 2.5) peelDir = -1.0;',   // bottom: peel upward
    '      else peelDir = 1.0;',                           // left: peel right
    '',
    '      float peelAngle = peelDir * phaseB * 1.2 * deformScale;',
    '      pos = rotate2d(pos, center, peelAngle);',
    '',
    '      // Dramatic curl on large elements during peel',
    '      float peelCurl = dGlue * dGlue * phaseB * u_curlRadius * 0.5 * deformScale;',
    '      z += peelCurl;',
    '',
    '      // Drift off-screen (strong gust, not hurricane)',
    '      float exitDist = sqrt(u_viewport.x * u_viewport.x + u_viewport.y * u_viewport.y);',
    '      float driftDist = phaseB * phaseB * exitDist * 0.9;',
    '      pos += windDir * driftDist;',
    '',
    '      // Gentle upward lift + lateral drift',
    '      pos.y -= phaseB * 80.0;',
    '      pos += perpDir * wiggle(u_time * 1.5, u_dropSeed + 2.0) * phaseB * 40.0;',
    '',
    '      z += phaseB * 200.0;',
    '',
    '      // Tumble while drifting — organic, not violent',
    '      float tumbleAngle = phaseB * (u_windAngle * 0.5 + 1.0);',
    '      tumbleAngle += wiggle(u_time * 2.0, u_dropSeed) * phaseB * 0.6;',
    '      pos = rotate2d(pos, center + windDir * driftDist, tumbleAngle);',
    '',
    '      // Z tumble',
    '      z += sin(phaseB * 3.0 + dGlue * 1.5) * u_size.y * 0.25 * phaseB;',
    '',
    '      foldShadow += dGlue * phaseB * 0.5;',
    '    }',
    '',
    '    // Z-layers spread apart as scraps lift',
    '    z += u_zLayer * u_progress * 0.5;',
    '',
    '  } else {',
    '    // ============ DROP-IN MODE (glue stick) ============',
    '    float landed = u_progress;',
    '    float airborne = 1.0 - landed;',
    '',
    '    // Gentle drift from above (not dropped from height)',
    '    float dropHeight = u_viewport.y * 0.6 + u_size.y + 80.0;',
    '    float fallProgress = 1.0 - airborne * airborne;',
    '    float yDrop = dropHeight * (1.0 - fallProgress);',
    '    pos.y -= yDrop;',
    '',
    '    // Horizontal sway — gentle drift',
    '    float drift = sin(u_dropSeed * 17.3) * 80.0 * airborne;',
    '    drift += wiggle(u_time * 1.2, u_dropSeed) * 40.0 * airborne;',
    '    pos.x += drift;',
    '',
    '    // Tumble while falling — glue edge leads',
    '    float rotSpeed = 2.0 + u_dropSeed * 3.0;',
    '    float rotDir = (u_dropSeed > 0.5) ? 1.0 : -1.0;',
    '    float fallRotation = rotDir * u_time * rotSpeed * airborne;',
    '    fallRotation += wiggle(u_time * 1.5, u_dropSeed + 3.0) * 0.3 * airborne;',
    '    pos = rotate2d(pos, center - vec2(0.0, yDrop), fallRotation);',
    '',
    '    // Mesh curl while airborne — scaled by element area',
    '    float airCurl = wiggle(u_time * 1.5, u_dropSeed + 5.0) * airborne;',
    '    float bendAngle = dGlue * airCurl * 2.0 * deformScale;',
    '    float arcLen = dGlue * u_size.y * 0.4;',
    '    z += arcLen * sin(bendAngle) * airborne * 0.5 * deformScale;',
    '',
    '    // Lift while airborne',
    '    z += airborne * 60.0 * (1.0 + wiggle(u_time * 0.8, u_dropSeed + 7.0) * 0.2);',
    '',
    '    // Z-layers converge as scraps land',
    '    z += u_zLayer * airborne * 0.5;',
    '',
    '    foldShadow = abs(airCurl) * 0.3 * airborne;',
    '',
    '    // Post-landing: unglued edges bounce/flutter briefly',
    '    if (landed > 0.9) {',
    '      float settleT = (landed - 0.9) / 0.1;',
    '      float settleDecay = 1.0 - settleT;',
    '      float bounceZ = dGlue * sin(u_time * 12.0 + u_dropSeed * 20.0) * 4.0 * settleDecay * deformScale;',
    '      z += bounceZ;',
    '    }',
    '',
    '    // Focus flutter after landing',
    '    if (u_focusFlutter > 0.0) {',
    '      float decay = u_focusFlutter;',
    '      float flapWiggle = wiggle(u_time * 4.0, u_dropSeed + 11.0);',
    '      float flapBend = dGlue * flapWiggle * decay * 0.5 * deformScale;',
    '      z += dGlue * u_size.y * sin(flapBend) * 0.15 * decay * deformScale;',
    '      float settleRot = flapWiggle * decay * 0.06;',
    '      pos = rotate2d(pos, center, settleRot);',
    '      foldShadow += abs(flapWiggle) * 0.12 * decay;',
    '    }',
    '  }',
    '',
    '  vec2 clipPos = (pos / u_viewport) * 2.0 - 1.0;',
    '  clipPos.y = -clipPos.y;',
    '  float clipZ = clamp(z / 2000.0, -1.0, 1.0);',
    '',
    '  v_foldShadow = foldShadow;',
    '  gl_Position = vec4(clipPos, clipZ, 1.0);',
    '}'
  ].join('\n');

  var FRAG_SRC = [
    'precision mediump float;',
    'varying vec2 v_texcoord;',
    'varying float v_foldShadow;',
    'uniform sampler2D u_texture;',
    '',
    'void main() {',
    '  vec4 color = texture2D(u_texture, v_texcoord);',
    '  color.rgb *= 1.0 - v_foldShadow * 0.3;',
    '  if (color.a < 0.01) discard;',
    '  gl_FragColor = color;',
    '}'
  ].join('\n');

  /* ======================================================================
     5. Animation Controllers
     ====================================================================== */

  function easeBlowOff(t) {
    return t < 0.4
      ? t * t * 2.5
      : 0.4 + (t - 0.4) * (t - 0.4) * (1.0 / 0.36) * 0.6 + (t - 0.4) * 0.5;
  }

  function easeDropIn(t) {
    if (t < 0.7) {
      var ft = t / 0.7;
      return ft * ft * 0.85;
    }
    var bt = (t - 0.7) / 0.3;
    return 0.85 + bt * 0.2 - Math.sin(bt * Math.PI) * 0.05;
  }

  function runBlowOff(ctx, program, geo, captures, angle, duration, stagger, onDone, options) {
    var gl = ctx.gl;
    var startTime = null;
    var totalDuration = duration + stagger;
    var contextLost = false;

    ctx.canvas.addEventListener('webglcontextlost', function(e) {
      e.preventDefault();
      contextLost = true;
      cleanup();
      onDone();
    });

    gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    if (options && options.transparent) {
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.clearColor(0.96, 0.95, 0.92, 1.0);
    }
    gl.useProgram(program);

    var locs = getLocations(gl, program);
    uploadGeometry(gl, geo);

    var elParams = [];
    for (var i = 0; i < captures.length; i++) {
      elParams.push({
        curlRadius: 20 + Math.random() * 30,
        flutter: 0.4 + Math.random() * 0.6,
        delayFraction: captures.length > 1 ? i / (captures.length - 1) : 0,
        dropSeed: Math.random(),
        zLayer: (i / Math.max(1, captures.length - 1)) * 400
      });
    }

    function frame(timestamp) {
      if (contextLost) return;
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      if (elapsed >= totalDuration) { cleanup(); onDone(); return; }

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(locs.uViewport, window.innerWidth, window.innerHeight);
      gl.uniform1f(locs.uWindAngle, angle);
      gl.uniform1f(locs.uTime, elapsed / 1000);
      gl.uniform1f(locs.uMode, 0.0);
      gl.uniform1f(locs.uFocusFlutter, 0.0);

      bindGeometry(gl, locs);

      for (var i = 0; i < captures.length; i++) {
        var cap = captures[i];
        if (!cap) continue;
        var params = elParams[i];

        var elDelay = params.delayFraction * stagger;
        var elElapsed = Math.max(0, elapsed - elDelay);
        var t = Math.min(1, elElapsed / duration);
        var progress = easeBlowOff(t);

        gl.uniform2f(locs.uOffset, cap.x, cap.y);
        gl.uniform2f(locs.uSize, cap.w, cap.h);
        gl.uniform1f(locs.uProgress, progress);
        gl.uniform1f(locs.uCurlRadius, params.curlRadius);
        gl.uniform1f(locs.uFlutter, params.flutter);
        gl.uniform1f(locs.uDropSeed, params.dropSeed);
        gl.uniform1f(locs.uGlueEdge, cap.glueEdge);
        gl.uniform1f(locs.uGlueStrength, cap.glueStrength);
        gl.uniform1f(locs.uGlueCoverage, cap.glueCoverage);
        gl.uniform1f(locs.uRestAngle, cap.restAngle);
        gl.uniform1f(locs.uZLayer, params.zLayer);
        gl.uniform1f(locs.uElementArea, cap.elementArea);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cap.texture);
        gl.uniform1i(locs.uTexture, 0);

        gl.drawElements(gl.TRIANGLES, geo.indexCount, gl.UNSIGNED_SHORT, 0);
      }

      requestAnimationFrame(frame);
    }

    function cleanup() {
      cleanupBuffers(gl, captures);
    }

    requestAnimationFrame(frame);
  }

  function runDropIn(ctx, program, geo, captures, duration, stagger, focusFlutterDuration, onDone, options) {
    var gl = ctx.gl;
    var startTime = null;
    var totalDuration = duration + stagger + focusFlutterDuration;
    var contextLost = false;

    ctx.canvas.addEventListener('webglcontextlost', function(e) {
      e.preventDefault();
      contextLost = true;
      cleanup();
      onDone();
    });

    gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    if (options && options.transparent) {
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.clearColor(0.96, 0.95, 0.92, 1.0);
    }
    gl.useProgram(program);

    var locs = getLocations(gl, program);
    uploadGeometry(gl, geo);

    var elParams = [];
    for (var i = 0; i < captures.length; i++) {
      elParams.push({
        curlRadius: 15 + Math.random() * 25,
        flutter: 0.2 + Math.random() * 0.5,
        delayFraction: captures.length > 1 ? i / (captures.length - 1) : 0,
        dropSeed: Math.random(),
        zLayer: (i / Math.max(1, captures.length - 1)) * 400
      });
    }

    function frame(timestamp) {
      if (contextLost) return;
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      if (elapsed >= totalDuration) { cleanup(); onDone(); return; }

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(locs.uViewport, window.innerWidth, window.innerHeight);
      gl.uniform1f(locs.uWindAngle, 0.0);
      gl.uniform1f(locs.uTime, elapsed / 1000);
      gl.uniform1f(locs.uMode, 1.0);

      bindGeometry(gl, locs);

      for (var i = 0; i < captures.length; i++) {
        var cap = captures[i];
        if (!cap) continue;
        var params = elParams[i];

        var elDelay = params.delayFraction * stagger;
        var elElapsed = Math.max(0, elapsed - elDelay);

        var t = Math.min(1, elElapsed / duration);
        var progress = easeDropIn(t);

        var focusFlutter = 0.0;
        if (cap.isFocus && elElapsed > duration) {
          var flutterElapsed = elElapsed - duration;
          focusFlutter = Math.max(0, 1.0 - flutterElapsed / focusFlutterDuration);
        }

        gl.uniform2f(locs.uOffset, cap.x, cap.y);
        gl.uniform2f(locs.uSize, cap.w, cap.h);
        gl.uniform1f(locs.uProgress, progress);
        gl.uniform1f(locs.uCurlRadius, params.curlRadius);
        gl.uniform1f(locs.uFlutter, params.flutter);
        gl.uniform1f(locs.uFocusFlutter, focusFlutter);
        gl.uniform1f(locs.uDropSeed, params.dropSeed);
        gl.uniform1f(locs.uGlueEdge, cap.glueEdge);
        gl.uniform1f(locs.uGlueStrength, cap.glueStrength);
        gl.uniform1f(locs.uGlueCoverage, cap.glueCoverage);
        gl.uniform1f(locs.uRestAngle, cap.restAngle);
        gl.uniform1f(locs.uZLayer, params.zLayer);
        gl.uniform1f(locs.uElementArea, cap.elementArea);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cap.texture);
        gl.uniform1i(locs.uTexture, 0);

        gl.drawElements(gl.TRIANGLES, geo.indexCount, gl.UNSIGNED_SHORT, 0);
      }

      requestAnimationFrame(frame);
    }

    function cleanup() {
      cleanupBuffers(gl, captures);
    }

    requestAnimationFrame(frame);
  }

  /* ======================================================================
     5b. Shared GL Helpers
     ====================================================================== */

  var _posBuf, _texBuf, _idxBuf;

  function getLocations(gl, program) {
    return {
      aPos: gl.getAttribLocation(program, 'a_position'),
      aTex: gl.getAttribLocation(program, 'a_texcoord'),
      uOffset: gl.getUniformLocation(program, 'u_offset'),
      uSize: gl.getUniformLocation(program, 'u_size'),
      uViewport: gl.getUniformLocation(program, 'u_viewport'),
      uProgress: gl.getUniformLocation(program, 'u_progress'),
      uWindAngle: gl.getUniformLocation(program, 'u_windAngle'),
      uCurlRadius: gl.getUniformLocation(program, 'u_curlRadius'),
      uFlutter: gl.getUniformLocation(program, 'u_flutter'),
      uTime: gl.getUniformLocation(program, 'u_time'),
      uMode: gl.getUniformLocation(program, 'u_mode'),
      uFocusFlutter: gl.getUniformLocation(program, 'u_focusFlutter'),
      uDropSeed: gl.getUniformLocation(program, 'u_dropSeed'),
      uTexture: gl.getUniformLocation(program, 'u_texture'),
      uGlueEdge: gl.getUniformLocation(program, 'u_glueEdge'),
      uGlueStrength: gl.getUniformLocation(program, 'u_glueStrength'),
      uGlueCoverage: gl.getUniformLocation(program, 'u_glueCoverage'),
      uRestAngle: gl.getUniformLocation(program, 'u_restAngle'),
      uZLayer: gl.getUniformLocation(program, 'u_zLayer'),
      uElementArea: gl.getUniformLocation(program, 'u_elementArea')
    };
  }

  function uploadGeometry(gl, geo) {
    _posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, _posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);

    _texBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, _texBuf);
    gl.bufferData(gl.ARRAY_BUFFER, geo.texcoords, gl.STATIC_DRAW);

    _idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, _idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
  }

  function bindGeometry(gl, locs) {
    gl.bindBuffer(gl.ARRAY_BUFFER, _posBuf);
    gl.enableVertexAttribArray(locs.aPos);
    gl.vertexAttribPointer(locs.aPos, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, _texBuf);
    gl.enableVertexAttribArray(locs.aTex);
    gl.vertexAttribPointer(locs.aTex, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, _idxBuf);
  }

  function cleanupBuffers(gl, captures) {
    if (_posBuf) gl.deleteBuffer(_posBuf);
    if (_texBuf) gl.deleteBuffer(_texBuf);
    if (_idxBuf) gl.deleteBuffer(_idxBuf);
    for (var i = 0; i < captures.length; i++) {
      if (captures[i] && captures[i].texture) {
        gl.deleteTexture(captures[i].texture);
      }
    }
  }

  /* ======================================================================
     6. Scatter-Out / Scatter-In Orchestration
     ====================================================================== */

  window.wfScatterOutGL = function(url, angle, _sortedEls) {
    var ctx = wfGLCreate();
    if (!ctx) { location.href = url; return; }

    var gl = ctx.gl;
    var program = createProgram(gl, VERT_SRC, FRAG_SRC);
    if (!program) { location.href = url; return; }

    var geo = buildPlaneGeometry(12);

    var grain = document.querySelector('.wf-paper-grain');
    if (grain) grain.style.display = 'none';

    var atoms = collectAtoms();
    if (atoms.length === 0) { location.href = url; return; }

    var sorted = window.wfSortByWind ? window.wfSortByWind(atoms, angle) : [];
    if (sorted.length === 0) { location.href = url; return; }

    var capturePromises = [];
    var elements = [];
    for (var i = 0; i < sorted.length; i++) {
      elements.push(sorted[i].el);
      capturePromises.push(wfCaptureScrap(gl, sorted[i].el, i));
    }

    Promise.all(capturePromises).then(function(captures) {
      document.body.appendChild(ctx.canvas);

      // Hide everything behind the canvas — no opacity fade
      document.body.style.visibility = 'hidden';

      runBlowOff(ctx, program, geo, captures, angle, 850, 250, function() {
        if (ctx.canvas.parentNode) ctx.canvas.parentNode.removeChild(ctx.canvas);
        location.href = url;
      });
    }).catch(function() {
      location.href = url;
    });
  };

  window.wfScatterInGL = function(angle) {
    var ctx = wfGLCreate();
    if (!ctx) return;

    var gl = ctx.gl;
    var program = createProgram(gl, VERT_SRC, FRAG_SRC);
    if (!program) return;

    var geo = buildPlaneGeometry(12);

    var grain = document.querySelector('.wf-paper-grain');
    if (grain) grain.style.display = 'none';

    var atoms = collectAtoms();
    if (atoms.length === 0) return;

    var sorted = [];
    for (var i = 0; i < atoms.length; i++) {
      var rect = atoms[i].getBoundingClientRect();
      sorted.push({ el: atoms[i], y: rect.top });
    }
    sorted.sort(function(a, b) { return a.y - b.y; });

    var elements = [];
    var capturePromises = [];
    for (var i = 0; i < sorted.length; i++) {
      elements.push(sorted[i].el);
      capturePromises.push(wfCaptureScrap(gl, sorted[i].el, i));
    }

    Promise.all(capturePromises).then(function(captures) {
      for (var i = 0; i < elements.length; i++) {
        elements[i].style.visibility = 'hidden';
      }

      document.body.appendChild(ctx.canvas);

      runDropIn(ctx, program, geo, captures, 600, 200, 500, function() {
        for (var i = 0; i < elements.length; i++) {
          elements[i].style.visibility = '';
        }
        if (ctx.canvas.parentNode) ctx.canvas.parentNode.removeChild(ctx.canvas);
        if (grain) grain.style.display = '';
      });
    }).catch(function() {
      for (var i = 0; i < elements.length; i++) {
        elements[i].style.visibility = '';
      }
    });
  };

  /* ======================================================================
     7. In-Page Content Transition (Filter/Tab Changes)

     Scatter-out current content, update DOM, scatter-in new content.
     Only animates in napkin mode. Transparent canvas overlay so the
     rest of the page stays visible during the transition.
     ====================================================================== */

  var _contentTransitionLocked = false;

  /* Collect visible child elements within a container for scatter animation */
  function collectAtomsIn(containerEl) {
    var atoms = [];
    var children = containerEl.children;
    for (var i = 0; i < children.length; i++) {
      if (children[i].offsetWidth > 0 && children[i].offsetHeight > 0) {
        atoms.push(children[i]);
      }
    }
    return atoms;
  }

  /**
   * Animate content change within a container.
   * Current content scatters out, updateFn runs, new content scatters in.
   *
   * @param {Element} containerEl — DOM element whose children will animate
   * @param {Function} updateFn — called between scatter-out and scatter-in to update DOM
   */
  window.wfContentTransition = function(containerEl, updateFn) {
    // GL unavailable → just update
    if (!window._wfGLAvailable) {
      updateFn();
      return;
    }

    // Prevent overlapping transitions
    if (_contentTransitionLocked) {
      updateFn();
      return;
    }
    _contentTransitionLocked = true;

    var ctx = wfGLCreate({ transparent: true });
    if (!ctx) { _contentTransitionLocked = false; updateFn(); return; }

    // Transparent overlay so page shows through
    ctx.canvas.style.background = 'transparent';

    var gl = ctx.gl;
    var program = createProgram(gl, VERT_SRC, FRAG_SRC);
    if (!program) { _contentTransitionLocked = false; updateFn(); return; }

    var geo = buildPlaneGeometry(12);

    // Phase 1: Capture current content for scatter-out
    var outAtoms = collectAtomsIn(containerEl);
    if (outAtoms.length === 0) {
      _contentTransitionLocked = false;
      updateFn();
      return;
    }

    var angle = Math.random() * Math.PI * 2;

    // Sort by wind direction
    var windX = Math.cos(angle);
    var windY = Math.sin(angle);
    var sorted = [];
    for (var i = 0; i < outAtoms.length; i++) {
      var rect = outAtoms[i].getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      sorted.push({ el: outAtoms[i], dist: (-windX * cx) + (-windY * cy) });
    }
    sorted.sort(function(a, b) { return b.dist - a.dist; });

    var outPromises = [];
    for (var j = 0; j < sorted.length; j++) {
      outPromises.push(wfCaptureScrap(gl, sorted[j].el, j));
    }

    Promise.all(outPromises).then(function(outCaptures) {
      document.body.appendChild(ctx.canvas);
      containerEl.style.visibility = 'hidden';

      // Phase 2: Blow off current content (shorter duration for in-page feel)
      runBlowOff(ctx, program, geo, outCaptures, angle, 450, 100, function() {
        // Phase 3: Update DOM
        containerEl.style.visibility = '';
        updateFn();

        // Phase 4: Scatter in new content
        var inProgram = createProgram(gl, VERT_SRC, FRAG_SRC);
        if (!inProgram) {
          if (ctx.canvas.parentNode) ctx.canvas.parentNode.removeChild(ctx.canvas);
          _contentTransitionLocked = false;
          return;
        }

        var inGeo = buildPlaneGeometry(12);
        var inAtoms = collectAtomsIn(containerEl);
        if (inAtoms.length === 0) {
          if (ctx.canvas.parentNode) ctx.canvas.parentNode.removeChild(ctx.canvas);
          _contentTransitionLocked = false;
          return;
        }

        // Sort by vertical position for natural top-down drop
        inAtoms.sort(function(a, b) {
          return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
        });

        var inElements = [];
        var inPromises = [];
        for (var k = 0; k < inAtoms.length; k++) {
          inElements.push(inAtoms[k]);
          inPromises.push(wfCaptureScrap(gl, inAtoms[k], k));
        }

        Promise.all(inPromises).then(function(inCaptures) {
          for (var m = 0; m < inElements.length; m++) {
            inElements[m].style.visibility = 'hidden';
          }

          runDropIn(ctx, inProgram, inGeo, inCaptures, 400, 100, 250, function() {
            for (var n = 0; n < inElements.length; n++) {
              inElements[n].style.visibility = '';
            }
            if (ctx.canvas.parentNode) ctx.canvas.parentNode.removeChild(ctx.canvas);
            _contentTransitionLocked = false;
          }, { transparent: true });
        }).catch(function() {
          for (var p = 0; p < inElements.length; p++) {
            inElements[p].style.visibility = '';
          }
          if (ctx.canvas.parentNode) ctx.canvas.parentNode.removeChild(ctx.canvas);
          _contentTransitionLocked = false;
        });
      }, { transparent: true });
    }).catch(function() {
      containerEl.style.visibility = '';
      updateFn();
      _contentTransitionLocked = false;
    });
  };

})();
