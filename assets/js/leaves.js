/* leaves.js — autumn leaves on a 2D canvas (no dependencies).
 * Ginkgo for Tokyo, keyaki (zelkova) for Saitama, momiji for the season.
 * Each leaf falls like a pendulum, tumbles in 3D (a squashed x-scale shows its paler underside)
 * and drifts on Kawaguchi's live wind, set from site.js. The cursor brushes leaves aside;
 * scrolling moves near leaves faster than far ones. */
(function () {
  'use strict';
  var canvas = document.getElementById('leaves');
  if (!canvas) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var api = { setWind: function () {}, setTheme: function () {}, setEnabled: function () {}, ok: false };
  window.WIND = api;

  var ctx = canvas.getContext('2d');
  if (!ctx || !window.Path2D) { canvas.remove(); return; }

  /* ---------- shapes (unit leaf: tip near y=-1, stem toward y=+1) ---------- */
  function poly(p, pts) { p.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); }

  // momiji: five pointed lobes fanned around the stem, each with two small teeth per side
  function maple() {
    var lobes = 5, spread = 3.9, step = spread / (lobes - 1), pts = [[0, 0.3]];
    for (var i = 0; i < lobes; i++) {
      var t = i / (lobes - 1) - 0.5, a = -Math.PI / 2 + t * spread;
      var ax = Math.cos(a), ay = Math.sin(a), len = 1 - Math.abs(t) * 0.55;
      var tip = [ax * len, ay * len];
      var n0 = i === 0 ? [0, 0.3] : [Math.cos(a - step / 2) * 0.42, Math.sin(a - step / 2) * 0.42];
      var n1 = i === lobes - 1 ? [0, 0.3] : [Math.cos(a + step / 2) * 0.42, Math.sin(a + step / 2) * 0.42];
      var at = function (p0, p1, f) { return [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f]; };
      var tooth = function (b) {                              // a small tooth, out from the lobe's axis and leaning toward its tip
        var d = b[0] * ax + b[1] * ay, ox = b[0] - ax * d, oy = b[1] - ay * d, m = Math.hypot(ox, oy) || 1;
        return [b[0] + ox / m * 0.08 + ax * 0.06, b[1] + oy / m * 0.08 + ay * 0.06];
      };
      [0.42, 0.72].forEach(function (f) { var b = at(n0, tip, f); pts.push(b, tooth(b)); });
      pts.push(tip);
      [0.28, 0.58].forEach(function (f) { var b = at(tip, n1, f); pts.push(tooth(b), b); });
      if (i < lobes - 1) pts.push(n1);
    }
    var p = new Path2D(); poly(p, pts);
    var v = new Path2D();
    for (var j = 0; j < lobes; j++) {
      var tt = j / (lobes - 1) - 0.5, aa = -Math.PI / 2 + tt * spread, ll = (1 - Math.abs(tt) * 0.55) * 0.82;
      v.moveTo(0, 0.12); v.lineTo(Math.cos(aa) * ll, Math.sin(aa) * ll);
    }
    v.moveTo(0, 0.12); v.lineTo(0, 0.78);
    return { body: p, veins: v };
  }

  // ichō: a fan with a notch in the middle of its outer edge, fine veins radiating from the stem
  function ginkgo() {
    var p = new Path2D();
    p.moveTo(0, 0.32);
    p.bezierCurveTo(-0.16, 0.12, -0.72, -0.18, -0.98, -0.42);
    p.quadraticCurveTo(-0.66, -1.0, -0.13, -0.86);
    p.lineTo(0, -0.58);
    p.lineTo(0.13, -0.86);
    p.quadraticCurveTo(0.66, -1.0, 0.98, -0.42);
    p.bezierCurveTo(0.72, -0.18, 0.16, 0.12, 0, 0.32);
    p.closePath();
    var v = new Path2D();
    for (var i = 0; i < 9; i++) {
      var a = -Math.PI / 2 + (i / 8 - 0.5) * 1.95, r = i === 4 ? 0.0 : 0.82;
      if (!r) continue;
      v.moveTo(0, 0.26); v.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.95 + 0.04);
    }
    v.moveTo(0, 0.3); v.lineTo(0.02, 0.92);
    return { body: p, veins: v };
  }

  // keyaki: ovate, pointed tip, finely toothed edge, straight side veins
  function keyaki() {
    var n = 9, right = [], left = [];
    var w = function (t) { return 0.44 * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.36)), 0.85); };
    for (var i = 0; i <= n; i++) {
      var t = i / n, y = -1 + t * 1.62, x = w(t);
      right.push([x, y]); left.push([-x, y]);
      if (i < n) {
        var t2 = (i + 0.65) / n, y2 = -1 + t2 * 1.62, x2 = w(t2) + 0.055;
        right.push([x2, y2 - 0.05]); left.push([-x2, y2 - 0.05]);
      }
    }
    var p = new Path2D(); poly(p, right.concat(left.reverse()));
    var v = new Path2D();
    v.moveTo(0, -0.96); v.lineTo(0, 0.95);
    for (var k = 1; k < 8; k++) {
      var tk = k / 9, yk = -1 + tk * 1.62, xk = w(tk + 0.06) * 0.85;
      v.moveTo(0, yk + 0.1); v.lineTo(xk, yk - 0.04);
      v.moveTo(0, yk + 0.1); v.lineTo(-xk, yk - 0.04);
    }
    return { body: p, veins: v };
  }

  var SHAPES = { maple: maple(), ginkgo: ginkgo(), keyaki: keyaki() };
  var KINDS = ['ginkgo', 'ginkgo', 'ginkgo', 'ginkgo', 'maple', 'maple', 'maple', 'keyaki', 'keyaki', 'keyaki'];

  var PALETTES = {
    light: {
      maple: ['#c8341f', '#d9481c', '#b02a26', '#e0662a'],
      ginkgo: ['#e8b520', '#efc232', '#d9a01a', '#e2a92a'],
      keyaki: ['#c46a28', '#a8582a', '#d98a2b', '#8f4a24'],
      under: '#f3e6cc', mix: 0.38, vein: 'rgba(60, 25, 10, .28)', alpha: [0.62, 0.96], shadow: 'rgba(14, 27, 46, .16)'
    },
    dark: {
      maple: ['#ff5a3c', '#ff7442', '#e8473a', '#ff8a4a'],
      ginkgo: ['#ffcc3d', '#f5b82a', '#ffd75c', '#f0a92a'],
      keyaki: ['#e68a3c', '#d0743a', '#f0a040', '#c0662e'],
      under: '#5a3a26', mix: 0.42, vein: 'rgba(20, 8, 0, .38)', alpha: [0.42, 0.88], shadow: null
    }
  };
  var pal = PALETTES.light;

  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, k) { var x = hex(a), y = hex(b); return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * k); }).join(',') + ')'; }

  /* ---------- state ---------- */
  var W = 0, H = 0, dpr = 1, leaves = [];
  var wind = { dir: 225, speed: 10, x: 0, y: 0, tx: 0, ty: 0 };
  var gust = { v: 0, t: 0, dur: 0, peak: 0, next: 4 };
  var mouse = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };
  var enabled = true, running = false, hidden = document.hidden, raf = 0, last = 0;

  function fromWind() {
    var phi = wind.dir * Math.PI / 180, s = Math.min(wind.speed, 45) / 45;
    var mag = 14 + s * 120;                                   // px / s
    wind.tx = -Math.sin(phi) * mag;                           // toward-direction, x east
    wind.ty = Math.cos(phi) * mag * 0.25;                     // a north wind (from 0°) pushes leaves down the screen
  }

  function color(L) {
    var list = pal[L.kind];
    L.front = list[L.ci % list.length];
    L.back = mix(L.front, pal.under, pal.mix);
    L.alpha = pal.alpha[0] + (pal.alpha[1] - pal.alpha[0]) * (L.z - 0.35) / 0.65;
  }

  function spawn(L, anywhere) {
    L.z = 0.35 + Math.random() * 0.65;
    L.kind = KINDS[(Math.random() * KINDS.length) | 0];
    L.ci = (Math.random() * 4) | 0;
    L.size = (L.kind === 'maple' ? 12 : L.kind === 'ginkgo' ? 11 : 10) + 17 * L.z;
    L.fall = 24 + 34 * L.z + Math.random() * 10;
    L.phase = Math.random() * Math.PI * 2;
    L.freq = 1.1 + Math.random() * 1.1;
    L.amp = 22 + Math.random() * 46;
    L.flip = Math.random() * Math.PI * 2;
    L.spin = (0.6 + Math.random() * 2.2) * (Math.random() < 0.5 ? -1 : 1);
    L.base = Math.random() * Math.PI * 2;
    L.turn = (Math.random() - 0.5) * 0.8;
    L.kick = 0;
    var T = (H + 160) / L.fall, drift = wind.x * L.z * T * 0.8;
    L.x = Math.random() * (W + 160) - 80 - (anywhere ? drift * Math.random() : drift);
    L.y = anywhere ? Math.random() * H : -40 - Math.random() * 120;
    L.vx = wind.x * L.z; L.vy = L.fall;
    color(L);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var n = Math.max(10, Math.min(34, Math.round(W * H / 42000)));
    while (leaves.length < n) { var L = {}; spawn(L, true); leaves.push(L); }
    if (leaves.length > n) leaves.length = n;
    leaves.sort(function (a, b) { return a.z - b.z; });
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
    var follow = Math.min(1, dt * 1.8);
    mouse.vx *= Math.pow(0.02, dt); mouse.vy *= Math.pow(0.02, dt);
    for (var i = 0; i < leaves.length; i++) {
      var L = leaves[i];
      L.phase += L.freq * dt;
      var c = Math.cos(L.phase);
      var vx = gx * L.z + L.amp * c;                                   // pendulum sway on top of the wind
      var vy = L.fall * (0.5 + 0.5 * Math.abs(c)) + wind.y * L.z;     // slows at the top of each swing
      L.vx += (vx - L.vx) * follow; L.vy += (vy - L.vy) * follow;
      if (mouse.t) {
        var dx = L.x - mouse.x, dy = L.y - mouse.y, f = Math.exp(-(dx * dx + dy * dy) / (2 * 70 * 70));
        if (f > 0.02) { L.vx += mouse.vx * f * dt * 5; L.vy += mouse.vy * f * dt * 5; L.kick = Math.min(4, L.kick + f * dt * 8); }
      }
      L.kick *= Math.pow(0.25, dt);
      L.x += L.vx * dt; L.y += L.vy * dt;
      L.flip += L.spin * dt * (1 + gust.v * 1.2 + L.kick);
      L.base += L.turn * dt;
      if (L.y > H + 60 || L.y < -260 || L.x < -W * 0.8 - 200 || L.x > W * 1.8 + 200) spawn(L, false);
    }
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var i = 0; i < leaves.length; i++) {
      var L = leaves[i], S = SHAPES[L.kind];
      var fx = Math.cos(L.flip), sx = (Math.abs(fx) < 0.06 ? (fx < 0 ? -0.06 : 0.06) : fx) * L.size, sy = L.size;
      var r = L.base + 0.55 * Math.sin(L.phase), cr = Math.cos(r), sr = Math.sin(r);
      ctx.setTransform(dpr * cr * sx, dpr * sr * sx, -dpr * sr * sy, dpr * cr * sy, dpr * L.x, dpr * L.y);
      ctx.globalAlpha = L.alpha;
      if (pal.shadow && L.z > 0.78) { ctx.shadowColor = pal.shadow; ctx.shadowBlur = 8 * dpr; ctx.shadowOffsetY = 4 * dpr; }
      ctx.fillStyle = fx >= 0 ? L.front : L.back;
      ctx.fill(S.body);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = pal.vein; ctx.lineWidth = 1 / L.size;
      ctx.stroke(S.veins);
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
    pal = document.documentElement.getAttribute('data-theme') === 'dark' ? PALETTES.dark : PALETTES.light;
    leaves.forEach(color);
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
