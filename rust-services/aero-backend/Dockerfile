# Multi-stage production image for aero-backend (OCR / LLM / vector gateway).
#
# Build context: REPO ROOT (workspace lives there).
#   docker build -f rust-services/aero-backend/Dockerfile -t aeroedu/aero-backend:latest .

FROM rust:1.82-slim-bookworm AS builder
WORKDIR /build

COPY Cargo.toml Cargo.lock* ./
COPY latex-compiler/Cargo.toml latex-compiler/Cargo.toml
COPY rust-services/admin-service/Cargo.toml rust-services/admin-service/Cargo.toml
COPY rust-services/aero-backend/Cargo.toml rust-services/aero-backend/Cargo.toml
COPY rust-services/ai-service/Cargo.toml rust-services/ai-service/Cargo.toml
COPY rust-services/auth-service/Cargo.toml rust-services/auth-service/Cargo.toml
COPY rust-services/camera-iot-service/Cargo.toml rust-services/camera-iot-service/Cargo.toml
COPY rust-services/course-service/Cargo.toml rust-services/course-service/Cargo.toml
COPY rust-services/grading-service/Cargo.toml rust-services/grading-service/Cargo.toml
COPY rust-services/media-service/Cargo.toml rust-services/media-service/Cargo.toml
COPY rust-services/stem-service/Cargo.toml rust-services/stem-service/Cargo.toml
COPY rust-services/student-service/Cargo.toml rust-services/student-service/Cargo.toml
COPY openfang-core/openfang-types/Cargo.toml openfang-core/openfang-types/Cargo.toml
COPY openfang-core/openfang-runtime/Cargo.toml openfang-core/openfang-runtime/Cargo.toml
COPY openfang-core/openfang-kernel/Cargo.toml openfang-core/openfang-kernel/Cargo.toml

RUN set -eux; \
    for d in latex-compiler rust-services/admin-service rust-services/aero-backend \
             rust-services/ai-service rust-services/auth-service \
             rust-services/camera-iot-service rust-services/course-service \
             rust-services/grading-service rust-services/media-service \
             rust-services/stem-service rust-services/student-service \
             openfang-core/openfang-types openfang-core/openfang-runtime \
             openfang-core/openfang-kernel; do \
      mkdir -p "$d/src"; \
      if [ "$d" = "openfang-core/openfang-types" ] || [ "$d" = "openfang-core/openfang-runtime" ] || [ "$d" = "openfang-core/openfang-kernel" ]; then \
        echo "" > "$d/src/lib.rs"; \
      else \
        echo "fn main() {}" > "$d/src/main.rs"; \
      fi; \
    done

RUN cargo build --release -p aero-backend

COPY rust-services/aero-backend/src rust-services/aero-backend/src
RUN touch rust-services/aero-backend/src/main.rs && \
    cargo build --release -p aero-backend

# ---------------------------------------------------------------------------
FROM debian:bookworm-slim AS runtime
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY --from=builder /build/target/release/aero-backend /usr/local/bin/aero-backend
RUN useradd --system --create-home --shell /usr/sbin/nologin aero
USER aero

EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- "http://localhost:8090/health" || exit 1

ENTRYPOINT ["aero-backend"]
