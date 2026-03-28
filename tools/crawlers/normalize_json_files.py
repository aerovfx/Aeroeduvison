#!/usr/bin/env python3
"""
Normalize JSON files in the data directory:
- Remove Vietnamese providers (vietjack, tech12h) from titles
- Standardize provider to "Aeroedu Vision"
- Add meta section with proper structure
- Convert to standardized format
"""

import json
import os
import re
from pathlib import Path
from datetime import datetime

DATA_DIR = Path("/Users/pixibox/Aeroeduvison/data")

def extract_meta_info(title, source_url=None):
    """Extract subject, grade, chapter, topic from title or filename."""
    # Default values
    subject = "Vật lý"
    grade = ""
    chapter = ""
    topic = ""
    
    # Try to extract from title
    # Pattern: "Trắc nghiệm [Subject] [Grade] [Book] [Chapter info]"
    # Example: "Trắc nghiệm Toán 10 cánh diều bài 4 Tổng và hiệu của hai vectơ"
    
    patterns = [
        # Pattern for subject and grade
        r"Trắc nghiệm\s+(Toán|Ngữ văn|Vật lí|Vật lý|Hóa học|Sinh học|Lịch sử|Địa lí|Địa lý|Tiếng Anh|Tin học|Công nghệ|Giáo dục công dân|Âm nhạc|Mĩ thuật|Thể dục|Quốc phòng|Kinh tế pháp luật|Khoa học máy tính|KHTN|Hoạt động trải nghiệm)\s+(\d+)",
        r"Trắc nghiệm\s+(Toán|Ngữ văn|Vật lí|Vật lý|Hóa học|Sinh học|Lịch sử|Địa lí|Địa lý|Tiếng Anh|Tin học|Công nghệ|Giáo dục công dân|Âm nhạc|Mĩ thuật|Thể dục|Quốc phòng|Kinh tế pháp luật|Khoa học máy tính|KHTN|Hoạt động trải nghiệm)\s+lớp\s+(\d+)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, title, re.IGNORECASE)
        if match:
            subject = match.group(1).strip()
            grade = match.group(2).strip()
            break
    
    # Normalize subject names
    subject_map = {
        "toán": "Toán",
        "ngữ văn": "Ngữ văn",
        "vật lí": "Vật lý",
        "vật lý": "Vật lý",
        "hóa học": "Hóa học",
        "sinh học": "Sinh học",
        "lịch sử": "Lịch sử",
        "địa lí": "Địa lý",
        "địa lý": "Địa lý",
        "tiếng anh": "Tiếng Anh",
        "tin học": "Tin học",
        "công nghệ": "Công nghệ",
        "giáo dục công dân": "Giáo dục công dân",
        "âm nhạc": "Âm nhạc",
        "mĩ thuật": "Mĩ thuật",
        "thể dục": "Thể dục",
        "quốc phòng": "Quốc phòng",
        "kinh tế pháp luật": "Kinh tế pháp luật",
        "khoa học máy tính": "Khoa học máy tính",
        "khtn": "KHTN",
        "hoạt động trải nghiệm": "Hoạt động trải nghiệm",
        "am nhac": "Âm nhạc",
        "mi thuat": "Mĩ thuật",
    }
    subject = subject_map.get(subject.lower(), subject)
    
    # Extract chapter (bài X, chủ đề X, etc.)
    chapter_patterns = [
        r"bài\s+(\d+)",
        r"chủ đề\s+(\d+)",
        r"chu-de-(\d+)",
        r"bai-(\d+)",
    ]
    for pattern in chapter_patterns:
        match = re.search(pattern, title, re.IGNORECASE)
        if match:
            chapter = match.group(1)
            break
    
    # Extract topic (the rest after chapter info)
    # Remove provider suffix first
    clean_title = re.sub(r"\s*\|\s*(Tech12h|vietjack)\s*$", "", title, flags=re.IGNORECASE)
    
    # Try to extract topic after chapter reference
    topic_match = re.search(r"(?:bài\s+\d+|chủ đề\s+\d+)\s+(.+?)(?:\s*\||$)", clean_title, re.IGNORECASE)
    if topic_match:
        topic = topic_match.group(1).strip()
        # Remove (P1), (P2), etc.
        topic = re.sub(r"\s*\(P\d+\)\s*$", "", topic)
    else:
        # Use the part after subject and grade as topic
        topic_match = re.search(r"Trắc nghiệm\s+\w+\s+\d+\s+(.+?)(?:\s*\||$)", clean_title, re.IGNORECASE)
        if topic_match:
            topic = topic_match.group(1).strip()
            topic = re.sub(r"\s*\(P\d+\)\s*$", "", topic)
    
    return {
        "title": clean_title.strip(),
        "provider": "Aeroedu Vision",
        "subject": subject,
        "grade": grade,
        "chapter": chapter,
        "topic": topic
    }


def normalize_question(old_question, index):
    """Convert old question format to new format."""
    new_question = {
        "question_number": index,
    }
    
    # Copy question text
    if "question" in old_question:
        new_question["question"] = old_question["question"]
    
    # Convert options from dict to list
    if "options" in old_question:
        options = old_question["options"]
        if isinstance(options, dict):
            # Sort by keys (A, B, C, D) and extract values
            sorted_options = []
            for key in sorted(options.keys()):
                sorted_options.append(options[key])
            new_question["options"] = sorted_options
        elif isinstance(options, list):
            # Check if options have label/text format
            if len(options) > 0 and isinstance(options[0], dict):
                # Extract text from label/text format
                sorted_options = []
                for opt in sorted(options, key=lambda x: x.get('label', '')):
                    sorted_options.append(opt.get('text', ''))
                new_question["options"] = sorted_options
            else:
                new_question["options"] = options
    
    # Convert answer to correctAnswer
    if "answer" in old_question:
        answer = old_question["answer"]
        if isinstance(answer, str):
            new_question["correctAnswer"] = answer.upper()
        elif isinstance(answer, dict):
            # Handle dict format like {"label": "A", "text": "..."}
            new_question["correctAnswer"] = answer.get('label', 'A').upper()
    
    # Copy explanation if exists
    if "explanation" in old_question:
        new_question["explanation"] = old_question["explanation"]
    
    return new_question


def normalize_file(file_path):
    """Normalize a single JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Handle list format (questions at root level as array)
        if isinstance(data, list):
            old_questions = data
            title = ""
            source_url = ""
        else:
            # Check if already normalized (has meta section with Aeroedu Vision)
            if "meta" in data and data.get("meta", {}).get("provider") == "Aeroedu Vision":
                return False, "Already normalized"
            
            # Extract title from various sources
            title = ""
            if "meta" in data and "title" in data["meta"]:
                title = data["meta"]["title"]
            elif "title" in data:
                title = data["title"]
            
            source_url = data.get("source_url", "")
            old_questions = data.get("questions", [])
        
        # Extract meta information
        meta = extract_meta_info(title, source_url)
        
        # Build description
        description = f"Trắc nghiệm {meta['subject']} {meta['grade']} {meta['topic']} có đáp án và lời giải chi tiết, giúp học sinh ôn luyện và nắm vững kiến thức."
        if meta['topic']:
            description = f"Trắc nghiệm {meta['subject']} {meta['grade']} {meta['topic']} có đáp án và lời giải chi tiết, giúp học sinh ôn luyện và nắm vững kiến thức."
        else:
            description = f"Trắc nghiệm {meta['subject']} {meta['grade']} có đáp án và lời giải chi tiết, giúp học sinh ôn luyện và nắm vững kiến thức."
        
        # Convert questions
        questions = []
        for i, q in enumerate(old_questions, 1):
            questions.append(normalize_question(q, i))
        
        # Build new structure
        new_data = {
            "meta": meta,
            "description": description,
            "questions": questions,
        }
        
        # Preserve resources if exists
        if isinstance(data, dict) and "resources" in data:
            new_data["resources"] = data["resources"]
        
        # Write normalized data
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(new_data, f, ensure_ascii=False, indent=2)
        
        return True, "Normalized successfully"
    
    except Exception as e:
        return False, f"Error: {str(e)}"


def main():
    """Main function to normalize all JSON files."""
    json_files = list(DATA_DIR.glob("*.json"))
    
    total = len(json_files)
    success = 0
    failed = 0
    skipped = 0
    
    print(f"Found {total} JSON files to normalize...")
    print("=" * 60)
    
    for i, file_path in enumerate(json_files, 1):
        normalized, message = normalize_file(file_path)
        if normalized:
            success += 1
            print(f"[{i}/{total}] ✓ {file_path.name}")
        else:
            if "Already normalized" in message:
                skipped += 1
            else:
                failed += 1
            print(f"[{i}/{total}] - {file_path.name}: {message}")
    
    print("=" * 60)
    print(f"Summary:")
    print(f"  Total files: {total}")
    print(f"  Normalized: {success}")
    print(f"  Skipped: {skipped}")
    print(f"  Failed: {failed}")


if __name__ == "__main__":
    main()
