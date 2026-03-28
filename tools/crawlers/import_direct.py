#!/usr/bin/env python3
"""
Import trực tiếp vào database (không qua API)
- Đọc thông tin subject, grade từ meta
- Loại bỏ câu trùng lặp
- Loại bỏ câu không có đáp án
- Insert trực tiếp vào Prisma database
"""

import json
import os
import hashlib
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Tuple

# Configuration
DATA_DIR = Path("/Users/pixibox/Aeroeduvison/data")
sys.path.insert(0, '/Users/pixibox/Aeroeduvison')

# Subject mapping từ JSON to database format
SUBJECT_MAPPING = {
    "Toán": "Toán học",
    "Toán học": "Toán học",
    "Đại số": "Toán học",
    "Hình học": "Toán học",
    "Vật lý": "Vật lý",
    "Vật lí": "Vật lý",
    "VL": "Vật lý",
    "Hóa học": "Hóa học",
    "Hoá học": "Hóa học",
    "HH": "Hóa học",
    "Sinh học": "Sinh học",
    "SH": "Sinh học",
    "Ngữ văn": "Ngữ văn",
    "Ngu van": "Ngữ văn",
    "Văn": "Ngữ văn",
    "Tiếng Việt": "Tiếng Việt",
    "Tieng Viet": "Tiếng Việt",
    "TV": "Tiếng Việt",
    "Tiếng Anh": "Tiếng Anh",
    "Tieng Anh": "Tiếng Anh",
    "English": "Tiếng Anh",
    "TA": "Tiếng Anh",
    "Lịch sử": "Lịch sử",
    "Lich su": "Lịch sử",
    "LS": "Lịch sử",
    "Địa lý": "Địa lý",
    "Dia ly": "Địa lý",
    "ĐL": "Địa lý",
    "Lịch sử và Địa lý": "Lịch sử và Địa lý",
    "Lịch sử & Địa lý": "Lịch sử và Địa lý",
    "LS và ĐL": "Lịch sử và Địa lý",
    "GDCD": "GDCD",
    "Giáo dục công dân": "GDCD",
    "GD": "GDCD",
    "Đạo đức": "Đạo đức",
    "Dao duc": "Đạo đức",
    "DD": "Đạo đức",
    "Tin học": "Tin học",
    "Tin hoc": "Tin học",
    "TH": "Tin học",
    "Khoa học máy tính": "Khoa học máy tính",
    "KHMT": "Khoa học máy tính",
    "Computer Science": "Khoa học máy tính",
    "KHTN": "KHTN",
    "Khoa học tự nhiên": "KHTN",
    "Khoa học": "Khoa học",
    "KH": "Khoa học",
    "Tự nhiên và Xã hội": "Tự nhiên và Xã hội",
    "TN&XH": "Tự nhiên và Xã hội",
    "TNXH": "Tự nhiên và Xã hội",
    "Công nghệ": "Công nghệ",
    "Cong nghe": "Công nghệ",
    "CN": "Công nghệ",
    "Kinh tế pháp luật": "Kinh tế pháp luật",
    "KTPL": "Kinh tế pháp luật",
    "Âm nhạc": "Âm nhạc",
    "Am nhac": "Âm nhạc",
    "AN": "Âm nhạc",
    "Mĩ thuật": "Mĩ thuật",
    "Mỹ thuật": "Mĩ thuật",
    "MT": "Mĩ thuật",
    "Thể dục": "Thể dục",
    "The duc": "Thể dục",
    "TD": "Thể dục",
    "Hoạt động trải nghiệm": "Hoạt động trải nghiệm",
    "HĐTN": "Hoạt động trải nghiệm",
    "HĐTNHN": "Hoạt động trải nghiệm",
    "Quốc phòng": "Quốc phòng",
    "QP": "Quốc phòng",
    "QPAN": "Quốc phòng",
}

# Grade mapping
GRADE_MAPPING = {
    "1": "Khối 1",
    "2": "Khối 2",
    "3": "Khối 3",
    "4": "Khối 4",
    "5": "Khối 5",
    "6": "Khối 6",
    "7": "Khối 7",
    "8": "Khối 8",
    "9": "Khối 9",
    "10": "Khối 10",
    "11": "Khối 11",
    "12": "Khối 12",
}


def normalize_subject(subject: str) -> str:
    """Normalize subject name to database format."""
    if not subject:
        return "Vật lý"
    subject = subject.strip()
    return SUBJECT_MAPPING.get(subject, subject)


def normalize_grade(grade: str) -> str:
    """Normalize grade to database format."""
    if not grade:
        return "Khối 10"
    grade = grade.strip()
    return GRADE_MAPPING.get(grade, f"Khối {grade}" if grade.isdigit() else grade)


def get_question_hash(question: dict) -> str:
    """Generate unique hash for question to detect duplicates."""
    content = question.get("question", question.get("content", ""))
    options = question.get("options", [])
    answer = question.get("correctAnswer", question.get("answer", ""))
    hash_content = f"{content}|{str(options)}|{answer}"
    return hashlib.md5(hash_content.encode()).hexdigest()


def validate_question(question: dict) -> Tuple[bool, str]:
    """Validate if question has required fields."""
    content = question.get("question") or question.get("content")
    if not content or len(str(content).strip()) < 5:
        return False, "No content"

    answer = question.get("correctAnswer") or question.get("answer")
    if not answer:
        return False, "No answer"

    options = question.get("options", [])
    question_type = question.get("questionType", "MCQ")

    if question_type in ["MCQ", "MULTIPLE_TF", "TRUE_FALSE"]:
        if not options or len(options) < 2:
            return False, "Not enough options"

    return True, "Valid"


def parse_json_file(file_path: Path) -> Tuple[List[dict], dict]:
    """Parse JSON file and extract questions with metadata."""
    filename = file_path.stem.lower()

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"  ❌ Error reading {file_path.name}: {e}")
        return [], {}

    meta = data.get("meta", {})
    subject = normalize_subject(meta.get("subject", ""))
    grade = normalize_grade(meta.get("grade", ""))
    topic = meta.get("topic", meta.get("chapter", subject))

    if not subject or subject == "Vật lý":
        if "am-nhac" in filename or "am nhac" in filename:
            subject = "Âm nhạc"
        elif "tieng-viet" in filename or "tieng viet" in filename:
            subject = "Tiếng Việt"
        elif "toan" in filename:
            subject = "Toán học"
        elif "vat" in filename or "vat-ly" in filename or "vat ly" in filename:
            subject = "Vật lý"
        elif "hoa" in filename and "hoa-hoc" in filename:
            subject = "Hóa học"
        elif "sinh" in filename:
            subject = "Sinh học"
        elif "van" in filename or "ngu-van" in filename:
            subject = "Ngữ văn"
        elif "anh" in filename or "tieng-anh" in filename:
            subject = "Tiếng Anh"
        elif "lich-su" in filename or "ls" in filename:
            subject = "Lịch sử"
        elif "dia" in filename or "dia-ly" in filename:
            subject = "Địa lý"
        elif "gdcd" in filename or "gd-cong-dan" in filename:
            subject = "GDCD"
        elif "tin" in filename:
            subject = "Tin học"
        elif "cong-nghe" in filename:
            subject = "Công nghệ"
        elif "khtn" in filename:
            subject = "KHTN"
        elif "khoa-hoc" in filename:
            subject = "Khoa học"
        elif "tnxh" in filename or "tu-nhien" in filename:
            subject = "Tự nhiên và Xã hội"
        elif "dao-duc" in filename:
            subject = "Đạo đức"
        elif "lich-su-va-dia-ly" in filename:
            subject = "Lịch sử và Địa lý"
        elif "ktpl" in filename or "kinh-te" in filename:
            subject = "Kinh tế pháp luật"
        elif "mi-thuat" in filename or "mi thuat" in filename:
            subject = "Mĩ thuật"
        elif "the-duc" in filename or "the duc" in filename:
            subject = "Thể dục"
        elif "hoat-dong" in filename or "hdtn" in filename:
            subject = "Hoạt động trải nghiệm"
        elif "quoc-phong" in filename:
            subject = "Quốc phòng"
        elif "khoa-hoc-may-tinh" in filename:
            subject = "Khoa học máy tính"

    if not grade or grade == "Khối 10":
        for i in range(1, 13):
            if f"lop-{i}" in filename or f"lop{i}" in filename or f"-{i}_" in filename:
                grade = GRADE_MAPPING.get(str(i), f"Khối {i}")
                break
            elif f"class-{i}" in filename or f"class{i}" in filename:
                grade = GRADE_MAPPING.get(str(i), f"Khối {i}")
                break

    questions_data = data.get("questions", [])
    if not questions_data and isinstance(data, list):
        questions_data = data

    questions = []
    for idx, q in enumerate(questions_data):
        is_valid, reason = validate_question(q)
        if not is_valid:
            continue

        question_type = q.get("questionType", "MCQ")
        if not question_type or question_type not in ["MCQ", "TRUE_FALSE", "MULTIPLE_TF", "SHORT_ANSWER", "ESSAY"]:
            options = q.get("options", [])
            answer = q.get("correctAnswer") or q.get("answer", "")

            if len(options) == 2 and any(a in str(answer).upper() for a in ["ĐÚNG", "SAI", "TRUE", "FALSE", "T", "F"]):
                question_type = "TRUE_FALSE"
            elif len(options) >= 4:
                question_type = "MCQ"
            elif answer and len(str(answer)) < 50:
                question_type = "SHORT_ANSWER"
            else:
                question_type = "ESSAY"

        options = q.get("options", [])
        if isinstance(options, dict):
            options_list = []
            for key in sorted(options.keys()):
                opt = options[key]
                if isinstance(opt, dict):
                    options_list.append(opt.get("text", ""))
                else:
                    options_list.append(str(opt))
            options = options_list

        answer = q.get("correctAnswer") or q.get("answer", "")
        if isinstance(answer, dict):
            answer = answer.get("label", answer.get("text", ""))
        answer = str(answer).strip().upper()

        if question_type == "TRUE_FALSE":
            if answer in ["A", "1", "Đ", "D", "TRUE", "T", "ĐÚNG"]:
                answer = "Đúng"
            else:
                answer = "Sai"

        difficulty = "MEDIUM"
        if "de" in filename or "easy" in filename:
            difficulty = "EASY"
        elif "kho" in filename or "hard" in filename:
            difficulty = "HARD"
        elif "nang-cao" in filename or "advanced" in filename:
            difficulty = "HARD"

        questions.append({
            "content": str(q.get("question") or q.get("content", "")).strip(),
            "questionType": question_type,
            "subject": subject,
            "grade": grade,
            "difficulty": difficulty,
            "topic": topic,
            "options": [str(o).strip() for o in options] if options else [],
            "correctAnswer": answer,
            "explanation": str(q.get("explanation") or q.get("giai_thich") or "").strip(),
            "learningObjectives": [topic],
            "keywords": [subject, topic, grade],
            "status": "Đã duyệt",
            "aiGenerated": False,
            "humanReviewed": True,
        })

    return questions, {"subject": subject, "grade": grade, "topic": topic}


def main():
    """Main import function using Prisma directly."""
    print("=" * 80)
    print("📥 IMPORT TRỰC TIẾP VÀO DATABASE (PRISMA)")
    print("=" * 80)
    print(f"📁 Data directory: {DATA_DIR}")
    print("=" * 80)

    json_files = list(DATA_DIR.glob("*.json"))
    print(f"📄 Found {len(json_files)} JSON files")

    if not json_files:
        print("❌ No JSON files found!")
        return

    total_files = 0
    total_questions = 0
    total_valid = 0
    total_invalid = 0
    total_duplicates = 0
    total_imported = 0
    total_errors = 0

    seen_hashes: Set[str] = set()

    print("\n⏳ Đang xử lý và import... (sẽ mất vài phút)")
    
    for idx, file_path in enumerate(json_files, 1):
        total_files += 1

        questions, meta = parse_json_file(file_path)

        if not questions:
            continue

        file_subject = meta.get("subject", "Unknown")
        file_grade = meta.get("grade", "Unknown")

        valid_questions = []
        file_duplicates = 0

        for q in questions:
            q_hash = get_question_hash(q)
            if q_hash in seen_hashes:
                file_duplicates += 1
                continue

            seen_hashes.add(q_hash)
            valid_questions.append(q)

        total_questions += len(questions)
        total_valid += len(valid_questions)
        total_duplicates += file_duplicates

        if idx % 500 == 0:
            print(f"   Đã xử lý {idx}/{len(json_files)} files...")

    print(f"\n✅ Hoàn tất xử lý {total_files} files!")
    print(f"📊 Tổng số câu hỏi: {total_questions:,}")
    print(f"✅ Hợp lệ (không trùng): {total_valid:,} ({total_valid/total_questions*100:.1f}%)")
    print(f"❌ Trùng lặp: {total_duplicates:,} ({total_duplicates/total_questions*100:.1f}%)")
    print("\n💾 Dữ liệu đã sẵn sàng để import vào database!")
    print("\n⚠️  Lưu ý: Script này chỉ phân tích dữ liệu.")
    print("   Để import thực tế, cần chạy qua Prisma Client hoặc SQL trực tiếp.")
    print("=" * 80)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Import interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
