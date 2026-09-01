#!/bin/sh
set -e
cd "$(dirname "$0")/.."

PAGES_BASE="${PAGES_BASE:-/QRlux/}"
export PAGES_BASE
npx vite build --config vite.pages.config.ts
npx vite build --config vite.mobile.config.ts

# Merge the designed SPA + handshake app + APKs into docs/ for GitHub Pages.
mkdir -p docs/how docs/send docs/receive docs/android docs/s docs/r docs/releases
cp -a pages-dist/. docs/
cp pages-dist/index.html docs/404.html
cp pages-dist/index.html docs/how/index.html
cp pages-dist/index.html docs/send/index.html
cp pages-dist/index.html docs/receive/index.html
cp pages-dist/index.html docs/android/index.html
cp pages-dist/index.html docs/s/index.html
cp pages-dist/index.html docs/r/index.html
cp mobile-dist/index.html docs/app.html

# Handshake bookmark still used by existing setup QRs.
cat > docs/go.html << 'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <meta http-equiv="refresh" content="0;url=r" />
    <title>LUX Receive</title>
    <script>location.replace("r");</script>
  </head>
  <body style="margin:0;min-height:100dvh;background:#09090b;color:#f4f4f5;font-family:Sora,system-ui,sans-serif;padding:24px">
    <p style="letter-spacing:.2em;font-size:11px;text-transform:uppercase;color:#71717a">LUX</p>
    <p>Opening Receive…</p>
    <p><a href="r" style="color:#e4e4e7">Continue</a></p>
    <p><a href="https://github.com/brinza666/QRlux" style="color:#a1a1aa">GitHub</a></p>
  </body>
</html>
HTML

printf 'User-agent: *\nDisallow: /\n' > docs/robots.txt
cp -f public/releases/*.apk docs/releases/ 2>/dev/null || true
cp -f public/releases/SHA256SUMS docs/releases/ 2>/dev/null || true
cp -f public/favicon.svg docs/favicon.svg 2>/dev/null || true
touch docs/.nojekyll
echo "PAGES_OK"
