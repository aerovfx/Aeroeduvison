# Phase 7–8 — Connected, air-gap and operations

## Deployment contract

- Supported host: single-node Linux Docker Engine/Compose, `amd64` or `arm64`.
- Connected releases use a private registry and exact `image@sha256:digest`.
  Only `scripts/deploy-verified.sh` may create the matching local verification
  receipt required by `onprem.sh` in registry mode.
- Air-gap releases are separate signed archives per architecture. The Cosign
  public key and its approved fingerprint travel through an independent channel.
- Application binds loopback by default. PostgreSQL has no host port. TLS,
  firewall, OS/Docker patching and trust-key custody belong to the operator.
- Host root/Docker administrators remain outside the tamper-resistance boundary.

## Connected flow

`verify signature/attestations → verify license → pull digest → backup DB+files →
write receipt → deploy → verify running image ID → local readiness → public
synthetic probe → append audit event`.

The deployment runner is source-free and uses the preinstalled deployment kit.
Failure restores the previous environment and receipt. Schema changes must be
expand-compatible during the image rollback window.

## Air-gap flow

CI produces `aeroedu-onprem-VERSION-amd64` and `arm64` archives. Each contains
the application and PostgreSQL image, architecture/image-ID manifests,
CycloneDX SBOM, provenance, checksums, Compose, CLI and runbook. CI signs the
outer archive. Installation verifies the external trust key signature before
extraction, rejects unsafe entries, verifies every checksum, checks host
architecture and both loaded image IDs, then records an audit event.

Use only:

```bash
export COSIGN_PUBLIC_KEY_SHA256="sha256:APPROVED_OUT_OF_BAND_FINGERPRINT"
export GOVERNANCE_PUBLIC_KEY_FILE=/secure/governance.pub
export GOVERNANCE_PUBLIC_KEY_SHA256="sha256:APPROVED_GOVERNANCE_FINGERPRINT"
export APPROVED_RELEASE_POLICY_SHA256="sha256:APPROVED_POLICY_HASH"
openssl dgst -sha256 /secure/cosign.pub
./scripts/install-airgap.sh archive.tar.gz archive.bundle /secure/cosign.pub /opt/aeroedu
```

Do not manually extract or `docker load` an unverified archive.

## Operations baseline

- Proposed RPO: 24 hours. Proposed RTO: 4 hours. Business owners must approve
  tighter values before production sizing.
- Compose rotates container logs at 20 MB × 5 files per container. Forward logs
  to the customer SIEM for longer retention.
- `scripts/scheduled-backup.sh` creates and verifies DB+application-data backup
  sets. The included root systemd timer runs daily at 02:00 with jitter; Docker
  administration is root-equivalent, so restrict changes to these unit/scripts.
- Backup retention, encryption and off-host replication belong to the operator;
  recommended baseline is 7 daily, 4 weekly and 12 monthly encrypted copies.
- Run a quarterly restore drill on an isolated host. Reconcile database users,
  representative records, uploaded files, migration ledger and readiness, then
  record actual RPO/RTO and the audit-log head in the change ticket.

Useful commands:

```bash
./onprem.sh inventory
./onprem.sh audit
./onprem.sh backup /secure/backup/aeroedu.dump
./onprem.sh verify-backup /secure/backup/aeroedu.dump
AEROEDU_CONFIRM_RESTORE=yes ./onprem.sh restore /secure/backup/aeroedu.dump
```

The JSONL operations log is SHA-256 hash-chained to detect accidental edits.
It is not tamper-proof against hostile root; export its head and copies to the
customer SIEM/change system.

## Emergency controls

- Compromised release key: disable the release environment, revoke registry
  write credentials, distribute a new trust anchor out of band and rebuild from
  an approved source commit.
- Compromised license key: add the key ID to revocation, rotate the trusted key
  ring, reissue licenses and publish the change through connected or signed
  air-gap media.
- Emergency patch: use a new immutable SemVer patch tag; never overwrite an
  existing tag/digest or bypass scan/sign/reviewer gates.

## Exit gates

Static gates can prove archive structure, action pinning, script/YAML syntax and
policy wiring. Production validation additionally requires connected rollback,
both-architecture air-gap install with egress blocked, tampered-archive negative
test, scheduled backup observation and a destructive isolated restore drill.
