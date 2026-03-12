# Aeroeduvison AI Service

Rust AI service handling:
- AI chat & tutor
- Content generation (lessons, quizzes, slides)
- Document analysis
- Lesson generation
- AI analytics

## Quick Start

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/ai-service
cargo run
```

Default: `http://127.0.0.1:8095`

## Environment Variables

```bash
# Server
AI_SERVICE_ADDR=127.0.0.1:8095

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aeroeduvison

# JWT (for auth validation)
JWT_SECRET=your-super-secret-key-min-32-chars

# LLM Providers
GROK_API_KEY=xai-...
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
OLLAMA_BASE_URL=http://127.0.0.1:11434

# Default provider
AI_PROVIDER=auto  # auto, grok, openrouter, openai, ollama
```

## API Endpoints

### Chat
- `POST /api/ai-chat` - General AI chat
- `POST /api/ai-tutor-chat` - Tutor-specific chat

### Content Generation
- `POST /api/ai-content/generate` - Generate lessons, quizzes, slides
- `POST /api/ai-content/generate-stream` - Streaming generation
- `POST /api/ai-content/save` - Save generated content
- `GET /api/ai-content/:id` - Get content
- `DELETE /api/ai-content/:id` - Delete content

### Lesson Generation
- `POST /api/ai-generate-lesson` - Generate lesson plan
- `POST /api/ai-grade-lesson` - Grade lesson with AI

### Document Analysis
- `POST /api/ai/analyze-document` - Analyze document

### Analytics
- `GET /api/ai-analytics/dashboard` - AI usage analytics

## Health Check

```bash
curl http://127.0.0.1:8095/health
```

## Testing

```bash
cargo test
```
