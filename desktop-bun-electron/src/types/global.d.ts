export {};

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

declare global {
  interface Window {
    desktopAPI: {
      pickImage: () => Promise<string | null>;
      startGeneration: (payload: { prompt: string; sourceImage?: string }) => Promise<GenerationRecord>;
      listHistory: () => Promise<GenerationRecord[]>;
      getSettings: () => Promise<AppSettings>;
      setSettings: (payload: AppSettings) => Promise<boolean>;
      onGenerationProgress: (
        cb: (payload: { id: string; progress: number; status: GenerationStatus; modelPath?: string }) => void
      ) => () => void;
    };
  }
}
