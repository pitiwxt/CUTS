/**
 * Zocial Tracker - No-API Live Scraper (Playwright + Gemini Vision)
 * Scrapes Instagram, TikTok, and Facebook profiles directly without official APIs.
 */

const { chromium } = require('playwright');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { syncToGoogleSheets } = require('./sheets_client');
const { upsertPostStats } = require('./supabase_client');
require('dotenv').config();

// Ensure Gemini is configured
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY is not set in your .env file.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const TARGETS = {
  instagram: 'https://www.instagram.com/chulatechstartup/',
  tiktok: 'https://www.tiktok.com/@chulatechstartup',
  facebook: 'https://www.facebook.com/CUTechStartup' // Resolved from share URL
};

// Helper: Convert base64 image data for Gemini API
function fileToGenerativePart(filePath) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType: "image/png"
    },
  };
}

// Helper: Extract campaign tag from text
function extractCampaignTag(text) {
  if (!text) return '';
  const match = text.match(/#([A-Za-z0-9\-]+(?:-\d{4})?)/);
  return match ? match[1] : '';
}

// Helper: Calculate ER and VS
function calculateMetrics(reach, likes, comments, shares, saves) {
  const safeReach = reach || 1;
  const er = (((likes + comments + shares + saves) / safeReach) * 100).toFixed(2);
  const vs = ((shares / safeReach) * 100).toFixed(2);
  return {
    engagement_rate: parseFloat(er),
    virality_score: parseFloat(vs)
  };
}

/**
 * Scrape Instagram profile and latest posts
 */
async function scrapeInstagram(page) {
  console.log("\n📸 Scrapes Instagram: chulatechstartup");
  await page.goto(TARGETS.instagram, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(6000); // Wait for images/grid to load

  const tempPath = path.join(__dirname, `screenshot_ig_profile_${Date.now()}.png`);
  await page.screenshot({ path: tempPath });
  console.log(`  → Saved IG profile screenshot: ${tempPath}`);

  // Query Gemini to check if we can see posts and get their IDs/stats
  const imagePart = fileToGenerativePart(tempPath);
  const prompt = `
    Analyze this Instagram profile page screenshot. Extract the latest 3 posts visible in the grid.
    For each post, return:
    1. A short code or identifier like "IG_" + unique part of post link (if you see the post link) or just index number (e.g., "IG_post_1", "IG_post_2").
    2. Post type ("reel" if it has a play icon or view count, otherwise "image" or "carousel").
    3. Estimated views/reach (if visible on thumbnail, e.g. for reels), likes, and comments. If you cannot see views, set views to 0.
    4. Text caption or title visible (estimate).
    
    Return the response as a JSON array ONLY, no markdown tags. Example:
    [
      {"post_id": "IG_post_1", "content_type": "reel", "reach": 1500, "likes": 120, "comments": 15, "caption": "สมัครสมาชิก #Recruiter-2026"},
      {"post_id": "IG_post_2", "content_type": "image", "reach": 0, "likes": 95, "comments": 8, "caption": "AI Workshop #Workshop-AI"}
    ]
  `;

  const result = await model.generateContent([prompt, imagePart]);
  let textResponse = result.response.text().trim();
  textResponse = textResponse.replace(/```json|```/g, '').trim();
  console.log("  → Gemini extracted IG JSON:", textResponse);

  let igPosts = JSON.parse(textResponse);
  
  // Post-process IG data
  const finalPosts = igPosts.map(p => {
    const campaign = extractCampaignTag(p.caption);
    // If reach is 0, estimate reach based on likes + comments * multiplier
    const reach = p.reach || (p.likes * 8 + p.comments * 12) || 100;
    const metrics = calculateMetrics(reach, p.likes, p.comments, 0, 0);
    return {
      post_id: p.post_id.startsWith('IG_') ? p.post_id : `IG_${p.post_id}`,
      platform: 'instagram',
      content_type: p.content_type || 'image',
      campaign_tag: campaign || 'General',
      reach: reach,
      impressions: Math.round(reach * 1.15),
      likes: p.likes || 0,
      comments: p.comments || 0,
      shares: 0,
      saves: 0,
      engagement_rate: metrics.engagement_rate,
      virality_score: metrics.virality_score,
      data_source: 'vision',
      recorded_at: new Date().toISOString().split('T')[0]
    };
  });

  // fs.unlinkSync(tempPath);
  return finalPosts;
}

/**
 * Scrape TikTok profile and latest video view counts
 */
async function scrapeTikTok(page) {
  console.log("\n📸 Scrapes TikTok: chulatechstartup");
  await page.goto(TARGETS.tiktok, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(6000);

  const tempPath = path.join(__dirname, `screenshot_tt_profile_${Date.now()}.png`);
  await page.screenshot({ path: tempPath });
  console.log(`  → Saved TikTok profile screenshot: ${tempPath}`);

  const imagePart = fileToGenerativePart(tempPath);
  const prompt = `
    Analyze this TikTok profile page screenshot. It contains a grid of videos. Extract the latest 3 videos.
    For each video:
    1. Generate a post_id starting with "TT_" (e.g. "TT_video_1", "TT_video_2").
    2. Extract the play/view count visible on the video card thumbnail (e.g. "1.2K" -> 1200, "15.5K" -> 15500, "500" -> 500).
    3. Approximate likes (set to view count * 0.1 if not visible on main profile page, or if visible, extract it).
    4. Text title/caption (estimate).
    
    Return the response as a JSON array ONLY, no markdown tags:
    [
      {"post_id": "TT_video_1", "reach": 15500, "likes": 1550, "comments": 22, "caption": "CTS 2026 #Recruiter-2026"},
      {"post_id": "TT_video_2", "reach": 4200, "likes": 420, "comments": 8, "caption": "Tech Startup"}
    ]
  `;

  const result = await model.generateContent([prompt, imagePart]);
  let textResponse = result.response.text().trim();
  textResponse = textResponse.replace(/```json|```/g, '').trim();
  console.log("  → Gemini extracted TikTok JSON:", textResponse);

  let ttPosts = JSON.parse(textResponse);

  const finalPosts = ttPosts.map(p => {
    const campaign = extractCampaignTag(p.caption);
    const reach = p.reach || 1000;
    const likes = p.likes || Math.round(reach * 0.1);
    const comments = p.comments || Math.round(likes * 0.05);
    const shares = Math.round(likes * 0.15); // Estimate shares based on likes for TikTok
    const metrics = calculateMetrics(reach, likes, comments, shares, 0);

    return {
      post_id: p.post_id.startsWith('TT_') ? p.post_id : `TT_${p.post_id}`,
      platform: 'tiktok',
      content_type: 'video',
      campaign_tag: campaign || 'General',
      reach: reach,
      impressions: Math.round(reach * 1.25),
      likes: likes,
      comments: comments,
      shares: shares,
      saves: 0,
      engagement_rate: metrics.engagement_rate,
      virality_score: metrics.virality_score,
      data_source: 'vision',
      recorded_at: new Date().toISOString().split('T')[0]
    };
  });

  // fs.unlinkSync(tempPath);
  return finalPosts;
}

/**
 * Scrape Facebook Page and latest posts
 */
async function scrapeFacebook(page) {
  console.log("\n📸 Scrapes Facebook: chulatechstartup");
  await page.goto(TARGETS.facebook, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(6000);

  const tempPath = path.join(__dirname, `screenshot_fb_profile_${Date.now()}.png`);
  await page.screenshot({ path: tempPath });
  console.log(`  → Saved Facebook profile screenshot: ${tempPath}`);

  const imagePart = fileToGenerativePart(tempPath);
  const prompt = `
    Analyze this Facebook page screenshot. Extract the latest 2 posts visible.
    For each post:
    1. Generate a post_id starting with "FB_" (e.g. "FB_post_1", "FB_post_2").
    2. Extract likes/reactions count.
    3. Extract comments count.
    4. Extract shares count.
    5. Text description (estimate).
    
    Return the response as a JSON array ONLY, no markdown tags:
    [
      {"post_id": "FB_post_1", "likes": 45, "comments": 5, "shares": 3, "caption": "เวิร์กชอป #Workshop-AI"},
      {"post_id": "FB_post_2", "likes": 88, "comments": 12, "shares": 10, "caption": "cts recruiter"}
    ]
  `;

  const result = await model.generateContent([prompt, imagePart]);
  let textResponse = result.response.text().trim();
  textResponse = textResponse.replace(/```json|```/g, '').trim();
  console.log("  → Gemini extracted FB JSON:", textResponse);

  let fbPosts = JSON.parse(textResponse);

  const finalPosts = fbPosts.map(p => {
    const campaign = extractCampaignTag(p.caption);
    const likes = p.likes || 0;
    const comments = p.comments || 0;
    const shares = p.shares || 0;
    // Estimate reach based on interactions for public FB profiles
    const reach = (likes * 12 + comments * 18 + shares * 30) || 500;
    const metrics = calculateMetrics(reach, likes, comments, shares, 0);

    return {
      post_id: p.post_id.startsWith('FB_') ? p.post_id : `FB_${p.post_id}`,
      platform: 'facebook',
      content_type: 'image',
      campaign_tag: campaign || 'General',
      reach: reach,
      impressions: Math.round(reach * 1.1),
      likes: likes,
      comments: comments,
      shares: shares,
      saves: 0,
      engagement_rate: metrics.engagement_rate,
      virality_score: metrics.virality_score,
      data_source: 'vision',
      recorded_at: new Date().toISOString().split('T')[0]
    };
  });

  // fs.unlinkSync(tempPath);
  return finalPosts;
}

/**
 * Main Orchestrator Run
 */
async function run() {
  console.log("==================================================================");
  console.log("⚡  ZOCIAL TRACKER - LIVE PROFILE SCRAPER (NO API) STARTING     ⚡");
  console.log("==================================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const allScrapedPosts = [];

  try {
    // 1. Scrape Instagram
    try {
      const igStats = await scrapeInstagram(page);
      allScrapedPosts.push(...igStats);
    } catch (err) {
      console.error("❌ Failed to scrape Instagram:", err.message);
    }

    // 2. Scrape TikTok
    try {
      const ttStats = await scrapeTikTok(page);
      allScrapedPosts.push(...ttStats);
    } catch (err) {
      console.error("❌ Failed to scrape TikTok:", err.message);
    }

    // 3. Scrape Facebook
    try {
      const fbStats = await scrapeFacebook(page);
      allScrapedPosts.push(...fbStats);
    } catch (err) {
      console.error("❌ Failed to scrape Facebook:", err.message);
    }

  } finally {
    await browser.close();
  }

  console.log(`\n------------------------------------------------------------------`);
  console.log(`📊 Scraped ${allScrapedPosts.length} posts in total from 3 profiles:`);
  console.table(allScrapedPosts);

  if (allScrapedPosts.length === 0) {
    console.log("⚠️ No data was scraped. Exiting.");
    return;
  }

  // 4. Sync to Google Sheets
  console.log(`\n------------------------------------------------------------------`);
  console.log("💾 Step 2: Syncing scraped data to Google Sheets...");
  try {
    await syncToGoogleSheets(allScrapedPosts);
  } catch (err) {
    console.error("❌ Google Sheets sync failed:", err.message);
  }

  // 5. Sync to Supabase DB
  console.log(`\n------------------------------------------------------------------`);
  console.log("💾 Step 3: Syncing scraped data to Supabase Database...");
  try {
    await upsertPostStats(allScrapedPosts);
  } catch (err) {
    console.error("❌ Supabase DB sync failed:", err.message);
  }

  console.log("\n==================================================================");
  console.log("🎉  ZOCIAL TRACKER - Scraper process completed successfully!      🎉");
  console.log("==================================================================");
}

run().catch(console.error);
