-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_tag_subscriptions table
CREATE TABLE IF NOT EXISTS user_tag_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    tag TEXT NOT NULL REFERENCES tags(name) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, tag)
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create post_tags table for many-to-many relationship
CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    tag TEXT REFERENCES tags(name) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag)
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for faster retrieval
CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS post_comments_user_id_idx ON post_comments(user_id);

-- Insert initial tags
INSERT INTO tags (name) VALUES
    ('BTS'),
    ('BLACKPINK'),
    ('EXO'),
    ('TWICE'),
    ('Red Velvet'),
    ('NCT'),
    ('SEVENTEEN'),
    ('ENHYPEN'),
    ('NewJeans'),
    ('LE SSERAFIM')
ON CONFLICT (name) DO NOTHING;

-- Insert sample posts
INSERT INTO posts (title, content, image_url, source_url) VALUES
    (
        'BTS Jungkook''s "Standing Next to You" Remix with Usher',
        'BTS'' Jungkook has released a remix of his hit song "Standing Next to You" featuring R&B legend Usher. The collaboration brings together two generations of musical talent.',
        'https://example.com/jungkook-usher.jpg',
        'https://example.com/news/bts-jungkook-usher-remix'
    ),
    (
        'BLACKPINK''s Lisa Sets New Record',
        'BLACKPINK member Lisa has set a new YouTube record with her solo music video "MONEY" reaching 1 billion views, becoming the first K-pop solo artist to achieve this milestone.',
        'https://example.com/lisa-money.jpg',
        'https://example.com/news/blackpink-lisa-record'
    ),
    (
        'NewJeans Announces World Tour',
        'Rising K-pop group NewJeans has announced their first world tour, "Get Up," which will span multiple continents throughout 2024.',
        'https://example.com/newjeans-tour.jpg',
        'https://example.com/news/newjeans-world-tour'
    );

-- Link posts to tags
INSERT INTO post_tags (post_id, tag) VALUES
    (1, 'BTS'),
    (2, 'BLACKPINK'),
    (3, 'NewJeans'); 