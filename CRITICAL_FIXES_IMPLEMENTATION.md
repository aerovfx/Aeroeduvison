# 🔧 Critical Issues Fix Implementation Guide

**Date:** 2026-03-07  
**Priority:** CRITICAL  
**Status:** Implementation Guide

---

## Issue 1: Database Queries Not Implemented ❌→✅

### Problem
All 202 APIs are stubs with no actual SQL queries.

### Solution: Implement SQLx Queries

### Example Implementation Pattern

```rust
// Pattern 1: GET request with database query
async fn students_get(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<StudentsListResponse>, (StatusCode, Json<ErrorResponse>)> {
    // 1. Validate authentication
    let _user = extract_auth(&headers)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    // 2. Execute database query
    let students = sqlx::query_as::<_, DbStudent>(
        r#"SELECT id, name, email, role, created_at 
           FROM "User" 
           WHERE role = 'STUDENT' 
           ORDER BY name ASC 
           LIMIT 1000"#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        error!("Failed to fetch students: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // 3. Return response
    Ok(Json(StudentsListResponse { students }))
}

// Pattern 2: POST request with database insert
async fn courses_post(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateCourseRequest>,
) -> Result<Json<CourseResponse>, (StatusCode, Json<ErrorResponse>)> {
    // 1. Validate authentication
    let user = extract_auth(&headers)?;

    // 2. Validate input
    if payload.title.trim().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    // 3. Execute database insert
    let course = sqlx::query_as::<_, DbCourse>(
        r#"INSERT INTO courses (title, description, user_id) 
           VALUES ($1, $2, $3) 
           RETURNING *"#
    )
    .bind(&payload.title)
    .bind(&payload.description)
    .bind(&user.id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!("Failed to create course: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // 4. Return response
    Ok(Json(CourseResponse::from(course)))
}

// Pattern 3: GET by ID
async fn student_get(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(student_id): Path<String>,
) -> Result<Json<StudentDetailResponse>, (StatusCode, Json<ErrorResponse>)> {
    // 1. Validate authentication
    let _user = extract_auth(&headers)?;

    // 2. Execute database query
    let student = sqlx::query_as::<_, DbStudent>(
        r#"SELECT * FROM "User" WHERE id = $1 AND role = 'STUDENT'"#
    )
    .bind(&student_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!("Failed to fetch student: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    // 3. Return response
    Ok(Json(StudentDetailResponse::from(student)))
}

// Pattern 4: UPDATE request
async fn course_patch(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(course_id): Path<String>,
    Json(payload): Json<UpdateCourseRequest>,
) -> Result<Json<CourseResponse>, StatusCode> {
    // 1. Validate authentication
    let _user = extract_auth(&headers)?;

    // 2. Execute database update
    let course = sqlx::query_as::<_, DbCourse>(
        r#"UPDATE courses 
           SET title = COALESCE($1, title), 
               description = COALESCE($2, description),
               updated_at = NOW()
           WHERE id = $3 
           RETURNING *"#
    )
    .bind(payload.title)
    .bind(payload.description)
    .bind(&course_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!("Failed to update course: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(CourseResponse::from(course)))
}

// Pattern 5: DELETE request
async fn course_delete(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(course_id): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    // 1. Validate authentication
    let _user = extract_auth(&headers)?;

    // 2. Execute database delete
    let result = sqlx::query(
        r#"DELETE FROM courses WHERE id = $1"#
    )
    .bind(&course_id)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!("Failed to delete course: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // 3. Check if deleted
    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(Json(json!({ "success": true, "deleted": course_id })))
}
```

### Priority APIs to Implement (Top 20)

1. **Auth APIs** (Critical for login)
   - `POST /api/auth/login` - Query user + verify password
   - `POST /api/auth/register` - Insert new user

2. **Student APIs** (High usage)
   - `GET /api/students` - List students
   - `GET /api/teacher/students` - List with metrics

3. **Course APIs** (Core functionality)
   - `GET /api/courses` - List courses
   - `POST /api/courses` - Create course
   - `GET /api/courses/:id` - Get course detail

4. **Grading APIs** (Core functionality)
   - `GET /api/grading/:id` - Get submission
   - `POST /api/grading/submit` - Create submission
   - `PATCH /api/grading/:id` - Update grade

5. **Admin APIs** (Admin panel)
   - `GET /api/admin/users` - List users
   - `POST /api/admin/users` - Create user

### Implementation Steps

```bash
# 1. Create database connection pool
# Already done in main.rs main() function

# 2. Implement top 20 APIs with SQLx queries
# Use patterns above

# 3. Test each API
curl -H "Authorization: Bearer <token>" \
     http://localhost:8090/api/students

# 4. Verify database queries work
# Check logs for SQL queries
```

---

## Issue 2: Redis Not Used ❌→✅

### Problem
Redis client configured but not used anywhere.

### Solution: Implement Redis Caching Layer

### Implementation Pattern

```rust
// Add to AppState
#[derive(Clone)]
struct AppState {
    version: &'static str,
    ocr_backend_url: String,
    ocr_server_url: String,
    client: Client,
    db: PgPool,
    redis: redis::Client,  // ✅ Already exists, now use it!
}

// Pattern 1: Cache-Aside Pattern (GET requests)
async fn students_get(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<StudentsListResponse>, StatusCode> {
    let cache_key = "students:list";
    
    // 1. Try cache first
    let mut conn = state.redis.get_async_connection().await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if let Some(cached) = redis::cmd("GET")
        .arg(cache_key)
        .query_async::<_, Option<String>>(&mut conn)
        .await
        .ok()
        .flatten()
    {
        // Cache hit!
        if let Ok(response) = serde_json::from_str(&cached) {
            return Ok(Json(response));
        }
    }
    
    // 2. Cache miss - query database
    let students = sqlx::query_as::<_, DbStudent>(
        "SELECT * FROM \"User\" WHERE role = 'STUDENT' ORDER BY name ASC LIMIT 1000"
    )
    .fetch_all(&state.db)
    .await?;
    
    let response = StudentsListResponse { students };
    
    // 3. Cache the result (TTL: 5 minutes)
    let serialized = serde_json::to_string(&response).unwrap();
    redis::cmd("SETEX")
        .arg(cache_key)
        .arg(300)  // 5 minutes TTL
        .arg(&serialized)
        .query_async::<_, ()>(&mut conn)
        .await
        .ok();
    
    Ok(Json(response))
}

// Pattern 2: Cache Invalidation (POST/PUT/DELETE)
async fn courses_post(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateCourseRequest>,
) -> Result<Json<CourseResponse>, StatusCode> {
    // 1. Create course in database
    let course = sqlx::query_as::<_, DbCourse>(/* ... */).fetch_one(&state.db).await?;
    
    // 2. Invalidate cache
    let mut conn = state.redis.get_async_connection().await.ok();
    if let Some(ref mut conn) = conn {
        redis::cmd("DEL")
            .arg("courses:list")  // Invalidate list cache
            .query_async::<_, ()>(conn)
            .await
            .ok();
    }
    
    Ok(Json(CourseResponse::from(course)))
}

// Pattern 3: Session Storage
async fn auth_login_post(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthLoginResponse>, StatusCode> {
    // 1. Verify credentials (database query)
    let user = verify_credentials(&state.db, &payload.email, &payload.password).await?;
    
    // 2. Generate JWT token
    let token = generate_jwt_token(&user)?;
    
    // 3. Store session in Redis (TTL: 24 hours)
    let mut conn = state.redis.get_async_connection().await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let session_key = format!("session:{}", user.id);
    redis::cmd("SETEX")
        .arg(&session_key)
        .arg(86400)  // 24 hours
        .arg(&token)
        .query_async::<_, ()>(&mut conn)
        .await
        .ok();
    
    Ok(Json(AuthLoginResponse { token, user }))
}
```

### Redis Use Cases

| Use Case | Key Pattern | TTL | Priority |
|----------|------------|-----|----------|
| **Student List** | `students:list` | 5 min | High |
| **Course List** | `courses:list` | 10 min | High |
| **User Session** | `session:{user_id}` | 24 hours | Critical |
| **JWT Blacklist** | `jwt:blacklist:{jti}` | 24 hours | Critical |
| **Rate Limiting** | `ratelimit:{ip}:{endpoint}` | 1 min | High |
| **Search Results** | `search:{query_hash}` | 15 min | Medium |
| **API Response** | `api:{path}:{params}` | 5 min | Medium |

### Implementation Steps

```bash
# 1. Ensure Redis is running
docker run -d -p 6379:6379 redis:latest

# 2. Set REDIS_URL environment variable
export REDIS_URL="redis://localhost:6379"

# 3. Implement Redis in top 10 APIs
# Start with session storage for auth

# 4. Add cache-aside for read-heavy APIs
# students, courses, etc.

# 5. Add cache invalidation for write APIs
# POST, PUT, DELETE operations

# 6. Monitor Redis usage
redis-cli MONITOR
redis-cli INFO memory
```

---

## Issue 3: CI/CD Missing ❌→✅

### Problem
No automated pipelines, testing, or deployment.

### Solution: GitHub Actions CI/CD

### Implementation

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [siri, main]
  pull_request:
    branches: [main]

env:
  CARGO_TERM_COLOR: always
  RUST_VERSION: 1.75.0
  NODE_VERSION: 18.x

jobs:
  # Job 1: Rust Backend Tests
  rust-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:latest
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - name: Install Rust
        uses: dtolnay/rust-action@stable
        with:
          toolchain: ${{ env.RUST_VERSION }}
      
      - name: Cache Cargo dependencies
        uses: Swatinem/rust-cache@v2
        with:
          working-directory: rust-services/aero-backend
      
      - name: Run Rust tests
        working-directory: rust-services/aero-backend
        env:
          DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
        run: |
          cargo test --verbose
      
      - name: Check Rust code formatting
        working-directory: rust-services/aero-backend
        run: cargo fmt -- --check
      
      - name: Run Rust linter
        working-directory: rust-services/aero-backend
        run: cargo clippy -- -D warnings

  # Job 2: Build Rust Backend
  rust-build:
    runs-on: ubuntu-latest
    needs: rust-test
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Rust
        uses: dtolnay/rust-action@stable
      
      - name: Build Rust backend (release)
        working-directory: rust-services/aero-backend
        run: cargo build --release
      
      - name: Upload Rust binary
        uses: actions/upload-artifact@v3
        with:
          name: aero-backend
          path: rust-services/aero-backend/target/release/aero-backend

  # Job 3: Next.js Tests
  nextjs-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Next.js lint
        run: npm run lint
      
      - name: Run Next.js tests
        run: npm test
      
      - name: Build Next.js app
        run: npm run build

  # Job 4: Deploy to Staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: [rust-build, nextjs-test]
    if: github.ref == 'refs/heads/siri'
    environment: staging
    steps:
      - uses: actions/checkout@v3
      
      - name: Download Rust binary
        uses: actions/download-artifact@v3
        with:
          name: aero-backend
      
      - name: Deploy to staging server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/aeroedu/staging
            ./deploy.sh

  # Job 5: Deploy to Production
  deploy-production:
    runs-on: ubuntu-latest
    needs: [rust-build, nextjs-test]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Download Rust binary
        uses: actions/download-artifact@v3
        with:
          name: aero-backend
      
      - name: Deploy to production server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/aeroedu/production
            ./deploy.sh
```

### Docker Build & Push

```yaml
# .github/workflows/docker-build.yml
name: Docker Build & Push

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push Rust backend
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./Dockerfile.aero-backend
          push: true
          tags: |
            aerovfx/aero-backend:latest
            aerovfx/aero-backend:${{ github.sha }}
          cache-from: type=registry,ref=aerovfx/aero-backend:buildcache
          cache-to: type=registry,ref=aerovfx/aero-backend:buildcache,mode=max
      
      - name: Build and push Vector service
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./Dockerfile.vector-sim
          push: true
          tags: |
            aerovfx/vector-sim:latest
            aerovfx/vector-sim:${{ github.sha }}
```

### Implementation Steps

```bash
# 1. Create GitHub workflows directory
mkdir -p .github/workflows

# 2. Add CI/CD workflow files
# - ci.yml (main CI/CD pipeline)
# - docker-build.yml (Docker images)

# 3. Configure GitHub repository secrets
# - STAGING_HOST, STAGING_USER, STAGING_SSH_KEY
# - PRODUCTION_HOST, PRODUCTION_USER, PRODUCTION_SSH_KEY
# - DOCKER_USERNAME, DOCKER_PASSWORD

# 4. Create staging/production environments in GitHub

# 5. Test CI/CD pipeline
git push origin siri  # Should trigger staging deployment
```

---

## Implementation Timeline

### Week 1: Database Queries
- [ ] Implement top 20 APIs with SQLx queries
- [ ] Test all database queries
- [ ] Add error handling and logging

### Week 2: Redis Integration
- [ ] Implement session storage
- [ ] Add cache-aside for read APIs
- [ ] Add cache invalidation for write APIs
- [ ] Monitor Redis performance

### Week 3: CI/CD Pipeline
- [ ] Create GitHub Actions workflows
- [ ] Configure repository secrets
- [ ] Test CI/CD pipeline
- [ ] Deploy to staging environment

### Week 4: Production Deployment
- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Fix any issues
- [ ] Document deployment process

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| **APIs with DB queries** | 0/202 | 202/202 | 100% ✅ |
| **Redis cache hit rate** | 0% | 60-80% | >60% ✅ |
| **CI/CD coverage** | 0% | 100% | 100% ✅ |
| **Deployment time** | Manual | 5 min | <10 min ✅ |
| **Test coverage** | 0% | 80% | >70% ✅ |

---

**All 3 critical issues will be resolved after implementation!** 🚀
