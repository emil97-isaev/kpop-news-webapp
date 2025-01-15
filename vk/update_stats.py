import pandas as pd
import os
from utils import get_post_stats
from config import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def update_post_stats():
    try:
        # Загрузка текущих данных о постах из Supabase
        response = supabase.table('posts').select('*').execute()
        posts_data = response.data

        if not posts_data:
            print("Таблица постов пуста. Обновление статистики не требуется.")
            return

        # Обновление статистики для каждого поста
        updated_stats = []
        for post in posts_data:
            post_id = post["post_id"]
            group_id = post["group_id"]
            stats = get_post_stats(group_id, post_id)
            if stats:
                updated_stats.append({
                    "id": post["id"],  # Используем уникальный идентификатор записи в Supabase
                    "views": stats["views"],
                    "likes": stats["likes"],
                    "comments": stats["comments"],
                    "reposts": stats["reposts"]
                })
            else:
                updated_stats.append({
                    "id": post["id"],
                    "views": post["views"],
                    "likes": post["likes"],
                    "comments": post["comments"],
                    "reposts": post["reposts"]
                })  # Если запрос не удался, оставляем старые значения

        # Обновление записей в Supabase
        for stat in updated_stats:
            supabase.table('posts').update({
                "views": stat["views"],
                "likes": stat["likes"],
                "comments": stat["comments"],
                "reposts": stat["reposts"]
            }).eq("id", stat["id"]).execute()

        print("Статистика постов успешно обновлена в Supabase.")

    except Exception as e:
        print(f"Произошла ошибка при обновлении статистики постов: {e}")

if __name__ == "__main__":
    update_post_stats()