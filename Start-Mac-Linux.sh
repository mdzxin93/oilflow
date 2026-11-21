#!/bin/sh
set -eu
cd "$(dirname "$0")"
command -v node >/dev/null || { echo 'Install Node.js LTS 22+ from nodejs.org'; exit 1; }
[ -d node_modules ] || npm install
[ -f .env ] || npm run setup
npm run dev
