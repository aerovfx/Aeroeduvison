## Agent OS Integration (OpenFang-style) for Aeroedu

### Goals

- Run an **Agent OS service** (OpenFang or a compatible clone) as a long‑running Rust binary.
- Keep **Aeroedu** focused on web UI, auth, and domain APIs (camera, exams, emotion, progress).
- Let agents/Hands run on schedules, call Aeroedu APIs, and push back reports/alerts.

---

### High‑Level Architecture

- **Agent OS (OpenFang / clone)**
  - Runtime: Rust binary, runs as an independent service.
  - Default dev URL: `http://127.0.0.1:4200` (or internal service DNS in a cluster).
  - Responsibilities:
    - Scheduling (cron‑like) and long‑running agent loops.
    - State & memory for agents/Hands.
    - Calling LLM providers and heavy processing.
    - Logging, audit trail, and report generation.

- **Aeroedu (Next.js/Bun)**
  - Runtime: existing Next.js App Router app.
  - Responsibilities:
    - UI for admin/teacher/student.
    - Auth & roles (ADMIN / TEACHER / STUDENT).
    - Domain APIs:
      - Camera: `/api/camera/*`, `/api/camera/recording`, ...
      - Exams: `/api/exam-matrices`, `/api/exam-reports`, ...
      - Vision/emotion: `/api/vision-tracker/*`, ...

---

### Integration Boundaries

- **Aeroedu → Agent OS (primary path)**
  - HTTP REST over an internal network:
    - `GET  {OPENFANG_BASE_URL}/api/health` – liveness check.
    - `GET  {OPENFANG_BASE_URL}/api/agents` – list agents/Hands.
    - `POST {OPENFANG_BASE_URL}/api/agents/{id}/message` – trigger a run or send a task.
    - `GET  {OPENFANG_BASE_URL}/api/reports/{handId}` – fetch recent reports for one Hand.
  - Used by:
    - Admin dashboard (“Agents” tab, run‑now buttons, status list).
    - Contextual pages (e.g. camera management page showing latest Camera Guard report).

- **Agent OS → Aeroedu (optional webhooks)**
  - HTTP POST from Agent OS into Aeroedu:
    - `POST /api/agent-events` – push alerts or new report notifications.
  - Payload example:
    - `handId`, `eventType` (`alert|report|info`), `severity`, `title`, `details`, `createdAt`.
  - Used to:
    - Store agent events in Aeroedu DB.
    - Drive in‑app notifications and “recent alerts” widgets.

---

### Responsibility Split (Final Decision)

- **Agent OS**
  - Owns: schedules, orchestration, LLM calls, long‑term agent state.
  - Treats Aeroedu as a **domain data/API provider**.
  - Hands for Aeroedu (examples):
    - `aeroedu_camera_guard` – analyses camera + recordings, finds offline/error patterns, produces health reports.
    - `aeroedu_exam_analytics` – analyses exam matrices & scores, highlights weak topics and hard questions.
    - `aeroedu_risk_watch` – correlates emotion + performance to flag at‑risk students.

- **Aeroedu**
  - Owns: humans, roles, UI, and all domain CRUD.
  - Exposes stable, documented endpoints that agents rely on.
  - Shows agent output in:
    - Admin overview / automation tab.
    - `admin/camera-management`, `teacher/camera-management`, exam analytics pages, etc.

---

### Configuration & Environment

- **Environment variables on Aeroedu**
  - `OPENFANG_BASE_URL` – base URL for the Agent OS (dev: `http://127.0.0.1:4200`).
  - `OPENFANG_INTERNAL_TOKEN` – shared secret used as `Authorization` header for internal calls.

- **Environment/config on Agent OS**
  - Base URL(s) for Aeroedu (`AEROEDU_BASE_URL`).
  - Shared token to authenticate against `/api/agent-events` and internal data APIs.

---

### Execution Flow (Example: Camera Guard)

1. On schedule (e.g. every hour), `aeroedu_camera_guard` Hand wakes up inside Agent OS.
2. Hand calls Aeroedu APIs:
   - `/api/classes` – map class IDs to human labels.
   - `/api/camera/teacher` and `/api/camera/recording` – get camera statuses + recent recordings.
3. Hand computes:
   - Cameras frequently offline or error.
   - Classes with poor camera coverage.
4. Hand writes a structured report and:
   - Stores it in Agent OS storage (readable via `/api/reports/aeroedu_camera_guard`), and/or
   - Sends a webhook to `POST /api/agent-events` in Aeroedu.
5. Aeroedu admin UI pulls these reports and renders a “Camera Guard” section for admins/teachers.

