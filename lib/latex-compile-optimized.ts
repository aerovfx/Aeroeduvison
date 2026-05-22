/**
 * Optimized LaTeX to PDF Compilation
 * Features:
 * - Content-based caching (SHA-256)
 * - Precompiled format support
 * - Parallel compilation queue
 * - Optimized temp directory handling
 */

import { writeFile, readFile, mkdir, rm, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { platform, tmpdir } from "node:os";
import { env } from "node:process";
import { createHash } from "node:crypto";
import { latexCache } from "@/lib/redis/cache-latex";

const execFileAsync = promisify(execFile);

// Configuration
const CONFIG = {
  TIMEOUT_MS: 60_000, // Reduced from 90s to 60s
  MAX_BUFFER: 4 * 1024 * 1024, // Increased to 4MB
  CACHE_DIR: join(process.cwd(), "tmp", "latex-cache"),
  FORMAT_DIR: join(process.cwd(), "tmp", "latex-format"),
  MAX_CONCURRENT: 4, // Max parallel compilations
} as const;

// Cache interface
interface CacheEntry {
  pdfPath: string;
  logPath: string;
  timestamp: number;
  size: number;
}

// Compilation queue
class CompileQueue {
  private queue: Array<{
    content: string;
    resolve: (result: CompileResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private active = 0;

  constructor(private maxConcurrent: number) {}

  async add(content: string): Promise<CompileResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ content, resolve, reject });
      this.process();
    });
  }

  private async process() {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const { content, resolve, reject } = this.queue.shift()!;
      this.active++;
      compileWithCache(content)
        .then(resolve, reject)
        .finally(() => {
          this.active--;
          this.process();
        });
    }
  }
}

const compileQueue = new CompileQueue(CONFIG.MAX_CONCURRENT);

function getTexEnv(): NodeJS.ProcessEnv {
  const base = { ...env };
  const extra: string[] = [];
  if (platform() === "darwin") {
    extra.push("/Library/TeX/texbin", "/usr/local/bin", "/opt/homebrew/bin");
  }
  if (extra.length) {
    const existing = base.PATH ?? "";
    base.PATH = [...extra, existing].join(process.platform === "win32" ? ";" : ":");
  }
  return base;
}

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

async function getCached(content: string): Promise<CacheEntry | null> {
  const hash = computeHash(content);
  const cachePath = join(CONFIG.CACHE_DIR, `${hash}.pdf`);
  const logPath = join(CONFIG.CACHE_DIR, `${hash}.log`);
  
  try {
    await access(cachePath);
    const stats = await readFile(cachePath + ".meta", "utf8");
    const meta = JSON.parse(stats) as CacheEntry;
    return { ...meta, pdfPath: cachePath, logPath };
  } catch {
    return null;
  }
}

async function setCache(content: string, pdf: Buffer, log: string): Promise<void> {
  await mkdir(CONFIG.CACHE_DIR, { recursive: true });
  const hash = computeHash(content);
  const pdfPath = join(CONFIG.CACHE_DIR, `${hash}.pdf`);
  const logPath = join(CONFIG.CACHE_DIR, `${hash}.log`);
  const metaPath = join(CONFIG.CACHE_DIR, `${hash}.pdf.meta`);
  
  await writeFile(pdfPath, pdf);
  await writeFile(logPath, log);
  await writeFile(
    metaPath,
    JSON.stringify({
      timestamp: Date.now(),
      size: pdf.length,
    } as CacheEntry)
  );
  
  // Cleanup old cache (keep last 100)
  await cleanupCache();
}

async function cleanupCache(): Promise<void> {
  try {
    const files = await readFile(CONFIG.CACHE_DIR, { withFileTypes: true })
      .then(dirents => dirents
        .filter(d => d.isFile() && d.name.endsWith(".pdf.meta"))
        .map(d => join(CONFIG.CACHE_DIR, d.name))
      )
      .catch(() => []);
    
    if (files.length > 100) {
      const sorted = await Promise.all(
        files.map(async f => ({
          path: f,
          mtime: (await readFile(f, "utf8").then(JSON.parse) as CacheEntry).timestamp,
        }))
      ).then(arr => arr.sort((a, b) => b.mtime - a.mtime));
      
      for (const file of sorted.slice(100)) {
        const base = file.path.replace(".pdf.meta", "");
        await rm(base + ".pdf", { force: true });
        await rm(base + ".log", { force: true });
        await rm(file.path, { force: true });
      }
    }
  } catch {}
}

export interface CompileResult {
  pdf?: Buffer;
  error?: string;
  code?: string;
  log?: string;
  cached?: boolean;
  compileTime?: number;
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync(command, ["--version"], {
      timeout: 5_000,
      maxBuffer: 128 * 1024,
      env: getTexEnv(),
    });
    return true;
  } catch (err: any) {
    if (err?.code === "ENOENT") return false;
    return true;
  }
}

function getInstallHint(): string {
  const os = platform();
  if (os === "darwin") {
    return "macOS: brew install --cask mactex (or basictex) or brew install tectonic";
  }
  if (os === "linux") {
    return "Linux: sudo apt install texlive-xetex texlive-latex-extra — or cargo install tectonic";
  }
  return "Install TeX Live (xelatex) or Tectonic (cargo install tectonic)";
}

async function runInDir(
  cwd: string,
  command: string,
  args: string[],
  customEnv?: NodeJS.ProcessEnv
): Promise<{ success: boolean; stdout: string; stderr: string; timedOut?: boolean }> {
  const execEnv = customEnv ?? getTexEnv();
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      timeout: CONFIG.TIMEOUT_MS,
      maxBuffer: CONFIG.MAX_BUFFER,
      env: execEnv,
    });
    return { success: true, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") };
  } catch (err: unknown) {
    const e = err as { killed?: boolean; code?: string; message?: string; stdout?: string; stderr?: string };
    const timedOut = e.killed || e.code === 124 || String(e.message ?? "").includes("timeout");
    return {
      success: false,
      stdout: String(e.stdout ?? ""),
      stderr: String(e.stderr ?? "").trim() ? String(e.stderr) : (e.code === "ENOENT" ? `spawn ENOENT: ${String(e.message)}` : String(e.message)),
      timedOut,
    };
  }
}

async function runXelatex(cwd: string, useFormat = false): Promise<{ success: boolean; stdout: string; stderr: string; timedOut?: boolean }> {
  const args = [
    "-interaction=nonstopmode",
    "-halt-on-error",
    "-no-shell-escape",
    "-recorder",
    "-file-line-error",
  ];
  
  // Use precompiled format if available
  if (useFormat) {
    const fmtPath = join(CONFIG.FORMAT_DIR, "latex.fmt");
    try {
      await access(fmtPath);
      args.push(`-fmt=${fmtPath}`);
    } catch {}
  }
  
  args.push("main.tex");

  if (platform() === "linux") {
    const firejailResult = await runInDir(
      cwd,
      "firejail",
      [`--private=${cwd}`, "--net=none", "--rlimit-cpu=60", "--", "xelatex", ...args]
    );
    if (!firejailResult.stderr.includes("not found")) {
      return firejailResult;
    }
  }

  return runInDir(cwd, "xelatex", args);
}

async function runTectonic(cwd: string): Promise<{ success: boolean; stdout: string; stderr: string; timedOut?: boolean }> {
  return runInDir(cwd, "tectonic", ["main.tex"]);
}

async function createPrecompiledFormat(): Promise<boolean> {
  try {
    await mkdir(CONFIG.FORMAT_DIR, { recursive: true });
    const fmtPath = join(CONFIG.FORMAT_DIR, "latex.fmt");
    
    // Check if format already exists
    await access(fmtPath);
    return true;
  } catch {
    // Format doesn't exist, create it
    try {
      const tempDir = join(tmpdir(), `latex-fmt-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
      
      // Create minimal LaTeX file for format generation
      await writeFile(
        join(tempDir, "init.tex"),
        "\\input{article}\n\\endinput\n"
      );
      
      // Generate format (this takes time but only once)
      const result = await runInDir(
        tempDir,
        "xelatex",
        ["-ini", "-interaction=nonstopmode", "&latex", "init.tex"]
      );
      
      if (result.success) {
        // Move format to cache
        const generatedFmt = join(tempDir, "latex.fmt");
        try {
          await access(generatedFmt);
          await writeFile(join(CONFIG.FORMAT_DIR, "latex.fmt"), await readFile(generatedFmt));
          await rm(tempDir, { recursive: true, force: true });
          return true;
        } catch {}
      }
      
      await rm(tempDir, { recursive: true, force: true });
      return false;
    } catch {
      return false;
    }
  }
}

async function compileWithCache(content: string): Promise<CompileResult> {
  const startTime = Date.now();
  const hash = computeHash(content);
  
  // Check Redis cache first
  const cached = await latexCache.getPdf(hash);
  if (cached) {
    await latexCache.recordCacheHit();
    return {
      pdf: cached.pdf,
      log: cached.log,
      cached: true,
      compileTime: Date.now() - startTime,
    };
  }
  
  // Use shared temp directory
  const tmpBase = join(tmpdir(), "latex-compile");
  const tmpDir = join(tmpBase, `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`);

  try {
    const [hasXelatex, hasTectonic] = await Promise.all([
      commandExists("xelatex"),
      commandExists("tectonic"),
    ]);
    if (!hasXelatex && !hasTectonic) {
      return {
        error: `Compile LaTeX server-side chưa khả dụng. LaTeX engine chưa được cài đặt. ${getInstallHint()}`,
        code: "COMPILE_NOT_AVAILABLE",
      };
    }

    await mkdir(tmpDir, { recursive: true });
    const mainPath = join(tmpDir, "main.tex");
    const outPath = join(tmpDir, "main.pdf");
    await writeFile(mainPath, content, "utf8");

    let log = "";
    let primaryOk = true;
    const useFormat = await createPrecompiledFormat();

    // Primary: 2 passes xelatex (with precompiled format)
    for (let pass = 0; pass < 2; pass++) {
      const out = await runXelatex(tmpDir, useFormat && pass > 0);
      log += [out.stdout, out.stderr].filter(Boolean).join("\n") + "\n";
      if (out.timedOut) {
        return { error: "Compilation timed out", code: "COMPILE_TIMEOUT", log };
      }
      if (!out.success) {
        primaryOk = false;
        break;
      }
    }

    if (primaryOk) {
      try {
        const pdf = await readFile(outPath);
        // Cache in Redis
        await latexCache.cachePdf(hash, pdf, log);
        return { pdf, log, compileTime: Date.now() - startTime };
      } catch {}
    }

    // Fallback: tectonic
    log += "\n--- fallback: tectonic ---\n";
    const tectonicOut = await runTectonic(tmpDir);
    log += [tectonicOut.stdout, tectonicOut.stderr].filter(Boolean).join("\n");
    if (tectonicOut.timedOut) {
      return { error: "Compilation timed out", code: "COMPILE_TIMEOUT", log };
    }
    try {
      const pdf = await readFile(outPath);
      await latexCache.cachePdf(hash, pdf, log);
      return { pdf, log, compileTime: Date.now() - startTime };
    } catch {
      return {
        error: "Compilation failed. XeLaTeX/Tectonic is available but the document has compile errors.",
        code: "COMPILE_ERROR",
        log,
      };
    }
  } finally {
    try {
      await rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Optimized compile with queue and caching
 */
export async function compileLatexToPdfOptimized(content: string): Promise<CompileResult> {
  return compileQueue.add(content);
}

/**
 * Batch compile multiple documents in parallel
 */
export async function compileBatch(contents: string[]): Promise<CompileResult[]> {
  return Promise.all(contents.map(c => compileQueue.add(c)));
}

/**
 * Clear compilation cache
 */
export async function clearCache(): Promise<void> {
  await rm(CONFIG.CACHE_DIR, { recursive: true, force: true });
  await rm(CONFIG.FORMAT_DIR, { recursive: true, force: true });
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ count: number; size: number }> {
  return latexCache.getStats();
}
