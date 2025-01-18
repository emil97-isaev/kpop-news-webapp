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
    photoModal.classList.remove('zoomed');
    photoModalImage.classList.remove('zoomed');
    photoModalImage.style.transform = '';
    document.body.style.overflow = '';
    tg.HapticFeedback.impactOccurred('light');
}

// Обработчики событий для модального окна
photoModalClose.addEventListener('click', closePhotoModal);
photoModal.addEventListener('click', (e) => {
    if (e.target === photoModal || e.target === photoModal.querySelector('.photo-modal-content')) {
        closePhotoModal();
    }
});

// Добавляем обработчик двойного клика для увеличения
photoModalImage.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    const isZoomed = photoModalImage.classList.contains('zoomed');
    
    if (!isZoomed) {
        photoModalImage.classList.add('zoomed');
        photoModal.classList.add('zoomed');
        photoModalImage.style.transform = 'scale(1.5)';
        currentScale = 1.5;
    } else {
        photoModalImage.classList.remove('zoomed');
        photoModal.classList.remove('zoomed');
        photoModalImage.style.transform = '';
        currentScale = 1;
    }
    
    tg.HapticFeedback.impactOccurred('medium');
});

// Добавляем поддержку жестов масштабирования
let initialDistance = 0;
let currentScale = 1;
let lastScale = 1;
const MIN_SCALE = 1;
const MAX_SCALE = 2.5;

photoModalImage.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
        lastScale = currentScale;
    }
});

photoModalImage.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
        
        if (initialDistance > 0) {
            const scaleDiff = currentDistance / initialDistance;
            const newScale = Math.min(Math.max(lastScale * scaleDiff, MIN_SCALE), MAX_SCALE);
            
            currentScale = newScale;
            photoModalImage.style.transform = `scale(${newScale})`;
            
            if (newScale > 1) {
                photoModalImage.classList.add('zoomed');
                photoModal.classList.add('zoomed');
            } else {
                photoModalImage.classList.remove('zoomed');
                photoModal.classList.remove('zoomed');
            }
        }
    }
});

photoModalImage.addEventListener('touchend', () => {
    if (currentScale <= 1.1) {
        currentScale = 1;
        lastScale = 1;
        photoModalImage.style.transform = '';
        photoModalImage.classList.remove('zoomed');
        photoModal.classList.remove('zoomed');
    } else {
        lastScale = currentScale;
    }
    initialDistance = 0;
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

// Загрузка постов для ленты
async function loadPosts() {
    if (isLoading) return;
    isLoading = true;
    loadMoreBtn.style.display = 'none';
    loadMoreBtn.textContent = 'Загрузка...';

    try {
        // Сначала проверяем общее количество постов
        const { count } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true });

        // Загружаем текущую страницу постов
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .order('post_datetime', { ascending: false })
            .range((currentPage - 1) * postsPerPage, (currentPage * postsPerPage) - 1);

        if (error) {
            console.error('Supabase error:', error);
            tg.showAlert(`Ошибка при загрузке постов: ${error.message}`);
            return;
        }

        if (!posts || posts.length === 0) {
            if (currentPage === 1) {
                postsContainer.innerHTML = '<div class="text-center mt-4">Нет доступных постов</div>';
            }
            return;
        }

        // Обрабатываем каждый пост
        for (const post of posts) {
            console.log('Post data:', {
                id: post.id,
                post_id: post.post_id,
                group_id: post.group_id,
                // Выводим все поля поста для проверки
                ...post
            });

            const photoLinks = parsePhotoLinks(post.photo_links);
            const postElement = document.createElement('div');
            postElement.className = 'post';
            
            const lines = post.text?.split('\n') || [];
            const title = lines[0] || '';
            const text = lines.slice(1).join('\n') || '';

            // Загружаем комментарии для текущего поста
            const comments = await loadCommentsForPost(post.post_id, post.group_id);
            console.log('Comments loaded:', comments); // Для отладки

            const commentsHtml = comments.length > 0 
                ? `
                    <div class="post-comments">
                        <div class="comments-header">
                            <div class="comments-header-left">
                                <span class="comments-icon">💬</span>
                                <span class="comments-title">Комментарии из VK</span>
                            </div>
                        </div>
                        ${comments[0] ? `
                            <div class="comment">
                                <div class="comment-avatar">👤</div>
                                <div class="comment-content">
                                    <div class="comment-text">${comments[0].text || ''}</div>
                                    <div class="comment-likes">❤️ ${comments[0].likes || 0}</div>
                                </div>
                            </div>
                        ` : ''}
                        ${comments.length > 1 ? `
                            <div class="comments-expand" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; cursor: pointer;">
                                <span>Показать ещё ${comments.length - 1} комментариев</span>
                                <span class="comments-toggle">▼</span>
                            </div>
                            <div class="comments-list collapsed" style="max-height: 0;">
                                ${comments.slice(1).map(comment => `
                                    <div class="comment">
                                        <div class="comment-avatar">👤</div>
                                        <div class="comment-content">
                                            <div class="comment-text">${comment.text || ''}</div>
                                            <div class="comment-likes">❤️ ${comment.likes || 0}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `
                : '';

            postElement.innerHTML = `
                <div class="post-header">
                    <h2 class="post-title">${title}</h2>
                    ${formatText(text)}
                </div>
                ${photoLinks.length > 0 ? `
                    <div class="post-photos ${photoLinks.length === 1 ? 'single' : 'multiple'}">
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
                ${commentsHtml}
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
                            `Показать ещё ${comments.length - 1} комментариев`;
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

            postsContainer.appendChild(postElement);
        }

        currentPage++;
        
        // Показываем кнопку "Загрузить еще" только если есть еще посты
        const hasMorePosts = count > currentPage * postsPerPage;
        loadMoreBtn.style.display = hasMorePosts ? 'block' : 'none';

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