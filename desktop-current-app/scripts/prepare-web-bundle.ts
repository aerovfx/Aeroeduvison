import { spawn } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(here, "..");
const appRoot = join(desktopRoot, "..");
const webOutRoot = join(desktopRoot, ".web");
const webStandaloneOut = join(webOutRoot, "standalone");

function run(name: string, cmd: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", env: process.env });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`[${name}] exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

const assetRefPattern = /\/[-_a-zA-Z0-9./]+\.(png|jpg|jpeg|svg|webp|gif|ico)/g;

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath)));
      continue;
    }
    files.push(entryPath);
  }

  return files;
}

async function collectReferencedAssets(appRootDir: string): Promise<string[]> {
  const sourceDirs = [join(appRootDir, "app"), join(appRootDir, "components")];
  const refs = new Set<string>();

  for (const sourceDir of sourceDirs) {
    const files = await walkFiles(sourceDir);
    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      const matches = source.match(assetRefPattern);
      if (!matches) continue;
      for (const match of matches) {
        refs.add(match);
      }
    }
  }

  return Array.from(refs).sort();
}

function chooseFallbackPath(assetPath: string, publicRoot: string): string | null {
  const ext = extname(assetPath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".webp" || ext === ".gif") {
    return join(publicRoot, "user.jpg");
  }
  if (ext === ".png") {
    return join(publicRoot, "favicon-32x32.png");
  }
  if (ext === ".svg") {
    return join(publicRoot, "logo.svg");
  }
  if (ext === ".ico") {
    return join(publicRoot, "favicon.ico");
  }
  return null;
}

async function ensureAssetFallbacks(standalonePublicRoot: string, appRootDir: string) {
  const refs = await collectReferencedAssets(appRootDir);
  let generatedCount = 0;

  for (const assetPath of refs) {
    const destPath = join(standalonePublicRoot, assetPath.slice(1));
    try {
      await readFile(destPath);
      continue;
    } catch {
      // Missing file; create from fallback.
    }

    const fallbackPath = chooseFallbackPath(assetPath, join(appRootDir, "public"));
    if (!fallbackPath) {
      continue;
    }

    try {
      const fallbackContent = await readFile(fallbackPath);
      await mkdir(dirname(destPath), { recursive: true });
      await writeFile(destPath, fallbackContent);
      generatedCount += 1;
    } catch {
      // Skip if fallback source is unavailable.
    }
  }

  if (generatedCount > 0) {
    console.log(`[prepare:web] generated ${generatedCount} fallback assets`);
  }
}

async function main() {
  console.log("[prepare:web] cleaning Next.js build cache...");
  await rm(join(appRoot, ".next"), { recursive: true, force: true });
  await rm(join(appRoot, ".contentlayer"), { recursive: true, force: true });

  console.log("[prepare:web] building Next standalone bundle...");
  await run("web-build", "bun", ["run", "build"], appRoot);

  const standaloneSrc = join(appRoot, ".next", "standalone");
  const staticSrc = join(appRoot, ".next", "static");
  const publicSrc = join(appRoot, "public");
  const standaloneStaticOut = join(webStandaloneOut, ".next", "static");
  const standalonePublicOut = join(webStandaloneOut, "public");

  console.log("[prepare:web] cleaning old bundle...");
  await rm(webOutRoot, { recursive: true, force: true });
  await mkdir(webStandaloneOut, { recursive: true });

  console.log("[prepare:web] copying standalone server...");
  await cp(standaloneSrc, webStandaloneOut, { recursive: true, force: true });

  console.log("[prepare:web] copying static assets...");
  await mkdir(join(webStandaloneOut, ".next"), { recursive: true });
  await cp(staticSrc, standaloneStaticOut, { recursive: true, force: true });

  console.log("[prepare:web] copying public assets...");
  await cp(publicSrc, standalonePublicOut, { recursive: true, force: true });

  console.log("[prepare:web] copying environment variables...");
  try {
    await cp(join(appRoot, ".env.local"), join(webStandaloneOut, ".env.local"));
  } catch (err) {
    // Ignore if not exists
  }

  console.log("[prepare:web] ensuring fallback assets...");
  await ensureAssetFallbacks(standalonePublicOut, appRoot);

  console.log("[prepare:web] done:", webStandaloneOut);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
