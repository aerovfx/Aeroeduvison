# Chat Service Setup Guide

This is the real-time chat microservice for AeroEduVision. It provides WebSocket and REST API endpoints for chat functionality with PostgreSQL persistence.

## Prerequisites

- Rust 1.70+ (install from https://rustup.rs/)
- PostgreSQL 12+
- sqlx-cli (for offline mode): `cargo install sqlx-cli --no-default-features --features postgres`

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection details:

```
DATABASE_URL=postgres://username:password@localhost:5432/aeroedu
CHAT_SERVICE_ADDR=127.0.0.1:8096
JWT_SECRET=your-super-secret-key-keep-this-safe
RUST_LOG=debug
```

### 2. Database Setup

Create the database:
```bash
createdb aeroedu
```

Run migrations:
```bash
sqlx migrate run --database-url $DATABASE_URL
```

Or let the application run them automatically on startup.

### 3. Build and Run

```bash
cargo build --release
cargo run
```

The service will start on `http://127.0.0.1:8096`

Health check:
```bash
curl http://127.0.0.1:8096/health
```

## API Endpoints

### REST Endpoints

#### List Rooms (requires JWT token in Authorization header)
```
GET /api/chat/rooms
Authorization: Bearer <jwt_token>
```

Response:
```json
[
  {
    "id": "room-physics-2024",
    "name": "Vật lý 12A",
    "description": "Nhóm học Vật lý lớp 12A",
    "room_type": "study_group",
    "created_by": "system",
    "last_message": "Bài học hôm nay rất hay",
    "last_message_at": "2024-04-09T10:30:00Z",
    "member_count": 24,
    "created_at": "2024-04-08T10:00:00Z",
    "updated_at": "2024-04-09T10:30:00Z"
  }
]
```

#### Create Room
```
POST /api/chat/rooms
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Nhóm luyện tập",
  "description": "Nhóm luyện tập cho kỳ thi",
  "room_type": "study_group"
}
```

Response: `201 Created` with the new room object.

#### Get Recent Messages (last 50)
```
GET /api/chat/rooms/:room_id/messages
Authorization: Bearer <jwt_token>
```

Response:
```json
[
  {
    "id": "msg-123",
    "room_id": "room-physics-2024",
    "user_id": "user-456",
    "user_name": "student@school.edu",
    "content": "Ai giải được bài 5?",
    "message_type": "text",
    "created_at": "2024-04-09T10:25:00Z"
  }
]
```

#### Send Message
```
POST /api/chat/rooms/:room_id/messages
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "Bài 5 là về động lực học Newton đấy"
}
```

Response: `201 Created` with the message object.

#### List Room Members
```
GET /api/chat/rooms/:room_id/members
Authorization: Bearer <jwt_token>
```

Response:
```json
[
  {
    "id": "member-789",
    "room_id": "room-physics-2024",
    "user_id": "user-456",
    "user_name": "student@school.edu",
    "role": "member",
    "joined_at": "2024-04-08T10:00:00Z"
  }
]
```

### WebSocket Endpoint

```
GET /ws?room_id=<room_id>&token=<jwt_token>
```

This upgrades to a WebSocket connection for real-time messaging.

#### Sending a Message (via WebSocket)

Send as JSON:
```json
{
  "content": "Hello everyone!"
}
```

#### Receiving Messages (via WebSocket)

Incoming messages are broadcast in the format:
```json
{
  "room_id": "room-physics-2024",
  "user_id": "user-456",
  "user_name": "student@school.edu",
  "content": "Hello everyone!",
  "message_type": "text",
  "timestamp": "2024-04-09T10:30:00Z"
}
```

## JWT Token Format

The service expects JWT tokens with the following claims:

```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "role": "student",
  "iat": 1712658600,
  "exp": 1712745000
}
```

The token should be passed:
- In HTTP headers: `Authorization: Bearer <token>`
- In WebSocket query params: `/ws?room_id=...&token=<token>`

## Architecture

### Data Models

- **ChatRoom**: Room metadata, member count, last message info
- **ChatMessage**: Individual messages with timestamps
- **RoomMember**: User membership in rooms with roles

### WebSocket Architecture

- Uses tokio broadcast channels (one per room)
- Messages sent via HTTP POST are also broadcast to WebSocket subscribers
- Automatic persistence to database for all WebSocket messages
- Users are auto-added to rooms on first message or WebSocket join

### Error Handling

Errors are returned as JSON:
```json
{
  "error": "Room not found"
}
```

HTTP Status codes:
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication failed
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Development

### Running Tests

```bash
cargo test
```

### Code Structure

```
src/
├── main.rs          - Server setup, WebSocket handler, JWT validation
├── models.rs        - Data models (ChatRoom, ChatMessage, RoomMember)
├── error.rs         - Error types and HTTP response mapping
├── ws.rs            - WebSocket broadcast channel management
└── handlers/
    ├── health.rs    - Health check endpoint
    ├── rooms.rs     - Room CRUD operations
    └── messages.rs  - Message CRUD and broadcasting
```

## Production Deployment

1. Set strong JWT secret in `.env`
2. Use a managed PostgreSQL database
3. Enable HTTPS/TLS for WebSocket (wss://)
4. Configure appropriate CORS policies if needed
5. Use environment-specific database connection pooling
6. Monitor logs with structured logging (tracing)
7. Deploy behind a reverse proxy (nginx, traefik) for load balancing

## Troubleshooting

### Database Connection Errors

Check `DATABASE_URL` format:
```
postgres://username:password@host:port/database
```

### JWT Validation Fails

- Ensure `JWT_SECRET` matches the token issuer
- Check token expiration (`exp` claim)
- Verify token format in headers or query params

### WebSocket Connection Issues

- Check CORS settings
- Verify room_id exists in database
- Ensure token is valid and not expired
- Check that user is a member of the room

### Migration Issues

Reset the database (development only):
```bash
dropdb aeroedu
createdb aeroedu
sqlx migrate run --database-url $DATABASE_URL
```

## Integration with Frontend

The service is designed to work with the `chat.service.ts` Angular service. Key integration points:

1. **Authentication**: Frontend passes JWT token in every request
2. **WebSocket**: Frontend connects to `/ws` endpoint for real-time updates
3. **HTTP Operations**: RESTful API for non-real-time operations
4. **Message Broadcasting**: Changes via HTTP are broadcast to WebSocket clients
5. **Room Creation**: Users become room admins when they create a room

## Performance Considerations

- Broadcast channel buffer: 100 messages per room
- Message fetch limit: 50 most recent messages
- Member count is maintained in the database for fast queries
- All queries use indexes on room_id and user_id

## License

Part of AeroEduVision project
