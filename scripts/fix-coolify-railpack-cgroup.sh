#!/usr/bin/env bash
# Run once on the Coolify/Docker host when Railpack fails with:
#   cgroup-parent for systemd cgroup should be a valid slice named as "xxx.slice"
#
# Usage (on the Coolify VPS, as root):
#   scp scripts/fix-coolify-railpack-cgroup.sh root@YOUR_VPS:/tmp/
#   ssh root@YOUR_VPS "sudo bash /tmp/fix-coolify-railpack-cgroup.sh"
#
# Or from a clone already on the server:
#   sudo bash scripts/fix-coolify-railpack-cgroup.sh

set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

DAEMON_JSON="/etc/docker/daemon.json"
SLICE_UNIT="/etc/systemd/system/docker.slice"

echo "==> Current Docker daemon.json"
if [ -f "$DAEMON_JSON" ]; then
  cat "$DAEMON_JSON"
else
  echo "(missing — will create)"
fi
echo

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

echo "==> Fixing Docker cgroup-parent / exec-opts"
python3 - <<'PY'
import json
import pathlib

path = pathlib.Path("/etc/docker/daemon.json")
data = {}
if path.exists():
    try:
        data = json.loads(path.read_text() or "{}")
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {path}: {exc}") from exc

parent = data.get("cgroup-parent") or data.get("cgroupParent")
if parent and not str(parent).endswith(".slice"):
    print(f"Removing invalid cgroup-parent: {parent!r}")
    data.pop("cgroup-parent", None)
    data.pop("cgroupParent", None)

# Valid .slice name required for buildx docker-container driver on systemd hosts.
data["cgroup-parent"] = "docker.slice"
print("Set cgroup-parent to docker.slice")

opts = list(data.get("exec-opts") or data.get("execOpts") or [])
if not any("native.cgroupdriver=systemd" in o for o in opts):
    opts.append("native.cgroupdriver=systemd")
data["exec-opts"] = opts
data.pop("execOpts", None)

path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(data, indent=2) + "\n")
print("Wrote", path)
PY

echo
echo "==> Updated Docker daemon.json"
cat "$DAEMON_JSON"
echo

echo "==> Restarting Docker"
systemctl restart docker
sleep 4

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker did not come back healthy after restart."
  echo "Check: systemctl status docker --no-pager"
  exit 1
fi

echo "==> Removing stale coolify-railpack buildx builder"
docker buildx rm coolify-railpack 2>/dev/null || true
while read -r id; do
  [ -n "$id" ] && docker rm -f "$id" 2>/dev/null || true
done < <(docker ps -aq --filter "name=buildx_buildkit_coolify-railpack" 2>/dev/null || true)

echo "==> Recreating coolify-railpack builder"
docker buildx create --name coolify-railpack --driver docker-container --use 2>/dev/null || true
docker buildx inspect coolify-railpack --bootstrap

echo
echo "==> Verifying buildx can boot"
docker buildx du >/dev/null

echo
echo "Done. In Coolify: redeploy AniKitty (Railpack build pack)."
