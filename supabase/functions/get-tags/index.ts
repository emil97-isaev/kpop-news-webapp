// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabaseUrl = 'https://bsivriajgsginlnuyxny.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaXZyaWFqZ3NnaW5sbnV5eG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNjg2OTcsImV4cCI6MjA1MTc0NDY5N30.UJ6L73nUg7U4pgULc57clsY4OygSYeeJk8mv_DekZtw'
const supabase = createClient(supabaseUrl, supabaseKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const tgData = url.searchParams.get('tg_data')

    console.log('Request parameters:', {
      userId,
      tgData,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries())
    })

    if (!userId) {
      console.error('Missing userId parameter')
      throw new Error('Missing required parameter: userId')
    }

    // Проверяем данные от Telegram
    if (!tgData) {
      console.error('Missing tg_data parameter')
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Telegram data' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Получаем все теги
    console.log('Fetching tags from database...')
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    if (!data) {
      console.log('No tags found in database')
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log('Found tags:', data)

    // Форматируем теги для фронтенда
    const formattedTags = data.map(tag => ({
      id: tag.id,
      name: tag.name
    }))

    console.log('Formatted tags:', formattedTags)

    return new Response(
      JSON.stringify(formattedTags),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    )
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

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/get-tags' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

*/ 