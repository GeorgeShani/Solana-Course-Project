#!/usr/bin/env bash
# Installs the timer that runs scripts/deploy.sh every few minutes. Run it once, on the server, with sudo:
#
#   sudo scripts/install-auto-deploy.sh            install and start
#   sudo scripts/install-auto-deploy.sh --remove   stop and remove
#
# It runs as the user who ran sudo (the one who can use Docker and has the git checkout), not as root.
# DEPLOY_INTERVAL changes how often it checks (default 5min), for example: sudo DEPLOY_INTERVAL=10min scripts/install-auto-deploy.sh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_AS="${SUDO_USER:-$(id -un)}"
UNIT_DIR="${UNIT_DIR:-/etc/systemd/system}"
INTERVAL="${DEPLOY_INTERVAL:-5min}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this with sudo." >&2
  exit 1
fi

if [ "${1:-}" = "--remove" ]; then
  systemctl disable --now relay-deploy.timer 2>/dev/null || true
  rm -f "$UNIT_DIR/relay-deploy.service" "$UNIT_DIR/relay-deploy.timer"
  systemctl daemon-reload
  echo "Automatic deploys removed."
  exit 0
fi

if [ "$RUN_AS" = "root" ]; then
  echo "Run it as the normal user that owns the checkout, with sudo (not from a root shell), so it knows who to run as." >&2
  exit 1
fi
if ! id -nG "$RUN_AS" | tr ' ' '\n' | grep -qx docker; then
  echo "$RUN_AS is not in the docker group, so the timer could not run Docker. Run: sudo usermod -aG docker $RUN_AS (then log in again)." >&2
  exit 1
fi

chmod +x "$PROJECT_DIR/scripts/deploy.sh"

cat > "$UNIT_DIR/relay-deploy.service" <<UNIT
[Unit]
Description=Bring Relay up to date with GitHub
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
User=$RUN_AS
WorkingDirectory=$PROJECT_DIR
ExecStart=$PROJECT_DIR/scripts/deploy.sh
# A build can take several minutes on a small instance.
TimeoutStartSec=30min
UNIT

cat > "$UNIT_DIR/relay-deploy.timer" <<UNIT
[Unit]
Description=Check GitHub for a new Relay version

[Timer]
OnBootSec=3min
OnUnitInactiveSec=$INTERVAL
AccuracySec=15s

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now relay-deploy.timer
echo "Installed. Checking GitHub every $INTERVAL as $RUN_AS."
echo "Watch it:   journalctl -u relay-deploy -f"
echo "Next runs:  systemctl list-timers relay-deploy.timer"
echo "Run now:    scripts/deploy.sh --force"
