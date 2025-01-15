from typing import Optional, List
import aiohttp
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from loguru import logger
from pydantic import BaseModel
import json
from datetime import datetime
import re
import random
import html
from supabase import create_client, Client
import sys
sys.path.append('..')
from config import SUPABASE_URL, SUPABASE_KEY

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

class Article(BaseModel):
    title: str
    content: str
    author: str
    published_at: datetime
    views: Optional[int] = 0
    likes: Optional[int] = 0
    comments: List[Comment] = []
    source: str
    original_url: Optional[str] = None
    translated_title: Optional[str] = None
    translated_content: Optional[str] = None
    translation_status: str = "pending"
    images: List[str] = []
    content_length: Optional[int] = 0

    def to_dict(self):
        return {
            "title": self.title,
            "content": self.content,
            "author": self.author,
            "published_at": self.published_at.isoformat(),
            "views": self.views,
            "likes": self.likes,
            "source": self.source,
            "original_url": self.original_url,
            "translated_title": self.translated_title,
            "translated_content": self.translated_content,
            "translation_status": self.translation_status,
            "images": self.images,
            "content_length": self.content_length
        }

class BaseScraper:
    def __init__(self, base_url: str, source: str):
        self.ua = UserAgent()
        self.base_url = base_url
        self.source = source
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.supabase.postgrest.auth(SUPABASE_KEY)

    def get_headers(self) -> dict:
        """Возвращает заголовки для запросов. Может быть переопределен в наследниках."""
        return {
            "User-Agent": self.ua.random,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        }

    async def fetch_page(self, url: str) -> str:
        """Базовый метод для загрузки страницы."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    response.raise_for_status()
                    return await response.text(encoding='utf-8')
        except Exception as e:
            logger.error(f"Error fetching {url}: {str(e)}")
            return ""

    def _clean_text(self, text: str) -> str:
        """Базовый метод очистки текста."""
        if not text:
            return ""
        text = html.unescape(text)
        text = re.sub(r'&\w+;', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        text = ''.join(char for char in text if char.isprintable() or char.isspace())
        return text.strip()

    def _extract_number(self, text: str) -> int:
        """Базовый метод извлечения чисел из текста."""
        if not text:
            return 0
        numbers = re.findall(r'\d+', text)
        return int(numbers[0]) if numbers else 0

    async def get_article_links(self, **kwargs) -> List[str]:
        """
        Абстрактный метод для получения списка ссылок на статьи.
        Должен быть реализован в наследниках.
        """
        raise NotImplementedError

    async def parse_article(self, url: str) -> Optional[Article]:
        """
        Абстрактный метод для парсинга статьи.
        Должен быть реализован в наследниках.
        """
        raise NotImplementedError

    async def parse_comments(self, soup: BeautifulSoup) -> List[Comment]:
        """
        Абстрактный метод для парсинга комментариев.
        Должен быть реализован в наследниках.
        """
        raise NotImplementedError

    async def save_to_supabase(self, article: Article):
        """Сохраняет статью и комментарии в Supabase."""
        try:
            # Сохраняем статью
            article_data = {
                "title": article.title,
                "content": article.content,
                "author": article.author,
                "views": article.views,
                "likes": article.likes,
                "comment_count": len(article.comments),
                "url": article.original_url,
                "source": self.source,
                "published_at": article.published_at.isoformat(),
                "images": article.images,
                "content_length": article.content_length,
                "translation_status": article.translation_status
            }
            
            result = self.supabase.table('articles').insert(article_data).execute()
            article_id = result.data[0]['id']
            
            # Сохраняем комментарии
            if article.comments:
                comments_data = []
                for comment in article.comments:
                    comment_dict = {
                        "article_id": article_id,
                        "content": comment.content,
                        "author": comment.author,
                        "likes": comment.likes,
                        "published_at": comment.published_at.isoformat()
                    }
                    comments_data.append(comment_dict)
                
                self.supabase.table('comments').insert(comments_data).execute()
                
            logger.info(f"Saved article {article_id} with {len(article.comments)} comments")
            return article_id
            
        except Exception as e:
            logger.error(f"Error saving to Supabase: {str(e)}")
            return None 