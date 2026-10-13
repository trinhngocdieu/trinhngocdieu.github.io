/* leaves.js — falling momiji on a 2D canvas (no dependencies), after unihongo.com's header.
 * Seven-lobed, toothed maple leaves in red-to-amber gradients, at three depths: small blurred
 * ones far back, crisp ones in the middle, a few large soft ones up front. Each glides from
 * side to side (slowest at the turns), leaning into the swing and either rocking or flipping
 * right over as it slowly spins; the whole fall drifts on Kawaguchi's live wind, set from
 * site.js. The cursor brushes leaves aside; scrolling moves near leaves faster than far ones. */
(function () {
  'use strict';
  var canvas = document.getElementById('leaves');
  if (!canvas) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var api = { setWind: function () {}, setTheme: function () {}, setEnabled: function () {}, ok: false };
  window.WIND = api;

  var ctx = canvas.getContext('2d');
  if (!ctx || !window.Path2D) { canvas.remove(); return; }

  /* ---------- the leaf: unihongo's momiji, in a 48-unit box centred on the stem joint ---------- */
  var OUTLINE = 'M0 0L-1.9 -0.8L-2.2 -0.1L-3.7 -0.4L-3.9 0.5L-5.3 0.5L-5.4 1.4L-6.6 1.7L-6.7 2.7L-7.7 3.2L-7.7 4.2L-8.6 6L-6.6 5.8L-5.6 6.1L-4.8 5.3L-3.8 5.6L-3.2 4.6L-2.3 4.8L-1.8 3.5L-0.9 3.6L-0.7 2.1L0.1 2L0 0ZM0 0L-1.2 -1.9L-2 -1.7L-3.2 -3L-4.1 -2.6L-5.3 -3.6L-6.2 -3L-7.5 -3.7L-8.3 -3L-9.6 -3.5L-10.5 -2.7L-11.8 -3L-12.7 -2.2L-14.9 -1.3L-12.9 0L-12.2 0.9L-10.8 0.9L-10.1 1.7L-8.7 1.5L-8 2.3L-6.6 1.9L-5.9 2.6L-4.5 1.8L-3.7 2.4L-2.3 1.3L-1.5 1.7L0 0ZM0 0L0.4 -2.2L-0.4 -2.5L-0.4 -4.3L-1.3 -4.6L-1.5 -6.2L-2.5 -6.4L-2.8 -7.9L-3.9 -8L-4.4 -9.3L-5.4 -9.4L-6.1 -10.6L-7.2 -10.7L-7.9 -11.8L-9 -11.8L-9.9 -12.8L-11 -12.8L-13.2 -13.7L-12.5 -11.4L-12.5 -10.3L-11.5 -9.4L-11.5 -8.3L-10.4 -7.5L-10.4 -6.4L-9.2 -5.8L-9.2 -4.7L-7.9 -4.1L-7.8 -3.1L-6.3 -2.7L-6.2 -1.7L-4.5 -1.5L-4.3 -0.6L-2.5 -0.5L-2.2 0.3L0 0ZM0 0L1.8 -1.3L1.4 -2.1L2.7 -3.5L2.2 -4.3L3.3 -5.6L2.7 -6.5L3.5 -7.8L2.9 -8.6L3.6 -9.9L2.9 -10.8L3.4 -12.1L2.7 -12.9L3 -14.2L2.3 -15L2.5 -16.4L1.7 -17.2L1.8 -18.5L1 -19.4L0 -21.5L-1 -19.4L-1.8 -18.5L-1.7 -17.2L-2.5 -16.4L-2.3 -15L-3 -14.2L-2.7 -12.9L-3.4 -12.1L-2.9 -10.8L-3.6 -9.9L-2.9 -8.6L-3.5 -7.8L-2.7 -6.5L-3.3 -5.6L-2.2 -4.3L-2.7 -3.5L-1.4 -2.1L-1.8 -1.3L0 0ZM0 0L2.2 0.3L2.5 -0.5L4.3 -0.6L4.5 -1.5L6.2 -1.7L6.3 -2.7L7.8 -3.1L7.9 -4.1L9.2 -4.7L9.2 -5.8L10.4 -6.4L10.4 -7.5L11.5 -8.3L11.5 -9.4L12.5 -10.3L12.5 -11.4L13.2 -13.7L11 -12.8L9.9 -12.8L9 -11.8L7.9 -11.8L7.2 -10.7L6.1 -10.6L5.4 -9.4L4.4 -9.3L3.9 -8L2.8 -7.9L2.5 -6.4L1.5 -6.2L1.3 -4.6L0.4 -4.3L0.4 -2.5L-0.4 -2.2L0 0ZM0 0L1.5 1.7L2.3 1.3L3.7 2.4L4.5 1.8L5.9 2.6L6.6 1.9L8 2.3L8.7 1.5L10.1 1.7L10.8 0.9L12.2 0.9L12.9 0L14.9 -1.3L12.7 -2.2L11.8 -3L10.5 -2.7L9.6 -3.5L8.3 -3L7.5 -3.7L6.2 -3L5.3 -3.6L4.1 -2.6L3.2 -3L2 -1.7L1.2 -1.9L0 0ZM0 0L-0.1 2L0.7 2.1L0.9 3.6L1.8 3.5L2.3 4.8L3.2 4.6L3.8 5.6L4.8 5.3L5.6 6.1L6.6 5.8L8.6 6L7.7 4.2L7.7 3.2L6.7 2.7L6.6 1.7L5.4 1.4L5.3 0.5L3.9 0.5L3.7 -0.4L2.2 -0.1L1.9 -0.8L0 0Z';
  var BODY = new Path2D(OUTLINE);
  BODY.moveTo(3.1, 0); BODY.arc(0, 0, 3.1, 0, Math.PI * 2);
  var VEINS = new Path2D('M0 0L-7.6 5.3M0 0L-13.1 -1.2M0 0L-11.6 -12M0 0L0 -18.9M0 0L11.6 -12M0 0L13.1 -1.2M0 0L7.6 5.3');
  var STEM = new Path2D('M0 1.5Q1 9 0.6 16');
  var GRADIENTS = [
    ['#ff5a4a', '#b3001b'], ['#ff7043', '#c62828'], ['#ff8c42', '#d84315'],
    ['#ffa726', '#e65100'], ['#ffb300', '#ef6c00'], ['#e53935', '#8e0e0e']
  ];

  // size: CSS px per 48-unit box; fall: px/s; flutter: seconds per glide (there and back); sway: px
  var LAYERS = {
    back: { size: [12, 17], fall: [16, 24], flutter: [2.2, 3.2], sway: [8, 14], alpha: 0.42, blur: 0.6, z: 0.4 },
    mid: { size: [19, 29], fall: [26, 40], flutter: [2.8, 4.2], sway: [12, 24], alpha: 0.78, blur: 0, z: 0.7 },
    near: { size: [36, 46], fall: [44, 58], flutter: [3.4, 4.8], sway: [18, 30], alpha: 0.3, blur: 1.3, z: 1 }
  };
  var TIP = 55 * Math.PI / 180;                             // how far a rocking leaf tips toward / away from the eye

  function rand(r) { return r[0] + Math.random() * (r[1] - r[0]); }

  /* ---------- sprites: each gradient at each depth, drop shadow and blur baked in ---------- */
  var RES = 2.4, PX = Math.ceil(56 * RES);                  // units -28..28 at 2.4 sprite px per unit
  function sprite(colors, layer) {
    var perCss = RES * 48 / ((layer.size[0] + layer.size[1]) / 2);  // sprite px per CSS px at this depth
    var a = document.createElement('canvas'); a.width = a.height = PX;
    var g = a.getContext('2d');
    g.setTransform(RES, 0, 0, RES, PX / 2, PX / 2);
    // SVG's objectBoundingBox gradient (0,0 → 1,1) over the outline's box
    var x0 = -14.9, y0 = -21.5, w = 29.8, h = 27.5, k = 2 / (1 / (w * w) + 1 / (h * h));
    var grad = g.createLinearGradient(x0, y0, x0 + k / w, y0 + k / h);
    grad.addColorStop(0, colors[0]); grad.addColorStop(1, colors[1]);
    g.fillStyle = grad; g.fill(BODY);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(60, 5, 5, .32)'; g.lineWidth = 0.55; g.stroke(VEINS);
    g.strokeStyle = 'rgba(110, 30, 15, .8)'; g.lineWidth = 1; g.stroke(STEM);

    var b = document.createElement('canvas'); b.width = b.height = PX;
    var gb = b.getContext('2d');
    gb.shadowColor = 'rgba(60, 10, 0, .2)'; gb.shadowOffsetY = perCss; gb.shadowBlur = perCss;
    gb.drawImage(a, 0, 0);
    if (!layer.blur || !('filter' in gb)) return b;

    var c = document.createElement('canvas'); c.width = c.height = PX;
    var gc = c.getContext('2d');
    gc.filter = 'blur(' + (layer.blur * perCss).toFixed(2) + 'px)';
    gc.drawImage(b, 0, 0);
    return c;
  }
  var SPRITES = {};
  Object.keys(LAYERS).forEach(function (n) { SPRITES[n] = GRADIENTS.map(function (c) { return sprite(c, LAYERS[n]); }); });

  /* ---------- state ---------- */
  var W = 0, H = 0, dpr = 1, leaves = [], dim = 1;
  var wind = { dir: 225, speed: 10, x: 0, y: 0, tx: 0, ty: 0 };
  var gust = { v: 0, t: 0, dur: 0, peak: 0, next: 4 };
  var mouse = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };
  var enabled = true, running = false, hidden = document.hidden, raf = 0, last = 0;

  function fromWind() {
    var phi = wind.dir * Math.PI / 180, s = Math.min(wind.speed, 45) / 45;
    var mag = 6 + s * 70;                                     // px / s
    wind.tx = -Math.sin(phi) * mag;                           // toward-direction, x east
    wind.ty = Math.cos(phi) * mag * 0.25;                     // a north wind (from 0°) pushes leaves down the screen
  }

  // depth by slot, as on unihongo: 3 near and 6 back in every 19; small screens keep the middle only
  function layerOf(i) {
    if (W < 968) return 'mid';
    var j = i % 19;
    return j === 3 || j === 9 || j === 15 ? 'near' : j % 3 === 1 ? 'back' : 'mid';
  }

  function spawn(L, anywhere) {
    var S = LAYERS[L.layer];
    L.z = S.z;
    L.alpha = S.alpha;
    L.img = SPRITES[L.layer][(Math.random() * GRADIENTS.length) | 0];
    L.size = rand(S.size);
    L.fall = rand(S.fall);
    L.flutter = rand(S.flutter);
    L.sway = rand(S.sway);
    L.tilt = (16 + Math.random() * 14) * Math.PI / 180;
    L.flip = Math.random() < 0.4;
    L.rot = Math.random() * Math.PI * 2;
    L.spin = Math.PI * 2 / (10 + Math.random() * 18) * (Math.random() < 0.5 ? -1 : 1);
    L.t = Math.random();
    L.kick = 0;
    var T = (H + 160) / L.fall, drift = wind.x * L.z * T * 0.8;
    L.x = Math.random() * (W + 160) - 80 - (anywhere ? drift * Math.random() : drift);
    L.y = anywhere ? Math.random() * H : -40 - Math.random() * 120;
    L.vx = wind.x * L.z; L.vy = L.fall;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var n = Math.max(8, Math.min(30, Math.round(W * H / 45000)));
    leaves.sort(function (a, b) { return a.slot - b.slot; });
    if (leaves.length > n) leaves.length = n;
    for (var i = 0; i < n; i++) {
      var L = leaves[i] || (leaves[i] = { slot: i }), layer = layerOf(i);
      if (L.layer !== layer) { L.layer = layer; spawn(L, true); }
    }
    leaves.sort(function (a, b) { return a.z - b.z; });     // far ones first, near ones over them
  }

  /* ---------- simulation ---------- */
  function gusts(dt) {
    gust.next -= dt;
    if (gust.dur === 0 && gust.next <= 0) { gust.dur = 2.2 + Math.random() * 2; gust.t = 0; gust.peak = 0.5 + Math.random() * 0.8; }
    if (gust.dur) {
      gust.t += dt;
      var k = gust.t / gust.dur;
      gust.v = k >= 1 ? 0 : Math.sin(Math.PI * k) * gust.peak;
      if (k >= 1) { gust.dur = 0; gust.next = 6 + Math.random() * 9; }
    }
  }

  function update(dt) {
    gusts(dt);
    var ease = Math.min(1, dt * 0.8);
    wind.x += (wind.tx - wind.x) * ease; wind.y += (wind.ty - wind.y) * ease;
    var gx = wind.x * (1 + gust.v * 1.5) + (Math.abs(wind.x) < 20 ? gust.v * 30 : 0);
    var follow = Math.min(1, dt * 1.2);
    mouse.vx *= Math.pow(0.02, dt); mouse.vy *= Math.pow(0.02, dt);
    for (var i = 0; i < leaves.length; i++) {
      var L = leaves[i];
      L.t += dt * (1 + gust.v * 0.5 + L.kick * 0.4) / L.flutter;
      L.vx += (gx * L.z - L.vx) * follow;
      L.vy += (L.fall + wind.y * L.z - L.vy) * follow;
      if (mouse.t) {
        var dx = L.x - mouse.x, dy = L.y - mouse.y, f = Math.exp(-(dx * dx + dy * dy) / (2 * 70 * 70));
        if (f > 0.02) { L.vx += mouse.vx * f * dt * 5; L.vy += mouse.vy * f * dt * 5; L.kick = Math.min(4, L.kick + f * dt * 8); }
      }
      L.kick *= Math.pow(0.25, dt);
      L.x += L.vx * dt; L.y += L.vy * dt;
      L.rot += L.spin * dt * (1 + gust.v + L.kick);
      if (L.y > H + 60 || L.y < -260 || L.x < -W * 0.8 - 200 || L.x > W * 1.8 + 200) spawn(L, false);
    }
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < leaves.length; i++) {
      var L = leaves[i], a = Math.PI * 2 * L.t, s2 = Math.sin(2 * a);
      var x = L.x - L.sway * Math.cos(a), y = L.y + L.sway * 0.22 * s2;   // glide, dipping mid-swing
      var tip = L.flip ? Math.PI / 2 + a + 0.5 * s2 : TIP * Math.cos(a);  // rotateX: rock, or tumble right over
      var q = Math.cos(tip), r = L.rot + L.tilt * Math.sin(a), cr = Math.cos(r), sr = Math.sin(r);
      var k = dpr * L.size / 48 / RES;
      ctx.setTransform(k * cr, k * q * sr, -k * sr, k * q * cr, dpr * x, dpr * y);
      ctx.globalAlpha = L.alpha * dim;
      ctx.drawImage(L.img, -PX / 2, -PX / 2);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    update(dt); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || !enabled || hidden || reduce) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  /* ---------- input ---------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      var now = performance.now();
      if (mouse.t) {
        var dt = Math.max((now - mouse.t) / 1000, 1 / 120);
        var vx = (e.clientX - mouse.x) / dt, vy = (e.clientY - mouse.y) / dt, m = Math.hypot(vx, vy), cap = 1400;
        if (m > cap) { vx *= cap / m; vy *= cap / m; }
        mouse.vx = mouse.vx * 0.5 + vx * 0.5; mouse.vy = mouse.vy * 0.5 + vy * 0.5;
      }
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = now;
    }, { passive: true });
    document.addEventListener('pointerleave', function () { mouse.t = 0; mouse.vx = mouse.vy = 0; });
  }

  var lastScroll = window.scrollY;
  window.addEventListener('scroll', function () {
    var d = window.scrollY - lastScroll; lastScroll = window.scrollY;
    if (!running) return;
    for (var i = 0; i < leaves.length; i++) leaves[i].y -= d * (0.1 + 0.4 * leaves[i].z);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () { hidden = document.hidden; if (hidden) stop(); else start(); });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); draw(); }, 150);
  });

  /* ---------- public api ---------- */
  api.ok = true;
  api.setWind = function (dir, speed) {
    if (typeof dir === 'number' && !isNaN(dir)) wind.dir = dir;
    if (typeof speed === 'number' && !isNaN(speed)) wind.speed = speed;
    fromWind();
  };
  api.setTheme = function () {
    dim = document.documentElement.getAttribute('data-theme') === 'dark' ? 0.85 : 1;
    if (!running) draw();
  };
  api.setEnabled = function (on) {
    enabled = !!on;
    if (enabled) start(); else stop();
  };

  /* ---------- boot ---------- */
  fromWind(); wind.x = wind.tx; wind.y = wind.ty;
  resize();
  api.setTheme();
  draw();                                                   // reduced motion keeps this one still frame
  if (document.documentElement.getAttribute('data-field') !== 'off') start();
  else enabled = false;
})();
