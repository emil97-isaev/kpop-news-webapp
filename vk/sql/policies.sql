-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON articles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON articles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON comments;

-- Enable RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create new policies for articles
CREATE POLICY "Enable all operations for service role" ON articles
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable read access for authenticated users" ON articles
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create new policies for comments
CREATE POLICY "Enable all operations for service role" ON comments
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable read access for authenticated users" ON comments
    FOR SELECT
    USING (auth.role() = 'authenticated'); 