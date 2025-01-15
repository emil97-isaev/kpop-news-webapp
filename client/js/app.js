class KpopNewsApp {
    constructor() {
        this.api = new KpopNewsAPI();
        this.currentPage = 1;
        this.isLoading = false;
        this.hasMore = true;
        this.selectedTags = new Set();
        
        this.initializeViews();
        this.bindEvents();
        this.loadInitialData();
    }

    initializeViews() {
        this.subscribeView = document.getElementById('subscribeView');
        this.feedView = document.getElementById('feedView');
        this.tagsGrid = document.getElementById('tagsGrid');
        this.feedContent = document.getElementById('feedContent');
        this.tagSearch = document.getElementById('tagSearch');
    }

    bindEvents() {
        // Навигация
        document.getElementById('showFeedBtn').onclick = () => this.showFeed();
        document.getElementById('backToTagsBtn').onclick = () => this.showSubscribe();
        
        // Поиск по тегам
        this.tagSearch.oninput = (e) => this.filterTags(e.target.value);
        
        // Бесконечная прокрутка
        window.onscroll = () => {
            if (this.feedView.classList.contains('hidden')) return;
            
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
                this.loadMorePosts();
            }
        };
    }

    async loadInitialData() {
        try {
            // Получаем теги и подписки
            const [tags, subscriptions] = await Promise.all([
                this.api.getTags(),
                this.api.getUserSubscriptions()
            ]);
            
            // Сохраняем выбранные теги
            subscriptions.forEach(sub => this.selectedTags.add(sub.tag_id));
            
            // Отображаем теги
            this.renderTags(tags);
            
            // Показываем основной интерфейс
            this.api.tg.ready();
            this.api.tg.expand();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Не удалось загрузить данные');
        }
    }

    renderTags(tags) {
        this.tagsGrid.innerHTML = tags.map(tag => `
            <div class="tag-card ${this.selectedTags.has(tag.id) ? 'subscribed' : ''}" 
                 data-tag-id="${tag.id}">
                <span class="tag-name">${tag.name}</span>
                <button class="subscribe-btn" onclick="app.toggleSubscription(${tag.id})">
                    ${this.selectedTags.has(tag.id) ? 'Отписаться' : 'Подписаться'}
                </button>
            </div>
        `).join('');
    }

    async toggleSubscription(tagId) {
        try {
            const card = document.querySelector(`[data-tag-id="${tagId}"]`);
            const isSubscribed = this.selectedTags.has(tagId);
            
            if (isSubscribed) {
                await this.api.unsubscribeFromTag(tagId);
                this.selectedTags.delete(tagId);
                card.classList.remove('subscribed');
            } else {
                await this.api.subscribeToTag(tagId);
                this.selectedTags.add(tagId);
                card.classList.add('subscribed');
            }
            
            const btn = card.querySelector('.subscribe-btn');
            btn.textContent = isSubscribed ? 'Подписаться' : 'Отписаться';
            
        } catch (error) {
            console.error('Error toggling subscription:', error);
            this.showError('Не удалось изменить подписку');
        }
    }

    filterTags(query) {
        const cards = this.tagsGrid.querySelectorAll('.tag-card');
        const normalizedQuery = query.toLowerCase().trim();
        
        cards.forEach(card => {
            const name = card.querySelector('.tag-name').textContent.toLowerCase();
            card.style.display = name.includes(normalizedQuery) ? 'flex' : 'none';
        });
    }

    async showFeed() {
        if (this.selectedTags.size === 0) {
            this.api.tg.showPopup({
                title: 'Выберите теги',
                message: 'Пожалуйста, выберите хотя бы один тег для формирования ленты',
                buttons: [{ type: 'ok' }]
            });
            return;
        }

        try {
            this.currentPage = 1;
            this.hasMore = true;
            this.feedContent.innerHTML = '';
            
            await this.loadPosts();
            
            this.subscribeView.classList.add('hidden');
            this.feedView.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error showing feed:', error);
            this.showError('Не удалось загрузить ленту');
        }
    }

    showSubscribe() {
        this.feedView.classList.add('hidden');
        this.subscribeView.classList.remove('hidden');
    }

    async loadMorePosts() {
        if (this.isLoading || !this.hasMore) return;
        this.currentPage++;
        await this.loadPosts();
    }

    async loadPosts() {
        try {
            this.isLoading = true;
            
            const response = await this.api.getFeed(
                this.currentPage,
                10,
                Array.from(this.selectedTags)
            );
            
            this.hasMore = response.hasMore;
            this.renderPosts(response.data);
            
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showError('Не удалось загрузить посты');
        } finally {
            this.isLoading = false;
        }
    }

    renderPosts(posts) {
        const html = posts.map(post => `
            <div class="post-card">
                <div class="post-author">
                    <div class="post-author-info">
                        <div class="author-name">${post.author}</div>
                        <div class="post-timestamp">${this.api.formatDate(post.published_at)}</div>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                ${post.images && post.images.length > 0 ? `
                    <div class="post-images">
                        ${post.images.map(img => `
                            <img src="${img}" alt="Изображение к посту" loading="lazy">
                        `).join('')}
                    </div>
                ` : ''}
                <div class="post-tags">
                    ${post.article_tags.map(tag => `
                        <span class="post-tag">${tag.tags.name}</span>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        this.feedContent.insertAdjacentHTML('beforeend', html);
    }

    showError(message) {
        this.api.tg.showPopup({
            title: 'Ошибка',
            message: message,
            buttons: [{ type: 'ok' }]
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new KpopNewsApp();
}); 