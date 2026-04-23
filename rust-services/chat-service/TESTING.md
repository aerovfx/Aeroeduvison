# Testing Guide

Comprehensive testing guide for the Chat Service.

## Unit Testing

Run all unit tests:

```bash
cargo test
```

Run tests with output:

```bash
cargo test -- --nocapture
```

Run specific test:

```bash
cargo test test_room_creation
```

## Integration Testing

### Manual Testing with curl

Setup environment:

```bash
export JWT_SECRET="dev-secret-key-change-in-production"
export TOKEN=$(python3 -c "
import jwt
from datetime import datetime, timedelta

payload = {
    'sub': 'user-123',
    'email': 'test@example.com',
    'role': 'student',
    'iat': int(datetime.now().timestamp()),
    'exp': int((datetime.now() + timedelta(hours=1)).timestamp())
}
print(jwt.encode(payload, '$JWT_SECRET', algorithm='HS256'))
")
```

Test health endpoint:

```bash
curl http://localhost:8096/health
```

Test room listing:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8096/api/chat/rooms
```

See [EXAMPLES.md](./EXAMPLES.md) for more examples.

## WebSocket Testing

### Using websocat

Install websocat:

```bash
cargo install websocat
```

Connect to WebSocket:

```bash
TOKEN="your-jwt-token"
ROOM_ID="room-physics-2024"
websocat "ws://localhost:8096/ws?room_id=$ROOM_ID&token=$TOKEN"
```

Send message:

```json
{"content": "Hello from websocat"}
```

### Using Node.js

Create `test-ws.js`:

```javascript
const WebSocket = require('ws');

const TOKEN = process.env.TOKEN;
const ROOM_ID = 'room-physics-2024';

const ws = new WebSocket(`ws://localhost:8096/ws?room_id=${ROOM_ID}&token=${TOKEN}`);

ws.on('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify({ content: 'Test message' }));
});

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data));
});

ws.on('error', console.error);
ws.on('close', () => console.log('Disconnected'));
```

Run:

```bash
node test-ws.js
```

## Load Testing

### Using Apache Bench for HTTP

```bash
# Single request benchmark
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  http://localhost:8096/api/chat/rooms
```

### Using k6 for WebSocket Load Testing

Create `load-test.js`:

```javascript
import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m30s', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const token = __ENV.TOKEN;
  const roomId = 'room-physics-2024';
  const url = `ws://localhost:8096/ws?room_id=${roomId}&token=${token}`;

  const res = ws.connect(url, function (socket) {
    socket.on('open', () => {
      console.log('Connected');
      socket.send(JSON.stringify({
        content: `Message from k6 ${Date.now()}`
      }));
    });

    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      check(msg, {
        'message has content': (m) => m.content !== undefined,
        'message has timestamp': (m) => m.timestamp !== undefined,
      });
    });

    socket.on('close', () => console.log('Disconnected'));
    socket.on('error', (e) => console.error('Error', e));

    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
```

Install k6:

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6
```

Run load test:

```bash
TOKEN="your-jwt-token" k6 run load-test.js
```

## Database Testing

### Reset Database for Testing

```bash
# Drop and recreate
dropdb aeroedu
createdb aeroedu
sqlx migrate run --database-url $DATABASE_URL
```

### Verify Migrations

```bash
# List tables
psql $DATABASE_URL -c "\dt"

# Check indexes
psql $DATABASE_URL -c "\di"

# Check data
psql $DATABASE_URL -c "SELECT * FROM chat_rooms;"
```

## Performance Testing

### Measure Response Times

```bash
# GET /api/chat/rooms
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8096/api/chat/rooms > /dev/null

# POST /api/chat/rooms/:roomId/messages
time curl -X POST http://localhost:8096/api/chat/rooms/room-physics-2024/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"test"}' > /dev/null
```

### Measure Database Query Performance

Enable query logging:

```bash
# In PostgreSQL
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();
```

Check slow queries:

```bash
tail -f /var/log/postgresql/postgresql.log | grep "duration:"
```

## Stress Testing

### Many Concurrent WebSocket Connections

Create `stress-test.sh`:

```bash
#!/bin/bash

TOKEN="your-jwt-token"
ROOM_ID="room-physics-2024"
NUM_CONNECTIONS=100

echo "Starting $NUM_CONNECTIONS connections..."

for i in $(seq 1 $NUM_CONNECTIONS); do
  (
    websocat "ws://localhost:8096/ws?room_id=$ROOM_ID&token=$TOKEN" <<EOF &
{"content": "Message from connection $i"}
EOF
    sleep 2
  ) &
  
  if [ $((i % 10)) -eq 0 ]; then
    echo "Started $i connections..."
    sleep 0.5
  fi
done

wait
echo "All connections complete"
```

Run:

```bash
bash stress-test.sh
```

### Many Messages Per Second

```bash
#!/bin/bash

TOKEN="your-jwt-token"
ROOM_ID="room-physics-2024"

echo "Sending 1000 messages..."
for i in $(seq 1 1000); do
  curl -X POST http://localhost:8096/api/chat/rooms/$ROOM_ID/messages \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"Message $i\"}" &
  
  if [ $((i % 100)) -eq 0 ]; then
    echo "Sent $i messages..."
    wait  # Wait for background jobs to complete
  fi
done

wait
echo "Done"
```

## Error Handling Testing

### Test Missing Authorization

```bash
curl http://localhost:8096/api/chat/rooms
# Expected: 401 Unauthorized
```

### Test Invalid Token

```bash
curl -H "Authorization: Bearer invalid-token" \
  http://localhost:8096/api/chat/rooms
# Expected: 401 Unauthorized
```

### Test Expired Token

```bash
# Create token with past expiration
python3 << 'EOF'
import jwt
from datetime import datetime, timedelta

payload = {
    'sub': 'user-123',
    'email': 'test@example.com',
    'role': 'student',
    'iat': int((datetime.now() - timedelta(hours=2)).timestamp()),
    'exp': int((datetime.now() - timedelta(hours=1)).timestamp())
}
token = jwt.encode(payload, 'dev-secret-key-change-in-production', algorithm='HS256')
print(f"curl -H 'Authorization: Bearer {token}' http://localhost:8096/api/chat/rooms")
EOF
```

### Test Invalid Room ID

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8096/api/chat/rooms/nonexistent-room/messages
# Expected: 404 Not Found
```

### Test Missing Content in Message

```bash
curl -X POST http://localhost:8096/api/chat/rooms/room-physics-2024/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 400 Bad Request
```

## Test Scenarios

### Scenario 1: Create Room and Send Message

```bash
# 1. Create room
ROOM=$(curl -s -X POST http://localhost:8096/api/chat/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Room","room_type":"study_group"}')

ROOM_ID=$(echo $ROOM | jq -r '.id')
echo "Created room: $ROOM_ID"

# 2. Send message
MESSAGE=$(curl -s -X POST \
  http://localhost:8096/api/chat/rooms/$ROOM_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello World"}')

echo "Sent message: $(echo $MESSAGE | jq -r '.id')"

# 3. Get messages
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8096/api/chat/rooms/$ROOM_ID/messages | jq '.'
```

### Scenario 2: Multiple Users in Same Room

Create two JWT tokens for different users and:

1. User A creates room
2. User B joins and sends message
3. User A receives message via WebSocket
4. User B receives message via WebSocket
5. Both users can list messages

### Scenario 3: Message Persistence

1. Send message via HTTP
2. Verify message in database
3. Restart service
4. Messages should still be retrievable

```bash
# 1. Send message
curl -X POST http://localhost:8096/api/chat/rooms/room-physics-2024/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Persistence test"}'

# 2. Check database
psql $DATABASE_URL -c "SELECT content FROM chat_messages WHERE content LIKE '%Persistence%';"

# 3. Restart service
# Stop: Ctrl+C
# Start: cargo run

# 4. Verify message is still there
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8096/api/chat/rooms/room-physics-2024/messages | jq '.[] | select(.content | contains("Persistence"))'
```

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: aeroedu
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    
    - uses: dtolnay/rust-toolchain@stable
    
    - uses: Swatinem/rust-cache@v2
    
    - name: Run tests
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/aeroedu
      run: cargo test --verbose
    
    - name: Check formatting
      run: cargo fmt -- --check
    
    - name: Run clippy
      run: cargo clippy -- -D warnings
```

## Test Coverage

Run coverage analysis:

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out Html
```

Open `tarpaulin-report.html` to view coverage.

## Debugging

### Enable Debug Logging

```bash
RUST_LOG=debug cargo run
```

### Check Application Logs

```bash
# While running:
RUST_LOG=debug cargo run | grep -E "error|warn|user|room|message"
```

### Debug Database Queries

```bash
# In PostgreSQL:
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

# Then run your test and check logs
tail -f /var/log/postgresql/postgresql.log
```

### Test with strace (Linux)

```bash
strace -e trace=network cargo run
```

## Benchmarking

Create `benches/main.rs`:

```rust
#[cfg(test)]
mod benches {
    use std::time::Instant;

    #[test]
    fn bench_message_parsing() {
        let msg = r#"{"content":"test message"}"#;
        let start = Instant::now();
        
        for _ in 0..10000 {
            let _: serde_json::Value = serde_json::from_str(msg).unwrap();
        }
        
        let duration = start.elapsed();
        println!("10000 parses: {:?}", duration);
    }
}
```

Run:

```bash
cargo test --release bench_ -- --nocapture
```

## Regression Testing

Before each release, verify:

1. [ ] All endpoints return correct status codes
2. [ ] All error cases are handled properly
3. [ ] WebSocket connections work correctly
4. [ ] Messages persist to database
5. [ ] Room operations work correctly
6. [ ] Member management works correctly
7. [ ] JWT validation works correctly
8. [ ] CORS headers are present
9. [ ] Health check returns 200 OK
10. [ ] No memory leaks over 1 hour of activity
