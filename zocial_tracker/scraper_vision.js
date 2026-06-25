const { chromium } = require('playwright');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Gemini Client
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

/**
 * Simulates login to Instagram if credentials are provided.
 * In a real automated setting, handle 2FA or cookie session caching.
 */
async function loginInstagram(page) {
  const username = process.env.META_USERNAME;
  const password = process.env.META_PASSWORD;
  
  if (!username || !password) {
    console.log("⚠️ No META_USERNAME or META_PASSWORD provided. Running scraper without logging in (Public pages only).");
    return;
  }

  try {
    console.log("🔐 Navigating to Instagram login page...");
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    
    console.log("✍️ Entering credentials...");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for landing dashboard navigation
    console.log("⏳ Waiting for login confirmation...");
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
    
    // Handle "Not Now" dialog prompts
    try {
      await page.click('button:has-text("Not Now")', { timeout: 5000 });
    } catch (e) {
      // Ignored if modal not present
    }
    console.log("🔓 Login completed successfully.");
  } catch (error) {
    console.error("❌ Instagram login failed:", error.message);
    console.log("🔄 Continuing session as guest...");
  }
}

/**
 * Navigates to a post, captures screenshot, and queries Gemini Vision OCR
 */
async function screenshotAndExtract(page, postUrl, postId) {
  console.log(`📸 Processing post: ${postId} (${postUrl})`);
  
  try {
    await page.goto(postUrl, { waitUntil: 'networkidle', timeout: 30000 });
    // Let dynamic canvases or videos load fully
    await page.waitForTimeout(3000);

    const tempFilename = `screenshot_${postId}_${Date.now()}.png`;
    const tempPath = path.join(__dirname, tempFilename);
    
    console.log(`💾 Capturing page screenshot to: ${tempPath}`);
    await page.screenshot({ path: tempPath, fullPage: false });
    
    // Check if file was written
    if (!fs.existsSync(tempPath)) {
      throw new Error("Failed to write screenshot file.");
    }
    
    console.log("🧠 Sending screenshot to Gemini Vision for OCR...");
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const imageData = fs.readFileSync(tempPath);
    const base64Image = imageData.toString('base64');
    
    const prompt = `
      You are an expert data entry assistant. Analyze this screenshot of a social media post (or post insights page) and extract the statistics as JSON.
      Return ONLY a raw JSON block with the following keys and numbers. Do not include markdown code block notation (e.g. do not write \`\`\`json).
      
      {
        "likes": number,
        "comments": number,
        "reach": number (estimate or set to 0 if not visible),
        "impressions": number (estimate or set to 0 if not visible),
        "shares": number (estimate or set to 0 if not visible),
        "saves": number (estimate or set to 0 if not visible)
      }
      
      If a metric is missing, set its value to 0. Do not write text or explanations, just the raw JSON object.
    `;
    
    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/png', data: base64Image } }
    ]);
    
    let responseText = result.response.text().trim();
    
    // Clean code fences if Gemini added them despite instructions
    responseText = responseText.replace(/```json|```/g, '').trim();
    
    console.log("⚙️ Raw response received from Gemini:", responseText);
    
    const stats = JSON.parse(responseText);
    
    // Clean up temporary file
    fs.unlinkSync(tempPath);
    
    return {
      post_id: postId,
      reach: parseInt(stats.reach) || 0,
      impressions: parseInt(stats.impressions) || 0,
      likes: parseInt(stats.likes) || 0,
      comments: parseInt(stats.comments) || 0,
      shares: parseInt(stats.shares) || 0,
      saves: parseInt(stats.saves) || 0,
      data_source: 'vision'
    };
  } catch (error) {
    console.error(`❌ Failed to extract statistics for ${postId}:`, error.message);
    throw error;
  }
}

/**
 * Main Scraper Entry Point
 * @param {Array<{id: string, url: string}>} posts
 */
async function runVisionScraper(posts) {
  console.log("🚀 Initializing Playwright Scraper context...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  
  const results = [];
  try {
    await loginInstagram(page);
    
    for (const post of posts) {
      try {
        const stats = await screenshotAndExtract(page, post.url, post.id);
        results.push(stats);
      } catch (err) {
        console.error(`Skipping post ${post.id} due to extraction failure.`);
      }
    }
  } finally {
    console.log("🔌 Closing browser session.");
    await browser.close();
  }
  
  return results;
}

module.exports = { runVisionScraper };
