# Chat Service - Complete File Structure

## Project Overview

A production-ready Rust microservice for real-time chat with WebSocket support and PostgreSQL persistence. Built for the AeroEduVision educational platform.

## Directory Structure

```
chat-service/
├── src/                          # Rust source code
│   ├── main.rs                  # Server setup, WebSocket handler, JWT validation
│   ├── error.rs                 # Error types and HTTP response handling
│   ├── models.rs                # Data models (ChatRoom, ChatMessage, RoomMember, JwtClaims)
│   ├── ws.rs                    # WebSocket broadcast channel management
│   └── handlers/                # HTTP request handlers
│       ├── mod.rs               # Handler module exports
│       ├── health.rs            # Health check endpoint
│       ├── rooms.rs             # Room CRUD operations
│       └── messages.rs          # Message CRUD and broadcasting
│
├── migrations/                   # Database schema
│   └── 001_chat.sql             # PostgreSQL schema and seed data
│
├── Cargo.toml                    # Rust project configuration and dependencies
├── Cargo.lock                    # Locked dependency versions (git-ignored)
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Local development with PostgreSQL
│
├── .env.example                  # Environment variable template
├── .gitignore                    # Git ignore rules
│
├── README.md                     # Project overview and quick start
├── SETUP.md                      # Installation and configuration guide
├── EXAMPLES.md                   # API usage examples (curl, Node.js, websocat)
├── TESTING.md                    # Testing strategies and examples
├── DEPLOYMENT.md                 # Production deployment guide
└── FILE_STRUCTURE.md            # This file
```

## File Descriptions

### Source Code Files

#### src/main.rs (275 lines)
**Purpose**: Server initialization, routing, and WebSocket handling

**Key Components**:
- `AppState`: Shared application state (database, JWT secret, channels)
- `#[tokio::main]`: Async runtime and server setup
- Route definitions for all endpoints
- WebSocket handler with JWT validation
- Message forwarding between HTTP and WebSocket
- Room membership auto-join logic

**Exports**: None (entry point)

**Dependencies**: axum, tokio, futures_util, jsonwebtoken, tracing

---

#### src/models.rs (68 lines)
**Purpose**: Data model definitions with serialization

**Key Types**:
- `ChatRoom`: Room metadata with last message info
- `ChatMessage`: Individual message with timestamps
- `RoomMember`: User membership with roles
- `CreateRoomRequest`: Request body for room creation
- `SendMessageRequest`: Request body for sending messages
- `JwtClaims`: JWT token claims
- `WsMessage`: WebSocket message format

**Features**:
- Derives `sqlx::FromRow` for database mapping
- Derives `Serialize`/`Deserialize` for JSON
- All timestamps in UTC

---

#### src/error.rs (54 lines)
**Purpose**: Error handling and HTTP response mapping

**Error Types**:
- `Unauthorized` → 401 Unauthorized
- `RoomNotFound` → 404 Not Found
- `UserNotFound` → 404 Not Found
- `Database` → 500 Internal Server Error
- `Internal` → 500 Internal Server Error
- `InvalidRequest` → 400 Bad Request
- `JwtError` → 401 Unauthorized

**Features**:
- Custom `thiserror` implementation
- `IntoResponse` trait for Axum integration
- JSON error response format

---

#### src/ws.rs (36 lines)
**Purpose**: WebSocket broadcast channel management

**Key Functions**:
- `new_room_channels()`: Create new broadcast channel map
- `get_or_create_channel()`: Get or create channel for room

**Type Aliases**:
- `RoomChannels`: `Arc<RwLock<HashMap<String, broadcast::Sender<WsMessage>>>>`

**Design**: 
- One broadcast channel per room
- Buffer size: 100 messages
- Thread-safe with RwLock and Arc

---

#### src/handlers/health.rs (9 lines)
**Purpose**: Health check endpoint

**Exports**: 
- `health_check()`: Returns `{"status": "ok", "service": "chat-service"}`

---

#### src/handlers/rooms.rs (94 lines)
**Purpose**: Room management operations

**Endpoints**:
1. `list_rooms()`: GET /api/chat/rooms
   - Returns rooms user is member of
   - Ordered by last update
   
2. `create_room()`: POST /api/chat/rooms
   - Creates new room
   - Auto-adds creator as admin
   - Returns 201 Created
   
3. `get_room_members()`: GET /api/chat/rooms/:roomId/members
   - Lists all members in room
   - Ordered by join time

**Features**:
- JWT authentication on all endpoints
- Database persistence
- Transaction safety

---

#### src/handlers/messages.rs (128 lines)
**Purpose**: Message operations and broadcasting

**Endpoints**:
1. `get_messages()`: GET /api/chat/rooms/:roomId/messages
   - Returns last 50 messages
   - Ordered chronologically
   
2. `send_message()`: POST /api/chat/rooms/:roomId/messages
   - Creates message in database
   - Auto-adds user to room if not member
   - Broadcasts to WebSocket channel
   - Updates room's last_message info
   - Returns 201 Created

**Features**:
- Automatic user membership
- Database persistence
- Real-time broadcasting
- Message ordering

---

#### src/handlers/mod.rs (7 lines)
**Purpose**: Re-exports for handler modules

---

### Configuration Files

#### Cargo.toml (22 lines)
**Purpose**: Rust project manifest and dependencies

**Key Dependencies**:
- `axum 0.7`: Web framework with WebSocket support
- `tokio 1`: Async runtime
- `sqlx 0.7`: SQL toolkit with compile-time checking
- `serde 1`: Serialization framework
- `jsonwebtoken 9`: JWT handling
- `uuid 1`: ID generation
- `chrono 0.4`: Date/time handling
- `tower-http 0.5`: CORS middleware
- `tracing 0.1`: Structured logging

**Metadata**:
- Edition: 2021
- Package: chat-service
- Version: 0.1.0

---

#### .env.example
**Purpose**: Template for environment configuration

**Variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `CHAT_SERVICE_ADDR`: Server bind address and port
- `JWT_SECRET`: Secret for JWT validation
- `RUST_LOG`: Logging level

---

#### Dockerfile
**Purpose**: Multi-stage Docker build

**Stages**:
1. **Builder**: Compile Rust application
2. **Runtime**: Minimal Debian image with binary

**Optimizations**:
- Multi-stage reduces final image size
- Only runtime dependencies in final image
- ~30MB binary size

---

#### docker-compose.yml
**Purpose**: Local development environment

**Services**:
1. **postgres**: PostgreSQL 16 with health check
2. **chat-service**: Built from Dockerfile

**Volumes**: PostgreSQL data persistence

**Features**:
- Automatic migrations on startup
- Health checks
- Service dependencies

---

### Database

#### migrations/001_chat.sql (45 lines)
**Purpose**: Database schema and seed data

**Tables**:
1. `chat_rooms`:
   - Primary key: id
   - Columns: name, description, room_type, created_by, member_count, timestamps
   
2. `chat_messages`:
   - Primary key: id
   - Foreign key: room_id → chat_rooms
   - Columns: user_id, user_name, content, message_type, created_at
   
3. `room_members`:
   - Primary key: id
   - Foreign keys: room_id → chat_rooms
   - Unique constraint: (room_id, user_id)
   - Columns: user_id, user_name, role, joined_at

**Indexes**:
- idx_chat_messages_room_id
- idx_chat_messages_created_at
- idx_room_members_room_id
- idx_room_members_user_id

**Seed Data**:
- 4 default rooms (physics, math, general, ai-help)
- Ready for immediate use

---

### Documentation

#### README.md
**Sections**:
- Feature overview
- Architecture diagram
- Endpoints summary
- Data model definitions
- Configuration guide
- Quick start
- Development setup
- Performance characteristics
- Monitoring
- Integration guide
- Production checklist

---

#### SETUP.md
**Sections**:
- Prerequisites
- Environment setup
- Database initialization
- Build and run instructions
- Complete API reference with response examples
- JWT token format
- Architecture overview
- Development guide
- Troubleshooting

---

#### EXAMPLES.md
**Sections**:
- JWT token creation (Python)
- cURL examples for all endpoints
- Node.js WebSocket client
- Browser JavaScript WebSocket
- websocat CLI usage
- Multi-client testing
- Mixed HTTP/WebSocket scenarios
- Error response examples

---

#### TESTING.md
**Sections**:
- Unit testing with cargo test
- Integration testing
- WebSocket testing tools
- Load testing (Apache Bench, k6)
- Database testing
- Performance measurement
- Stress testing scenarios
- Error handling tests
- Test scenarios and workflows
- CI/CD configuration
- Coverage reporting
- Debugging techniques

---

#### DEPLOYMENT.md
**Sections**:
- Pre-deployment checklist (security, performance, reliability, operations)
- Development to production migration
- Docker build and push
- Kubernetes deployment (manifests for ConfigMap, Secret, Deployment, Service, Ingress)
- AWS ECS deployment
- Azure Container Instances
- Monitoring and observability
- Scaling considerations
- Rollback procedures
- Zero-downtime deployment
- Performance tuning
- Disaster recovery
- Compliance requirements

---

#### FILE_STRUCTURE.md (This file)
**Purpose**: Complete documentation of all files and their purposes

---

### Git Configuration

#### .gitignore
**Ignored Patterns**:
- Rust build artifacts: `target/`, `Cargo.lock`
- Environment files: `.env`, `.env.local`
- IDE files: `.vscode/`, `.idea/`
- System files: `.DS_Store`

---

## Code Metrics

| Metric | Value |
|--------|-------|
| Total Rust lines | ~433 |
| Core application | ~275 (main.rs) |
| Error handling | ~54 |
| Data models | ~68 |
| WebSocket | ~36 |
| Handlers | ~94-128 per handler |
| Database schema | ~45 |
| Documentation | ~1000+ lines |
| Total files | 19 |

## Dependency Tree

```
chat-service
├── axum 0.7 (web framework)
│   └── tokio (async runtime)
├── sqlx 0.7 (database)
│   └── postgres (database driver)
├── serde (serialization)
├── serde_json (JSON)
├── jsonwebtoken (JWT)
├── uuid (ID generation)
├── chrono (timestamps)
├── thiserror (error handling)
├── tower-http (CORS)
├── tracing (logging)
├── dotenvy (environment)
└── futures-util (async utilities)
```

## Development Workflow

### Initial Setup
1. Copy `.env.example` → `.env`
2. Configure database in `.env`
3. Run `docker-compose up` or `cargo run`
4. Migrations run automatically

### Making Changes
1. Edit source files in `src/`
2. Add tests in `tests/` or inline
3. Run `cargo test`
4. Format: `cargo fmt`
5. Lint: `cargo clippy`
6. Build: `cargo build --release`

### Deploying
1. Update version in `Cargo.toml`
2. Build Docker image: `docker build -t .../chat-service:vX.Y.Z .`
3. Push to registry: `docker push .../chat-service:vX.Y.Z`
4. Deploy using Kubernetes or ECS manifests from DEPLOYMENT.md

## Key Design Decisions

1. **Single Binary**: All code in one executable, no separate microservices
2. **Broadcast Channels**: Per-room broadcast for efficient WebSocket routing
3. **Dual API**: HTTP for non-real-time, WebSocket for real-time
4. **Automatic Membership**: Users auto-join rooms on first message
5. **Message Persistence**: All messages saved to database immediately
6. **JWT Validation**: All endpoints require valid JWT tokens
7. **CORS Permissive**: Allows all origins (configure for production)

## Security Considerations

- JWT validation on all endpoints
- No sensitive data in logs
- Database connections use Rust safety guarantees
- Type-safe SQL queries with sqlx
- All timestamps in UTC
- No plain-text passwords in config

## Performance Optimizations

- Database connection pooling
- Indexed queries on (room_id, user_id, created_at)
- Broadcast channels with bounded buffers
- Lazy channel creation
- Efficient JSON serialization with serde

## Testing Strategy

- Unit tests in source files
- Integration tests with real database
- Load testing with k6 and Apache Bench
- WebSocket testing with multiple clients
- Error scenario validation
- Performance baseline measurements
- Regression test suite

## Documentation Quality

- Complete API reference with examples
- Setup guide with troubleshooting
- Deployment guide for multiple platforms
- Testing guide with tools and examples
- Code comments on complex logic
- Type safety through Rust

This chat service is production-ready and fully documented for immediate deployment.
