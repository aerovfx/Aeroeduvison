# CI/CD contract for on-premise distribution

## Objective

Distribute AeroEduVision without shipping the Git repository. Every release is
an immutable OCI image identified by digest, scanned, accompanied by an SPDX
SBOM, signed, and optionally exported as an air-gap bundle. Runtime starts only
with a valid Ed25519-signed customer license.

## Trust boundaries

1. GitHub is the source/build control plane; protected tags `v*` trigger release.
2. GHCR is the private online registry. CI writes with `GITHUB_TOKEN`; customer
   deploy tokens are read-only and never enter the image.
3. Cosign signs the exact image digest using GitHub OIDC keyless identity.
4. The license issuer private key is an offline/CI secret. Only its public key is
   embedded in the runtime image.
5. The customer host verifies checksum, image signature and license before
   starting Docker Compose.

## Source protection

The browser bundle is inherently downloadable. Server JavaScript is bundled and
minified without source maps, and the release contains images/artifacts only.
This raises reverse-engineering cost but is not cryptographic secrecy. Secrets
and proprietary credentials must never be compiled into frontend or server code.

## Release gates

- syntax/unit tests and Prisma schema generation;
- container build for amd64/arm64;
- Trivy gate: no unfixed CRITICAL vulnerability;
- SPDX SBOM and BuildKit provenance;
- digest-based Cosign signature;
- immutable release manifest and SHA-256 checksums;
- independent security review before promotion.

## Database upgrades

Initial schema SQL is generated from Prisma during image build. Every later
schema change must be an immutable ordered file under `onprem-migrations/`.
Startup serializes migration execution with a PostgreSQL advisory lock, records
SHA-256 checksums, and refuses to start if an applied migration was modified.

## License format

`license.json` contains `{ payload, signature }`. `payload` includes schema,
license/customer IDs, installation ID, issued/expiry timestamps, feature list,
seat limit and optional image digest. The signature is Ed25519 over canonical
JSON. Runtime rejects invalid, expired, not-yet-valid, wrong-installation, or
wrong-image licenses.
