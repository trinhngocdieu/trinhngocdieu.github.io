#!/usr/bin/env python3
"""Generates every page of trinhngocdieu.com from content/strings.json.

    python3 tools/build.py        # then commit the output

No dependencies. English lives at the site root; other languages under /vi/, /ja/,
/ko/, /zh-hant/, /zh-hans/. The header and footer are the same on every page."""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://trinhngocdieu.com'
S = json.loads((ROOT / 'content' / 'strings.json').read_text(encoding='utf-8'))

LANGS = {
    'en':      dict(tag='en',      name='English',    path='',         font=None, stack=None),
    'vi':      dict(tag='vi',      name='Tiếng Việt', path='/vi',      font=None, stack=None),
    'ja':      dict(tag='ja',      name='日本語',      path='/ja',      font='Noto+Sans+JP:wght@400;500;700', stack='"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif'),
    'ko':      dict(tag='ko',      name='한국어',      path='/ko',      font='Noto+Sans+KR:wght@400;500;700', stack='"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'),
    'zh-hant': dict(tag='zh-Hant', name='繁體中文',    path='/zh-hant', font='Noto+Sans+TC:wght@400;500;700', stack='"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif'),
    'zh-hans': dict(tag='zh-Hans', name='简体中文',    path='/zh-hans', font='Noto+Sans+SC:wght@400;500;700', stack='"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'),
}
PAGES = ['home', 'projects', 'books', 'activity', 'transfer', 'contact']
GREET = {'en': 'Hello', 'vi': 'Xin chào', 'ja': 'こんにちは', 'ko': '안녕하세요', 'zh-hant': '你好', 'zh-hans': '你好'}
CODE = {'en': 'EN', 'vi': 'VI', 'ja': 'JA', 'ko': 'KO', 'zh-hant': '繁', 'zh-hans': '简'}
GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>'
MARKS = {'projects': '作品', 'books': '本', 'activity': '近況', 'transfer': '振込', 'contact': 'はがき'}   # decorative stamps; dropped where the title is already CJK
JP_TEXT = '鄭玉妙印札語律風振込東京作品本近況郵便はがき迷子こんにちは茶'
FONT_CSS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&display=swap'
JP_CSS = 'https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@700&text=' + JP_TEXT + '&display=swap'

def href(lang, page):
    base = LANGS[lang]['path']
    return base + '/' if page == 'home' else f'{base}/{page}/'

def fmt(s, **kw):
    for k, v in kw.items():
        s = s.replace('{' + k + '}', v)
    return s

def js(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

def link(text, url, blank=True):
    extra = ' target="_blank" rel="noopener"' if blank else ' rel="noopener"'
    return f'<a href="{url}"{extra}>{text}</a>'

# ---------------- components ----------------
def seal(extra='', style=''):
    st = f' style="{style}"' if style else ''
    return (f'<span class="seal {extra}" lang="ja" role="img" aria-label="Hanko seal reading 鄭玉妙印 — Trịnh Ngọc Diệu"{st}>'
            '<span class="seal-face" aria-hidden="true"><span>鄭</span><span>玉</span><span>妙</span><span>印</span></span></span>')

SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'

def rose_ring():
    out = ['<svg class="ring" viewBox="0 0 400 400" aria-hidden="true">',
           '<circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1"/>',
           '<circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1" stroke-dasharray="2 4"/>']
    for k, a in enumerate(range(0, 360, 5)):
        long = a % 30 == 0
        r1, r2 = 190, 190 - (14 if long else 7)
        s, c = math.sin(math.radians(a)), math.cos(math.radians(a))
        out.append(f'<line style="--i:{k}" x1="{200 + r1*s:.1f}" y1="{200 - r1*c:.1f}" x2="{200 + r2*s:.1f}" y2="{200 - r2*c:.1f}" stroke="currentColor" stroke-width="{1.5 if long else 1}" stroke-opacity="{0.9 if long else 0.5}"/>')
    for a, lab in ((0, 'N'), (90, 'E'), (180, 'S'), (270, 'W')):
        s, c = math.sin(math.radians(a)), math.cos(math.radians(a))
        out.append(f'<text class="cardinal" x="{200 + 164*s:.1f}" y="{200 - 164*c:.1f}" text-anchor="middle" dominant-baseline="central">{lab}</text>')
    for a in (45, 135, 225, 315):
        s, c = math.sin(math.radians(a)), math.cos(math.radians(a))
        out.append(f'<circle cx="{200 + 164*s:.1f}" cy="{200 - 164*c:.1f}" r="1.5" fill="currentColor" fill-opacity=".6"/>')
    out.append('</svg>')
    return ''.join(out)

def rose_figure(H):
    return ('<figure class="hero-rose rose">' + rose_ring() +
            f'<div class="needle"><b class="knob" role="slider" aria-label="{H["steer"]}" tabindex="-1"></b></div>'
            f'<div class="photo"><img src="/assets/img/portrait.jpg" width="300" height="300" alt="{H["photo_alt"]}" fetchpriority="high"></div>'
            + seal('stamp', '--delay:1.1s') +
            f'<figcaption class="tag"><span data-wx-live>{fmt(H["wind_from"], dir="<b data-rose-dir>—</b>")}</span><span data-wx-fail hidden>{H["default_breeze"]}</span><span class="manual">{H["manual"]}</span></figcaption>'
            '</figure>')

def wheel(cx, cy):
    r, sp = 13, []
    for a in (0, 60, 120):
        s, c = math.sin(math.radians(a)), math.cos(math.radians(a))
        sp.append(f'<line x1="{cx - r*c:.1f}" y1="{cy - r*s:.1f}" x2="{cx + r*c:.1f}" y2="{cy + r*s:.1f}"/>')
    return f'<g class="wheel"><circle cx="{cx}" cy="{cy}" r="{r}"/>{"".join(sp)}</g>'

BIKE = ('<svg class="ico" viewBox="0 0 72 48" aria-hidden="true">' + wheel(16, 32) + wheel(56, 32) +
        '<path d="M16 32 28 12 34 32 16 32M28 12h20M34 32 48 12 56 32M24 10h8M48 12v-3M44 9h9"/><circle cx="34" cy="32" r="2.5"/></svg>')
TEA = ('<svg class="ico" viewBox="0 0 72 48" aria-hidden="true"><g class="steam"><path d="M26 16c-3-4 3-6 0-10"/><path d="M34 16c-3-4 3-6 0-10"/><path d="M42 16c-3-4 3-6 0-10"/></g>'
       '<path d="M18 22h32v8a16 10 0 0 1-32 0z"/><path d="M50 25h5a4.5 4.5 0 0 1 0 9h-5"/><path d="M12 44h44"/></svg>')
SPEECH = ('<svg class="ico" viewBox="0 0 72 48" aria-hidden="true"><path d="M8 6h30a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H20l-8 6v-6H8a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z"/>'
          '<path d="M34 20h30a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6h-2v6l-8-6H34a6 6 0 0 1-6-6v-4"/>'
          '<text x="22" y="21" text-anchor="middle" font-size="13" fill="currentColor" stroke="none" lang="vi" font-family="inherit" font-weight="600">à</text>'
          '<text x="50" y="35" text-anchor="middle" font-size="13" fill="currentColor" stroke="none" lang="ja">あ</text></svg>')
POSTMARK = ('<svg class="postmark" viewBox="0 0 100 100" aria-hidden="true"><defs><path id="pm-arc" d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1-76 0"/></defs>'
            '<circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="1"/>'
            '<text><textPath href="#pm-arc" startOffset="4%">TOKYO · JAPAN · 東京</textPath></text>'
            '<text x="50" y="47" text-anchor="middle" font-size="10" font-weight="500" data-year>2026</text><text x="50" y="59" text-anchor="middle" font-size="7">TOKYO</text></svg>')
SUNARC = ('<svg class="sunarc" viewBox="0 0 320 136" role="img" aria-label="{aria}"><path class="arc" d="M60 110A100 100 0 0 1 260 110"/><line class="horizon" x1="0" y1="110" x2="320" y2="110"/>'
          '<g class="sun" transform="translate(160 10)"><circle class="glow" r="16"/><circle r="5"/></g><text class="t-rise" x="60" y="130" text-anchor="middle">↑ --:--</text><text class="t-set" x="260" y="130" text-anchor="middle">↓ --:--</text></svg>')

def deck(P):
    cards = [('cardgo.ai', 'https://cardgo.ai', '札'), ('unihongo.com', 'https://unihongo.com', '語'), ('chatluat.com', 'https://chatluat.com', '律')]
    out = ['<div class="deck">']
    for i, (name, url, glyph) in enumerate(cards):
        out.append(f'<a class="card reveal" style="--d:{i*0.1:.1f}s" href="{url}" target="_blank" rel="noopener">'
                   f'<div class="top"><span>{P["kinds"][i].upper()} · <span lang="ja">{glyph}</span></span><span class="arrow" aria-hidden="true">↗</span></div>'
                   f'<div class="glyph" lang="ja" aria-hidden="true">{glyph}</div><div class="cut" aria-hidden="true"></div>'
                   f'<h3 class="title">{name}</h3><p class="sub">{P["taglines"][i]}</p></a>')
    out.append('</div>')
    return ''.join(out)

def page_head(meta, title, mark, lede):
    m = f'<span class="jp" lang="ja">{mark}</span>' if mark else ''
    return (f'<header class="page-head reveal"><p class="meta">{meta}</p>'
            f'<h1 class="page-title">{title}{m}</h1><p class="page-lede">{lede}</p></header>')

def kbd(s):
    for k in ('1', '5', 'H', 'T', 'W'):
        s = s.replace('{' + k + '}', f'<kbd>{k}</kbd>')
    return s

# ---------------- shell ----------------
def shell(lang, page, *, title, desc, body, head_extra='', current=None, og_title=None, path=None):
    T = S[lang]; L = LANGS[lang]; site = T['site']
    path = path if path is not None else href(lang, page)
    nav = ''.join(f'<li><a href="{href(lang, p)}"{" aria-current=\"page\"" if p == current else ""}>{site["nav"][p]}</a></li>' for p in PAGES[1:])
    alts = ''.join(f'<link rel="alternate" hreflang="{LANGS[l]["tag"]}" href="{SITE}{href(l, page)}">\n' for l in LANGS) + f'<link rel="alternate" hreflang="x-default" href="{SITE}{href("en", page)}">\n' if page in PAGES else ''
    fonts = f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={L["font"]}&display=swap">\n' if L['font'] else ''
    stack = f'<style>:root{{--font-display:"Bricolage Grotesque",{L["stack"]};--font-body:"Bricolage Grotesque",{L["stack"]}}}</style>\n' if L['stack'] else ''
    pg = page if page in PAGES else 'home'
    items = ''.join(f'<a class="lang-item" role="menuitemradio" aria-checked="{"true" if l == lang else "false"}" href="{href(l, pg)}" hreflang="{LANGS[l]["tag"]}" lang="{LANGS[l]["tag"]}" data-lang="{l}" data-hello="{GREET[l]}" style="--i:{i}">'
                    f'<span class="lang-mark" aria-hidden="true">{CODE[l]}</span><span class="lang-name">{LANGS[l]["name"]}</span><span class="lang-sub" aria-hidden="true">{GREET[l]}</span></a>' for i, l in enumerate(LANGS))
    chooser = (f'<div class="lang" data-lang><button class="lang-btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="lang-menu" aria-label="{site["lang_label"]}" data-lang-btn>{GLOBE}<span class="lang-code">{CODE[lang]}</span></button>'
               f'<div class="lang-menu" id="lang-menu" role="menu" aria-label="{site["lang_label"]}" hidden data-lang-menu><p class="lang-menu-head"><span class="lang-greet" data-lang-greet>{GREET[lang]}</span><span class="lang-menu-label">{site["lang_label"]}</span></p>{items}</div></div>')
    site_js = js({'lang': lang, 'page': page, 'alts': {l: href(l, pg) for l in LANGS}})
    built = fmt(site['built'], openmeteo='<a href="https://open-meteo.com/" rel="noopener">Open-Meteo</a>')
    return f'''<!doctype html>
<html lang="{L["tag"]}" data-theme="light" data-field="on">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{SITE}{path}">
{alts}<meta name="theme-color" content="#edf1f5">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Trịnh Ngọc Diệu">
<meta property="og:title" content="{og_title or title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{SITE}{path}">
<meta property="og:image" content="{SITE}/assets/img/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="{L["tag"].replace("-", "_")}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@trinhngocdieu">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/img/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONT_CSS}">
<link rel="stylesheet" href="{JP_CSS}">
{fonts}<link rel="stylesheet" href="/assets/css/site.css">
{stack}<script>(function(){{try{{var t=localStorage.getItem('theme');if(!t){{var d=new Date(Date.now()+324e5),N=Math.floor((Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-Date.UTC(d.getUTCFullYear(),0,0))/864e5),B=2*Math.PI*(N-81)/364,q=9.87*Math.sin(2*B)-7.53*Math.cos(B)-1.5*Math.sin(B),dc=.4091*Math.sin(2*Math.PI*(284+N)/365),m=d.getUTCHours()*60+d.getUTCMinutes(),H=(m-(720-18.6-q))/4*Math.PI/180,la=.6227,el=Math.asin(Math.sin(la)*Math.sin(dc)+Math.cos(la)*Math.cos(dc)*Math.cos(H))*57.3;t=el<-6?'dark':'light'}}document.documentElement.setAttribute('data-theme',t);if(localStorage.getItem('wind')==='off')document.documentElement.setAttribute('data-field','off')}}catch(e){{}}}})();</script>
<script>window.SITE={site_js};window.I18N={js(T["dyn"])};</script>
{head_extra}<!-- Google AdSense (kept from the previous site; remove this line to drop it) -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9096418035432957" crossorigin="anonymous"></script>
</head>
<body>
<a class="skip" href="#main">{site["skip"]}</a>
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><filter id="ink" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G"/></filter></svg>
<div class="sky" aria-hidden="true"></div>
<canvas id="wind" aria-hidden="true"></canvas>
<div class="ruler ruler-corner" aria-hidden="true"></div>
<div class="ruler ruler-x" aria-hidden="true"><i class="marker"></i></div>
<div class="ruler ruler-y" aria-hidden="true"><i class="marker"></i></div>
<div class="cursor-readout" aria-hidden="true"></div>
<div class="site">
<header class="nav">
  <div class="wrap nav-in">
    <a class="brand" href="{href(lang, "home")}" aria-label="{site["home_aria"]}">{seal()}<span lang="vi">Trịnh Ngọc Diệu</span></a>
    <nav aria-label="Primary"><ul class="nav-links">{nav}</ul></nav>
    <div class="nav-tools">
      {chooser}
      <button class="icon-btn theme-btn" type="button" aria-label="{site["theme_btn"]}" aria-pressed="false">{SUN}{MOON}</button>
    </div>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <p class="who" lang="vi">Trịnh Ngọc Diệu</p>
        <p>{site["living"]}</p>
        <p class="meta">35.6762° N, 139.6503° E · <span data-clock>--:--:--</span> JST<span data-wx-live> · {fmt(T["home"]["readout_wind"], wind="<span data-wind>—</span>", dir="<span data-dir>—</span>")}</span></p>
      </div>
      <ul class="list">
        {''.join(f'<li><a href="{href(lang, p)}">{site["nav"][p]}</a></li>' for p in PAGES[1:])}
        <li><a href="mailto:contact@trinhngocdieu.com">contact@trinhngocdieu.com</a></li>
      </ul>
      <div class="tools">
        <button class="toggle" type="button" data-wind-toggle aria-pressed="true"><i aria-hidden="true"></i><span>{site["wind_on"]}</span></button>
        <p class="hint">{kbd(site["keys"])}</p>
      </div>
    </div>
    <div class="bottom">
      <span>© <span data-year>2026</span> Trịnh Ngọc Diệu</span>
      <span>{built}</span>
      <a href="https://github.com/trinhngocdieu/trinhngocdieu.github.io" rel="noopener">{site["source"]}</a>
    </div>
  </div>
</footer>
</div>
<div class="toast" role="status" aria-live="polite"></div>
<script src="/assets/js/wind.js"></script>
<script src="/assets/js/site.js"></script>
</body>
</html>
'''

# ---------------- pages ----------------
def mark(lang, page):
    return '' if lang in ('ja', 'zh-hant', 'zh-hans') else MARKS.get(page, '')

def home_body(lang):
    T = S[lang]; H = T['home']; P = T['projects']
    readout_wind = fmt(H['readout_wind'], wind='<b data-wind>—</b>', dir='<b data-dir>—</b>')
    now = (fmt(H['now_time'], clock='<b data-clock>--:--:--</b>') + '<span data-wx-live>' +
           fmt(H['now_wx'], temp='<b data-temp>—</b>', cond='<span data-cond>—</span>', wind='<b data-wind>—</b>', dir='<b data-dir>—</b>', desc='<span data-bf-desc>…</span>') +
           '</span><span data-wx-fail hidden>' + H['now_fail'] + '</span>')
    return f'''<section class="wrap hero" aria-labelledby="name">
  <div class="hero-readout readout" aria-label="{H["readout_aria"]}">
    <span class="live"><b>{H["tokyo"]}</b> 35.68°N 139.65°E</span>
    <span><b data-clock>--:--:--</b> JST</span>
    <span data-daylight>—</span>
    <span data-wx-live><b data-temp>—</b> <span data-cond>—</span></span>
    <span data-wx-live>{readout_wind}</span>
  </div>
  <div class="hero-text">
    <p class="eyebrow"><span class="greet" data-greet lang="vi">Xin chào</span> {H["eyebrow"]}</p>
    <h1 class="name" id="name" lang="vi">Trịnh Ngọc Diệu</h1>
    <p class="lede">{H["lede"]}</p>
    <div class="actions">
      <a class="btn btn-primary" href="{href(lang, "projects")}">{H["see_projects"]} <span class="arrow" aria-hidden="true">→</span></a>
      <a class="btn" href="{href(lang, "contact")}">{H["say_hello"]}</a>
    </div>
  </div>
  {rose_figure(H)}
  <p class="hero-beaufort beaufort">
    <span class="bf-n" data-bf-n>F2</span>
    <span class="bf-name" data-bf-name>{H["bf_default"][0]}</span>
    <span>— <span data-bf-desc>{H["bf_default"][1]}</span></span>
    <span class="bf-note" data-bf-note>{H["bf_connecting"]}</span>
  </p>
</section>

<section class="wrap section" aria-labelledby="about-h">
  <div class="section-head reveal"><h2 id="about-h">{H["about_h"]}</h2><span class="meta">{H["about_meta"]}</span></div>
  <div class="notes">
    <article class="note reveal" style="--d:0s"><span class="label">{H["cycling_label"]}</span>{BIKE}<h3>{H["cycling_h"]}</h3><p>{H["cycling_p"]}</p></article>
    <article class="note reveal" style="--d:.1s"><span class="label"><span lang="ja">茶</span> · trà</span>{TEA}<h3>{H["tea_h"]}</h3><p>{H["tea_p"]}</p></article>
    <article class="note reveal" style="--d:.2s"><span class="label">vi · ja · en · ko · zh</span>{SPEECH}<h3>{H["lang_h"]}</h3><p>{H["lang_p"]}</p></article>
  </div>
</section>

<section class="wrap section" aria-labelledby="now-h">
  <div class="section-head reveal"><h2 id="now-h">{H["now_h"]}</h2><span class="meta"><a href="https://www.google.com/maps/place/Tokyo,+Japan" rel="noopener">{H["open_map"]}</a></span></div>
  <div class="now reveal">
    <div>
      <p>{now}</p>
      <p class="meta">{H["now_meta"]} · <span data-daylight>—</span></p>
    </div>
    {SUNARC.replace("{aria}", H["sunarc"])}
    <a class="btn" href="{href(lang, "contact")}">{H["send_message"]}</a>
  </div>
</section>

<section class="wrap section" aria-labelledby="proj-h">
  <div class="section-head reveal"><h2 id="proj-h">{H["projects_h"]}</h2><span class="meta"><a href="{href(lang, "projects")}">{H["all_projects"]}</a></span></div>
  {deck(P)}
</section>'''

JSONLD = '''<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Trịnh Ngọc Diệu","alternateName":"Trinh Ngoc Dieu","url":"https://trinhngocdieu.com/","image":"https://trinhngocdieu.com/assets/img/portrait.jpg","email":"mailto:contact@trinhngocdieu.com","address":{"@type":"PostalAddress","addressLocality":"Tokyo","addressCountry":"JP"},"sameAs":["https://www.facebook.com/trinhngocdieu","https://x.com/trinhngocdieu","https://www.linkedin.com/in/trinhngocdieu","https://github.com/trinhngocdieu","https://www.goodreads.com/user/show/34804458"]}</script>
'''

def projects_body(lang):
    P = S[lang]['projects']
    lede = fmt(P['lede'], contact=f'<a href="{href(lang, "contact")}">{P["contact_link"]}</a>')
    return '<div class="wrap">' + page_head(P['meta'], P['h'], mark(lang, 'projects'), lede) + f'<section class="section" aria-label="{P["aria"]}">' + deck(P) + '</section></div>'

def books_body(lang):
    B = S[lang]['books']; GR = 'https://www.goodreads.com/user/show/34804458'
    return ('<div class="wrap">' + page_head(B['meta'], B['h'], mark(lang, 'books'), fmt(B['lede'], goodreads=link(B['goodreads_link'], GR, False))) + f'''<section class="section" aria-label="{B["aria"]}">
  <div class="shelf reveal" data-shelf="currently-reading" data-num="6"><h2 class="meta">{B["reading_now"]}</h2><div class="gr"></div></div>
  <div class="shelf reveal" data-shelf="read" data-num="24"><h2 class="meta">{B["recently_read"]}</h2><div class="gr"></div></div>
  <p class="embed-note" data-shelves-fail hidden>{B["fail"]} <a href="https://www.goodreads.com/review/list/34804458?shelf=read" rel="noopener">{B["open_shelf"]}</a></p>
  <p class="embed-note">{fmt(B["covers"], goodreads=link(B["covers_link"], GR, False))}</p>
</section></div>''')

def activity_body(lang):
    A = S[lang]['activity']
    return ('<div class="wrap">' + page_head(A['meta'], A['h'], mark(lang, 'activity'), fmt(A['lede'], x=link(A['x_link'], 'https://x.com/trinhngocdieu', False))) + f'''<section class="section" aria-label="{A["aria"]}">
  <div class="posts" data-posts></div>
  <p class="embed-note" data-posts-empty hidden>{A["empty"]}</p>
  <div class="follow reveal">
    <div><p class="follow-h">@trinhngocdieu</p><p class="follow-p">{A["curated_note"]}</p></div>
    <a class="btn btn-primary" href="https://x.com/trinhngocdieu" rel="noopener">{A["follow"]}</a>
  </div>
</section></div>''')

def transfer_body(lang):
    R = S[lang]['transfer']
    return ('<div class="wrap">' + page_head(R['meta'], R['h'], mark(lang, 'transfer'), R['lede']) + f'''<section class="section" aria-label="{R["aria"]}">
  <div class="slip reveal">
    <div class="slip-head"><span>{R["slip"]}</span><span class="jp" lang="ja">振込</span></div>
    <div class="row"><span class="k">{R["name"]}</span><span class="v">Trinh Ngoc Dieu</span><button class="copy" type="button" data-copy="Trinh Ngoc Dieu">{R["copy"]}</button></div>
    <div class="row"><span class="k">{R["acb"]}</span><span class="v">38797487</span><button class="copy" type="button" data-copy="38797487">{R["copy"]}</button></div>
    <div class="row"><span class="k">{R["paypay"]}</span><span class="v">trinhngocdieu</span><button class="copy" type="button" data-copy="trinhngocdieu">{R["copy"]}</button></div>
    <div class="slip-foot"><span>{R["acb_vn"]}</span><span>{R["paypay_jp"]}</span></div>
  </div>
</section></div>''')

def contact_body(lang):
    C = S[lang]['contact']
    return ('<div class="wrap">' + page_head(C['meta'], C['h'], mark(lang, 'contact'), C['lede']) + f'''<section class="section" aria-label="{C["aria"]}">
  <div class="postcard-wrap">
    <div class="postcard reveal">
      <div class="postcard-head"><span>{C["postcard"]}</span><span class="jp" lang="ja">郵便はがき</span></div>
      <div class="msg">
        <p>{C["msg1"]}</p>
        <p>{C["msg2"]}</p>
        <p>{C["msg3"]}</p>
      </div>
      <div class="addr">
        <div class="stamp">{seal('stamp', '--delay:.9s')}{POSTMARK}</div>
        <div class="lines">
          <div class="line"><span class="k">{C["email"]}</span><a href="mailto:contact@trinhngocdieu.com">contact@trinhngocdieu.com</a></div>
          <div class="line"><span class="k">{C["messenger"]}</span><a href="https://m.me/trinhngocdieu" target="_blank" rel="noopener">m.me/trinhngocdieu</a></div>
          <div class="line"><span class="k">{C["city"]}</span><span>{C["tokyo"]} · <span lang="ja">東京</span></span></div>
        </div>
      </div>
    </div>
  </div>
  <div class="actions reveal" style="margin-top:32px">
    <a class="btn btn-primary" href="https://m.me/trinhngocdieu" target="_blank" rel="noopener">{C["send_message"]} <span class="arrow" aria-hidden="true">→</span></a>
    <a class="btn" href="mailto:contact@trinhngocdieu.com">{C["email_me"]}</a>
  </div>
  <h2 class="meta reveal" style="margin:52px 0 14px">{C["elsewhere"]}</h2>
  <ul class="socials reveal">
    <li><a href="https://www.facebook.com/trinhngocdieu" rel="noopener">Facebook ↗</a></li>
    <li><a href="https://x.com/trinhngocdieu" rel="noopener">X / Twitter ↗</a></li>
    <li><a href="https://www.linkedin.com/in/trinhngocdieu" rel="noopener">LinkedIn ↗</a></li>
    <li><a href="https://github.com/trinhngocdieu" rel="noopener">GitHub ↗</a></li>
    <li><a href="https://www.goodreads.com/user/show/34804458" rel="noopener">Goodreads ↗</a></li>
  </ul>
</section></div>''')

def notfound_body(lang):
    N = S[lang]['notfound']
    return f'''<section class="wrap lost">
  <p class="meta">{N["meta"]}</p>
  <h1 class="big">404<span class="jp" lang="ja">迷子</span></h1>
  <p class="page-lede">{N["lede"]}</p>
  <div class="actions" style="margin-top:28px">
    <a class="btn btn-primary" href="{href(lang, "home")}">{N["back_home"]} <span class="arrow" aria-hidden="true">→</span></a>
    <a class="btn" href="{href(lang, "projects")}">{N["see_projects"]}</a>
  </div>
</section>'''

BODIES = {'home': home_body, 'projects': projects_body, 'books': books_body, 'activity': activity_body, 'transfer': transfer_body, 'contact': contact_body}

def write(rel, text):
    p = ROOT / rel.lstrip('/'); p.parent.mkdir(parents=True, exist_ok=True); p.write_text(text, encoding='utf-8')

def main():
    count = 0
    for lang in LANGS:
        T = S[lang]
        for page in PAGES:
            P = T[page]
            html = shell(lang, page, title=P['title'], desc=P['desc'], body=BODIES[page](lang), current=page if page != 'home' else None,
                         og_title=P.get('og_title'), head_extra=JSONLD if page == 'home' else '')
            write(href(lang, page) + 'index.html', html); count += 1
    N = S['en']['notfound']
    write('/404.html', shell('en', '404', title=N['title'], desc=N['desc'], body=notfound_body('en'), path='/404.html')); count += 1
    for old, new in (('project', '/projects/'), ('book', '/books/'), ('post', '/transfer/'), ('message', '/contact/')):
        write(f'/{old}/index.html', f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Redirecting…</title><link rel="canonical" href="{SITE}{new}"><meta http-equiv="refresh" content="0; url={new}"><meta name="robots" content="noindex"><script>location.replace("{new}")</script></head><body><a href="{new}">Continue to {SITE}{new}</a></body></html>\n')
    urls = ''.join(f'  <url><loc>{SITE}{href(l, p)}</loc>' + ''.join(f'<xhtml:link rel="alternate" hreflang="{LANGS[a]["tag"]}" href="{SITE}{href(a, p)}"/>' for a in LANGS) + '</url>\n' for p in PAGES for l in LANGS)
    write('/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + urls + '</urlset>\n')
    write('/robots.txt', f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
    write('/.nojekyll', '')
    print(f'wrote {count} pages in {len(LANGS)} languages + redirects, sitemap, robots, .nojekyll')

if __name__ == '__main__':
    main()
