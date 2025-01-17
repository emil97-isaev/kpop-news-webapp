// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Применяем тему Telegram
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor);
document.documentElement.style.setProperty('--tg-theme-text-color', tg.textColor);
document.documentElement.style.setProperty('--tg-theme-button-color', tg.buttonColor);
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.buttonTextColor);

// Инициализация Supabase клиента
const supabaseUrl = 'https://bsivriajgsginlnuyxny.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaXZyaWFqZ3NnaW5sbnV5eG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNjg2OTcsImV4cCI6MjA1MTc0NDY5N30.UJ6L73nUg7U4pgULc57clsY4OygSYeeJk8mv_DekZtw';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true
    }
});

// Состояние приложения
let currentPage = 1;
const postsPerPage = 10;
let isLoading = false;

// DOM элементы
const feedScreen = document.getElementById('feed-screen');
const trendsScreen = document.getElementById('trends-screen');
const postsContainer = document.getElementById('posts-feed');
const loadMoreBtn = document.getElementById('load-more');
const navLinks = document.querySelectorAll('.nav-link');

// Переключение экранов
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const screen = link.dataset.screen;
        
        // Обновляем активную вкладку
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Показываем нужный экран
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`${screen}-screen`).classList.add('active');

        // Уведомляем Telegram о смене вкладки
        tg.HapticFeedback.impactOccurred('light');
    });
});

// Загрузка трендовых постов для карусели
async function loadTrendingPosts() {
    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .order('views', { ascending: false })
            .limit(3);

        if (error) {
            console.error('Supabase error:', error);
            tg.showAlert(`Ошибка при загрузке трендовых постов: ${error.message}`);
            return;
        }

        if (!posts || posts.length === 0) {
            console.log('No trending posts found');
            return;
        }

        const carouselInner = document.querySelector('.carousel-inner');
        carouselInner.innerHTML = posts.map((post, index) => {
            const photoUrl = post.photo_links?.split(',')[0]?.trim() || '';
            const title = post.text?.split('\n')[0] || 'Trending post';
            
            return `
                <div class="carousel-item ${index === 0 ? 'active' : ''}" 
                     style="background-image: url('${photoUrl}')">
                    <div class="carousel-caption">
                        <h5>${title}</h5>
                        <div class="post-stats">
                            <span class="post-stat">👁 ${post.views || 0}</span>
                            <span class="post-stat">❤️ ${post.likes || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading trending posts:', error);
        tg.showAlert(`Ошибка при загрузке трендовых постов: ${error.message}`);
    }
}

// Загрузка постов для ленты
async function loadPosts() {
    if (isLoading) return;
    isLoading = true;
    loadMoreBtn.textContent = 'Загрузка...';

    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .order('post_datetime', { ascending: false })
            .range((currentPage - 1) * postsPerPage, currentPage * postsPerPage - 1);

        if (error) {
            console.error('Supabase error:', error);
            tg.showAlert(`Ошибка при загрузке постов: ${error.message}`);
            return;
        }

        if (!posts || posts.length === 0) {
            loadMoreBtn.style.display = 'none';
            if (currentPage === 1) {
                postsContainer.innerHTML = '<div class="text-center mt-4">Нет доступных постов</div>';
            }
            return;
        }

        posts.forEach(post => {
            const photoLinks = post.photo_links 
                ? post.photo_links
                    .split(',')
                    .map(url => url.trim())
                    .filter(url => url)
                : [];

            const postElement = document.createElement('div');
            postElement.className = 'post-card';
            
            const lines = post.text?.split('\n') || [];
            const title = lines[0] || '';
            const text = lines.slice(1).join('\n') || '';

            postElement.innerHTML = `
                <div class="post-header">
                    <h2 class="post-title">${title}</h2>
                    <div class="post-text">${text}</div>
                </div>
                ${photoLinks.length > 0 ? `
                    <div class="post-photos ${photoLinks.length === 1 ? 'single' : 'multiple'}">
                        ${photoLinks.map(url => `
                            <img src="${url}" class="post-photo" alt="Post image" loading="lazy">
                        `).join('')}
                    </div>
                ` : ''}
                <div class="post-stats">
                    <span class="post-stat">👁 ${post.views || 0}</span>
                    <span class="post-stat">❤️ ${post.likes || 0}</span>
                    <span class="post-stat">💬 ${post.comments || 0}</span>
                    <span class="post-stat">🔄 ${post.reposts || 0}</span>
                </div>
            `;

            // Добавляем обработчик клика для просмотра фото
            const photos = postElement.querySelectorAll('.post-photo');
            photos.forEach((photo, index) => {
                photo.addEventListener('click', () => {
                    tg.showImage(photo.src);
                    tg.HapticFeedback.impactOccurred('light');
                });
            });

            postsContainer.appendChild(postElement);
        });

        currentPage++;
        
        if (posts.length < postsPerPage) {
            loadMoreBtn.style.display = 'none';
        }

    } catch (error) {
        console.error('Error loading posts:', error);
        tg.showAlert(`Ошибка при загрузке постов: ${error.message}`);
    } finally {
        isLoading = false;
        loadMoreBtn.textContent = 'Загрузить еще';
    }
}

// Обработчик кнопки "Загрузить еще"
loadMoreBtn.addEventListener('click', () => {
    loadPosts();
    tg.HapticFeedback.impactOccurred('light');
});

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Настраиваем внешний вид под Telegram
    document.body.style.backgroundColor = tg.backgroundColor;
    document.body.style.color = tg.textColor;
    
    // Загружаем данные
    loadTrendingPosts();
    loadPosts();
}); 