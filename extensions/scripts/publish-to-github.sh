#!/usr/bin/env bash
# Publish monorepo extensions/ → fampep/anikitty-extensions (main).
# Requires write access as fampep (Cursor cloud tokens cannot push that repo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REMOTE="${ANIKITTY_EXTENSIONS_REMOTE:-https://github.com/fampep/anikitty-extensions.git}"
BRANCH="${ANIKITTY_EXTENSIONS_BRANCH:-main}"

cd "$ROOT"
git fetch origin main >/dev/null 2>&1 || true

echo "Splitting extensions/ …"
git subtree split -P extensions -b extensions-publish

echo "Pushing to $REMOTE ($BRANCH) …"
git push "$REMOTE" "extensions-publish:$BRANCH"

echo "OK — store index:"
echo "  https://raw.githubusercontent.com/fampep/anikitty-extensions/main/store/index.json"
