import asyncio
import random
from bs4 import BeautifulSoup
from loguru import logger
from typing import Optional, List
from base_scraper import BaseScraper, Article, Comment

class PannScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            base_url="https://m.pann.nate.com",
            source="pann.nate.com"
        )
    
    def get_headers(self) -> dict:
        """Специфичные заголовки для Pann."""
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

    async def get_article_links(self, date: str = None) -> List[str]:
        """Получает список ссылок на статьи с главной страницы Pann."""
        url = f"{self.base_url}/talk/today"
        if date:
            url = f"{url}/{date}"
            
        try:
            html = await self.fetch_page(url)
            if not html:
                return []
                
            soup = BeautifulSoup(html, 'html5lib')
            article_links = []
            
            # Ищем все ссылки на статьи в списке
            articles = soup.find_all('a', {'class': 'cnbox'})
            for article in articles:
                href = article.get('href')
                if href and href.startswith('/talk/'):
                    # Получаем полный URL статьи
                    article_url = f"{self.base_url}{href.split('?')[0]}"
                    article_links.append(article_url)
                    logger.debug(f"Found article: {article_url}")
            
            logger.info(f"Found {len(article_links)} articles")
            return article_links
            
        except Exception as e:
            logger.error(f"Error getting article links: {str(e)}")
            return []

    async def parse_comments(self, soup: BeautifulSoup) -> List[Comment]:
        """Парсит комментарии со страницы Pann."""
        comments = []
        
        # Ищем секцию с комментариями в reply-list
        reply_list = soup.find('div', {'class': 'reply-list'})
        if not reply_list:
            return comments
        
        # Ищем все комментарии (они находятся в dl элементах)
        comment_elements = reply_list.find_all('dl')
        
        for comment_elem in comment_elements:
            try:
                # Извлекаем информацию об авторе и дате из dt
                dt = comment_elem.find('dt')
                if not dt:
                    continue
                
                # Получаем все текстовые элементы из dt
                dt_texts = [text.strip() for text in dt.stripped_strings]
                
                # Автор - это первый элемент после 'best' если есть, или просто первый элемент
                author = dt_texts[1] if 'best' in dt_texts[0].lower() else dt_texts[0]
                
                # Дата - это последний элемент
                date = dt_texts[-1]
                
                # Получаем текст комментария из dd с классом userText
                content_elem = comment_elem.find('dd', {'class': 'userText'})
                if not content_elem:
                    continue
                
                content = self._clean_text(content_elem.text)
                
                # Пытаемся найти лайки
                likes = 0
                dislikes = 0
                
                # Ищем элементы с лайками/дизлайками
                recomm_elem = comment_elem.find('span', {'class': 'recomm'})
                if recomm_elem:
                    likes = self._extract_number(recomm_elem.text)
                
                # Создаем объект комментария
                comment = Comment(
                    author=author,
                    content=content,
                    date=date,
                    likes=likes,
                    dislikes=dislikes
                )
                
                comments.append(comment)
                logger.debug(f"Parsed comment: {author} | {date} | likes: {likes}")
                
            except Exception as e:
                logger.error(f"Error parsing comment: {str(e)}")
                continue
        
        logger.info(f"Total comments found: {len(comments)}")
        return comments

    async def parse_article(self, url: str) -> Optional[Article]:
        """Парсит статью с сайта Pann."""
        html = await self.fetch_page(url)
        if not html:
            return None

        soup = BeautifulSoup(html, 'html5lib')
        try:
            # Логируем HTML для отладки
            logger.debug(f"HTML content length: {len(html)}")
            
            # Ищем заголовок
            title = soup.find('h1', {'class': 'view-tit'})
            if not title:
                title = soup.find(['h2', 'h1'], {'class': ['title', 'subject']})
            
            # Ищем контент
            content_elem = soup.find('div', {'id': 'pann-content'})
            if not content_elem:
                content_elem = soup.find('div', {'class': 'content'})
            
            # Ищем информацию об авторе в div class="writer"
            author_info = soup.find('div', {'class': 'writer'})
            
            if not all([title, content_elem, author_info]):
                logger.error("Could not find essential elements")
                return None

            # Извлекаем автора
            author = "Anonymous"
            author_elem = author_info.find('span', {'class': 'nick'})
            if author_elem:
                author = self._clean_text(author_elem.text)
            
            # Извлекаем дату
            date = ""
            date_elem = author_info.find('span', {'class': 'num'})
            if date_elem:
                date = self._clean_text(date_elem.text)
            
            # Извлекаем просмотры
            views = 0
            views_text = author_info.find_all('span', {'class': 'num'})
            if len(views_text) > 1:
                views = self._extract_number(views_text[1].text)
            
            # Извлекаем лайки
            likes = 0
            likes_elem = soup.find('div', {'class': 'up'})
            if likes_elem:
                likes_span = likes_elem.find('span', {'class': 'count'})
                if likes_span:
                    likes = self._extract_number(likes_span.text)
            
            # Парсим комментарии
            comments = await self.parse_comments(soup)
            
            # Создаем объект статьи
            article = Article(
                title=self._clean_text(title.text),
                content=self._clean_text(content_elem.text),
                author=author,
                date=date,
                views=views,
                likes=likes,
                comments=comments,
                source=self.source,
                original_url=url
            )
            
            logger.debug(f"Successfully parsed article: {article.title}")
            logger.debug(f"Found {len(comments)} comments")
            logger.debug(f"Metadata: views={views}, likes={likes}, comment_count={len(comments)}")
            
            return article
            
        except Exception as e:
            logger.error(f"Error parsing article: {str(e)}")
            return None

async def main():
    scraper = PannScraper()
    
    # Получаем список статей
    logger.info("Starting to scrape articles")
    article_links = await scraper.get_article_links()
    
    # Обрабатываем каждую статью
    for i, url in enumerate(article_links, 1):
        logger.info(f"Processing article {i}/{len(article_links)}: {url}")
        
        article = await scraper.parse_article(url)
        if article:
            # Сохраняем в Supabase
            article_id = await scraper.save_to_supabase(article)
            
            if article_id:
                logger.info(f"Article saved to Supabase with ID: {article_id}")
                logger.info(f"Title: {article.title}")
                logger.info(f"Author: {article.author}")
                logger.info(f"Comments count: {len(article.comments)}")
            
            # Небольшая пауза между запросами
            await asyncio.sleep(random.uniform(1, 3))
        else:
            logger.error(f"Failed to parse article: {url}")

if __name__ == "__main__":
    logger.add("scraper.log", rotation="500 MB")
    asyncio.run(main()) 