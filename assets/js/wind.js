/* wind.js — GPU particle wind field (WebGL 1, no dependencies).
 * Particle positions live in an RGBA8 texture (16 bits per axis), advected by
 * curl noise + a global wind vector (Tokyo's live wind, set from site.js) + the cursor.
 * Trails come from re-drawing the previous frame with a small fade. */
(function () {
  'use strict';
  var canvas = document.getElementById('wind');
  if (!canvas) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var api = { setWind: function () {}, setTheme: function () {}, setEnabled: function () {}, ok: false };
  window.WIND = api;

  var gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false });
  if (!gl || gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) { canvas.remove(); return; }

  /* ---------- shaders ---------- */
  var NOISE = [
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
    'float snoise(vec3 v){',
    ' const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);',
    ' vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);',
    ' vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);',
    ' vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;',
    ' i=mod289(i);',
    ' vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));',
    ' float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;',
    ' vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);',
    ' vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);',
    ' vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);',
    ' vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));',
    ' vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    ' vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);',
    ' vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    ' p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;',
    ' vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;',
    ' return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}'
  ].join('\n');

  // Shared velocity field. pos is in [0,1]^2 (uv), world is aspect-corrected.
  var FIELD = [
    'uniform float u_time; uniform float u_aspect;',
    'uniform vec2 u_wind; uniform float u_noiseScale; uniform float u_noiseSpeed; uniform float u_noiseAmp;',
    'uniform vec2 u_mouse; uniform vec2 u_mouseVel; uniform float u_mouseOn;',
    'vec2 curl(vec3 p){ float e=0.02;',
    ' float n1=snoise(p+vec3(0.0,e,0.0)); float n2=snoise(p-vec3(0.0,e,0.0));',
    ' float n3=snoise(p+vec3(e,0.0,0.0)); float n4=snoise(p-vec3(e,0.0,0.0));',
    ' return vec2(n1-n2,-(n3-n4))/(2.0*e); }',
    'vec2 field(vec2 pos){',
    ' vec2 w=vec2(pos.x*u_aspect,pos.y);',
    ' vec2 v=u_wind+curl(vec3(w*u_noiseScale,u_time*u_noiseSpeed))*u_noiseAmp;',
    ' vec2 m=vec2(u_mouse.x*u_aspect,u_mouse.y); vec2 d=w-m; float r2=dot(d,d);',
    ' float g=exp(-r2/(2.0*0.11*0.11))*u_mouseOn;',
    ' v+=g*(u_mouseVel*1.6+vec2(-d.y,d.x)*0.9);',
    ' return v; }'
  ].join('\n');

  var QUAD_VS = 'precision mediump float; attribute vec2 a_pos; varying vec2 v_uv; void main(){ v_uv=a_pos; gl_Position=vec4(a_pos*2.0-1.0,0.0,1.0); }';

  var FADE_FS = 'precision mediump float; uniform sampler2D u_tex; uniform float u_opacity; uniform float u_sub; varying vec2 v_uv; void main(){ vec4 c=texture2D(u_tex,v_uv); gl_FragColor=max(c*u_opacity-u_sub,0.0); }';

  var UPDATE_FS = [
    'precision highp float;',
    'uniform sampler2D u_particles; uniform float u_seed; uniform float u_dt; uniform float u_drop;',
    'varying vec2 v_uv;',
    NOISE, FIELD,
    'float rand(vec2 co){ float t=dot(vec2(12.9898,78.233),co); return fract(sin(t)*43758.5453); }',
    'void main(){',
    ' vec4 c=texture2D(u_particles,v_uv);',
    ' vec2 pos=vec2(c.r/255.0+c.b,c.g/255.0+c.a);',
    ' vec2 v=field(pos);',
    ' pos+=vec2(v.x/u_aspect,v.y)*u_dt;',
    ' vec2 seed=(pos+v_uv)*u_seed;',
    ' float drop=step(1.0-u_drop,rand(seed));',
    ' vec2 rnd=vec2(rand(seed+1.3),rand(seed+2.1));',
    ' pos=mix(pos,rnd,drop);',
    ' pos=fract(pos+1.0);',
    ' gl_FragColor=vec4(fract(pos*255.0),floor(pos*255.0)/255.0);',
    '}'
  ].join('\n');

  var DRAW_VS = [
    'precision highp float;',
    'attribute float a_index; uniform sampler2D u_particles; uniform float u_res; uniform float u_pointSize;',
    'varying float v_speed;',
    NOISE, FIELD,
    'void main(){',
    ' vec4 c=texture2D(u_particles,vec2(fract(a_index/u_res),floor(a_index/u_res)/u_res));',
    ' vec2 pos=vec2(c.r/255.0+c.b,c.g/255.0+c.a);',
    ' v_speed=length(field(pos));',
    ' gl_PointSize=u_pointSize;',
    ' gl_Position=vec4(pos*2.0-1.0,0.0,1.0);',
    '}'
  ].join('\n');

  var DRAW_FS = [
    'precision mediump float;',
    'uniform vec3 u_color; uniform vec3 u_accent; uniform float u_alpha; uniform float u_speedRef;',
    'varying float v_speed;',
    'void main(){',
    ' float t=smoothstep(u_speedRef*1.1,u_speedRef*2.0,v_speed);',
    ' vec3 c=mix(u_color,u_accent,t);',
    ' float a=u_alpha*(0.55+0.45*t);',
    ' gl_FragColor=vec4(c*a,a);',
    '}'
  ].join('\n');

  /* ---------- gl helpers ---------- */
  function shader(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var w = { p: p, a: {}, u: {} }, i, n;
    n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (i = 0; i < n; i++) { var a = gl.getActiveAttrib(p, i); w.a[a.name] = gl.getAttribLocation(p, a.name); }
    n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (i = 0; i < n; i++) { var u = gl.getActiveUniform(p, i); w.u[u.name] = gl.getUniformLocation(p, u.name); }
    return w;
  }
  function texture(filter, data, w, h) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return t;
  }
  function bindTex(t, unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); }
  function bindFB(fb, t) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    if (t) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  }

  var fadeP, updateP, drawP;
  try { fadeP = program(QUAD_VS, FADE_FS); updateP = program(QUAD_VS, UPDATE_FS); drawP = program(DRAW_VS, DRAW_FS); }
  catch (e) { canvas.remove(); return; }

  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
  var fb = gl.createFramebuffer();

  /* ---------- state ---------- */
  var W = 0, H = 0, dpr = 1, res = 0, count = 0;
  var pTex0, pTex1, indexBuf, screenA, screenB;
  var wind = { dir: 225, speed: 10 };        // meteorological "from" degrees, km/h
  var windVec = [0, 0], noiseAmp = 0.07, noiseScale = 1.25, noiseSpeed = 0.06, drop = 0.004, fade = 0.962, speedRef = 0.05;
  var color = [0.05, 0.1, 0.18], accent = [0.9, 0.33, 0.1], alpha = 0.42;
  var mouse = { x: -10, y: -10, vx: 0, vy: 0, on: 0, px: 0, py: 0, t: 0 };
  var enabled = true, running = false, hidden = false, raf = 0, last = 0, time = 0, lost = false;

  function fromWind() {
    var phi = wind.dir * Math.PI / 180;
    var s = Math.min(wind.speed, 45) / 45;                 // 0..1
    var mag = 0.035 + s * 0.11;                            // uv units / second
    windVec = [-Math.sin(phi) * mag, -Math.cos(phi) * mag]; // toward-direction; x east, y north (gl y up)
    noiseAmp = 0.03 + s * 0.05;
    noiseSpeed = 0.04 + s * 0.08;
    speedRef = mag + noiseAmp * 1.6;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.floor(window.innerWidth)), h = Math.max(1, Math.floor(window.innerHeight));
    W = Math.floor(w * dpr); H = Math.floor(h * dpr);
    canvas.width = W; canvas.height = H;
    var density = (window.matchMedia('(hover: hover)').matches ? 1 : 0.7);
    res = Math.max(24, Math.min(64, Math.round(Math.sqrt(w * h / 470 * density))));
    count = res * res;
    var state = new Uint8Array(count * 4);
    for (var i = 0; i < state.length; i++) state[i] = Math.floor(Math.random() * 256);
    if (pTex0) { gl.deleteTexture(pTex0); gl.deleteTexture(pTex1); gl.deleteTexture(screenA); gl.deleteTexture(screenB); }
    pTex0 = texture(gl.NEAREST, state, res, res);
    pTex1 = texture(gl.NEAREST, state, res, res);
    var idx = new Float32Array(count);
    for (i = 0; i < count; i++) idx[i] = i;
    if (!indexBuf) indexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuf); gl.bufferData(gl.ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    var empty = new Uint8Array(W * H * 4);
    screenA = texture(gl.NEAREST, empty, W, H);
    screenB = texture(gl.NEAREST, empty, W, H);
  }

  function setFieldUniforms(P) {
    gl.uniform1f(P.u.u_time, time);
    gl.uniform1f(P.u.u_aspect, W / H);
    gl.uniform2f(P.u.u_wind, windVec[0], windVec[1]);
    gl.uniform1f(P.u.u_noiseScale, noiseScale);
    gl.uniform1f(P.u.u_noiseSpeed, noiseSpeed);
    gl.uniform1f(P.u.u_noiseAmp, noiseAmp);
    gl.uniform2f(P.u.u_mouse, mouse.x, mouse.y);
    gl.uniform2f(P.u.u_mouseVel, mouse.vx, mouse.vy);
    gl.uniform1f(P.u.u_mouseOn, mouse.on);
  }

  function drawQuad(P) {
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(P.a.a_pos);
    gl.vertexAttribPointer(P.a.a_pos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function step(dt) {
    time += dt;
    // 1. trails: fade previous screen into the new one, then draw particles on top
    bindFB(fb, screenB);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(fadeP.p);
    bindTex(screenA, 0); gl.uniform1i(fadeP.u.u_tex, 0);
    gl.uniform1f(fadeP.u.u_opacity, fade); gl.uniform1f(fadeP.u.u_sub, 0.6 / 255);
    drawQuad(fadeP);

    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(drawP.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuf);
    gl.enableVertexAttribArray(drawP.a.a_index);
    gl.vertexAttribPointer(drawP.a.a_index, 1, gl.FLOAT, false, 0, 0);
    bindTex(pTex0, 1); gl.uniform1i(drawP.u.u_particles, 1);
    gl.uniform1f(drawP.u.u_res, res);
    gl.uniform1f(drawP.u.u_pointSize, 1.6 * dpr);
    gl.uniform3f(drawP.u.u_color, color[0], color[1], color[2]);
    gl.uniform3f(drawP.u.u_accent, accent[0], accent[1], accent[2]);
    gl.uniform1f(drawP.u.u_alpha, alpha);
    gl.uniform1f(drawP.u.u_speedRef, speedRef);
    setFieldUniforms(drawP);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.disable(gl.BLEND);

    // 2. composite to canvas
    bindFB(null);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(fadeP.p);
    bindTex(screenB, 0); gl.uniform1i(fadeP.u.u_tex, 0);
    gl.uniform1f(fadeP.u.u_opacity, 1); gl.uniform1f(fadeP.u.u_sub, 0);
    drawQuad(fadeP);
    var t = screenA; screenA = screenB; screenB = t;

    // 3. advect particles
    bindFB(fb, pTex1);
    gl.viewport(0, 0, res, res);
    gl.useProgram(updateP.p);
    bindTex(pTex0, 0); gl.uniform1i(updateP.u.u_particles, 0);
    gl.uniform1f(updateP.u.u_seed, Math.random());
    gl.uniform1f(updateP.u.u_dt, dt);
    gl.uniform1f(updateP.u.u_drop, drop);
    setFieldUniforms(updateP);
    drawQuad(updateP);
    t = pTex0; pTex0 = pTex1; pTex1 = t;
    bindFB(null);
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    // cursor velocity decay
    mouse.vx *= 0.88; mouse.vy *= 0.88;
    if (mouse.on > 0 && now - mouse.t > 1200) mouse.on = Math.max(0, mouse.on - dt * 1.2);
    step(dt);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || !enabled || hidden || lost) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  function warm(n) { for (var i = 0; i < n; i++) step(1 / 60); }

  /* ---------- input ---------- */
  var hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hoverable) {
    window.addEventListener('pointermove', function (e) {
      var x = e.clientX / window.innerWidth, y = 1 - e.clientY / window.innerHeight;
      var now = performance.now();
      if (mouse.t) {
        var dt = Math.max((now - mouse.t) / 1000, 1 / 120);
        var vx = (x - mouse.px) / dt * (W / H), vy = (y - mouse.py) / dt; // world units / s
        var m = Math.hypot(vx, vy), cap = 1.6;
        if (m > cap) { vx *= cap / m; vy *= cap / m; }
        mouse.vx = mouse.vx * 0.5 + vx * 0.5; mouse.vy = mouse.vy * 0.5 + vy * 0.5;
      }
      mouse.px = x; mouse.py = y; mouse.x = x; mouse.y = y; mouse.t = now; mouse.on = 1;
    }, { passive: true });
    window.addEventListener('pointerleave', function () { mouse.on = 0; });
  }

  document.addEventListener('visibilitychange', function () { hidden = document.hidden; if (hidden) stop(); else start(); });
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; stop(); });
  canvas.addEventListener('webglcontextrestored', function () { lost = false; });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); warm(30); if (reduce) step(1 / 60); }, 150);
  });

  /* ---------- public api ---------- */
  api.ok = true;
  api.setWind = function (dir, speed) {
    if (typeof dir === 'number' && !isNaN(dir)) wind.dir = dir;
    if (typeof speed === 'number' && !isNaN(speed)) wind.speed = speed;
    fromWind();
  };
  api.setTheme = function () {
    var cs = getComputedStyle(document.documentElement);
    var c = (cs.getPropertyValue('--trail') || '14,27,46').split(',').map(function (v) { return parseFloat(v) / 255; });
    var a = (cs.getPropertyValue('--trail-accent') || '228,85,27').split(',').map(function (v) { return parseFloat(v) / 255; });
    var al = parseFloat(cs.getPropertyValue('--trail-alpha'));
    if (c.length === 3 && !isNaN(c[0])) color = c;
    if (a.length === 3 && !isNaN(a[0])) accent = a;
    if (!isNaN(al)) alpha = al;
    // clear stale trails on theme change
    if (screenA) {
      var empty = new Uint8Array(W * H * 4);
      gl.bindTexture(gl.TEXTURE_2D, screenA); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, empty);
      gl.bindTexture(gl.TEXTURE_2D, null);
      warm(40);
      if (reduce) step(1 / 60);
    }
  };
  api.setEnabled = function (on) {
    enabled = !!on;
    if (enabled) start(); else stop();
  };

  /* ---------- boot ---------- */
  fromWind();
  resize();
  api.setTheme();
  warm(60);
  if (reduce) { warm(120); step(1 / 60); }           // one still frame of trails
  else if (document.documentElement.getAttribute('data-field') !== 'off') start();
  else enabled = false;
})();
