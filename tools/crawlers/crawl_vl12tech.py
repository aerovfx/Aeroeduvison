import urllib.request
import ssl
import re
import json
import os
from html import unescape

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

DATA_DIR = "/Users/pixibox/Aeroeduvison/data"
os.makedirs(DATA_DIR, exist_ok=True)


def strip_html(text):
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_title(html):
    m = re.search(r"<title>([^<]+)</title>", html)
    return strip_html(m.group(1)) if m else ""


def parse_tech12h(html, source_url):
    title = extract_title(html)
    block = re.search(r'trac_nghiem"[^>]*>(.+?)class="kqua"', html, re.DOTALL)
    if not block:
        return title, []

    content = block.group(1)
    questions = []

    pat_with_strong = re.compile(
        r"<p><strong>Câu(?:\s|&nbsp;)*(\d+)(?:\s|&nbsp;)*:(?:\s|&nbsp;)*</strong>(?:\s|&nbsp;)*(.*?)</p>\s*<ul>(.*?)</ul>",
        re.DOTALL,
    )
    pat_no_strong = re.compile(
        r"<p>Câu\s*(\d+):\s*(.*?)</p>\s*<ul>(.*?)</ul>",
        re.DOTALL,
    )

    matches = list(pat_with_strong.finditer(content)) + list(
        pat_no_strong.finditer(content)
    )

    for m in matches:
        q_num = int(m.group(1))
        q_text = strip_html(m.group(2))
        ul_content = m.group(3)

        options = {"A": "", "B": "", "C": "", "D": ""}
        answer = ""

        li_pat = re.compile(r"<li[^>]*>(.*?)</li>", re.DOTALL)
        for i, li_m in enumerate(li_pat.finditer(ul_content)):
            if i >= 4:
                break
            opt_letter = chr(ord("A") + i)
            raw_text = li_m.group(1)
            opt_text = unescape(raw_text)
            opt_text = re.sub(r"^[A-D]\.\s*", "", opt_text)
            options[opt_letter] = opt_text

            li_html = li_m.group(0)
            if "<h6>" in li_html:
                answer = opt_letter

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


def crawl(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    resp = urllib.request.urlopen(req, context=ctx)
    return resp.read().decode("utf-8")


def get_lesson_num(url):
    m = re.search(r"bai-(\d+)", url)
    if m:
        return m.group(1)
    hk = re.search(r"hoc-ki-(\d+)", url)
    if hk:
        return f"tap{hk.group(1)}"
    return "unknown"


def get_slug(url):
    slug = re.search(r"trac-nghiem[_-]?([^/]+)$", url)
    if slug:
        name = slug.group(1).rstrip("/")
        name = re.sub(r"[^a-z0-9_-]", "-", name.lower())
        return name[:40]
    return "output"


def get_index_links(index_url):
    req = urllib.request.Request(index_url, headers={"User-Agent": "Mozilla/5.0"})
    resp = urllib.request.urlopen(req, context=ctx)
    html = resp.read().decode("utf-8")

    links = re.findall(r'href="(https://tech12h\.com/bai-hoc/trac-nghiem[^?"]+)"', html)
    links = sorted(set(links))
    return links


def main():
    print("=" * 60)
    print("  Tech12h Crawler - Crawl trắc nghiệm từ tech12h.com")
    print("=" * 60)
    print()
    print("Chế độ:")
    print("  1. Nhập link index (trang chủ trắc nghiệm) -> tự động tìm sublinks")
    print("  2. Nhập 1 link bài học -> crawl bài đó")
    print("  3. Nhập nhiều link (cách nhau bằng dòng mới) -> crawl từng bài")
    print()
    print(
        "Ví dụ index: https://tech12h.com/cong-nghe/trac-nghiem-vat-li-12-ket-noi-tri-thuc"
    )
    print()

    raw = input("Nhập link(s): ").strip()
    if not raw:
        print("Chưa nhập link. Thoát.")
        return

    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    links = []

    for line in lines:
        if "/bai-hoc/trac-nghiem" in line and not line.endswith("/"):
            links.append(line)
        elif "/bai-hoc/trac-nghiem" in line:
            links.append(line.rstrip("/"))
        else:
            print(f"Tìm sublinks từ: {line}")
            try:
                sub = get_index_links(line)
                print(f"  Tìm thấy {len(sub)} sublinks")
                links.extend(sub)
            except Exception as e:
                print(f"  Lỗi: {e}")

    links = [l.rstrip("/") for l in links]
    links = sorted(set(links))
    print(f"\nTổng cộng {len(links)} link cần crawl\n")

    all_questions = []

    for i, url in enumerate(links, 1):
        print(f"[{i}/{len(links)}] {url}")
        try:
            html = crawl(url)
            title, questions = parse_tech12h(html, url)
            print(f"  -> {len(questions)} câu")

            if questions:
                slug = get_slug(url)
                fname = f"{slug}.json"
                out = {
                    "title": title,
                    "source": url,
                    "total_questions": len(questions),
                    "questions": questions,
                }
                with open(os.path.join(DATA_DIR, fname), "w", encoding="utf-8") as f:
                    json.dump(out, f, ensure_ascii=False, indent=2)

                all_questions.extend(questions)

        except Exception as e:
            print(f"  Lỗi: {e}")

    print(f"\n{'=' * 40}")
    print(f"Hoàn thành: {len(all_questions)} câu từ {len(links)} bài")

    if all_questions:
        slug = get_slug(links[0]) if links else "output"
        merged_fname = f"{slug}_b500.json"
        merged = {
            "title": f"Trắc nghiệm - Tech12h ({len(links)} bài)",
            "source": ", ".join(links[:3]) + ("..." if len(links) > 3 else ""),
            "total_questions": len(all_questions),
            "questions": all_questions,
        }
        with open(os.path.join(DATA_DIR, merged_fname), "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)
        print(f"Đã lưu: {merged_fname}")


if __name__ == "__main__":
    main()
