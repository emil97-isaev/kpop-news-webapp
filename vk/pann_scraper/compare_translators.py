from deep_translator import GoogleTranslator
import requests
from bs4 import BeautifulSoup
import asyncio
from dataclasses import dataclass

@dataclass
class Article:
    title: str
    content: str

class Translator:
    def __init__(self):
        self.translator = GoogleTranslator(source='ko', target='ru')
        
    def translate(self, text: str) -> str:
        try:
            return self.translator.translate(text)
        except Exception as e:
            return f"Error: {str(e)}"

async def parse_article(url: str) -> Article:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    title = soup.find('meta', property='og:title')['content'].split('|')[0].strip()
    content = soup.find('meta', property='og:description')['content'].split(':')[1].strip()
    
    return Article(title=title, content=content)

async def test_translations():
    translator = Translator()
    
    # Список статей для тестирования
    articles_urls = [
        'https://m.pann.nate.com/talk/373789013',  # Статья про пропавшую сестру
        'https://m.pann.nate.com/talk/373784179',  # Статья про университет
        'https://m.pann.nate.com/talk/373785039',  # Статья про лапшу
        'https://m.pann.nate.com/talk/373787494',  # Статья про собаку
        'https://m.pann.nate.com/talk/373786894'   # Еще одна статья
    ]
    
    for url in articles_urls:
        print("\n" + "="*80)
        print(f"Статья: {url}")
        print("="*80)
        
        article = await parse_article(url)
        if article:
            print('\nОригинальный заголовок:')
            print(article.title)
            print('\nПеревод заголовка:')
            print(translator.translate(article.title))
            
            print('\nОригинальный текст:')
            print(article.content)
            print('\nПеревод текста:')
            print(translator.translate(article.content))
            
            print("\n" + "-"*80)
            
        await asyncio.sleep(2)  # Небольшая пауза между статьями

if __name__ == "__main__":
    asyncio.run(test_translations()) 