# Conversion phases

## Phase 0 — Architecture and threat model

- Inventory runtime, data, identity, external services and deployment.
- Choose connected, air-gap, or both.
- Define hostile-root limitation, support boundary and acceptance matrix.

Exit: written topology, trust boundaries, persistence, egress and rollback
contract.

## Phase 1 — On-prem runtime

- Create a multi-stage, non-root application image.
- Add local PostgreSQL for PostgreSQL-dependent systems; never expose its port.
- Mount durable database and application-data volumes.
- Add live/readiness probes, configuration validation and offline fail-fast.
- Add ordered checksummed migrations under an advisory lock.
- Add database plus file backup and a tested restore path.

Exit: clean-host build/boot, restart persistence, offline core test and complete
backup/restore drill.

## Phase 2 — Source protection

- Build browser assets without source maps or secrets.
- Bundle/minify server code and exclude source tree, Git metadata and tests from
  the runtime image.
- Use compiled native/WASM or a commercial protector only when stronger IP
  resistance is explicitly required.

Exit: image filesystem inspection and secret scan pass.

## Phase 3 — Private registry

- Push immutable OCI images to GHCR, Harbor, Nexus or Artifactory.
- Use write credentials only in CI and read-only credentials at customer sites.
- Deploy by `image@sha256:digest`, never by `latest`.

Exit: registry privacy/access test and pull-by-digest test pass.

## Phase 4 — Supply-chain security

- Pin CI actions and base/helper images by digest or immutable SHA.
- Test and scan the candidate before promotion.
- Produce SPDX/CycloneDX SBOM and provenance.
- Sign the exact promoted digest with Cosign/KMS/HSM.
- Protect release jobs with reviewers and scoped secrets.

Exit: unsigned, vulnerable or unattested artifacts cannot be promoted.

## Phase 5 — Licensing

- Sign canonical license payloads with Ed25519.
- Include customer, installation, validity, features, seats, issuer/key ID and
  exact image digest.
- Enforce claims at startup, periodically, and at feature/seat boundaries.
- Define rotation, revocation and renewal policy.

Exit: tamper, expiry, wrong-host, wrong-image, feature and seat tests pass.

## Phase 6 — Connected deployment

- Verify signature/attestation/license before pull or activation.
- Backup, deploy, wait for readiness, smoke-test and automatically restore the
  previous digest/configuration on failure.
- Keep customer deploy runners source-free.

Exit: intentional bad release triggers rollback without data loss.

## Phase 7 — Air-gap distribution

- Produce one signed bundle per supported architecture.
- Include application and helper images, manifests, SBOM, provenance, checksums,
  deploy kit and runbook.
- Sign the outer archive and distribute the trust anchor separately.

Exit: installation succeeds with egress disabled and tampered archives fail
before extraction.

## Phase 8 — Operations and governance

- Define RPO/RTO, monitoring, log retention and restore drills.
- Track customer installation/version/digest and license lifecycle.
- Protect semantic release tags and document emergency patch/key rotation.

Exit: auditable release and disaster-recovery exercise completed.

## Phase 9 — Disaster-recovery evidence

- Create consistent database plus application-data recovery sets with a
  checksummed reconciliation manifest.
- Restore only into a unique disposable project/volume set during drills.
- Measure RPO/RTO and reconcile representative database and file counts.
- Export machine-readable evidence and anchor its digest in an external ticket.

Exit: an isolated destructive restore drill meets RPO/RTO and produces reviewed
evidence without touching production volumes.

## Phase 10 — Release governance

- Maintain a machine-readable immutable release policy.
- Bind source commit, image digest, base images, SBOM, provenance, migrations,
  trust-key fingerprint and current DR evidence in a signed release manifest.
- Separate release and DR-governance keys/environments/reviewers.
- Reject releases with stale DR evidence or missing governance attestations.

Exit: a protected SemVer release produces an auditable signed manifest and both
connected/air-gap deployment paths reject stale or mismatched governance data.

## Phase 11 — App Store distribution

- Establish bundle/team/version, privacy, entitlement and StoreKit contracts.
- Build, archive, sign and validate on a controlled macOS/Xcode runner.
- Test through TestFlight before a phased App Store release.
- Preserve API compatibility with the currently published client.

Exit: the candidate passes archive validation, physical-device smoke tests,
TestFlight acceptance and all App Store metadata/privacy/IAP gates.

## Phase 12 — VPS distribution

- Provision a hardened host, private database network and TLS reverse proxy.
- Pull and verify an immutable signed image digest.
- Back up, migrate, deploy, verify and automatically roll back on failure.
- Monitor service, host, TLS, database and backup health.

Exit: external HTTPS smoke test, firewall scan, backup/restore and rollback drill
pass with recorded evidence.
