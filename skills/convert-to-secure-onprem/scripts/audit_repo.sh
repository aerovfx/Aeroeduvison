#!/usr/bin/env bash
set -euo pipefail

repo="${1:-.}"
cd "$repo"

echo '== Repository =='
pwd
git status --short 2>/dev/null || true

echo '== Build and deployment files =='
find . -maxdepth 3 \( -path '*/node_modules' -o -path '*/dist' -o -path '*/build' -o -path '*/target' -o -path './.git' \) -prune -o -type f \( -name 'Dockerfile*' -o -name 'docker-compose*.yml' -o -name 'compose*.yaml' -o -path './.github/workflows/*' -o -name 'package.json' -o -name 'Cargo.toml' -o -name 'pyproject.toml' \) -print | sort

echo '== Database indicators =='
rg -n --glob '!node_modules/**' --glob '!dist/**' --glob '!build/**' 'DATABASE_URL|postgres|sqlite|PrismaClient|JSONB|generate_series|ANY\(' . 2>/dev/null | head -120 || true

echo '== External service indicators =='
rg -n --glob '!node_modules/**' --glob '!dist/**' --glob '!build/**' 'https://|GCS|S3|OPENAI|ANTHROPIC|GEMINI|GOOGLE_CLIENT|STRIPE|TELEGRAM|REDIS_URL|OLLAMA' . 2>/dev/null | head -160 || true

echo '== Mutable path indicators =='
rg -n --glob '!node_modules/**' --glob '!dist/**' --glob '!build/**' 'uploads|DATA_DIR|writeFile|mkdir|/tmp|volume' . 2>/dev/null | head -120 || true

echo '== Existing security/release controls =='
rg -n --glob '!node_modules/**' 'cosign|trivy|sbom|provenance|license|health/ready|no-new-privileges|cap_drop|pg_dump|pg_restore' . 2>/dev/null | head -160 || true
