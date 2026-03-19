## Domain Knowledge – Aeroedu Camera Guard

### Concepts

- **Camera**: Physical or virtual device assigned to one or more classrooms.
- **Recording**: A time‑bounded capture from a camera, stored as a file (e.g. MP4).
- **Classroom**: A teaching group (e.g. “Lớp 9A1”) mapped to:
  - Grade (e.g. 9, 10, 11, 12)
  - Room number (e.g. P.201)
  - Homeroom/subject teacher

### Status Fields

- Camera status (from `/api/camera/teacher`):
  - `online`: reachable and working.
  - `offline`: unreachable; camera or network issue.
  - `error`: configured but failing (e.g. RTSP error, auth failure).
  - `testing`: currently under test; treat as **unknown** until resolved.

- Recording status (from `/api/camera/recording`):
  - `recording`: currently in progress.
  - `completed`: finished and saved successfully.
  - `failed`: attempted but did not complete.
  - `processing`: post‑processing or upload still running.

### Heuristics

- **Healthy camera**:
  - Mostly `online`.
  - Recordings are mostly `completed`.
  - No long gaps with no recordings during school hours.

- **Degraded camera**:
  - Intermittent `offline` or `error` statuses.
  - Some `failed` recordings, but still produces useful data.

- **Critical camera**:
  - Frequently `offline` or `error`.
  - Majority of recent recordings are `failed` or missing.
  - Classrooms depending on this camera effectively have no monitoring.

### Time Windows

- Use **last 24 hours** and **last 7 days** as primary windows:
  - 24h: acute problems (today’s lessons may be unmonitored).
  - 7 days: chronic issues (camera often unreliable).

### Reporting Best Practices

- Prioritise:
  - Younger grades or critical exam rooms if the data exposes such dimensions.
  - Cameras at main entrances, corridors, or exam rooms as more critical.

- Summaries should:
  - Be short and action‑oriented.
  - Highlight patterns (e.g. “All cameras of brand X on floor 3 frequently fail recordings”).
  - Suggest 2–5 concrete next steps instead of generic advice.

