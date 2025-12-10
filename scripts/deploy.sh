#!/usr/bin/env bash
set -euo pipefail

# Deploy script used by the self-hosted GitHub Actions runner.
# Expects environment variable DEPLOY_DIR (or will default to /var/www/live).
# If RUNNER_USER is provided it will chown the files to that user.

DEPLOY_DIR="${DEPLOY_DIR:-/home/administrador/deploy/guiones}"
RUNNER_USER="${RUNNER_USER:-}"
SRC_DIR="$(pwd)/dist"

if [ ! -d "$SRC_DIR" ]; then
  echo "Error: build output not found at $SRC_DIR"
  exit 1
fi

echo "Deploying from $SRC_DIR to $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

rsync -av --delete --chmod=Du=rwx,Dg=rx,Do=rx,Fu=rw,Fg=r,Fo=r "$SRC_DIR"/ "$DEPLOY_DIR"/

if [ -n "$RUNNER_USER" ]; then
  echo "Setting ownership to $RUNNER_USER"
  chown -R "$RUNNER_USER":"$RUNNER_USER" "$DEPLOY_DIR" || echo "chown failed — you may need sudo or adjust permissions"
fi

if command -v systemctl >/dev/null 2>&1 && [ "$(id -u)" -eq 0 ]; then
  echo "Reloading nginx"
  systemctl reload nginx || echo "nginx reload failed"
else
  echo "Not running as root; skipping nginx reload. Reload nginx manually if needed."
fi

echo "Deployment finished."
