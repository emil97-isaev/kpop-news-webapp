from pann_scraper.translator import ContentTranslator
from pann_scraper.scraper import PannScraper
import asyncio

async def test_translation():
    scraper = PannScraper()
    translator = ContentTranslator()
    
    # Берем одну статью для теста
    article_url = 'https://m.pann.nate.com/talk/373789013'
    article = await scraper.parse_article(article_url)
    
    if article:
        print('\nОригинальный заголовок:')
        print(article.title)
        print('\nПереведенный заголовок:')
        print(translator.translate_text(article.title))
        print('\nОригинальный текст:')
        print(article.content)
        print('\nПереведенный текст:')
        print(translator.translate_text(article.content))

if __name__ == "__main__":
    asyncio.run(test_translation()) 