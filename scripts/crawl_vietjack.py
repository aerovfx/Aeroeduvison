#!/usr/bin/env python3
"""
Crawl VietJack physics exercises page and save as JSON
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from urllib.parse import urljoin

def crawl_vietjack_physics():
    base_url = "https://vietjack.com/bai-tap-trac-nghiem-vat-li-12/"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    }
    
    try:
        response = requests.get(base_url, headers=headers, timeout=30)
        response.raise_for_status()
        response.encoding = 'utf-8'
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        result = {
            "source": base_url,
            "title": soup.find('title').get_text(strip=True) if soup.find('title') else "Bài tập trắc nghiệm Vật Lí 12 - VietJack",
            "chapters": []
        }
        
        chapter_list = []
        seen_urls = set()
        
        # Try multiple selectors for VietJack structure
        selectors = [
            'div.news-item a',
            'div.list-content a',
            'article a',
            'div.content a',
            'div.main-content a',
        ]
        
        all_links = soup.find_all('a', href=True)
        
        for link in all_links:
            href = link.get('href', '')
            title = link.get('title', '').strip()
            
            if not title:
                title = link.get_text(strip=True)
            
            # Filter for physics exercise links
            if '/bai-tap-trac-nghiem-vat-li-12/' in href and title:
                full_url = urljoin(base_url, href)
                
                # Avoid duplicates
                if full_url not in seen_urls:
                    seen_urls.add(full_url)
                    chapter_list.append({
                        "title": title,
                        "url": full_url
                    })
        
        # Also look for specific VietJack patterns
        # Find divs that might contain chapter listings
        for div in soup.find_all('div', class_=re.compile(r'news|item|content|list', re.I)):
            links = div.find_all('a', href=True)
            for link in links:
                href = link.get('href', '')
                title = link.get('title', '').strip() or link.get_text(strip=True)
                
                if '/bai-tap-trac-nghiem-vat-li-12/' in href and title:
                    full_url = urljoin(base_url, href)
                    if full_url not in seen_urls:
                        seen_urls.add(full_url)
                        chapter_list.append({
                            "title": title,
                            "url": full_url
                        })
        
        result["chapters"] = chapter_list
        result["total_chapters"] = len(chapter_list)
        
        return result
        
    except requests.RequestException as e:
        print(f"Error fetching page: {e}")
        return {
            "error": str(e),
            "source": base_url
        }

def main():
    print("Crawling VietJack physics exercises...")
    data = crawl_vietjack_physics()
    
    output_file = "vl12viet_on.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Saved to {output_file}")
    print(f"Total chapters found: {data.get('total_chapters', 0)}")
    
    if 'chapters' in data and data['chapters']:
        print("\nChapters found:")
        for i, chapter in enumerate(data['chapters'], 1):
            print(f"  {i}. {chapter['title']}")
            print(f"     URL: {chapter['url']}")

if __name__ == "__main__":
    main()
