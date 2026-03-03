import { contextBridge, ipcRenderer } from "electron";

type Engine = "trellis" | "hunyuan";
type GenerationStatus = "queued" | "processing" | "completed" | "failed";

type GenerationRecord = {
  id: string;
  prompt: string;
  sourceImage?: string;
  modelPath?: string;
  progress: number;
  status: GenerationStatus;
  engine: Engine;
  createdAt: string;
};

type AppSettings = {
  engine: Engine;
  apiBaseUrl: string;
};

contextBridge.exposeInMainWorld("desktopAPI", {
  pickImage: (): Promise<string | null> => ipcRenderer.invoke("file:pick-image"),
  startGeneration: (payload: { prompt: string; sourceImage?: string }): Promise<GenerationRecord> =>
    ipcRenderer.invoke("generation:start", payload),
  listHistory: (): Promise<GenerationRecord[]> => ipcRenderer.invoke("history:list"),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke("settings:get"),
  setSettings: (payload: AppSettings): Promise<boolean> => ipcRenderer.invoke("settings:set", payload),
  onGenerationProgress: (cb: (payload: { id: string; progress: number; status: GenerationStatus; modelPath?: string }) => void) => {
    const handler = (_event: unknown, data: { id: string; progress: number; status: GenerationStatus; modelPath?: string }) => cb(data);
    ipcRenderer.on("generation:progress", handler);
    return () => ipcRenderer.removeListener("generation:progress", handler);
  }
});
