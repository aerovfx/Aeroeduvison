import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(here, "..");
const appRoot = join(desktopRoot, "..");
const host = "127.0.0.1";
const defaultPort = 3100;

const children: Array<ReturnType<typeof spawn>> = [];

function run(name: string, cmd: string, args: string[], cwd: string, extraEnv: Record<string, string> = {}) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv }
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    }
  });

  children.push(child);
  return child;
}

async function isUrlReady(url: string) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function findAvailablePort(preferredPort: number) {
  const tryPort = (port: number) =>
    new Promise<boolean>((resolve) => {
      const server = createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, host);
    });

  let port = preferredPort;
  while (port < preferredPort + 20) {
    if (await tryPort(port)) {
      return port;
    }
    port += 1;
  }
  throw new Error(`No free port found from ${preferredPort} to ${preferredPort + 19}`);
}

async function waitForWebReady(url: string, timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isUrlReady(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error(`Web app is not ready at ${url}`);
}

function shutdown(code = 0) {
  for (const child of children) {
    child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("electron-build", "bun", ["build", "electron/main.ts", "electron/preload.ts", "--outdir", "dist-electron", "--target", "node", "--packages", "external"], desktopRoot);
const port = await findAvailablePort(defaultPort);
const webUrl = `http://${host}:${port}`;
run("web-start", "bun", ["run", "start", "--", "-H", host, "-p", String(port)], appRoot, {
  NEXTAUTH_URL: webUrl
});

await waitForWebReady(webUrl);
run("electron", "bunx", ["electron", "."], desktopRoot, { DESKTOP_WEB_URL: webUrl });
