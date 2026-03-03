import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import Store from "electron-store";

type GenerationStatus = "queued" | "processing" | "completed" | "failed";

type GenerationRecord = {
  id: string;
  prompt: string;
  sourceImage?: string;
  modelPath?: string;
  progress: number;
  status: GenerationStatus;
  engine: "trellis" | "hunyuan";
  createdAt: string;
};

const isDev = !app.isPackaged;
const __dirname = dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;

const appDataDir = app.getPath("userData");
const cacheDir = join(appDataDir, "cache");
const modelsDir = join(appDataDir, "models");
const dbPath = join(appDataDir, "app.db");

mkdirSync(cacheDir, { recursive: true });
mkdirSync(modelsDir, { recursive: true });

const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    source_image TEXT,
    model_path TEXT,
    progress INTEGER NOT NULL,
    status TEXT NOT NULL,
    engine TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

const settings = new Store({
  defaults: {
    engine: "trellis",
    apiBaseUrl: "https://fal.run"
  }
});

const insertGeneration = db.prepare(`
  INSERT INTO generations (id, prompt, source_image, model_path, progress, status, engine, created_at)
  VALUES (@id, @prompt, @sourceImage, @modelPath, @progress, @status, @engine, @createdAt)
`);

const updateGeneration = db.prepare(`
  UPDATE generations
  SET progress = @progress, status = @status, model_path = @modelPath
  WHERE id = @id
`);

const listGenerations = db.prepare(`
  SELECT
    id,
    prompt,
    source_image as sourceImage,
    model_path as modelPath,
    progress,
    status,
    engine,
    created_at as createdAt
  FROM generations
  ORDER BY datetime(created_at) DESC
  LIMIT 100
`);

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#0a1020",
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDev) {
    await mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(join(app.getAppPath(), "dist", "index.html"));
  }
};

const emitProgress = (payload: Pick<GenerationRecord, "id" | "progress" | "status" | "modelPath">) => {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.send("generation:progress", payload);
};

const randomId = () => `gen_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

ipcMain.handle("file:pick-image", async () => {
  const result = await dialog.showOpenDialog({
    title: "Choose an image",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle("settings:get", () => {
  return {
    engine: settings.get("engine") as "trellis" | "hunyuan",
    apiBaseUrl: settings.get("apiBaseUrl") as string
  };
});

ipcMain.handle("settings:set", (_event, data: { engine: "trellis" | "hunyuan"; apiBaseUrl: string }) => {
  settings.set("engine", data.engine);
  settings.set("apiBaseUrl", data.apiBaseUrl);
  return true;
});

ipcMain.handle("history:list", () => {
  return listGenerations.all() as GenerationRecord[];
});

ipcMain.handle("generation:start", async (_event, data: { prompt: string; sourceImage?: string }) => {
  const id = randomId();
  const engine = settings.get("engine") as "trellis" | "hunyuan";

  const record: GenerationRecord = {
    id,
    prompt: data.prompt,
    sourceImage: data.sourceImage,
    modelPath: undefined,
    progress: 0,
    status: "queued",
    engine,
    createdAt: new Date().toISOString()
  };

  insertGeneration.run(record);
  emitProgress({ id, progress: 0, status: "queued", modelPath: undefined });

  setTimeout(() => {
    updateGeneration.run({ id, progress: 45, status: "processing", modelPath: null });
    emitProgress({ id, progress: 45, status: "processing", modelPath: undefined });
  }, 700);

  setTimeout(() => {
    const modelPath = join(modelsDir, `${id}.glb`);
    updateGeneration.run({ id, progress: 100, status: "completed", modelPath });
    emitProgress({ id, progress: 100, status: "completed", modelPath });
  }, 1800);

  return record;
});

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  db.close();
});
