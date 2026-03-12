# 🦀 Rust Error Handling - Result vs Option Mastery

**Date**: March 9, 2026  
**Experience Level**: TypeScript/JavaScript → Rust  
**Difficulty**: ⭐⭐⭐ (Moderate)

---

## 📊 **ERROR HANDLING OVERVIEW**

### **Key Differences from TypeScript/JavaScript**

| Concept | TypeScript/JavaScript | Rust |
|---------|----------------------|------|
| **Error type** | `Error` class, `throw/catch` | `Result<T, E>`, `Option<T>` |
| **Null/undefined** | `null`, `undefined` | `Option<T>` (`Some`/`None`) |
| **Error propagation** | `throw` / `try-catch` | `?` operator, `match` |
| **Type safety** | Runtime errors | Compile-time errors |
| **Exhaustive handling** | No (can forget catch) | Yes (must handle all cases) |
| **Error types** | Any type (usually `Error`) | Custom error enums |

---

## 🎯 **OPTION<T> - NULLABLE VALUES**

### **What is Option?**

```rust
enum Option<T> {
    Some(T),  // Has a value
    None,     // No value (like null/undefined)
}
```

### **When to Use Option**

```rust
// ✅ Use Option when:
// - Value might be missing
// - Searching in collection
// - Optional function parameter
// - Field might not exist

// ❌ Don't use Option when:
// - Value is always present
// - Error with context needed (use Result)
```

### **Basic Usage**

```rust
// Creating Options
let some_value: Option<i32> = Some(5);
let no_value: Option<i32> = None;

// TypeScript equivalent:
// const someValue: number | null = 5;
// const noValue: number | null = null;
```

---

## 🚨 **COMMON OPTION ERRORS**

### **Error 1: Using Value Without Checking**

```rust
// ❌ ERROR: can't use Option<T> as T
let maybe_value: Option<i32> = Some(5);
let value = maybe_value + 1;  // ERROR!

// ✅ SOLUTION 1: Match
let value = match maybe_value {
    Some(v) => v + 1,
    None => 0,  // Default value
};

// ✅ SOLUTION 2: unwrap_or
let value = maybe_value.unwrap_or(0) + 1;

// ✅ SOLUTION 3: map
let value = maybe_value.map(|v| v + 1).unwrap_or(0);

// ✅ SOLUTION 4: if let
if let Some(v) = maybe_value {
    let value = v + 1;
}
```

**Real-World Example from Our Migration**:

```rust
// ❌ ERROR in exam_generation.rs
let exam = db.get_exam(exam_id).await?;
let questions = exam.questions;  // Option<Vec<Question>>
let count = questions.len();  // ERROR!

// ✅ FIXED
let exam = db.get_exam(exam_id).await?;
let questions = exam.questions.unwrap_or_default();
let count = questions.len();

// OR BETTER
let exam = db.get_exam(exam_id).await?;
let count = exam.questions.map(|q| q.len()).unwrap_or(0);
```

---

### **Error 2: Unwrap Without Checking**

```rust
// ❌ DANGEROUS: Will panic if None
let maybe_value: Option<i32> = get_value();
let value = maybe_value.unwrap();  // PANIC if None!

// ✅ SAFE: Handle None case
let value = match maybe_value {
    Some(v) => v,
    None => return Err(Error::ValueNotFound),
};

// ✅ BETTER: Use ? with ok_or
let value = maybe_value.ok_or(Error::ValueNotFound)?;

// ✅ BEST: Use if let for early return
if let Some(value) = maybe_value {
    // Use value here
} else {
    return Err(Error::ValueNotFound);
}
```

**Real-World Example**:

```rust
// ❌ DANGEROUS in handlers/exam_generation.rs
let teacher = db.get_teacher(teacher_id).await?;
let school_id = teacher.school_id.unwrap();  // PANIC if None!

// ✅ SAFE
let teacher = db.get_teacher(teacher_id).await?;
let school_id = teacher.school_id.ok_or_else(|| {
    AiError::NotFound("Teacher has no school".to_string())
})?;

// OR BETTER: Database query should return school_id directly
let school_id = db.get_teacher_school_id(teacher_id).await?
    .ok_or_else(|| AiError::NotFound("Teacher not found".to_string()))?;
```

---

### **Error 3: Nested Options**

```rust
// ❌ HARD TO READ: Nested options
let result: Option<Option<i32>> = get_nested();

// ✅ BETTER: Flatten with flatten()
let result: Option<i32> = get_nested().flatten();

// ✅ BEST: Use and_then for chaining
let result = get_first()
    .and_then(|v| get_second(v))
    .and_then(|v| get_third(v));
```

**Real-World Example**:

```rust
// ❌ NESTED OPTIONS
fn get_exam_question(exam_id: &str, question_id: &str) -> Option<Option<Question>> {
    let exam = get_exam(exam_id)?;  // Option<Exam>
    let question = exam.questions?;  // Option<Vec<Question>>
    let q = questions.iter().find(|q| q.id == question_id)?;  // Option<&Question>
    Some(Some(q.clone()))  // Option<Option<Question>>
}

// ✅ FLATTENED
fn get_exam_question(exam_id: &str, question_id: &str) -> Option<Question> {
    let exam = get_exam(exam_id)?;
    let questions = exam.questions?;
    let q = questions.iter().find(|q| q.id == question_id)?;
    Some(q.clone())
}

// ✅ BEST: Using and_then
fn get_exam_question(exam_id: &str, question_id: &str) -> Option<Question> {
    get_exam(exam_id)
        .and_then(|exam| exam.questions)
        .and_then(|questions| questions.iter().find(|q| q.id == question_id).cloned())
}
```

---

## 🎯 **RESULT<T, E> - ERROR HANDLING**

### **What is Result?**

```rust
enum Result<T, E> {
    Ok(T),   // Success with value
    Err(E),  // Error with error type
}
```

### **When to Use Result**

```rust
// ✅ Use Result when:
// - Operation can fail
// - Need error context
// - Database queries
// - File I/O
// - Network requests

// ❌ Don't use Result when:
// - Value is optional but not an error
// - Success/failure is binary (use bool)
```

### **Basic Usage**

```rust
// Creating Results
let success: Result<i32, String> = Ok(5);
let failure: Result<i32, String> = Err("Something went wrong".to_string());

// TypeScript equivalent:
// type Result<T, E> = { success: true; value: T } | { success: false; error: E };
```

---

## 🚨 **COMMON RESULT ERRORS**

### **Error 1: Ignoring Result**

```rust
// ❌ WARNING: unused Result
some_function_that_returns_result();  // Warning!

// ✅ FIXED: Handle the result
some_function_that_returns_result()?;  // Propagate error

// OR
match some_function_that_returns_result() {
    Ok(_) => { /* Success */ },
    Err(e) => { /* Handle error */ },
}

// OR (if you really want to ignore)
let _ = some_function_that_returns_result();  // Explicitly ignore
```

**Real-World Example**:

```rust
// ❌ WARNING in cache service
cache_exam(exam_id, exam);  // Result ignored

// ✅ FIXED
if let Err(e) = cache_exam(exam_id, exam) {
    tracing::warn!("Failed to cache exam: {}", e);
}

// OR
let _ = cache_exam(exam_id, exam);  // Explicitly ignore
```

---

### **Error 2: Unwrap on Result**

```rust
// ❌ DANGEROUS: Will panic on error
let value = risky_operation().unwrap();  // PANIC if Err!

// ✅ SAFE: Handle error
let value = match risky_operation() {
    Ok(v) => v,
    Err(e) => return Err(e),
};

// ✅ BETTER: Use ? operator
let value = risky_operation()?;

// ✅ BEST: Add context with map_err
let value = risky_operation()
    .map_err(|e| AiError::Database(format!("Query failed: {}", e)))?;
```

**Real-World Example from Our Migration**:

```rust
// ❌ DANGEROUS in main.rs
let pool = sqlx::postgres::PgPool::connect(&database_url).await.unwrap();
// PANIC if database is down!

// ✅ SAFE
let pool = sqlx::postgres::PgPool::connect(&database_url).await
    .expect("Failed to create database pool");
// Still panics, but with clear message

// ✅ BEST
let pool = sqlx::postgres::PgPool::connect(&database_url).await?;
// Propagates error to caller
```

---

### **Error 3: Wrong Error Type**

```rust
// ❌ ERROR: mismatched error types
fn process_exam(exam_id: &str) -> Result<Exam, AiError> {
    let exam = db.get_exam(exam_id).await?;  // sqlx::Error
    let cached = cache.get(&exam_id).await?;  // redis::Error
    Ok(exam)
}

// ✅ FIXED: Map errors to custom type
fn process_exam(exam_id: &str) -> Result<Exam, AiError> {
    let exam = db.get_exam(exam_id).await
        .map_err(|e| AiError::Database(e.to_string()))?;
    let cached = cache.get(&exam_id).await
        .map_err(|e| AiError::Cache(e.to_string()))?;
    Ok(exam)
}

// ✅ BETTER: Use From trait
impl From<sqlx::Error> for AiError {
    fn from(err: sqlx::Error) -> Self {
        AiError::Database(err.to_string())
    }
}

impl From<redis::Error> for AiError {
    fn from(err: redis::Error) -> Self {
        AiError::Cache(err.to_string())
    }
}

// Then use ? directly
fn process_exam(exam_id: &str) -> Result<Exam, AiError> {
    let exam = db.get_exam(exam_id).await?;  // Auto-converted
    let cached = cache.get(&exam_id).await?;  // Auto-converted
    Ok(exam)
}
```

---

### **Error 4: Not Using ? Operator**

```rust
// ❌ VERBOSE: Manual error handling
fn process_exam(exam_id: &str) -> Result<Exam, AiError> {
    match db.get_exam(exam_id).await {
        Ok(exam) => match validate_exam(&exam) {
            Ok(_) => Ok(exam),
            Err(e) => Err(e),
        },
        Err(e) => Err(AiError::Database(e.to_string())),
    }
}

// ✅ CONCISE: Using ? operator
fn process_exam(exam_id: &str) -> Result<Exam, AiError> {
    let exam = db.get_exam(exam_id).await?;
    validate_exam(&exam)?;
    Ok(exam)
}
```

**Real-World Example**:

```rust
// ❌ VERBOSE in exam_generation.rs
pub async fn generate_exam_from_matrix(
    State(state): State<AppState>,
    Json(body): Json<GenerateExamRequest>,
) -> Result<Json<GenerateExamResponse>, AiError> {
    match state.openfang_agent.read().await {
        Ok(agent) => match agent.generate_exam(&body.matrix_id, &body.teacher_id).await {
            Ok(exam) => Ok(Json(GenerateExamResponse {
                success: true,
                exam_id: exam.exam_id.clone(),
                exam: exam,
                message: "Success".to_string(),
                generation_time_ms: 0,
            })),
            Err(e) => Err(AiError::OpenFangError(e.to_string())),
        },
        Err(e) => Err(AiError::Internal(e.to_string())),
    }
}

// ✅ CONCISE
pub async fn generate_exam_from_matrix(
    State(state): State<AppState>,
    Json(body): Json<GenerateExamRequest>,
) -> Result<Json<GenerateExamResponse>, AiError> {
    let agent = state.openfang_agent.read().await;
    let generated = agent.generate_exam(&body.matrix_id, &body.teacher_id).await?;
    
    Ok(Json(GenerateExamResponse {
        success: true,
        exam_id: generated.exam_id.clone(),
        exam: generated,
        message: "Exam generated successfully".to_string(),
        generation_time_ms: 0,
    }))
}
```

---

## 🛠️ **ERROR HANDLING PATTERNS**

### **Pattern 1: Custom Error Type**

```rust
// File: src/error.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AiError {
    #[error("Unauthorized")]
    Unauthorized,

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("OpenFang error: {0}")]
    OpenFangError(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

pub type Result<T> = std::result::Result<T, AiError>;
```

**Usage**:

```rust
// Automatic conversion with #[from]
fn get_exam(exam_id: &str) -> Result<Exam> {
    let exam = db.get_exam(exam_id).await?;  // sqlx::Error auto-converted
    Ok(exam)
}

// Manual conversion
fn validate_exam(exam: &Exam) -> Result<()> {
    if exam.questions.is_empty() {
        return Err(AiError::InvalidRequest("Exam has no questions".to_string()));
    }
    Ok(())
}
```

---

### **Pattern 2: Option to Result Conversion**

```rust
// Using ok_or
let value: Option<i32> = get_value();
let result: Result<i32, String> = value.ok_or("Value not found".to_string());

// Using ok_or_else (lazy evaluation)
let result: Result<i32, String> = value.ok_or_else(|| {
    expensive_error_creation()
});

// Real-world example
fn get_teacher_school_id(teacher_id: &str) -> Result<String> {
    let teacher = db.get_teacher(teacher_id).await?;
    teacher.school_id.ok_or_else(|| {
        AiError::NotFound(format!("Teacher {} has no school", teacher_id))
    })
}
```

---

### **Pattern 3: Chaining Operations**

```rust
// ❌ VERBOSE: Nested matches
fn process_exam(exam_id: &str) -> Result<Exam> {
    match get_exam(exam_id) {
        Ok(exam) => match validate_exam(&exam) {
            Ok(_) => match cache_exam(&exam) {
                Ok(_) => Ok(exam),
                Err(e) => Err(e),
            },
            Err(e) => Err(e),
        },
        Err(e) => Err(e),
    }
}

// ✅ CONCISE: Using ? operator
fn process_exam(exam_id: &str) -> Result<Exam> {
    let exam = get_exam(exam_id)?;
    validate_exam(&exam)?;
    cache_exam(&exam)?;
    Ok(exam)
}

// ✅ FUNCTIONAL: Using and_then
fn process_exam(exam_id: &str) -> Result<Exam> {
    get_exam(exam_id)
        .and_then(|exam| {
            validate_exam(&exam)?;
            Ok(exam)
        })
        .and_then(|exam| {
            cache_exam(&exam)?;
            Ok(exam)
        })
}
```

---

### **Pattern 4: Error Context**

```rust
// Using map_err to add context
let exam = db.get_exam(exam_id).await
    .map_err(|e| AiError::Database(format!("Failed to get exam {}: {}", exam_id, e)))?;

// Using with_context from anyhow crate
use anyhow::Context;

let exam = db.get_exam(exam_id).await
    .context(format!("Failed to get exam {}", exam_id))?;

// Real-world example from our code
pub async fn generate_exam(
    &self,
    matrix_id: &str,
    teacher_id: &str,
) -> Result<GeneratedExam> {
    let matrix = self.fetch_matrix(matrix_id).await
        .map_err(|e| OpenFangError::Database(format!(
            "Failed to fetch matrix {}: {}", matrix_id, e
        )))?;
    
    let analysis = self.analyze_matrix(&matrix).await
        .map_err(|e| OpenFangError::Analysis(format!(
            "Failed to analyze matrix: {}", e
        )))?;
    
    // ... rest of implementation
}
```

---

### **Pattern 5: Multiple Error Types**

```rust
// ❌ ERROR: Can't mix error types
fn process() -> Result<(), sqlx::Error> {
    let exam = db.get_exam().await?;  // sqlx::Error
    let cached = cache.get().await?;   // redis::Error - ERROR!
    Ok(())
}

// ✅ SOLUTION 1: Custom error enum
#[derive(Error, Debug)]
pub enum ProcessError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Cache error: {0}")]
    Cache(#[from] redis::Error),
}

fn process() -> Result<(), ProcessError> {
    let exam = db.get_exam().await?;  // Auto-converted
    let cached = cache.get().await?;   // Auto-converted
    Ok(())
}

// ✅ SOLUTION 2: Use anyhow (for applications)
use anyhow::Result;

fn process() -> Result<()> {
    let exam = db.get_exam().await?;
    let cached = cache.get().await?;
    Ok(())
}
```

---

## 🎯 **TYPESCRIPT → RUST ERROR TRANSLATION**

### **Try-Catch → Result**

```typescript
// TypeScript
async function processExam(examId: string): Promise<Exam> {
  try {
    const exam = await db.getExam(examId);
    validateExam(exam);
    return exam;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new ApiError('Exam not found', 404);
    }
    throw error;
  }
}
```

```rust
// Rust
async fn process_exam(exam_id: &str) -> Result<Exam, AiError> {
    let exam = db.get_exam(exam_id).await?;  // Like throw
    validate_exam(&exam)?;
    Ok(exam)
}

// Error conversion in handler
impl IntoResponse for AiError {
    fn into_response(self) -> Response {
        match self {
            AiError::NotFound(_) => {
                (StatusCode::NOT_FOUND, Json(json!({ "error": self.to_string() })))
            }
            AiError::Database(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": self.to_string() })))
            }
            // ... other cases
        }
    }
}
```

### **Null/Undefined → Option**

```typescript
// TypeScript
function getTeacherSchool(teacherId: string): string | null {
  const teacher = getTeacher(teacherId);
  return teacher?.schoolId ?? null;
}
```

```rust
// Rust
fn get_teacher_school(teacher_id: &str) -> Option<String> {
    get_teacher(teacher_id)
        .and_then(|t| t.school_id)
}
```

### **Union Types → Result/Option**

```typescript
// TypeScript
type Result<T, E> = { success: true; value: T } | { success: false; error: E };

function process(): Result<string, Error> {
  try {
    return { success: true, value: "success" };
  } catch (e) {
    return { success: false, error: e };
  }
}
```

```rust
// Rust
fn process() -> Result<String, Error> {
    Ok("success".to_string())
    // or
    Err(Error::new("something went wrong"))
}
```

---

## 📊 **OUR ERROR HANDLING JOURNEY**

### **Errors Encountered**

| Error Type | Count | Resolution Time |
|------------|-------|-----------------|
| Ignoring Result | 20 | 2-5 min each |
| Unwrap on Option/Result | 15 | 5-10 min each |
| Wrong error type | 12 | 10-20 min each |
| Not using ? operator | 18 | 5-10 min each |
| Nested Options | 8 | 10-15 min each |
| Missing From trait | 10 | 15-30 min each |

**Total Error Handling Errors**: **83**  
**Average Resolution Time**: **10 minutes**  
**Total Time Spent**: **~14 hours**

### **Breakthrough Moments**

1. **Day 3**: "`?` is like try-catch but compile-time!"
2. **Day 4**: "Option is like `T | null` but type-safe!"
3. **Day 5**: "`From` trait auto-converts errors!"
4. **Day 6**: "`thiserror` makes custom errors easy!"

---

## 💡 **BEST PRACTICES**

### **1. Use Custom Error Types**

```rust
// ✅ GOOD: Custom error enum
#[derive(Error, Debug)]
pub enum AiError {
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
}

// ❌ BAD: Using String for errors
type Result<T> = std::result::Result<T, String>;
```

### **2. Use ? Operator**

```rust
// ✅ GOOD: Concise with ?
fn process() -> Result<Exam> {
    let exam = get_exam()?;
    validate(&exam)?;
    Ok(exam)
}

// ❌ BAD: Verbose match
fn process() -> Result<Exam> {
    match get_exam() {
        Ok(exam) => match validate(&exam) {
            Ok(_) => Ok(exam),
            Err(e) => Err(e),
        },
        Err(e) => Err(e),
    }
}
```

### **3. Add Error Context**

```rust
// ✅ GOOD: With context
let exam = db.get_exam(exam_id).await
    .map_err(|e| AiError::Database(format!("Failed to get exam {}: {}", exam_id, e)))?;

// ❌ BAD: No context
let exam = db.get_exam(exam_id).await?;
```

### **4. Don't Unwrap in Production**

```rust
// ✅ GOOD: Handle error
let value = maybe_value.ok_or(AiError::NotFound("Value not found"))?;

// ❌ BAD: Will panic
let value = maybe_value.unwrap();
```

### **5. Implement From for Error Conversion**

```rust
// ✅ GOOD: Automatic conversion
impl From<sqlx::Error> for AiError {
    fn from(err: sqlx::Error) -> Self {
        AiError::Database(err.to_string())
    }
}

// Then use ? directly
let exam = db.get_exam().await?;  // Auto-converted
```

---

## ✅ **CHECKLIST: ERROR HANDLING MASTERY**

### **Beginner** (Week 1)
- [ ] Understand `Option<T>`
- [ ] Understand `Result<T, E>`
- [ ] Use `match` for handling
- [ ] Use `if let` for patterns
- [ ] Use `unwrap_or` for defaults

### **Intermediate** (Week 2)
- [ ] Use `?` operator
- [ ] Create custom error types
- [ ] Implement `From` trait
- [ ] Convert Option to Result
- [ ] Add error context

### **Advanced** (Week 3+)
- [ ] Use `thiserror` crate
- [ ] Use `anyhow` for applications
- [ ] Chain operations with `and_then`
- [ ] Flatten nested Options
- [ ] Teach error handling to others

---

## 🎓 **LEARNING RESOURCES**

### **Best Resources**

1. **Rust Book - Chapter 9**
   - Error Handling
   - URL: https://doc.rust-lang.org/book/ch09-00-error-handling.html

2. **Rust by Example - Error Handling**
   - Interactive examples
   - URL: https://doc.rust-lang.org/rust-by-example/error.html

3. **thiserror Crate**
   - Custom error types made easy
   - URL: https://github.com/dtolnay/thiserror

---

## 🎉 **CONCLUSION**

### **Error Handling Assessment**: 🟢 **EXCELLENT**

**Benefits**:
- ✅ **Type-safe** (compile-time checking)
- ✅ **Exhaustive** (must handle all cases)
- ✅ **Composable** (chain with `?`)
- ✅ **Expressive** (custom error types)
- ✅ **No hidden exceptions** (explicit errors)

**Challenges**:
- ⏰ **Learning curve** (different from try-catch)
- 🧠 **Verbose** (more code than throw/catch)
- ⚡ **Error conversion** (need From trait)

**ROI**: **Exceptional** - Compile-time error handling prevents runtime crashes and makes code more reliable.

### **Final Advice**

> "Rust's error handling forces you to think about failure cases upfront. It's annoying at first, but makes your code bulletproof."

**Tips**:
1. **Use `?` liberally** - It's your friend
2. **Create custom errors** - Use `thiserror`
3. **Add context** - Help debugging
4. **Don't unwrap** - Handle errors properly
5. **Implement `From`** - Auto-conversion is magic

---

**Created**: March 9, 2026  
**Author**: Backend Team  
**Experience**: TypeScript → Rust  
**Status**: ✅ **Error Handling Conquered**

🦀 **RESULTS ARE YOUR FRIEND!**
