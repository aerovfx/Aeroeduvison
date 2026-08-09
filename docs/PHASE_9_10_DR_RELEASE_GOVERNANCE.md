# Phase 9–10 — Disaster recovery and release governance

## Phase 9: measurable disaster recovery

Every backup recovery set contains:

- PostgreSQL custom dump;
- application-data archive;
- reconciliation manifest with installation/version/digest, row fingerprints
  for every public table, sequence state, a canonical fingerprint of columns,
  indexes, constraints, triggers and functions, plus path, size and SHA-256 for
  every durable application file;
- SHA-256 checksum file covering all three artifacts.

`scripts/dr-drill.sh` restores the set into a unique Compose project with unique
PostgreSQL/application volumes and a separate loopback port. It never points at
the production volumes. The drill verifies checksums, performs the normal staged
restore, checks readiness, compares DB/file measurements to the backup manifest,
measures elapsed time against `DR_RTO_SECONDS`, writes evidence JSON, then removes
the disposable containers and volumes.

```bash
sudo AEROEDU_ENV_FILE=/opt/aeroedu/.env.onprem \
  DRILL_PORT=18080 DR_RTO_SECONDS=14400 \
  /opt/aeroedu/scripts/dr-drill.sh \
  /secure/backups/aeroedu-20260809.dump \
  /secure/evidence/dr-2026Q3.json

sha256sum /secure/evidence/dr-2026Q3.json
```

The operator publishes the exact evidence JSON at an access-controlled HTTPS
URL and stores its SHA-256 plus reconciliation details in an external ticket.
The protected governance workflow downloads that file, verifies its expected
SHA-256, self-hash, RPO/RTO, cleanup and reconciliation result before signing an
approval. The default policy rejects releases when the approved drill is older
than 90 days.

## Phase 10: governed immutable releases

`governance/release-policy.json` is the machine-readable contract. It requires:

- immutable SemVer tags and migrations;
- amd64 and arm64 artifacts;
- CycloneDX, SLSA provenance, migration-manifest and AeroEdu release attestations;
- at least two human reviewers on protected release environments;
- RPO 24 hours, RTO 4 hours and a DR drill no older than 90 days.

For every release, CI creates `release-manifest.json` binding the version,
repository, commit, image digest, base/helper images, supported architectures,
SBOM/provenance/migration/policy hashes, trust-key fingerprint and latest DR
evidence. Cosign attests this manifest to the exact OCI digest. Connected deploy
must verify it; air-gap packages include it under the signed outer archive.

The `Approve On-Premise DR Evidence` workflow runs under the separate
`release-governance` environment, validates RTO and ticket metadata, signs the
approval and retains it for 365 days. After approval, a repository administrator
updates protected variables:

- `LAST_DR_APPROVAL_RUN_ID`
- `GOVERNANCE_PUBLIC_KEY_B64` and `GOVERNANCE_PUBLIC_KEY_SHA256`
- `APPROVED_RELEASE_POLICY_SHA256`

The tag workflow downloads that exact artifact, verifies its governance
signature and semantics, and binds its hash into the release attestation. It
fails closed when the approval is absent, stale or mismatched.

## Required repository controls

GitHub settings remain an external control and must be configured manually:

1. Protect the release tag namespace `v*`; prohibit deletion/force-update.
2. `secure-release`: minimum two independent reviewers, no self-approval,
   signing secrets scoped only to this environment.
3. `release-governance`: DR/security approvers distinct from the release author;
   dedicated governance signing key.
4. Restrict workflow changes and `governance/**` with CODEOWNERS/branch rules.
5. Retain release/DR artifacts and export audit heads to an external immutable
   log or SIEM.

## Incident and key rotation

- Never overwrite an existing tag, digest, release manifest or migration.
- A compromised release key blocks all release environments until a new trust
  key fingerprint is distributed out of band.
- A compromised governance key invalidates unanchored DR approvals; rerun the
  approval after rotating the key.
- Emergency patches use a new SemVer patch tag and pass the same DR, scanning,
  attestation and reviewer gates. Bypass is not an emergency procedure.

## Exit gates

Static validation proves policy/schema/script wiring only. Phase 9–10 becomes
production-validated after one real isolated restore drill meets RPO/RTO and
reconciliation, its signed approval is archived, a governed SemVer release is
created, connected deploy verifies the release attestation, and both air-gap
architectures reject stale/tampered governance metadata.
