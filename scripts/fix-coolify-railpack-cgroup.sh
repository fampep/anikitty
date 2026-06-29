#!/usr/bin/env bash
# Run once on the Coolify/Docker host when Railpack fails with:
#   cgroup-parent for systemd cgroup should be a valid slice named as "xxx.slice"
#
# Usage: sudo bash scripts/fix-coolify-railpack-cgroup.sh

set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

DAEMON_JSON="/etc/docker/daemon.json"
SLICE_UNIT="/etc/systemd/system/docker.slice"

echo "==> Ensuring docker.slice exists"
mkdir -p "$(dirname "$SLICE_UNIT")"
if [ ! -f "$SLICE_UNIT" ]; then
  cat >"$SLICE_UNIT" <<'EOF'
[Unit]
Description=Docker cgroup slice
Before=slices.target
EOF
  systemctl daemon-reload
fi

echo "==> Ensuring Docker uses a valid cgroup-parent"
python3 - <<'PY'
import json
import pathlib

path = pathlib.Path("/etc/docker/daemon.json")
data = {}
if path.exists():
    data = json.loads(path.read_text() or "{}")

parent = data.get("cgroup-parent") or data.get("cgroupParent")
if parent and not str(parent).endswith(".slice"):
    print(f"Fixing invalid cgroup-parent: {parent!r} -> docker.slice")
    data["cgroup-parent"] = "docker.slice"
elif not parent:
    data["cgroup-parent"] = "docker.slice"
    print("Setting cgroup-parent to docker.slice")

opts = data.get("exec-opts") or data.get("execOpts") or []
if not any("native.cgroupdriver=systemd" in o for o in opts):
    opts.append("native.cgroupdriver=systemd")
data["exec-opts"] = opts

path.write_text(json.dumps(data, indent=2) + "\n")
print("Wrote", path)
PY

echo "==> Restarting Docker"
systemctl restart docker
sleep 3

echo "==> Removing stale coolify-railpack buildx builder"
docker buildx rm coolify-railpack 2>/dev/null || true
while read -r id; do
  [ -n "$id" ] && docker rm -f "$id" 2>/dev/null || true
done < <(docker ps -aq --filter "name=buildx_buildkit_coolify-railpack" 2>/dev/null || true)

echo "==> Recreating coolify-railpack builder"
docker buildx create --name coolify-railpack --driver docker-container 2>/dev/null || true
docker buildx inspect coolify-railpack --bootstrap

echo "Done. Retry the Coolify deployment."
