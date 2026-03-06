# 🚀 Setup Guide - Architecture Components

## Quick Start

### 1. Install Dependencies ✅
All packages have been installed:
- `ioredis` - Redis client
- `yjs`, `y-websocket` - Collaboration
- `meilisearch` - Full-text search
- `bullmq` - Task queue

### 2. Setup Infrastructure Services

#### **Redis** (Required for caching, sessions, queues)

**Local:**
```bash
# Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Or Homebrew (macOS)
brew install redis
brew services start redis
```

**Production (Google Cloud):**
```bash
# Create Memorystore Redis instance
gcloud redis instances create lmsmath-redis \
  --size=1 \
  --region=asia-east1 \
  --redis-version=redis_7_0
```

#### **Qdrant** (Vector Database)

**Local:**
```bash
docker run -d -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

**Production:**
- Use [Qdrant Cloud](https://cloud.qdrant.io/) (free tier available)
- Or deploy on Cloud Run / Kubernetes

#### **Meilisearch** (Search Engine)

**Local:**
```bash
docker run -d -p 7700:7700 \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:latest \
  meilisearch --master-key="your-master-key"
```

**Production:**
- Use [Meilisearch Cloud](https://www.meilisearch.com/cloud) (free tier available)
- Or deploy on Cloud Run

### 3. Configure Environment Variables

Add to `.env.local`:

```bash
# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=lmsmath_vectors
EMBEDDING_DIMENSION=1536

# Embeddings
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
OLLAMA_URL=http://localhost:11434
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_CACHE_ENABLED=true

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-master-key

# Queue
QUEUE_CONCURRENCY=5
```

### 4. Verify Setup

```bash
# Test Redis
redis-cli ping
# Should return: PONG

# Test Qdrant
curl http://localhost:6333/health
# Should return: {"status":"ok"}

# Test Meilisearch
curl http://localhost:7700/health
# Should return: {"status":"available"}
```

### 5. Initialize Services

The services will auto-initialize on first use. You can also check health:

```bash
# Check Redis health
curl https://inphysic.com/api/health

# Check Yjs health
curl https://inphysic.com/api/collaboration/yjs/health
```

---

## Usage Examples

### **Vector Search (RAG)**

```typescript
import { getVectorService } from '@/lib/embeddings/vector-service';

// 1. Index course content
await getVectorService().indexDocument({
  id: 'course-1',
  text: 'This course covers algebra, geometry, and calculus...',
  metadata: {
    courseId: 'course-1',
    type: 'course',
    subject: 'mathematics'
  }
});

// 2. Search for similar content
const results = await getVectorService().search(
  'What topics are covered in math courses?',
  {
    limit: 5,
    scoreThreshold: 0.7,
    filter: { type: 'course' }
  }
);

// 3. Use in RAG
const context = await getVectorService().retrieveContext(
  'Explain algebra concepts',
  { limit: 3 }
);
// Use context with LLM for better answers
```

### **Full-text Search**

```typescript
import { getMeilisearchClient } from '@/lib/search/meilisearch';

const client = getMeilisearchClient();

// 1. Configure index
await client.configureIndex('courses', {
  searchableAttributes: ['title', 'description', 'content'],
  filterableAttributes: ['subject', 'grade', 'difficulty'],
  sortableAttributes: ['createdAt', 'rating']
});

// 2. Add documents
await client.addDocuments('courses', [
  {
    id: '1',
    title: 'Mathematics 101',
    description: 'Introduction to mathematics',
    content: '...',
    subject: 'mathematics',
    grade: '10',
    difficulty: 'beginner'
  }
]);

// 3. Search
const results = await client.search('courses', 'mathematics', {
  limit: 10,
  filter: 'subject = mathematics',
  sort: ['rating:desc']
});
```

### **Task Queue**

```typescript
import { getBullMQManager } from '@/lib/queue/bullmq';

const bullMQ = getBullMQManager();

// 1. Create worker
bullMQ.createWorker('emails', async (job) => {
  const { to, subject, body } = job.data;
  await sendEmail(to, subject, body);
  return { success: true };
});

// 2. Add job
const jobId = await bullMQ.addJob('emails', 'send-welcome', {
  to: 'user@example.com',
  subject: 'Welcome to LMSMath',
  body: '...'
}, {
  delay: 5000, // Delay 5 seconds
  attempts: 3
});

// 3. Check job status
const status = await bullMQ.getJobStatus('emails', jobId);
console.log(status.state); // 'completed', 'active', 'failed', etc.
```

### **Yjs Collaboration**

```typescript
import { getYjsServer } from '@/lib/collaboration/yjs-server';

const yjsServer = getYjsServer();

// 1. Get document
const doc = yjsServer.getDocument('room-123');

// 2. Add participant
yjsServer.addParticipant('room-123', 'user-456');

// 3. Handle updates (in WebSocket handler)
const update = new Uint8Array(/* ... */);
const stateVector = yjsServer.handleUpdate('room-123', update);

// 4. Sync
const stateUpdate = yjsServer.getStateUpdate('room-123', stateVector);
```

### **Caching**

```typescript
import { CacheManager } from '@/lib/cache';

// Set cache
await CacheManager.set('user:123:profile', userData, 3600); // 1 hour

// Get cache
const cached = await CacheManager.get('user:123:profile');

// Invalidate
await CacheManager.invalidateUserCache('123');
```

---

## API Endpoints

### **Vector Search**
```
POST /api/vector/search
Body: {
  query: string,
  limit?: number,
  scoreThreshold?: number,
  filter?: object,
  model?: string
}
```

### **Full-text Search**
```
GET /api/search?q=query&index=courses&limit=20
```

### **Task Queue**
```
POST /api/queue/jobs
Body: {
  queueName: string,
  jobName: string,
  data: object,
  options?: object
}

GET /api/queue/jobs?queue=emails&jobId=123
```

### **Yjs Collaboration**
```
POST /api/collaboration/yjs
Body: {
  roomId: string,
  action: 'join' | 'update' | 'sync' | 'leave',
  participantId?: string,
  update?: number[],
  stateVector?: number[]
}
```

---

## Production Deployment

### **Google Cloud Run**

1. **Set Environment Variables:**
```bash
gcloud run services update lmsmath-app \
  --set-env-vars="REDIS_URL=redis://... \
  QDRANT_URL=https://... \
  MEILISEARCH_HOST=https://... \
  OPENAI_API_KEY=sk-..."
```

2. **Deploy Services:**
   - Redis: Use Memorystore
   - Qdrant: Use Qdrant Cloud or deploy separately
   - Meilisearch: Use Meilisearch Cloud or deploy separately

3. **Monitor:**
   - Check Cloud Logging for errors
   - Monitor Redis memory usage
   - Monitor queue job failures

---

## Troubleshooting

### **Redis Connection Failed**
- Check `REDIS_URL` is correct
- Verify Redis is running: `redis-cli ping`
- Check firewall rules

### **Qdrant Connection Failed**
- Check `QDRANT_URL` is correct
- Verify Qdrant is running: `curl http://localhost:6333/health`
- Check API key if using cloud

### **Meilisearch Connection Failed**
- Check `MEILISEARCH_HOST` is correct
- Verify Meilisearch is running: `curl http://localhost:7700/health`
- Check master key

### **Embeddings Not Working**
- Verify `OPENAI_API_KEY` is set
- Check API quota/limits
- Try different model

---

## Next Steps

1. ✅ All components implemented
2. ⏳ Setup infrastructure services
3. ⏳ Configure environment variables
4. ⏳ Test each component
5. ⏳ Deploy to production
6. ⏳ Monitor and optimize

---

**See Also:**
- [Architecture Documentation](./ARCHITECTURE.md)
- [Implementation Status](./IMPLEMENTATION_STATUS.md)
- [API Documentation](./API_DOCUMENTATION.md)

