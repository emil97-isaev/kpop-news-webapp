// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Создаем Supabase клиент
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  try {
    // Проверяем метод
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405 }
      )
    }

    // Получаем файл и путь из запроса
    const formData = await req.formData()
    const file = formData.get('file')
    const path = formData.get('path')

    if (!file || !path) {
      return new Response(
        JSON.stringify({ error: 'File and path are required' }), 
        { status: 400 }
      )
    }

    // Загружаем файл
    const { data, error } = await supabaseClient
      .storage
      .from('webapp')
      .upload(path.toString(), file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    return new Response(
      JSON.stringify({ data }), 
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 