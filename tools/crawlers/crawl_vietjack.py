"""
VietJack Crawler — Per-URL JSON | 4 loại câu hỏi
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VietJack load nội dung câu hỏi qua JavaScript từ file .js riêng.
Crawler này:
  1. Strip Google redirect URL → lấy URL thật
  2. Fetch trang JSP → tìm src của script data
  3. Fetch file .js data → parse câu hỏi từ JS array
  4. Lưu JSON ngay sau khi crawl xong từng URL

Format file JS data của VietJack:
  var cauhoiData = [
    {
      id: 1,
      cauhoi: "Nội dung câu hỏi",
      dapan: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      dapandung: 1,          ← index 0-based hoặc "A"/"B"/"C"/"D"
      giaithich: "Giải thích"
    },
    ...
  ]
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
from urllib.parse import urljoin, urlparse, parse_qs, unquote

# ── SSL ──────────────────────────────────────────────────────────────────────
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode    = ssl.CERT_NONE

# ── Config ───────────────────────────────────────────────────────────────────
DATA_DIR     = "/Users/pixibox/Aeroeduvison/data/vietjack"
DELAY        = 0.5
WORKER_DELAY = 0.8
MAX_WORKERS  = 3
MAX_RETRIES  = 3
RETRY_WAIT   = 2.0
DOMAIN       = "vietjack.com"

os.makedirs(DATA_DIR, exist_ok=True)

_print_lock = threading.Lock()
_file_lock  = threading.Lock()
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
    with _print_lock:
        print(*args, **kwargs)

def clean_url(raw: str) -> str:
    """
    Strip Google redirect và các tracker khỏi URL.
    https://www.google.com/url?...&url=https://vietjack.com/...
    → https://vietjack.com/...
    """
    raw = raw.strip()
    # Google redirect
    if "google.com/url" in raw:
        qs = parse_qs(urlparse(raw).query)
        if "url" in qs:
            return qs["url"][0]
    # URL-encoded
    if raw.startswith("http%3A") or raw.startswith("https%3A"):
        raw = unquote(raw)
    return raw


# ══════════════════════════════════════════════════════════════════════════════
#  NETWORK
# ══════════════════════════════════════════════════════════════════════════════

_HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/124.0.0.0 Safari/537.36",
    "Accept":          "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    "Referer":         "https://vietjack.com/",
}

def fetch(url: str, retries: int = MAX_RETRIES) -> str | None:
    for attempt in range(1, retries + 1):
        try:
            req  = urllib.request.Request(url, headers=_HEADERS)
            resp = urllib.request.urlopen(req, context=ctx, timeout=20)
            return resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt < retries:
                cprint(f"    ↻ retry {attempt}/{retries}: {e}")
                time.sleep(RETRY_WAIT * attempt)
            else:
                cprint(f"    ✗ failed [{url}]: {e}")
    return None


# ══════════════════════════════════════════════════════════════════════════════
#  LINK DISCOVERY
# ══════════════════════════════════════════════════════════════════════════════

def _is_lesson_url(url: str) -> bool:
    path = urlparse(url).path
    if not path.endswith(".jsp"):
        return False
    slug = path.rsplit("/", 1)[-1]
    return "trac-nghiem" in slug and re.search(r"bai-\d+", slug) is not None

def discover_lesson_links(index_url: str) -> list[str]:
    cprint(f"  📄 Fetching index: {index_url}")
    html = fetch(index_url)
    if not html:
        return []
    time.sleep(DELAY)

    base_dir = index_url.rsplit("/", 1)[0] + "/"
    raw_hrefs = re.findall(r'href=["\']([^"\']+\.jsp)["\']', html)
    lessons: list[str] = []
    seen: set[str] = set()

    for href in raw_hrefs:
        abs_url = urljoin(base_dir, href).split("?")[0].rstrip("/")
        if DOMAIN not in abs_url or abs_url in seen:
            continue
        if _is_lesson_url(abs_url):
            seen.add(abs_url)
            lessons.append(abs_url)

    return sorted(lessons)


# ══════════════════════════════════════════════════════════════════════════════
#  JS DATA FILE DISCOVERY
#
#  VietJack lưu câu hỏi trong file .js riêng, được load bởi <script src="...">.
#  Crawler tìm script src trong HTML rồi fetch file .js đó.
#
#  Các pattern JS data VietJack đã biết:
#    <script src="/git/trac-nghiem/toan-1-ket-noi/trac-nghiem-bai-1-....js">
#    <script src="https://vietjack.com/git/.../*.js">
# ══════════════════════════════════════════════════════════════════════════════

def _find_data_script_url(html: str, page_url: str) -> str | None:
    """Tìm URL file .js chứa data câu hỏi trong HTML trang."""
    # Tìm tất cả script src
    scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE)
    folder  = urlparse(page_url).path.rsplit("/", 1)[0].strip("/")
    slug    = urlparse(page_url).path.rsplit("/", 1)[-1].replace(".jsp", "")

    for src in scripts:
        # JS data thường chứa slug của bài học
        if slug in src and src.endswith(".js"):
            return urljoin(page_url, src)
        # Hoặc nằm trong thư mục /git/trac-nghiem/
        if "/git/" in src and "trac-nghiem" in src and src.endswith(".js"):
            return urljoin(page_url, src)

    # Fallback: đoán URL trực tiếp theo pattern phổ biến
    candidates = [
        f"https://vietjack.com/git/trac-nghiem/{folder}/{slug}.js",
        f"https://vietjack.com/git/{folder}/{slug}.js",
        f"https://vietjack.com/data/trac-nghiem/{folder}/{slug}.js",
    ]
    return candidates[0]  # thử cái đầu tiên


# ══════════════════════════════════════════════════════════════════════════════
#  JS DATA PARSER
#
#  VietJack JS data có nhiều format khác nhau. Các format phổ biến:
#
#  Format 1 — Array of objects:
#    var data = [{
#      cauhoi: "...",
#      A: "...", B: "...", C: "...", D: "...",
#      dapan: "A",
#      giaithich: "..."
#    }, ...]
#
#  Format 2 — Nested arrays:
#    var arrQuestion = ["Câu 1...", "Câu 2..."]
#    var arrAnswer   = [["A1","B1","C1","D1"], ...]
#    var arrCorrect  = ["A", "B", ...]
#
#  Format 3 — JSON-like trong JS:
#    cauHoi = { 1: { nd: "...", a: "...", b: "...", c: "...", d: "...", kq: 2 } }
# ══════════════════════════════════════════════════════════════════════════════

def _unescape_js_string(s: str) -> str:
    """Decode JS string escapes."""
    s = s.replace(r"\n", "\n").replace(r"\t", "\t").replace(r"\'", "'").replace(r'\"', '"')
    s = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), s)
    return strip_html(s)

def _parse_js_object_array(js: str) -> list[dict]:
    """
    Parse format: var data = [{cauhoi:"...", A:"...", dapan:"A"}, ...]
    Dùng regex vì JS không phải JSON hợp lệ.
    """
    results: list[dict] = []

    # Tìm array chứa objects với pattern câu hỏi
    block_m = re.search(
        r'(?:var\s+\w+\s*=\s*|=\s*)\[(\{.*?\})\s*\]',
        js, re.DOTALL,
    )
    if not block_m:
        return []

    # Split từng object
    obj_texts = re.split(r'\}\s*,\s*\{', block_m.group(1))
    idx = 0

    for obj_text in obj_texts:
        obj_text = obj_text.strip().strip("{}")

        def get_field(keys, text=obj_text):
            for k in keys:
                m = re.search(
                    rf'["\']?{k}["\']?\s*:\s*["\']?(.*?)["\']?\s*(?:,\s*["\']?\w|$)',
                    text, re.DOTALL,
                )
                if m:
                    return _unescape_js_string(m.group(1).strip().strip("'\""))
            return ""

        q_text = get_field(["cauhoi", "cauHoi", "question", "nd", "noidung"])
        opt_a  = get_field(["A", "a", "dapanA"])
        opt_b  = get_field(["B", "b", "dapanB"])
        opt_c  = get_field(["C", "c", "dapanC"])
        opt_d  = get_field(["D", "d", "dapanD"])
        answer = get_field(["dapan", "dapAn", "correct", "kq", "ketqua"]).upper()
        expl   = get_field(["giaithich", "giaiThich", "explain", "loigiai"])

        if not q_text or not opt_a:
            continue

        # Normalize answer: nếu là số 1-4 → chuyển A-D
        if answer in ("1", "2", "3", "4"):
            answer = chr(ord("A") + int(answer) - 1)
        if answer in ("0",):
            answer = "A"

        if answer not in ("A", "B", "C", "D"):
            continue

        idx += 1
        results.append({
            "id":              f"sc_{idx:03d}",
            "type":            "single_choice",
            "question_number": idx,
            "question":        q_text,
            "options":         {"A": opt_a, "B": opt_b, "C": opt_c, "D": opt_d},
            "answer":          answer,
            "explanation":     expl,
        })

    return results


def _parse_js_parallel_arrays(js: str) -> list[dict]:
    """
    Parse format parallel arrays:
      var arrQuestion = ["q1", "q2", ...]
      var arrAnswer   = [["a","b","c","d"], ...]
      var arrCorrect  = ["A", "B", ...]
    """
    def extract_str_array(name: str) -> list[str]:
        m = re.search(rf'var\s+{name}\s*=\s*\[(.*?)\]', js, re.DOTALL)
        if not m:
            return []
        return [_unescape_js_string(s.strip().strip("'\""))
                for s in re.findall(r'["\']([^"\']*)["\']', m.group(1))]

    def extract_nested_array(name: str) -> list[list[str]]:
        m = re.search(rf'var\s+{name}\s*=\s*\[(.*?)\](?:\s*;)', js, re.DOTALL)
        if not m:
            return []
        rows = re.findall(r'\[([^\]]+)\]', m.group(1))
        result = []
        for row in rows:
            items = [_unescape_js_string(s.strip().strip("'\""))
                     for s in re.findall(r'["\']([^"\']*)["\']', row)]
            result.append(items)
        return result

    questions = (extract_str_array("arrQuestion") or
                 extract_str_array("questions") or
                 extract_str_array("arrCauHoi"))
    answers   = (extract_nested_array("arrAnswer") or
                 extract_nested_array("arrDapAn"))
    corrects  = (extract_str_array("arrCorrect") or
                 extract_str_array("arrDapDung") or
                 extract_str_array("arrKetQua"))

    if not questions or not answers:
        return []

    results = []
    for i, (q, opts) in enumerate(zip(questions, answers)):
        if len(opts) < 2:
            continue
        options = {chr(ord("A") + j): opts[j] for j in range(min(4, len(opts)))}
        answer  = corrects[i].upper() if i < len(corrects) else ""
        if answer in ("1","2","3","4"):
            answer = chr(ord("A") + int(answer) - 1)
        if answer not in ("A","B","C","D"):
            continue
        results.append({
            "id":              f"sc_{i+1:03d}",
            "type":            "single_choice",
            "question_number": i + 1,
            "question":        q,
            "options":         options,
            "answer":          answer,
            "explanation":     "",
        })
    return results


def parse_js_data(js: str) -> list[dict]:
    """Thử parse theo thứ tự ưu tiên."""
    result = _parse_js_object_array(js)
    if result:
        return result
    result = _parse_js_parallel_arrays(js)
    if result:
        return result
    return []


# ══════════════════════════════════════════════════════════════════════════════
#  CRAWL ONE PAGE
# ══════════════════════════════════════════════════════════════════════════════

def crawl_page(url: str) -> tuple[str, list[dict]]:
    """
    Fetch trang JSP → tìm JS data file → parse câu hỏi.
    Trả về (title, questions).
    """
    html = fetch(url)
    if not html:
        return "", []

    title = extract_title(html)

    # Tìm URL file JS data
    js_url = _find_data_script_url(html, url)
    if not js_url:
        return title, []

    cprint(f"      📦 JS data: {js_url.split('/')[-1]}")
    js_content = fetch(js_url)
    if not js_content:
        # Thử các candidate khác
        folder = urlparse(url).path.rsplit("/", 1)[0].strip("/")
        slug   = urlparse(url).path.rsplit("/", 1)[-1].replace(".jsp", "")
        for candidate in [
            f"https://vietjack.com/git/{folder}/{slug}.js",
            f"https://vietjack.com/data/trac-nghiem/{folder}/{slug}.js",
            f"https://vietjack.com/data/{folder}/{slug}.js",
        ]:
            js_content = fetch(candidate)
            if js_content:
                break

    if not js_content:
        return title, []

    questions = parse_js_data(js_content)
    return title, questions


# ══════════════════════════════════════════════════════════════════════════════
#  FILE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _safe_slug(url: str, max_len: int = 70) -> str:
    path = urlparse(url).path.strip("/")
    path = re.sub(r"\.jsp$", "", path)
    slug = re.sub(r"[^a-z0-9_-]", "-", path.lower())
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug[:max_len]

def save_url_json(title: str, url: str, questions: list[dict]) -> str:
    counts = {"single_choice": 0, "true_false": 0, "short_answer": 0, "essay": 0}
    for q in questions:
        t = q.get("type", "single_choice")
        counts[t] = counts.get(t, 0) + 1

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
            fname = f"{slug}_{n}.json"; path = os.path.join(DATA_DIR, fname); n += 1
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
    return path


# ══════════════════════════════════════════════════════════════════════════════
#  CONCURRENT CRAWL WORKER
# ══════════════════════════════════════════════════════════════════════════════

def crawl_one(args: tuple[int, int, str]) -> dict:
    i, total, url = args
    result = {"url": url, "sc": 0, "files": 0, "skipped": False}

    title, questions = crawl_page(url)
    time.sleep(WORKER_DELAY)

    if not questions:
        cprint(f"[{i:>4}/{total}] – 0 câu  {url}")
        result["skipped"] = True
        return result

    path = save_url_json(title, url, questions)  # lưu ngay
    sc_n = len(questions)
    result.update({"sc": sc_n, "files": 1})
    cprint(f"[{i:>4}/{total}] ✓ SC:{sc_n}  →  {os.path.basename(path)}")
    return result


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 65)
    print("  VietJack Crawler — Per-URL JSON | JS data parser")
    print("=" * 65)
    print()
    print("  Nhập URL trang INDEX hoặc URL bài học VietJack.")
    print("  Hỗ trợ cả Google redirect URL (tự động strip).")
    print()
    print("  Ví dụ index:")
    print("    https://vietjack.com/toan-1-ket-noi/trac-nghiem-toan-lop-1.jsp")
    print()
    print("  Ví dụ bài học:")
    print("    https://vietjack.com/toan-1-ket-noi/trac-nghiem-bai-1-cac-so-0-1-2-3-4-5.jsp")
    print()
    print(f"  Workers   : {MAX_WORKERS}")
    print(f"  Lưu vào   : {DATA_DIR}")
    print()

    raw = input("Nhập URL(s) (mỗi URL 1 dòng): ").strip()
    if not raw:
        print("Chưa nhập URL. Thoát.")
        return

    input_urls = [clean_url(line) for line in raw.splitlines() if line.strip()]

    # ── Phân loại: index vs bài học trực tiếp ────────────────────────────────
    index_urls  = [u for u in input_urls if not _is_lesson_url(u)]
    direct_urls = [u for u in input_urls if _is_lesson_url(u)]

    print(f"\n{'─' * 65}")
    print("🌐  Tìm link bài học...")
    print(f"{'─' * 65}")

    all_lessons: list[str] = list(direct_urls)
    seen: set[str] = set(direct_urls)

    for idx_url in index_urls:
        found = discover_lesson_links(idx_url)
        new   = [u for u in found if u not in seen]
        all_lessons.extend(new)
        seen.update(new)
        cprint(f"  ✅ +{len(new)} bài từ: {idx_url}")

    all_lessons = sorted(set(all_lessons))
    total       = len(all_lessons)

    print(f"\n{'─' * 65}")
    print(f"📚  {total} bài học sẽ được crawl")
    print(f"{'─' * 65}\n")

    if not total:
        print("Không tìm thấy bài học nào.")
        return

    # ── Crawl & save ─────────────────────────────────────────────────────────
    stats = {"sc": 0, "files": 0, "skipped": 0}
    args_list = [(i, total, url) for i, url in enumerate(all_lessons, 1)]

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(crawl_one, a): a for a in args_list}
        for future in as_completed(futures):
            try:
                res = future.result()
                if res["skipped"]:
                    stats["skipped"] += 1
                else:
                    stats["sc"]    += res["sc"]
                    stats["files"] += res["files"]
            except Exception as e:
                cprint(f"  ⚠ worker error: {e}")
                stats["skipped"] += 1

    print(f"\n{'=' * 65}")
    print(f"✅  Hoàn thành!")
    print(f"   Files đã lưu    : {stats['files']}")
    print(f"   Câu hỏi         : {stats['sc']}")
    print(f"   Bỏ qua          : {stats['skipped']} URL")
    print(f"   Thư mục         : {DATA_DIR}")
    print("=" * 65)


if __name__ == "__main__":
    main()
