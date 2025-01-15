class KpopNewsAPI {
    constructor() {
        // Инициализация Supabase клиента
        this.supabase = supabase.createClient(
            'https://bsivriajgsginlnuyxny.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaXZyaWFqZ3NnaW5sbnV5eG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNjg2OTcsImV4cCI6MjA1MTc0NDY5N30.UJ6L73nUg7U4pgULc57clsY4OygSYeeJk8mv_DekZtw'
        );
        
        // Инициализация Telegram Web App
        this.tg = window.Telegram.WebApp;
    }

    // Получение тегов
    async getTags() {
        const { data, error } = await this.supabase
            .from('tags')
            .select('*')
            .order('name');
        
        if (error) throw error;
        return data;
    }

    // Получение подписок пользователя
    async getUserSubscriptions() {
        const { data, error } = await this.supabase.functions.invoke('manage-subscriptions', {
            body: { action: 'list' }
        });
        
        if (error) throw error;
        return data;
    }

    // Подписка на тег
    async subscribeToTag(tagId) {
        const { data, error } = await this.supabase.functions.invoke('manage-subscriptions', {
            body: { 
                action: 'subscribe',
                tagId 
            }
        });
        
        if (error) throw error;
        return data;
    }

    // Отписка от тега
    async unsubscribeFromTag(tagId) {
        const { data, error } = await this.supabase.functions.invoke('manage-subscriptions', {
            body: { 
                action: 'unsubscribe',
                tagId 
            }
        });
        
        if (error) throw error;
        return data;
    }

    // Получение ленты новостей
    async getFeed(page = 1, limit = 10, tags = []) {
        const { data, error } = await this.supabase.functions.invoke('get-feed', {
            body: { 
                page,
                limit,
                tags 
            }
        });
        
        if (error) throw error;
        return data;
    }

    // Форматирование даты
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        // Меньше часа
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} минут назад`;
        }
        
        // Меньше суток
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} часов назад`;
        }
        
        // Меньше недели
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days} дней назад`;
        }
        
        // Иначе полная дата
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
} 