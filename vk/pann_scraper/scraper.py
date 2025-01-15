from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import aiohttp
import asyncio
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from loguru import logger
from pydantic import BaseModel
import aiofiles
import json
from datetime import datetime
import re
import random
import chardet
import requests
import html
import os
from supabase import create_client, Client
import sys
sys.path.append('..')
from config import SUPABASE_URL, SUPABASE_KEY, API_KEY_OPEN_AI, SUPABASE_AUTH_TOKEN
import easyocr
from io import BytesIO
from PIL import Image
import numpy as np
import cv2
from .translator import ContentTranslator

PANN_URLS = [
    "https://m.pann.nate.com/talk/talker?order=REC",  # Recommended
    "https://m.pann.nate.com/talk/talker?order=DIS",  # Discussed
    "https://m.pann.nate.com/talk/talker?order=PRO",  # Pro/Against
    "https://m.pann.nate.com/talk/talker?order=REP"   # Most replies
]

class Comment(BaseModel):
    author: str
    content: str
    published_at: datetime
    likes: Optional[int] = 0
    dislikes: Optional[int] = 0
    translated_content: Optional[str] = None

    def to_dict(self):
        return {
            "author": self.author,
            "content": self.content,
            "published_at": self.published_at.isoformat(),
            "likes": self.likes,
            "dislikes": self.dislikes,
            "translated_content": self.translated_content
        }

@dataclass
class Article:
    title: str
    content: str
    author: str
    views: int
    likes: int
    dislikes: int
    published_at: datetime
    source: str
    images: List[str]
    translation_status: str

class PannScraper:
    def __init__(self):
        self.ua = UserAgent()
        self.base_url = "https://m.pann.nate.com"
        self.session = requests.Session()
        self.session.headers = {
            'User-Agent': self.ua.random
        }
        
        # Initialize Supabase client
        self.supabase = create_client(SUPABASE_URL, SUPABASE_AUTH_TOKEN)
        
        # Initialize OCR for Korean language
        self.reader = easyocr.Reader(['ko'])
        self.translator = ContentTranslator()
        
    def get_headers(self) -> dict:
        mobile_ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        return {
            "User-Agent": mobile_ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Referer": "https://m.pann.nate.com/",
            "Cache-Control": "max-age=0",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "Cookie": "PCID=16485625114393703663438; _ga=GA1.2.1374320086.1648562511"
        }

    async def fetch_page(self, url: str) -> str:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    response.raise_for_status()
                    return await response.text(encoding='utf-8')
        except Exception as e:
            logger.error(f"Error fetching {url}: {str(e)}")
            return ""

    def get_article_links(self) -> List[str]:
        unique_articles = set()
        
        for url in PANN_URLS:
            try:
                response = self.session.get(url)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                for article in soup.select('div.posting-list a'):
                    href = article.get('href')
                    if href and '/talk/' in href and href.count('/') == 2:
                        if not any(x in href for x in ['talker', 'today', 'ranking', 'category', 'bestReply']):
                            article_url = f"https://m.pann.nate.com{href}"
                            logger.debug(f"Found article: {article_url}")
                            unique_articles.add(article_url)
                
            except Exception as e:
                logger.error(f"Error fetching articles from {url}: {str(e)}")
                continue
        
        logger.info(f"Found {len(unique_articles)} unique articles")
        return list(unique_articles)

    def _extract_number(self, text: str) -> int:
        if not text:
            return 0
        numbers = re.findall(r'\d+', text)
        return int(numbers[0]) if numbers else 0

    def _clean_text(self, text: str) -> str:
        if not text:
            return ""
        # Очищаем текст от HTML-сущностей и лишних пробелов
        text = html.unescape(text)  # Декодируем HTML-сущности
        text = re.sub(r'&\w+;', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        # Удаляем непечатаемые символы
        text = ''.join(char for char in text if char.isprintable() or char.isspace())
        return text.strip()

    async def parse_comments(self, soup: BeautifulSoup) -> List[Comment]:
        comments = []
        try:
            comments_section = soup.find('div', class_='reply-list')
            if not comments_section:
                return comments

            for comment_elem in comments_section.find_all('dl'):
                try:
                    # Extract author
                    author_elem = comment_elem.find('dt')
                    if not author_elem:
                        continue
                    author = self._clean_text(author_elem.text)

                    # Extract content
                    content_elem = comment_elem.find('dd', class_='usertxt')
                    if not content_elem:
                        continue
                    content = self._clean_text(content_elem.text)

                    # Extract date
                    date_elem = comment_elem.find('dd', class_='date')
                    if not date_elem:
                        continue
                    date_str = self._clean_text(date_elem.text)
                    published_at = datetime.strptime(date_str, "%Y.%m.%d %H:%M")

                    comment = Comment(
                        content=content,
                        author=author,
                        published_at=published_at,
                        likes=0,
                        dislikes=0
                    )
                    comments.append(comment)

                except Exception as e:
                    logger.error(f"Error parsing comment: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error parsing comments section: {e}")

        logger.info(f"Total comments found: {len(comments)}")
        return comments

    def analyze_image_text(self, image_url: str) -> float:
        """
        Анализирует количество текста на изображении
        :param image_url: URL изображения
        :return: Процент площади изображения, занятой текстом (0-1)
        """
        try:
            # Загружаем изображение
            response = requests.get(image_url)
            img = Image.open(BytesIO(response.content))
            
            # Получаем размеры изображения
            width, height = img.size
            total_area = width * height
            
            # Распознаем текст на изображении
            result = self.reader.readtext(np.array(img))
            
            # Считаем общую площадь, занятую текстом
            text_area = 0
            for detection in result:
                # detection[0] содержит координаты прямоугольника с текстом
                box = detection[0]
                # Вычисляем площадь прямоугольника
                box_width = abs(box[1][0] - box[0][0])
                box_height = abs(box[2][1] - box[0][1])
                text_area += box_width * box_height
            
            # Возвращаем отношение площади текста к общей площади
            return text_area / total_area
            
        except Exception as e:
            logger.error(f"Error analyzing image text: {str(e)}")
            return 0

    def parse_article(self, url: str) -> Optional[Article]:
        try:
            response = self.session.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Save HTML for debugging
            with open('debug.html', 'w', encoding='utf-8') as f:
                f.write(str(soup))
            
            # Extract title from meta tag
            title_meta = soup.find('meta', property='og:title')
            if not title_meta:
                logger.error(f"Could not find title meta tag for {url}")
                return None
            title = title_meta['content'].split('|')[0].strip()
            
            # Extract content from meta tag
            content_meta = soup.find('meta', property='og:description')
            if not content_meta:
                logger.error(f"Could not find content meta tag for {url}")
                return None
            content = content_meta['content'].split(':')[1].strip()
            
            # Extract views, likes and dislikes
            views = 0
            likes = 0
            dislikes = 0
            
            # Find views in script
            for script in soup.find_all('script', type='text/javascript'):
                if script.string and 'var cnt = parseInt' in script.string:
                    match = re.search(r'var cnt = parseInt\(\'(\d+)\'\)', script.string)
                    if match:
                        views = int(match.group(1))
                        break
            
            # Find likes and dislikes in script
            for script in soup.find_all('script', type='text/javascript'):
                if script.string and 'var obj = j$("#' in script.string:
                    match = re.search(r'var cnt = (\d+)', script.string)
                    if match:
                        if 'R_cnt' in script.string:
                            likes = int(match.group(1))
                        elif 'O_cnt' in script.string:
                            dislikes = int(match.group(1))
            
            # Extract images
            images = []
            for img in soup.select('div.posting-img img'):
                src = img.get('data-origin') or img.get('src')
                if src:
                    if not src.startswith('http'):
                        src = f"https:{src}"
                    images.append(src)
            
            # Create Article object
            article = Article(
                title=title,
                content=content,
                author="Unknown",
                views=views,
                likes=likes,
                dislikes=dislikes,
                published_at=datetime.now(),
                source=url,
                images=images,
                translation_status="pending"
            )
            
            return article
            
        except Exception as e:
            logger.error(f"Error parsing article {url}: {str(e)}")
            return None

    async def save_article(self, article: Article, filename: str):
        async with aiofiles.open(filename, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(article.to_dict(), indent=2, ensure_ascii=False))

    def save_to_supabase(self, article: Article) -> bool:
        try:
            article_data = {
                'title': str(article.title),
                'content': str(article.content),
                'author': str(article.author),
                'views': int(article.views),
                'likes': int(article.likes),
                'dislikes': int(article.dislikes),
                'published_at': article.published_at.isoformat(),
                'source': str(article.source),
                'images': json.dumps(article.images),
                'translation_status': str(article.translation_status)
            }
            
            logger.info(f"Saving article data: {article_data}")
            response = self.supabase.table('articles').insert(article_data).execute()
            
            if response.data:
                logger.info("Article saved successfully")
                return True
            else:
                logger.error("No data returned after saving article")
                return False
                
        except Exception as e:
            logger.error(f"Error saving to Supabase: {str(e)}")
            return False

def main():
    try:
        scraper = PannScraper()
        articles = scraper.get_article_links()
        logger.info(f"Found {len(articles)} articles")
        
        for i, url in enumerate(articles, 1):
            try:
                logger.info(f"Processing article {i}: {url}")
                article = scraper.parse_article(url)
                if article:
                    logger.info(f"Successfully parsed article: {article.title}")
                    if scraper.save_to_supabase(article):
                        logger.info(f"Successfully saved article to Supabase: {article.title}")
                    else:
                        logger.error(f"Failed to save article to Supabase: {article.title}")
                else:
                    logger.error(f"Failed to parse article: {url}")
            except Exception as e:
                logger.error(f"Error processing article {url}: {str(e)}", exc_info=True)
                continue
    except Exception as e:
        logger.error(f"Error in main: {str(e)}", exc_info=True)
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 