#!/usr/bin/env python3
"""
Crawl VietJack physics lesson page and save as JSON
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from urllib.parse import urljoin

def crawl_vietjack_lesson(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        response.encoding = 'utf-8'
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        result = {
            "source": url,
            "title": soup.find('title').get_text(strip=True) if soup.find('title') else "",
            "content": {
                "questions": [],
                "answers": []
            }
        }
        
        # Find article content
        article = soup.find('article') or soup.find('div', class_='article-content') or soup.find('div', class_='content')
        
        if article:
            # Find all questions (usually in paragraphs or divs)
            questions = []
            current_question = None
            
            # Look for question patterns
            for elem in article.find_all(['p', 'div', 'h2', 'h3', 'h4']):
                text = elem.get_text(strip=True)
                if not text:
                    continue
                
                # Check if this is a question (starts with number or "Câu")
                question_match = re.match(r'^(Câu\s*\d+[:\.\)]|\d+[\.\)])\s*(.+)', text, re.IGNORECASE)
                
                if question_match:
                    if current_question:
                        questions.append(current_question)
                    current_question = {
                        "question_number": question_match.group(1),
                        "question_text": question_match.group(2),
                        "options": [],
                        "answer": None,
                        "explanation": None
                    }
                elif current_question:
                    # Check if this is an option (A, B, C, D)
                    option_match = re.match(r'^([A-D])[\.\)]\s*(.+)', text, re.IGNORECASE)
                    if option_match:
                        current_question["options"].append({
                            "option": option_match.group(1).upper(),
                            "text": option_match.group(2)
                        })
                    # Check if this is an answer
                    elif re.search(r'(Đáp án|Trả lời|Answer)[:\s]', text, re.IGNORECASE):
                        current_question["answer"] = text
                    # Check if this is an explanation
                    elif re.search(r'(Lời giải|Giải thích|Hướng dẫn|Giải)[:\s]', text, re.IGNORECASE):
                        current_question["explanation"] = text
                    else:
                        # Append to question text or options
                        if len(current_question["options"]) == 0:
                            current_question["question_text"] += " " + text
            
            if current_question:
                questions.append(current_question)
            
            result["content"]["questions"] = questions
        
        # Also try to find answer key section
        answer_section = soup.find('div', class_='answer-key') or soup.find('div', id='answer')
        if answer_section:
            result["content"]["answer_key"] = answer_section.get_text(strip=True)
        
        # Get all links for related lessons
        related_links = []
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            title = link.get('title', '').strip() or link.get_text(strip=True)
            if '/vat-li-12' in href and title and href != url:
                related_links.append({
                    "title": title,
                    "url": urljoin(url, href)
                })
        
        result["related_lessons"] = related_links[:20]  # Limit to 20
        
        return result
        
    except requests.RequestException as e:
        print(f"Error fetching page: {e}")
        return {
            "error": str(e),
            "source": url
        }

def main():
    url = "https://vietjack.com/vat-li-12-kn/trac-nghiem-bai-1-cau-truc-cua-chat-su-chuyen-the.jsp"
    
    print(f"Crawling: {url}")
    data = crawl_vietjack_lesson(url)
    
    output_file = "vl12_bai1_cau_truc_chat.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Saved to {output_file}")
    
    if 'content' in data and 'questions' in data['content']:
        print(f"Total questions found: {len(data['content']['questions'])}")
        
        # Preview first few questions
        if data['content']['questions']:
            print("\nPreview:")
            for i, q in enumerate(data['content']['questions'][:3], 1):
                print(f"\n{i}. {q.get('question_number', '')} {q.get('question_text', '')}")
                for opt in q.get('options', [])[:4]:
                    print(f"   {opt['option']}. {opt['text']}")

if __name__ == "__main__":
    main()
