#!/usr/bin/env bash
# Brings the running app up to date with the branch on GitHub, and puts it back if the new version does not come up.
#
#   scripts/deploy.sh            deploy only if the branch has new commits (what the timer runs)
#   scripts/deploy.sh --force    rebuild and relaunch the current commit even if nothing is new
#
# What it does, in order:
#   1. takes a lock, so two runs never overlap;
#   2. `git fetch`, and stops if there is nothing new (or if that exact commit already failed to start once);
#   3. `git merge --ff-only`: the server never makes its own commits, it only follows the branch;
#   4. `docker compose up -d --build`. The server applies new database migrations itself as it starts;
#   5. waits for https://<DOMAIN>/api/health (the same address a visitor uses, through Caddy);
#   6. if that never answers, goes back to the previous commit and rebuilds it, and remembers the bad commit so it is
#      not tried again every few minutes. A fix pushed afterwards is a different commit and is deployed normally.
#
# Database migrations are not undone by a rollback. Migrations here only add (a column, a table, an enum value), which
# the previous version tolerates; keep it that way.
#
# Whatever is pushed to the branch goes live within minutes, so limit who can push to it (branch protection on GitHub).
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-main}"
HEALTH_TIMEOUT_SECONDS="${DEPLOY_HEALTH_TIMEOUT:-180}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="$PROJECT_DIR/.deploy-last-failed"

log() { printf '%s deploy: %s\n' "$(date -u +%FT%TZ)" "$*"; }

cd "$PROJECT_DIR"

exec 9>/tmp/relay-deploy.lock
if ! flock -n 9; then
  log "another deploy is running; leaving it to finish"
  exit 0
fi

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

# One value from the root .env, without quotes (empty when the file or the line is missing).
env_value() {
  [ -f .env ] || return 0
  grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true
}

# DOMAIN is a bare host name in Relay's .env. Tolerate a pasted scheme or slash so the health check still asks the right place.
domain="$(env_value DOMAIN)"
domain="${domain#https://}"
domain="${domain#http://}"
domain="${domain%%/*}"
if [ -z "$domain" ]; then
  log "DOMAIN is not set in .env; set it (see DEPLOYMENT.md)"
  exit 1
fi
HEALTH_URL="https://${domain}/api/health"
CURL_ARGS=(-fsS --max-time 10 -o /dev/null)
# Caddy issues its own local certificate for localhost, which curl does not trust.
if [ "$domain" = "localhost" ]; then CURL_ARGS+=(-k); fi

# With a hosted database (DATABASE_URL set), the bundled Postgres must not be started. Naming the services is
# not enough: Compose still starts what they depend on, so --no-deps is needed too (and on a machine that also
# runs compose.dev.yaml, a started "postgres" would replace that container).
if [ -n "$(env_value DATABASE_URL)" ]; then
  SERVICES=(--no-deps app server caddy)
else
  SERVICES=()
fi
COMPOSE=(docker compose)

healthy() { curl "${CURL_ARGS[@]}" "$HEALTH_URL"; }

wait_until_healthy() {
  local waited=0
  while [ "$waited" -lt "$HEALTH_TIMEOUT_SECONDS" ]; do
    if healthy; then return 0; fi
    sleep 5
    waited=$((waited + 5))
  done
  return 1
}

launch() { "${COMPOSE[@]}" up -d --build "${SERVICES[@]}"; }

git fetch --quiet origin "$BRANCH"
current="$(git rev-parse HEAD)"
target="$(git rev-parse "origin/$BRANCH")"

if [ "$current" = "$target" ] && [ "$FORCE" -eq 0 ]; then
  exit 0 # nothing new: say nothing, this runs every few minutes
fi
if [ "$FORCE" -eq 0 ] && [ -f "$STATE_FILE" ] && [ "$(cat "$STATE_FILE")" = "$target" ]; then
  exit 0 # this commit already failed to start; wait for a newer one
fi

log "updating ${current:0:7} -> ${target:0:7} on $BRANCH"
if [ "$current" != "$target" ]; then
  if ! git merge --ff-only "origin/$BRANCH"; then
    log "cannot fast-forward (the server has changes of its own). Fix that by hand: git status"
    exit 1
  fi
fi

if launch && wait_until_healthy; then
  rm -f "$STATE_FILE"
  docker image prune -f >/dev/null 2>&1 || true
  log "deployed ${target:0:7}; $HEALTH_URL answers"
  exit 0
fi

log "${target:0:7} did not come up healthy; going back to ${current:0:7}"
echo "$target" > "$STATE_FILE"
"${COMPOSE[@]}" logs --tail=60 app server caddy 2>&1 | sed 's/^/    /' || true
git reset --hard "$current"
launch
if wait_until_healthy; then
  log "rolled back to ${current:0:7}; the app is up on the old version"
else
  log "ROLLBACK ALSO FAILED: the app is down. Look at: docker compose logs server"
fi
exit 1
