#!/usr/bin/env bash
# Tests scripts/install-auto-deploy.sh without root or systemd: it writes the units to a temporary folder and
# calls a stand-in `systemctl`. Needs bash.
#
#   bash scripts/test-install-auto-deploy.sh
set -uo pipefail
REPO="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"; T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT; mkdir -p "$T/bin" "$T/units" "$T/proj/scripts"
cp "$REPO/scripts/install-auto-deploy.sh" "$REPO/scripts/deploy.sh" "$T/proj/scripts/"
printf '#!/usr/bin/env bash\necho "$*" >> %s/systemctl.calls\n' "$T" > "$T/bin/systemctl"
printf '#!/usr/bin/env bash\ncase "$1" in -u) echo 0;; -un) echo deployer;; -nG) echo "deployer ${FAKE_GROUPS:-docker}";; esac\n' > "$T/bin/id"
chmod +x "$T/bin/"*; export PATH="$T/bin:$PATH" UNIT_DIR="$T/units" SUDO_USER=deployer
pass=0; fail=0; check() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "  ok   $1"; else fail=$((fail+1)); echo "  FAIL $1 (got '$2', want '$3')"; fi; }
out="$(bash "$T/proj/scripts/install-auto-deploy.sh" 2>&1)"; rc=$?
check "install exits 0" "$rc" 0
check "timer every 5min by default" "$(grep -c '^OnUnitInactiveSec=5min$' "$T/units/relay-deploy.timer")" 1
check "first run 3min after boot" "$(grep -c '^OnBootSec=3min$' "$T/units/relay-deploy.timer")" 1
check "service runs as the sudo user" "$(grep -c '^User=deployer$' "$T/units/relay-deploy.service")" 1
check "service runs this checkout's deploy.sh" "$(grep -c "^ExecStart=$T/proj/scripts/deploy.sh$" "$T/units/relay-deploy.service")" 1
check "30 minute build allowance" "$(grep -c '^TimeoutStartSec=30min$' "$T/units/relay-deploy.service")" 1
check "enabled and started" "$(grep -c 'enable --now relay-deploy.timer' "$T/systemctl.calls")" 1
check "says 5min" "$(echo "$out" | grep -c 'every 5min')" 1
rm -f "$T/units/"*; DEPLOY_INTERVAL=10min bash "$T/proj/scripts/install-auto-deploy.sh" >/dev/null 2>&1
check "DEPLOY_INTERVAL overrides" "$(grep -c '^OnUnitInactiveSec=10min$' "$T/units/relay-deploy.timer")" 1
rm -f "$T/units/"*; FAKE_GROUPS=users bash "$T/proj/scripts/install-auto-deploy.sh" >/dev/null 2>&1; rc=$?
check "refuses a user outside the docker group" "$rc" 1
check "and writes nothing" "$(ls "$T/units" | wc -l | tr -d ' ')" 0
SUDO_USER=root bash "$T/proj/scripts/install-auto-deploy.sh" >/dev/null 2>&1; rc=$?
check "refuses to run as root" "$rc" 1
bash "$T/proj/scripts/install-auto-deploy.sh" >/dev/null 2>&1; bash "$T/proj/scripts/install-auto-deploy.sh" --remove >/dev/null 2>&1
check "--remove deletes both units" "$(ls "$T/units" | wc -l | tr -d ' ')" 0
check "--remove disables the timer" "$(grep -c 'disable --now relay-deploy.timer' "$T/systemctl.calls")" 1
echo; echo "passed $pass, failed $fail"; [ "$fail" -eq 0 ]
