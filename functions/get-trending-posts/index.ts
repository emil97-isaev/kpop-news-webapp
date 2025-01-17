import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    console.log('Fetching trending posts...')
    const { data: posts, error } = await supabaseClient
      .from('posts')
      .select('*')
      .order('views', { ascending: false })
      .limit(3)

    if (error) {
      console.error('Error fetching posts:', error)
      throw error
    }

    console.log(`Found ${posts.length} trending posts`)

    // Форматируем посты для карусели
    const formattedPosts = posts.map(post => {
      // Обрабатываем фото-ссылки
      const photoLinks = post.photo_links 
        ? post.photo_links
            .split('https://')
            .filter(Boolean)
            .map(url => {
              const cleanUrl = url.replace(/,\s*$/, '').trim();
              return 'https://' + cleanUrl;
            })
        : [];

      return {
        id: post.id,
        title: post.text?.split('\n')[0] || 'Trending post',
        content: post.text || '',
        photoLinks: photoLinks,
        imageUrl: photoLinks[0] || null,
        createdAt: post.post_datetime,
        stats: {
          views: post.views || 0,
          likes: post.likes || 0,
          comments: post.comments || 0,
          reposts: post.reposts || 0
        }
      };
    });

    return new Response(
      JSON.stringify(formattedPosts),
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