-- Drop existing table if exists
DROP TABLE IF EXISTS articles CASCADE;

-- Create articles table
CREATE TABLE articles (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    url TEXT,
    source TEXT DEFAULT 'pann.nate.com',
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    images TEXT[] DEFAULT '{}',
    content_length INTEGER DEFAULT 0,
    translated_title TEXT,
    translated_content TEXT,
    translation_status TEXT DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create policy to enable all operations for service role
CREATE POLICY "Enable all operations for service role" 
ON articles 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

-- Create policy to enable read access for authenticated users
CREATE POLICY "Enable read access for authenticated users" 
ON articles 
FOR SELECT 
USING (auth.role() = 'authenticated'); 