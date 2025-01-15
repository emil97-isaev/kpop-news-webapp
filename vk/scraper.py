from typing import Optional, List
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
import requests
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_AUTH_TOKEN

class Comment(BaseModel):
    author: str
    content: str
    date: str
    likes: Optional[int] = 0
    dislikes: Optional[int] = 0

    def to_dict(self):
        return {
            "author": self.author,
            "content": self.content,
            "date": self.date,
            "likes": self.likes,
            "dislikes": self.dislikes
        }

class Article(BaseModel):
    title: str
    content: str
    author: str
    date: str
    views: Optional[int] = 0
    likes: Optional[int] = 0
    dislikes: Optional[int] = 0
    comments: List[Comment] = []
    category: Optional[str] = ""
    comment_count: Optional[int] = 0
    images: List[str] = []

    def to_dict(self):
        return {
            "title": self.title,
            "content": self.content,
            "author": self.author,
            "date": self.date,
            "views": self.views,
            "likes": self.likes,
            "dislikes": self.dislikes,
            "comments": [comment.to_dict() for comment in self.comments],
            "category": self.category,
            "comment_count": self.comment_count,
            "images": self.images
        }

class PannScraper:
    def __init__(self):
        self.session = requests.Session()
        self.ua = UserAgent()
        self.supabase = create_client(SUPABASE_URL, SUPABASE_AUTH_TOKEN)
        # Устанавливаем service_role для PostgREST
        self.supabase.postgrest.auth(SUPABASE_AUTH_TOKEN)
        self.base_url = "https://m.pann.nate.com"
        
    def get_headers(self):
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
            "Upgrade-Insecure-Requests": "1"
        }

    def fetch_page(self, url: str) -> str:
        try:
            response = self.session.get(url, headers=self.get_headers())
            response.raise_for_status()
            response.encoding = 'utf-8'
            
            # Сохраняем HTML сразу после получения
            with open('page.html', 'w', encoding='utf-8') as f:
                f.write(response.text)
            logger.info("Saved raw HTML to page.html")
            
            return response.text
        except Exception as e:
            logger.error(f"Error fetching {url}: {str(e)}")
            return ""

    def _extract_number(self, text: str) -> int:
        if not text:
            return 0
        numbers = re.findall(r'\d+', text)
        return int(numbers[0]) if numbers else 0

    def _clean_text(self, text: str) -> str:
        if not text:
            return ""
        # Очищаем текст от HTML-сущностей и лишних пробелов
        text = re.sub(r'&\w+;', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        # Удаляем непечатаемые символы
        text = ''.join(char for char in text if char.isprintable() or char.isspace())
        return text.strip()

    def _extract_date(self, text: str) -> str:
        """Extract date from text in format YYYY.MM.DD HH:MM"""
        if not text:
            return ""
        date_pattern = r'\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}'
        match = re.search(date_pattern, text)
        return match.group(0) if match else text

    def parse_comments(self, soup: BeautifulSoup) -> List[Comment]:
        comments = []
        
        # Ищем все возможные секции с комментариями
        comment_sections = []
        for class_name in ['cmt_list', 'comment_list', 'reply_list', 'commentBox', 'comment_box']:
            sections = soup.find_all(['div', 'ul'], {'class': class_name})
            comment_sections.extend(sections)
        
        # Если не нашли секции, пробуем искать комментарии напрямую
        if not comment_sections:
            comment_sections = [soup]
        
        for section in comment_sections:
            # Ищем комментарии по всем возможным классам
            comments_found = section.find_all(['div', 'li'], {'class': ['cmt', 'comment', 'reply', 'commentItem']})
            
            for comment in comments_found:
                try:
                    # Ищем текст комментария во всех возможных местах
                    content_elem = None
                    for class_name in ['txt', 'text', 'content', 'comment_text', 'message']:
                        content_elem = comment.find(['div', 'p', 'span'], {'class': class_name})
                        if content_elem:
                            break
                    
                    if not content_elem:
                        continue
                    
                    # Ищем информацию об авторе
                    author_elem = None
                    for class_name in ['writer', 'nick', 'name', 'author', 'username']:
                        author_elem = comment.find(['span', 'a', 'div'], {'class': class_name})
                        if author_elem:
                            break
                    
                    # Ищем дату
                    date_elem = None
                    for class_name in ['date', 'time', 'timestamp', 'created']:
                        date_elem = comment.find(['span', 'time', 'div'], {'class': class_name})
                        if date_elem:
                            break
                    
                    # Ищем лайки/дизлайки
                    likes = 0
                    dislikes = 0
                    
                    # Ищем лайки
                    likes_elem = None
                    for class_name in ['like', 'up', 'recommend', 'good']:
                        likes_elem = comment.find(['em', 'span', 'div'], {'class': class_name})
                        if likes_elem:
                            likes = self._extract_number(likes_elem.text)
                            break
                    
                    # Ищем дизлайки
                    dislikes_elem = None
                    for class_name in ['dislike', 'down', 'bad']:
                        dislikes_elem = comment.find(['em', 'span', 'div'], {'class': class_name})
                        if dislikes_elem:
                            dislikes = self._extract_number(dislikes_elem.text)
                            break
                    
                    # Создаем объект комментария
                    comment_obj = Comment(
                        author=self._clean_text(author_elem.text) if author_elem else "Anonymous",
                        content=self._clean_text(content_elem.text),
                        date=self._clean_text(date_elem.text) if date_elem else "",
                        likes=likes,
                        dislikes=dislikes
                    )
                    
                    comments.append(comment_obj)
                    logger.debug(f"Parsed comment: {comment_obj}")
                    
                except Exception as e:
                    logger.error(f"Error parsing comment: {str(e)}")
                    continue
        
        logger.info(f"Total comments found: {len(comments)}")
        return comments

    def parse_article(self, html: str) -> Optional[Article]:
        logger.debug(f"HTML content length: {len(html)}")
        
        soup = BeautifulSoup(html, 'html5lib')
        
        # Находим заголовок
        title_elem = soup.find('h1', {'class': 'view-tit'})
        if not title_elem:
            logger.error("Title element not found")
            return None
        title = title_elem.text.strip()
        
        # Находим контент
        content_elem = soup.find('div', {'id': 'pann-content'})
        if not content_elem:
            logger.error("Content element not found")
            return None
        content = content_elem.text.strip()
        
        # Находим автора
        author = "Anonymous"  # По умолчанию
        author_elem = soup.find('span', {'class': 'nick'})
        if author_elem:
            author = author_elem.text.strip()
            
        # Находим дату
        date = None
        date_elem = soup.find('span', {'class': 'num'})
        if date_elem and "." in date_elem.text:
            date = date_elem.text.strip()
            
        # Находим просмотры, лайки и дизлайки
        views = 0
        sub_divs = soup.find_all('div', {'class': 'sub'})
        for div in sub_divs:
            text = div.text.strip()
            if '조회' in text:  # Если содержит слово "просмотры"
                views_match = re.search(r'(\d+(?:,\d+)*)', text)
                if views_match:
                    views = int(views_match.group(1).replace(',', ''))
                    
        # Находим лайки и дизлайки
        likes = 0
        dislikes = 0
        r_cnt = soup.find('span', {'id': 'R_cnt'})
        if r_cnt:
            likes_elem = r_cnt.find('span')
            if likes_elem:
                likes = int(likes_elem.text.replace(',', ''))
                
        o_cnt = soup.find('span', {'id': 'O_cnt'})
        if o_cnt:
            dislikes_elem = o_cnt.find('span')
            if dislikes_elem:
                dislikes = int(dislikes_elem.text.replace(',', ''))
                
        # Извлекаем ссылки на изображения
        images = []
        if content_elem:
            for img in content_elem.find_all('img'):
                src = img.get('src')
                if src:
                    # Если ссылка относительная, делаем её абсолютной
                    if src.startswith('//'):
                        src = 'https:' + src
                    elif src.startswith('/'):
                        src = 'https://m.pann.nate.com' + src
                    images.append(src)
                    logger.debug(f"Found image: {src}")
                    
        # Создаем объект статьи
        article = Article(
            title=title,
            content=content,
            author=author,
            date=date,
            views=views,
            likes=likes,
            dislikes=dislikes,
            comments=[],  # Пока оставляем пустым
            images=images
        )
        
        return article

    async def save_article(self, article: Article, filename: str):
        async with aiofiles.open(filename, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(article.to_dict(), indent=2, ensure_ascii=False))

    def save_to_supabase(self, article: Article, url: str) -> bool:
        """Сохраняет статью в Supabase."""
        try:
            # Подготавливаем данные для сохранения
            article_data = {
                "title": article.title,
                "content": article.content,
                "author": article.author,
                "views": article.views,
                "likes": article.likes,
                "dislikes": article.dislikes,
                "comment_count": article.comment_count,
                "url": url,  # Используем переданный URL
                "source": "pann.nate.com",
                "published_at": datetime.strptime(article.date, "%Y.%m.%d %H:%M").isoformat(),
                "content_length": len(article.content),
                "translation_status": "pending",
                "images": article.images  # Добавляем список изображений
            }
            
            # Сохраняем в Supabase
            response = self.supabase.table('articles').insert(article_data).execute()
            return True
        except Exception as e:
            logger.error(f"Error saving to Supabase: {str(e)}")
            return False

    async def get_article_links(self) -> List[str]:
        """Получает список ссылок на статьи со всех указанных страниц Pann."""
        urls = [
            f"{self.base_url}/talk/talker?order=REC",
            f"{self.base_url}/talk/talker?order=DIS",
            f"{self.base_url}/talk/talker?order=PRO",
            f"{self.base_url}/talk/talker"
        ]
        
        article_links = set()  # Используем set для автоматического удаления дубликатов
        
        for url in urls:
            try:
                logger.info(f"Fetching articles from {url}")
                html = self.fetch_page(url)
                if not html:
                    continue
                    
                soup = BeautifulSoup(html, 'html5lib')
                
                # Ищем все ссылки на статьи в списке
                articles = soup.find_all(['a', 'div'], {'class': ['list_box', 'list-box', 'cnbox']})
                for article in articles:
                    # Проверяем есть ли ссылка напрямую или внутри элемента
                    href = article.get('href')
                    if not href:
                        link_elem = article.find('a')
                        if link_elem:
                            href = link_elem.get('href')
                    
                    if href and '/talk/' in href:
                        # Получаем ID статьи из URL
                        article_id = href.split('/')[-1].split('?')[0]
                        # Формируем полный URL
                        article_url = f"{self.base_url}/talk/{article_id}"
                        article_links.add(article_url)
                        logger.debug(f"Found article: {article_url}")
                
                logger.info(f"Found {len(article_links)} unique articles so far")
                
            except Exception as e:
                logger.error(f"Error getting article links from {url}: {str(e)}")
                continue
            
            # Добавляем небольшую задержку между запросами к разным страницам
            await asyncio.sleep(random.uniform(1, 2))
        
        return list(article_links)

    def check_article_exists(self, article_id: str) -> bool:
        """Проверяет, существует ли статья в Supabase."""
        try:
            response = self.supabase.table('articles').select('id').eq('url', f"{self.base_url}/talk/{article_id}").execute()
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error checking article existence: {str(e)}")
            return False

async def main():
    scraper = PannScraper()
    
    # Получаем список ссылок на статьи
    article_links = await scraper.get_article_links()
    logger.info(f"Found {len(article_links)} unique articles to scrape")
    
    # Парсим каждую статью
    for url in article_links:
        article_id = url.split('/')[-1]
        
        # Проверяем, не сохранена ли уже эта статья
        if scraper.check_article_exists(article_id):
            logger.info(f"Article {article_id} already exists in database, skipping")
            continue
            
        logger.info(f"Starting to scrape article: {url}")
        
        # Добавляем небольшую задержку между запросами
        await asyncio.sleep(random.uniform(1, 3))
        
        # Получаем HTML статьи
        html = scraper.fetch_page(url)
        if not html:
            logger.error(f"Failed to fetch article HTML")
            continue
            
        article = scraper.parse_article(html)
        if article:
            logger.info(f"Successfully parsed article:")
            logger.info(f"Title: {article.title}")
            logger.info(f"Views: {article.views}")
            logger.info(f"Likes: {article.likes}")
            logger.info(f"Dislikes: {article.dislikes}")
            logger.info(f"Comments: {len(article.comments)}")
            
            # Сохраняем результаты в JSON
            await scraper.save_article(article, 'article_data.json')
            logger.info("Saved article data to article_data.json")
            
            # Сохраняем в Supabase
            if scraper.save_to_supabase(article, url):
                logger.info(f"Successfully saved article to Supabase")
            else:
                logger.error(f"Failed to save article to Supabase")
        else:
            logger.error("Failed to parse article")

if __name__ == "__main__":
    logger.add("scraper.log", rotation="500 MB")
    logger.add(lambda msg: print(msg), level="DEBUG")
    asyncio.run(main()) 