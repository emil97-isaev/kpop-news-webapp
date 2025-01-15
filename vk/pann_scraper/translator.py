from deep_translator import GoogleTranslator
from typing import Optional

class ContentTranslator:
    def __init__(self):
        self.google_translator = GoogleTranslator(source='ko', target='ru')
        
    def translate_text(self, text: str) -> Optional[str]:
        if not text:
            return None
            
        try:
            # Разбиваем текст на части, если он слишком длинный
            max_length = 5000
            if len(text) > max_length:
                parts = [text[i:i+max_length] for i in range(0, len(text), max_length)]
                translated_parts = [self.google_translator.translate(part) for part in parts]
                return ' '.join(translated_parts)
            
            return self.google_translator.translate(text)
        except Exception as e:
            print(f"Error translating text: {str(e)}")
            return None

# Пример использования:
if __name__ == "__main__":
    translator = ContentTranslator()
    
    # Тестовый корейский текст
    korean_text = "안녕하세요. 이것은 테스트입니다."
    translated = translator.translate_text(korean_text)
    print(f"Korean text: {korean_text}")
    print(f"Translated: {translated}")
    
    # Тестовый английский текст
    english_text = "Hello, this is a test."
    translated = translator.translate_text(english_text)
    print(f"English text: {english_text}")
    print(f"Translated: {translated}") 