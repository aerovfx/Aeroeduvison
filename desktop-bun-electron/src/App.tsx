import { useEffect, useMemo, useState } from "react";
import { ModelViewer } from "./components/ModelViewer";
import { useAppStore } from "./store/useAppStore";

function formatStatus(status: string) {
  if (status === "queued") return "Queued";
  if (status === "processing") return "Processing";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return status;
}

export default function App() {
  const [busy, setBusy] = useState(false);
  const {
    prompt,
    sourceImage,
    settings,
    records,
    activeId,
    setPrompt,
    setSourceImage,
    setSettings,
    setRecords,
    setActiveId,
    upsertRecord,
    updateProgress
  } = useAppStore();

  useEffect(() => {
    const bootstrap = async () => {
      const [nextSettings, history] = await Promise.all([
        window.desktopAPI.getSettings(),
        window.desktopAPI.listHistory()
      ]);
      setSettings(nextSettings);
      setRecords(history);
      if (history[0]) {
        setActiveId(history[0].id);
      }
    };

    void bootstrap();

    const unsubscribe = window.desktopAPI.onGenerationProgress((event) => {
      updateProgress(event);
    });

    return () => {
      unsubscribe();
    };
  }, [setActiveId, setRecords, setSettings, updateProgress]);

  const activeRecord = useMemo(() => records.find((item) => item.id === activeId), [records, activeId]);

  const onPickImage = async () => {
    const image = await window.desktopAPI.pickImage();
    if (image) {
      setSourceImage(image);
    }
  };

  const onGenerate = async () => {
    if (!prompt.trim()) {
      return;
    }
    setBusy(true);

    try {
      const record = await window.desktopAPI.startGeneration({
        prompt: prompt.trim(),
        sourceImage
      });
      upsertRecord(record);
      setActiveId(record.id);
      setPrompt("");
    } finally {
      setBusy(false);
    }
  };

  const onSaveSettings = async () => {
    await window.desktopAPI.setSettings(settings);
  };

  return (
    <main className="layout">
      <section className="panel left-panel">
        <h1>Aero 3D Desktop</h1>
        <p className="subtitle">Bun + Electron + React architecture for image-to-3D workflows</p>

        <div className="form-group">
          <label htmlFor="prompt">Prompt</label>
          <textarea
            id="prompt"
            rows={4}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the 3D model you want to generate..."
          />
        </div>

        <div className="actions-row">
          <button onClick={onPickImage}>Upload image</button>
          <button className="ghost" onClick={() => setSourceImage(undefined)}>
            Clear image
          </button>
        </div>

        <div className="path-chip">{sourceImage ?? "No image selected"}</div>

        <button className="primary" disabled={busy || !prompt.trim()} onClick={onGenerate}>
          {busy ? "Submitting..." : "Generate 3D"}
        </button>

        <hr />

        <h3>Settings</h3>

        <div className="form-group">
          <label htmlFor="engine">Engine</label>
          <select
            id="engine"
            value={settings.engine}
            onChange={(event) => setSettings({ ...settings, engine: event.target.value as "trellis" | "hunyuan" })}
          >
            <option value="trellis">Trellis 2 (fal.ai)</option>
            <option value="hunyuan">Hunyuan 3D (fal.ai)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="api-base">API base URL</label>
          <input
            id="api-base"
            value={settings.apiBaseUrl}
            onChange={(event) => setSettings({ ...settings, apiBaseUrl: event.target.value })}
          />
        </div>

        <button onClick={onSaveSettings}>Save settings</button>
      </section>

      <section className="center-panel">
        <ModelViewer modelPath={activeRecord?.modelPath} />
      </section>

      <section className="panel right-panel">
        <h3>History</h3>
        <div className="history-list">
          {records.map((item) => (
            <button key={item.id} className={`history-item ${activeId === item.id ? "active" : ""}`} onClick={() => setActiveId(item.id)}>
              <div className="history-item-top">
                <strong>{item.engine.toUpperCase()}</strong>
                <span>{formatStatus(item.status)}</span>
              </div>
              <p>{item.prompt}</p>
              <div className="progress-track">
                <div style={{ width: `${item.progress}%` }} />
              </div>
            </button>
          ))}
          {records.length === 0 && <p className="empty">No jobs yet</p>}
        </div>
      </section>
    </main>
  );
}
