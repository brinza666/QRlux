#!/bin/sh
# Designed static GitHub Pages + working single-file Send/Receive.
set -e
cd "$(dirname "$0")/.."

python3 scripts/write-site.py
npx vite build --config vite.mobile.config.ts

mkdir -p docs/s docs/r docs/send docs/receive docs/releases
cp mobile-dist/index.html docs/app.html
cp mobile-dist/index.html docs/s/index.html
cp mobile-dist/index.html docs/r/index.html
cp mobile-dist/index.html docs/send/index.html
cp mobile-dist/index.html docs/receive/index.html

# Drop leftover SPA bundles — content pages are real HTML now.
rm -rf docs/assets docs/__grok

cp -f public/releases/*.apk docs/releases/ 2>/dev/null || true
cp -f public/releases/SHA256SUMS docs/releases/ 2>/dev/null || true
cp -f public/favicon.svg docs/favicon.svg 2>/dev/null || true
touch docs/.nojekyll
echo PAGES_OK
