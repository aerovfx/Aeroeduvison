# Phase 1: OpenFang Core Integration

**Status**: 📋 Ready for Implementation  
**Timeline**: Week 1-2  
**Goal**: Tích hợp OpenFang Agent vào hệ thống để tự động ra đề thi theo ma trận

---

## 📦 **WORKSPACE STRUCTURE**

```
/Users/pixibox/Aeroeduvison/
├── openfang-core/                    # OpenFang integration
│   ├── Cargo.toml                    # Workspace config
│   ├── openfang-types/               # Core types
│   │   ├── Cargo.toml
│   │   └── src/lib.rs                # Message, Session, Agent types
│   ├── openfang-runtime/             # LLM drivers
│   │   ├── Cargo.toml
│   │   └── src/lib.rs                # OpenAI, Ollama drivers
│   └── openfang-kernel/              # Exam agent
│       ├── Cargo.toml
│       └── src/lib.rs                # OpenFangExamAgent
│
├── rust-services/
│   └── ai-service/                   # AI service (updated)
│       ├── Cargo.toml                # Added openfang dependencies
│       └── src/
│           ├── handlers/
│           │   └── exam_generation.rs  # NEW: Exam generation endpoints
│           └── main.rs                # Updated with OpenFang init
│
└── docs/
    └── OPENFANG_INTEGRATION.md       # This file
```

---

## 🔧 **IMPLEMENTATION CHECKLIST**

### **Week 1: Core Setup**

#### **Day 1-2: OpenFang Workspace**
- [x] Create `openfang-core/Cargo.toml` workspace
- [x] Create `openfang-types` crate
- [x] Create `openfang-runtime` crate
- [x] Create `openfang-kernel` crate
- [ ] Build and test workspace

#### **Day 3-4: LLM Drivers**
- [x] OpenAI driver implementation
- [x] Ollama driver (local LLM)
- [ ] Anthropic driver (optional)
- [ ] Test drivers with sample prompts

#### **Day 5: Agent Runtime**
- [x] AgentRuntime struct
- [x] Driver registration
- [ ] Agent configuration
- [ ] Session management

### **Week 2: Exam Agent Integration**

#### **Day 1-2: Exam Agent**
- [x] OpenFangExamAgent implementation
- [x] Matrix analysis method
- [x] Exam generation method
- [ ] Answer key generation

#### **Day 3-4: API Endpoints**
- [ ] POST /api/ai/exam/generate-from-matrix
- [ ] POST /api/ai/exam/generate-multiple-variants
- [ ] GET /api/ai/exam/preview/:exam_id
- [ ] POST /api/ai/exam/swap-question

#### **Day 5: Testing**
- [ ] Unit tests for exam agent
- [ ] Integration tests with Ollama
- [ ] End-to-end test with sample matrix
- [ ] Performance benchmark

---

## 🚀 **QUICK START**

### **1. Build OpenFang Workspace**

```bash
cd /Users/pixibox/Aeroeduvison/openfang-core
cargo build
```

### **2. Update AI Service**

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/ai-service
cargo build
```

### **3. Configure LLM Provider**

Create `.env` in `ai-service/`:

```bash
# LLM Provider (choose one)
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2

# Or use OpenAI
# LLM_PROVIDER=openai
# LLM_MODEL=gpt-4o
# OPENAI_API_KEY=sk-...

# Ollama settings (if using local)
OLLAMA_BASE_URL=http://localhost:11434
```

### **4. Start Ollama (if using local LLM)**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull llama3.2

# Start server
ollama serve
```

### **5. Run AI Service**

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/ai-service
cargo run
```

### **6. Test Exam Generation**

```bash
curl -X POST http://localhost:8095/api/ai/exam/generate-from-matrix \
  -H "Content-Type: application/json" \
  -d '{
    "matrix_id": "matrix_math_11_hk1_2026",
    "teacher_id": "teacher_123",
    "options": {
      "exam_variant": "A",
      "shuffle_questions": true
    }
  }'
```

---

## 📊 **ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────┐
│  Teacher Dashboard (Next.js)                            │
├─────────────────────────────────────────────────────────┤
│  ↓ API Request                                          │
├─────────────────────────────────────────────────────────┤
│  AI Service (Rust - Port 8095)                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  OpenFang Exam Agent                             │   │
│  │  ┌──────────────┐  ┌──────────────┐             │   │
│  │  │ Matrix       │  │ Question     │             │   │
│  │  │ Analyzer     │  │ Selector     │             │   │
│  │  └──────────────┘  └──────────────┘             │   │
│  │                                                  │   │
│  │  LLM Drivers                                     │   │
│  │  • OpenAI                                        │   │
│  │  • Ollama (local)                                │   │
│  │  • Anthropic                                     │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  ↓ Database Queries                                     │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL                                              │
│  • ExamMatrix                                           │
│  • Question                                             │
│  • Exam                                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 **INTEGRATION POINTS**

### **With Existing AI Service**

The OpenFang integration extends the existing ai-service:

```rust
// rust-services/ai-service/src/services/mod.rs

pub mod openfang;      // NEW: OpenFang integration
pub mod chat;
pub mod content;
pub mod document;

pub use openfang::OpenFangService;
```

### **With Question Bank**

```rust
// rust-services/ai-service/src/services/openfang/question_selector.rs

pub struct QuestionSelector {
    db_pool: PgPool,
}

impl QuestionSelector {
    pub async fn select_questions(
        &self,
        criteria: &SelectionCriteria,
    ) -> Result<Vec<Question>> {
        sqlx::query_as::<_, Question>(
            r#"
            SELECT * FROM "Question"
            WHERE topic_id = $1
            AND cognitive_level = $2
            AND difficulty BETWEEN $3 AND $4
            ORDER BY quality_score DESC
            LIMIT $5
            "#
        )
        .bind(&criteria.topic_id)
        .bind(&criteria.cognitive_level)
        .bind(criteria.min_difficulty)
        .bind(criteria.max_difficulty)
        .bind(criteria.limit)
        .fetch_all(&self.db_pool)
        .await
    }
}
```

---

## 📝 **NEXT STEPS**

### **After Phase 1 (Week 3-4)**

1. **Phase 2: Advanced Features**
   - Multiple variant generation
   - Overlap detection
   - Question swap functionality
   - Answer key enhancement

2. **Phase 3: UI Integration**
   - Teacher dashboard component
   - Exam preview UI
   - Export to PDF
   - Edit/approve workflow

3. **Phase 4: Production**
   - Performance optimization
   - Caching layer
   - Monitoring & logging
   - Teacher training

---

## 🎯 **SUCCESS METRICS**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Exam generation time | < 30 seconds | From request to response |
| Matrix compliance | 100% | Auto-validation |
| Question diversity | > 80% unique | Across variants |
| Teacher satisfaction | > 4.5/5 | Feedback survey |
| System uptime | > 99.9% | Monitoring |

---

**Created**: March 8, 2026  
**Phase**: Phase 1 - Core Integration  
**Status**: 📋 Ready to Build  
**Owner**: Backend Team
