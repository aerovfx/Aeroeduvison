#!/usr/bin/env python3
"""
Crawl all sub-links from VietJack physics exercises and save as JSON files in data/
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import os
import time
from urllib.parse import urljoin, urlparse
from pathlib import Path

# Create data directory
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

def sanitize_filename(title):
    """Convert title to valid filename"""
    # Remove special characters
    filename = re.sub(r'[^\w\s-]', '', title)
    # Replace spaces with underscores
    filename = re.sub(r'\s+', '_', filename)
    # Limit length
    return filename[:100].lower()

def crawl_lesson_content(url, headers):
    """Crawl a single lesson page and extract questions"""
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
            questions = []
            current_question = None
            
            for elem in article.find_all(['p', 'div', 'h2', 'h3', 'h4', 'b', 'strong']):
                text = elem.get_text(strip=True)
                if not text:
                    continue
                
                # Check if this is a question
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
            
            if current_question:
                questions.append(current_question)
            
            result["content"]["questions"] = questions
        
        # Get related links
        related_links = []
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            title = link.get('title', '').strip() or link.get_text(strip=True)
            if '/vat-li-12' in href and title and href != url:
                related_links.append({
                    "title": title,
                    "url": urljoin(url, href)
                })
        
        result["related_lessons"] = related_links[:10]
        result["total_questions"] = len(questions)
        
        return result
        
    except requests.RequestException as e:
        return {
            "error": str(e),
            "source": url
        }

def get_all_sub_links(base_url, headers):
    """Get all sub-links from the main page"""
    try:
        response = requests.get(base_url, headers=headers, timeout=30)
        response.raise_for_status()
        response.encoding = 'utf-8'
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        links = []
        seen_urls = set()
        
        # Find all links
        all_links = soup.find_all('a', href=True)
        
        for link in all_links:
            href = link.get('href', '')
            title = link.get('title', '').strip()
            
            if not title:
                title = link.get_text(strip=True)
            
            # Filter for physics exercise links (exclude anchor links)
            if '/bai-tap-trac-nghiem-vat-li-12/' in href and title and not href.startswith('#'):
                full_url = urljoin(base_url, href)
                
                # Avoid duplicates and self
                if full_url not in seen_urls and full_url != base_url:
                    seen_urls.add(full_url)
                    links.append({
                        "title": title,
                        "url": full_url
                    })
        
        return links
        
    except requests.RequestException as e:
        print(f"Error fetching main page: {e}")
        return []

def main():
    base_url = "https://vietjack.com/bai-tap-trac-nghiem-vat-li-12/"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    }
    
    print(f"Getting all sub-links from: {base_url}")
    sub_links = get_all_sub_links(base_url, headers)
    
    print(f"Found {len(sub_links)} sub-links")
    
    # Save index file
    index_data = {
        "source": base_url,
        "total_links": len(sub_links),
        "links": sub_links
    }
    
    with open(DATA_DIR / "index.json", 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    
    print(f"Saved index to data/index.json")
    
    # Crawl each sub-link
    success_count = 0
    error_count = 0
    
    for i, link_info in enumerate(sub_links, 1):
        title = link_info['title']
        url = link_info['url']
        
        print(f"\n[{i}/{len(sub_links)}] Crawling: {title[:60]}...")
        
        # Crawl the page
        data = crawl_lesson_content(url, headers)
        
        # Generate filename from URL path
        parsed = urlparse(url)
        filename = Path(parsed.path).stem
        
        # Save to file
        output_file = DATA_DIR / f"{filename}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        if 'error' not in data:
            print(f"  ✓ Saved: {output_file} ({data.get('total_questions', 0)} questions)")
            success_count += 1
        else:
            print(f"  ✗ Error: {data.get('error', 'Unknown')}")
            error_count += 1
        
        # Rate limiting - be polite to the server
        time.sleep(0.5)
    
    print(f"\n{'='*50}")
    print(f"Crawling complete!")
    print(f"Success: {success_count}")
    print(f"Errors: {error_count}")
    print(f"Total files saved: {success_count + 1} (including index.json)")
    print(f"Output directory: {DATA_DIR.absolute()}")

if __name__ == "__main__":
    main()
