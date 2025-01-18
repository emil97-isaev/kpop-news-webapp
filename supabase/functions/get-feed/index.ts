// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://emil97-isaev.github.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

// Функция для загрузки комментариев поста
async function loadCommentsForPost(supabaseClient, postId, groupId) {
  try {
    const { data: comments, error } = await supabaseClient
      .from('comments_vk')
      .select('*')
      .eq('group_id', groupId)
      .eq('post_id', postId)
      .order('likes', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error loading comments:', error);
      return [];
    }

    return comments || [];
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Функция для форматирования поста
function formatPost(post, comments) {
  // Парсим фото-ссылки
  const photoLinks = post.photo_links 
    ? post.photo_links
        .split('https://')
        .filter(Boolean)
        .map(url => {
          const cleanUrl = url.replace(/,\s*$/, '').trim();
          return 'https://' + cleanUrl;
        })
    : [];

  // Разделяем текст на заголовок и содержимое
  const lines = post.text?.split('\n') || [];
  const title = lines[0] || '';
  const text = lines.slice(1).join('\n') || '';

  // Форматируем комментарии
  const formattedComments = comments.map(comment => ({
    text: comment.text || '',
    likes: comment.likes || 0
  }));

  return {
    id: post.id,
    post_id: post.post_id,
    group_id: post.group_id,
    title,
    text,
    photoLinks,
    stats: {
      views: post.views || 0,
      likes: post.likes || 0,
      comments: post.comments || 0,
      reposts: post.reposts || 0
    },
    comments: formattedComments,
    post_datetime: post.post_datetime
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Получаем параметры из запроса
    const { page = 1, limit = 7 } = await req.json();
    const offset = (page - 1) * limit;

    // Инициализируем Supabase клиент
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Получаем общее количество постов
    const { count } = await supabaseClient
      .from('posts')
      .select('*', { count: 'exact', head: true });

    // Загружаем посты
    const { data: posts, error } = await supabaseClient
      .from('posts')
      .select('*')
      .order('post_datetime', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }

    // Загружаем комментарии для каждого поста
    const formattedPosts = await Promise.all(
      posts.map(async (post) => {
        const comments = await loadCommentsForPost(supabaseClient, post.post_id, post.group_id);
        return formatPost(post, comments);
      })
    );

    // Определяем, есть ли ещё посты
    const hasMore = count ? offset + limit < count : false;

    const response = {
      posts: formattedPosts,
      hasMore,
      total: count
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 