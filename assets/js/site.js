/* site.js — behaviours: theme, graticule, Tokyo clock + live wind, name gust, reveals, copy, shortcuts. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- the Tokyo sun: drives the default theme, the sky glow and the sun arc ---------- */
  var LAT = 35.6762 * Math.PI / 180, LON = 139.6503;
  function solar(date) {
    var d = new Date((date || new Date()).getTime() + 9 * 3600e3);            // JST, read through the UTC getters
    var N = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
    var B = 2 * Math.PI * (N - 81) / 364, eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    var decl = 0.4091 * Math.sin(2 * Math.PI * (284 + N) / 365);
    var mins = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    var noon = 720 - (LON - 135) * 4 - eot;
    var H = (mins - noon) / 4 * Math.PI / 180;
    var elev = Math.asin(Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(H)) * 180 / Math.PI;
    var cosH0 = (Math.sin(-0.833 * Math.PI / 180) - Math.sin(LAT) * Math.sin(decl)) / (Math.cos(LAT) * Math.cos(decl));
    var H0 = Math.acos(Math.max(-1, Math.min(1, cosH0))) * 180 / Math.PI * 4;
    return { elev: elev, sunrise: noon - H0, sunset: noon + H0, now: mins };
  }
  function hhmm(m) { m = ((m % 1440) + 1440) % 1440; var h = Math.floor(m / 60), mm = Math.round(m % 60); if (mm === 60) { h = (h + 1) % 24; mm = 0; } return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; }

  /* ---------- theme: follows Tokyo's daylight until you choose ---------- */
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    var m = $('meta[name="theme-color"]:not([media])');
    if (m) m.setAttribute('content', t === 'dark' ? '#0a1424' : '#edf1f5');
    $$('.theme-btn').forEach(function (b) { b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false'); });
    if (window.WIND) window.WIND.setTheme();
    sky();
  }
  function autoTheme() { if (store.get('theme')) return; var t = solar().elev < -6 ? 'dark' : 'light'; if (root.getAttribute('data-theme') !== t) applyTheme(t); }
  function toggleTheme() {
    var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    store.set('theme', t); applyTheme(t);
    $$('.theme-btn').forEach(function (b) { b.title = 'Theme: your choice'; });
  }
  $$('.theme-btn').forEach(function (b) { b.addEventListener('click', toggleTheme); b.title = store.get('theme') ? 'Theme: your choice' : 'Theme follows Tokyo’s daylight — click to choose'; });
  setInterval(autoTheme, 60000);

  /* ---------- sky glow, daylight readout, sun arc ---------- */
  var skyEl = $('.sky');
  function sky() {
    var s = solar(), e = s.elev, dark = root.getAttribute('data-theme') === 'dark';
    var f = (s.now - s.sunrise) / (s.sunset - s.sunrise);                   // 0 at sunrise … 1 at sunset
    var col, a;
    if (e > 12) { col = '255,214,150'; a = 0.2; }
    else if (e > -6) { col = '255,122,60'; a = 0.32; }
    else if (e > -12) { col = '150,90,170'; a = 0.16; }
    else { col = '70,110,190'; a = 0.1; }
    if (dark) a *= 0.7;
    if (skyEl) {
      skyEl.style.setProperty('--sun-x', (88 - 76 * Math.max(-0.15, Math.min(1.15, f))).toFixed(1) + '%');
      skyEl.style.setProperty('--sun-y', (100 - 92 * Math.max(0, Math.min(1, (e + 8) / 78))).toFixed(1) + '%');
      skyEl.style.setProperty('--sun-color', 'rgb(' + col + ')');
      skyEl.style.setProperty('--sun-a', a.toFixed(2));
    }
    var label = e > 0 ? 'Sun up · sets ' + hhmm(s.sunset) : (e > -6 ? 'Twilight' : 'Sun down · rises ' + hhmm(s.sunrise));
    if (e > 0 && e < 8) label = 'Golden hour · ' + (f < 0.5 ? 'rose ' + hhmm(s.sunrise) : 'sets ' + hhmm(s.sunset));
    setText('[data-daylight]', label);
    $$('.sunarc').forEach(function (svg) {
      var th = Math.PI * (1 - Math.max(-0.35, Math.min(1.35, f)));
      var x = 160 + 100 * Math.cos(th), y = e < -0.833 ? 116 : 110 - 100 * Math.sin(th);   // below the horizon: rest just under the line
      var sun = svg.querySelector('.sun'); if (sun) sun.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
      svg.classList.toggle('night', e < -0.833);
      var r = svg.querySelector('.t-rise'), st = svg.querySelector('.t-set');
      if (r) r.textContent = '↑ ' + hhmm(s.sunrise);
      if (st) st.textContent = '↓ ' + hhmm(s.sunset);
    });
  }
  sky(); setInterval(sky, 60000);

  /* ---------- wind toggle ---------- */
  function setWindEnabled(on, persist) {
    root.setAttribute('data-field', on ? 'on' : 'off');
    $$('[data-wind-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.querySelector('span').textContent = on ? 'Wind on' : 'Wind off'; });
    if (window.WIND) window.WIND.setEnabled(on);
    if (persist) store.set('wind', on ? 'on' : 'off');
  }
  $$('[data-wind-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { setWindEnabled(root.getAttribute('data-field') === 'off', true); });
  });
  setWindEnabled(root.getAttribute('data-field') !== 'off', false);

  /* ---------- graticule ---------- */
  var rx = $('.ruler-x'), ry = $('.ruler-y'), cr = $('.cursor-readout');
  if (rx && ry && fine) {
    var size = 24;
    function buildRuler() {
      var cs = getComputedStyle(root); size = parseInt(cs.getPropertyValue('--ruler')) || 0;
      if (!size) return;
      $$('span', rx).forEach(function (s) { s.remove(); }); $$('span', ry).forEach(function (s) { s.remove(); });
      var i, s;
      for (i = 100; i < window.innerWidth - size; i += 100) { s = d.createElement('span'); s.textContent = i; s.style.left = i + 'px'; rx.appendChild(s); }
      for (i = 100; i < window.innerHeight - size; i += 100) { s = d.createElement('span'); s.textContent = i; s.style.top = i + 'px'; ry.appendChild(s); }
    }
    buildRuler();
    var rrt; window.addEventListener('resize', function () { clearTimeout(rrt); rrt = setTimeout(buildRuler, 120); });
    var pend = null;
    window.addEventListener('pointermove', function (e) {
      if (pend) return;
      pend = requestAnimationFrame(function () {
        pend = null;
        rx.style.setProperty('--mx', (e.clientX - size) + 'px');
        ry.style.setProperty('--my', (e.clientY - size) + 'px');
        if (cr) { cr.textContent = 'x ' + (e.clientX - size) + '  y ' + (e.clientY - size); cr.classList.add('on'); }
      });
    }, { passive: true });
    d.addEventListener('mouseleave', function () { if (cr) cr.classList.remove('on'); });
  }

  /* ---------- Tokyo clock ---------- */
  var clocks = $$('[data-clock]');
  if (clocks.length) {
    var fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    var tick = function () { var t = fmt.format(new Date()); clocks.forEach(function (c) { c.textContent = t; }); };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- live wind (Open-Meteo, Tokyo) ---------- */
  var BEAUFORT = [
    [1, 'Calm', 'smoke rises vertically.'],
    [5, 'Light air', 'smoke drifts, wind vanes stay still.'],
    [11, 'Light breeze', 'wind felt on the face; leaves rustle.'],
    [19, 'Gentle breeze', 'leaves and small twigs in constant motion.'],
    [28, 'Moderate breeze', 'raises dust and loose paper; small branches move.'],
    [38, 'Fresh breeze', 'small trees in leaf begin to sway.'],
    [49, 'Strong breeze', 'large branches in motion; umbrellas are a struggle.'],
    [61, 'Near gale', 'whole trees in motion; walking against it is an effort.'],
    [74, 'Gale', 'twigs break off trees; progress impeded.'],
    [88, 'Strong gale', 'slight structural damage.'],
    [102, 'Storm', 'trees uprooted; considerable damage.'],
    [117, 'Violent storm', 'widespread damage.'],
    [1e9, 'Hurricane', 'devastation.']
  ];
  var WMO = { 0: 'clear', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'rime fog', 51: 'light drizzle', 53: 'drizzle', 55: 'dense drizzle', 56: 'freezing drizzle', 57: 'freezing drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains', 80: 'light showers', 81: 'showers', 82: 'heavy showers', 85: 'snow showers', 86: 'snow showers', 95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'thunderstorm with hail' };
  var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

  function setText(sel, v) { $$(sel).forEach(function (n) { n.textContent = v; }); }
  var live = { dir: 225, speed: 10, cur: null, isLive: false };
  function applyWind(cur, isLive) {
    var spd = Math.round(cur.wind_speed_10m), dir = Math.round(cur.wind_direction_10m);
    live.dir = dir; live.speed = spd; live.cur = cur; live.isLive = isLive;
    var manual = !!$('.rose.manual');
    var b = 0; while (b < BEAUFORT.length - 1 && spd > BEAUFORT[b][0]) b++;
    var comp = COMPASS[Math.round(dir / 22.5) % 16];
    setText('[data-wind]', spd + ' km/h');
    setText('[data-dir]', comp + ' ' + dir + '°');
    if (typeof cur.temperature_2m === 'number') setText('[data-temp]', Math.round(cur.temperature_2m) + '°C');
    if (cur.weather_code in WMO) setText('[data-cond]', WMO[cur.weather_code]);
    setText('[data-bf-n]', 'F' + b);
    setText('[data-bf-name]', BEAUFORT[b][1]);
    setText('[data-bf-desc]', BEAUFORT[b][2]);
    setText('[data-bf-note]', isLive ? 'Live — this page’s breeze follows Tokyo’s wind' : 'Live wind unavailable — showing a default breeze');
    if (manual) return;
    $$('.rose').forEach(function (r) { r.style.setProperty('--deg', dir + 'deg'); });
    $$('[data-rose-dir]').forEach(function (n) { n.textContent = comp + ' ' + dir + '°'; });
    if (window.WIND) window.WIND.setWind(dir, spd);
  }
  (function fetchWind() {
    var KEY = 'tokyo-wx', cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (cached && Date.now() - cached.t < 10 * 60 * 1000) { applyWind(cached.c, true); return; }
    if (!window.fetch) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=Asia%2FTokyo';
    fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
      if (!j || !j.current || typeof j.current.wind_speed_10m !== 'number') throw new Error('shape');
      try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), c: j.current })); } catch (e) {}
      applyWind(j.current, true);
    }).catch(function () {
      applyWind({ wind_speed_10m: 10, wind_direction_10m: 225 }, false);
    });
  })();

  /* ---------- name: letters bend in the gust ---------- */
  var name = $('.name');
  if (name) {
    var words = name.textContent.trim().split(/\s+/);
    name.setAttribute('aria-label', words.join(' '));
    name.innerHTML = '';
    var vis = d.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    words.forEach(function (w, wi) {
      var ws = d.createElement('span'); ws.className = 'w';
      var inner = d.createElement('span'); inner.className = 'wi'; inner.style.setProperty('--i', wi);
      Array.from(w).forEach(function (ch) { var l = d.createElement('span'); l.className = 'l'; l.textContent = ch; inner.appendChild(l); });
      ws.appendChild(inner); vis.appendChild(ws);
      if (wi < words.length - 1) vis.appendChild(d.createTextNode(' '));
    });
    name.appendChild(vis);

    if (fine && !reduce) {
      var letters = $$('.l', name), pts = [], st = letters.map(function () { return { wd: 100, v: 0 }; });
      var mx = -1e4, my = -1e4, active = false, rafId = 0, ghost = null;
      var measure = function () {
        pts = letters.map(function (l) { var r = l.getBoundingClientRect(); return { x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY }; });
      };
      var loop = function () {
        rafId = 0;
        var settled = true, px = ghost ? ghost.x : mx, py = ghost ? ghost.y : my;
        for (var i = 0; i < letters.length; i++) {
          var dx = px - pts[i].x, dy = py - pts[i].y, g = Math.exp(-(dx * dx + dy * dy) / (2 * 150 * 150));
          var target = 100 - 24 * g, s = st[i];
          s.v += (target - s.wd) * 0.14; s.v *= 0.72; s.wd += s.v;
          if (Math.abs(s.wd - target) > 0.05 || Math.abs(s.v) > 0.05) settled = false;
          letters[i].style.setProperty('--wd', s.wd.toFixed(2));
          letters[i].style.setProperty('--ty', (-(100 - s.wd) * 0.5).toFixed(2) + 'px');
        }
        if (!settled || ghost) rafId = requestAnimationFrame(loop); else active = false;
      };
      var wake = function () { if (!active) { active = true; measure(); } if (!rafId) rafId = requestAnimationFrame(loop); };
      window.addEventListener('pointermove', function (e) { mx = e.pageX; my = e.pageY; wake(); }, { passive: true });
      window.addEventListener('resize', function () { if (active) measure(); });
      // one gust sweeps through the name after it rises
      var sweep = function () {
        measure();
        if (!pts.length) return;
        var y = pts.reduce(function (a, p) { return a + p.y; }, 0) / pts.length;
        var x0 = pts[0].x - 260, x1 = pts[pts.length - 1].x + 260, t0 = performance.now(), dur = 1500;
        ghost = { x: x0, y: y };
        var run = function (now) {
          var k = Math.min((now - t0) / dur, 1), e = k < .5 ? 2 * k * k : -1 + (4 - 2 * k) * k;
          ghost.x = x0 + (x1 - x0) * e; ghost.y = y + Math.sin(k * Math.PI) * -18;
          if (k < 1) requestAnimationFrame(run); else ghost = null;
        };
        requestAnimationFrame(run); wake();
      };
      var ready = (d.fonts && d.fonts.ready) ? d.fonts.ready : Promise.resolve();
      ready.then(function () { setTimeout(sweep, 900); });
    }
  }

  /* ---------- greetings ---------- */
  $$('[data-greet]').forEach(function (el) {
    var list = ['Xin chào', 'こんにちは', 'Hello'], i = 0;
    var langs = ['vi', 'ja', 'en'];
    if (reduce) return;
    setInterval(function () {
      el.classList.add('out');
      setTimeout(function () { i = (i + 1) % list.length; el.textContent = list[i]; el.setAttribute('lang', langs[i]); el.classList.remove('out'); }, 420);
    }, 2600);
  });

  /* ---------- compass: parallax, and drag the knob to steer the wind yourself ---------- */
  var rose = $('.rose');
  if (rose) {
    var photo = $('.photo', rose), knob = $('.knob', rose), manualTimer = 0, dragging = false;
    if (fine && !reduce && photo) {
      rose.addEventListener('pointermove', function (e) {
        if (dragging) return;
        var r = rose.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        photo.style.setProperty('--px', (x * 10).toFixed(1) + 'px'); photo.style.setProperty('--py', (y * 10).toFixed(1) + 'px');
      });
      rose.addEventListener('pointerleave', function () { photo.style.setProperty('--px', '0px'); photo.style.setProperty('--py', '0px'); });
    }
    var angleFrom = function (e) {
      var r = rose.getBoundingClientRect();
      return (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI + 360) % 360;
    };
    var steer = function (deg) {
      rose.classList.add('manual'); rose.style.setProperty('--deg', deg.toFixed(1) + 'deg');
      setText('[data-rose-dir]', COMPASS[Math.round(deg / 22.5) % 16] + ' ' + Math.round(deg) + '°');
      if (window.WIND) window.WIND.setWind(deg, live.speed);
    };
    var release = function () {
      if (!dragging) return;
      dragging = false; rose.classList.remove('dragging'); clearTimeout(manualTimer);
      manualTimer = setTimeout(function () { rose.classList.remove('manual'); if (live.cur) applyWind(live.cur, live.isLive); }, 8000);
    };
    var begin = function (e) {
      if (e.button && e.button !== 0) return;
      dragging = true; rose.classList.add('dragging'); clearTimeout(manualTimer); steer(angleFrom(e));
      if (rose.setPointerCapture) { try { rose.setPointerCapture(e.pointerId); } catch (x) {} }
      e.preventDefault();
    };
    (fine ? rose : (knob || rose)).addEventListener('pointerdown', begin);
    rose.addEventListener('pointermove', function (e) { if (dragging) steer(angleFrom(e)); });
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
  }

  /* ---------- a small weather vane keeps the cursor company ---------- */
  if (fine && !reduce) {
    var vane = d.createElement('div'); vane.className = 'vane'; vane.setAttribute('aria-hidden', 'true');
    vane.innerHTML = '<svg viewBox="0 0 24 24"><path class="tail" d="M12 22V7"/><path class="head" d="M12 2 7.5 9h9z"/></svg>';
    d.body.appendChild(vane);
    var vx = -100, vy = -100, tx = -100, ty = -100, rot = 0, trot = 0, lastMove = 0, vOn = false, vraf = 0, lx = 0, ly = 0;
    var vloop = function (now) {
      vraf = 0;
      vx += (tx - vx) * 0.22; vy += (ty - vy) * 0.22;
      if (now - lastMove > 700) trot = live.dir;                       // at rest the vane swings into the wind
      var dr = ((trot - rot + 540) % 360) - 180; rot += dr * 0.12;
      vane.style.transform = 'translate(' + vx.toFixed(1) + 'px,' + vy.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
      if (vOn) vraf = requestAnimationFrame(vloop);
    };
    window.addEventListener('pointermove', function (e) {
      var nx = e.clientX + 18, ny = e.clientY + 18, dx = nx - lx, dy = ny - ly;
      if (dx * dx + dy * dy > 16) { trot = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360; lx = nx; ly = ny; lastMove = performance.now(); }
      tx = nx; ty = ny;
      if (!vOn) { vOn = true; vane.classList.add('on'); }
      if (!vraf) vraf = requestAnimationFrame(vloop);
    }, { passive: true });
    d.documentElement.addEventListener('mouseleave', function () { vOn = false; vane.classList.remove('on'); });
  }

  /* ---------- the wind calms as you read ---------- */
  var calmPending = false;
  var calm = function () {
    if (calmPending) return; calmPending = true;
    requestAnimationFrame(function () { calmPending = false; var k = Math.min(1, window.scrollY / Math.max(1, window.innerHeight)); root.style.setProperty('--wind-opacity', (1 - 0.55 * k).toFixed(3)); });
  };
  window.addEventListener('scroll', calm, { passive: true }); calm();

  /* ---------- reveals ---------- */
  var rev = $$('.reveal');
  if (rev.length) {
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
      rev.forEach(function (el) { io.observe(el); });
      // belt and braces: anything inside the viewport gets revealed on scroll/resize too
      var pending = false, sweepReveal = function () {
        if (pending) return; pending = true;
        requestAnimationFrame(function () {
          pending = false; var vh = window.innerHeight;
          rev.forEach(function (el) { if (!el.classList.contains('in')) { var r = el.getBoundingClientRect(); if (r.top < vh * 0.96 && r.bottom > 0) el.classList.add('in'); } });
        });
      };
      window.addEventListener('scroll', sweepReveal, { passive: true }); window.addEventListener('resize', sweepReveal);
      setTimeout(sweepReveal, 600);
    } else rev.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- copy buttons ---------- */
  var toast = $('.toast');
  function say(msg) { if (!toast) return; toast.textContent = msg; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(function () { toast.classList.remove('on'); }, 1600); }
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-copy');
      var done = function () { b.setAttribute('data-done', ''); b.textContent = 'Copied'; say('Copied ' + v); setTimeout(function () { b.removeAttribute('data-done'); b.textContent = 'Copy'; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, function () { say('Copy failed — select the text instead'); });
      else say('Copy not supported here');
    });
  });

  /* ---------- keyboard shortcuts ---------- */
  var links = $$('.nav-links a');
  d.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var k = e.key.toLowerCase();
    if (k >= '1' && k <= '9') { var l = links[parseInt(k, 10) - 1]; if (l) location.href = l.href; }
    else if (k === 'h' || k === '0') location.href = '/';
    else if (k === 't') toggleTheme();
    else if (k === 'w') setWindEnabled(root.getAttribute('data-field') === 'off', true);
  });

  /* ---------- Goodreads shelves (grid widget, loaded without blocking the page) ---------- */
  var shelves = $$('[data-shelf]');
  if (shelves.length) {
    var loadShelf = function (el) {
      return new Promise(function (resolve) {
        var target = $('.gr', el), shelf = el.getAttribute('data-shelf'), num = el.getAttribute('data-num') || '12';
        var src = 'https://www.goodreads.com/review/grid_widget/34804458.' + encodeURIComponent(shelf) + '?cover_size=medium&hide_link=true&hide_title=true&num_books=' + num + '&order=d&shelf=' + encodeURIComponent(shelf) + '&sort=date_added&widget_id=' + shelf;
        target.id = 'gr_grid_widget_' + shelf;             // the widget fills #gr_grid_widget_<widget_id> when it exists (no document.write)
        var s = d.createElement('script'), done = function () { resolve(); };
        s.src = src; s.async = true; s.onload = done; s.onerror = done;
        d.head.appendChild(s);
        setTimeout(done, 12000);
      });
    };
    shelves.reduce(function (p, el) { return p.then(function () { return loadShelf(el); }); }, Promise.resolve()).then(function () {
      var any = false;
      shelves.forEach(function (el) { var ok = !!$('img', el); el.hidden = !ok; any = any || ok; });
      $$('[data-shelves-fail]').forEach(function (n) { n.hidden = any; });
    });
  }

  /* ---------- current year ---------- */
  $$('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
