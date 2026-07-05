#!/usr/bin/env bash
# Fix Coolify Docker deploys that fail at "exporting to image" (exit 255).
# Run on the Coolify host: sudo bash scripts/fix-coolify-docker-export.sh
set -euo pipefail

echo "== Disk before =="
df -h / /var/lib/docker 2>/dev/null || df -h /

echo "== Pruning unused Docker data =="
docker system prune -af --filter "until=72h" || true
docker builder prune -af || true
docker buildx prune -af || true

echo "== Disk after =="
df -h / /var/lib/docker 2>/dev/null || df -h /

echo "Done — retry the Coolify deploy."
