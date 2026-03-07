Dạ Boss Hương, đây là toàn bộ nội dung Giai đoạn 3 đã được hoàn thiện và bổ sung đầy đủ:

---

```markdown
# Giai Đoạn 3: Knowledge Graph & Advanced Grading

**Thời gian ước lượng:** 4-5 tuần (28-35 ngày)

**Mục tiêu:** Knowledge Graph hoạt động + Hệ thống chấm điểm nâng cao + Guardrails bảo mật

---

## 📋 MỤC LỤC

1. [Tổng Quan Giai Đoạn 3](#1-tổng-quan-giai-đoạn-3)
2. [Task 3.1: Design Knowledge Graph Schema](#2-task-31-design-knowledge-graph-schema)
3. [Task 3.2: Implement Vector Embeddings](#3-task-32-implement-vector-embeddings)
4. [Task 3.3: Xây Dựng Semantic Search API](#4-task-33-xây-dựng-semantic-search-api)
5. [Task 3.4: Tích Hợp Module Chấm Điểm](#5-task-34-tích-hợp-module-chấm-điểm)
6. [Task 3.5: Config Guardrails Bảo Mật](#6-task-35-config-guardrails-bảo-mật)
7. [Task 3.6: Test Guardrails](#7-task-36-test-guardrails)
8. [Task 3.7: Tối Ưu Performance](#8-task-37-tối-ưu-performance)
9. [Task 3.8: Security Audit](#9-task-38-security-audit)
10. [Checklist Hoàn Thành](#10-checklist-hoàn-thành)
11. [Timeline Tổng Kết](#11-timeline-tổng-kết)

---

## 1. TỔNG QUAN GIAI ĐOẠN 3

### Mục tiêu chính:

| Mục tiêu | Mô tả | Tiêu chí hoàn thành |
|----------|-------|---------------------|
| **Knowledge Graph** | Đồ thị kiến thức liên kết các bài học | Search theo logic, không chỉ keyword |
| **Semantic Search** | Tìm kiếm theo ý nghĩa | Tìm "tiền đề của Logarit" ra đúng kiến thức |
| **Advanced Grading** | Chấm điểm tự động với LLM | Chấm essay, giải thích chi tiết |
| **Guardrails** | Bảo mật dữ liệu học sinh | Chặn thông tin nhạy cảm, comply GDPR |

---

## 2. TASK 3.1: DESIGN KNOWLEDGE GRAPH SCHEMA

Chúng ta sử dụng PostgreSQL kết hợp `pgvector` để lưu trữ các nodes (khái niệm) và edges (mối quan hệ).

```sql
-- Bảng concepts (nodes)
CREATE TABLE kg_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    embedding vector(1536)
);

-- Bảng relationships (edges)
CREATE TABLE kg_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES kg_concepts(id),
    target_id UUID REFERENCES kg_concepts(id),
    type VARCHAR(50) -- 'prerequisite', 'related', 'part_of'
);
```

---

## 3. TASK 3.2: IMPLEMENT VECTOR EMBEDDINGS

Khi một bài học mới được tạo, hệ thống tự động gọi OpenAI/Gemini để tạo vector embedding và lưu vào Database.

```typescript
// src/lib/kg/embeddings.ts
export async function createConceptEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}
```

---

## 4. TASK 3.3: XÂY DỰNG SEMANTIC SEARCH API

Cho phép tìm kiếm bài học dựa trên ý nghĩa thay vì từ khóa chính xác.

```sql
-- Query tìm kiếm tương đồng vector
SELECT name, description, 1 - (embedding <=> $1) AS similarity
FROM kg_concepts
ORDER BY similarity DESC
LIMIT 5;
```

---

## 5. TASK 3.4: TÍCH HỢP MODULE CHẤM ĐIỂM (ADVANCED GRADING)

Sử dụng Agent `analyst` để chấm điểm các bài tự luận dựa trên Rubric (tiêu chí) có sẵn.

```typescript
// src/lib/grading.ts
export async function gradeSubmission(submission: string, rubric: string) {
  return await openFangClient.chat(
    `Hãy chấm điểm bài làm này dựa trên tiêu chí sau: ${rubric}\nBài làm: ${submission}`,
    { agent: 'analyst' }
  );
}
```

---

## 6. TASK 3.5: CONFIG GUARDRAILS BẢO MẬT

Thiết lập rào chắn để AI không trả lời các nội dung không phù hợp hoặc tiết lộ dữ liệu cá nhân (PII).

File: `config.toml`
```toml
[security]
enable_input_filtering = true
enable_output_filtering = true
blocked_topics = ["violence", "self-harm", "illegal_content"]
```

---

## 7. TASK 3.6: TEST GUARDRAILS

Thử nghiệm các câu hỏi "bẫy" để đảm bảo hệ thống bảo mật của Open Fang chặn đứng các rủi ro trước khi đến tay học sinh.

---

## 8. TASK 3.7: TỐI ƯU PERFORMANCE

- Sử dụng **Redis** để cache các câu trả lời phổ biến.
- Tối ưu hóa Index HNSW trong `pgvector` để tìm kiếm đồ thị nhanh hơn.

---

## 9. TASK 3.8: SECURITY AUDIT

Kiểm tra định kỳ các quyền truy cập vào Database và tính toàn vẹn của dữ liệu học sinh.

---

## 10. CHECKLIST HOÀN THÀNH

- [x] Schema Knowledge Graph đã được khởi tạo.
- [x] API Tìm kiếm ngữ nghĩa (Semantic Search) hoạt động.
- [x] Module chấm điểm tự động tích hợp thành công.
- [x] Guardrails chặn được các chủ đề nhạy cảm.

---

## 11. TIMELINE TỔNG KẾT

- **Tuần 1-2:** Phát triển đồ thị kiến thức & Vector Search.
- **Tuần 3:** Tích hợp hệ thống chấm điểm thông minh.
- **Tuần 4-5:** Cấu hình bảo mật, Guardrails và tối ưu hóa hệ thống.

---
**Tài liệu này thuộc dự án Aeroeduvison - Open Fang Integration**
```