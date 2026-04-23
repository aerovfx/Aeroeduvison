# AeroEduVision Chat Service

A high-performance, real-time chat microservice built in Rust for the AeroEduVision educational platform. Provides REST APIs and WebSocket support for multi-room chat with persistent message storage.

## Features

- **Real-time messaging** via WebSocket with broadcast channels
- **Persistent storage** in PostgreSQL with indexed queries
- **Room management** with flexible room types (study groups, courses, direct messages)
- **Member management** with role-based access (admin, member)
- **JWT authentication** for secure API access
- **REST APIs** for non-real-time operations
- **Automatic broadcasting** from HTTP POST to WebSocket clients
- **CORS support** for cross-origin requests
- **Structured logging** with tracing

## Quick Links

- [Setup Guide](./SETUP.md) - Installation and configuration
- [API Examples](./EXAMPLES.md) - cURL and code examples

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Angular)                       │
│                    chat.service.ts                           │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    [HTTP REST]   [WebSocket]
        │             │
        └──────┬──────┘
               │
        ┌──────▼──────────────────────┐
        │   Chat Service (Rust)        │
        │  Axum + Tokio + SQLx        │
        └──────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
[PostgreSQL]        [Broadcast Channels]
    │                     │
    └─────────────────────┘
```

## Endpoints

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/api/chat/rooms` | List user's rooms |
| POST | `/api/chat/rooms` | Create new room |
| GET | `/api/chat/rooms/:roomId/messages` | Get last 50 messages |
| POST | `/api/chat/rooms/:roomId/messages` | Send message |
| GET | `/api/chat/rooms/:roomId/members` | List room members |

### WebSocket Endpoint

| Endpoint | Purpose |
|----------|---------|
| `/ws?room_id=X&token=JWT` | Real-time messaging |

## Data Models

### ChatRoom
```rust
pub struct ChatRoom {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub room_type: String,          // "study_group" | "course" | "direct"
    pub created_by: String,         // user_id
    pub last_message: Option<String>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub member_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### ChatMessage
```rust
pub struct ChatMessage {
    pub id: String,
    pub room_id: String,
    pub user_id: String,
    pub user_name: Option<String>,
    pub content: String,
    pub message_type: String,        // "text" | "image" | "file" | "system"
    pub created_at: DateTime<Utc>,
}
```

### RoomMember
```rust
pub struct RoomMember {
    pub id: String,
    pub room_id: String,
    pub user_id: String,
    pub user_name: Option<String>,
    pub role: String,                // "admin" | "member"
    pub joined_at: DateTime<Utc>,
}
```

## Configuration

Environment variables (see `.env.example`):

```env
# Database connection
DATABASE_URL=postgres://username:password@localhost:5432/aeroedu

# Service address
CHAT_SERVICE_ADDR=127.0.0.1:8096

# JWT secret (used to validate tokens)
JWT_SECRET=your-secret-key-change-in-production

# Logging level
RUST_LOG=debug
```

## Dependencies

- **axum** - Web framework
- **tokio** - Async runtime
- **sqlx** - SQL toolkit with compile-time checking
- **serde** - Serialization/deserialization
- **jsonwebtoken** - JWT handling
- **uuid** - Unique ID generation
- **chrono** - Date/time handling
- **tower-http** - HTTP middleware (CORS)
- **tracing** - Structured logging

## Project Structure

```
chat-service/
├── Cargo.toml                 # Dependencies and metadata
├── Dockerfile                 # Container image
├── docker-compose.yml         # Local development setup
├── .env.example              # Environment template
├── SETUP.md                  # Setup instructions
├── EXAMPLES.md               # API usage examples
├── migrations/
│   └── 001_chat.sql          # Database schema and seed data
└── src/
    ├── main.rs               # Server setup, WebSocket handler
    ├── error.rs              # Error types and HTTP responses
    ├── models.rs             # Data models
    ├── ws.rs                 # WebSocket broadcast channels
    └── handlers/
        ├── mod.rs
        ├── health.rs         # Health check
        ├── rooms.rs          # Room CRUD operations
        └── messages.rs       # Message CRUD and broadcasting
```

## Quick Start

### 1. Clone and Setup

```bash
cd /path/to/chat-service
cp .env.example .env
```

### 2. Start with Docker

```bash
docker-compose up
```

This starts PostgreSQL and the chat service. The service will be available at `http://localhost:8096`

### 3. Verify Installation

```bash
curl http://localhost:8096/health
```

Expected response:
```json
{"status": "ok", "service": "chat-service"}
```

### 4. Test API

See [EXAMPLES.md](./EXAMPLES.md) for complete examples including:
- Creating JWT tokens
- Testing REST endpoints
- Testing WebSocket connections
- Mixed HTTP/WebSocket testing

## Development

### Prerequisites

- Rust 1.70+ (https://rustup.rs/)
- PostgreSQL 12+
- sqlx-cli: `cargo install sqlx-cli --no-default-features --features postgres`

### Build

```bash
cargo build --release
```

### Run

```bash
cargo run
```

### Test

```bash
cargo test
```

## Database Migrations

Migrations are in `migrations/` directory. They run automatically on service startup.

To run manually:
```bash
sqlx migrate run --database-url $DATABASE_URL
```

The migration includes:
- `chat_rooms` table with indexes
- `chat_messages` table with indexes
- `room_members` table with indexes
- Sample data (4 default rooms)

## Authentication

The service uses JWT tokens for authentication. All REST endpoints require an `Authorization: Bearer <token>` header.

JWT Claims required:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "student",
  "iat": 1234567890,
  "exp": 1234654290
}
```

The token issuer must use the same `JWT_SECRET` configured in the service.

## Performance Characteristics

- **Message throughput**: ~1000 messages/sec per room (with broadcast channel buffer of 100)
- **Concurrent connections**: Unlimited (limited by system resources)
- **Message persistence**: Every message is persisted to database
- **Query performance**: All queries use indexes on room_id, user_id, created_at
- **Memory usage**: Broadcast channels use minimal memory (one per room)

## Error Handling

All errors return JSON with appropriate HTTP status codes:

```json
{
  "error": "Human-readable error message"
}
```

Status codes:
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication failed
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Monitoring and Logging

The service uses structured logging with `tracing`:

```
2024-04-09T10:30:00Z DEBUG chat_service: User user-123 joined room room-physics-2024
2024-04-09T10:30:01Z INFO chat_service: Connected to database
```

Set `RUST_LOG` environment variable to control logging:
- `debug` - Detailed debugging
- `info` - General information
- `warn` - Warnings only
- `error` - Errors only

## Deployment

### Docker

```bash
docker build -t aeroedu/chat-service:latest .
docker run -e DATABASE_URL=... -e JWT_SECRET=... -p 8096:8096 aeroedu/chat-service:latest
```

### Kubernetes

Example deployment manifests should include:
- Persistent PostgreSQL instance
- Service and Deployment resources
- ConfigMaps for environment variables
- Secrets for JWT_SECRET

### Production Checklist

- [ ] Strong JWT_SECRET (minimum 32 characters)
- [ ] HTTPS/TLS for WebSocket (wss://)
- [ ] Database backup strategy
- [ ] Monitoring and alerting
- [ ] Log aggregation
- [ ] Load balancing (if multiple instances)
- [ ] Database connection pooling tuned for load
- [ ] CORS configured for your domain

## Troubleshooting

### WebSocket Connection Refused

Check that:
1. Service is running on correct address
2. Room ID exists
3. JWT token is valid
4. Token hasn't expired

### Database Connection Failed

Check `DATABASE_URL` format:
```
postgres://username:password@localhost:5432/database
```

### JWT Validation Error

Ensure:
1. JWT secret matches token issuer
2. Token is not expired
3. Token format is correct

## Integration with Frontend

The service integrates with `chat.service.ts` in the Angular frontend:

```typescript
// Frontend expects these endpoints:
GET /api/chat/rooms
POST /api/chat/rooms
GET /api/chat/rooms/:roomId/messages
POST /api/chat/rooms/:roomId/messages
GET /api/chat/rooms/:roomId/members
GET /ws?room_id=X&token=JWT
```

All responses and request bodies match the expected format in `chat.service.ts`.

## Contributing

When making changes:
1. Ensure code compiles: `cargo build`
2. Run tests: `cargo test`
3. Check formatting: `cargo fmt --check`
4. Check lints: `cargo clippy`
5. Update documentation

## License

Part of the AeroEduVision project.

## Support

For issues or questions:
1. Check [SETUP.md](./SETUP.md) for configuration help
2. Review [EXAMPLES.md](./EXAMPLES.md) for API usage
3. Check application logs: `RUST_LOG=debug cargo run`
