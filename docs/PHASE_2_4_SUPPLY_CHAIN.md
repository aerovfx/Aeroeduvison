# Phase 2–4 — Protected build, private registry and signed supply chain

## Contract

- Source repository and GHCR package are private.
- Official images are multi-architecture (`linux/amd64`, `linux/arm64`) and are
  deployed only as `image@sha256:digest`.
- Node and PostgreSQL base/helper images are supplied as approved digest-pinned
  repository variables; a mutable tag fails the pipeline.
- Server JavaScript is bundled/minified without source maps. Browser JavaScript
  remains inspectable by design; no secret may be compiled into it.
- Signing happens only after tests, secret scan, candidate image scan and runtime
  filesystem inspection pass.
- Production signing secrets are available only in the protected
  `secure-release` GitHub Environment.

## Trust chain

```text
private commit/tag
  -> test + Prisma schema gate + repository secret scan
  -> amd64 candidate build
  -> CRITICAL vulnerability gate + protected-image inspection
  -> multi-arch build/push to private GHCR
  -> assert GHCR visibility is private
  -> generate CycloneDX SBOM + signed provenance predicate
  -> Cosign sign exact manifest digest
  -> Cosign attest SBOM and provenance to the same digest
```

All GitHub Actions are pinned to full commit SHAs and permissions are scoped per
job. Release tags must match semantic version syntax. The publish/sign job uses
the `secure-release` approval environment.

## Source protection boundary

The runtime image contains the minified server bundle, static browser build,
runtime packages, generated baseline SQL and ordered migrations. It excludes
the backend `lib/` source tree, Prisma source directory, Git metadata, source
maps, TypeScript, test files, environment files and private keys. This is
artifact-only distribution, not cryptographic source encryption and not a
defense against a hostile customer root administrator.

## Registry policy

- Registry: `ghcr.io/<owner>/aeroedu-onprem`.
- CI writer: short-lived repository `GITHUB_TOKEN`, `packages:write` only in the
  release job.
- Customer reader: separate token limited to `read:packages`.
- Pipeline refuses a public source repository and requires the package to be
  pre-provisioned private before any release push.
- Deploy verifies signature plus CycloneDX and SLSA-provenance attestations; the
  signed provenance must name the configured source repository.

## Air-gap note

The current CI bundle is explicitly amd64. It contains the digest-pinned
PostgreSQL helper image, SBOM and provenance. The outer archive is signed as a
blob. `cosign.pub` must be provisioned out of band and is intentionally excluded
from the release artifact. Add a separately tested arm64 bundle before claiming
air-gap arm64 support.
Record the trusted public-key fingerprint through an independent operator
channel and maintain an explicit rotation/revocation procedure.

## Required GitHub configuration

Repository variables:

- `NODE_IMAGE`: `node:22-bookworm-slim@sha256:<approved-multiarch-digest>`
- `POSTGRES_IMAGE`: `postgres:16-bookworm@sha256:<approved-multiarch-digest>`
- `LICENSE_PUBLIC_KEY_B64`
- `COSIGN_PUBLIC_KEY_B64` for operator provisioning, not bundled with artifacts
- deploy environment variables including `EXPECTED_SOURCE_REPOSITORY`

Protected `secure-release` secrets:

- `COSIGN_PRIVATE_KEY`
- `COSIGN_PASSWORD`

## Exit gates

| Gate | Repository evidence | Runtime status |
|---|---|---|
| Server bundle/minify/no source map | build script + Dockerfile | Locally syntax-tested |
| Image filesystem source-leak check | `verify-protected-image.sh` | Requires Docker runner |
| Private GHCR assertion | `assert-ghcr-private.sh` | Requires real GHCR package |
| Candidate scan before promotion | release workflow DAG | Requires CI execution |
| Full-SHA action pins | workflow files | Statically verified |
| Digest-pinned base/helper images | Docker/Compose/workflow validation | Requires approved digests |
| Exact digest signature | Cosign release step | Requires protected secrets |
| Signed SBOM/provenance | Cosign attest steps | Requires registry execution |
| Deploy attestation verification | `deploy-verified.sh` | Requires customer runner test |

Do not mark Phase 2–4 production-complete until a protected semantic tag runs
green, GHCR visibility is observed private, Cosign verification succeeds from a
separate identity, and a deliberately unsigned/unattested image is rejected by
the deployment script.
