import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
</head>
<body>
    <h1>Test Page</h1>
    <p>If you see this rendered as a web page (not as text), everything works!</p>
    
    <script>
        let tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
    </script>
</body>
</html>`;

  const headers = new Headers();
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');

  return new Response(html, {
    status: 200,
    headers
  });
}); 