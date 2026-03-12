# 📊 LaTeX Benchmark Guide

## 🎯 Mục Đích

Đo lường và so sánh hiệu suất của:
- **Original compiler** (không cache)
- **Optimized compiler** (có cache)
- **Cache hit performance**
- **Parallel compilation**

---

## 🚀 Quick Start

### Run Benchmark

```bash
# Using shell script (recommended)
./scripts/benchmark-latex.sh

# Or using tsx directly
npx tsx scripts/benchmark-latex.ts
```

### Output

```
🚀 LaTeX Compilation Benchmark
============================================================

🧹 Clearing cache...

📊 Test 1: Original Compiler (No Cache)
------------------------------------------------------------
  Testing small document...
    ✓ Success | 15234ms | 12.34 KB
  Testing medium document...
    ✓ Success | 18456ms | 45.67 KB
  Testing large document...
    ✓ Success | 25678ms | 123.45 KB

📊 Test 2: Optimized Compiler (First Compile)
------------------------------------------------------------
  Testing small document...
    ✓ Success | 12345ms | Cached: false | 12.34 KB
  ...

📊 Test 3: Optimized Compiler (Cache Hit)
------------------------------------------------------------
  Testing small document (cached)...
    ✓ Success | 87ms | Cached: true | 142.3x faster
  ...

✅ Benchmark Complete!
📄 Results saved to: tmp/benchmark-results.json
```

---

## 📊 Test Scenarios

### Test 1: Original Compiler
- **Purpose:** Baseline performance
- **Cache:** Disabled
- **Expected:** 15-30s per document

### Test 2: Optimized Compiler (First Compile)
- **Purpose:** Optimized performance without cache
- **Cache:** Empty
- **Expected:** 10-20s per document (33% faster)

### Test 3: Optimized Compiler (Cache Hit)
- **Purpose:** Cache performance
- **Cache:** Pre-populated
- **Expected:** <100ms (99% faster)

### Test 4: Parallel Compilation
- **Purpose:** Concurrent compilation performance
- **Documents:** 4 documents in parallel
- **Expected:** 3-4x faster than sequential

### Test 5: Sequential Compilation
- **Purpose:** Baseline for parallel comparison
- **Documents:** 4 documents sequentially
- **Expected:** 4x single compile time

---

## 📁 Test Documents

### Small Document
- **Size:** ~100 bytes
- **Content:** Simple "Hello World"
- **Complexity:** Minimal

### Medium Document
- **Size:** ~500 bytes
- **Content:** Multiple sections, subsections
- **Complexity:** Low

### Large Document
- **Size:** ~2KB
- **Content:** Math formulas, tables, bibliography
- **Complexity:** High

---

## 📈 Metrics Measured

| Metric | Description |
|--------|-------------|
| **Compile Time** | Time to generate PDF (ms) |
| **Cache Hit** | Whether result was cached |
| **PDF Size** | Output file size (KB) |
| **Speedup Ratio** | Comparison vs baseline |
| **Parallel Throughput** | Documents per second |

---

## 🔧 Configuration

### Environment Variables

```bash
# Set cache directory
export LATEX_CACHE_DIR=/path/to/cache

# Set max concurrent compilations
export LATEX_MAX_CONCURRENT=4

# Set timeout (ms)
export LATEX_TIMEOUT=60000
```

### Modify Test Documents

Edit `scripts/benchmark-latex.ts`:

```typescript
const TEST_DOCUMENTS = {
  small: `...`,  // Customize
  medium: `...`, // Customize
  large: `...`,  // Customize
};
```

---

## 📊 Results Format

### Console Output

```
SMALL Document:
  Original:      15234ms
  Optimized:     12345ms (1.2x faster)
  Cache Hit:     87ms (175.1x faster)

Parallel vs Sequential:
  Parallel:    4567ms (1142ms avg per doc)
  Sequential:  18234ms (4559ms avg per doc)
  Speedup:     4.0x faster
```

### JSON Report

```json
{
  "timestamp": "2026-03-10T10:30:00.000Z",
  "results": [
    {
      "name": "Original-small",
      "documentSize": "123",
      "compileTime": 15234,
      "cached": false,
      "success": true,
      "pdfSize": 12634
    }
  ],
  "parallel": {
    "time": 4567,
    "success": 4,
    "total": 4
  },
  "sequential": {
    "time": 18234
  },
  "cache": {
    "count": 6,
    "size": 256789
  }
}
```

---

## 🎯 Expected Results

### Typical Performance

| Scenario | Time | Speedup |
|----------|------|---------|
| **Original (small)** | 15-20s | 1.0x |
| **Optimized (small)** | 10-15s | 1.3-1.5x |
| **Cache Hit (small)** | <100ms | 150-200x |
| **Parallel (4 docs)** | 20-40s | 3-4x |

### Performance Factors

**Faster:**
- Simple documents
- Precompiled format available
- Cache hits
- SSD storage

**Slower:**
- Complex math formulas
- Many packages
- First compilation
- HDD storage

---

## 🔍 Troubleshooting

### Issue: Benchmark fails with "ENOENT"

**Solution:** Install TeX Live or Tectonic

```bash
# macOS
brew install --cask mactex

# Linux
sudo apt install texlive-xetex texlive-latex-extra

# Or use Tectonic
cargo install tectonic
```

### Issue: Cache not working

**Solution:** Check cache directory permissions

```bash
# Check cache directory
ls -la tmp/latex-cache

# Clear cache
rm -rf tmp/latex-cache
```

### Issue: Parallel compilation slow

**Solution:** Reduce concurrent compilations

```typescript
// In latex-compile-optimized.ts
const CONFIG = {
  MAX_CONCURRENT: 2, // Reduce from 4 to 2
};
```

---

## 📊 Analyzing Results

### Key Metrics to Watch

1. **Cache Hit Rate**
   ```
   Cache Hits / Total Compilations
   Target: >70%
   ```

2. **Average Compile Time**
   ```
   Sum of compile times / Number of compilations
   Target: <15s for first compile, <100ms for cached
   ```

3. **Parallel Speedup**
   ```
   Sequential Time / Parallel Time
   Target: >3x for 4 documents
   ```

### Performance Optimization Tips

1. **Increase Cache Hit Rate**
   - Reuse document templates
   - Avoid unnecessary changes
   - Use version control for LaTeX

2. **Reduce Compile Time**
   - Use precompiled format
   - Minimize package usage
   - Split large documents

3. **Improve Parallel Performance**
   - Increase MAX_CONCURRENT (if system allows)
   - Use SSD storage
   - Reduce memory usage per compilation

---

## 🎊 Conclusion

**Benchmark script provides:**
- ✅ Comprehensive performance testing
- ✅ Cache effectiveness measurement
- ✅ Parallel compilation comparison
- ✅ JSON report for analysis
- ✅ Easy to run and customize

**Run benchmark regularly to:**
- Monitor performance degradation
- Validate optimizations
- Compare different configurations
- Identify bottlenecks

**Ready to benchmark!** 🚀
