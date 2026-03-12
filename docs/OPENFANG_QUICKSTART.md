# 🤖 OpenFang Integration - Quick Start Guide

**Tích hợp OpenFang Agent vào Aeroeduvison để tự động ra đề thi**

---

## 📦 **CẤU TRÚC THƯ MỤC**

```
/Users/pixibox/Aeroeduvison/
├── openfang-core/                    # OpenFang workspace
│   ├── Cargo.toml
│   ├── openfang-types/               # Core types
│   ├── openfang-runtime/             # LLM drivers
│   └── openfang-kernel/              # Exam agent
│
├── rust-services/
│   └── ai-service/                   # AI service (đã update)
│       ├── Cargo.toml                # Đã thêm openfang deps
│       └── src/
│
└── docs/
    └── OPENFANG_PHASE1.md            # Implementation plan
```

---

## 🚀 **BẮT ĐẦU NHANH**

### **1. Build OpenFang Workspace**

```bash
cd /Users/pixibox/Aeroeduvison/openfang-core
cargo build
```

**Expected output**:
```
   Compiling openfang-types v0.1.0
   Compiling openfang-runtime v0.1.0
   Compiling openfang-kernel v0.1.0
    Finished dev [unoptimized + debuginfo] target(s)
```

### **2. Build AI Service**

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/ai-service
cargo build
```

### **3. Cài đặt Ollama (Local LLM)**

```bash
# macOS
brew install ollama

# Hoặc
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull llama3.2

# Start server
ollama serve
```

### **4. Cấu hình .env**

Tạo file `.env` trong `rust-services/ai-service/`:

```bash
# LLM Provider
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2

# Ollama settings
OLLAMA_BASE_URL=http://localhost:11434

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aeroeduvison

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
```

### **5. Chạy AI Service**

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/ai-service
cargo run
```

**Expected output**:
```
🤖 AI service starting on 127.0.0.1:8095
```

### **6. Test Exam Generation**

```bash
curl -X POST http://localhost:8095/api/ai/exam/generate-from-matrix \
  -H "Content-Type: application/json" \
  -d '{
    "matrix_id": "matrix_math_11_hk1_2026",
    "teacher_id": "teacher_123",
    "options": {
      "exam_variant": "A"
    }
  }'
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Week 1: Core Setup**

- [x] Create OpenFang workspace
- [x] Create openfang-types crate
- [x] Create openfang-runtime crate
- [x] Create openfang-kernel crate
- [ ] Build workspace successfully
- [ ] Test LLM drivers

### **Week 2: Exam Agent**

- [x] OpenFangExamAgent implementation
- [ ] Matrix analysis endpoint
- [ ] Exam generation endpoint
- [ ] Answer key generation
- [ ] Integration tests

---

## 🔧 **TROUBLESHOOTING**

### **Build Errors**

**Error**: `package openfang-kernel v0.1.0 cannot be built because it requires rustc 1.75`

**Solution**:
```bash
rustup update
rustup default stable
```

### **Ollama Connection Error**

**Error**: `Connection refused (os error 61)`

**Solution**:
```bash
# Check if Ollama is running
ollama serve

# Or check port
lsof -i :11434
```

### **Database Connection Error**

**Error**: `error connecting to database`

**Solution**:
```bash
# Check PostgreSQL is running
brew services list | grep postgres

# Restart if needed
brew services restart postgresql
```

---

## 📊 **NEXT STEPS**

### **Sau khi build thành công**:

1. **Test với ma trận thật**
   - Tạo ma trận trong database
   - Chạy exam generation
   - Kiểm tra kết quả

2. **Thêm API endpoints**
   - `/api/ai/exam/generate-multiple-variants`
   - `/api/ai/exam/preview/:exam_id`
   - `/api/ai/exam/swap-question`

3. **UI Integration**
   - Teacher dashboard component
   - Exam preview UI
   - Export PDF

---

## 📞 **SUPPORT**

**Documentation**:
- `docs/OPENFANG_PHASE1.md` - Implementation plan
- `openfang-core/*/src/lib.rs` - Source code

**Issues**:
- Check build logs
- Verify Ollama is running
- Check database connection

---

**Created**: March 8, 2026  
**Status**: 📋 Ready to Build  
**Priority**: 🔴 High
