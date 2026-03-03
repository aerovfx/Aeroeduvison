import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const electronEntry = join(root, "dist-electron", "main.js");

const spawnProcess = (cmd: string, args: string[], name: string) => {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env }
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exit(code ?? 1);
    }
  });

  return child;
};

const vite = spawnProcess("bunx", ["vite"], "vite");
const builder = spawnProcess(
  "bun",
  [
    "build",
    "electron/main.ts",
    "electron/preload.ts",
    "--outdir",
    "dist-electron",
    "--target",
    "node",
    "--watch"
  ],
  "electron-build"
);

let electron: ReturnType<typeof spawn> | null = null;

const bootElectron = () => {
  if (!existsSync(electronEntry) || electron) {
    return;
  }

  electron = spawnProcess("bunx", ["electron", "."], "electron");
};

const interval = setInterval(bootElectron, 400);
bootElectron();

const shutdown = () => {
  clearInterval(interval);
  vite.kill("SIGTERM");
  builder.kill("SIGTERM");
  electron?.kill("SIGTERM");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
