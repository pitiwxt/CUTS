const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Local SQLite DB file path for offline testing/fallback
const LOCAL_DB_PATH = path.join(__dirname, 'local_tracker.db');

/**
 * Initializes the Supabase client
 */
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    console.log("⚠️ SUPABASE_URL or SUPABASE_SERVICE_KEY not found. Supabase operations will run in LOCAL SQLITE fallback mode.");
    return null;
  }

  try {
    return createClient(url, serviceKey, {
      auth: {
        persistSession: false
      },
      realtime: {
        transport: WebSocket
      }
    });
  } catch (error) {
    console.error("❌ Supabase client initialization failed:", error.message);
    return null;
  }
}

/**
 * Initializes the local SQLite DB for fallback testing
 */
function initLocalSQLite() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(LOCAL_DB_PATH, (err) => {
      if (err) return reject(err);
    });

    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS post_stats (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          platform TEXT NOT NULL,
          content_type TEXT,
          campaign_tag TEXT,
          reach INTEGER DEFAULT 0,
          impressions INTEGER DEFAULT 0,
          likes INTEGER DEFAULT 0,
          comments INTEGER DEFAULT 0,
          shares INTEGER DEFAULT 0,
          saves INTEGER DEFAULT 0,
          engagement_rate REAL,
          virality_score REAL,
          data_source TEXT NOT NULL,
          recorded_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, recorded_at)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve(db);
      });
    });
  });
}

/**
 * Saves a single row or batch of rows into the database (Supabase or SQLite)
 * @param {Array<object>} rows 
 */
async function upsertPostStats(rows) {
  const supabase = getSupabaseClient();

  if (supabase) {
    console.log("💾 Upserting records into Supabase PostgreSQL...");
    try {
      const { data, error } = await supabase
        .from('post_stats')
        .upsert(rows, { onConflict: 'post_id,recorded_at' });

      if (error) throw error;
      console.log(`✅ Supabase Upsert completed successfully. (${rows.length} rows)`);
      return true;
    } catch (error) {
      console.error("❌ Supabase Upsert failed:", error.message);
      throw error;
    }
  } else {
    console.log("💾 Syncing records into local SQLite database...");
    try {
      const db = await initLocalSQLite();
      const insertStmt = db.prepare(`
        INSERT INTO post_stats (
          id, post_id, platform, content_type, campaign_tag,
          reach, impressions, likes, comments, shares, saves,
          engagement_rate, virality_score, data_source, recorded_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
        ON CONFLICT(post_id, recorded_at) DO UPDATE SET
          reach = excluded.reach,
          impressions = excluded.impressions,
          likes = excluded.likes,
          comments = excluded.comments,
          shares = excluded.shares,
          saves = excluded.saves,
          engagement_rate = excluded.engagement_rate,
          virality_score = excluded.virality_score,
          data_source = excluded.data_source
      `);

      for (const row of rows) {
        // Generate pseudo-uuid if not provided
        const uuid = row.id || `local_${Math.random().toString(36).substr(2, 9)}`;
        insertStmt.run(
          uuid,
          row.post_id,
          row.platform,
          row.content_type,
          row.campaign_tag || '',
          row.reach,
          row.impressions || 0,
          row.likes,
          row.comments,
          row.shares,
          row.saves,
          row.engagement_rate,
          row.virality_score,
          row.data_source,
          row.recorded_at
        );
      }

      insertStmt.finalize();
      db.close();
      console.log(`✅ Local SQLite Sync completed successfully. (${rows.length} rows)`);
      return true;
    } catch (error) {
      console.error("❌ Local SQLite Sync failed:", error.message);
      throw error;
    }
  }
}

module.exports = {
  upsertPostStats
};
