async function loadPosts() {
    if (isLoading) return;
    isLoading = true;

    try {
        const requestBody = {
            page: currentPage,
            limit: postsPerPage
        };
        console.log('Sending request to Edge function with body:', requestBody);
        
        // Вызываем Edge Function
        const response = await fetch('https://bsivriajgsginlnuyxny.supabase.co/functions/v1/get-feed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey
            },
            body: JSON.stringify(requestBody),
            mode: 'cors',
            credentials: 'omit'
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const data = await response.json();
        console.log('Received data:', data);

        const { posts, hasMore, total } = data;

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
    } finally {
        isLoading = false;
    }
} 