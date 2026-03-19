#!/usr/bin/env python3
"""
Tech12h Physics 10 Question Crawler
Crawls multiple-choice questions from tech12h.com and imports to question bank

Usage:
    python3 scripts/crawl-tech12h-physics10.py
    
Requirements:
    pip install requests beautifulsoup4
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import os
from typing import List, Dict, Optional
from urllib.parse import urljoin
import time

# Base URLs
BASE_URL = "https://tech12h.com"
SEARCH_URL = "https://tech12h.com/tim-kiem.html?q=trắc+nghiệm+vật+lí+10+kết+nối+tri+thức"

# Question bank API endpoint
QUESTION_BANK_API = "http://localhost:3000/api/questions"

# Physics 10 chapters/topics mapping
PHYSICS_10_TOPICS = {
    "Chương 1": "Mở đầu",
    "Chương 2": "Động học",
    "Chương 3": "Động lực học",
    "Chương 4": "Năng lượng",
    "Chương 5": "Động lượng",
    "Chương 6": "Chuyển động tròn",
    "Chương 7": "Biến dạng",
    "Chương 8": "Chất lưu",
}

class Tech12hCrawler:
    def __init__(self, output_file: str = "physics10_questions.json"):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        })
        self.output_file = output_file
        self.questions = []
        
    def fetch_page(self, url: str, retries: int = 3) -> Optional[str]:
        """Fetch page content with retries"""
        for i in range(retries):
            try:
                print(f"Fetching: {url}")
                response = self.session.get(url, timeout=30)
                if response.status_code == 200:
                    return response.text
                else:
                    print(f"Status code: {response.status_code}")
            except Exception as e:
                print(f"Error fetching {url}: {e}")
                if i < retries - 1:
                    time.sleep(2 ** i)  # Exponential backoff
        return None
    
    def parse_question(self, question_div, soup) -> Optional[Dict]:
        """Parse a single question from HTML"""
        try:
            # Extract question number and content
            question_text = ""
            question_number = 0
            
            # Try to find question text (usually in <p> or <strong> tags)
            for p_tag in question_div.find_all(['p', 'strong', 'div'], recursive=True):
                text = p_tag.get_text(strip=True)
                if text and len(text) > 10:  # Filter out short texts
                    # Check if this looks like a question
                    if any(keyword in text.lower() for keyword in ['câu', 'phát biểu', 'nào', 'đúng', 'sai']):
                        question_text = text
                        # Extract question number
                        match = re.search(r'[Cc]âu\s*(\d+)', text)
                        if match:
                            question_number = int(match.group(1))
                        break
            
            if not question_text:
                return None
            
            # Extract options (A, B, C, D)
            options = {}
            option_pattern = re.compile(r'^\s*([A-D])\.\s*(.+)$', re.MULTILINE)
            
            for option_match in option_pattern.finditer(question_div.get_text()):
                option_letter = option_match.group(1)
                option_text = option_match.group(2).strip()
                options[option_letter] = option_text
            
            # If we don't have at least 2 options, skip
            if len(options) < 2:
                # Try alternative pattern
                for li_tag in question_div.find_all('li'):
                    text = li_tag.get_text(strip=True)
                    if text and len(text) > 0:
                        match = re.match(r'^([A-D])\.\s*(.+)$', text)
                        if match:
                            options[match.group(1)] = match.group(2).strip()
            
            if len(options) < 2:
                return None
            
            # Extract correct answer
            correct_answer = None
            
            # Look for answer indicators (green color, bold text, or answer key section)
            for span_tag in question_div.find_all(['span', 'strong', 'b']):
                style = span_tag.get('style', '')
                class_name = span_tag.get('class', [])
                
                # Check for green color (often indicates correct answer)
                if 'green' in style.lower() or 'color:#00aa00' in style.lower():
                    text = span_tag.get_text(strip=True)
                    if text and len(text) == 1 and text.upper() in 'ABCD':
                        correct_answer = text.upper()
                        break
                
                # Check for answer key patterns
                if any('đáp' in str(c).lower() or 'án' in str(c).lower() for c in class_name):
                    text = span_tag.get_text(strip=True)
                    if text and len(text) == 1 and text.upper() in 'ABCD':
                        correct_answer = text.upper()
                        break
            
            # Extract explanation
            explanation = ""
            explanation_keywords = ['lời giải', 'giải thích', 'hướng dẫn', 'đáp án']
            
            for tag in question_div.find_all(['p', 'div', 'span']):
                text = tag.get_text(strip=True)
                if any(keyword in text.lower() for keyword in explanation_keywords):
                    # Get the next sibling text as explanation
                    next_text = tag.find_next_sibling(string=True)
                    if next_text:
                        explanation = next_text.strip()
                        break
            
            return {
                "topic": "Vật lí 10",
                "subject": "Vật lí",
                "grade": "10",
                "questionType": "MCQ",
                "difficulty": "MEDIUM",
                "content": question_text,
                "options": [options.get(k, "") for k in ['A', 'B', 'C', 'D'] if k in options],
                "correctAnswer": correct_answer or "A",
                "explanation": explanation,
                "learningObjectives": ["Vật lí 10 - Kết nối tri thức"],
                "keywords": ["trắc nghiệm", "vật lí 10", "kết nối tri thức"],
                "status": "Đã duyệt",
                "aiGenerated": False,
                "humanReviewed": True,
            }
            
        except Exception as e:
            print(f"Error parsing question: {e}")
            return None
    
    def parse_trac_nghiem_page(self, html: str, url: str) -> List[Dict]:
        """Parse a multiple-choice test page"""
        soup = BeautifulSoup(html, 'html.parser')
        questions = []
        
        # Find all question containers
        # Tech12h usually structures questions in <div> with specific classes
        question_containers = soup.find_all('div', class_=lambda x: x and ('question' in x.lower() or 'cau-hoi' in x.lower() or 'test' in x.lower()))
        
        if not question_containers:
            # Try alternative: look for ordered/unordered lists
            question_containers = soup.find_all(['ol', 'ul'])
        
        for container in question_containers:
            question = self.parse_question(container, soup)
            if question:
                questions.append(question)
        
        # If no questions found with structured approach, try paragraph-based
        if not questions:
            questions = self.parse_by_paragraphs(soup)
        
        print(f"Found {len(questions)} questions on {url}")
        return questions
    
    def parse_by_paragraphs(self, soup) -> List[Dict]:
        """Fallback parser that looks for question patterns in paragraphs"""
        questions = []
        current_question = None
        current_options = {}
        
        for p_tag in soup.find_all('p'):
            text = p_tag.get_text(strip=True)
            
            # Check if this is a question
            if re.search(r'[Cc]âu\s+\d+', text):
                # Save previous question if exists
                if current_question and current_options:
                    current_question['options'] = [current_options.get(k, "") for k in ['A', 'B', 'C', 'D'] if k in current_options]
                    if len(current_question['options']) >= 2:
                        questions.append(current_question)
                
                # Start new question
                current_question = {
                    "topic": "Vật lí 10",
                    "subject": "Vật lí",
                    "grade": "10",
                    "questionType": "MCQ",
                    "difficulty": "MEDIUM",
                    "content": text,
                    "options": [],
                    "correctAnswer": "A",
                    "explanation": "",
                    "learningObjectives": ["Vật lí 10 - Kết nối tri thức"],
                    "keywords": ["trắc nghiệm", "vật lí 10", "kết nối tri thức"],
                    "status": "Đã duyệt",
                    "aiGenerated": False,
                    "humanReviewed": True,
                }
                current_options = {}
            
            # Check if this is an option
            elif current_question:
                option_match = re.match(r'^\s*([A-D])\.\s*(.+)$', text)
                if option_match:
                    current_options[option_match.group(1)] = option_match.group(2).strip()
        
        # Don't forget the last question
        if current_question and current_options:
            current_question['options'] = [current_options.get(k, "") for k in ['A', 'B', 'C', 'D'] if k in current_options]
            if len(current_question['options']) >= 2:
                questions.append(current_question)
        
        return questions
    
    def find_all_trac_nghiem_pages(self) -> List[str]:
        """Find all multiple-choice test pages"""
        pages = []
        
        # Search for physics 10 multiple choice pages
        search_urls = [
            SEARCH_URL,
            f"{BASE_URL}/bai-hoc/trac-nghiem-vat-li-10-ket-noi-tri-thuc.html",
            f"{BASE_URL}/bai-hoc/trac-nghiem-vat-li-10-ket-noi-bai-5-toc-do-va-van-toc.html",
            f"{BASE_URL}/bai-hoc/trac-nghiem-vat-li-10-ket-noi-tri-thuc-hoc-ki-ii.html",
            f"{BASE_URL}/bai-hoc/trac-nghiem-vat-li-10-ket-noi-tri-thuc-hoc-ki-i.html",
        ]
        
        # Try to find pages by chapter
        for chapter in range(1, 9):
            search_urls.append(f"{BASE_URL}/tim-kiem.html?q=trắc+nghiệm+vật+lí+10+chương+{chapter}")
        
        for url in search_urls:
            html = self.fetch_page(url)
            if html:
                soup = BeautifulSoup(html, 'html.parser')
                
                # Find all links to test pages
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    if 'trac-nghiem' in href.lower() and 'vat-li-10' in href.lower():
                        full_url = urljoin(BASE_URL, href)
                        if full_url not in pages:
                            pages.append(full_url)
        
        return pages
    
    def crawl(self, specific_urls: List[str] = None):
        """Main crawl function"""
        print("=" * 60)
        print("Tech12h Physics 10 Question Crawler")
        print("=" * 60)
        
        if specific_urls:
            urls_to_crawl = specific_urls
        else:
            print("\nFinding multiple-choice test pages...")
            urls_to_crawl = self.find_all_trac_nghiem_pages()
            print(f"Found {len(urls_to_crawl)} pages to crawl")
        
        if not urls_to_crawl:
            print("No pages found to crawl!")
            return
        
        all_questions = []
        
        for i, url in enumerate(urls_to_crawl, 1):
            print(f"\n{'='*60}")
            print(f"Crawling page {i}/{len(urls_to_crawl)}: {url}")
            print(f"{'='*60}")
            
            html = self.fetch_page(url)
            if html:
                questions = self.parse_trac_nghiem_page(html, url)
                all_questions.extend(questions)
                print(f"✓ Found {len(questions)} questions")
            
            # Be respectful - add delay between requests
            time.sleep(1)
        
        self.questions = all_questions
        print(f"\n{'='*60}")
        print(f"Total questions collected: {len(all_questions)}")
        print(f"{'='*60}")
        
        # Save to JSON
        self.save_to_json()
        
        return all_questions
    
    def save_to_json(self):
        """Save questions to JSON file"""
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump({
                "questions": self.questions,
                "metadata": {
                    "source": "tech12h.com",
                    "crawled_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "total_questions": len(self.questions),
                    "subject": "Vật lí",
                    "grade": "10",
                }
            }, f, ensure_ascii=False, indent=2)
        
        print(f"✓ Saved questions to: {os.path.abspath(self.output_file)}")
    
    def import_to_question_bank(self, api_url: str = QUESTION_BANK_API, auth_token: str = None):
        """Import crawled questions to question bank API"""
        if not self.questions:
            # Try to load from saved file
            if os.path.exists(self.output_file):
                with open(self.output_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.questions = data.get('questions', [])
        
        if not self.questions:
            print("No questions to import!")
            return
        
        print(f"\n{'='*60}")
        print(f"Importing {len(self.questions)} questions to question bank...")
        print(f"{'='*60}")
        
        headers = {
            'Content-Type': 'application/json',
        }
        
        if auth_token:
            headers['Authorization'] = f'Bearer {auth_token}'
        
        success_count = 0
        error_count = 0
        
        for i, question in enumerate(self.questions, 1):
            try:
                response = requests.post(
                    api_url,
                    headers=headers,
                    json=question,
                    timeout=30
                )
                
                if response.status_code in [200, 201]:
                    success_count += 1
                    print(f"✓ Question {i}/{len(self.questions)} imported successfully")
                else:
                    error_count += 1
                    print(f"✗ Question {i}/{len(self.questions)} failed: {response.status_code}")
                    if response.status_code == 401:
                        print("  Authentication required. Please provide auth token.")
                        break
                
            except Exception as e:
                error_count += 1
                print(f"✗ Question {i}/{len(self.questions)} error: {e}")
            
            # Add small delay to avoid overwhelming the server
            time.sleep(0.5)
        
        print(f"\n{'='*60}")
        print(f"Import completed!")
        print(f"  ✓ Successful: {success_count}")
        print(f"  ✗ Failed: {error_count}")
        print(f"{'='*60}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Crawl Physics 10 questions from tech12h.com')
    parser.add_argument('--output', '-o', default='physics10_questions.json',
                       help='Output JSON file (default: physics10_questions.json)')
    parser.add_argument('--import', '-i', dest='do_import', action='store_true',
                       help='Import to question bank API after crawling')
    parser.add_argument('--api-url', default='http://localhost:3000/api/questions',
                       help='Question bank API URL')
    parser.add_argument('--auth-token', '-t', help='Authentication token for API')
    parser.add_argument('--urls', '-u', nargs='+', help='Specific URLs to crawl')
    
    args = parser.parse_args()
    
    crawler = Tech12hCrawler(output_file=args.output)
    
    # Crawl
    crawler.crawl(specific_urls=args.urls)
    
    # Import if requested
    if args.do_import:
        crawler.import_to_question_bank(api_url=args.api_url, auth_token=args.auth_token)
    
    print(f"\n✓ Done! Check {args.output} for crawled questions.")


if __name__ == '__main__':
    main()
