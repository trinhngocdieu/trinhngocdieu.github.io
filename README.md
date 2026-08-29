# trinhngocdieu.com

Personal website of Trịnh Ngọc Diệu. Hand-written static HTML/CSS/JS — no framework, no build step.
Deployed by GitHub Pages from the `main` branch (custom domain in `CNAME`).

## Layout

```
index.html            Home: hero (live Tokyo wind + compass portrait), hobbies, now-in-Tokyo, projects
projects/  books/  activity/  transfer/  contact/   one index.html each
404.html              Not-found page (served by GitHub Pages)
project/ book/ post/ message/   redirects from the old URLs
assets/css/site.css   All styles (design tokens at the top; dark theme under html[data-theme="dark"])
assets/js/wind.js     WebGL particle wind field (curl noise + global wind + cursor); exposes window.WIND
assets/js/site.js     Theme, graticule rulers, Tokyo clock, live weather (Open-Meteo), name gust, reveals, copy, shortcuts, Goodreads shelves
assets/img/           portrait.jpg, og.jpg, icon-192.png
test/                 unrelated video-player test page, left as-is
```

## Editing

- Content lives directly in the HTML files. The header and footer are repeated in every page, so a nav change means editing each file.
- Projects: the three cards appear on `index.html` and `projects/index.html`.
- Seal glyphs (鄭玉妙印) are plain text inside `.seal-face` — change them in every page if needed.
- Live weather comes from Open-Meteo (free, no key) for Tokyo; if the request fails the page shows a default breeze and says so.
- Books are pulled from Goodreads' grid widget (`currently-reading` and `read` shelves) in `site.js`.
- Google AdSense is loaded from one `<script>` line in each page's `<head>`; delete that line to remove it.

## Run locally

```
python3 -m http.server 8080
```

then open <http://localhost:8080/>. Keyboard: `1`–`5` pages, `H` home, `T` theme, `W` wind on/off.
