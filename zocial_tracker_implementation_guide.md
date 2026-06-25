# Zocial Tracker — Implementation Guide (Marketing Pipeline)
## คู่มือสำหรับ AI Agent: สร้าง Pipeline ดึงข้อมูล → เก็บ → แสดงผล Looker Studio

---

## ภาพรวม Pipeline

```
Meta/TikTok API
       ↓ (Tier 1)
   n8n Workflow  →→ ถ้าล้มเหลว →→  Playwright + Gemini Vision (Tier 2a)
       ↓                                      หรือ MCP Browser Agent (Tier 2b)
       ↓                          ถ้าล้มเหลวอีก → Apify Scraper (Tier 3)
       ↓
 Google Sheets (Operational Buffer)
       ↓ (sync ทุกคืน อัตโนมัติผ่าน n8n)
 Supabase PostgreSQL (Analytics Storage)
       ↓
 Looker Studio Dashboard
```

---

## STEP 0 — เตรียม Accounts และ API Keys ที่ต้องล็อกอิน

### 0-A: Meta Graph API

1. ไปที่ https://developers.facebook.com → สร้าง App ใหม่ เลือก type = "Business"
2. เพิ่ม Product: **Instagram Graph API** และ **Pages API**
3. ใน App Dashboard → Settings → Basic → คัดลอก **App ID** และ **App Secret**
4. ไปที่ Tools → **Graph API Explorer**
   - เลือก App ที่สร้าง
   - กด "Generate Access Token" → เลือก permissions:
     - `instagram_basic`
     - `instagram_manage_insights`
     - `pages_read_engagement`
     - `pages_show_list`
   - คัดลอก **User Access Token** (อายุ 60 วัน)
5. แปลงเป็น **Long-Lived Token** (อายุ 60 วัน → ไม่หมด):
   ```
   GET https://graph.facebook.com/v19.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id={APP_ID}
     &client_secret={APP_SECRET}
     &fb_exchange_token={SHORT_LIVED_TOKEN}
   ```
6. ดึง **Instagram Business Account ID**:
   ```
   GET https://graph.facebook.com/v19.0/me/accounts?access_token={TOKEN}
   ```
   จะได้ Page ID → แล้วดึง IG ID:
   ```
   GET https://graph.facebook.com/v19.0/{PAGE_ID}?fields=instagram_business_account&access_token={TOKEN}
   ```
7. บันทึก: `META_ACCESS_TOKEN`, `IG_BUSINESS_ACCOUNT_ID`

---

### 0-B: TikTok API

1. ไปที่ https://developers.tiktok.com → สมัคร Developer Account
2. สร้าง App → เลือก Product: **Research API** (สำหรับ public data) หรือ **Content Posting API**
3. กรอก App details → รอ approval (1-3 วัน)
4. เมื่อ approved → ดึง **Client Key** และ **Client Secret**
5. สำหรับ Business Account ใช้ **TikTok Business API**:
   - https://business-api.tiktok.com
   - สร้าง Business Access Token ผ่าน OAuth 2.0
6. บันทึก: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_ACCESS_TOKEN`

> ⚠️ **หมายเหตุ**: TikTok API สำหรับ insights จำเป็นต้องใช้ TikTok Business Center account ที่ผูกกับ TikTok for Business หาก API ไม่ผ่านให้ข้ามไป Tier 2 (Playwright) ได้เลย

---

### 0-C: Supabase

1. ไปที่ https://supabase.com → Sign Up / Login ด้วย GitHub
2. กด "New Project" → ตั้งชื่อ `zocial-tracker` → เลือก region ใกล้ที่สุด (Singapore)
3. ตั้ง Database Password → บันทึกไว้
4. เมื่อ project พร้อม → ไปที่ Settings → API:
   - คัดลอก **Project URL** (รูปแบบ: `https://xxxx.supabase.co`)
   - คัดลอก **anon public key** และ **service_role key**
5. บันทึก: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

---

### 0-D: Google Sheets + Service Account

1. ไปที่ https://console.cloud.google.com → สร้าง Project ใหม่ชื่อ `zocial-tracker`
2. Enable APIs:
   - Google Sheets API
   - Google Drive API
3. ไปที่ IAM & Admin → Service Accounts → Create Service Account
   - ชื่อ: `zocial-tracker-bot`
   - Role: Editor
4. คลิก Service Account ที่สร้าง → Keys → Add Key → JSON → Download
5. เปิดไฟล์ JSON → คัดลอก `client_email` (รูปแบบ: `zocial-tracker-bot@project.iam.gserviceaccount.com`)
6. สร้าง Google Sheet ใหม่ → Share → ใส่ `client_email` ข้างบน → Editor
7. คัดลอก **Sheet ID** จาก URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
8. บันทึก: ไฟล์ `service_account.json`, `GOOGLE_SHEET_ID`

---

### 0-E: Gemini API (สำหรับ Vision fallback)

1. ไปที่ https://aistudio.google.com → Sign In ด้วย Google Account
2. คลิก "Get API Key" → Create API Key in new project
3. คัดลอก API Key
4. บันทึก: `GEMINI_API_KEY`

---

### 0-F: Apify (สำหรับ Tier 3 fallback)

1. ไปที่ https://apify.com → Sign Up
2. ไปที่ Settings → Integrations → API tokens → Create token
3. บันทึก: `APIFY_TOKEN`

---

### 0-G: n8n

**ตัวเลือก A — Self-hosted (แนะนำสำหรับ free):**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```
เข้าที่ http://localhost:5678 → สร้าง account

**ตัวเลือก B — Cloud:**
ไปที่ https://n8n.io → Start for free (500 executions/month)

---

## STEP 1 — สร้างโครงสร้างฐานข้อมูลใน Supabase

ไปที่ Supabase Dashboard → SQL Editor → รัน SQL ต่อไปนี้:

```sql
-- ตารางหลักเก็บสถิติโพสต์
CREATE TABLE post_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL,              -- เช่น "IG_2601"
  platform TEXT NOT NULL,             -- 'instagram' | 'tiktok' | 'facebook'
  content_type TEXT,                  -- 'reel' | 'video' | 'image' | 'story'
  campaign_tag TEXT,                  -- เช่น 'Recruiter-2026'
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),       -- คำนวณโดย n8n ก่อนบันทึก
  virality_score DECIMAL(5,2),
  data_source TEXT,                   -- 'api' | 'vision' | 'mcp' | 'apify'
  recorded_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index สำหรับ query เร็ว
CREATE INDEX idx_post_stats_campaign ON post_stats(campaign_tag);
CREATE INDEX idx_post_stats_platform ON post_stats(platform);
CREATE INDEX idx_post_stats_date ON post_stats(recorded_at);

-- Enable Row Level Security (อนุญาต service role อ่านเขียนได้)
ALTER TABLE post_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON post_stats
  USING (true) WITH CHECK (true);
```

---

## STEP 2 — สร้างโครงสร้าง Google Sheet

สร้าง Sheet ชื่อ **"Daily Stats"** มี columns ดังนี้ (row 1 เป็น header):

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| post_id | platform | content_type | campaign_tag | reach | impressions | likes | comments | shares | saves | data_source | recorded_at |

---

## STEP 3 — สร้าง n8n Workflow (Tier 1: Meta API)

### Workflow: `Daily_Meta_Stats_Pull`

**Nodes ที่ต้องสร้าง (ต่อกันตามลำดับ):**

```
[Schedule Trigger] → [HTTP Request: Meta API] → [Code: คำนวณ ER/VS] → [Google Sheets: บันทึก] → [Supabase: Upsert]
```

#### Node 1: Schedule Trigger
- Type: `Schedule Trigger`
- Cron Expression: `0 2 * * *` (02:00 น. ทุกวัน)

#### Node 2: HTTP Request — Meta Graph API
- Type: `HTTP Request`
- Method: `GET`
- URL:
```
https://graph.facebook.com/v19.0/{{$env.IG_BUSINESS_ACCOUNT_ID}}/media
```
- Query Parameters:
  - `fields`: `id,media_type,timestamp,like_count,comments_count,reach,impressions,saved,shares`
  - `since`: `={{$now.minus({days: 1}).startOf('day').toISO()}}`
  - `until`: `={{$now.startOf('day').toISO()}}`
  - `access_token`: `={{$env.META_ACCESS_TOKEN}}`

#### Node 3: Code Node — คำนวณ metrics
- Type: `Code`
- Language: JavaScript
```javascript
const items = $input.all();
const results = [];

for (const item of items) {
  const data = item.json.data || [];
  
  for (const post of data) {
    const likes = post.like_count || 0;
    const comments = post.comments_count || 0;
    const shares = post.shares?.count || 0;
    const saves = post.saved || 0;
    const reach = post.reach || 1; // หลีกเลี่ยง division by zero
    
    const engagementRate = ((likes + comments + shares + saves) / reach * 100).toFixed(2);
    const viralityScore = (shares / reach * 100).toFixed(2);
    
    results.push({
      json: {
        post_id: `IG_${post.id.slice(-4)}`,
        platform: 'instagram',
        content_type: post.media_type?.toLowerCase() || 'unknown',
        campaign_tag: '', // จะเติมจาก caption ในขั้นตอนถัดไป
        reach: reach,
        impressions: post.impressions || 0,
        likes: likes,
        comments: comments,
        shares: shares,
        saves: saves,
        engagement_rate: parseFloat(engagementRate),
        virality_score: parseFloat(viralityScore),
        data_source: 'api',
        recorded_at: new Date().toISOString().split('T')[0]
      }
    });
  }
}

return results;
```

#### Node 4: Google Sheets — บันทึก
- Type: `Google Sheets`
- Operation: `Append or Update`
- Sheet ID: `{{$env.GOOGLE_SHEET_ID}}`
- Sheet Name: `Daily Stats`
- Column to Match On: `post_id`
- Mapping: map แต่ละ field ให้ตรงกับ column ใน Sheet

#### Node 5: Supabase — Upsert
- Type: `HTTP Request` (Supabase REST API)
- Method: `POST`
- URL: `{{$env.SUPABASE_URL}}/rest/v1/post_stats`
- Headers:
  - `apikey`: `{{$env.SUPABASE_SERVICE_KEY}}`
  - `Authorization`: `Bearer {{$env.SUPABASE_SERVICE_KEY}}`
  - `Content-Type`: `application/json`
  - `Prefer`: `resolution=merge-duplicates`
- Body: `={{$json}}` (ส่ง object จาก Code node)

#### Node 6: Error Handler (ต่อจาก Node 2)
- Type: `IF`
- Condition: ตรวจว่า HTTP status code ≠ 200 หรือ response มี `error` field
- True branch → ไปที่ **Tier 2 Workflow** (Playwright)

---

## STEP 4 — Tier 2 Fallback: Playwright + Gemini Vision

**ใช้เมื่อ:** Meta/TikTok API ล้มเหลวหรือไม่มีสิทธิ์

### ติดตั้ง Dependencies

```bash
npm init -y
npm install playwright @google/generative-ai dotenv
npx playwright install chromium
```

### สร้างไฟล์ `.env`

```env
GEMINI_API_KEY=your_key_here
META_USERNAME=your_fb_email
META_PASSWORD=your_fb_password
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your_key_here
GOOGLE_SHEET_ID=your_sheet_id
```

### สร้างไฟล์ `scraper_vision.js`

```javascript
const { chromium } = require('playwright');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function loginInstagram(page) {
  await page.goto('https://www.instagram.com/accounts/login/');
  await page.waitForSelector('input[name="username"]');
  
  // กรอก username และ password
  await page.fill('input[name="username"]', process.env.META_USERNAME);
  await page.fill('input[name="password"]', process.env.META_PASSWORD);
  await page.click('button[type="submit"]');
  
  // รอ login สำเร็จ
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  
  // ข้าม popup "Save Login Info" ถ้ามี
  try {
    await page.click('button:has-text("Not Now")', { timeout: 5000 });
  } catch (e) { /* ไม่มี popup ก็ข้ามไป */ }
}

async function screenshotAndExtract(page, postUrl) {
  await page.goto(postUrl);
  await page.waitForLoadState('networkidle');
  
  // ถ่ายภาพหน้าจอ
  const screenshotPath = `screenshot_${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  // ส่งให้ Gemini อ่าน
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const imageData = fs.readFileSync(screenshotPath);
  const base64Image = imageData.toString('base64');
  
  const prompt = `
    จากภาพหน้าจอ Instagram post นี้ ดึงข้อมูลสถิติต่อไปนี้ออกมาเป็น JSON:
    {
      "likes": number,
      "comments": number,
      "reach": number (ถ้าเห็น),
      "impressions": number (ถ้าเห็น),
      "shares": number (ถ้าเห็น),
      "saves": number (ถ้าเห็น)
    }
    ถ้าไม่เห็นตัวเลขไหนให้ใส่ 0 ตอบเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่น
  `;
  
  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: 'image/png', data: base64Image } }
  ]);
  
  const responseText = result.response.text();
  const stats = JSON.parse(responseText.replace(/```json|```/g, '').trim());
  
  // ลบไฟล์ screenshot
  fs.unlinkSync(screenshotPath);
  
  return { ...stats, data_source: 'vision' };
}

// Main function
async function runVisionScraper(postUrls) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await loginInstagram(page);
  
  const results = [];
  for (const url of postUrls) {
    try {
      const stats = await screenshotAndExtract(page, url);
      results.push(stats);
    } catch (e) {
      console.error(`Failed to extract from ${url}:`, e.message);
    }
  }
  
  await browser.close();
  return results;
}

module.exports = { runVisionScraper };
```

---

## STEP 5 — Tier 3 Fallback: Apify

**ใช้เมื่อ:** Playwright login ล้มเหลว (เช่น Instagram block automation)

### n8n HTTP Request Node — เรียก Apify

- Method: `POST`
- URL: `https://api.apify.com/v2/acts/apify~instagram-post-scraper/runs`
- Headers:
  - `Authorization`: `Bearer {{$env.APIFY_TOKEN}}`
  - `Content-Type`: `application/json`
- Body:
```json
{
  "directUrls": ["https://www.instagram.com/p/POST_ID/"],
  "resultsType": "posts",
  "resultsLimit": 50
}
```

รอผล:
```
GET https://api.apify.com/v2/acts/apify~instagram-post-scraper/runs/last/dataset/items
  ?token={{$env.APIFY_TOKEN}}
```

---

## STEP 6 — Sync Google Sheets → Supabase (ทุกคืน)

สร้าง n8n Workflow ที่สอง: `Nightly_Sheets_to_Supabase_Sync`

```
[Schedule: 23:00] → [Google Sheets: Read All Rows] → [Code: Filter rows ที่ยังไม่ sync] → [Supabase: Batch Upsert]
```

#### Code Node — Batch Upsert
```javascript
const rows = $input.all();

// กรอง row ที่มีข้อมูลครบ
const validRows = rows
  .filter(r => r.json.post_id && r.json.recorded_at)
  .map(r => ({
    post_id: r.json.post_id,
    platform: r.json.platform,
    content_type: r.json.content_type,
    campaign_tag: r.json.campaign_tag || '',
    reach: parseInt(r.json.reach) || 0,
    impressions: parseInt(r.json.impressions) || 0,
    likes: parseInt(r.json.likes) || 0,
    comments: parseInt(r.json.comments) || 0,
    shares: parseInt(r.json.shares) || 0,
    saves: parseInt(r.json.saves) || 0,
    engagement_rate: parseFloat(r.json.engagement_rate) || 0,
    virality_score: parseFloat(r.json.virality_score) || 0,
    data_source: r.json.data_source || 'manual',
    recorded_at: r.json.recorded_at
  }));

return [{ json: { rows: validRows } }];
```

#### HTTP Request Node — Supabase Batch Insert
- Method: `POST`
- URL: `{{$env.SUPABASE_URL}}/rest/v1/post_stats`
- Headers:
  - `apikey`: `{{$env.SUPABASE_SERVICE_KEY}}`
  - `Authorization`: `Bearer {{$env.SUPABASE_SERVICE_KEY}}`
  - `Content-Type`: `application/json`
  - `Prefer`: `resolution=merge-duplicates`
- Body: `={{$json.rows}}`

---

## STEP 7 — ตั้งค่า Environment Variables ใน n8n

ใน n8n → Settings → Environment Variables → เพิ่ม:

| Key | Value |
|-----|-------|
| `META_ACCESS_TOKEN` | (Token จาก Step 0-A) |
| `IG_BUSINESS_ACCOUNT_ID` | (ID จาก Step 0-A) |
| `TIKTOK_ACCESS_TOKEN` | (Token จาก Step 0-B) |
| `SUPABASE_URL` | (URL จาก Step 0-C) |
| `SUPABASE_SERVICE_KEY` | (Key จาก Step 0-C) |
| `GOOGLE_SHEET_ID` | (ID จาก Step 0-D) |
| `GEMINI_API_KEY` | (Key จาก Step 0-E) |
| `APIFY_TOKEN` | (Token จาก Step 0-F) |

---

## STEP 8 — เชื่อม Supabase กับ Looker Studio

1. เปิด https://lookerstudio.google.com → Blank Report
2. คลิก "Add Data" → ค้นหา **"Supermetrics"** หรือใช้ **connector ของ Supabase**:
   - Looker Studio ไม่มี native Supabase connector
   - **วิธีที่แนะนำ**: ใช้ Google Sheets เป็นตัวกลาง (เชื่อมโดยตรงได้)
     - Data Source → Google Sheets → เลือก Sheet "Daily Stats"
   - **วิธีทางเลือก**: ใช้ PostgreSQL connector ของ Looker Studio
     - Data Source → PostgreSQL
     - Host: ดูจาก Supabase → Settings → Database → Host
     - Port: `5432`
     - Database: `postgres`
     - Username: `postgres`
     - Password: (password ที่ตั้งตอนสร้าง project)

3. **Charts ที่ควรสร้าง:**

| Chart | Dimension | Metric |
|-------|-----------|--------|
| Time Series | recorded_at | engagement_rate |
| Bar Chart | platform | reach (SUM) |
| Scorecard | - | avg(engagement_rate) ช่วง 7 วัน |
| Table | campaign_tag | reach, engagement_rate, virality_score |
| Bar Chart | post_id | ER เรียงจากมากไปน้อย |

4. เพิ่ม Filter Control:
   - Campaign Tag (Dropdown)
   - Platform (Dropdown)
   - Date Range Picker

---

## STEP 9 — ทดสอบ End-to-End

```
1. เรียก n8n workflow ด้วยมือ (Execute Workflow)
2. ตรวจ Google Sheets ว่ามี row ใหม่เข้า
3. ตรวจ Supabase → Table Editor → post_stats
4. Refresh Looker Studio → ตรวจว่า chart อัปเดต
5. เปิด Looker Studio บน mobile → ตรวจ responsive
```

---

## สรุป Keys ทั้งหมดที่ต้องเตรียม

| Key | ได้จากที่ไหน | จำเป็นมั้ย |
|-----|-------------|-----------|
| `META_ACCESS_TOKEN` | Facebook Developers | ✅ Tier 1 |
| `IG_BUSINESS_ACCOUNT_ID` | Graph API Explorer | ✅ Tier 1 |
| `TIKTOK_ACCESS_TOKEN` | TikTok Developers | ✅ Tier 1 |
| `SUPABASE_URL` | Supabase Settings | ✅ ทุก Tier |
| `SUPABASE_SERVICE_KEY` | Supabase Settings | ✅ ทุก Tier |
| `GOOGLE_SHEET_ID` | URL ของ Google Sheet | ✅ ทุก Tier |
| `GEMINI_API_KEY` | Google AI Studio | ✅ Tier 2a |
| `APIFY_TOKEN` | Apify Settings | ⚠️ Tier 3 เท่านั้น |
| `META_USERNAME` / `META_PASSWORD` | บัญชี Facebook ของชมรม | ⚠️ Tier 2 เท่านั้น |
