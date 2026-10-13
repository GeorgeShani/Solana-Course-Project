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
#   5. waits for https://<DOMAIN>/api/health (the same address a visitor uses, through Caddy), then loads the
#      public-source records (server/curation/curated.json) into the database, so a pushed change to them goes live
#      too. That load is idempotent and refuses a file that contradicts recorded history; if it fails, the deploy
#      still stands and the reason is logged;
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

# DOMAIN must be a bare host name. Compose builds https://$DOMAIN from it, so a pasted scheme becomes
# https://https://... and the server then refuses to start. Say so now rather than deploy and roll back.
domain="$(env_value DOMAIN)"
if [ -z "$domain" ]; then
  log "DOMAIN is not set in .env; set it (see DEPLOYMENT.md)"
  exit 1
fi
case "$domain" in
  *://* | */* | *" "*)
    log "DOMAIN in .env is \"$domain\"; it must be a bare host name such as relay.example.com (no https://, no slash). Fix it, then run scripts/deploy.sh --force"
    exit 1
    ;;
esac
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

# The database host the loader must be told about (it treats every host but localhost as remote and asks for it by name).
db_host() {
  local url
  url="$(env_value DATABASE_DIRECT_URL)"
  [ -n "$url" ] || url="$(env_value DATABASE_URL)"
  if [ -z "$url" ]; then echo postgres; return; fi # the bundled Postgres
  echo "$url" | sed -E 's#^[a-z]+://([^@/]*@)?([^/:?]+).*#\2#'
}

# The Caddyfile is a bind mount, so Compose does not see it change and keeps the old config running.
# Reloading is cheap and does nothing when nothing changed. A failure is logged: the site stays up on the old config.
reload_caddy() {
  if ! "${COMPOSE[@]}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/tmp/relay-caddy-reload.log 2>&1; then
    log "Caddy did not reload its config (the site keeps running on the old one): $(tail -n 2 /tmp/relay-caddy-reload.log | tr '\n' ' ')"
  fi
}

# Loads curated.json. A failure is logged, never a reason to roll back: the app itself is up and healthy.
load_curation() {
  local host
  host="$(db_host)"
  if "${COMPOSE[@]}" exec -T server bun run scripts/curate.ts "--confirm-db-host=$host" >/tmp/relay-curate.log 2>&1; then
    log "public-source records are up to date"
  else
    log "public-source records were NOT loaded (the app is unaffected): $(tail -n 3 /tmp/relay-curate.log | tr '\n' ' ')"
  fi
}

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
  reload_caddy
  load_curation
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
