# trinhngocdieu.com

Personal website of Trịnh Ngọc Diệu. Static HTML/CSS/JS — no framework, nothing runs at deploy time.
Deployed by GitHub Pages from the `main` branch (custom domain in `CNAME`).

Six languages: English at the root, then `/vi/`, `/ja/`, `/ko/`, `/zh-hant/`, `/zh-hans/`. Visitors land in the
language they chose before, or their browser's language; the menu in the header switches and remembers.

## Layout

```
tools/build.py        Generates every page from content/strings.json — run it after editing text or structure
content/strings.json  All copy, in six languages (same keys everywhere)
content/posts.json    X post URLs shown on the Activity page (read by the page itself — no rebuild needed)
index.html + projects/ books/ activity/ transfer/ contact/     English pages
vi/ ja/ ko/ zh-hant/ zh-hans/                                   the same pages in each language
404.html              Not-found page (served by GitHub Pages)
project/ book/ post/ message/   redirects from the old URLs
assets/css/site.css   All styles (design tokens at the top; dark theme under html[data-theme="dark"])
assets/js/wind.js     WebGL particle wind field (ink strokes, curl noise, live wind, gusts, cursor); exposes window.WIND
assets/js/site.js     Theme (follows Tokyo daylight), rulers, clock, live weather, sun arc, compass steering, languages, Goodreads shelves, X posts
assets/img/           portrait.jpg, og.jpg, icon-192.png
test/                 unrelated video-player test page, left as-is
```

## Editing

- Text: edit `content/strings.json`, then `python3 tools/build.py` and commit the generated HTML. Page structure lives in `tools/build.py`.
- Activity: add X post URLs to `content/posts.json` (X no longer serves timelines to signed-out visitors; single posts still embed).
- Projects: the three cards are defined in `tools/build.py` (`deck`), taglines per language in `strings.json`.
- Seal glyphs (鄭玉妙印) are in `tools/build.py` (`seal`).
- Live weather comes from Open-Meteo (free, no key) for Tokyo; if the request fails the page shows a default breeze and says so.
- Books are pulled from Goodreads' grid widget (`currently-reading` and `read` shelves) in `site.js`.
- Google AdSense is loaded from one `<script>` line in each page's `<head>` (see `tools/build.py`); delete it to remove ads.

## Run locally

```
python3 -m http.server 8080
```

then open <http://localhost:8080/>. Keyboard: `1`–`5` pages, `H` home, `T` theme, `W` wind on/off.
