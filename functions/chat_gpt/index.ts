import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

serve(async (req) => {
  try {
    // Извлекаем JSON из входного запроса
    const { query, prompt } = await req.json();

    // Проверяем входные параметры
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Получаем API-ключ OpenAI из переменных окружения
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key is not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Выполняем запрос к OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: query },
        ],
      }),
    });

    // Проверяем, был ли запрос успешным
    if (!openaiResponse.ok) {
      // Получаем подробную ошибку из ответа OpenAI
      const error = await openaiResponse.json();
      
      // Логируем подробности ошибки для диагностики
      console.error("OpenAI API Error:", error);

      return new Response(
        JSON.stringify({ 
          error: error.message || "Error while calling OpenAI API",
          details: error // Добавляем подробности ошибки в ответ
        }),
        {
          status: openaiResponse.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Парсим и возвращаем ответ OpenAI
    const result = await openaiResponse.json();
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    // Обрабатываем ошибки
    console.error("Internal Server Error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
