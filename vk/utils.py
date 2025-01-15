import requests
import time
from config import ACCESS_TOKEN, API_VERSION

def get_post_stats(group_id, post_id):
    url = 'https://api.vk.com/method/wall.getById'
    params = {
        'access_token': ACCESS_TOKEN,
        'v': API_VERSION,
        'posts': f'-{group_id}_{post_id}'
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    if 'response' not in data or not data['response']:
        return {'views': 0, 'likes': 0, 'comments': 0, 'reposts': 0}
    post = data['response'][0]
    return {
        'views': post.get('views', {}).get('count', 0),
        'likes': post.get('likes', {}).get('count', 0),
        'comments': post.get('comments', {}).get('count', 0),
        'reposts': post.get('reposts', {}).get('count', 0)
    }

def fetch_top_comments(group_id, post_id, count=5):
    url = 'https://api.vk.com/method/wall.getComments'
    params = {
        'access_token': ACCESS_TOKEN,
        'v': API_VERSION,
        'owner_id': f'-{group_id}',
        'post_id': post_id,
        'need_likes': 1,
        'count': 100,
        'sort': 'asc'
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    if 'response' not in data or 'items' not in data['response']:
        return []
    comments = data['response']['items']
    top_comments = sorted(comments, key=lambda x: x.get('likes', {}).get('count', 0), reverse=True)[:count]
    return [{
        'group_id': group_id,
        'post_id': post_id,
        'comment_id': comment.get('id'),
        'text': comment.get('text', ''),
        'likes': comment.get('likes', {}).get('count', 0)
    } for comment in top_comments]

def throttle_requests():
    time.sleep(0.33)
