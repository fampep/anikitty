#!/usr/bin/env bash
# Print and write the next dev version into repo-root VERSION.
# Stable x.y.z becomes x.y.(z+1)-dev.1. An existing x.y.z-dev.N becomes x.y.z-dev.(N+1).
# versionCode always increases by 1.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
file="$root/VERSION"

name="$(grep -E '^name=' "$file" | head -1 | cut -d= -f2- | tr -d '[:space:]')"
code="$(grep -E '^code=' "$file" | head -1 | cut -d= -f2- | tr -d '[:space:]')"

if [[ ! "$code" =~ ^[0-9]+$ ]]; then
  echo "VERSION code must be an integer, got: $code" >&2
  exit 1
fi

if [[ "$name" =~ ^(.+)-dev\.([0-9]+)$ ]]; then
  base="${BASH_REMATCH[1]}"
  n="${BASH_REMATCH[2]}"
  next="${base}-dev.$((n + 1))"
elif [[ "$name" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  next="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.$((BASH_REMATCH[3] + 1))-dev.1"
else
  echo "VERSION name must be x.y.z or x.y.z-dev.N, got: $name" >&2
  exit 1
fi

next_code="$((code + 1))"

cat > "$file" <<EOF
# Android versionName / versionCode. Pushes to main cut the next dev prerelease.
# Stable releases stay manual. The dev workflow commits this file with [skip ci].
name=${next}
code=${next_code}
EOF

echo "${next} ${next_code}"
