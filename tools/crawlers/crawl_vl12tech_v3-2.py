"""
Tech12h Crawler v3 — Per-URL JSON | 4 loại câu hỏi | Concurrent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mỗi URL crawl → lưu 1 file JSON riêng ngay lập tức.
Flat list, phân biệt bằng field "type".
Concurrent crawling với ThreadPoolExecutor (mặc định 5 workers).

━━ 1. Trắc nghiệm 1 đáp án (single_choice) ━━━━━━━━━━━━━━━━
{
  "id":              "sc_001",
  "type":            "single_choice",
  "question_number": 1,
  "question":        "Nội dung câu hỏi",
  "options":         {"A": "...", "B": "...", "C": "...", "D": "..."},
  "answer":          "B"
}

━━ 2. Trắc nghiệm đúng/sai (true_false) ━━━━━━━━━━━━━━━━━━━
{
  "id":              "tf_001",
  "type":            "true_false",
  "question_number": 1,
  "question":        "Câu dẫn / lệnh",
  "statements": [
    {"label": "a", "text": "Mệnh đề a", "answer": true},
    {"label": "b", "text": "Mệnh đề b", "answer": false},
    {"label": "c", "text": "Mệnh đề c", "answer": true},
    {"label": "d", "text": "Mệnh đề d", "answer": false}
  ]
}

━━ 3. Câu trả lời ngắn (short_answer) ━━━━━━━━━━━━━━━━━━━━━
{
  "id":              "sa_001",
  "type":            "short_answer",
  "question_number": 1,
  "question":        "Nội dung câu hỏi",
  "answer":          "2024"     ← chuỗi 4 ký tự [-0-9]{4}
}

━━ 4. Tự luận (essay) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "id":              "es_001",
  "type":            "essay",
  "question_number": 1,
  "question":        "Nội dung câu hỏi",
  "hint":            "Gợi ý / hướng dẫn giải",
  "sample_answer":   "Đáp án mẫu",
  "max_score":       2.0
}

━━ File JSON mỗi URL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "title":           "Tên bài học",
  "source_url":      "https://...",
  "crawled_at":      "2024-01-01T12:00:00Z",
  "total_questions": 15,
  "single_choice":   8,
  "true_false":      4,
  "short_answer":    1,
  "essay":           2,
  "questions":       [ ... ]   ← flat list, sắp theo question_number
}
"""

import urllib.request
import ssl
import re
import json
import os
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html import unescape
from collections import deque
from urllib.parse import urljoin, urlparse

# ── SSL ──────────────────────────────────────────────────────────────────────
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode    = ssl.CERT_NONE

# ── Config ───────────────────────────────────────────────────────────────────
DATA_DIR        = "/Users/pixibox/Aeroeduvison/data"
DELAY           = 0.5    # giây giữa request trong discovery
MAX_DEPTH       = 5      # độ sâu BFS tối đa
DOMAIN          = "tech12h.com"
MAX_WORKERS     = 3      # số luồng song song (giữ thấp tránh bị rate-limit)
WORKER_DELAY    = 0.8    # giây delay mỗi worker sau khi fetch xong
MAX_RETRIES     = 3      # số lần retry khi timeout
RETRY_WAIT      = 2.0    # giây chờ giữa các retry

os.makedirs(DATA_DIR, exist_ok=True)

# Lock cho print và file write (tránh race condition)
_print_lock = threading.Lock()
_file_lock  = threading.Lock()

# Regex đáp án short_answer: 4 ký tự [-0-9]
_SHORT_ANSWER_RE = re.compile(r"^[-0-9]{4}$")


# ══════════════════════════════════════════════════════════════════════════════
#  UTILS
# ══════════════════════════════════════════════════════════════════════════════

def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()

def extract_title(html: str) -> str:
    m = re.search(r"<title>([^<]+)</title>", html)
    return strip_html(m.group(1)) if m else ""

def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def cprint(*args, **kwargs):
    """Thread-safe print."""
    with _print_lock:
        print(*args, **kwargs)


# ══════════════════════════════════════════════════════════════════════════════
#  NETWORK
# ══════════════════════════════════════════════════════════════════════════════

def fetch(url: str, retries: int = MAX_RETRIES) -> str | None:
    for attempt in range(1, retries + 1):
        try:
            req  = urllib.request.Request(
                url, headers={"User-Agent": "Mozilla/5.0 (compatible; crawler)"}
            )
            resp = urllib.request.urlopen(req, context=ctx, timeout=15)
            return resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt < retries:
                cprint(f"    ↻ retry {attempt}/{retries} [{url}]: {e}")
                time.sleep(RETRY_WAIT * attempt)   # back-off: 2s, 4s
            else:
                cprint(f"    ✗ failed [{url}]: {e}")
    return None


# ══════════════════════════════════════════════════════════════════════════════
#  LINK DISCOVERY  (BFS đa cấp — sequential, chỉ scan INDEX)
#
#  Discovery vẫn sequential để tránh hammering server khi scan danh mục.
#  Phần crawl bài học mới dùng concurrent.
# ══════════════════════════════════════════════════════════════════════════════

def _is_same_domain(url: str) -> bool:
    return DOMAIN in urlparse(url).netloc

def _is_lesson_url(url: str) -> bool:
    """Bài trắc nghiệm: /bai-hoc/trac-nghiem-* (bỏ de-hieu-giai, 5-phut-giai...)."""
    return bool(re.search(r"/bai-hoc/trac-nghiem-", url))
    return bool(re.search(r"/bai-hoc/trac-nghiem-", url))

# Whitelist slug prefix: chỉ scan các trang index có khả năng chứa link bài học.
# Dùng whitelist thay blacklist để tránh scan URL rác (/game, /giao, /5-phut-giai, ...).
_INDEX_SLUG_RE = re.compile(
    r"/(?:trac-nghiem|de-hieu|de-thi|on-tap|chuyen-de)",
    re.IGNORECASE,
)

def _is_worth_scanning(url: str) -> bool:
    """True nếu URL là trang INDEX đáng scan (không phải bài học /bai-hoc/)."""
    if "/bai-hoc/" in url:
        return False
    path = urlparse(url).path
    return bool(_INDEX_SLUG_RE.search(path))
    path = urlparse(url).path
    return bool(_INDEX_SLUG_RE.search(path))

def _extract_lesson_and_index_links(
    html: str, base_url: str
) -> tuple[list[str], list[str]]:
    """
    Trả về (lesson_links, index_links).
    - lesson_links : URL có /bai-hoc/ → crawl ngay
    - index_links  : URL index hợp lệ (whitelist) → tiếp tục BFS
    """
    raw = re.findall(r'href=["\']([^"\' #\s]+)["\' ]', html)
    lessons: list[str] = []
    indexes: list[str] = []
    for href in raw:
        abs_url = urljoin(base_url, href).split("?")[0].split("#")[0].rstrip("/")
        if not _is_same_domain(abs_url) or abs_url == base_url:
            continue
        if _is_lesson_url(abs_url):
            lessons.append(abs_url)
        elif _is_worth_scanning(abs_url):
            indexes.append(abs_url)
    return list(set(lessons)), list(set(indexes))

def discover_lesson_links(
    start_url: str,
    max_depth: int = MAX_DEPTH,
    _visited: set | None = None,
) -> list[str]:
    """
    BFS sequential từ start_url.
    - Trang INDEX hợp lệ → scan, đào tiếp nếu còn depth
    - Trang bài học       → thu thập, KHÔNG đào tiếp
    - URL khác            → bỏ qua hoàn toàn
    """
    if _visited is None:
        _visited = set()

    lesson_urls: set[str] = set()
    queue: deque[tuple[str, int]] = deque()

    start_url = start_url.rstrip("/")
    queue.append((start_url, 0))
    _visited.add(start_url)

    while queue:
        url, depth = queue.popleft()

        if _is_lesson_url(url):
            lesson_urls.add(url)
            continue   # KHÔNG scan tiếp bài học

        if depth >= max_depth:
            continue

        print(f"  🔍 [depth={depth}] {url}")
        html = fetch(url)
        if not html:
            continue
        time.sleep(DELAY)

        lesson_links, index_links = _extract_lesson_and_index_links(html, url)

        for link in lesson_links:
            if link not in _visited:
                _visited.add(link)
                lesson_urls.add(link)

        for link in index_links:
            if link not in _visited and depth + 1 < max_depth:
                _visited.add(link)
                queue.append((link, depth + 1))

    return sorted(lesson_urls)


# ══════════════════════════════════════════════════════════════════════════════
#  PARSERS
# ══════════════════════════════════════════════════════════════════════════════

_PAT_LI = re.compile(r"<li[^>]*>(.*?)</li>", re.DOTALL)

_SC_PATTERNS = [
    re.compile(
        r"<p>\s*<strong>Câu(?:\s|&nbsp;)*(\d+)(?:\s|&nbsp;)*:?(?:\s|&nbsp;)*</strong>"
        r"(?:\s|&nbsp;)*(.*?)</p>\s*<ul>(.*?)</ul>",
        re.DOTALL,
    ),
    re.compile(
        r"<p>Câu\s*(\d+)\s*:\s*(.*?)</p>\s*<ul>(.*?)</ul>",
        re.DOTALL,
    ),
]

# ── single_choice ─────────────────────────────────────────────────────────────
def _parse_single_choice(content: str) -> list[dict]:
    seen: set[int] = set()
    results: list[dict] = []
    idx = 0

    matches = []
    for pat in _SC_PATTERNS:
        matches.extend(pat.finditer(content))
    matches.sort(key=lambda m: m.start())

    for m in matches:
        q_num = int(m.group(1))
        if q_num in seen:
            continue

        q_text  = strip_html(m.group(2))
        options = {"A": "", "B": "", "C": "", "D": ""}
        answer  = ""

        for i, li_m in enumerate(_PAT_LI.finditer(m.group(3))):
            if i >= 4:
                break
            label    = chr(ord("A") + i)
            opt_text = strip_html(re.sub(r"^[A-D]\.\s*", "", unescape(li_m.group(1))))
            options[label] = opt_text
            if "<h6>" in li_m.group(0):
                answer = label

        if not options["A"] or not answer:
            continue

        seen.add(q_num)
        idx += 1
        results.append({
            "id":              f"sc_{idx:03d}",
            "type":            "single_choice",
            "question_number": q_num,
            "question":        q_text,
            "options":         options,
            "answer":          answer,
        })

    return results

# ── true_false ────────────────────────────────────────────────────────────────
def _is_true_false_block(ul_html: str) -> bool:
    items = _PAT_LI.findall(ul_html)
    if not items:
        return False
    for item in items:
        if re.match(r"^[a-d][.)]\s*", strip_html(item)):
            return True
    if re.search(r"\b(đúng|sai)\b", strip_html(ul_html).lower()):
        return True
    return False

def _parse_true_false(content: str) -> list[dict]:
    seen: set[int] = set()
    results: list[dict] = []
    idx = 0

    matches = []
    for pat in _SC_PATTERNS:
        matches.extend(pat.finditer(content))
    matches.sort(key=lambda m: m.start())

    for m in matches:
        ul_html = m.group(3)
        if not _is_true_false_block(ul_html):
            continue

        q_num = int(m.group(1))
        if q_num in seen:
            continue

        q_text     = strip_html(m.group(2))
        statements = []

        for i, li_m in enumerate(_PAT_LI.finditer(ul_html)):
            if i >= 4:
                break
            label      = chr(ord("a") + i)
            raw_text   = strip_html(li_m.group(1))
            raw_text   = re.sub(r"^[a-dA-D][.)]\s*", "", raw_text)
            is_correct = (
                "<h6>" in li_m.group(0)
                or bool(re.search(r"\bĐúng\b", li_m.group(1)))
            )
            stmt_text  = re.sub(r"\s*\b(Đúng|Sai)\b\s*$", "", raw_text).strip()
            statements.append({"label": label, "text": stmt_text, "answer": is_correct})

        if not statements:
            continue

        seen.add(q_num)
        idx += 1
        results.append({
            "id":              f"tf_{idx:03d}",
            "type":            "true_false",
            "question_number": q_num,
            "question":        q_text,
            "statements":      statements,
        })

    return results

# ── short_answer ──────────────────────────────────────────────────────────────
_SA_EXPLICIT_PAT = re.compile(
    r"<p>\s*<strong>Câu(?:\s|&nbsp;)*(\d+)[^<]*</strong>(?:\s|&nbsp;)*(.*?)</p>"
    r"(?:.*?)"
    r'(?:<p[^>]*class="[^"]*(?:dap.an|answer)[^"]*"[^>]*>|<span[^>]*class="[^"]*(?:dap.an|answer)[^"]*"[^>]*>)'
    r"\s*([-0-9]{4})\s*(?:</p>|</span>)",
    re.DOTALL | re.IGNORECASE,
)

def _parse_short_answer_explicit(content: str) -> list[dict]:
    seen: set[int] = set()
    results: list[dict] = []
    idx = 0
    for m in _SA_EXPLICIT_PAT.finditer(content):
        q_num  = int(m.group(1))
        answer = m.group(3).strip()
        if not _SHORT_ANSWER_RE.match(answer) or q_num in seen:
            continue
        seen.add(q_num)
        idx += 1
        results.append({
            "id":              f"sa_{idx:03d}",
            "type":            "short_answer",
            "question_number": q_num,
            "question":        strip_html(m.group(2)),
            "answer":          answer,
        })
    return results

def _reclassify_short_answers(sc_list: list[dict]) -> tuple[list[dict], list[dict]]:
    sc_kept: list[dict] = []
    sa_out:  list[dict] = []
    sa_idx = 0
    for q in sc_list:
        ans_text = q["options"].get(q["answer"], "").strip()
        if _SHORT_ANSWER_RE.match(ans_text):
            sa_idx += 1
            sa_out.append({
                "id":              f"sa_{sa_idx:03d}",
                "type":            "short_answer",
                "question_number": q["question_number"],
                "question":        q["question"],
                "answer":          ans_text,
            })
        else:
            sc_kept.append(q)
    return sc_kept, sa_out

# ── essay ─────────────────────────────────────────────────────────────────────
_ESSAY_PATTERNS = [
    re.compile(
        r"<p>\s*<strong>\s*Câu(?:\s|&nbsp;)+(\d+)"
        r"(?:[^<]*?(\d+(?:[.,]\d+)?)\s*đi[eể]m)?"
        r"[^<]*</strong>(?:\s|&nbsp;)*(.*?)</p>"
        r"((?:(?!<p>\s*<strong>\s*Câu).)*?)"
        r"(?=<p>\s*<strong>\s*Câu|\Z)",
        re.DOTALL,
    ),
    re.compile(
        r"<p>\s*Câu\s*(\d+)"
        r"(?:[^:]*?(\d+(?:[.,]\d+)?)\s*đi[eể]m)?"
        r"\s*[:.]\s*(.*?)</p>"
        r"((?:(?!<p>\s*Câu\s*\d).)*?)"
        r"(?=<p>\s*Câu\s*\d|\Z)",
        re.DOTALL,
    ),
]

def _grab_field(block: str, keywords: list[str]) -> str:
    kw_re = "|".join(re.escape(k) for k in keywords)
    m = re.search(
        rf'(?:{kw_re})\s*[:\-]?\s*</?\w*>\s*(.*?)(?=<(?:p|strong|b|h\d)\b|\Z)',
        block, re.DOTALL | re.IGNORECASE,
    )
    return strip_html(m.group(1)) if m else ""

def _parse_essay(content: str) -> list[dict]:
    seen: set[int] = set()
    results: list[dict] = []
    idx = 0

    matches = []
    for pat in _ESSAY_PATTERNS:
        matches.extend(pat.finditer(content))
    matches.sort(key=lambda m: m.start())

    for m in matches:
        q_num = int(m.group(1))
        if q_num in seen:
            continue

        score_raw = m.group(2) if m.lastindex >= 2 else None
        q_text    = strip_html(m.group(3) if m.lastindex >= 3 else "")
        remainder = m.group(4) if m.lastindex >= 4 else ""

        max_score: float | None = None
        if score_raw:
            try:
                max_score = float(score_raw.replace(",", "."))
            except ValueError:
                pass

        hint          = _grab_field(remainder, ["hướng dẫn", "gợi ý", "lưu ý", "hint"])
        sample_answer = _grab_field(remainder, ["đáp án", "lời giải", "trả lời", "answer"])

        if not q_text:
            continue

        seen.add(q_num)
        idx += 1
        results.append({
            "id":              f"es_{idx:03d}",
            "type":            "essay",
            "question_number": q_num,
            "question":        q_text,
            "hint":            hint,
            "sample_answer":   sample_answer,
            "max_score":       max_score,
        })

    return results


# ══════════════════════════════════════════════════════════════════════════════
#  PAGE ROUTER
# ══════════════════════════════════════════════════════════════════════════════

def parse_page(html: str) -> tuple[str, list[dict]]:
    """Parse trang → (title, flat questions[])."""
    title = extract_title(html)

    block = None
    for pattern in [
        r'class="trac_nghiem"[^>]*>(.*?)class="kqua"',
        r'class="tu_luan"[^>]*>(.*?)(?:class="kqua"|</div>\s*</div>)',
        r'id="de-bai"[^>]*>(.*?)(?:id="dap-an"|</div>\s*</div>)',
        r'class="content-bai-hoc"[^>]*>(.*?)(?:</article>|</section>)',
        r'<article[^>]*>(.*?)</article>',
    ]:
        bm = re.search(pattern, html, re.DOTALL)
        if bm:
            block = bm.group(1)
            break
    if not block:
        body = re.search(r"<body[^>]*>(.*?)</body>", html, re.DOTALL)
        block = body.group(1) if body else html

    tf_questions = _parse_true_false(block)
    tf_nums      = {q["question_number"] for q in tf_questions}

    sc_raw       = [q for q in _parse_single_choice(block)
                    if q["question_number"] not in tf_nums]
    sc_questions, sa_from_sc = _reclassify_short_answers(sc_raw)

    sa_from_sc_nums = {q["question_number"] for q in sa_from_sc}
    sa_explicit     = [q for q in _parse_short_answer_explicit(block)
                       if q["question_number"] not in sa_from_sc_nums]
    sa_questions    = sa_from_sc + sa_explicit

    has_essay  = any(kw in html for kw in ["tự luận", "tu_luan", "điểm)", "điểm:"])
    known_nums = (
        {q["question_number"] for q in sc_questions}
        | tf_nums
        | {q["question_number"] for q in sa_questions}
    )
    essay_questions = []
    if has_essay or not (sc_questions or tf_questions or sa_questions):
        essay_questions = [q for q in _parse_essay(block)
                           if q["question_number"] not in known_nums]

    all_q = sc_questions + tf_questions + sa_questions + essay_questions
    all_q.sort(key=lambda q: q["question_number"])

    counters = {"single_choice": 0, "true_false": 0, "short_answer": 0, "essay": 0}
    prefixes  = {"single_choice": "sc", "true_false": "tf", "short_answer": "sa", "essay": "es"}
    for q in all_q:
        t = q["type"]
        counters[t] += 1
        q["id"] = f"{prefixes[t]}_{counters[t]:03d}"

    return title, all_q


# ══════════════════════════════════════════════════════════════════════════════
#  FILE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _safe_slug(url: str, max_len: int = 60) -> str:
    path = urlparse(url).path.strip("/")
    slug = re.sub(r"[^a-z0-9_-]", "-", path.lower())
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug[:max_len]

def save_url_json(title: str, url: str, questions: list[dict]) -> str:
    """Thread-safe: lưu JSON cho 1 URL, trả về path."""
    counts = {"single_choice": 0, "true_false": 0, "short_answer": 0, "essay": 0}
    for q in questions:
        counts[q["type"]] += 1

    payload = {
        "title":           title,
        "source_url":      url,
        "crawled_at":      now_iso(),
        "total_questions": len(questions),
        **counts,
        "questions":       questions,
    }

    slug  = _safe_slug(url)
    fname = f"{slug}.json"

    with _file_lock:
        path = os.path.join(DATA_DIR, fname)
        n = 1
        while os.path.exists(path):
            fname = f"{slug}_{n}.json"
            path  = os.path.join(DATA_DIR, fname)
            n += 1
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    return path


# ══════════════════════════════════════════════════════════════════════════════
#  CONCURRENT CRAWL WORKER
# ══════════════════════════════════════════════════════════════════════════════

def crawl_one(args: tuple[int, int, str]) -> dict:
    """
    Crawl 1 URL, parse, lưu file ngay.
    Trả về dict kết quả để tổng hợp stats.
    """
    i, total, url = args
    result = {"url": url, "sc": 0, "tf": 0, "sa": 0, "es": 0,
              "file": None, "skipped": False}

    html = fetch(url)
    if not html:
        cprint(f"[{i:>4}/{total}] ✗ {url}")
        result["skipped"] = True
        return result

    time.sleep(WORKER_DELAY)   # throttle mỗi worker tránh rate-limit
    time.sleep(WORKER_DELAY)   # throttle mỗi worker tránh rate-limit
    title, questions = parse_page(html)

    if not questions:
        cprint(f"[{i:>4}/{total}] – 0 câu  {url}")
        result["skipped"] = True
        return result

    path = save_url_json(title, url, questions)   # lưu ngay sau khi crawl xong

    sc_n = sum(1 for q in questions if q["type"] == "single_choice")
    tf_n = sum(1 for q in questions if q["type"] == "true_false")
    sa_n = sum(1 for q in questions if q["type"] == "short_answer")
    es_n = sum(1 for q in questions if q["type"] == "essay")

    result.update({"sc": sc_n, "tf": tf_n, "sa": sa_n, "es": es_n, "file": path})

    parts = []
    if sc_n: parts.append(f"SC:{sc_n}")
    if tf_n: parts.append(f"TF:{tf_n}")
    if sa_n: parts.append(f"SA:{sa_n}")
    if es_n: parts.append(f"TL:{es_n}")
    cprint(f"[{i:>4}/{total}] ✓ {' | '.join(parts)}  →  {os.path.basename(path)}")

    return result


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 65)
    print("  Tech12h Crawler v3 — Per-URL JSON | 4 loại | Concurrent")
    print("=" * 65)
    print()
    print("  Loại câu hỏi:")
    print("   • single_choice  — A/B/C/D, 1 đáp án")
    print("   • true_false     — đúng/sai từng mệnh đề a/b/c/d")
    print("   • short_answer   — chuỗi 4 ký tự [-0-9]{4}")
    print("   • essay          — tự luận")
    print()
    print("  ⚡ BFS chỉ scan trang INDEX (không đào vào bài học)")
    print(f"  ⚡ Crawl song song  : {MAX_WORKERS} workers")
    print(f"  Độ sâu BFS         : {MAX_DEPTH} cấp")
    print(f"  Delay discovery    : {DELAY}s / request")
    print(f"  Lưu vào            : {DATA_DIR}")
    print()

    raw = input("Nhập URL(s) (mỗi URL 1 dòng): ").strip()
    if not raw:
        print("Chưa nhập URL. Thoát.")
        return

    seed_urls = [line.strip().rstrip("/") for line in raw.splitlines() if line.strip()]

    # ── Discover (sequential) ─────────────────────────────────────────────────
    print(f"\n{'─' * 65}")
    print(f"🌐  Khám phá sublink từ {len(seed_urls)} URL gốc...")
    print(f"{'─' * 65}")

    visited: set[str]       = set()
    lesson_links: list[str] = []

    for seed in seed_urls:
        seed = seed.rstrip("/")
        if _is_lesson_url(seed):
            if seed not in visited:
                lesson_links.append(seed)
                visited.add(seed)
        else:
            found = discover_lesson_links(seed, max_depth=MAX_DEPTH, _visited=visited)
            new   = [u for u in found if u not in set(lesson_links)]
            lesson_links.extend(new)
            print(f"  ✅ +{len(new)} bài từ: {seed}")

    lesson_links = sorted(set(lesson_links))
    total        = len(lesson_links)

    print(f"\n{'─' * 65}")
    print(f"📚  {total} bài học | crawl với {MAX_WORKERS} workers")
    print(f"{'─' * 65}\n")

    if not total:
        print("Không tìm thấy bài học nào.")
        return

    # ── Concurrent crawl & save ───────────────────────────────────────────────
    stats = {"sc": 0, "tf": 0, "sa": 0, "es": 0, "files": 0, "skipped": 0}
    args_list = [(i, total, url) for i, url in enumerate(lesson_links, 1)]

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(crawl_one, args): args for args in args_list}
        for future in as_completed(futures):
            try:
                res = future.result()
                if res["skipped"]:
                    stats["skipped"] += 1
                else:
                    stats["sc"]    += res["sc"]
                    stats["tf"]    += res["tf"]
                    stats["sa"]    += res["sa"]
                    stats["es"]    += res["es"]
                    stats["files"] += 1
            except Exception as e:
                cprint(f"  ⚠ worker error: {e}")
                stats["skipped"] += 1

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'=' * 65}")
    print(f"✅  Hoàn thành!")
    print(f"   Files đã lưu  : {stats['files']}")
    print(f"   single_choice : {stats['sc']} câu")
    print(f"   true_false    : {stats['tf']} câu")
    print(f"   short_answer  : {stats['sa']} câu")
    print(f"   essay         : {stats['es']} câu")
    print(f"   Bỏ qua        : {stats['skipped']} URL")
    print(f"   Thư mục       : {DATA_DIR}")
    print("=" * 65)


if __name__ == "__main__":
    main()
