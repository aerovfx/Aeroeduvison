#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${AEROEDU_ENV_FILE:-$ROOT/.env.onprem}"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$ROOT/docker-compose.onprem.yml")

record_event() {
  [ -f "$ROOT/scripts/ops-event.cjs" ] || return 0
  INSTALLATION_ID="$(sed -n 's/^INSTALLATION_ID=//p' "$ENV_FILE" | tail -1)" \
  AEROEDU_VERSION="$(sed -n 's/^AEROEDU_VERSION=//p' "$ENV_FILE" | tail -1)" \
  AEROEDU_IMAGE="$(sed -n 's/^AEROEDU_IMAGE=//p' "$ENV_FILE" | tail -1)" \
  AEROEDU_IMAGE_DIGEST="$(sed -n 's/^AEROEDU_IMAGE_DIGEST=//p' "$ENV_FILE" | tail -1)" \
  AEROEDU_HOME="$ROOT" node "$ROOT/scripts/ops-event.cjs" record "$1" >/dev/null || { echo 'Warning: operation completed but audit event could not be recorded.' >&2; return 0; }
}

wait_ready() {
  local port attempt
  port="$(sed -n 's/^AEROEDU_PORT=//p' "$ENV_FILE" | tail -1)"; port="${port:-8080}"
  for attempt in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${port}/api/health/ready" >/dev/null; then return 0; fi
    sleep 2
  done
  return 1
}

verify_backup_set() {
  local archive="$1" directory name data_name manifest_name checksum listed expected
  directory="$(cd "$(dirname "$archive")" && pwd)"; name="$(basename "$archive")"
  data_name="$(basename "${archive%.dump}.data.tar.gz")"; manifest_name="$(basename "${archive%.dump}.manifest.json")"; checksum="$archive.sha256"
  [ -f "$archive" ] && [ -f "${archive%.dump}.data.tar.gz" ] && [ -f "${archive%.dump}.manifest.json" ] && [ -f "$checksum" ] || return 1
  listed="$(awk 'NF == 2 { print $2 }' "$checksum" | LC_ALL=C sort)"
  expected="$(printf '%s\n' "$name" "$data_name" "$manifest_name" | LC_ALL=C sort)"
  [ "$(wc -l < "$checksum" | tr -d '[:space:]')" = 3 ] && [ "$listed" = "$expected" ] || return 1
  if command -v sha256sum >/dev/null 2>&1; then (cd "$directory" && sha256sum -c "$name.sha256"); else (cd "$directory" && shasum -a 256 -c "$name.sha256"); fi
}

require_env() {
  if [ ! -f "$ENV_FILE" ]; then
    cp "$ROOT/.env.onprem.example" "$ENV_FILE"
    secret="$(openssl rand -hex 32)"
    db_secret="$(openssl rand -hex 24)"
    sed -i.bak "s/CHANGE_ME_WITH_AT_LEAST_32_RANDOM_CHARACTERS/$secret/" "$ENV_FILE"
    sed -i.bak "s/CHANGE_ME_WITH_A_DIFFERENT_RANDOM_PASSWORD/$db_secret/" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
    chmod 600 "$ENV_FILE"
    echo "Đã tạo $ENV_FILE. Hãy kiểm tra PUBLIC_URL rồi chạy lại."
    exit 0
  fi
}

validate_env() {
  local secret public_url db_secret installation_id license_file install_mode public_key node_image postgres_image app_image app_image_id receipt verified_image
  secret="$(sed -n 's/^JWT_SECRET=//p' "$ENV_FILE" | tail -1)"
  public_url="$(sed -n 's/^PUBLIC_URL=//p' "$ENV_FILE" | tail -1)"
  db_secret="$(sed -n 's/^POSTGRES_PASSWORD=//p' "$ENV_FILE" | tail -1)"
  installation_id="$(sed -n 's/^INSTALLATION_ID=//p' "$ENV_FILE" | tail -1)"
  license_file="$(sed -n 's/^LICENSE_FILE_HOST=//p' "$ENV_FILE" | tail -1)"; license_file="${license_file:-./license.json}"
  install_mode="$(sed -n 's/^AEROEDU_INSTALL_MODE=//p' "$ENV_FILE" | tail -1)"; install_mode="${install_mode:-connected}"
  public_key="$(sed -n 's/^LICENSE_PUBLIC_KEY_B64=//p' "$ENV_FILE" | tail -1)"
  node_image="$(sed -n 's/^NODE_IMAGE=//p' "$ENV_FILE" | tail -1)"
  postgres_image="$(sed -n 's/^POSTGRES_IMAGE=//p' "$ENV_FILE" | tail -1)"
  app_image="$(sed -n 's/^AEROEDU_IMAGE=//p' "$ENV_FILE" | tail -1)"
  app_image_id="$(sed -n 's/^AEROEDU_IMAGE_ID=//p' "$ENV_FILE" | tail -1)"
  if [ "${#secret}" -lt 32 ] || [[ "$secret" == *CHANGE_ME* ]]; then
    echo "JWT_SECRET trong $ENV_FILE phải là chuỗi ngẫu nhiên ít nhất 32 ký tự." >&2
    exit 2
  fi
  if [ "${#db_secret}" -lt 24 ] || [[ "$db_secret" == *CHANGE_ME* ]]; then
    echo "POSTGRES_PASSWORD trong $ENV_FILE phải là chuỗi ngẫu nhiên ít nhất 24 ký tự." >&2
    exit 2
  fi
  if [[ ! "$db_secret" =~ ^[A-Za-z0-9._~-]+$ ]]; then
    echo "POSTGRES_PASSWORD chỉ được chứa ký tự URL-safe: A-Z a-z 0-9 . _ ~ -." >&2
    exit 2
  fi
  if [[ ! "$public_url" =~ ^https?:// ]]; then
    echo "PUBLIC_URL trong $ENV_FILE phải bắt đầu bằng http:// hoặc https://." >&2
    exit 2
  fi
  if [ -z "$installation_id" ] || [[ "$installation_id" == *CHANGE_ME* ]]; then
    echo "INSTALLATION_ID trong $ENV_FILE chưa được cấu hình." >&2
    exit 2
  fi
  if [[ "$license_file" != /* ]]; then license_file="$ROOT/$license_file"; fi
  if [ ! -r "$license_file" ]; then
    echo "Không đọc được license tại $license_file." >&2
    exit 2
  fi
  if [ "$install_mode" != airgap ] && [ -z "$public_key" ]; then
    echo "LICENSE_PUBLIC_KEY_B64 là bắt buộc khi build connected." >&2
    exit 2
  fi
  if [ "$install_mode" != airgap ] && [[ ! "$postgres_image" =~ @sha256:[a-f0-9]{64}$ ]]; then
    echo "POSTGRES_IMAGE phải được pin bằng @sha256 digest." >&2
    exit 2
  fi
  if [ "$install_mode" = airgap ] && [[ ! "$postgres_image" =~ ^aeroedu/postgres:16-v?[0-9] ]]; then
    echo "POSTGRES_IMAGE air-gap phải là image helper đã được đóng trong signed bundle." >&2
    exit 2
  fi
  if [ "$install_mode" = registry ] && [[ ! "$app_image" =~ @sha256:[a-f0-9]{64}$ ]]; then
    echo "AEROEDU_IMAGE registry phải được pin bằng @sha256 digest và triển khai qua deploy-verified.sh." >&2
    exit 2
  fi
  if [ "$install_mode" = registry ]; then
    receipt="$(sed -n 's/^AEROEDU_VERIFIED_RECEIPT=//p' "$ENV_FILE" | tail -1)"; receipt="${receipt:-$ROOT/state/verified-release.env}"
    [ -r "$receipt" ] || { echo 'Registry deployment receipt missing; use scripts/deploy-verified.sh.' >&2; exit 2; }
    verified_image="$(sed -n 's/^AEROEDU_VERIFIED_IMAGE=//p' "$receipt" | tail -1)"
    [ "$verified_image" = "$app_image" ] || { echo 'Registry deployment receipt does not match AEROEDU_IMAGE.' >&2; exit 2; }
  fi
  if [ "$install_mode" = airgap ]; then
    [ -n "$app_image_id" ] || { echo 'AEROEDU_IMAGE_ID thiếu trong signed air-gap install receipt.' >&2; exit 2; }
    actual_image_id="$(docker image inspect --format '{{.Id}}' "$app_image" 2>/dev/null || true)"
    [ "$actual_image_id" = "$app_image_id" ] || { echo 'Air-gap image tag no longer matches the signed image ID.' >&2; exit 2; }
  fi
  if [ "$install_mode" = connected ] && [[ ! "$node_image" =~ @sha256:[a-f0-9]{64}$ ]]; then
    echo "NODE_IMAGE phải được pin bằng @sha256 digest khi build connected." >&2
    exit 2
  fi
}

case "${1:-help}" in
  init)
    require_env
    ;;
  install|upgrade)
    require_env
    validate_env
    "${COMPOSE[@]}" config >/dev/null
    install_mode="$(sed -n 's/^AEROEDU_INSTALL_MODE=//p' "$ENV_FILE" | tail -1)"
    if [ "$install_mode" = airgap ] || [ "$install_mode" = registry ]; then
      "${COMPOSE[@]}" up -d --no-build --remove-orphans
    else
      "${COMPOSE[@]}" build --pull
      "${COMPOSE[@]}" up -d --remove-orphans
    fi
    "${COMPOSE[@]}" ps
    wait_ready || { echo 'Application failed bounded readiness.' >&2; exit 5; }
    record_event "runtime.${1}"
    ;;
  start)
    require_env; validate_env; "${COMPOSE[@]}" up -d
    ;;
  stop)
    require_env; "${COMPOSE[@]}" stop
    ;;
  status)
    require_env; "${COMPOSE[@]}" ps
    ;;
  logs)
    require_env; "${COMPOSE[@]}" logs -f --tail=200 app
    ;;
  diagnose)
    require_env
    validate_env
    "${COMPOSE[@]}" config --quiet
    "${COMPOSE[@]}" ps
    port="$(sed -n 's/^AEROEDU_PORT=//p' "$ENV_FILE" | tail -1)"
    curl -fsS "http://127.0.0.1:${port:-8080}/api/health/ready"
    echo
    ;;
  backup)
    require_env
    db_user="$(sed -n 's/^POSTGRES_USER=//p' "$ENV_FILE" | tail -1)"; db_user="${db_user:-aeroedu}"
    db_name="$(sed -n 's/^POSTGRES_DB=//p' "$ENV_FILE" | tail -1)"; db_name="${db_name:-aeroedu}"
    dest="${2:-$ROOT/backups/aeroedu-$(date +%Y%m%d-%H%M%S).dump}"
    mkdir -p "$(dirname "$dest")"
    case "$dest" in *.dump) ;; *) dest="$dest.dump" ;; esac
    db_tmp="$(mktemp "$(dirname "$dest")/.aeroedu-db.XXXXXX")"
    data_dest="${dest%.dump}.data.tar.gz"; data_tmp="$(mktemp "$(dirname "$dest")/.aeroedu-data.XXXXXX")"
    manifest_dest="${dest%.dump}.manifest.json"; manifest_tmp="$(mktemp "$(dirname "$dest")/.aeroedu-manifest.XXXXXX")"
    reconcile_tmp="$(mktemp "$(dirname "$dest")/.aeroedu-reconcile.XXXXXX")"
    app_was_running=false
    app_id="$("${COMPOSE[@]}" ps -q app 2>/dev/null || true)"
    if [ -n "$app_id" ] && [ "$(docker inspect --format '{{.State.Running}}' "$app_id" 2>/dev/null || true)" = true ]; then app_was_running=true; "${COMPOSE[@]}" stop app; fi
    cleanup_backup() { rm -f "$db_tmp" "$data_tmp" "$manifest_tmp" "$reconcile_tmp"; if [ "$app_was_running" = true ]; then "${COMPOSE[@]}" up -d app >/dev/null || true; fi; }
    trap cleanup_backup EXIT
    "${COMPOSE[@]}" exec -T postgres pg_dump -U "$db_user" -d "$db_name" --format=custom --no-owner --no-privileges > "$db_tmp"
    "${COMPOSE[@]}" exec -T postgres pg_restore --list < "$db_tmp" >/dev/null
    "${COMPOSE[@]}" run --rm --no-deps --entrypoint tar app czf - --exclude=./.restore-staging --exclude=./.restore-previous -C /var/lib/aeroedu . > "$data_tmp"
    tar tzf "$data_tmp" >/dev/null
    "${COMPOSE[@]}" run --rm --no-deps --entrypoint node app /app/scripts/reconcile-state.cjs > "$reconcile_tmp"
    BACKUP_RECONCILIATION="$reconcile_tmp" BACKUP_INSTALLATION="$(sed -n 's/^INSTALLATION_ID=//p' "$ENV_FILE" | tail -1)" BACKUP_VERSION="$(sed -n 's/^AEROEDU_VERSION=//p' "$ENV_FILE" | tail -1)" BACKUP_DIGEST="$(sed -n 's/^AEROEDU_IMAGE_DIGEST=//p' "$ENV_FILE" | tail -1)" node - "$manifest_tmp" <<'NODE'
const fs = require('fs');
const manifest = { schema: 1, createdAt: new Date().toISOString(), installationId: process.env.BACKUP_INSTALLATION,
  version: process.env.BACKUP_VERSION, imageDigest: process.env.BACKUP_DIGEST,
  reconciliation: JSON.parse(fs.readFileSync(process.env.BACKUP_RECONCILIATION, 'utf8')) };
fs.writeFileSync(process.argv[2], `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
NODE
    chmod 600 "$db_tmp" "$data_tmp" "$manifest_tmp"
    mv "$db_tmp" "$dest"; mv "$data_tmp" "$data_dest"; mv "$manifest_tmp" "$manifest_dest"
    backup_dir="$(dirname "$dest")"; db_file="$(basename "$dest")"; data_file="$(basename "$data_dest")"; manifest_file="$(basename "$manifest_dest")"
    if command -v sha256sum >/dev/null 2>&1; then (cd "$backup_dir" && sha256sum "$db_file" "$data_file" "$manifest_file" > "$db_file.sha256"); else (cd "$backup_dir" && shasum -a 256 "$db_file" "$data_file" "$manifest_file" > "$db_file.sha256"); fi
    if [ "$app_was_running" = true ]; then "${COMPOSE[@]}" up -d app >/dev/null; wait_ready || { echo 'Backup completed but application did not recover readiness.' >&2; exit 5; }; fi
    trap - EXIT
    echo "Backup: $dest"
    echo "Data:   $data_dest"
    echo "Manifest: $manifest_dest"
    record_event backup.complete
    ;;
  restore)
    require_env
    db_user="$(sed -n 's/^POSTGRES_USER=//p' "$ENV_FILE" | tail -1)"; db_user="${db_user:-aeroedu}"
    db_name="$(sed -n 's/^POSTGRES_DB=//p' "$ENV_FILE" | tail -1)"; db_name="${db_name:-aeroedu}"
    archive="${2:-}"
    [ -f "$archive" ] || { echo "Usage: $0 restore /path/backup.dump" >&2; exit 2; }
    data_archive="${archive%.dump}.data.tar.gz"; manifest_archive="${archive%.dump}.manifest.json"; checksum_file="$archive.sha256"
    [ -f "$data_archive" ] && [ -f "$manifest_archive" ] && [ -f "$checksum_file" ] || { echo 'Restore requires matching data, manifest and checksum files.' >&2; exit 2; }
    verify_backup_set "$archive" || { echo 'Backup checksum set is incomplete, non-canonical or invalid.' >&2; exit 2; }
    backup_installation="$(node -p 'require(process.argv[1]).installationId' "$manifest_archive")"
    current_installation="$(sed -n 's/^INSTALLATION_ID=//p' "$ENV_FILE" | tail -1)"
    if [ "$backup_installation" != "$current_installation" ] && [ "${AEROEDU_ALLOW_FOREIGN_RESTORE:-no}" != yes ]; then
      echo 'Backup installation ID mismatch; set AEROEDU_ALLOW_FOREIGN_RESTORE=yes only under an audited break-glass procedure.' >&2
      exit 2
    fi
    echo "Restore sẽ thay thế dữ liệu hiện tại. Chạy với AEROEDU_CONFIRM_RESTORE=yes để xác nhận." >&2
    [ "${AEROEDU_CONFIRM_RESTORE:-}" = yes ] || exit 3
    "${COMPOSE[@]}" exec -T postgres pg_restore --list < "$archive" >/dev/null
    members="$(tar tzf "$data_archive")"
    if printf '%s\n' "$members" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then echo 'Unsafe application-data archive path.' >&2; exit 2; fi
    if printf '%s\n' "$members" | grep -Eq '(^|/)\.restore-(staging|previous)(/|$)'; then echo 'Archive uses a reserved restore path.' >&2; exit 2; fi
    if tar tvzf "$data_archive" | grep -Eq '^[lhcbp]'; then echo 'Unsafe application-data archive link or device entry.' >&2; exit 2; fi
    safety_dir="${AEROEDU_BACKUP_DIR:-$ROOT/backups}"; mkdir -p "$safety_dir"
    safety="$safety_dir/pre-restore-$(date +%Y%m%d-%H%M%S).dump"
    restore_preflight_cleanup() {
      "${COMPOSE[@]}" up -d app >/dev/null 2>&1 || true
      wait_ready || echo 'EMERGENCY: restore preflight failed and application readiness was not recovered.' >&2
    }
    trap restore_preflight_cleanup EXIT
    "${COMPOSE[@]}" stop app
    AEROEDU_ENV_FILE="$ENV_FILE" "$ROOT/onprem.sh" backup "$safety"
    trap - EXIT
    safety_data="${safety%.dump}.data.tar.gz"
    stage_data_volume() {
      local source_archive="$1"
      gunzip -c "$source_archive" | "${COMPOSE[@]}" run --rm --no-deps --entrypoint sh app -c 'rm -rf /var/lib/aeroedu/.restore-staging && mkdir /var/lib/aeroedu/.restore-staging && tar xf - -C /var/lib/aeroedu/.restore-staging'
    }
    activate_staged_data() {
      "${COMPOSE[@]}" run --rm --no-deps --entrypoint sh app -c 'rm -rf /var/lib/aeroedu/.restore-previous && mkdir /var/lib/aeroedu/.restore-previous && find /var/lib/aeroedu -mindepth 1 -maxdepth 1 ! -name .restore-staging ! -name .restore-previous -exec mv {} /var/lib/aeroedu/.restore-previous/ \; && find /var/lib/aeroedu/.restore-staging -mindepth 1 -maxdepth 1 -exec mv {} /var/lib/aeroedu/ \; && rmdir /var/lib/aeroedu/.restore-staging'
    }
    rollback_data_volume() {
      "${COMPOSE[@]}" run --rm --no-deps --entrypoint sh app -c 'if [ -d /var/lib/aeroedu/.restore-previous ]; then find /var/lib/aeroedu -mindepth 1 -maxdepth 1 ! -name .restore-previous -exec rm -rf {} + && find /var/lib/aeroedu/.restore-previous -mindepth 1 -maxdepth 1 -exec mv {} /var/lib/aeroedu/ \; && rmdir /var/lib/aeroedu/.restore-previous; else rm -rf /var/lib/aeroedu/.restore-staging; fi'
    }
    commit_data_volume() {
      "${COMPOSE[@]}" run --rm --no-deps --entrypoint sh app -c 'rm -rf /var/lib/aeroedu/.restore-previous'
    }
    reconcile_restored_data() {
      local expected_manifest="${1:-$manifest_archive}"
      current_reconciliation="$(mktemp)"
      "${COMPOSE[@]}" run --rm --no-deps --entrypoint node app /app/scripts/reconcile-state.cjs > "$current_reconciliation"
      node - "$expected_manifest" "$current_reconciliation" <<'NODE'
const fs = require('fs');
const expected = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).reconciliation;
const actual = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
if (JSON.stringify(expected) !== JSON.stringify(actual)) process.exit(1);
NODE
      result=$?; rm -f "$current_reconciliation"; return "$result"
    }
    if ! stage_data_volume "$data_archive" || ! "${COMPOSE[@]}" exec -T postgres pg_restore -U "$db_user" -d "$db_name" --single-transaction --clean --if-exists --no-owner --no-privileges < "$archive" || ! activate_staged_data || ! reconcile_restored_data "$manifest_archive"; then
      echo 'Restore failed; restoring pre-restore database and application data.' >&2
      recovery_ok=true
      "${COMPOSE[@]}" exec -T postgres pg_restore -U "$db_user" -d "$db_name" --single-transaction --clean --if-exists --no-owner --no-privileges < "$safety" || recovery_ok=false
      rollback_data_volume || recovery_ok=false
      reconcile_restored_data "${safety%.dump}.manifest.json" || recovery_ok=false
      "${COMPOSE[@]}" up -d app || recovery_ok=false
      wait_ready || recovery_ok=false
      if [ "$recovery_ok" != true ]; then echo 'EMERGENCY: restore failed and safety recovery is not healthy.' >&2; exit 7; fi
      echo 'Restore failed; safety state was restored and verified ready.' >&2
      exit 4
    fi
    "${COMPOSE[@]}" up -d app
    if ! wait_ready; then
      "${COMPOSE[@]}" stop app
      recovery_ok=true
      "${COMPOSE[@]}" exec -T postgres pg_restore -U "$db_user" -d "$db_name" --single-transaction --clean --if-exists --no-owner --no-privileges < "$safety" || recovery_ok=false
      rollback_data_volume || recovery_ok=false
      reconcile_restored_data "${safety%.dump}.manifest.json" || recovery_ok=false
      "${COMPOSE[@]}" up -d app || recovery_ok=false
      wait_ready || recovery_ok=false
      if [ "$recovery_ok" != true ]; then echo 'EMERGENCY: restored data failed readiness and safety recovery is not healthy.' >&2; exit 7; fi
      echo 'Restore failed readiness; safety state was restored and verified ready.' >&2
      exit 5
    fi
    commit_data_volume
    echo "Pre-restore safety backup: $safety"
    record_event restore.complete
    ;;
  verify-backup)
    require_env
    archive="${2:-}"; [ -f "$archive" ] || { echo "Usage: $0 verify-backup /path/backup.dump" >&2; exit 2; }
    data_archive="${archive%.dump}.data.tar.gz"; manifest_archive="${archive%.dump}.manifest.json"; checksum_file="$archive.sha256"
    [ -f "$data_archive" ] && [ -f "$manifest_archive" ] && [ -f "$checksum_file" ] || { echo 'Backup set is incomplete.' >&2; exit 2; }
    verify_backup_set "$archive" || { echo 'Backup checksum set is incomplete, non-canonical or invalid.' >&2; exit 2; }
    "${COMPOSE[@]}" exec -T postgres pg_restore --list < "$archive" >/dev/null
    tar tzf "$data_archive" >/dev/null
    echo "Backup set verified: $archive"
    record_event backup.verified
    ;;
  audit)
    require_env
    AEROEDU_HOME="$ROOT" node "$ROOT/scripts/ops-event.cjs" verify
    ;;
  inventory)
    require_env
    printf 'installation_id=%s\nversion=%s\nimage=%s\ndigest=%s\nmode=%s\n' \
      "$(sed -n 's/^INSTALLATION_ID=//p' "$ENV_FILE" | tail -1)" \
      "$(sed -n 's/^AEROEDU_VERSION=//p' "$ENV_FILE" | tail -1)" \
      "$(sed -n 's/^AEROEDU_IMAGE=//p' "$ENV_FILE" | tail -1)" \
      "$(sed -n 's/^AEROEDU_IMAGE_DIGEST=//p' "$ENV_FILE" | tail -1)" \
      "$(sed -n 's/^AEROEDU_INSTALL_MODE=//p' "$ENV_FILE" | tail -1)"
    ;;
  uninstall)
    require_env
    "${COMPOSE[@]}" down
    echo "Đã gỡ container/network. Volume dữ liệu được giữ lại."
    ;;
  *)
    echo "Usage: $0 {init|install|upgrade|start|stop|status|logs|diagnose|backup [file]|verify-backup file|restore file|audit|inventory|uninstall}"
    ;;
esac
