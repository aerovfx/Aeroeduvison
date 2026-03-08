# Phase 3: gRPC & Observability

**Status:** In Progress  
**Started:** 2026-03-07  
**Last Updated:** 2026-03-07

---

## Overview

Phase 3 focuses on improving inter-service communication and adding comprehensive observability to the Rust backend services.

**Key Goals:**
1. Implement gRPC for communication between Rust services
2. Add OpenTelemetry distributed tracing
3. Implement advanced caching strategies
4. Add comprehensive logging and metrics

---

## ✅ Completed

### 3.1 gRPC Service Definition ✅

**Proto file created:** `rust-services/vector-sim-service/proto/vector.proto`

```protobuf
syntax = "proto3";
package vector;

service VectorService {
  rpc CalculateSimilarity(VectorSimilarityRequest) returns (VectorSimilarityResponse);
  rpc ClearCache(ClearCacheRequest) returns (ClearCacheResponse);
  rpc GetHealth(HealthRequest) returns (HealthResponse);
}
```

### 3.2 OpenTelemetry Tracing ✅

**Dependencies added:**
```toml
opentelemetry = "0.21"
opentelemetry_sdk = { version = "0.21", features = ["rt-tokio"] }
opentelemetry-otlp = "0.14"
tracing-opentelemetry = "0.22"
```

**Implementation:**
- `init_tracing()` function initializes OTLP tracing
- Auto-fallback to console logging if OTLP endpoint unavailable
- Configurable via `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable
- Service name: "aero-backend"

**Default endpoint:** `http://localhost:4317`

### 3.3 Redis Caching Layer ✅

**Dependencies added:**
```toml
redis = { version = "0.24", features = ["tokio-comp", "connection-manager"] }
```

**Implementation:**
- Redis client added to AppState (optional)
- Configured via `REDIS_URL` environment variable
- Graceful fallback if Redis unavailable

**Example configuration:**
```bash
REDIS_URL="redis://localhost:6379"
```

### 3.4 Prometheus Metrics ✅

**Dependencies added:**
```toml
metrics = "0.22"
metrics-exporter-prometheus = "0.13"
```

**Metrics available:**
- Request counters
- Response time histograms
- Active connections gauge

---

## 🔲 Remaining Tasks

### 3.5 gRPC Client Integration

**Priority:** High

Add gRPC client to aero-backend to call vector-sim-service.

**Note:** Requires `protoc` installation.

### 3.6 Metrics Exporter

**Priority:** Medium

Add Prometheus metrics exporter endpoint at `/metrics`.

---

## Prerequisites

### OpenTelemetry Collector (Optional)

To receive traces, run an OpenTelemetry collector:

```yaml
# docker-compose.yml
version: '3'
services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    ports:
      - "4317:4317"  # OTLP gRPC
      - "4318:4318"  # OTLP HTTP
      - "8889:8889"  # Prometheus metrics
    volumes:
      - ./otel-collector-config.yaml:/etc/otel/config.yaml
```

### Redis (Optional)

```bash
docker run -d -p 6379:6379 redis:latest
```

### protoc (for gRPC)

To enable full gRPC support, install `protoc`:

### Windows (Chocolatey)
```powershell
choco install protobuf
```

### Windows (Manual)
1. Download from https://github.com/protocolbuffers/protobuf/releases
2. Extract to `C:\protobuf`
3. Add `C:\protobuf\bin` to PATH
4. Set `PROTOC=C:\protobuf\bin\protoc.exe`

### Verify Installation
```bash
protoc --version
```

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aeroedu?schema=public"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# OCR Services
OCR_GRADING_BACKEND_URL="http://127.0.0.1:8012"
OCR_SERVER_URL="http://127.0.0.1:8001"
```

---

## Build Status

```
✅ aero-backend builds successfully
✅ OpenTelemetry tracing integrated
✅ Redis caching layer integrated
✅ Prometheus metrics dependencies added
⚠️  gRPC requires protoc for full functionality
```

---

## Testing

### Test OpenTelemetry Tracing

Start the backend and check logs:
```bash
cd rust-services/aero-backend
cargo run
```

Look for:
```
INFO OpenTelemetry tracing initialized (endpoint: http://localhost:4317)
```

### Test Redis Connection

Set `REDIS_URL` and restart:
```bash
export REDIS_URL="redis://localhost:6379"
cargo run
```

Look for:
```
INFO Redis client initialized
```

---

**Last Updated:** 2026-03-07
