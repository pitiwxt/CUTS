-- SQL Schema for Zocial Tracker
-- Run this in the Supabase SQL Editor to create the required table and indexes.

-- Create table to store daily content metrics
CREATE TABLE IF NOT EXISTS post_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL,                  -- e.g., "IG_2601", "TT_2602"
  platform TEXT NOT NULL,                 -- 'instagram' | 'tiktok' | 'facebook'
  content_type TEXT,                      -- 'reel' | 'video' | 'image' | 'story'
  campaign_tag TEXT,                      -- e.g., 'Recruiter-2026', 'Workshop-AI'
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),           -- Calculated by the system before insertion
  virality_score DECIMAL(5,2),            -- Calculated by the system before insertion
  data_source TEXT NOT NULL,              -- 'api' | 'vision' | 'mcp' | 'apify' | 'manual'
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate rows for the same post ID on the same recorded date
  CONSTRAINT unique_post_date UNIQUE (post_id, recorded_at)
);

-- Optimize queries by creating indices on common filter columns
CREATE INDEX IF NOT EXISTS idx_post_stats_campaign ON post_stats(campaign_tag);
CREATE INDEX IF NOT EXISTS idx_post_stats_platform ON post_stats(platform);
CREATE INDEX IF NOT EXISTS idx_post_stats_date ON post_stats(recorded_at);

-- Enable Row Level Security (RLS)
ALTER TABLE post_stats ENABLE ROW LEVEL SECURITY;

-- Allow full read/write access to authenticated service role users
CREATE POLICY "service role full access" ON post_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
