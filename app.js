// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Применяем тему Telegram
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor);
document.documentElement.style.setProperty('--tg-theme-text-color', tg.textColor);
document.documentElement.style.setProperty('--tg-theme-button-color', tg.buttonColor);
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.buttonTextColor);

// Проверяем доступность Supabase
if (!window.supabase) {
    console.error('Supabase is not loaded');
    tg.showAlert('Ошибка: Supabase не загружен');
    throw new Error('Supabase is not loaded');
}

// Инициализация Supabase клиента
const supabaseUrl = 'https://bsivriajgsginlnuyxny.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaXZyaWFqZ3NnaW5sbnV5eG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNjg2OTcsImV4cCI6MjA1MTc0NDY5N30.UJ6L73nUg7U4pgULc57clsY4OygSYeeJk8mv_DekZtw';

console.log('Initializing Supabase client...');
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true
    }
});
console.log('Supabase client initialized:', supabase);

// Проверяем соединение с Supabase
async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('posts').select('count').limit(1);
        if (error) throw error;
        console.log('Supabase connection successful');
        return true;
    } catch (error) {
        console.error('Supabase connection error:', error);
        tg.showAlert(`Ошибка подключения к Supabase: ${error.message}`);
        return false;
    }
}

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
const photoModal = document.querySelector('.photo-modal');
const photoModalImage = document.querySelector('.photo-modal-image');
const photoModalClose = document.querySelector('.photo-modal-close');

// Функции для работы с модальным окном
function openPhotoModal(imageUrl) {
    photoModalImage.src = imageUrl;
    photoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    tg.HapticFeedback.impactOccurred('light');
}

function closePhotoModal() {
    photoModal.classList.remove('active');
    document.body.style.overflow = '';
    tg.HapticFeedback.impactOccurred('light');
}

// Обработчики событий для модального окна
photoModalClose.addEventListener('click', closePhotoModal);
photoModal.addEventListener('click', (e) => {
    if (e.target === photoModal) {
        closePhotoModal();
    }
});

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

// Функция для разбора строки с фотографиями
function parsePhotoLinks(photoLinksStr) {
    if (!photoLinksStr) return [];
    
    // Разбиваем строку на части по "https://"
    const parts = photoLinksStr.split('https://');
    
    // Фильтруем и обрабатываем части
    return parts
        .filter(part => part.trim()) // убираем пустые части
        .map(part => {
            // Удаляем запятые в конце строки
            part = part.replace(/,\s*$/, '');
            // Ищем следующее вхождение "https://"
            const nextHttpsIndex = part.indexOf('https://');
            if (nextHttpsIndex !== -1) {
                // Если нашли, берем только до него
                part = part.substring(0, nextHttpsIndex);
            }
            return 'https://' + part.trim();
        });
}

// Функция для форматирования текста
function formatText(text) {
    if (!text) return '';
    // Заменяем \n на <br> для HTML
    return text.split('\n').map(line => line.trim()).join('<br>');
}

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
            const photoLinks = parsePhotoLinks(post.photo_links);
            const photoUrl = photoLinks[0] || '';
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
            const photoLinks = parsePhotoLinks(post.photo_links);
            console.log('Photo links:', photoLinks); // Для отладки

            const postElement = document.createElement('div');
            postElement.className = 'post';
            
            const lines = post.text?.split('\n') || [];
            const title = lines[0] || '';
            const text = lines.slice(1).join('\n') || '';

            postElement.innerHTML = `
                <div class="post-header">
                    <img src="https://via.placeholder.com/40" class="post-avatar" alt="Avatar">
                    <div class="post-meta">
                        <h3 class="post-author">K-POP News</h3>
                        <p class="post-date">${new Date(post.post_datetime).toLocaleDateString('ru-RU')}</p>
                    </div>
                </div>
                <div class="post-text">${formatText(text)}</div>
                ${photoLinks.length > 0 ? `
                    <div class="post-photos">
                        ${photoLinks.map(url => `
                            <img src="${url}" class="post-photo" alt="Post image" loading="lazy" onerror="this.style.display='none'">
                        `).join('')}
                    </div>
                ` : ''}
                <div class="post-footer">
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
                    openPhotoModal(photo.src);
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
document.addEventListener('DOMContentLoaded', async () => {
    // Настраиваем внешний вид под Telegram
    document.body.style.backgroundColor = tg.backgroundColor;
    document.body.style.color = tg.textColor;
    
    // Проверяем подключение к Supabase
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
        tg.showAlert('Не удалось подключиться к базе данных');
        return;
    }
    
    // Загружаем данные
    loadTrendingPosts();
    loadPosts();
}); 