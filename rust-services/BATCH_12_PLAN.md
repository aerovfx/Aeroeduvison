# Batch 12: Remaining APIs & Cleanup - Final Phase

**Status**: 📋 Planning & Consolidation
**Date**: March 8, 2026
**Target**: 100% completion (172/172 APIs)

---

## 📊 Current Status

**Completed**: 88/172 APIs (51.2%)
**Remaining**: 84/172 APIs (48.8%)

---

## 🎯 Batch 12 Strategy

Thay vì tạo thêm services mới, Batch 12 sẽ:

1. **Consolidate** - Gộp các APIs còn lại vào existing services
2. **Remove** - Xóa test/debug endpoints không cần thiết
3. **Deprecate** - Ngừng sử dụng legacy APIs
4. **Migrate** - Migrate critical APIs còn lại

---

## 📋 Remaining APIs by Category

### 1. Chat & Messaging (4 APIs) → Consolidate into `ai-service`

| Route | Action | Priority |
|-------|--------|----------|
| `/api/chat/rooms` | GET, POST | 🟢 Low |
| `/api/chat/rooms/[roomId]/messages` | GET, POST | 🟢 Low |
| `/api/chat/messages` | GET | 🟢 Low |

**Action**: Add to `ai-service` (port 8095) as chat endpoints

---

### 2. Question Bank (3 APIs) → Consolidate into `media-service`

| Route | Action | Priority |
|-------|--------|----------|
| `/api/question-bank` | GET, POST | 🟡 Medium |
| `/api/question-bank/[id]` | GET, PUT, DELETE | 🟡 Medium |

**Action**: Add to `media-service` (port 8098) as question endpoints

---

### 3. XP & Rewards (2 APIs) → Consolidate into `student-service`

| Route | Action | Priority |
|-------|--------|----------|
| `/api/user/xp` | GET, POST | 🟢 Low |
| `/api/xp/analyze/[studentId]` | GET | 🟢 Low |

**Action**: Add to `student-service` (port 8096) as XP endpoints

---

### 4. Search (1 API) → Consolidate into `ai-service`

| Route | Action | Priority |
|-------|--------|----------|
| `/api/search` | GET, POST | 🟡 Medium |

**Action**: Add to `ai-service` with semantic search using vector similarity

---

### 5. Webhooks (1 API) → Create minimal handler

| Route | Action | Priority |
|-------|--------|----------|
| `/api/webhook` | POST | 🟢 Low |

**Action**: Add simple webhook handler to `admin-service`

---

### 6. Test/Debug Endpoints (~10 APIs) → REMOVE ❌

| Route | Action |
|-------|--------|
| `/api/test` | DELETE |
| `/api/test-auth` | DELETE |
| `/api/test-db` | DELETE |
| `/api/test-user` | DELETE |
| `/api/test-cookies` | DELETE |
| `/api/test-session` | DELETE |
| `/api/test-auth-session` | DELETE |
| `/api/test-auth-edge-cases` | DELETE |
| `/api/test-auth-redirects` | DELETE |
| `/api/test-role-access` | DELETE |

**Action**: Remove from codebase - not needed in production

---

### 7. Physics/Chemistry Specific (~15 APIs) → Consolidate into `stem-service`

| Route Group | APIs | Action |
|-------------|------|--------|
| Physics Sims | `/api/motion-sim`, `/api/motionsim`, `/api/projectile`, `/api/refraction`, `/api/harmonic-motion`, `/api/physics-motion` | Merge into `stem-service` |
| Chemistry | `/api/chemistry-lab`, `/api/chemlab-3d`, `/api/chemlab/balance`, `/api/chemlab/enthalpy`, `/api/chemlab/molecule/3d` | Merge into `stem-service` |
| Other Science | `/api/aerodynamics`, `/api/aeroflow-3d`, `/api/biogrowth`, `/api/mechaforce`, `/api/thermoflow`, `/api/optics-lab`, `/api/weather-sim` | Deprecate or merge |

**Action**: Consolidate into existing `stem-service` endpoints

---

### 8. Other Utilities (~48 APIs) → Consolidate/Deprecate

#### Admin Utilities (keep in `admin-service`)
- `/api/admin` - Already exists
- `/api/admin/alerts` - Already exists
- `/api/admin/auth-logs` - Already exists
- `/api/admin/overview` - Already exists
- `/api/admin/stats` - Already exists

#### Auth Utilities (keep in `auth-service`)
- `/api/auth/[...nextauth]` - Keep for NextAuth compatibility
- `/api/auth/verify` - Already exists
- `/api/auth/login` - Already exists
- `/api/auth/register` - Already exists

#### Course Utilities (keep in `course-service`)
- Already consolidated

#### PLG/Student (keep in `student-service`)
- `/api/plg/[studentId]` - Already exists
- `/api/plg/[studentId]/recommendations` - Already exists
- `/api/plg/[studentId]/record-interaction` - Already exists
- `/api/plg/[studentId]/update-skill` - Already exists

#### Legacy/Unused (DEPRECATE)
- `/api/labtwin` - Deprecate
- `/api/datasim-ai` - Deprecate
- `/api/debug-auth` - Remove
- `/api/debug-db` - Remove
- `/api/debug-nextauth` - Remove
- `/api/debug-session` - Remove
- `/api/check-env` - Remove
- `/api/checkenv` - Remove
- `/api/health` - Keep (consolidate)
- `/api/metrics` - Keep (consolidate into admin-service)

#### Upload/Media (keep in `media-service`)
- `/api/upload` - Consolidate
- `/api/uploadthing` - Deprecate
- `/api/image-signed-url` - Consolidate into media-service

#### AI/Tutor (keep in `ai-service`)
- `/api/ai-chat` - Already exists
- `/api/ai-tutor-chat` - Already exists
- `/api/ai-content/*` - Already exists
- `/api/ai-generate-lesson` - Already exists
- `/api/ai-grade-lesson` - Already exists
- `/api/ai-intelligent/generate` - Deprecate
- `/api/ai/analyze-document` - Already exists
- `/api/ai-analytics/dashboard` - Already exists

#### Grading (keep in existing services)
- `/api/grading/*` - Deprecate (use AI grading instead)
- `/api/ollama-grading` - Deprecate (use Rust LLM grading)

#### Sync/Stream (DEPRECATE)
- `/api/sync/data` - Deprecate
- `/api/sync/stream` - Deprecate
- `/api/streaming/sync` - Deprecate

#### Learning Paths (keep in `student-service`)
- `/api/learning-paths` - Already exists
- `/api/learning-path/create` - Already exists

#### Classes/Students (keep in `student-service`)
- `/api/students` - Already exists
- `/api/classes` - Already exists
- `/api/classes/[id]` - Already exists
- `/api/classes/[id]/students` - Already exists
- `/api/classes/[id]/students/[studentId]` - Already exists

#### Teacher (DEPRECATE - use admin endpoints)
- `/api/teacher/stats` - Deprecate
- `/api/teacher/students` - Deprecate
- `/api/teacher/students/[studentId]` - Deprecate

#### Motion/Physics (consolidate into `stem-service`)
- `/api/motion-sim` - Consolidate
- `/api/motionsim` - Consolidate
- `/api/projectile` - Consolidate
- `/api/refraction` - Consolidate
- `/api/harmonic-motion` - Consolidate
- `/api/physics-motion` - Consolidate

#### Documents (keep in `media-service`)
- `/api/documents` - Already exists
- `/api/documents/[id]` - Already exists
- `/api/documents/[id]/process` - Already exists
- `/api/documents/[id]/save-result` - Consolidate
- `/api/documents/file/[...path]` - Consolidate
- `/api/documents/fix-status` - Consolidate
- `/api/documents/upload` - Already exists

#### Exams (keep in `media-service`)
- `/api/exam-matrices` - Already exists
- `/api/exam-matrices/[id]` - Already exists
- `/api/exam-matrices/[id]/duplicate` - Consolidate
- `/api/exam-matrices/[id]/process` - Already exists
- `/api/exam-matrices/digitize` - Consolidate
- `/api/exam-matrices/file/[...path]` - Consolidate
- `/api/exams/generate-from-matrix` - Already exists

#### Content Generation (DEPRECATE - use AI service)
- `/api/content-generation/batch` - Deprecate
- `/api/content-generation/generate` - Deprecate
- `/api/content-generation/validate` - Deprecate

#### Other (REVIEW & CONSOLIDATE)
- `/api/redis/cache` - Deprecate
- `/api/redis/health` - Deprecate
- `/api/queue/jobs` - Deprecate
- `/api/motion-tracking` - Deprecate
- `/api/update-learning-progress` - Consolidate into student-service
- `/api/assignments/grade-ocr` - Already in aero-backend
- `/api/blocking/courses` - Deprecate
- `/api/learning-paths` - Already exists

---

## 📈 Final API Distribution

After consolidation, final distribution will be:

| Service | Port | APIs (Final) |
|---------|------|--------------|
| `vector-sim-service` | 8091 | 3 |
| `aero-backend` | 8090 | 10 |
| `auth-service` | 8092 | 12 |
| `course-service` | 8093 | 16 |
| `admin-service` | 8094 | 15 |
| `ai-service` | 8095 | 18 |
| `student-service` | 8096 | 18 |
| `stem-service` | 8097 | 20 |
| `media-service` | 8098 | 20 |
| **Removed/Deprecated** | - | ~40 |
| **Total** | - | **~172** |

---

## ✅ Batch 12 Checklist

### Phase 1: Consolidation (Week 12, Days 1-3)
- [ ] Add chat endpoints to `ai-service`
- [ ] Add question bank to `media-service`
- [ ] Add XP endpoints to `student-service`
- [ ] Add search to `ai-service`
- [ ] Add webhook handler to `admin-service`
- [ ] Consolidate physics/chemistry into `stem-service`

### Phase 2: Cleanup (Week 12, Days 4-5)
- [ ] Remove all `/api/test*` endpoints
- [ ] Remove `/api/debug*` endpoints
- [ ] Remove `/api/check*` endpoints
- [ ] Deprecate legacy grading endpoints
- [ ] Deprecate sync/stream endpoints

### Phase 3: Documentation (Week 12, Days 6-7)
- [ ] Update API documentation
- [ ] Create migration guide for deprecated endpoints
- [ ] Update service README files
- [ ] Create final architecture diagram

### Phase 4: Testing & Deployment (Week 12, Days 8-10)
- [ ] Test all consolidated endpoints
- [ ] Run full integration tests
- [ ] Deploy to staging
- [ ] Run canary tests
- [ ] Deploy to production
- [ ] Monitor for 48 hours

---

## 🎉 Completion Milestones

### Current: 51.2% (88/172 APIs)

**After Batch 12 Completion**:
- ✅ 100% of critical APIs migrated
- ✅ ~40 test/debug endpoints removed
- ✅ Clean, maintainable codebase
- ✅ 9 Rust services in production
- ✅ ~5,500+ lines of Rust code
- ✅ 10-100x performance improvements

---

## 📊 Expected Final Statistics

| Metric | Current | Target |
|--------|---------|--------|
| APIs Migrated | 88 | 132 |
| APIs Removed | 0 | ~40 |
| Rust Services | 9 | 9 |
| Lines of Rust | ~5,122 | ~6,000 |
| Performance Gain | 3-5x | 5-10x avg |
| Code Maintainability | Medium | High |

---

## 🚀 Post-Migration Benefits

1. **Performance**: 5-10x faster API responses
2. **Reliability**: Type-safe, memory-safe code
3. **Scalability**: Better resource utilization
4. **Maintainability**: Clear service boundaries
5. **Observability**: Unified logging & metrics
6. **Cost**: Lower server costs (Rust is more efficient)

---

## 📝 Recommendations

### For Production Deployment
1. Keep Node.js as fallback for 2 weeks after migration
2. Monitor error rates closely during canary rollout
3. Have rollback plan ready for each service
4. Document all breaking changes
5. Update client SDKs if needed

### For Future Development
1. All new APIs should be in Rust
2. Use existing service patterns
3. Follow established conventions
4. Add comprehensive tests
5. Document thoroughly

---

**Created**: March 8, 2026
**Status**: 📋 Planning & Consolidation
**Target Completion**: Week 12 (March 29, 2026)
**Confidence**: 🟢 High (all critical APIs already migrated)
