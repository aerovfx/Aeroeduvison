# Phase 5–6 — License enforcement and migrations

## Contract

- Production licenses use canonical JSON signed with Ed25519 and are bound to
  customer, installation, validity window, features, seats, issuer/key ID and
  exact application image digest.
- The private signing key remains in the protected `license-issuance` GitHub
  environment or an external KMS/HSM. It is never copied into an image or
  customer bundle.
- On-prem startup fails closed when the license is missing, expired, revoked,
  signed by an untrusted key, bound to another installation/image, or cannot be
  synchronized to PostgreSQL.
- Runtime API requests recheck the signed license at most every 60 seconds.
  Offline clock-rollback detection is best-effort; hostile host root is outside
  the trust boundary.
- Replacing a license requires a controlled application restart. Startup then
  atomically synchronizes the new seat limit before serving traffic.

## Feature and seat enforcement

The route policy currently defines `core`, `ai`, `integrations` and `payments`.
Unlicensed mapped routes return `FEATURE_NOT_LICENSED`. Add every new premium
route to `lib/license-policy.cjs` in the same change that introduces the route.

Seat enforcement is a PostgreSQL `BEFORE INSERT` trigger on `User`. It takes a
transaction-scoped advisory lock, reads the synchronized license state and
counts non-banned users before allowing an insert. This covers local register,
OAuth and administrative creation paths and prevents concurrent requests from
oversubscribing the license.

## Key rotation and revocation

- Default installations trust the embedded current public key.
- For rotation, mount a JSON key ring with `LICENSE_TRUSTED_KEYS_FILE`, or set
  `LICENSE_TRUSTED_KEYS_JSON_B64` to base64-encoded JSON. Keys
  are indexed by `issuer:keyId` and contain PEM public-key values.
- `LICENSE_ALLOWED_ISSUERS` is a comma-separated issuer allowlist.
- `LICENSE_REVOKED_IDS` may contain license IDs, key IDs or `issuer:keyId`.
- Introduce a new trusted public key before issuing with its key ID. After all
  customers renew, revoke the old key ID and remove it in a later release.

Revocation in a fully air-gapped installation takes effect only when the
operator receives an updated key ring/configuration or application release.

## Migration policy

- Files under `onprem-migrations/` are immutable and sequential:
  `0001-name.sql`, `0002-name.sql`, and so on.
- CI rejects gaps, invalid names and migrations containing their own transaction
  control statements.
- Startup obtains PostgreSQL advisory lock `51702311`. Every unapplied migration
  runs in its own transaction and its SHA-256 is recorded in
  `aeroedu_schema_migrations`.
- A changed checksum for an applied migration fails startup. Never edit an
  applied migration; add a new file.
- Schema changes follow expand/contract. The previous application digest must
  remain compatible throughout its rollback window. Destructive contraction is
  a later release after all supported older versions have left service.
- Readiness requires every migration known by the running image to match the DB
  ledger prefix. Newer expand-compatible rows are accepted so the previous image
  can recover after a failed upgrade.
- Before deployment, create and validate the database plus application-data
  backup. If a migration is not backward-compatible, rollback requires the
  tested pre-upgrade backup rather than only switching image digest.

## Exit gates

| Gate | Local status | Target-infrastructure gate |
|---|---|---|
| Tamper, expiry, host and image binding | Unit tests | Renewal drill |
| Feature denial | Unit policy tests | HTTP integration test |
| Seat concurrency | Trigger and SQL review | Parallel PostgreSQL registration test |
| Migration order/checksum | Static validator | Clean DB + upgrade DB + tamper test |
| Advisory-lock concurrency | Code gate | Two-container startup test |
| Failed release rollback | Deploy code gate | Destructive staging drill with data reconciliation |

Phase 5–6 is production-validated only after the PostgreSQL concurrency,
upgrade, checksum-tamper and rollback drills pass on the supported Docker host.

The migration ledger currently governs the on-prem bootstrap and license/seat
schema. Legacy modules in the consolidated server still contain lazy `CREATE`
and `ALTER` statements; the whole application database must not yet be claimed
fully migration-governed until those statements are inventoried and converted
into ordered migrations.
