import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = 'https://bsivriajgsginlnuyxny.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaXZyaWFqZ3NnaW5sbnV5eG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg2ODk5NDcsImV4cCI6MjAyNDI2NTk0N30.9YDEN41_K8JjFnhq2wE2KBGqizoKxwQs_gwLH_55t-Q'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    switch (action) {
      case 'getTags':
        const { data: tags, error: tagsError } = await supabase
          .from('tags')
          .select('*')
        
        if (tagsError) throw tagsError
        return new Response(JSON.stringify(tags), {
          headers: { 'Content-Type': 'application/json' }
        })

      case 'getSubscriptions':
        const userId = url.searchParams.get('userId')
        if (!userId) throw new Error('User ID is required')

        const { data: subs, error: subsError } = await supabase
          .from('subscriptions')
          .select('tag_id')
          .eq('user_id', userId)
        
        if (subsError) throw subsError
        return new Response(JSON.stringify(subs), {
          headers: { 'Content-Type': 'application/json' }
        })

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}); 