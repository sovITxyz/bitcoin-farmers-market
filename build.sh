#!/usr/bin/env bash
# Build the public dist/ for Cloudflare Pages.
# Copies only public-facing assets — excludes research scripts, package.json, etc.
set -euo pipefail

cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist

cp index.html        dist/
cp 404.html          dist/
cp styles.css        dist/
cp script.js         dist/
cp robots.txt        dist/
cp sitemap.xml       dist/
cp _headers          dist/
cp -r images         dist/

echo "Built dist/ ($(du -sh dist | cut -f1), $(find dist -type f | wc -l) files)"
