# AeroeduVision

AeroeduVision is a Next.js education platform with a Strangler migration path from Node route handlers to Rust services, plus desktop wrappers built with Bun + Electron.

## Current Architecture

### Web App (primary runtime)
- Framework: Next.js App Router (`app/**`)
- Runtime: Node.js/Bun for dev scripts
- Auth: `next-auth`
- DB: PostgreSQL + Prisma

### Strangler Services (Rust)
All Rust services live in a single Cargo workspace at the repo root. See `rust-services/README.md` for the full port map and `docs/STRANGLER_PATTERN_RUST.md` for migration status.

- `rust-services/aero-backend` (port `8090`) — compute-heavy bridge
  - `POST/DELETE /api/vector-similarity` (was `vector-sim-service`, merged)
  - `POST/GET /api/ocr-grading`
  - `POST /api/ocr/auto-grade`
  - `POST /api/ocr/upload`
  - `POST /api/ocr-process`
  - `POST /api/llm-grading`
  - `POST /api/assignments/grade-ocr`
  - scaffold fallback for unmigrated APIs
- `latex-compiler` (port `8080`) — Overleaf-style LaTeX → PDF (set `LATEX_SERVICE_URL`)

### Desktop
- `desktop-current-app`: Electron wrapper for current web app
- `desktop-bun-electron`: standalone Bun + Electron + React desktop app

## Repository Map

- `app/`: Next.js routes/pages/components
- `rust-services/`: Rust microservices for Strangler migration
- `desktop-current-app/`: desktop wrapper for existing app
- `desktop-bun-electron/`: standalone desktop client
- `docs/rust-migration/`: API inventory + migration matrix
- `scripts/rust-migration/generate-inventory.ts`: regenerate matrix/inventory

## Quick Start (Web)

1. Install dependencies:
```bash
cd /Users/pixibox/Aeroeduvison
bun install
```

2. Configure env:
```bash
cp .env.local.example .env.local
```

3. Start web app:
```bash
bun run dev -H 127.0.0.1 -p 3100
```

## Run Rust Services

Terminal A:
```bash
cd /Users/pixibox/Aeroeduvison
bun run rust:vector
```

Terminal B:
```bash
cd /Users/pixibox/Aeroeduvison
bun run rust:backend
```

Health checks:
```bash
curl http://127.0.0.1:8091/health
curl http://127.0.0.1:8090/health
```

## Strangler Controls

### Route-level switches (Node handler -> Rust upstream)
Enable with `.env.local` flags:
- `USE_RUST_VECTOR_SERVICE=true`
- `USE_RUST_OCR_GRADING_SERVICE=true`
- `USE_RUST_OCR_PROCESS_SERVICE=true`
- `USE_RUST_OCR_AUTO_GRADE_SERVICE=true`
- `USE_RUST_OCR_UPLOAD_SERVICE=true`
- `USE_RUST_LLM_GRADING_SERVICE=true`
- `USE_RUST_ASSIGNMENTS_GRADE_OCR_SERVICE=true`

Per-request override:
- query: `?target=node|rust`
- header: `x-strangler-target: node|rust`

### Direct proxy rewrites
- `DIRECT_RUST_VECTOR_PROXY=true`
- `DIRECT_RUST_OCR_GRADING_PROXY=true`
- `DIRECT_RUST_OCR_PROCESS_PROXY=true`
- `DIRECT_RUST_LLM_GRADING_PROXY=true`

### Canary rollout
Global canary (vector/ocr routes):
- `ENABLE_RUST_CANARY_PROXY=true`
- `RUST_CANARY_PERCENT=10`

Scoped canary for `llm-grading`:
- `ENABLE_RUST_CANARY_LLM_GRADING_PROXY=true`
- `RUST_CANARY_LLM_GRADING_PERCENT=10`
- supports 10 -> 25 -> 50 -> 100 and auto-rollout envs in `.env.local.example`

## Desktop Build

### desktop-current-app
```bash
cd /Users/pixibox/Aeroeduvison/desktop-current-app
bun run clean
bun run build:electron
```

### desktop-bun-electron
```bash
cd /Users/pixibox/Aeroeduvison/desktop-bun-electron
bun run build
```

## Migration Matrix

Regenerate API inventory and migration status:
```bash
cd /Users/pixibox/Aeroeduvison
bun run rust:migration:inventory
```

Artifacts:
- `docs/rust-migration/api-inventory.json`
- `docs/rust-migration/migration-matrix.csv`
- `docs/rust-migration/migration-matrix.md`

## Notes

- Build artifacts are intentionally ignored (`**/node_modules`, `**/target`, `**/dist`, `**/dist-electron`, `.contentlayer/generated`, `*.tsbuildinfo`).
- If push fails with large files, check commit contents before pushing:
```bash
git show --stat --name-only HEAD
```
