import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Bot } from 'npm:grammy'
import type { KeyboardButton } from 'npm:@grammyjs/types'

console.log('Starting bot initialization...')

// Создаем экземпляр бота
const bot = new Bot('7792285433:AAEPqwhOOl1Jru-eqTUf0xAG7HSESI09_XM')

// Инициализируем бота
await bot.init()
console.log('Bot initialized successfully')

// Создаем клавиатуру с кнопкой для запуска веб-приложения
const webAppUrl = 'https://bsivriajgsginlnuyxny.supabase.co/functions/v1/webapp'
const keyboard = {
  keyboard: [[{
    text: 'Открыть приложение',
    web_app: { url: webAppUrl }
  }]],
  resize_keyboard: true
}

// Обработчик команды /start
bot.command('start', async (ctx) => {
  console.log('Received /start command')
  try {
    await ctx.reply('Привет! Нажми на кнопку ниже, чтобы открыть приложение:', {
      reply_markup: keyboard
    })
    console.log('Sent welcome message with keyboard')
  } catch (error) {
    console.error('Error in /start command:', error)
  }
})

// Обработчик всех сообщений
bot.on('message', async (ctx) => {
  console.log('Received message')
  try {
    if (ctx.message.web_app_data) {
      // Обработка данных от веб-приложения
      console.log('Received web app data:', ctx.message.web_app_data)
      await ctx.reply('Получены данные от веб-приложения: ' + ctx.message.web_app_data.data)
    } else {
      await ctx.reply('Используйте кнопку ниже для открытия приложения:', {
        reply_markup: keyboard
      })
    }
    console.log('Sent reply')
  } catch (error) {
    console.error('Error in message handler:', error)
  }
})

// Основной обработчик запросов
Deno.serve(async (req) => {
  console.log('=== NEW REQUEST ===')
  console.log('Method:', req.method)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))

  if (req.method === 'POST') {
    try {
      const body = await req.text()
      console.log('Received update:', body)
      
      const update = JSON.parse(body)
      await bot.handleUpdate(update)
      
      return new Response('ok', { status: 200 })
    } catch (error) {
      console.error('Error:', error)
      return new Response(JSON.stringify({ error: error.message }), { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      })
    }
  }

  return new Response(JSON.stringify({ status: 'ok' }), { 
    headers: { 'Content-Type': 'application/json' },
    status: 200 
  })
}) 