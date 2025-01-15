import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FUNCTION_URL = 'https://bsivriajgsginlnuyxny.supabase.co/functions/v1/upload-file';
const WEBAPP_DIR = path.join(__dirname, 'webapp');
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaXZyaWFqZ3NnaW5sbnV5eG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNTA2NjE5OCwiZXhwIjoyMDIwNjQyMTk4fQ.Pu_IbLBgHhBqvZwFfLYb-mXmEOiWDhQRhWZhxeNfnTo';

async function uploadFile(filePath, targetPath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('path', targetPath);

    const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`
        },
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to upload ${filePath}: ${error.message}`);
    }

    console.log(`Uploaded ${filePath} to ${targetPath}`);
}

async function uploadDirectory(dir, baseDir = WEBAPP_DIR) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            await uploadDirectory(filePath, baseDir);
        } else {
            const targetPath = path.relative(baseDir, filePath);
            await uploadFile(filePath, targetPath);
        }
    }
}

// Загружаем все файлы
uploadDirectory(WEBAPP_DIR).catch(console.error); 