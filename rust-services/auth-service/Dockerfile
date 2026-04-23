# ============================================================
# Dockerfile — Rust auth-service (multi-stage)
# Stage 1: Build binary with cargo (uses cache layer trick)
# Stage 2: Minimal debian:bookworm-slim runtime (~30MB)
# ============================================================

# ── Stage 1: Builder ────────────────────────────────────────
FROM rust:1.88-slim AS builder

WORKDIR /app

# Install required build deps (OpenSSL, pkg-config for reqwest rustls)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# sqlx offline mode: skip compile-time DB queries
# (query! macros replaced with query_as / query at runtime)
ENV SQLX_OFFLINE=true

# ── Cache dependency layer ───────────────────────────────────
# Copy only manifests first — if src/ changes, deps layer is reused
COPY Cargo.toml Cargo.lock ./

# Dummy main to compile deps without source
RUN mkdir -p src && echo 'fn main() { println!("deps"); }' > src/main.rs
RUN cargo build --release 2>&1 || true

# Remove dummy artifacts so real build picks them up
RUN rm -f target/release/auth-service target/release/deps/auth_service*

# ── Build real source ────────────────────────────────────────
COPY src ./src
RUN cargo build --release

# ── Stage 2: Minimal runtime ────────────────────────────────
FROM debian:bookworm-slim AS runtime

# CA certs needed for HTTPS calls (Google tokeninfo, Prisma Accelerate)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled binary
COPY --from=builder /app/target/release/auth-service /usr/local/bin/auth-service

# Non-root user
RUN groupadd --system --gid 1001 appuser && \
    useradd --system --uid 1001 --gid appuser appuser
USER appuser

EXPOSE 8080
# Cloud Run sets PORT automatically — main.rs reads it directly

CMD ["/usr/local/bin/auth-service"]
