## Domain Knowledge – Aeroedu Risk Watch

### Signals

- **Emotion / engagement**:
  - Derived from vision‑tracker/emotion modules (e.g. facial expressions, attention).
  - Values may include sentiment scores, engagement levels, or categorical labels.

- **Academic performance**:
  - Exam/quiz scores.
  - Mastery/XP metrics from learning paths or practice modules.

- **Activity**:
  - Login frequency.
  - Lessons or tasks completed.

### Risk Indicators (Heuristics)

- **Short‑term drops**:
  - Sudden decrease in scores or engagement over a 7‑day window.

- **Persistent low values**:
  - Consistently low engagement or performance over multiple windows (e.g. 2–3 weeks).

- **Combined signals**:
  - Multiple weak signals together (slight score drop + lower engagement + negative emotions) can merit a `medium` risk even if each on its own is modest.

### Avoiding False Positives

- A single bad day or isolated exam result should not trigger `high` risk on its own.
- Prefer to look for **trends** rather than single points.

### Reporting Conventions

- Focus on:
  - Patterns to watch.
  - Suggestions for constructive, supportive interventions.
- Avoid:
  - Strong labels (“problem student”, “failure”) or definitive psychological interpretations.

