import pandas as pd
from datetime import datetime, timedelta
from utils import fetch_top_comments
from config import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def update_comments():
    try:
        # Загрузка данных о постах из Supabase
        posts_response = supabase.table('posts').select('*').execute()
        posts_data = posts_response.data

        if not posts_data:
            print("Таблица постов пуста. Обновление комментариев не требуется.")
            return

        posts_df = pd.DataFrame(posts_data)

        # Фильтруем посты, опубликованные до 2 дней назад
        two_days_ago = (datetime.now() - timedelta(days=2)).date()
        posts_df['post_datetime'] = pd.to_datetime(posts_df['post_datetime'], errors='coerce').dt.date
        target_posts_df = posts_df[posts_df['post_datetime'] >= two_days_ago]

        # Загрузка существующих комментариев из Supabase
        comments_response = supabase.table('comments').select('*').execute()
        existing_comments_data = comments_response.data or []
        existing_comments_df = pd.DataFrame(existing_comments_data)

        comments_data = []
        for _, row in target_posts_df.iterrows():
            comments = fetch_top_comments(row['group_id'], row['post_id'])
            comments_data.extend(comments)

        new_comments_df = pd.DataFrame(comments_data)

        if not existing_comments_df.empty:
            # Удаляем существующие комментарии для обновляемых постов
            target_post_ids = target_posts_df['post_id'].astype(str).tolist()
            target_group_ids = target_posts_df['group_id'].astype(str).tolist()
            existing_comments_df = existing_comments_df[
                ~((existing_comments_df['post_id'].astype(str).isin(target_post_ids)) &
                  (existing_comments_df['group_id'].astype(str).isin(target_group_ids)))
            ]
            # Объединяем с новыми комментариями
            combined_df = pd.concat([existing_comments_df, new_comments_df]).drop_duplicates(subset=['comment_id'])
        else:
            combined_df = new_comments_df

        # Сохранение обновлённых комментариев в Supabase
        comments_to_insert = combined_df.to_dict(orient='records')
        supabase.table('comments').upsert(comments_to_insert).execute()

        print("Комментарии успешно обновлены в Supabase.")

    except Exception as e:
        print(f"Произошла ошибка при обновлении комментариев: {e}")

if __name__ == '__main__':
    update_comments()