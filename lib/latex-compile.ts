/**
 * LaTeX to PDF compilation.
 * No Docker: primary = local xelatex (optional firejail on Linux), fallback = tectonic.
 */

import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { platform } from "node:os";
import { env } from "node:process";

/** PATH thêm thư mục TeX (macOS: /Library/TeX/texbin) để process Node tìm thấy xelatex/tectonic. */
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

const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 90_000;
const MAX_BUFFER = 2 * 1024 * 1024;

export interface CompileResult {
  pdf?: Buffer;
  error?: string;
  code?: string;
  log?: string;
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
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      env: execEnv,
    });
    return {
      success: true,
      stdout: String(stdout ?? ""),
      stderr: String(stderr ?? ""),
    };
  } catch (err: unknown) {
    const e = err as { killed?: boolean; code?: string; message?: string; stdout?: string; stderr?: string };
    const timedOut = e.killed || e.code === 124 || String(e.message ?? "").includes("timeout");
    const msg = e.message ?? String(err);
    return {
      success: false,
      stdout: String(e.stdout ?? ""),
      stderr: String(e.stderr ?? "").trim() ? String(e.stderr) : (e.code === "ENOENT" ? `spawn ENOENT: ${msg}` : msg),
      timedOut,
    };
  }
}

/**
 * Primary: xelatex (with firejail on Linux if available).
 */
async function runXelatex(cwd: string): Promise<{ success: boolean; stdout: string; stderr: string; timedOut?: boolean }> {
  const args = [
    "-interaction=nonstopmode",
    "-halt-on-error",
    "-no-shell-escape",
    "main.tex",
  ];

  if (platform() === "linux") {
    const work = cwd;
    const firejailResult = await runInDir(
      cwd,
      "firejail",
      [`--private=${work}`, "--net=none", "--rlimit-cpu=90", "--", "xelatex", ...args]
    );
    if (!firejailResult.stderr.includes("not found") && !firejailResult.stderr.includes("No such file")) {
      return firejailResult;
    }
  }

  return runInDir(cwd, "xelatex", args);
}

/**
 * Fallback: tectonic.
 */
async function runTectonic(cwd: string): Promise<{ success: boolean; stdout: string; stderr: string; timedOut?: boolean }> {
  return runInDir(cwd, "tectonic", ["main.tex"]);
}

/**
 * Compile LaTeX source to PDF.
 * Primary: local xelatex (firejail on Linux). Fallback: tectonic. No Docker.
 */
export async function compileLatexToPdf(content: string): Promise<CompileResult> {
  const tmpDir = join(process.cwd(), "tmp", "latex-compile", `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  try {
    await mkdir(tmpDir, { recursive: true });
    const mainPath = join(tmpDir, "main.tex");
    const outPath = join(tmpDir, "main.pdf");
    await writeFile(mainPath, content, "utf8");

    let log = "";
    let primaryOk = true;

    // Primary: 2 passes xelatex
    for (let pass = 0; pass < 2; pass++) {
      const out = await runXelatex(tmpDir);
      log += [out.stdout, out.stderr].filter(Boolean).join("\n") + "\n";
      if (out.timedOut) {
        return {
          error: "Compilation timed out",
          code: "COMPILE_TIMEOUT",
          log,
        };
      }
      if (!out.success) {
        primaryOk = false;
        break;
      }
    }

    if (primaryOk) {
      try {
        const pdf = await readFile(outPath);
        return { pdf, log };
      } catch {
        // no PDF after 2 passes, try fallback
      }
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
      return { pdf, log };
    } catch {
      const hint = getInstallHint();
      const isNotFound =
        /not found|No such file|ENOENT|command not found/i.test(log) ||
        (log.includes("tectonic") && /not found|No such file|ENOENT/i.test(log));
      return {
        error: isNotFound
          ? `LaTeX engine not installed. ${hint}`
          : `Compilation failed. ${hint}`,
        code: "COMPILE_ERROR",
        log,
      };
    }
  } finally {
    try {
      await rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}
