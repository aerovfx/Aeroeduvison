# Stack selection patterns

## Node.js / React

- Browser code is always customer-readable; remove secrets and source maps.
- Bundle backend with esbuild using external runtime packages, then test dynamic
  imports and filesystem-relative paths.
- Prefer Node 22+ and a minimal multi-stage runtime.

## Database

- PostgreSQL-specific SQL (`JSONB`, arrays, `ANY`, casts, advisory locks,
  `generate_series`) requires PostgreSQL unless queries are deliberately ported.
- SQLite fits single-process local data when every query and concurrency path is
  tested natively. Do not emulate PostgreSQL with regex substitution.

## Registry and signing

- GHCR: CI may publish with repository `GITHUB_TOKEN`; customer access should use
  a read-only package token.
- Harbor/Nexus/Artifactory: use robot/service accounts with pull-only scope.
- Connected images: sign and verify exact OCI digest.
- Air-gap archives: sign the outer blob; image-registry signatures are not
  necessarily preserved by `docker save`.

## Offline AI and integrations

- Remove cloud credentials from the runtime configuration.
- Allowlist only private/LAN endpoints such as Ollama.
- Fail immediately for cloud-only routes; do not wait for network timeouts.
- Test with network egress disabled, not only with `OFFLINE_MODE=true`.
