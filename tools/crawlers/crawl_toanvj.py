import urllib.request
import ssl
import re
import json
import os
from html import unescape
from urllib.parse import urljoin

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

DATA_DIR = "/Users/pixibox/Aeroeduvison/data"
os.makedirs(DATA_DIR, exist_ok=True)

_INDEX_URL = "https://vietjack.com/toan-1-ket-noi/trac-nghiem-toan-lop-1.jsp"
_OUT_FILE = os.path.join(DATA_DIR, "toanvj_b500.json")

# ── helpers ───────────────────────────────────────────────────────────────────


def strip_html(text):
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def clean_option(text):
    text = re.sub(r"^[A-D]\.\s*", "", text)
    return unescape(text).strip()


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    resp = urllib.request.urlopen(req, context=ctx, timeout=30)
    return resp.read().decode("utf-8", errors="replace")


def extract_title(html):
    m = re.search(r"<title>([^<]+)</title>", html)
    return strip_html(m.group(1)) if m else ""


# ── discover lesson links ─────────────────────────────────────────────────────


def get_lesson_links(index_url):
    html = fetch(index_url)
    base = "/".join(index_url.split("/")[:-1]) + "/"
    raw = re.findall(r'href="(\.\./toan[^?"]+\.jsp)"', html)
    links = []
    for href in raw:
        abs_url = urljoin(base, href).replace("../", "")
        if "/toan-1-ket-noi/trac-nghiem-bai-" in abs_url:
            links.append(abs_url)
    return sorted(set(links))


# ── extract options ────────────────────────────────────────────────────────────

_OPT_PATTERNS = [
    r"<p><span><strong>\s*([A-D])\.\s*</strong>\s*(.*?)</span></p>",
    r"<p><span><strong>\s*([A-D])\.</strong>(.*?)</span></p>",
    r"<p><strong><span>\s*([A-D])\.\s*</span></strong><span>\s*(.*?)</span></p>",
    r"<p><strong><span>\s*([A-D])\.\s*(.*?)</span></strong></p>",
    r"<p><strong><span>\s*([A-D])\.</span></strong><span>(.*?)</span></p>",
    r"<p><strong><span>\s*([A-D])\.</span></strong>\s*<span>(.*?)</span></p>",
]


def extract_options(block):
    opts = {"A": "", "B": "", "C": "", "D": ""}
    for pat_str in _OPT_PATTERNS:
        pat = re.compile(pat_str, re.DOTALL)
        for m in pat.finditer(block):
            k = m.group(1)
            if not opts[k]:
                opts[k] = clean_option(m.group(2))
    return opts


# ── extract question text ──────────────────────────────────────────────────────

_QUESTION_END_PATTERNS = [
    r"<p[^>]*><strong><span>\s*[A-D]\.",
    r"<p[^>]*><span><strong>\s*[A-D]\.",
    r"<p[^>]*><span>\s*<img",
    r"<p[^>]*><img",
    r"<section[^>]*class=\"toggle\">",
]


def extract_question_text(block):
    parts = []
    for seg in block.split("</p>"):
        seg_stripped = seg.strip()
        if not seg_stripped:
            continue
        if re.search(r"<p[^>]*><strong><span>Câu", seg_stripped, re.IGNORECASE):
            continue
        if any(
            re.search(p, seg_stripped, re.IGNORECASE) for p in _QUESTION_END_PATTERNS
        ):
            break
        t = strip_html(seg_stripped)
        if (
            t
            and "Quảng cáo" not in t
            and "adsbygoogle" not in t.lower()
            and "google" not in t.lower()
        ):
            t = re.sub(r"^Em hãy chọn đáp án đúng nhất\s*", "", t, flags=re.IGNORECASE)
            if t:
                parts.append(t)
    return " ".join(parts).strip()


# ── parse lesson page ─────────────────────────────────────────────────────────


def _split_sections(html):
    anchors = [
        (m.start(), m.group(1)) for m in re.finditer(r'<a name="(phan\d+)">', html)
    ]
    if not anchors:
        return [("main", html)]
    sections = []
    for i, (pos, name) in enumerate(anchors):
        end = anchors[i + 1][0] if i + 1 < len(anchors) else len(html)
        sections.append((name, html[pos:end]))
    return sections


def _find_question_blocks(section_html):
    blocks = []
    cau_pat = re.compile(r"<p[^>]*><strong[^>]*><span[^>]*>Câu\s*(\d+)", re.IGNORECASE)
    cau_starts = [(m.start(), int(m.group(1))) for m in cau_pat.finditer(section_html)]

    for i, (start_pos, q_num_raw) in enumerate(cau_starts):
        end_pos = cau_starts[i + 1][0] if i + 1 < len(cau_starts) else len(section_html)
        block = section_html[start_pos:end_pos]
        blocks.append((q_num_raw, block))

    return blocks


def _find_toggle_blocks(section_html):
    blocks = []
    for m in re.finditer(
        r'<section[^>]*class="toggle">(.*?)</section>', section_html, re.DOTALL
    ):
        blocks.append(m.group(1))
    return blocks


def parse_lesson(html):
    sections = _split_sections(html)
    all_q = []
    global_q_num = 0

    for sec_name, sec_content in sections:
        cau_blocks = _find_question_blocks(sec_content)
        toggle_blocks = _find_toggle_blocks(sec_content)

        if cau_blocks:
            for q_num_raw, block in cau_blocks:
                global_q_num += 1
                q_text = extract_question_text(block)
                opts = extract_options(block)
                ans_m = re.search(r"Đáp án đúng là:\s*([A-D])\b", block)
                ans = ans_m.group(1) if ans_m else ""

                if opts["A"] and ans:
                    all_q.append(
                        {
                            "id": f"sc_{global_q_num:03d}",
                            "type": "single_choice",
                            "question_number": global_q_num,
                            "question": q_text,
                            "options": opts,
                            "answer": ans,
                        }
                    )
        elif toggle_blocks:
            q_num = 0
            for t_html in toggle_blocks:
                q_num += 1
                global_q_num += 1
                ans_m = re.search(r"Đáp án đúng là:\s*([A-D])\b", t_html)
                ans = ans_m.group(1) if ans_m else ""
                if not ans:
                    continue

                before_start = max(0, html.find(t_html) - 4000)
                before = html[before_start : html.find(t_html)]
                before = re.sub(
                    r'<div[^>]*class="ads[^"]*"[^>]*>.*?</div>',
                    "",
                    before,
                    flags=re.DOTALL,
                )
                before = re.sub(
                    r"<script[^>]*>.*?</script>", "", before, flags=re.DOTALL
                )
                opts = extract_options(before)
                if not opts["A"]:
                    continue

                q_text = extract_question_text(before)
                if not q_text:
                    q_text = "(Hình ảnh)"

                all_q.append(
                    {
                        "id": f"sc_{global_q_num:03d}",
                        "type": "single_choice",
                        "question_number": global_q_num,
                        "question": q_text,
                        "options": opts,
                        "answer": ans,
                    }
                )

    return all_q


# ── main ─────────────────────────────────────────────────────────────────────


def main():
    print(f"Fetching index: {_INDEX_URL}")
    lesson_links = get_lesson_links(_INDEX_URL)
    print(f"Found {len(lesson_links)} lesson links\n")

    all_questions = []
    for i, link in enumerate(lesson_links, 1):
        print(f"[{i:>2}/{len(lesson_links)}] {link.split('/')[-1][:50]}", end=" ... ")
        try:
            html = fetch(link)
            extract_title(html)
            questions = parse_lesson(html)
            print(f"{len(questions)} câu")
            all_questions.extend(questions)
        except Exception as e:
            print(f"LỖI: {e}")

    print(f"\n{'=' * 50}")
    print(f"Tổng cộng: {len(all_questions)} câu")

    payload = {
        "title": "Trắc nghiệm Toán lớp 1 Kết nối tri thức - VietJack",
        "source": _INDEX_URL,
        "total_questions": len(all_questions),
        "single_choice": len(all_questions),
        "true_false": 0,
        "short_answer": 0,
        "essay": 0,
        "questions": all_questions,
    }

    with open(_OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Đã lưu: {_OUT_FILE}")


if __name__ == "__main__":
    main()
