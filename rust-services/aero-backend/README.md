# aero-backend (Rust)

Rust scaffold backend cho migration Node -> Rust.

## Trang thai
- Batch-1 migrated:
  - `POST/DELETE /api/vector-similarity`
  - `POST/GET /api/ocr-grading`
- Cac route API con lai: scaffold placeholder (`501 Not Implemented`) co inventory metadata.

## Chay local
```bash
cd /Users/pixibox/Aeroeduvison/rust-services/aero-backend
cargo run
```

Mac dinh listen: `127.0.0.1:8090`

## Env
- `AERO_BACKEND_ADDR` (default `127.0.0.1:8090`)
- `OCR_GRADING_BACKEND_URL` (default `http://127.0.0.1:8012`)

## Health
```bash
curl http://127.0.0.1:8090/health
```
