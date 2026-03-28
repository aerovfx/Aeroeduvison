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
ctx.verify_mode = ssl.CERT_NONE

# ── Config ───────────────────────────────────────────────────────────────────
DATA_DIR = "/Users/pixibox/Aeroeduvison/data"
os.makedirs(DATA_DIR, exist_ok=True)

DELAY = 0.3
MAX_DEPTH = 5
DOMAIN = "tech12h.com"
MAX_WORKERS = 5

_print_lock = threading.Lock()
_file_lock = threading.Lock()

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


# ══════════════════════════════════════════════════════════════════════════════
#  NETWORK
# ══════════════════════════════════════════════════════════════════════════════


def fetch(url: str) -> str | None:
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": "Mozilla/5.0 (compatible; crawler)"}
        )
        resp = urllib.request.urlopen(req, context=ctx, timeout=15)
        return resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        cprint(f"    Lỗi fetch [{url}]: {e}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
#  LINK DISCOVERY
# ══════════════════════════════════════════════════════════════════════════════


def _is_same_domain(url: str) -> bool:
    return DOMAIN in urlparse(url).netloc


def _is_lesson_url(url: str) -> bool:
    return "/bai-hoc/" in url


_SKIP_URL_RE = re.compile(
    r"\.(?:css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|pdf)$"
    r"|/sites/"
    r"|/lop-\d"
    r"|/tag/"
    r"|/search"
    r"|/user/"
    r"|/giao/"
    r"|/node/"
    r"|facebook\.com|youtube\.com|zalo\.me",
    re.IGNORECASE,
)


def _extract_all_links(html: str, base_url: str) -> list[str]:
    raw = re.findall(r'href=["\']([^"\'#\s]+)["\']', html)
    links = []
    for href in raw:
        abs_url = urljoin(base_url, href).split("?")[0].split("#")[0].rstrip("/")
        if not _is_same_domain(abs_url):
            continue
        if abs_url == base_url:
            continue
        if _SKIP_URL_RE.search(abs_url):
            continue
        links.append(abs_url)
    return list(set(links))


def discover_lesson_links(start_url: str, max_depth: int = MAX_DEPTH) -> list[str]:
    visited: set[str] = set()
    lesson_urls: set[str] = set()
    queue: deque[tuple[str, int]] = deque()

    start_url = start_url.rstrip("/")
    queue.append((start_url, 0))
    visited.add(start_url)

    while queue:
        url, depth = queue.popleft()

        if _is_lesson_url(url):
            lesson_urls.add(url)
            continue

        if depth >= max_depth:
            continue

        cprint(f"  [depth={depth}] {url}")
        html = fetch(url)
        if not html:
            continue
        time.sleep(DELAY)

        for link in _extract_all_links(html, url):
            if link in visited:
                continue
            visited.add(link)
            if _is_lesson_url(link):
                lesson_urls.add(link)
            elif depth + 1 < max_depth:
                queue.append((link, depth + 1))

    return sorted(lesson_urls)


# ══════════════════════════════════════════════════════════════════════════════
#  PARSERS
# ══════════════════════════════════════════════════════════════════════════════

_PAT_LI = re.compile(r"<li[^>]*>(.*?)</li>", re.DOTALL)

_SC_PATTERNS = [
    re.compile(
        r"<p><strong>Câu(?:\s|&nbsp;)*(\d+)(?:\s|&nbsp;)*:?(?:\s|&nbsp;)*</strong>"
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

        q_text = strip_html(m.group(2))
        options = {"A": "", "B": "", "C": "", "D": ""}
        answer = ""

        for i, li_m in enumerate(_PAT_LI.finditer(m.group(3))):
            if i >= 4:
                break
            label = chr(ord("A") + i)
            raw_text = unescape(li_m.group(1))
            opt_text = re.sub(r"^[A-D]\.\s*", "", strip_html(raw_text))
            options[label] = opt_text
            if "<h6>" in li_m.group(0):
                answer = label

        if not options["A"] or not answer:
            continue

        seen.add(q_num)
        idx += 1
        results.append(
            {
                "id": f"sc_{idx:03d}",
                "type": "single_choice",
                "question_number": q_num,
                "question": q_text,
                "options": options,
                "answer": answer,
            }
        )

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

        q_text = strip_html(m.group(2))
        statements = []

        for i, li_m in enumerate(_PAT_LI.finditer(ul_html)):
            if i >= 4:
                break
            label = chr(ord("a") + i)
            raw_text = strip_html(li_m.group(1))
            raw_text = re.sub(r"^[a-dA-D][.)]\s*", "", raw_text)
            is_correct = "<h6>" in li_m.group(0) or bool(
                re.search(r"\bĐúng\b", li_m.group(1))
            )
            stmt_text = re.sub(r"\s*\b(Đúng|Sai)\b\s*$", "", raw_text).strip()
            statements.append({"label": label, "text": stmt_text, "answer": is_correct})

        if not statements:
            continue

        seen.add(q_num)
        idx += 1
        results.append(
            {
                "id": f"tf_{idx:03d}",
                "type": "true_false",
                "question_number": q_num,
                "question": q_text,
                "statements": statements,
            }
        )

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
        q_num = int(m.group(1))
        answer = m.group(3).strip()
        if not _SHORT_ANSWER_RE.match(answer) or q_num in seen:
            continue
        seen.add(q_num)
        idx += 1
        results.append(
            {
                "id": f"sa_{idx:03d}",
                "type": "short_answer",
                "question_number": q_num,
                "question": strip_html(m.group(2)),
                "answer": answer,
            }
        )
    return results


def _reclassify_short_answers(sc_list: list[dict]) -> tuple[list[dict], list[dict]]:
    sc_kept: list[dict] = []
    sa_out: list[dict] = []
    sa_idx = 0
    for q in sc_list:
        ans_text = q["options"].get(q["answer"], "").strip()
        if _SHORT_ANSWER_RE.match(ans_text):
            sa_idx += 1
            sa_out.append(
                {
                    "id": f"sa_{sa_idx:03d}",
                    "type": "short_answer",
                    "question_number": q["question_number"],
                    "question": q["question"],
                    "answer": ans_text,
                }
            )
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
        rf"(?:{kw_re})\s*[:\-]?\s*</?\w*>\s*(.*?)(?=<(?:p|strong|b|h\d)\b|\Z)",
        block,
        re.DOTALL | re.IGNORECASE,
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
        q_text = strip_html(m.group(3) if m.lastindex >= 3 else "")
        remainder = m.group(4) if m.lastindex >= 4 else ""

        max_score: float | None = None
        if score_raw:
            try:
                max_score = float(score_raw.replace(",", "."))
            except ValueError:
                pass

        hint = _grab_field(remainder, ["hướng dẫn", "gợi ý", "lưu ý", "hint"])
        sample_answer = _grab_field(
            remainder, ["đáp án", "lời giải", "trả lời", "answer"]
        )

        if not q_text:
            continue

        seen.add(q_num)
        idx += 1
        results.append(
            {
                "id": f"es_{idx:03d}",
                "type": "essay",
                "question_number": q_num,
                "question": q_text,
                "hint": hint,
                "sample_answer": sample_answer,
                "max_score": max_score,
            }
        )

    return results


# ══════════════════════════════════════════════════════════════════════════════
#  PAGE ROUTER
# ══════════════════════════════════════════════════════════════════════════════


def parse_page(html: str) -> tuple[str, list[dict]]:
    title = extract_title(html)

    block = None
    for pattern in [
        r'class="trac_nghiem"[^>]*>(.*?)class="kqua"',
        r'class="tu_luan"[^>]*>(.*?)(?:class="kqua"|</div>\s*</div>)',
        r'id="de-bai"[^>]*>(.*?)(?:id="dap-an"|</div>\s*</div>)',
        r'class="content-bai-hoc"[^>]*>(.*?)(?:</article>|</section>)',
        r"<article[^>]*>(.*?)</article>",
    ]:
        bm = re.search(pattern, html, re.DOTALL)
        if bm:
            block = bm.group(1)
            break
    if not block:
        body = re.search(r"<body[^>]*>(.*?)</body>", html, re.DOTALL)
        block = body.group(1) if body else html

    tf_questions = _parse_true_false(block)
    tf_nums = {q["question_number"] for q in tf_questions}

    sc_raw = [
        q for q in _parse_single_choice(block) if q["question_number"] not in tf_nums
    ]
    sc_questions, sa_from_sc = _reclassify_short_answers(sc_raw)

    sa_from_sc_nums = {q["question_number"] for q in sa_from_sc}
    sa_explicit = [
        q
        for q in _parse_short_answer_explicit(block)
        if q["question_number"] not in sa_from_sc_nums
    ]
    sa_questions = sa_from_sc + sa_explicit

    has_essay = any(kw in html for kw in ["tự luận", "tu_luan", "điểm)", "điểm:"])
    known_nums = (
        {q["question_number"] for q in sc_questions}
        | tf_nums
        | {q["question_number"] for q in sa_questions}
    )
    essay_questions = []
    if has_essay or not (sc_questions or tf_questions or sa_questions):
        essay_questions = [
            q for q in _parse_essay(block) if q["question_number"] not in known_nums
        ]

    all_q = sc_questions + tf_questions + sa_questions + essay_questions
    all_q.sort(key=lambda q: q["question_number"])

    counters = {"single_choice": 0, "true_false": 0, "short_answer": 0, "essay": 0}
    prefixes = {
        "single_choice": "sc",
        "true_false": "tf",
        "short_answer": "sa",
        "essay": "es",
    }
    for q in all_q:
        t = q["type"]
        counters[t] += 1
        q["id"] = f"{prefixes[t]}_{counters[t]:03d}"

    return title, all_q


# ══════════════════════════════════════════════════════════════════════════════
#  FILE HELPERS
# ══════════════════════════════════════════════════════════════════════════════


def _safe_slug(url: str, max_len: int = 60) -> str:
    parsed = urlparse(url)
    path = parsed.path.strip("/")
    if "/bai-hoc/" in path:
        segs = [s for s in path.split("/") if s]
        if len(segs) >= 2 and segs[-2] == "bai-hoc":
            slug = segs[-1]
        else:
            slug = segs[-1] if segs else path.replace("/", "-")
    else:
        slug = path.replace("/", "-")
    slug = re.sub(r"[^a-z0-9_-]", "-", slug.lower())
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug[:max_len]


def save_url_json(title: str, url: str, questions: list[dict]) -> str:
    """Thread-safe: lưu JSON cho 1 URL, trả về path."""
    counts = {"single_choice": 0, "true_false": 0, "short_answer": 0, "essay": 0}
    for q in questions:
        counts[q["type"]] += 1

    payload = {
        "title": title,
        "source_url": url,
        "crawled_at": now_iso(),
        "total_questions": len(questions),
        **counts,
        "questions": questions,
    }

    slug = _safe_slug(url)
    fname = f"{slug}.json"

    with _file_lock:
        path = os.path.join(DATA_DIR, fname)
        n = 1
        while os.path.exists(path):
            fname = f"{slug}_{n}.json"
            path = os.path.join(DATA_DIR, fname)
            n += 1
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    return path


# ══════════════════════════════════════════════════════════════════════════════
#  CONCURRENT CRAWL WORKER
# ══════════════════════════════════════════════════════════════════════════════


def crawl_one(args: tuple[int, int, str]) -> dict:
    i, total, url = args
    result = {
        "url": url,
        "sc": 0,
        "tf": 0,
        "sa": 0,
        "es": 0,
        "file": None,
        "skipped": False,
    }

    html = fetch(url)
    if not html:
        cprint(f"[{i:>4}/{total}] X {url}")
        result["skipped"] = True
        return result

    title, questions = parse_page(html)

    if not questions:
        cprint(f"[{i:>4}/{total}] - 0 cau  {url}")
        result["skipped"] = True
        return result

    path = save_url_json(title, url, questions)

    sc_n = sum(1 for q in questions if q["type"] == "single_choice")
    tf_n = sum(1 for q in questions if q["type"] == "true_false")
    sa_n = sum(1 for q in questions if q["type"] == "short_answer")
    es_n = sum(1 for q in questions if q["type"] == "essay")

    result.update({"sc": sc_n, "tf": tf_n, "sa": sa_n, "es": es_n, "file": path})

    parts = []
    if sc_n:
        parts.append(f"SC:{sc_n}")
    if tf_n:
        parts.append(f"TF:{tf_n}")
    if sa_n:
        parts.append(f"SA:{sa_n}")
    if es_n:
        parts.append(f"TL:{es_n}")
    cprint(f"[{i:>4}/{total}] OK {' | '.join(parts)}  ->  {os.path.basename(path)}")

    return result


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════


def main():
    print("=" * 65)
    print("  Tech12h Crawler v3 - Per-URL JSON | 4 loai | Concurrent")
    print("=" * 65)
    print()
    print("  Loai cau hoi:")
    print("   - single_choice  : A/B/C/D, 1 dap an")
    print("   - true_false     : dung/sai tung menh de a/b/c/d")
    print("   - short_answer   : chuoi 4 ky tu [-0-9]{4}")
    print("   - essay          : tu luan")
    print()
    print(f"  BFS chi scan trang INDEX (khong dao vao bai hoc)")
    print(f"  Crawl song song  : {MAX_WORKERS} workers")
    print(f"  Do sau BFS       : {MAX_DEPTH} cap")
    print(f"  Delay discovery  : {DELAY}s / request")
    print(f"  Luu vao          : {DATA_DIR}")
    print()

    raw = input("Nhap URL(s) (moi URL 1 dong): ").strip()
    if not raw:
        print("Chua nhap URL. Thoat.")
        return

    seed_urls = [line.strip().rstrip("/") for line in raw.splitlines() if line.strip()]

    print(f"\n{'─' * 65}")
    print(f"  Kham pha sublink tu {len(seed_urls)} URL goc...")
    print(f"{'─' * 65}")

    visited: set[str] = set()
    lesson_links: list[str] = []

    for seed in seed_urls:
        seed = seed.rstrip("/")
        if _is_lesson_url(seed):
            if seed not in visited:
                lesson_links.append(seed)
                visited.add(seed)
        else:
            found = discover_lesson_links(seed, max_depth=MAX_DEPTH)
            new = [u for u in found if u not in set(lesson_links)]
            lesson_links.extend(new)
            print(f"  +{len(new)} bai tu: {seed}")

    lesson_links = sorted(set(lesson_links))
    total = len(lesson_links)

    print(f"\n{'─' * 65}")
    print(f"  {total} bai hoc | crawl voi {MAX_WORKERS} workers")
    print(f"{'─' * 65}\n")

    if not total:
        print("Khong tim thay bai hoc nao.")
        return

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
                    stats["sc"] += res["sc"]
                    stats["tf"] += res["tf"]
                    stats["sa"] += res["sa"]
                    stats["es"] += res["es"]
                    stats["files"] += 1
            except Exception as e:
                cprint(f"  Worker error: {e}")
                stats["skipped"] += 1

    print(f"\n{'=' * 65}")
    print(f"  Hoan thanh!")
    print(f"   Files da luu  : {stats['files']}")
    print(f"   single_choice  : {stats['sc']} cau")
    print(f"   true_false     : {stats['tf']} cau")
    print(f"   short_answer   : {stats['sa']} cau")
    print(f"   essay          : {stats['es']} cau")
    print(f"   Bo qua         : {stats['skipped']} URL")
    print(f"   Thu muc        : {DATA_DIR}")
    print("=" * 65)


if __name__ == "__main__":
    main()
