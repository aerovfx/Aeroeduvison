# Strangler Pattern: Node -> Rust

Muc tieu: giu backend Node hien tai, tach dan endpoint nang sang Rust theo tung buoc an toan.

## Inventory + Matrix (toan bo API)
Da tao inventory/migration matrix tu dong cho tat ca `app/api/**/route.ts`:
- `docs/rust-migration/api-inventory.json`
- `docs/rust-migration/migration-matrix.csv`
- `docs/rust-migration/migration-matrix.md`

Regenerate:
```bash
cd /Users/pixibox/Aeroeduvison
bun run rust:migration:inventory
```

## 1) Giu Node backend (hien tai)
- Tat ca API van chay tren Next.js route handlers.
- Endpoint duoc chon cho lan dau: `POST /api/vector-similarity`.

## 2) Viet Rust service moi
Duong dan service:
- `rust-services/vector-sim-service`
- `rust-services/aero-backend` (scaffold all APIs + migrate batch-1, batch-2)

Chay local:
```bash
cd /Users/pixibox/Aeroeduvison/rust-services/vector-sim-service
cargo run
```

Health check:
```bash
curl http://127.0.0.1:8091/health
curl http://127.0.0.1:8090/health
```

## 3) Route API nang sang Rust (co dieu kien)
Node route `app/api/vector-similarity/route.ts` ho tro 3 che do:
- `target=node`: buoc xu ly thuần Node (legacy).
- `target=rust`: Node proxy sang Rust service.
- mac dinh theo env `USE_RUST_VECTOR_SERVICE=true`.

Node route `app/api/ocr-grading/route.ts` ho tro tuong tu:
- `target=node` / `target=rust`
- env `USE_RUST_OCR_GRADING_SERVICE=true`

Node route `app/api/ocr/auto-grade/route.ts`:
- `target=node` / `target=rust`
- env `USE_RUST_OCR_AUTO_GRADE_SERVICE=true`

Node route `app/api/ocr-process/route.ts`:
- `target=node` / `target=rust`
- env `USE_RUST_OCR_PROCESS_SERVICE=true`

Node route `app/api/ocr/upload/route.ts`:
- `target=node` / `target=rust`
- env `USE_RUST_OCR_UPLOAD_SERVICE=true`

Node route `app/api/llm-grading/route.ts`:
- `target=node` / `target=rust`
- env `USE_RUST_LLM_GRADING_SERVICE=true`

Node route `app/api/assignments/grade-ocr/route.ts`:
- `target=node` / `target=rust`
- env `USE_RUST_ASSIGNMENTS_GRADE_OCR_SERVICE=true`

### Direct proxy (bo hop Node route)
Neu muon route thang tu Next proxy sang Rust service, bat:
```bash
DIRECT_RUST_VECTOR_PROXY=true
DIRECT_RUST_OCR_GRADING_PROXY=true
DIRECT_RUST_OCR_PROCESS_PROXY=true
```

Khi bat co nay, `next.config.js` rewrite:
- `/api/vector-similarity` -> `${RUST_VECTOR_SERVICE_URL}/v1/vector-similarity`
- `/api/vector-similarity/cache` -> `${RUST_VECTOR_SERVICE_URL}/v1/vector-similarity/cache`
- `/api/ocr-grading` -> `${RUST_BACKEND_URL}/api/ocr-grading`
- `/api/ocr-process` -> `${RUST_BACKEND_URL}/api/ocr-process`

`/api/ocr/auto-grade` va `/api/ocr/upload` giu qua Node route switch de bao toan auth check (khong rewrite truc tiep).

### Canary rollout (10% -> 25% -> 50% -> 100%)
Canary duoc xu ly o middleware cho:
- `/api/vector-similarity`
- `/api/vector-similarity/cache`
- `/api/ocr-grading`
- `/api/ocr-process`
- `/api/llm-grading` (co che scoped rieng)

Va sticky bang cookie bucket.

Env:
```bash
ENABLE_RUST_CANARY_PROXY=true
RUST_CANARY_PERCENT=10
RUST_CANARY_COOKIE_NAME=rust_canary_bucket
```

Canary rieng cho `llm-grading`:
```bash
ENABLE_RUST_CANARY_LLM_GRADING_PROXY=true
RUST_CANARY_LLM_GRADING_PERCENT=10
RUST_CANARY_LLM_GRADING_COOKIE_NAME=rust_canary_llm_bucket
```

Tang dan:
1. `RUST_CANARY_PERCENT=10`
2. `RUST_CANARY_PERCENT=25`
3. `RUST_CANARY_PERCENT=50`
4. `RUST_CANARY_PERCENT=100`

Override test:
- Header: `x-strangler-target: rust|node`
- Query: `?target=rust|node`

Response headers de quan sat:
- `x-strangler-target: rust|node`
- `x-strangler-bucket: 0..99`
- `x-strangler-percent: % hien tai`
- `x-strangler-rust-healthy: true|false`

### Auto rollout governor
Bat auto tang canary theo buoc:
```bash
ENABLE_RUST_CANARY_AUTO_ROLLOUT=true
RUST_CANARY_STEPS=10,25,50,100
RUST_CANARY_MIN_REQUESTS_PER_STEP=200
RUST_CANARY_MIN_STEP_MINUTES=10
RUST_CANARY_HEALTHCHECK_INTERVAL_MS=5000
RUST_DISABLE_ON_UNHEALTHY=true
```

Auto rollout rieng cho `llm-grading`:
```bash
ENABLE_RUST_CANARY_LLM_GRADING_AUTO_ROLLOUT=true
RUST_CANARY_LLM_GRADING_STEPS=10,25,50,100
RUST_CANARY_LLM_GRADING_MIN_REQUESTS_PER_STEP=200
RUST_CANARY_LLM_GRADING_MIN_STEP_MINUTES=10
RUST_CANARY_LLM_GRADING_HEALTHCHECK_INTERVAL_MS=5000
RUST_DISABLE_LLM_GRADING_ON_UNHEALTHY=true
```

Dieu kien tang buoc:
1. Du request trong window (`RUST_CANARY_MIN_REQUESTS_PER_STEP`)
2. Da qua thoi gian toi thieu cua buoc
3. Khong co health failure cua Rust trong window

Telemetry server logs (middleware):
```text
[STRANGLER] step=10% windowReq=... rust=... node=... rustHealthy=true healthFailures=0
[STRANGLER] Auto-promoted Rust canary to 25%
```

Env:
```bash
USE_RUST_VECTOR_SERVICE=true
RUST_VECTOR_SERVICE_URL=http://127.0.0.1:8091
```

## 4) Test performance
Script benchmark:
```bash
cd /Users/pixibox/Aeroeduvison
bun run bench:strangler:vector
```

Script se so sanh:
- Node thuần
- Rust qua strangler route
- Rust direct

Benchmark concurrent (p50/p95/p99) de danh gia production-like:
```bash
cd /Users/pixibox/Aeroeduvison
APP_BASE_URL=http://127.0.0.1:3100 \
RUST_VECTOR_SERVICE_URL=http://127.0.0.1:8091 \
BENCH_DURATION_SEC=15 \
BENCH_CONNECTIONS=40 \
bun run bench:strangler:prod
```

## 5) Chuyen dan sang Rust backend
Lo trinh de xuat:
1. Bat Rust cho 10% traffic (header/query based).
2. Theo doi latency + error rate.
3. Tang 25% -> 50% -> 100%.
4. Chot endpoint Rust lam duong mac dinh.
5. Giu fallback Node 1-2 release, sau do remove.

## Commands nhanh
```bash
# chay Rust service
bun run rust:vector
bun run rust:backend

# chay app web
bun run dev -H 127.0.0.1 -p 3100

# bat strangler mode
USE_RUST_VECTOR_SERVICE=true bun run dev -H 127.0.0.1 -p 3100

# direct proxy mode (bo hop Node route)
DIRECT_RUST_VECTOR_PROXY=true USE_RUST_VECTOR_SERVICE=true bun run dev -H 127.0.0.1 -p 3100

# production benchmark
bun run bench:strangler:prod
```
