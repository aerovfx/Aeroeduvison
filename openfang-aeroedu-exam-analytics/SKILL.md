## Domain Knowledge – Aeroedu Exam Analytics

### Concepts

- **Exam Matrix**: Blueprint defining:
  - Topics / skills.
  - Intended difficulty.
  - Number of questions per topic.
- **Exam Report**:
  - Aggregated performance data per exam / question / class.
  - May include distributions, averages, and basic statistics.

### Metrics

- **Difficulty (p‑value)**:
  - Proportion of students answering correctly.
  - Low p‑value => hard question; high p‑value => easy question.

- **Discrimination (heuristic)**:
  - Whether a question distinguishes higher‑performing students from lower‑performing ones.
  - Use simple heuristics (e.g. compare performance of top vs bottom quartile).

### Heuristics for Weak Topics

- A topic is considered **weak** if:
  - Average score on questions tagged with that topic is low across multiple classes.
  - Or there is a large performance drop compared to neighbouring topics in the same exam.

### Heuristics for Suspicious Questions

- Flag a question as suspicious if:
  - It is much harder/easier than intended by the matrix.
  - Performance is highly inconsistent between classes that should be comparable.
  - Non‑response or “all options equally chosen” suggests confusion.

### Reporting Tips

- Focus on **patterns** over single data points.
- When recommending actions:
  - Be specific about grade, subject, and topic.
  - Limit each report to a manageable number of action items (e.g. 3–7).

