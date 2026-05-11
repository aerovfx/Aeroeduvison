# Multi-stage production image for the Overleaf-style LaTeX compile service.
#
# Stage 1: build the Rust binary from the workspace root, targeting only this crate.
# Stage 2: a slim Debian image with TeX Live + firejail for sandboxed xelatex
#          runs, plus tectonic as fallback.
#
# Build context: REPO ROOT (one level above this Dockerfile).
#   docker build -f latex-compiler/Dockerfile -t aeroedu/latex-compiler:latest .

FROM rust:1.82-slim-bookworm AS builder
WORKDIR /build

# Cache deps: copy manifests first
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

# Stub out sources so cargo can resolve & download deps without compiling business logic
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

# Fetch & build deps only
RUN cargo build --release -p latex-compiler

# Now copy real sources & build the binary
COPY latex-compiler/src latex-compiler/src
COPY rust-services rust-services
COPY openfang-core openfang-core
RUN touch latex-compiler/src/main.rs && \
    cargo build --release -p latex-compiler

# ---------------------------------------------------------------------------
FROM debian:bookworm-slim AS runtime
ENV DEBIAN_FRONTEND=noninteractive \
    BIND_HOST=0.0.0.0 \
    BIND_PORT=8080 \
    RUST_LOG=latex_compiler=info,warn

# TeX Live: xelatex (latex-xetex) + common LaTeX packages.
# Tectonic as fallback engine. Firejail for sandboxed compile on Linux.
# ca-certificates so reqwest/redis-tls can verify upstream.
RUN apt-get update && apt-get install -y --no-install-recommends \
      texlive-xetex \
      texlive-latex-extra \
      texlive-fonts-recommended \
      texlive-lang-other \
      tectonic \
      firejail \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY --from=builder /build/target/release/latex-compiler /usr/local/bin/latex-compiler

# Non-root user for the service
RUN useradd --system --create-home --shell /usr/sbin/nologin latex
USER latex

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:${BIND_PORT}/health" || exit 1

ENTRYPOINT ["latex-compiler"]
