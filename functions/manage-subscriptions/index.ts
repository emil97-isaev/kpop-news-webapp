// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabaseUrl = 'https://bsivriajgsginlnuyxny.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaXZyaWFqZ3NnaW5sbnV5eG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNjg2OTcsImV4cCI6MjA1MTc0NDY5N30.UJ6L73nUg7U4pgULc57clsY4OygSYeeJk8mv_DekZtw'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const userId = url.searchParams.get('userId')
    const tag = url.searchParams.get('tag')
    const tgData = url.searchParams.get('tg_data')

    if (!action || !userId) {
      throw new Error('Missing required parameters')
    }

    // Преобразуем userId в строку UUID
    const userIdStr = `${userId}`.padStart(32, '0').replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5')
    console.log('Converted userId:', userIdStr)

    // Проверяем данные от Telegram
    if (!tgData) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Telegram data' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // TODO: Добавить проверку валидности tgData
    // В реальном приложении здесь должна быть проверка подписи данных от Telegram

    // Создаем клиент Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)

    let result
    switch (action) {
      case 'list':
        // Получаем подписки вместе с информацией о тегах
        result = await supabase
          .from('user_tag_subscriptions')
          .select(`
            tag_id,
            tags (
              name
            )
          `)
          .eq('user_id', userIdStr)
        break

      case 'subscribe':
        if (!tag) throw new Error('Tag is required for subscribe action')
        
        console.log('Subscribe action:', { userId: userIdStr, tag })
        
        // Сначала находим tag_id по имени тега
        const { data: tagData, error: tagError } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tag)
          .single()

        if (tagError || !tagData) {
          throw new Error('Tag not found')
        }

        console.log('Found tag:', tagData)

        // Добавляем подписку, используя tag_id
        console.log('Creating subscription:', { user_id: userIdStr, tag_id: tagData.id })
        result = await supabase
          .from('user_tag_subscriptions')
          .insert({ 
            user_id: userIdStr, 
            tag_id: tagData.id 
          })
        break

      case 'unsubscribe':
        if (!tag) throw new Error('Tag is required for unsubscribe action')

        // Сначала находим tag_id по имени тега
        const { data: unsubTagData, error: unsubTagError } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tag)
          .single()

        if (unsubTagError || !unsubTagData) {
          throw new Error('Tag not found')
        }

        // Удаляем подписку, используя tag_id
        result = await supabase
          .from('user_tag_subscriptions')
          .delete()
          .eq('user_id', userIdStr)
          .eq('tag_id', unsubTagData.id)
        break

      default:
        throw new Error('Invalid action')
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes('Unauthorized') ? 401 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/manage-subscriptions' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
