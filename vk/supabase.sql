-- Enable RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON articles;
DROP POLICY IF EXISTS "Enable insert for service role" ON articles;
DROP POLICY IF EXISTS "Enable read access for all users" ON comments;
DROP POLICY IF EXISTS "Enable insert for service role" ON comments;

-- Create policies for articles
CREATE POLICY "Enable read access for all users" 
ON articles FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for service role" 
ON articles FOR INSERT 
WITH CHECK (true);

-- Create policies for comments
CREATE POLICY "Enable read access for all users" 
ON comments FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for service role" 
ON comments FOR INSERT 
WITH CHECK (true); 