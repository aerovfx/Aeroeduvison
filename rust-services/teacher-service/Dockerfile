# ============================================================
# Dockerfile — Rust teacher-service (multi-stage)
# Handles: /api/teacher/*
# ============================================================

FROM rust:1.88-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

ENV SQLX_OFFLINE=true

# Cache dependency layer
COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src && echo 'fn main() { println!("deps"); }' > src/main.rs
RUN cargo build --release 2>&1 || true
RUN rm -f target/release/teacher-service target/release/deps/teacher_service*

# Build real source
COPY src ./src
RUN cargo build --release

# ── Runtime ─────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/teacher-service /usr/local/bin/teacher-service
RUN groupadd --system --gid 1001 appuser && \
    useradd --system --uid 1001 --gid appuser appuser
USER appuser
EXPOSE 8080
CMD ["/usr/local/bin/teacher-service"]
