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
const postsPerPage = 7;
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
    
    // Сбрасываем значения при открытии
    scale = 1;
    lastScale = 1;
    translateX = 0;
    translateY = 0;
    photoModalImage.style.transform = '';
    
    tg.HapticFeedback.impactOccurred('light');
}

function closePhotoModal() {
    photoModal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Сбрасываем значения при закрытии
    scale = 1;
    lastScale = 1;
    translateX = 0;
    translateY = 0;
    photoModalImage.style.transform = '';
    
    tg.HapticFeedback.impactOccurred('light');
}

// Переменные для управления масштабированием
let scale = 1;
let lastScale = 1;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;
let isPointerDown = false;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

// Обработчики событий для модального окна
photoModalClose.addEventListener('click', closePhotoModal);
photoModal.addEventListener('click', (e) => {
    if (e.target === photoModal || e.target === photoModal.querySelector('.photo-modal-content')) {
        closePhotoModal();
    }
});

// Обработчики для масштабирования
photoModalImage.addEventListener('pointerdown', startGesture);
photoModalImage.addEventListener('pointermove', moveGesture);
photoModalImage.addEventListener('pointerup', endGesture);
photoModalImage.addEventListener('pointercancel', endGesture);

// Начало жеста
function startGesture(e) {
    e.preventDefault();
    isPointerDown = true;
    photoModalImage.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
}

// Перемещение и масштабирование
function moveGesture(e) {
    if (!isPointerDown) return;
    
    if (e.pointerType === 'touch' && e.touches && e.touches.length === 2) {
        // Масштабирование двумя пальцами
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
            touch1.clientX - touch2.clientX,
            touch1.clientY - touch2.clientY
        );
        
        if (startDistance > 0) {
            const newScale = Math.min(Math.max(lastScale * (currentDistance / startDistance), MIN_SCALE), MAX_SCALE);
            scale = newScale;
            updateTransform();
        }
        startDistance = currentDistance;
    } else if (scale > 1) {
        // Перемещение при увеличенном масштабе
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // Ограничиваем перемещение
        const maxTranslateX = (scale - 1) * photoModalImage.width / 2;
        const maxTranslateY = (scale - 1) * photoModalImage.height / 2;
        
        translateX = Math.min(Math.max(translateX + deltaX, -maxTranslateX), maxTranslateX);
        translateY = Math.min(Math.max(translateY + deltaY, -maxTranslateY), maxTranslateY);
        
        startX = e.clientX;
        startY = e.clientY;
        
        updateTransform();
    }
}

// Завершение жеста
function endGesture() {
    isPointerDown = false;
    startDistance = 0;
    lastScale = scale;
    
    if (scale <= 1.1) {
        // Возвращаем к исходному состоянию
        scale = 1;
        lastScale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
    }
}

// Обновление трансформации
function updateTransform() {
    photoModalImage.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    
    if (scale > 1) {
        photoModalImage.classList.add('zoomed');
        photoModal.classList.add('zoomed');
    } else {
        photoModalImage.classList.remove('zoomed');
        photoModal.classList.remove('zoomed');
    }
}

// Двойной клик для быстрого масштабирования
photoModalImage.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (scale === 1) {
        scale = 1.5;
        // Центрируем увеличение по точке клика
        const rect = photoModalImage.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        translateX = (x - rect.width / 2) * 0.5;
        translateY = (y - rect.height / 2) * 0.5;
    } else {
        scale = 1;
        translateX = 0;
        translateY = 0;
    }
    
    lastScale = scale;
    updateTransform();
    tg.HapticFeedback.impactOccurred('medium');
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
    const maxLength = 100;
    if (text.length <= maxLength) {
        return `<div class="post-text">${text}</div>`;
    }

    const visibleText = text.slice(0, maxLength).trim();
    const hiddenText = text.slice(maxLength).trim();

    return `
        <div class="post-text">
            ${visibleText}<span class="text-full" style="display: none;">${hiddenText}</span>
            <button class="show-more">Показать ещё</button>
        </div>
    `;
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
            document.querySelector('.banner-carousel').style.display = 'none';
            return;
        }

        const carouselInner = document.querySelector('.carousel-inner');
        carouselInner.innerHTML = posts.map((post, index) => {
            const photoLinks = parsePhotoLinks(post.photo_links);
            const photoUrl = photoLinks[0] || '';
            const lines = post.text?.split('\n') || [];
            const title = lines[0] || 'Trending post';
            
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

        // Показываем карусель
        document.querySelector('.banner-carousel').style.display = 'block';

    } catch (error) {
        console.error('Error loading trending posts:', error);
        tg.showAlert(`Ошибка при загрузке трендовых постов: ${error.message}`);
        document.querySelector('.banner-carousel').style.display = 'none';
    }
}

// Загрузка комментариев для поста
async function loadCommentsForPost(postId, groupId) {
    try {
        console.log('Loading comments for:', { postId, groupId }); // Логируем входные данные

        // Сначала проверим структуру данных в таблице comments_vk
        const { data: sampleComments, error: sampleError } = await supabase
            .from('comments_vk')
            .select('*')
            .limit(1);
        
        console.log('Sample comment structure:', sampleComments); // Смотрим структуру комментария

        const { data: comments, error } = await supabase
            .from('comments_vk')
            .select('*')
            .eq('group_id', groupId)
            .eq('post_id', postId)
            .order('likes', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error loading comments:', error);
            return [];
        }

        console.log(`Comments for post ${postId} from group ${groupId}:`, comments); // Для отладки
        return comments || [];
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

// Добавляем Intersection Observer для отслеживания прокрутки
const observerTarget = document.createElement('div');
observerTarget.id = 'observer-target';
postsContainer.after(observerTarget);

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !isLoading) {
            loadPosts();
        }
    });
}, {
    rootMargin: '100px'
});

observer.observe(observerTarget);

// Модифицируем функцию loadPosts
async function loadPosts() {
    if (isLoading) return;
    isLoading = true;

    try {
        // Вызываем Edge Function
        const { data: response, error } = await supabase.functions.invoke('get-feed', {
            body: { page: currentPage, limit: postsPerPage },
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (error) {
            console.error('Edge function error:', error);
            tg.showAlert(`Ошибка при загрузке постов: ${error.message}`);
            return;
        }

        const { posts, hasMore, total } = response;

        if (!posts || posts.length === 0) {
            if (currentPage === 1) {
                postsContainer.innerHTML = '<div class="text-center mt-4">Нет доступных постов</div>';
            }
            observer.unobserve(observerTarget);
            return;
        }

        // Создаем фрагмент для всех постов
        const fragment = document.createDocumentFragment();

        // Обрабатываем все посты
        for (const post of posts) {
            const postElement = document.createElement('div');
            postElement.className = 'post';
            
            postElement.innerHTML = `
                <div class="post-header">
                    <h2 class="post-title">${post.title}</h2>
                    ${formatText(post.text)}
                </div>
                ${post.photoLinks.length > 0 ? `
                    <div class="post-photos ${post.photoLinks.length === 1 ? 'single' : 'multiple'}">
                        ${post.photoLinks.map(url => `
                            <img src="${url}" class="post-photo" alt="Post image" loading="lazy" onerror="this.style.display='none'">
                        `).join('')}
                    </div>
                ` : ''}
                <div class="post-footer">
                    <span class="post-stat">👁 ${post.stats.views}</span>
                    <span class="post-stat">❤️ ${post.stats.likes}</span>
                    <span class="post-stat">💬 ${post.stats.comments}</span>
                    <span class="post-stat">🔄 ${post.stats.reposts}</span>
                </div>
                ${post.comments.length > 0 ? `
                    <div class="post-comments">
                        <div class="comments-header">
                            <div class="comments-header-left">
                                <span class="comments-icon">💬</span>
                                <span class="comments-title">Комментарии из VK</span>
                            </div>
                        </div>
                        ${post.comments[0] ? `
                            <div class="comment">
                                <div class="comment-avatar">👤</div>
                                <div class="comment-content">
                                    <div class="comment-text">${post.comments[0].text}</div>
                                    <div class="comment-likes">❤️ ${post.comments[0].likes}</div>
                                </div>
                            </div>
                        ` : ''}
                        ${post.comments.length > 1 ? `
                            <div class="comments-expand" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; cursor: pointer;">
                                <span>Показать ещё ${post.comments.length - 1} комментариев</span>
                                <span class="comments-toggle">▼</span>
                            </div>
                            <div class="comments-list collapsed" style="max-height: 0;">
                                ${post.comments.slice(1).map(comment => `
                                    <div class="comment">
                                        <div class="comment-avatar">👤</div>
                                        <div class="comment-content">
                                            <div class="comment-text">${comment.text}</div>
                                            <div class="comment-likes">❤️ ${comment.likes}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            `;

            // Добавляем обработчик клика для просмотра фото
            const photos = postElement.querySelectorAll('.post-photo');
            photos.forEach(photo => {
                photo.addEventListener('click', () => {
                    openPhotoModal(photo.src);
                });
            });

            // Добавляем обработчики событий для комментариев
            const commentsExpand = postElement.querySelector('.comments-expand');
            const commentsList = postElement.querySelector('.comments-list');
            const commentsToggle = postElement.querySelector('.comments-toggle');
            
            if (commentsExpand && commentsList && commentsToggle) {
                commentsExpand.addEventListener('click', () => {
                    const isExpanded = !commentsList.classList.contains('collapsed');
                    
                    if (isExpanded) {
                        commentsList.style.maxHeight = '0';
                        commentsList.classList.add('collapsed');
                        commentsToggle.style.transform = 'rotate(0deg)';
                        commentsExpand.querySelector('span:first-child').textContent = 
                            `Показать ещё ${post.comments.length - 1} комментариев`;
                    } else {
                        commentsList.style.maxHeight = `${commentsList.scrollHeight}px`;
                        commentsList.classList.remove('collapsed');
                        commentsToggle.style.transform = 'rotate(180deg)';
                        commentsExpand.querySelector('span:first-child').textContent = 'Скрыть комментарии';
                    }
                    
                    tg.HapticFeedback.impactOccurred('light');
                });
            }

            // Обновляем обработчик для разворачивания текста
            const showMoreBtn = postElement.querySelector('.show-more');
            if (showMoreBtn) {
                showMoreBtn.addEventListener('click', () => {
                    const postText = showMoreBtn.closest('.post-text');
                    const fullText = postText.querySelector('.text-full');
                    
                    fullText.style.display = 'inline';
                    showMoreBtn.style.display = 'none';
                    
                    tg.HapticFeedback.impactOccurred('light');
                });
            }

            fragment.appendChild(postElement);
        }

        // Добавляем все посты одним действием
        postsContainer.appendChild(fragment);

        currentPage++;
        
        // Если больше нет постов, прекращаем наблюдение
        if (!hasMore) {
            observer.unobserve(observerTarget);
        }

    } catch (error) {
        console.error('Error loading posts:', error);
        tg.showAlert(`Ошибка при загрузке постов: ${error.message}`);
    } finally {
        isLoading = false;
    }
}

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