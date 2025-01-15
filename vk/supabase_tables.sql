-- Create articles table
CREATE TABLE articles (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    url TEXT NOT NULL,
    source TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    images TEXT[] DEFAULT '{}',
    content_length INTEGER DEFAULT 0
);

-- Create comments table
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author TEXT,
    likes INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
); 