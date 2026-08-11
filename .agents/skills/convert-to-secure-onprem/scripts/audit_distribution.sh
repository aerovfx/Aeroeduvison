#!/usr/bin/env bash
set -euo pipefail

repo="${1:-.}"
cd "$repo"

echo '== Apple client indicators =='
find . -maxdepth 6 \( -path '*/node_modules' -o -path '*/dist' -o -path './.git' \) -prune -o -type f \( -name 'capacitor.config.*' -o -name 'tauri.conf.json' -o -name 'Info.plist' -o -name '*.entitlements' -o -name 'ExportOptions.plist' -o -name 'PrivacyInfo.xcprivacy' -o -name 'project.pbxproj' \) -print | sort

echo '== Apple identity, signing and commerce =='
rg -n --glob '!node_modules/**' --glob '!dist/**' --glob '!build/**' 'appId|PRODUCT_BUNDLE_IDENTIFIER|DEVELOPMENT_TEAM|MARKETING_VERSION|CURRENT_PROJECT_VERSION|CODE_SIGN|StoreKit|In-App Purchase|PrivacyInfo' . 2>/dev/null | head -180 || true

echo '== VPS/container indicators =='
find . -maxdepth 4 \( -path '*/node_modules' -o -path '*/dist' -o -path './.git' \) -prune -o -type f \( -name 'Dockerfile*' -o -name 'docker-compose*.yml' -o -name 'compose*.yaml' -o -name 'Caddyfile' -o -name 'nginx.conf' -o -path '*/systemd/*' -o -path '*/.github/workflows/*' \) -print | sort

echo '== VPS release controls =='
rg -n --glob '!node_modules/**' 'image@sha256|cosign|sbom|provenance|health/ready|rollback|pg_dump|pg_restore|no-new-privileges|cap_drop|ufw|Caddy|nginx|TLS' . 2>/dev/null | head -220 || true

echo '== API compatibility indicators =='
rg -n --glob '!node_modules/**' --glob '!dist/**' 'apiVersion|minClientVersion|minApiVersion|deprecated|backward.compat|VITE_API_URL_NATIVE|PUBLIC_URL' . 2>/dev/null | head -160 || true
