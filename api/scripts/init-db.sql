-- api/scripts/init-db.sql
-- Optional: Initial database setup
-- This runs automatically when the container first starts

-- Create extensions if needed (will be used in EPIC 2)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- Set timezone
SET timezone = 'UTC';

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'Database initialized successfully';
END $$;
