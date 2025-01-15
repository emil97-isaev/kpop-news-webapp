# K-pop News Telegram Web App

Telegram Web App для просмотра новостей о K-pop артистах и группах.

## Технологии

- Frontend: HTML, CSS, JavaScript
- Backend: Supabase Functions (Edge Functions на Deno)
- База данных: Supabase PostgreSQL
- Деплой: GitHub Pages + Supabase

## Функционал

- Просмотр ленты новостей
- Фильтрация по тегам (группам/артистам)
- Комментарии к постам
- Подписки на теги
- Адаптивный дизайн

## Установка и запуск

1. Клонировать репозиторий:
```bash
git clone [URL репозитория]
```

2. Установить Supabase CLI:
```bash
npm install -g supabase
```

3. Запустить локально:
```bash
supabase start
```

4. Для деплоя:
```bash
supabase deploy
```

## Структура проекта

- `/client` - Frontend часть
- `/supabase/functions` - Edge Functions
- `/docs` - Документация 