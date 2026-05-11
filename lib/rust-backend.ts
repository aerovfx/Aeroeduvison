/**
 * Strangler-pattern routing helpers for Next.js → Rust backend services.
 *
 * Two services currently own OCR/LLM/vector routes:
 *   - aero-backend (port 8090): legacy owner, has working handlers
 *   - grading-service (port 8100): planned new owner (parity in progress)
 *
 * Flip USE_GRADING_SERVICE_FOR_OCR=true to route Node API calls to
 * grading-service instead of aero-backend, with no other code changes.
 */

const USE_GRADING_SERVICE_FOR_OCR =
  process.env.USE_GRADING_SERVICE_FOR_OCR === "true";

const AERO_BACKEND_URL =
  process.env.RUST_BACKEND_URL || "http://127.0.0.1:8090";

const GRADING_SERVICE_URL =
  process.env.GRADING_SERVICE_URL || "http://127.0.0.1:8100";

/** URL for OCR / LLM-grading routes (backwards-compat with RUST_BACKEND_URL). */
export const OCR_LLM_BACKEND_URL = USE_GRADING_SERVICE_FOR_OCR
  ? GRADING_SERVICE_URL
  : AERO_BACKEND_URL;

/** URL for vector-similarity route (always aero-backend after vector-sim merge). */
export const VECTOR_BACKEND_URL =
  process.env.RUST_VECTOR_SERVICE_URL || AERO_BACKEND_URL;
