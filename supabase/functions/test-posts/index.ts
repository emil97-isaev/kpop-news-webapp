import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabaseUrl = 'https://bsivriajgsginlnuyxny.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaXZyaWFqZ3NnaW5sbnV5eG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNjg2OTcsImV4cCI6MjA1MTc0NDY5N30.UJ6L73nUg7U4pgULc57clsY4OygSYeeJk8mv_DekZtw'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Сначала получим все посты для анализа структуры
    const { data: allPosts, error: allPostsError } = await supabase
      .from('posts')
      .select('*')
      .limit(5)

    if (allPostsError) {
      console.error('Error fetching all posts:', allPostsError)
      throw allPostsError
    }

    // Подробно логируем структуру первого поста
    if (allPosts && allPosts.length > 0) {
      const firstPost = allPosts[0];
      console.log('First post full structure:', {
        columns: Object.keys(firstPost),
        values: firstPost
      });
    }
    
    // Тестовый запрос для NewJeans
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .ilike('main_entity_group', '%NewJeans%')
      .order('post_datetime', { ascending: false })

    if (postsError) {
      console.error('Error fetching NewJeans posts:', postsError)
      throw postsError
    }

    console.log('Found NewJeans posts:', posts?.length || 0)
    if (posts && posts.length > 0) {
      console.log('First NewJeans post:', {
        id: posts[0].id,
        title: posts[0].title,
        main_entity_group: posts[0].main_entity_group,
        post_datetime: posts[0].post_datetime,
        all_columns: Object.keys(posts[0])
      })
    }

    return new Response(JSON.stringify({
      table_structure: allPosts.length > 0 ? Object.keys(allPosts[0]) : [],
      newjeans_posts_count: posts?.length || 0,
      newjeans_posts: posts?.map(p => ({
        id: p.id,
        title: p.title,
        main_entity_group: p.main_entity_group,
        post_datetime: p.post_datetime
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}) 