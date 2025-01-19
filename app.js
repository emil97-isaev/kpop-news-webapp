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
            body: JSON.stringify(requestBody)
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

        // ... rest of the code ...
    } catch (error) {
        console.error('Error loading posts:', error);
    } finally {
        isLoading = false;
    }
} 