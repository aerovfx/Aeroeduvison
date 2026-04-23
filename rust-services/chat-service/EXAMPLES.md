# Chat Service Usage Examples

## Creating a JWT Token for Testing

First, you need a valid JWT token. Here's how to create one for testing:

```python
import jwt
import json
from datetime import datetime, timedelta

secret = "dev-secret-key-change-in-production"
payload = {
    "sub": "user-123",
    "email": "student@school.edu",
    "role": "student",
    "iat": int(datetime.now().timestamp()),
    "exp": int((datetime.now() + timedelta(hours=24)).timestamp())
}

token = jwt.encode(payload, secret, algorithm="HS256")
print(token)
```

Or use an online JWT decoder/encoder at https://jwt.io

## Example Requests

### 1. Health Check

```bash
curl http://localhost:8096/health
```

Response:
```json
{
  "status": "ok",
  "service": "chat-service"
}
```

### 2. List Rooms

```bash
TOKEN="your-jwt-token-here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8096/api/chat/rooms
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
    "last_message": null,
    "last_message_at": null,
    "member_count": 24,
    "created_at": "2024-04-09T10:00:00Z",
    "updated_at": "2024-04-09T10:00:00Z"
  }
]
```

### 3. Create a New Room

```bash
TOKEN="your-jwt-token-here"
curl -X POST http://localhost:8096/api/chat/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Luyện tập C++",
    "description": "Nhóm luyện tập lập trình C++",
    "room_type": "study_group"
  }'
```

Response:
```json
{
  "id": "room-abc123def",
  "name": "Luyện tập C++",
  "description": "Nhóm luyện tập lập trình C++",
  "room_type": "study_group",
  "created_by": "user-123",
  "last_message": null,
  "last_message_at": null,
  "member_count": 1,
  "created_at": "2024-04-09T14:30:00Z",
  "updated_at": "2024-04-09T14:30:00Z"
}
```

### 4. Send a Message via HTTP

```bash
TOKEN="your-jwt-token-here"
ROOM_ID="room-physics-2024"

curl -X POST http://localhost:8096/api/chat/rooms/$ROOM_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Ai hiểu bài thuyết âm về sóng ánh sáng không?"
  }'
```

Response:
```json
{
  "id": "msg-xyz789",
  "room_id": "room-physics-2024",
  "user_id": "user-123",
  "user_name": "student@school.edu",
  "content": "Ai hiểu bài thuyết âm về sóng ánh sáng không?",
  "message_type": "text",
  "created_at": "2024-04-09T14:35:00Z"
}
```

### 5. Get Recent Messages

```bash
TOKEN="your-jwt-token-here"
ROOM_ID="room-physics-2024"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8096/api/chat/rooms/$ROOM_ID/messages
```

Response:
```json
[
  {
    "id": "msg-abc123",
    "room_id": "room-physics-2024",
    "user_id": "user-456",
    "user_name": "teacher@school.edu",
    "content": "Hôm nay chúng ta học về sóng âm",
    "message_type": "text",
    "created_at": "2024-04-09T09:00:00Z"
  },
  {
    "id": "msg-xyz789",
    "room_id": "room-physics-2024",
    "user_id": "user-123",
    "user_name": "student@school.edu",
    "content": "Ai hiểu bài thuyết âm về sóng ánh sáng không?",
    "message_type": "text",
    "created_at": "2024-04-09T14:35:00Z"
  }
]
```

### 6. List Room Members

```bash
TOKEN="your-jwt-token-here"
ROOM_ID="room-physics-2024"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8096/api/chat/rooms/$ROOM_ID/members
```

Response:
```json
[
  {
    "id": "member-001",
    "room_id": "room-physics-2024",
    "user_id": "system",
    "user_name": null,
    "role": "admin",
    "joined_at": "2024-04-08T10:00:00Z"
  },
  {
    "id": "member-002",
    "room_id": "room-physics-2024",
    "user_id": "user-123",
    "user_name": "student@school.edu",
    "role": "member",
    "joined_at": "2024-04-09T14:35:00Z"
  }
]
```

## WebSocket Connection Example

### Using Node.js

```javascript
const WebSocket = require('ws');

const TOKEN = 'your-jwt-token-here';
const ROOM_ID = 'room-physics-2024';

const ws = new WebSocket(`ws://localhost:8096/ws?room_id=${ROOM_ID}&token=${TOKEN}`);

ws.on('open', () => {
  console.log('Connected to chat room');
  
  // Send a message
  ws.send(JSON.stringify({
    content: 'Hello from WebSocket!'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log(`${message.user_name}: ${message.content}`);
  console.log(`  [${message.timestamp}]`);
});

ws.on('close', () => {
  console.log('Disconnected from chat room');
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### Using Browser JavaScript

```javascript
const TOKEN = 'your-jwt-token-here';
const ROOM_ID = 'room-physics-2024';

const ws = new WebSocket(`ws://localhost:8096/ws?room_id=${ROOM_ID}&token=${TOKEN}`);

ws.addEventListener('open', (event) => {
  console.log('Connected to chat room');
  
  // Send a message
  ws.send(JSON.stringify({
    content: 'Hello from browser!'
  }));
});

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  
  // Display message in chat UI
  const messageElement = document.createElement('div');
  messageElement.innerHTML = `<strong>${message.user_name}:</strong> ${message.content}`;
  document.getElementById('messages').appendChild(messageElement);
});

ws.addEventListener('close', (event) => {
  console.log('Disconnected from chat room');
});

ws.addEventListener('error', (event) => {
  console.error('WebSocket error:', event);
});
```

### Using websocat CLI Tool

```bash
# Install: cargo install websocat
TOKEN="your-jwt-token-here"
ROOM_ID="room-physics-2024"

websocat "ws://localhost:8096/ws?room_id=$ROOM_ID&token=$TOKEN"

# In websocat, type and send messages:
{"content": "Hello everyone!"}
# Press Enter to send
```

## Testing WebSocket with Multiple Clients

Open multiple terminals and connect different users:

**Terminal 1 - User A:**
```bash
websocat "ws://localhost:8096/ws?room_id=room-physics-2024&token=$TOKEN_USER_A"
```

**Terminal 2 - User B:**
```bash
websocat "ws://localhost:8096/ws?room_id=room-physics-2024&token=$TOKEN_USER_B"
```

**Terminal 1 - User A sends message:**
```json
{"content": "Hello from User A"}
```

**Terminal 2 - User B receives message:**
```json
{"room_id":"room-physics-2024","user_id":"user-123","user_name":"userA@school.edu","content":"Hello from User A","message_type":"text","timestamp":"2024-04-09T15:00:00Z"}
```

And vice versa!

## Testing Mixed HTTP and WebSocket

1. Send a message via HTTP POST:
```bash
curl -X POST http://localhost:8096/api/chat/rooms/room-physics-2024/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Message from HTTP"}'
```

2. Any connected WebSocket clients in that room will instantly receive it:
```json
{"room_id":"room-physics-2024","user_id":"user-456","user_name":"userB@school.edu","content":"Message from HTTP","message_type":"text","timestamp":"2024-04-09T15:05:00Z"}
```

This demonstrates the real-time broadcasting feature!

## Error Examples

### Missing Authorization Header
```bash
curl http://localhost:8096/api/chat/rooms
```

Response:
```json
{
  "error": "Unauthorized"
}
```
Status: 401 Unauthorized

### Invalid Room ID
```bash
TOKEN="your-jwt-token-here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8096/api/chat/rooms/nonexistent-room/messages
```

Response:
```json
{
  "error": "Room not found"
}
```
Status: 404 Not Found

### Invalid JWT Token
```bash
curl -H "Authorization: Bearer invalid-token" \
  http://localhost:8096/api/chat/rooms
```

Response:
```json
{
  "error": "JWT error: invalid signature"
}
```
Status: 401 Unauthorized
