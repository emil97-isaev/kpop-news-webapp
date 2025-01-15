const express = require('express');
const app = express();

app.get('/', (req, res) => {
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

  res.set('Content-Type', 'text/html');
  res.set('Access-Control-Allow-Origin', '*');
  res.send(html);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000')); 