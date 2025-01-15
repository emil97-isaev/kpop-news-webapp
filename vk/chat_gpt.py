import pandas as pd
from openai import OpenAI
from datetime import datetime
from config import API_KEY_OPEN_AI, SUPABASE_FUNCTION_URL, SUPABASE_AUTH_TOKEN
import requests
import json


def call_supabase_function_chat_gpt(payload):
    """
    Вызывает функцию Supabase, передавая данные.
    """
    headers = {
        "Authorization": f"Bearer {SUPABASE_AUTH_TOKEN}",  # Токен для авторизации
        "Content-Type": "application/json",               # Формат данных
    }

    try:
        # Отправляем POST-запрос
        response = requests.post(SUPABASE_FUNCTION_URL, headers=headers, json=payload)
        
        # Проверяем статус ответа
        if response.status_code == 200:
            return response.json()  # Возвращаем результат в формате JSON
        else:
            print(f"Ошибка: {response.status_code}, {response.text}")
            return None
    except Exception as e:
        print(f"Ошибка соединения: {e}")
        return None







# # Создание клиента OpenAI
# client = OpenAI(api_key=API_KEY_OPEN_AI)

# def query_chat_gpt(system_message, user_input, model="gpt-4o-mini"):
#     try:
#         completion = client.chat.completions.create(
#             model=model,
#             messages=[
#                 {"role": "system", "content": system_message},
#                 {"role": "user", "content": user_input}
#             ]
#         )
#         return completion.choices[0].message.content.strip()
#     except Exception as e:
#         print(f"Ошибка выполнения запроса: {e}")
#         return None

# # Функции для определения категории и главной сущности
# def determine_category(news_text):
#     system_message = """
#     Определяй категорию новости. При выборе категории опирайся на содержание и контекст новости.
#     Верни только номер категории, без дополнительного текста. Вот категории:
#     1. Скандалы, интриги, расследования
#     2. Информация о личной жизни артистов
#     3. Слухи
#     4. Статистика - есть информация о цифрах, рейтингах и т.п.
#     5. Информация о релизе или промоушне
#     6. Новости о музыкальных и других премиях
#     7. Новости о новичках айдолах - есть инфа о новых группах, дебютах
#     8. Новости об актерах и дорамах
#     9. Комментарии нетизенов
#     """
#     return query_chat_gpt(system_message, f"Определи категорию для этой новости: {news_text}")

# def extract_main_entity(news_text):
#     system_message = """
#     Извлеки из текста только личности и/или группы K-pop, о которых идет основная речь.
#     Если имя/группа на русском, верни на английском. Возвращай список в формате:
#     Имя личности
#     Название группы
#     Игнорируй других упомянутых личностей и группы, не относящихся к основной теме текста.
#     Если личностей и групп K-pop нет в тексте, верни прочерк - 
#     """
#     tags  = query_chat_gpt(system_message, f"Выдели личность и группу из этой новости: {news_text}") 
#     return ', '.join([item.strip() for item in tags.split('\n') if item.strip()])
