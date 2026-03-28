"""
Tech12h Crawler — Multi-level recursive crawler
Tự động khám phá sublink nhiều cấp từ bất kỳ URL nào trên tech12h.com
"""

import urllib.request
import ssl
import re
import json
import os
import time
from html import unescape
from collections import deque
from urllib.parse import urljoin, urlparse

# ── SSL ──────────────────────────────────────────────────────────────────────
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# ── Config ───────────────────────────────────────────────────────────────────
DATA_DIR    = "/Users/pixibox/Aeroeduvison/data"
DELAY       = 0.5          # giây giữa các request (tránh bị block)
MAX_DEPTH   = 5            # độ sâu tối đa khi đệ quy sublink
DOMAIN      = "tech12h.com"

os.makedirs(DATA_DIR, exist_ok=True)


# ══════════════════════════════════════════════════════════════════════════════
#  HTML UTILS
# ══════════════════════════════════════════════════════════════════════════════

def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def extract_title(html: str) -> str:
    m = re.search(r"<title>([^<]+)</title>", html)
    return strip_html(m.group(1)) if m else ""


# ══════════════════════════════════════════════════════════════════════════════
#  NETWORK
# ══════════════════════════════════════════════════════════════════════════════

def fetch(url: str) -> str | None:
    """Tải HTML tại url, trả về None nếu lỗi."""
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": "Mozilla/5.0 (compatible; crawler)"}
        )
        resp = urllib.request.urlopen(req, context=ctx, timeout=15)
        return resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"    ⚠ fetch error [{url}]: {e}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
#  LINK DISCOVERY  (đa cấp BFS)
# ══════════════════════════════════════════════════════════════════════════════

def _is_same_domain(url: str) -> bool:
    return DOMAIN in urlparse(url).netloc


def _extract_all_links(html: str, base_url: str) -> list[str]:
    """Lấy tất cả href trong trang, normalize về absolute URL."""
    raw = re.findall(r'href=["\']([^"\'#\s]+)["\']', html)
    links = []
    for href in raw:
        abs_url = urljoin(base_url, href).split("?")[0].split("#")[0].rstrip("/")
        if _is_same_domain(abs_url):
            links.append(abs_url)
    return list(set(links))


def _is_lesson_url(url: str) -> bool:
    """True nếu URL là trang bài học có trắc nghiệm."""
    return "/bai-hoc/trac-nghiem" in url


def discover_lesson_links(
    start_url: str,
    max_depth: int = MAX_DEPTH,
    _visited: set | None = None,
) -> list[str]:
    """
    BFS đệ quy từ start_url đến max_depth cấp.
    Trả về danh sách URL bài học (có /bai-hoc/trac-nghiem).
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

        # Nếu chính URL này là bài học → thêm ngay
        if _is_lesson_url(url):
            lesson_urls.add(url)

        # Không đào sâu hơn giới hạn
        if depth >= max_depth:
            continue

        print(f"  🔍 [depth={depth}] Scanning: {url}")
        html = fetch(url)
        if not html:
            continue

        time.sleep(DELAY)

        for link in _extract_all_links(html, url):
            if link in _visited:
                continue
            _visited.add(link)

            if _is_lesson_url(link):
                lesson_urls.add(link)
                # Bài học cũng có thể chứa link sang bài khác → vẫn queue nếu còn depth
                if depth + 1 < max_depth:
                    queue.append((link, depth + 1))
            else:
                # Trang danh mục / index → tiếp tục đào
                queue.append((link, depth + 1))

    return sorted(lesson_urls)


# ══════════════════════════════════════════════════════════════════════════════
#  PARSER
# ══════════════════════════════════════════════════════════════════════════════

_PAT_STRONG = re.compile(
    r"<p><strong>Câu(?:\s|&nbsp;)*(\d+)(?:\s|&nbsp;)*:(?:\s|&nbsp;)*</strong>"
    r"(?:\s|&nbsp;)*(.*?)</p>\s*<ul>(.*?)</ul>",
    re.DOTALL,
)
_PAT_PLAIN = re.compile(
    r"<p>Câu\s*(\d+):\s*(.*?)</p>\s*<ul>(.*?)</ul>",
    re.DOTALL,
)
_PAT_LI = re.compile(r"<li[^>]*>(.*?)</li>", re.DOTALL)


def parse_questions(html: str) -> tuple[str, list[dict]]:
    title = extract_title(html)

    block = re.search(
        r'trac_nghiem"[^>]*>(.+?)class="kqua"', html, re.DOTALL
    )
    if not block:
        return title, []

    content = block.group(1)
    questions = []

    for m in list(_PAT_STRONG.finditer(content)) + list(_PAT_PLAIN.finditer(content)):
        q_num   = int(m.group(1))
        q_text  = strip_html(m.group(2))
        options = {"A": "", "B": "", "C": "", "D": ""}
        answer  = ""

        for i, li_m in enumerate(_PAT_LI.finditer(m.group(3))):
            if i >= 4:
                break
            letter   = chr(ord("A") + i)
            raw      = li_m.group(1)
            opt_text = unescape(raw)
            opt_text = re.sub(r"^[A-D]\.\s*", "", opt_text)
            options[letter] = opt_text
            if "<h6>" in li_m.group(0):
                answer = letter

        if options["A"] and answer:
            questions.append(
                {
                    "question_number": q_num,
                    "question": q_text,
                    "options": options,
                    "answer": answer,
                }
            )

    return title, questions


# ══════════════════════════════════════════════════════════════════════════════
#  FILE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _safe_slug(url: str, max_len: int = 50) -> str:
    slug = re.search(r"trac-nghiem[_-]?([^/]+)$", url)
    name = slug.group(1).rstrip("/") if slug else urlparse(url).path.strip("/")
    name = re.sub(r"[^a-z0-9_-]", "-", name.lower())
    return name[:max_len]


def save_single(title: str, url: str, questions: list[dict]) -> str:
    slug  = _safe_slug(url)
    fname = f"{slug}.json"
    data  = {
        "title": title,
        "source": url,
        "total_questions": len(questions),
        "questions": questions,
    }
    path = os.path.join(DATA_DIR, fname)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return fname


def save_merged(all_q: list[dict], links: list[str]) -> str:
    slug  = _safe_slug(links[0]) if links else "output"
    fname = f"{slug}_merged.json"
    data  = {
        "title": f"Trắc nghiệm - Tech12h ({len(links)} bài)",
        "source": ", ".join(links[:3]) + ("…" if len(links) > 3 else ""),
        "total_questions": len(all_q),
        "questions": all_q,
    }
    path = os.path.join(DATA_DIR, fname)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return fname


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 62)
    print("  Tech12h Crawler  —  Multi-level recursive")
    print("=" * 62)
    print()
    print("Nhập 1 hoặc nhiều URL (mỗi URL 1 dòng).")
    print("Crawler sẽ tự động tìm sublink nhiều cấp.")
    print()
    print(f"  Độ sâu tối đa : {MAX_DEPTH} cấp")
    print(f"  Delay          : {DELAY}s / request")
    print(f"  Lưu vào        : {DATA_DIR}")
    print()

    raw = input("Nhập URL(s): ").strip()
    if not raw:
        print("Chưa nhập URL. Thoát.")
        return

    seed_urls = [l.strip().rstrip("/") for l in raw.splitlines() if l.strip()]

    # ── Discover all lesson links ────────────────────────────────────────────
    print(f"\n{'─' * 62}")
    print(f"🌐  Bắt đầu khám phá từ {len(seed_urls)} URL gốc...")
    print(f"{'─' * 62}")

    visited: set[str] = set()
    all_lesson_links: list[str] = []

    for seed in seed_urls:
        if _is_lesson_url(seed):
            # Nếu chính link đó đã là bài học → thêm thẳng
            if seed not in visited:
                all_lesson_links.append(seed)
                visited.add(seed)
        else:
            found = discover_lesson_links(seed, max_depth=MAX_DEPTH, _visited=visited)
            new   = [u for u in found if u not in set(all_lesson_links)]
            all_lesson_links.extend(new)
            print(f"  ✅ Tìm thấy {len(new)} bài mới từ: {seed}")

    all_lesson_links = sorted(set(all_lesson_links))
    total = len(all_lesson_links)

    print(f"\n{'─' * 62}")
    print(f"📚  Tổng cộng {total} bài học sẽ được crawl")
    print(f"{'─' * 62}\n")

    if not total:
        print("Không tìm thấy bài học nào.")
        return

    # ── Crawl each lesson ────────────────────────────────────────────────────
    all_questions: list[dict] = []
    ok_links: list[str] = []

    for i, url in enumerate(all_lesson_links, 1):
        print(f"[{i:>4}/{total}] {url}")
        html = fetch(url)
        if not html:
            continue

        time.sleep(DELAY)
        title, questions = parse_questions(html)

        if questions:
            fname = save_single(title, url, questions)
            all_questions.extend(questions)
            ok_links.append(url)
            print(f"         ✓ {len(questions)} câu  →  {fname}")
        else:
            print("         – 0 câu (bỏ qua)")

    # ── Merge ────────────────────────────────────────────────────────────────
    print(f"\n{'=' * 62}")
    print(f"✅  Hoàn thành: {len(all_questions)} câu từ {len(ok_links)} bài")

    if all_questions:
        merged = save_merged(all_questions, ok_links)
        print(f"📦  Đã lưu merged: {merged}")

    print("=" * 62)


if __name__ == "__main__":
    main()
