---
name: convert-to-secure-onprem
description: Convert and distribute an existing cloud-oriented web application as secure on-premise software, an Apple App Store/TestFlight client, or a VPS-hosted service. Use when Codex must assess or implement on-prem runtime architecture, containerization, local PostgreSQL/SQLite, offline operation, source protection, private OCI registry delivery, SBOM/provenance, image signing, Ed25519 licenses, connected or air-gap deployment, iOS/macOS signing and App Store submission, VPS deployment, TLS, migrations, backup/restore, rollback, release gates, or an end-to-end multi-target release roadmap.
---

# Convert to Secure On-Prem

Convert incrementally. Preserve the existing cloud deployment unless the user
explicitly requests replacement. Never describe minification or obfuscation as
cryptographic source encryption.

## Start with discovery

1. Read repository instructions and inspect status before edits.
2. Run `scripts/audit_repo.sh <repo>` for a read-only inventory.
3. Identify the frontend, backend entrypoint, database dialect, mutable paths,
   external services, authentication, build system, and current deployment.
4. Read `references/phases.md`. Select only the phases requested by the user.
5. Read `references/security-gates.md` before changing CI, signing, licensing,
   deployment, backup, or restore behavior.
6. Read `references/stack-patterns.md` only for the detected stack.
7. Read `references/app-store-vps.md` when the target includes App Store,
   TestFlight, macOS distribution, a VPS, or a mobile-client/server release.
8. Run `scripts/audit_distribution.sh <repo>` before designing either delivery
   path. Treat its output as inventory, not proof of release readiness.

Do not introduce SQLite through SQL-regex translation when the application uses
PostgreSQL-specific queries. Prefer embedded SQLite only for a deliberately
limited single-node implementation with integration tests; otherwise ship local
PostgreSQL.

## Establish the contract

Before implementation, write a short architecture contract containing:

- connected and/or air-gap distribution mode;
- trust boundaries and hostile-root limitation;
- topology, published ports, persistent data, and outbound-network policy;
- immutable image identity and supported CPU architectures;
- database bootstrap/migration and rollback policy;
- license claims and exact enforcement points;
- backup scope, RPO/RTO, and restore test;
- acceptance gates for the selected phase.
- mobile-to-API compatibility range and server upgrade order when App Store and
  VPS releases coexist;
- App Store bundle identity, signing owner, privacy/IAP declarations and review
  rollback strategy;
- VPS DNS, TLS termination, firewall, backup destination and deploy principal.

Ask for a decision only when registry, target OS/architecture, HA topology, or
licensing policy would materially change the result. Otherwise use the safe
defaults in the references and state the assumption.

## Implement by phase

Follow the ordered phase definitions in `references/phases.md`. At the end of
each selected phase:

1. Run syntax/configuration tests.
2. Exercise the smallest real runtime path available.
3. Record achieved gates and untested gates separately.
4. Do not mark a Docker/deployment gate complete when Docker is unavailable.
5. Preserve unrelated user changes.

Use PostgreSQL advisory locks and checksummed ordered migrations. Store all
mutable state below one configurable data directory. Default host binding to
loopback and require a TLS reverse proxy for LAN/WAN exposure.

## Secure the release chain

Order release operations as follows:

```text
test → build candidate → vulnerability scan → SBOM/provenance
→ promote immutable digest → sign digest → private registry/bundle
→ verify → license check → backup → deploy → readiness → rollback if needed
```

Pin CI actions by full commit SHA. Scope permissions per job. Never expose a
signing key to pull-request jobs. Do not checkout customer-accessible source on
an on-prem self-hosted deploy runner; deploy from a separately delivered,
verified deployment kit.

For air-gap delivery, sign the outer archive as a blob, provision the trust key
out of band, validate archive paths before extraction, verify every checksum,
and include every helper image by approved digest.

For App Store and VPS delivery, build both artifacts from the same protected
release tag and record them in one release manifest. Never couple their rollout:
deploy backward-compatible server changes first, validate production, then
submit the mobile build. Keep at least the previous API behavior until the
minimum supported client version has advanced.

## Route to App Store or VPS

Follow `references/app-store-vps.md` for target-specific gates.

- For App Store/TestFlight, keep server secrets and license private keys out of
  the app, archive on a controlled macOS runner, sign with the correct team and
  bundle ID, validate privacy manifests/usage strings and IAP metadata, then
  upload only after an exported archive passes smoke tests.
- For a VPS, deploy an immutable image digest through a non-root deploy account,
  expose only SSH and TLS, keep PostgreSQL private, validate backups before
  mutation, and automatically return to the previous digest when readiness or
  smoke tests fail.
- Do not put a customer database inside an App Store binary. Treat the Apple app
  as a signed client of the VPS/on-prem API unless a deliberately scoped local
  offline store is part of the product contract.

## Implement licensing honestly

Use an asymmetric signature such as Ed25519. Keep the private key outside the
image and customer bundle. Bind production licenses to customer, installation,
expiry, features, seat count, issuer/key ID, and exact image digest. Enforce
features at routes/services and seats at account creation, not merely in health
output. Recheck expiry during runtime.

Offline clock rollback protection is only best-effort. Document that a hostile
root administrator can patch binaries, state, or the clock; use online leases or
hardware-backed attestation only when the business requirement justifies it.

## Validate independently

For release or security-sensitive changes, use two independent reviews when
subagents are available:

1. Supply-chain reviewer: CI permissions, action pinning, registry, signing,
   SBOM/provenance, image/bundle integrity, secret exposure.
2. Runtime reviewer: license bypasses, migrations, offline egress, backup,
   restore, deployment rollback, and container hardening.

Give reviewers raw artifacts and no prior conclusions. Fix confirmed P0/P1
issues before calling the conversion production-ready.

## Hand off

Lead with the achieved outcome. Link the architecture contract, runtime files,
deployment scripts, and runbook. State exactly which gates were executed and
which require the target infrastructure. Never equate “configuration complete”
with “production validated.”
