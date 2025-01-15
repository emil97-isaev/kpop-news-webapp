import pandas as pd
from datetime import datetime, timedelta
import re
from utils import throttle_requests
from config import ACCESS_TOKEN, API_VERSION, GROUPS, SUPABASE_URL, SUPABASE_KEY, PROMT_CATEGORY_NEWS, PROMT_TAGS_NEWS
import requests
from chat_gpt import call_supabase_function_chat_gpt
from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_posts_last_day(group_id, hashtag_filter=None):
    url = 'https://api.vk.com/method/wall.get'
    one_day_ago = int((datetime.now() - timedelta(days=1, hours=2)).timestamp())
    params = {
        'access_token': ACCESS_TOKEN,
        'v': API_VERSION,
        'owner_id': f'-{group_id}',
        'count': 100
    }
    all_posts = []
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    #print(data)
    posts = data.get('response', {}).get('items', [])
    for post in posts:
        if post['date'] >= one_day_ago and \
            (not hashtag_filter or hashtag_filter in post['text']) and \
            'copy_history' not in post and \
            'admin' not in post.get('text').lower() and \
            'adm_' not in post.get('text').lower() and \
            'adv' not in post.get('text').lower():
                all_posts.append(post)

    #params['offset'] += 100
    #throttle_requests()
    return all_posts

def filter_existing_posts(posts):
    try:
        response = supabase.table('posts').select('post_id').execute()
        existing_post_ids = set(item['post_id'] for item in response.data)
    except Exception as e:
        print(f"Произошла ошибка при обращении к Supabase: {e}")
        existing_post_ids = set()

    # Фильтруем новые посты, исключая те, которые уже есть в таблице
    new_posts = [post for post in posts if post['id'] not in existing_post_ids]
    return new_posts


def save_posts_to_supabase(posts):
    data = []
    for post in posts:
        group_id = str(post.get('owner_id', '')).lstrip('-')
        post_id = post.get('id')
        text = post.get('text', '')
        views = post.get('views', {}).get('count', 0)
        likes = post.get('likes', {}).get('count', 0)
        comments = post.get('comments', {}).get('count', 0)
        reposts = post.get('reposts', {}).get('count', 0)
        post_datetime = datetime.fromtimestamp(post.get('date')).strftime('%Y-%m-%d %H:%M:%S')  # Преобразование даты
        photo_links = ', '.join([
            max(attachment['photo']['sizes'], key=lambda x: x['width'])['url']
            for attachment in post.get('attachments', []) if attachment['type'] == 'photo'
        ]) if 'attachments' in post else ''
        hashtags = ', '.join(re.findall(r'#\w+', text))

        category = call_supabase_function_chat_gpt({"query": f'Определи категорию для этой новости: {text}', "prompt": PROMT_CATEGORY_NEWS})
        category = int(category['choices'][0]['message']['content'])
        main_entity_group = call_supabase_function_chat_gpt({"query": f'Выдели личность и группу из этой новости: {text}', "prompt": PROMT_TAGS_NEWS})
        main_entity_group = ', '.join([item.strip() for item in main_entity_group['choices'][0]['message']['content'].split('\n') if item.strip()])

        data.append({
            "group_id": group_id,
            "post_id": post_id,
            "text": text,
            "views": views,
            "likes": likes,
            "comments": comments,
            "reposts": reposts,
            "post_datetime": post_datetime,
            "photo_links": photo_links,
            "hashtags": hashtags,
            "category": category,
            "main_entity_group": main_entity_group
        })

    # Сохранение данных в таблицу Supabase
    try:
        supabase.table('posts').insert(data).execute()
        print("Данные успешно сохранены в Supabase.")
    except Exception as e:
        print(f"Произошла ошибка при сохранении данных в Supabase: {e}")


if __name__ == '__main__':
    for group_id, hashtag_filter in GROUPS.items():
        posts = get_posts_last_day(group_id, hashtag_filter)

        new_posts = filter_existing_posts(posts)

        if new_posts:
            save_posts_to_supabase(new_posts)
