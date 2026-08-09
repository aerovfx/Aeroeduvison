#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ENV="${AEROEDU_ENV_FILE:-$ROOT/.env.onprem}"
ARCHIVE="${1:-}"
EVIDENCE="${2:-$ROOT/reports/dr-evidence-$(date -u +%Y%m%dT%H%M%SZ).json}"
[ -f "$ARCHIVE" ] && [ -f "${ARCHIVE%.dump}.data.tar.gz" ] && [ -f "${ARCHIVE%.dump}.manifest.json" ] && [ -f "$ARCHIVE.sha256" ] || { echo "Usage: $0 backup.dump [evidence.json]" >&2; exit 2; }
[ -r "$SOURCE_ENV" ] || { echo "Cannot read $SOURCE_ENV" >&2; exit 2; }
command -v docker >/dev/null || { echo 'Docker is required' >&2; exit 2; }
command -v node >/dev/null || { echo 'Node.js 22 is required' >&2; exit 2; }

drill_id="$(date -u +%Y%m%d%H%M%S)-$$"
stage="$(mktemp -d)"; drill_env="$stage/drill.env"
project="aeroedu-dr-$drill_id"; data_volume="${project}_data"; postgres_volume="${project}_postgres"
port="${DRILL_PORT:-18080}"; rto_target="${DR_RTO_SECONDS:-14400}"
rpo_target="${DR_RPO_SECONDS:-86400}"
started_epoch="$(date +%s)"; started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
mkdir -p "$(dirname "$EVIDENCE")"

awk -v project="$project" -v data="$data_volume" -v postgres="$postgres_volume" -v port="$port" '
  BEGIN { p=0; d=0; pg=0 }
  /^AEROEDU_COMPOSE_PROJECT=/ { print "AEROEDU_COMPOSE_PROJECT=" project; p=1; next }
  /^AEROEDU_DATA_VOLUME=/ { print "AEROEDU_DATA_VOLUME=" data; d=1; next }
  /^AEROEDU_POSTGRES_VOLUME=/ { print "AEROEDU_POSTGRES_VOLUME=" postgres; pg=1; next }
  /^AEROEDU_PORT=/ { print "AEROEDU_PORT=" port; next }
  /^PUBLIC_URL=/ { print "PUBLIC_URL=http://127.0.0.1:" port; next }
  { print }
  END { if (!p) print "AEROEDU_COMPOSE_PROJECT=" project; if (!d) print "AEROEDU_DATA_VOLUME=" data; if (!pg) print "AEROEDU_POSTGRES_VOLUME=" postgres }
' "$SOURCE_ENV" > "$drill_env"
chmod 600 "$drill_env"
source_installation="$(sed -n 's/^INSTALLATION_ID=//p' "$SOURCE_ENV" | tail -1)"
backup_installation="$(node -p 'require(process.argv[1]).installationId' "${ARCHIVE%.dump}.manifest.json")"
[ "$source_installation" = "$backup_installation" ] || [ "${DR_ALLOW_FOREIGN_INSTALLATION:-no}" = yes ] || { echo 'Backup installation ID does not match this site.' >&2; exit 2; }
backup_age="$(node -p 'Math.floor((Date.now()-new Date(require(process.argv[1]).createdAt).getTime())/1000)' "${ARCHIVE%.dump}.manifest.json")"
[ "$backup_age" -ge 0 ] && [ "$backup_age" -le "$rpo_target" ] || { echo "Backup age ${backup_age}s exceeds RPO ${rpo_target}s" >&2; exit 6; }

cleanup() {
  docker compose --env-file "$drill_env" -f "$ROOT/docker-compose.onprem.yml" down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$stage"
}
trap cleanup EXIT

export AEROEDU_ENV_FILE="$drill_env" AEROEDU_AUDIT_LOG="$stage/drill-audit.jsonl" AEROEDU_BACKUP_DIR="$stage/backups"
"$ROOT/onprem.sh" install
AEROEDU_CONFIRM_RESTORE=yes "$ROOT/onprem.sh" restore "$ARCHIVE"
"$ROOT/onprem.sh" diagnose >/dev/null

compose=(docker compose --env-file "$drill_env" -f "$ROOT/docker-compose.onprem.yml")
db_user="$(sed -n 's/^POSTGRES_USER=//p' "$drill_env" | tail -1)"; db_user="${db_user:-aeroedu}"
db_name="$(sed -n 's/^POSTGRES_DB=//p' "$drill_env" | tail -1)"; db_name="${db_name:-aeroedu}"
current_reconciliation="$stage/current-reconciliation.json"
"${compose[@]}" run --rm --no-deps --entrypoint node app /app/scripts/reconcile-state.cjs > "$current_reconciliation"
read -r expected_reconciliation_hash actual_reconciliation_hash table_count file_count <<EOF
$(node - "${ARCHIVE%.dump}.manifest.json" "$current_reconciliation" <<'NODE'
const fs = require('fs'), crypto = require('crypto');
const expected = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).reconciliation;
const actual = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
console.log(hash(expected), hash(actual), actual.tables.length, actual.files.length);
NODE
)
EOF
finished_epoch="$(date +%s)"; finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; elapsed="$((finished_epoch-started_epoch))"
status=pass
[ "$elapsed" -le "$rto_target" ] || status=fail
[ "$actual_reconciliation_hash" = "$expected_reconciliation_hash" ] || status=fail
cleanup_status=pass
if ! "${compose[@]}" down -v --remove-orphans >/dev/null; then cleanup_status=fail; status=fail; fi
if docker volume inspect "$data_volume" >/dev/null 2>&1 || docker volume inspect "$postgres_volume" >/dev/null 2>&1; then cleanup_status=fail; status=fail; fi
trap - EXIT
rm -rf "$stage"

backup_set_hash="$(openssl dgst -sha256 "$ARCHIVE.sha256" | awk '{print $NF}')"
DR_STATUS="$status" DR_CLEANUP="$cleanup_status" DR_STARTED="$started_at" DR_FINISHED="$finished_at" DR_ELAPSED="$elapsed" DR_RTO="$rto_target" DR_RPO="$rpo_target" DR_BACKUP_AGE="$backup_age" DR_ARCHIVE="$(cd "$(dirname "$ARCHIVE")" && pwd)/$(basename "$ARCHIVE")" DR_BACKUP_HASH="$backup_set_hash" DR_RECON_EXPECTED="$expected_reconciliation_hash" DR_RECON_ACTUAL="$actual_reconciliation_hash" DR_TABLES="$table_count" DR_FILES="$file_count" DR_PROJECT="$project" node - "$EVIDENCE" <<'NODE'
const fs = require('fs');
const crypto = require('crypto');
const evidence = { schema: 1, status: process.env.DR_STATUS, startedAt: process.env.DR_STARTED, finishedAt: process.env.DR_FINISHED,
  elapsedSeconds: Number(process.env.DR_ELAPSED), rtoTargetSeconds: Number(process.env.DR_RTO), cleanupStatus: process.env.DR_CLEANUP,
  backup: { path: process.env.DR_ARCHIVE, checksumSetSha256: process.env.DR_BACKUP_HASH,
    ageSeconds: Number(process.env.DR_BACKUP_AGE), rpoTargetSeconds: Number(process.env.DR_RPO) }, isolatedProject: process.env.DR_PROJECT,
  reconciliation: { expectedSha256: process.env.DR_RECON_EXPECTED, actualSha256: process.env.DR_RECON_ACTUAL,
    tables: Number(process.env.DR_TABLES), files: Number(process.env.DR_FILES) } };
evidence.sha256 = crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
fs.writeFileSync(process.argv[2], `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
NODE

echo "DR evidence: $EVIDENCE"
[ "$status" = pass ] || { echo "DR drill failed: elapsed=${elapsed}s target=${rto_target}s reconciliation=${actual_reconciliation_hash}/${expected_reconciliation_hash} cleanup=${cleanup_status}" >&2; exit 6; }
