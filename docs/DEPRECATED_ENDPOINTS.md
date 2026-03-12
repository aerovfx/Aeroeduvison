# ⚠️ Deprecated Endpoints

**Last Updated**: March 8, 2026
**Status**: Marked for Removal in Batch 12

---

## 🗑️ Endpoints Removed (Phase 2 Cleanup)

### Test Endpoints (12 files)
These endpoints were used for development/testing and are not needed in production:

| Endpoint | Method | Reason for Removal |
|----------|--------|-------------------|
| `/api/test` | ALL | Development testing |
| `/api/test-auth` | ALL | Auth testing |
| `/api/test-auth-cleanup` | ALL | Auth cleanup testing |
| `/api/test-auth-edge-cases` | ALL | Edge case testing |
| `/api/test-auth-redirects` | ALL | Redirect testing |
| `/api/test-auth-session` | ALL | Session testing |
| `/api/test-cookies` | ALL | Cookie testing |
| `/api/test-credentials` | ALL | Credential testing |
| `/api/test-db` | ALL | Database testing |
| `/api/test-role-access` | ALL | Role access testing |
| `/api/test-session` | ALL | Session testing |
| `/api/test-user` | ALL | User testing |

### Debug Endpoints (4 files)
Debug endpoints should not be in production:

| Endpoint | Method | Reason for Removal |
|----------|--------|-------------------|
| `/api/debug-auth` | GET | Auth debugging |
| `/api/debug-db` | GET | Database debugging |
| `/api/debug-nextauth` | GET | NextAuth debugging |
| `/api/debug-session` | GET | Session debugging |

### Check Endpoints (2 files)
Redundant health check endpoints:

| Endpoint | Method | Reason for Removal | Replacement |
|----------|--------|-------------------|-------------|
| `/api/check-env` | GET | Environment checking | Use `/health` endpoints |
| `/api/checkenv` | GET | Environment checking | Use `/health` endpoints |

---

## 📋 Total Removed: 18 Files

**Impact**: 
- Reduces attack surface
- Removes unused code
- Simplifies codebase
- No production impact (test/dev only)

---

## 🔄 Migration Guide

### For Developers

If you were using these endpoints for testing:

#### Testing Authentication
**Before**: `GET /api/test-auth`
**After**: Use Rust auth-service health endpoint
```bash
curl http://127.0.0.1:8092/health
```

#### Testing Database
**Before**: `GET /api/test-db`
**After**: Use service-specific health endpoints
```bash
curl http://127.0.0.1:8090/health  # aero-backend
curl http://127.0.0.1:8091/health  # vector-sim
curl http://127.0.0.1:8092/health  # auth-service
```

#### Environment Checks
**Before**: `GET /api/check-env`
**After**: Use health endpoints with database_connected status
```bash
curl http://127.0.0.1:8092/health | jq '.database_connected'
```

---

## 📝 Related Documentation

- [RUST_MIGRATION_PROGRESS.md](./RUST_MIGRATION_PROGRESS.md) - Overall migration progress
- [BATCH_12_PLAN.md](./rust-services/BATCH_12_PLAN.md) - Batch 12 consolidation plan
- [RUST_MIGRATION_FINAL_REPORT.md](./RUST_MIGRATION_FINAL_REPORT.md) - Final project report

---

## ⏰ Timeline

- **March 8, 2026**: Endpoints marked for removal
- **March 9-10, 2026**: Cleanup script execution
- **March 11, 2026**: Verification and documentation update

---

**Questions?** Contact: Backend Team
