#!/usr/bin/env bash
set -euo pipefail
: "${GH_TOKEN:?GH_TOKEN required}" "${GITHUB_REPOSITORY_OWNER:?GITHUB_REPOSITORY_OWNER required}"
package="${1:-aeroedu-onprem}"
api="https://api.github.com"
headers=(-H "Authorization: Bearer $GH_TOKEN" -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2026-03-10')
owner_type="$(curl -fsSL "${headers[@]}" "$api/users/$GITHUB_REPOSITORY_OWNER" | jq -r .type)"
if [ "$owner_type" = Organization ]; then
  endpoint="$api/orgs/$GITHUB_REPOSITORY_OWNER/packages/container/$package"
else
  endpoint="$api/users/$GITHUB_REPOSITORY_OWNER/packages/container/$package"
fi
visibility="$(curl -fsSL "${headers[@]}" "$endpoint" | jq -r .visibility)"
[ "$visibility" = private ] || { echo "GHCR package must be private; got: $visibility" >&2; exit 1; }
echo "GHCR visibility: private"
