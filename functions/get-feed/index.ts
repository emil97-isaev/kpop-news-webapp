// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    console.log('Request body type:', typeof req.body);
    
    let bodyText;
    try {
      bodyText = await req.text();
      console.log('Raw request body:', bodyText);
    } catch (e) {
      console.error('Error reading request body:', e);
      throw new Error('Failed to read request body');
    }
    
    if (!bodyText || bodyText === '') {
      console.log('Empty body detected, using default values');
      bodyText = JSON.stringify({ page: 1, limit: 10, tags: [] });
    }

    // Парсим JSON
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      throw new Error('Invalid JSON in request body');
    }

    // Получаем параметры из тела запроса
    const { page = 1, limit = 10, tags = [] } = body;
    console.log('Parsed parameters:', { page, limit, tags });

    const offset = (page - 1) * limit;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    let query = supabaseClient
      .from('posts')
      .select('*', { count: 'exact' })
      .order('post_datetime', { ascending: false })
      .range(offset, offset + limit - 1)

    // Применяем фильтр по тегам если они указаны
    if (tags && tags.length > 0) {
      const tagFilters = tags.map(tag => `main_entity_group.ilike.%${tag}%`)
      query = query.or(tagFilters.join(','))
    }

    const { data: posts, error, count } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      throw error
    }

    console.log('Raw posts from database:', posts)
    console.log('Posts type:', typeof posts)
    console.log('Is array:', Array.isArray(posts))

    // Проверяем и форматируем данные
    const formattedPosts = Array.isArray(posts) ? posts : [];
    
    console.log(`Found ${formattedPosts.length} posts, total: ${count}`)

    // Определяем, есть ли еще посты
    const hasMore = count ? offset + limit < count : false

    const response = {
      data: formattedPosts,
      hasMore,
      total: count
    };

    console.log('Sending response:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-feed' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
