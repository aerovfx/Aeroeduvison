/**
 * LaTeX Compilation Benchmark Script
 * 
 * Tests and compares performance of:
 * - Original compiler (no cache)
 * - Optimized compiler (with cache)
 * - Cache hit performance
 * - Parallel compilation
 * - Different document sizes
 */

import { compileLatexToPdf } from "@/lib/latex-compile";
import { compileLatexToPdfOptimized, clearCache, getCacheStats, compileBatch } from "@/lib/latex-compile-optimized";

// Test documents of different sizes
const TEST_DOCUMENTS = {
  small: `
\\documentclass{article}
\\begin{document}
Hello World!
\\end{document}
`,
  medium: `
\\documentclass{article}
\\title{Sample Document}
\\author{Test Author}
\\date{\\today}
\\begin{document}
\\maketitle
\\section{Introduction}
This is a medium-sized document with some content.
\\subsection{Background}
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
\\subsection{Methodology}
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
\\section{Results}
Ut enim ad minim veniam, quis nostrud exercitation.
\\section{Conclusion}
Duis aute irure dolor in reprehenderit in voluptate.
\\end{document}
`,
  large: `
\\documentclass{article}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\title{Complex Mathematical Document}
\\author{Test Author}
\\date{\\today}
\\begin{document}
\\maketitle
\\begin{abstract}
This is a large document with complex mathematical formulas and multiple sections.
\\end{abstract}
\\tableofcontents
\\section{Introduction}
\\subsection{Background}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
\\subsection{Related Work}
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
\\section{Mathematical Formulas}
\\begin{equation}
E = mc^2
\\end{equation}
\\begin{equation}
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
\\end{equation}
\\begin{align}
f(x) &= ax^2 + bx + c \\\\
f'(x) &= 2ax + b \\\\
f''(x) &= 2a
\\end{align}
\\section{Tables and Figures}
\\begin{table}[h]
\\centering
\\begin{tabular}{|c|c|c|}
\\hline
A & B & C \\\\
\\hline
1 & 2 & 3 \\\\
4 & 5 & 6 \\\\
\\hline
\\end{tabular}
\\caption{Sample Table}
\\end{table}
\\section{Results}
\\subsection{Experiment 1}
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
\\subsection{Experiment 2}
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
\\section{Discussion}
Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
\\section{Conclusion}
Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.
\\begin{thebibliography}{9}
\\bibitem{ref1} Author A. Title A. Journal A, 2020.
\\bibitem{ref2} Author B. Title B. Journal B, 2021.
\\end{thebibliography}
\\end{document}
`,
};

interface BenchmarkResult {
  name: string;
  documentSize: string;
  compileTime: number;
  cached: boolean;
  success: boolean;
  pdfSize?: number;
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function benchmarkCompile(
  name: string,
  content: string,
  useOptimized = false,
  expectCache = false
): Promise<BenchmarkResult> {
  const startTime = Date.now();
  
  try {
    const result = useOptimized
      ? await compileLatexToPdfOptimized(content)
      : await compileLatexToPdf(content);
    
    const compileTime = Date.now() - startTime;
    
    if (result.error) {
      return {
        name,
        documentSize: content.length.toString(),
        compileTime,
        cached: result.cached ?? false,
        success: false,
        error: result.error,
      };
    }
    
    return {
      name,
      documentSize: content.length.toString(),
      compileTime,
      cached: result.cached ?? false,
      success: true,
      pdfSize: result.pdf?.length,
    };
  } catch (error: any) {
    return {
      name,
      documentSize: content.length.toString(),
      compileTime: Date.now() - startTime,
      cached: false,
      success: false,
      error: error.message,
    };
  }
}

async function runBenchmarks() {
  console.log("🚀 LaTeX Compilation Benchmark");
  console.log("=" .repeat(60));
  console.log("");
  
  const results: BenchmarkResult[] = [];
  
  // Clear cache before starting
  console.log("🧹 Clearing cache...");
  await clearCache();
  await sleep(100);
  
  // Test 1: Original compiler (no cache)
  console.log("\n📊 Test 1: Original Compiler (No Cache)");
  console.log("-".repeat(60));
  for (const [size, content] of Object.entries(TEST_DOCUMENTS)) {
    console.log(`  Testing ${size} document...`);
    const result = await benchmarkCompile(`Original-${size}`, content, false);
    results.push(result);
    console.log(`    ✓ ${result.success ? 'Success' : 'Failed'} | ${result.compileTime}ms | ${result.pdfSize ? (result.pdfSize / 1024).toFixed(2) + ' KB' : 'N/A'}`);
    await sleep(500); // Wait between tests
  }
  
  // Test 2: Optimized compiler (first compile, no cache)
  console.log("\n📊 Test 2: Optimized Compiler (First Compile)");
  console.log("-".repeat(60));
  for (const [size, content] of Object.entries(TEST_DOCUMENTS)) {
    console.log(`  Testing ${size} document...`);
    const result = await benchmarkCompile(`Optimized-1st-${size}`, content, true);
    results.push(result);
    console.log(`    ✓ ${result.success ? 'Success' : 'Failed'} | ${result.compileTime}ms | Cached: ${result.cached} | ${result.pdfSize ? (result.pdfSize / 1024).toFixed(2) + ' KB' : 'N/A'}`);
    await sleep(500);
  }
  
  // Test 3: Optimized compiler (cache hit)
  console.log("\n📊 Test 3: Optimized Compiler (Cache Hit)");
  console.log("-".repeat(60));
  for (const [size, content] of Object.entries(TEST_DOCUMENTS)) {
    console.log(`  Testing ${size} document (cached)...`);
    const result = await benchmarkCompile(`Optimized-Cache-${size}`, content, true, true);
    results.push(result);
    const speedup = results.find(r => r.name === `Optimized-1st-${size}`)?.compileTime ?? 1;
    const speedupRatio = speedup / (result.compileTime || 1);
    console.log(`    ✓ ${result.success ? 'Success' : 'Failed'} | ${result.compileTime}ms | Cached: ${result.cached} | ${speedupRatio.toFixed(1)}x faster`);
    await sleep(100);
  }
  
  // Test 4: Parallel compilation
  console.log("\n📊 Test 4: Parallel Compilation (4 documents)");
  console.log("-".repeat(60));
  const parallelStart = Date.now();
  const parallelResults = await compileBatch([
    TEST_DOCUMENTS.small,
    TEST_DOCUMENTS.medium,
    TEST_DOCUMENTS.small,
    TEST_DOCUMENTS.medium,
  ]);
  const parallelTime = Date.now() - parallelStart;
  const successCount = parallelResults.filter(r => !r.error).length;
  console.log(`  ✓ Completed ${successCount}/4 in ${parallelTime}ms`);
  console.log(`    Average: ${(parallelTime / 4).toFixed(0)}ms per document`);
  
  // Test 5: Sequential compilation (for comparison)
  console.log("\n📊 Test 5: Sequential Compilation (4 documents)");
  console.log("-".repeat(60));
  const sequentialStart = Date.now();
  for (const content of [TEST_DOCUMENTS.small, TEST_DOCUMENTS.medium, TEST_DOCUMENTS.small, TEST_DOCUMENTS.medium]) {
    await compileLatexToPdfOptimized(content);
  }
  const sequentialTime = Date.now() - sequentialStart;
  console.log(`  ✓ Completed 4/4 in ${sequentialTime}ms`);
  console.log(`    Average: ${(sequentialTime / 4).toFixed(0)}ms per document`);
  
  // Get cache stats
  const cacheStats = await getCacheStats();
  console.log("\n📊 Cache Statistics:");
  console.log("-".repeat(60));
  console.log(`  Cached files: ${cacheStats.count}`);
  console.log(`  Cache size: ${(cacheStats.size / 1024).toFixed(2)} KB`);
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📈 SUMMARY");
  console.log("=".repeat(60));
  
  // Calculate averages
  for (const size of ['small', 'medium', 'large']) {
    const original = results.find(r => r.name === `Original-${size}`);
    const optimized = results.find(r => r.name === `Optimized-1st-${size}`);
    const cached = results.find(r => r.name === `Optimized-Cache-${size}`);
    
    if (original && optimized && cached) {
      const optSpeedup = original.compileTime / (optimized.compileTime || 1);
      const cacheSpeedup = original.compileTime / (cached.compileTime || 1);
      
      console.log(`\n${size.toUpperCase()} Document:`);
      console.log(`  Original:      ${original.compileTime}ms`);
      console.log(`  Optimized:     ${optimized.compileTime}ms (${optSpeedup.toFixed(1)}x faster)`);
      console.log(`  Cache Hit:     ${cached.compileTime}ms (${cacheSpeedup.toFixed(1)}x faster)`);
    }
  }
  
  console.log("\nParallel vs Sequential:");
  const parallelAvg = parallelTime / 4;
  const sequentialAvg = sequentialTime / 4;
  const parallelSpeedup = sequentialTime / parallelTime;
  console.log(`  Parallel:    ${parallelTime}ms (${parallelAvg.toFixed(0)}ms avg per doc)`);
  console.log(`  Sequential:  ${sequentialTime}ms (${sequentialAvg.toFixed(0)}ms avg per doc)`);
  console.log(`  Speedup:     ${parallelSpeedup.toFixed(1)}x faster`);
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ Benchmark Complete!");
  console.log("=".repeat(60));
  
  // Export results to JSON
  const fs = await import("node:fs/promises");
  const report = {
    timestamp: new Date().toISOString(),
    results,
    parallel: {
      time: parallelTime,
      success: successCount,
      total: 4,
    },
    sequential: {
      time: sequentialTime,
    },
    cache: cacheStats,
  };
  
  await fs.writeFile(
    "tmp/benchmark-results.json",
    JSON.stringify(report, null, 2)
  );
  console.log("\n📄 Results saved to: tmp/benchmark-results.json");
}

// Run benchmarks
runBenchmarks().catch(console.error);
