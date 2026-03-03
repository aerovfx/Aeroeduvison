import { create } from "zustand";

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

type AppState = {
  prompt: string;
  sourceImage?: string;
  settings: AppSettings;
  records: GenerationRecord[];
  activeId?: string;
  setPrompt: (prompt: string) => void;
  setSourceImage: (sourceImage?: string) => void;
  setSettings: (settings: AppSettings) => void;
  setRecords: (records: GenerationRecord[]) => void;
  setActiveId: (id?: string) => void;
  upsertRecord: (record: GenerationRecord) => void;
  updateProgress: (payload: { id: string; progress: number; status: GenerationStatus; modelPath?: string }) => void;
};

export const useAppStore = create<AppState>((set) => ({
  prompt: "",
  sourceImage: undefined,
  settings: {
    engine: "trellis",
    apiBaseUrl: "https://fal.run"
  },
  records: [],
  activeId: undefined,
  setPrompt: (prompt) => set({ prompt }),
  setSourceImage: (sourceImage) => set({ sourceImage }),
  setSettings: (settings) => set({ settings }),
  setRecords: (records) => set({ records }),
  setActiveId: (activeId) => set({ activeId }),
  upsertRecord: (record) =>
    set((state) => {
      const index = state.records.findIndex((item) => item.id === record.id);
      if (index === -1) {
        return { records: [record, ...state.records] };
      }
      const next = [...state.records];
      next[index] = record;
      return { records: next };
    }),
  updateProgress: (payload) =>
    set((state) => ({
      records: state.records.map((record) =>
        record.id === payload.id
          ? {
              ...record,
              progress: payload.progress,
              status: payload.status,
              modelPath: payload.modelPath ?? record.modelPath
            }
          : record
      )
    }))
}));
