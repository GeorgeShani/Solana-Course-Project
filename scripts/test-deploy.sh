#!/usr/bin/env bash
# Tests scripts/deploy.sh against a throwaway origin repo, with fake `docker` and `curl`, so nothing real
# is built or restarted. Needs bash and flock (Linux, or WSL on Windows):
#
#   bash scripts/test-deploy.sh
#
# Covers: nothing new, a good deploy, a bad deploy with rollback, skipping a known-bad commit, recovery after a fix,
# --force, a server with its own commits, with and without a hosted database, the DOMAIN forms, and the lock.
set -uo pipefail
SRC_SCRIPT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy.sh}"
T="$(mktemp -d)"; trap 'rm -rf "$T" /tmp/relay-deploy.lock' EXIT
ORIGIN="$T/origin.git"; SRV="$T/srv"; DEV="$T/dev"; BIN="$T/bin"; CALLS="$T/docker.calls"
mkdir -p "$BIN"; : > "$CALLS"
pass=0; fail=0
check() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "  ok   $1"; else fail=$((fail+1)); echo "  FAIL $1 (got '$2', want '$3')"; fi; }

# Fake docker: records every call; `compose up` always succeeds.
cat > "$BIN/docker" <<EOF
#!/usr/bin/env bash
echo "\$*" >> "$CALLS"
case "\$*" in *"curate.ts"*) [ -n "\${FAIL_CURATE:-}" ] && { echo "boom: contradicts history" >&2; exit 1; };; esac
case "\$*" in *"caddy reload"*) [ -n "\${FAIL_RELOAD:-}" ] && { echo "boom: bad config" >&2; exit 1; };; esac
exit 0
EOF
# Fake curl: the app is "healthy" unless the working copy's VERSION says bad.
cat > "$BIN/curl" <<EOF
#!/usr/bin/env bash
echo "\$*" >> "$T/curl.calls"
[ "\$(cat "$SRV/VERSION")" != bad ]
EOF
chmod +x "$BIN/docker" "$BIN/curl"
export PATH="$BIN:$PATH" DEPLOY_HEALTH_TIMEOUT=5

git init -q --bare "$ORIGIN"; git -C "$ORIGIN" symbolic-ref HEAD refs/heads/main
git init -q "$DEV"; cd "$DEV"; git config user.email t@t; git config user.name t; git checkout -q -b main
mkdir scripts; cp "$SRC_SCRIPT" scripts/deploy.sh; chmod +x scripts/deploy.sh
echo good > VERSION; git add -A; git commit -q -m v1; git remote add origin "$ORIGIN"; git push -q origin main
git clone -q "$ORIGIN" "$SRV"; cd "$SRV"; git config user.email t@t; git config user.name t
printf 'DOMAIN=relay.example.test\nDATABASE_URL=postgres://x\n' > .env
push() { (cd "$DEV" && echo "$1" > VERSION && echo "$1 $2" >> HISTORY && git add -A && git commit -q -m "$1-$2" && git push -q origin main); }
run() { (cd "$SRV" && ./scripts/deploy.sh "$@" 2>&1); }

echo "1. nothing new: silent, no docker, no curl"
: > "$CALLS"; : > "$T/curl.calls"
out="$(run)"; rc=$?
check "exit 0" "$rc" 0; check "no output" "$out" ""; check "docker not called" "$(wc -l < "$CALLS" | tr -d ' ')" 0

echo "2. new good commit: merged, built, health checked at the public address"
push good a; : > "$CALLS"
out="$(run)"; rc=$?
check "exit 0" "$rc" 0
check "HEAD follows origin" "$(git -C "$SRV" rev-parse HEAD)" "$(git -C "$ORIGIN" rev-parse main)"
check "external DB: --no-deps and only three services" "$(grep -c 'compose up -d --build --no-deps app server caddy' "$CALLS")" 1
check "health asked at https://DOMAIN/api/health" "$(grep -c 'https://relay.example.test/api/health' "$T/curl.calls")" 1
check "no -k for a real domain" "$(grep -c -- ' -k' "$T/curl.calls")" 0
check "logged 'deployed'" "$(echo "$out" | grep -c 'deployed')" 1
check "curation loaded inside the server container, host named" "$(grep -c 'compose exec -T server bun run scripts/curate.ts --confirm-db-host=x$' "$CALLS")" 1
check "Caddy reloaded so a changed Caddyfile takes effect" "$(grep -c 'compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile$' "$CALLS")" 1
check "says records are up to date" "$(echo "$out" | grep -c 'public-source records are up to date')" 1
check "no failure marker" "$(test -e "$SRV/.deploy-last-failed" && echo yes || echo no)" no

echo "3. new bad commit: does not come up, rolls back, remembers it"
good_sha="$(git -C "$SRV" rev-parse HEAD)"; push bad b; bad_sha="$(git -C "$ORIGIN" rev-parse main)"; : > "$CALLS"
out="$(run)"; rc=$?
check "exit 1" "$rc" 1
check "HEAD back on the previous commit" "$(git -C "$SRV" rev-parse HEAD)" "$good_sha"
check "VERSION restored" "$(cat "$SRV/VERSION")" good
check "bad commit remembered" "$(cat "$SRV/.deploy-last-failed")" "$bad_sha"
check "rebuilt twice (new, then rollback)" "$(grep -c 'compose up -d --build' "$CALLS")" 2
check "logs were printed" "$(grep -c 'compose logs' "$CALLS")" 1
check "says rolled back" "$(echo "$out" | grep -c 'rolled back')" 1

check "no Caddy reload after a bad deploy" "$(grep -c 'caddy reload' "$CALLS")" 0
check "no curation after a bad deploy" "$(grep -c 'curate.ts' "$CALLS")" 0

echo "4. same bad commit again: skipped silently, nothing rebuilt"
: > "$CALLS"; out="$(run)"; rc=$?
check "exit 0" "$rc" 0; check "no output" "$out" ""; check "docker not called" "$(wc -l < "$CALLS" | tr -d ' ')" 0

echo "5. a fix is pushed: deployed normally, marker cleared"
push good c; : > "$CALLS"; out="$(run)"; rc=$?
check "exit 0" "$rc" 0
check "HEAD follows origin" "$(git -C "$SRV" rev-parse HEAD)" "$(git -C "$ORIGIN" rev-parse main)"
check "marker removed" "$(test -e "$SRV/.deploy-last-failed" && echo yes || echo no)" no

echo "5b. a failing curation does not undo a healthy deploy"
push good e; : > "$CALLS"; out="$(FAIL_CURATE=1 run)"; rc=$?
check "exit 0" "$rc" 0
check "HEAD follows origin" "$(git -C "$SRV" rev-parse HEAD)" "$(git -C "$ORIGIN" rev-parse main)"
check "warns, names the reason" "$(echo "$out" | grep -c 'NOT loaded')" 1
check "only one build (no rollback)" "$(grep -c 'compose up -d --build' "$CALLS")" 1

echo "5c. a failing Caddy reload is logged and does not undo a healthy deploy"
push good f; : > "$CALLS"; out="$(FAIL_RELOAD=1 run)"; rc=$?
check "exit 0" "$rc" 0
check "warns, keeps running on the old config" "$(echo "$out" | grep -c 'did not reload')" 1
check "curation still loaded" "$(grep -c 'curate.ts' "$CALLS")" 1

echo "6. --force with nothing new rebuilds the current commit"
: > "$CALLS"; out="$(run --force)"; rc=$?
check "exit 0" "$rc" 0; check "rebuilt once" "$(grep -c 'compose up -d --build' "$CALLS")" 1

echo "7. server has its own commit: refuses to merge, changes nothing"
echo extra > "$SRV/local.txt"; git -C "$SRV" add -A; git -C "$SRV" commit -q -m local
push good d; : > "$CALLS"; out="$(run)"; rc=$?
check "exit 1" "$rc" 1; check "explains" "$(echo "$out" | grep -c 'cannot fast-forward')" 1
check "docker not called" "$(wc -l < "$CALLS" | tr -d ' ')" 0
git -C "$SRV" reset -q --hard origin/main

echo "8. no external DB: no service list, no --no-deps"
printf 'DOMAIN=relay.example.test\n' > "$SRV/.env"; : > "$CALLS"; out="$(run --force)"
check "plain compose up" "$(grep -c '^compose up -d --build$' "$CALLS")" 1
check "bundled Postgres: host is postgres" "$(grep -c 'confirm-db-host=postgres$' "$CALLS")" 1

echo "9. DOMAIN with a scheme or a slash is refused (Compose would build https://https://...); localhost uses -k"
for bad in 'https://relay.example.test' 'https://relay.example.test/' 'relay.example.test/app'; do
  printf 'DOMAIN=%s
' "$bad" > "$SRV/.env"; : > "$CALLS"; out="$(run --force)"; rc=$?
  check "refused: $bad" "$rc" 1
  check "  says bare host name" "$(echo "$out" | grep -c 'bare host name')" 1
  check "  docker not called" "$(wc -l < "$CALLS" | tr -d ' ')" 0
done
printf 'DOMAIN=localhost\n' > "$SRV/.env"; : > "$T/curl.calls"; run --force >/dev/null
check "-k for localhost" "$(grep -c -- '-k' "$T/curl.calls")" 1

echo "10. missing DOMAIN: stops with a message"
: > "$SRV/.env"; : > "$CALLS"; out="$(run --force)"; rc=$?
check "exit 1" "$rc" 1; check "says so" "$(echo "$out" | grep -c 'DOMAIN is not set')" 1; check "docker not called" "$(wc -l < "$CALLS" | tr -d ' ')" 0

echo "11. a second run while one holds the lock leaves it alone"
printf 'DOMAIN=relay.example.test\n' > "$SRV/.env"
( exec 9>/tmp/relay-deploy.lock; flock -n 9; sleep 4 ) & sleep 1
out="$(run --force)"; rc=$?; wait
check "exit 0" "$rc" 0; check "says another is running" "$(echo "$out" | grep -c 'another deploy is running')" 1

echo; echo "passed $pass, failed $fail"; [ "$fail" -eq 0 ]
