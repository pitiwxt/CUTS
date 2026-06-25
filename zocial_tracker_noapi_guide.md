# Zocial Tracker — No-API Implementation Guide
## ดึงข้อมูล Instagram / TikTok / Facebook โดยไม่ต้องมี API
### เป้าหมาย: @chulatechstartup ทั้ง 3 แพลตฟอร์ม

---

## ข้อควรรู้ก่อนเริ่ม: ข้อมูลไหนได้ / ข้อมูลไหนไม่ได้

| ข้อมูล | IG | TikTok | Facebook | หมายเหตุ |
|--------|-----|--------|----------|---------|
| ยอด Likes | ✅ | ✅ | ✅ | สาธารณะ ดึงได้ |
| ยอด Comments | ✅ | ✅ | ✅ | สาธารณะ ดึงได้ |
| ยอด Shares | ❌ | ✅ | ✅ | IG ซ่อน shares |
| ยอด Views/Reach | ✅ Reels | ✅ | ✅ | IG ให้เฉพาะ Reels |
| ยอด Saves | ❌ | ❌ | ❌ | ต้องการ API ทางการ |
| Impressions | ❌ | ❌ | ❌ | ต้องการ API ทางการ |

> ⚠️ **สำหรับ prototype นี้**: ใช้ Likes + Comments + Views/Shares คำนวณ ER ได้เพียงพอ

---

## ภาพรวม 2 วิธีที่จะใช้

```
วิธีที่ใช้จริง:
┌─────────────────────────────────┐
│  Tier 2: Playwright + Gemini    │  ← login เข้า IG ดูหน้า Analytics
│  (ดึงข้อมูลได้แม่นกว่า)         │     ใช้สำหรับ Instagram เป็นหลัก
└─────────────────────────────────┘
           ถ้าล้มเหลว
┌─────────────────────────────────┐
│  Tier 3: Apify Scrapers         │  ← ดึงจากหน้าสาธารณะ ไม่ต้อง login
│  (ง่ายที่สุด ใช้ได้ทั้ง 3)      │     ใช้ TikTok + Facebook เป็นหลัก
└─────────────────────────────────┘
```

---

## PART A — Tier 3 ก่อน (ง่ายสุด ทำก่อนได้เลย)

### A-1: สมัคร Apify (ฟรี ไม่ต้องใส่บัตร)

1. ไปที่ https://apify.com → **Sign Up**
2. กรอก Email + Password → Verify email
3. เข้า Dashboard → ซ้ายมือ → **Settings → Integrations**
4. คัดลอก **Personal API Token** (รูปแบบ: `apify_api_xxxxxxxxxxxx`)
5. บันทึกไว้: `APIFY_TOKEN=apify_api_xxxxxxxxxxxx`

> **Free plan ได้ $5/เดือน ≈ 3,000+ posts ฟรี** เพียงพอสำหรับ prototype

---

### A-2: ดึงข้อมูล Instagram ผ่าน Apify (ไม่ต้อง login)

**Actor ที่ใช้**: `apify/instagram-scraper`
**URL ของชมรม**: `https://www.instagram.com/chulatechstartup/`

#### วิธีใช้งานผ่านหน้าเว็บ (ไม่ต้องเขียนโค้ด):

1. ไปที่ https://apify.com/apify/instagram-scraper
2. กด **"Try for free"**
3. กรอก Input:
   ```json
   {
     "directUrls": ["https://www.instagram.com/chulatechstartup/"],
     "resultsType": "posts",
     "resultsLimit": 20,
     "addParentData": true
   }
   ```
4. กด **"Save & Start"** → รอ 1-2 นาที
5. เมื่อเสร็จ → กด **Dataset** → **Export as JSON**

**ข้อมูลที่ได้**:
```json
{
  "id": "abc123",
  "shortCode": "CxxxXxX",
  "type": "Sidecar",
  "caption": "โพสต์รับสมัครสมาชิกใหม่ #Recruiter-2026",
  "likesCount": 245,
  "commentsCount": 18,
  "videoViewCount": 1820,
  "timestamp": "2026-06-20T08:00:00.000Z",
  "url": "https://www.instagram.com/p/CxxxXxX/"
}
```

#### วิธีเรียกผ่าน n8n (อัตโนมัติทุกคืน):

ใน n8n สร้าง HTTP Request node:

```
Method: POST
URL: https://api.apify.com/v2/acts/apify~instagram-scraper/runs
Headers:
  Authorization: Bearer {{$env.APIFY_TOKEN}}
  Content-Type: application/json

Body:
{
  "directUrls": ["https://www.instagram.com/chulatechstartup/"],
  "resultsType": "posts",
  "resultsLimit": 20
}
```

รอผลด้วย node ที่สอง (ดึง dataset):
```
Method: GET
URL: https://api.apify.com/v2/acts/apify~instagram-scraper/runs/last/dataset/items
Headers:
  Authorization: Bearer {{$env.APIFY_TOKEN}}
```

---

### A-3: ดึงข้อมูล TikTok ผ่าน Apify

**Actor ที่ใช้**: `clockworks/tiktok-scraper`
**URL ของชมรม**: `https://www.tiktok.com/@chulatechstartup`

#### วิธีใช้งานผ่านหน้าเว็บ:

1. ไปที่ https://apify.com/clockworks/tiktok-scraper
2. กด **"Try for free"**
3. กรอก Input:
   ```json
   {
     "profiles": ["https://www.tiktok.com/@chulatechstartup"],
     "resultsPerPage": 30,
     "shouldDownloadVideos": false,
     "shouldDownloadCovers": false
   }
   ```
4. กด **"Save & Start"** → รอ 2-3 นาที
5. Export JSON

**ข้อมูลที่ได้**:
```json
{
  "id": "7xxxxxxxxxxxxxxxxx",
  "text": "รับสมัครสมาชิกใหม่ CTS 2026 🚀 #chulatechstartup",
  "diggCount": 1820,
  "shareCount": 245,
  "playCount": 18500,
  "commentCount": 93,
  "createTime": 1718870400,
  "authorMeta": {
    "name": "chulatechstartup",
    "fans": 3200
  }
}
```

#### วิธีเรียกผ่าน n8n:

```
Method: POST
URL: https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs
Headers:
  Authorization: Bearer {{$env.APIFY_TOKEN}}
  Content-Type: application/json

Body:
{
  "profiles": ["https://www.tiktok.com/@chulatechstartup"],
  "resultsPerPage": 30,
  "shouldDownloadVideos": false
}
```

---

### A-4: ดึงข้อมูล Facebook ผ่าน Apify

**Actor ที่ใช้**: `apify/facebook-posts-scraper`
**URL ของชมรม**: `https://www.facebook.com/share/18ycKKEewR/`

> ⚠️ Facebook URL ที่ให้มาเป็น share link ต้องหา Page URL ที่ถูกต้องก่อน

**หา Page URL ที่ถูกต้อง**:
1. เปิด link ที่ให้มาในเบราว์เซอร์
2. URL จะเปลี่ยนไปเป็น `https://www.facebook.com/chulatechstartup` หรือคล้ายกัน
3. คัดลอก URL นั้นมาใช้

#### วิธีใช้งานผ่านหน้าเว็บ:

1. ไปที่ https://apify.com/apify/facebook-posts-scraper
2. กด **"Try for free"**
3. กรอก Input:
   ```json
   {
     "startUrls": [{"url": "https://www.facebook.com/chulatechstartup"}],
     "maxPosts": 20,
     "maxPostComments": 0,
     "scrapeAbout": false,
     "scrapeReviews": false
   }
   ```
4. กด **"Save & Start"**
5. Export JSON

**ข้อมูลที่ได้**:
```json
{
  "postId": "xxx",
  "text": "รับสมัครสมาชิกใหม่ปีการศึกษา 2026",
  "time": "2026-06-20T08:00:00.000Z",
  "likesCount": 87,
  "commentsCount": 12,
  "sharesCount": 5,
  "url": "https://www.facebook.com/permalink.php?story_fbid=xxx"
}
```

---

## PART B — Tier 2: Playwright + Gemini Vision (Instagram เท่านั้น)

ใช้เมื่อ Apify ดึงข้อมูลไม่ครบ หรืออยากได้ข้อมูลจากหน้า Insights ของ IG

### B-1: ติดตั้ง Dependencies

```bash
mkdir zocial-tracker
cd zocial-tracker
npm init -y
npm install playwright @google/generative-ai dotenv
npx playwright install chromium
```

### B-2: สร้างไฟล์ `.env`

```env
# Instagram (บัญชีชมรม หรือบัญชีส่วนตัวที่เป็น Admin)
IG_USERNAME=อีเมล_หรือ_username_IG_ชมรม
IG_PASSWORD=รหัสผ่าน_IG_ชมรม

# Gemini
GEMINI_API_KEY=ดึงจาก_aistudio.google.com

# Apify (สำรอง)
APIFY_TOKEN=apify_api_xxxxxxxxxxxx
```

### B-3: โค้ดดึงข้อมูลจากหน้า Instagram Analytics

สร้างไฟล์ `ig_scraper.js`:

```javascript
const { chromium } = require('playwright');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── ขั้นที่ 1: Login Instagram ───────────────────────────────────────────
async function loginInstagram(page) {
  console.log('🔐 กำลัง Login Instagram...');
  
  await page.goto('https://www.instagram.com/accounts/login/', {
    waitUntil: 'networkidle'
  });

  // รอ form โหลด
  await page.waitForSelector('input[name="username"]', { timeout: 10000 });

  // กรอก username และ password
  await page.fill('input[name="username"]', process.env.IG_USERNAME);
  await page.fill('input[name="password"]', process.env.IG_PASSWORD);

  // กด Login
  await page.click('button[type="submit"]');

  // รอให้ redirect เสร็จ
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });

  // ข้าม popup "Save your login info?"
  try {
    const saveBtn = await page.waitForSelector('button:has-text("Not Now")', {
      timeout: 5000
    });
    if (saveBtn) await saveBtn.click();
  } catch (e) { /* ไม่มี popup ก็ข้ามไป */ }

  // ข้าม popup "Turn on notifications?"
  try {
    const notifBtn = await page.waitForSelector('button:has-text("Not Now")', {
      timeout: 5000
    });
    if (notifBtn) await notifBtn.click();
  } catch (e) { /* ไม่มี popup ก็ข้ามไป */ }

  console.log('✅ Login สำเร็จ');
}

// ─── ขั้นที่ 2: ถ่ายภาพหน้าจอ ส่งให้ Gemini อ่าน ────────────────────────
async function extractStatsFromScreenshot(page, postUrl) {
  console.log(`📸 กำลังดึงข้อมูลจาก: ${postUrl}`);

  await page.goto(postUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // รอ 2 วิให้โหลดเสร็จ

  // ถ่ายภาพหน้าจอ
  const screenshotPath = `screenshot_${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`  → ถ่ายภาพแล้ว: ${screenshotPath}`);

  // ส่งภาพให้ Gemini อ่านตัวเลข
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const imageBytes = fs.readFileSync(screenshotPath);
  const base64Image = imageBytes.toString('base64');

  const prompt = `
    นี่คือภาพหน้าจอของโพสต์ Instagram
    กรุณาดึงตัวเลขสถิติต่อไปนี้ออกมาเป็น JSON (ตอบเป็น JSON เท่านั้น ไม่ต้องมีคำอธิบายเพิ่ม):
    {
      "likes": <ตัวเลขยอดไลก์ หรือ 0 ถ้าไม่เห็น>,
      "comments": <ตัวเลขยอดคอมเมนต์ หรือ 0>,
      "views": <ตัวเลขยอดวิว/plays หรือ 0>,
      "shares": <ตัวเลขยอดแชร์ หรือ 0>,
      "post_type": "<"reel" หรือ "image" หรือ "carousel">"
    }
    ถ้าเห็นตัวย่อเช่น "1.2K" ให้แปลงเป็น 1200
  `;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: 'image/png',
        data: base64Image
      }
    }
  ]);

  const responseText = result.response.text();
  // ทำความสะอาด response (ตัด markdown code block ออก)
  const cleanJson = responseText
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const stats = JSON.parse(cleanJson);
  console.log(`  → Gemini อ่านได้:`, stats);

  // ลบไฟล์ screenshot
  fs.unlinkSync(screenshotPath);

  return stats;
}

// ─── ขั้นที่ 3: ดึงรายการโพสต์ล่าสุดของ @chulatechstartup ──────────────
async function getRecentPostUrls(page, username, count = 12) {
  console.log(`📋 กำลังดึงรายการโพสต์ล่าสุดของ @${username}...`);

  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: 'networkidle'
  });

  // รอโพสต์โหลด
  await page.waitForSelector('article a', { timeout: 10000 });

  // ดึง URL ของโพสต์ทั้งหมด
  const postUrls = await page.evaluate((maxCount) => {
    const links = document.querySelectorAll('article a[href*="/p/"], article a[href*="/reel/"]');
    const urls = [];
    for (let i = 0; i < Math.min(links.length, maxCount); i++) {
      urls.push('https://www.instagram.com' + links[i].getAttribute('href'));
    }
    return urls;
  }, count);

  console.log(`  → พบโพสต์ ${postUrls.length} รายการ`);
  return postUrls;
}

// ─── Main: รันทุกอย่าง ────────────────────────────────────────────────────
async function main() {
  const browser = await chromium.launch({
    headless: true, // เปลี่ยนเป็น false เพื่อดูการทำงานจริง
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();
  const results = [];

  try {
    // Login
    await loginInstagram(page);

    // ดึงรายการโพสต์
    const postUrls = await getRecentPostUrls(page, 'chulatechstartup', 12);

    // ดึงสถิติของแต่ละโพสต์
    for (const url of postUrls) {
      try {
        const stats = await extractStatsFromScreenshot(page, url);
        const today = new Date().toISOString().split('T')[0];

        results.push({
          post_id: url.split('/').filter(Boolean).pop(), // ดึง shortcode จาก URL
          platform: 'instagram',
          content_type: stats.post_type,
          campaign_tag: '', // ต้องเติมเองหรือดึงจาก caption
          reach: stats.views || 0,
          likes: stats.likes || 0,
          comments: stats.comments || 0,
          shares: stats.shares || 0,
          saves: 0, // ไม่สามารถดึงได้จากหน้าสาธารณะ
          engagement_rate: stats.likes && stats.views
            ? ((stats.likes + stats.comments) / stats.views * 100).toFixed(2)
            : 0,
          virality_score: stats.shares && stats.views
            ? (stats.shares / stats.views * 100).toFixed(2)
            : 0,
          data_source: 'vision',
          recorded_at: today,
          source_url: url
        });

        // หน่วงเวลาระหว่างโพสต์ เพื่อไม่ให้ถูก block
        await page.waitForTimeout(2000);

      } catch (err) {
        console.error(`  ❌ ดึงข้อมูลไม่ได้จาก ${url}:`, err.message);
      }
    }

  } finally {
    await browser.close();
  }

  // บันทึกผลลัพธ์
  const outputPath = `ig_stats_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ เสร็จสิ้น บันทึกผลลัพธ์ที่: ${outputPath}`);
  console.log(`   พบ ${results.length} โพสต์`);

  return results;
}

main().catch(console.error);
```

### B-4: รันโค้ด

```bash
node ig_scraper.js
```

ตัวอย่างผลลัพธ์ที่ได้:
```
🔐 กำลัง Login Instagram...
✅ Login สำเร็จ
📋 กำลังดึงรายการโพสต์ล่าสุดของ @chulatechstartup...
  → พบโพสต์ 12 รายการ
📸 กำลังดึงข้อมูลจาก: https://www.instagram.com/p/Cxxx.../
  → ถ่ายภาพแล้ว: screenshot_1719100000000.png
  → Gemini อ่านได้: { likes: 245, comments: 18, views: 4500, shares: 0, post_type: 'reel' }
...
✅ เสร็จสิ้น บันทึกผลลัพธ์ที่: ig_stats_2026-06-25.json
   พบ 12 โพสต์
```

---

## PART C — เชื่อมทุกอย่างเข้า n8n และส่งต่อ Supabase

### C-1: n8n Workflow รวม 3 แพลตฟอร์ม

```
[Schedule: 02:00] 
    ↓
[Apify: IG Scraper] → [Code: Normalize IG data]    ─┐
[Apify: TT Scraper] → [Code: Normalize TikTok data] ─┼→ [Code: Merge + คำนวณ ER/VS] → [Supabase Upsert] → [Google Sheets Update]
[Apify: FB Scraper] → [Code: Normalize FB data]    ─┘
```

### C-2: Code Node — Normalize และคำนวณ ER/VS

```javascript
// รับ input จาก 3 แพลตฟอร์ม normalize ให้เป็น schema เดียวกัน
const allPosts = [];

// --- Instagram (จาก Apify apify/instagram-scraper) ---
const igData = $('Apify IG').all();
for (const item of igData) {
  const d = item.json;
  const likes = d.likesCount || 0;
  const comments = d.commentsCount || 0;
  const views = d.videoViewCount || d.videoPlayCount || 1;
  
  allPosts.push({
    post_id: `IG_${d.shortCode}`,
    platform: 'instagram',
    content_type: d.type === 'Video' ? 'reel' : 'image',
    campaign_tag: extractCampaignTag(d.caption || ''),
    reach: views,
    likes, comments,
    shares: 0, saves: 0,
    engagement_rate: +((likes + comments) / views * 100).toFixed(2),
    virality_score: 0,
    data_source: 'apify',
    recorded_at: new Date().toISOString().split('T')[0]
  });
}

// --- TikTok (จาก Apify clockworks/tiktok-scraper) ---
const ttData = $('Apify TikTok').all();
for (const item of ttData) {
  const d = item.json;
  const likes = d.diggCount || 0;
  const comments = d.commentCount || 0;
  const shares = d.shareCount || 0;
  const views = d.playCount || 1;
  
  allPosts.push({
    post_id: `TT_${d.id?.slice(-6)}`,
    platform: 'tiktok',
    content_type: 'video',
    campaign_tag: extractCampaignTag(d.text || ''),
    reach: views,
    likes, comments, shares, saves: 0,
    engagement_rate: +((likes + comments + shares) / views * 100).toFixed(2),
    virality_score: +(shares / views * 100).toFixed(2),
    data_source: 'apify',
    recorded_at: new Date().toISOString().split('T')[0]
  });
}

// --- Facebook (จาก Apify apify/facebook-posts-scraper) ---
const fbData = $('Apify FB').all();
for (const item of fbData) {
  const d = item.json;
  const likes = d.likesCount || d.reactionsCount || 0;
  const comments = d.commentsCount || 0;
  const shares = d.sharesCount || 0;
  const reach = likes + comments + shares || 1; // FB ไม่ให้ reach จริง
  
  allPosts.push({
    post_id: `FB_${d.postId?.slice(-8)}`,
    platform: 'facebook',
    content_type: d.video ? 'video' : 'image',
    campaign_tag: extractCampaignTag(d.text || ''),
    reach,
    likes, comments, shares, saves: 0,
    engagement_rate: +((likes + comments + shares) / reach * 100).toFixed(2),
    virality_score: +(shares / reach * 100).toFixed(2),
    data_source: 'apify',
    recorded_at: new Date().toISOString().split('T')[0]
  });
}

// Helper: ดึง Campaign Tag จาก caption (#Recruiter-2026 → Recruiter-2026)
function extractCampaignTag(text) {
  const match = text.match(/#([A-Za-z0-9\-]+(?:-\d{4})?)/);
  return match ? match[1] : '';
}

return allPosts.map(p => ({ json: p }));
```

---

## PART D — เชื่อม Supabase → Looker Studio

### D-1: สร้างตารางใน Supabase (SQL Editor)

```sql
CREATE TABLE IF NOT EXISTS post_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL UNIQUE,
  platform TEXT,
  content_type TEXT,
  campaign_tag TEXT DEFAULT '',
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate DECIMAL(6,2) DEFAULT 0,
  virality_score DECIMAL(6,2) DEFAULT 0,
  data_source TEXT DEFAULT 'apify',
  recorded_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### D-2: n8n → Supabase (HTTP Request node)

```
Method: POST
URL: https://YOUR_PROJECT.supabase.co/rest/v1/post_stats
Headers:
  apikey: YOUR_SERVICE_KEY
  Authorization: Bearer YOUR_SERVICE_KEY
  Content-Type: application/json
  Prefer: resolution=merge-duplicates

Body: ={{ $json }}
```

### D-3: เชื่อม Looker Studio

1. เปิด https://lookerstudio.google.com → **Create → Report**
2. **Add Data** → ค้นหา **"PostgreSQL"** (Looker มี connector ในตัว)
3. กรอก:
   - **Host**: ดูจาก Supabase → Settings → Database → Host
     (รูปแบบ: `db.xxxxxxxxxxxx.supabase.co`)
   - **Port**: `5432`
   - **Database**: `postgres`
   - **Username**: `postgres`
   - **Password**: รหัสผ่านที่ตั้งตอนสร้าง Supabase project
4. เลือก Table: `post_stats` → **Add**

### D-4: Charts ที่ควรสร้าง

| Chart | Dimension | Metric | ประโยชน์ |
|-------|-----------|--------|---------|
| Time Series | recorded_at | avg(engagement_rate) | ดูแนวโน้ม ER รายวัน |
| Bar Chart | platform | sum(reach) | เปรียบเทียบ reach แต่ละ platform |
| Scorecard | — | avg(engagement_rate) 7 วัน | KPI หลัก |
| Table | campaign_tag | reach, ER, virality_score | ดู performance ต่อแคมเปญ |
| Bar Chart | content_type | avg(engagement_rate) | Reel vs Image vs Video |

เพิ่ม Filters:
- **Date Range**: สำหรับกรองช่วงเวลา
- **Platform**: Dropdown (instagram / tiktok / facebook)
- **Campaign Tag**: Dropdown

---

## สรุป: ทำตามลำดับนี้

```
วันที่ 1 — ตั้งระบบพื้นฐาน
  ✅ สมัคร Apify (ฟรี)
  ✅ สร้าง Supabase project + ตาราง SQL
  ✅ ทดสอบ Apify IG/TikTok/FB แบบ manual ผ่านเว็บ

วันที่ 2 — เชื่อม n8n
  ✅ ติดตั้ง n8n (Docker หรือ Cloud)
  ✅ สร้าง Workflow เรียก Apify → normalize → Supabase
  ✅ ทดสอบรัน manual

วันที่ 3 — Dashboard
  ✅ เชื่อม Looker Studio กับ Supabase
  ✅ สร้าง Charts ตามตารางด้านบน
  ✅ ตั้ง Schedule ใน n8n (02:00 น. ทุกวัน)

วันที่ 4 (Optional) — Tier 2 Playwright
  ✅ ติดตั้ง Node.js + Playwright
  ✅ รัน ig_scraper.js ทดสอบ
  ✅ เชื่อมกับ n8n เป็น fallback
```

---

## Keys ทั้งหมดที่ต้องเตรียม (ไม่ต้องมี Meta/TikTok API)

| Key | วิธีได้มา | จำเป็น |
|-----|-----------|-------|
| `APIFY_TOKEN` | apify.com → Settings → Integrations | ✅ |
| `SUPABASE_URL` | supabase.com → project → Settings → API | ✅ |
| `SUPABASE_SERVICE_KEY` | supabase.com → project → Settings → API | ✅ |
| `GEMINI_API_KEY` | aistudio.google.com → Get API Key | ⚠️ Tier 2 เท่านั้น |
| `IG_USERNAME` / `IG_PASSWORD` | บัญชี IG ของชมรม | ⚠️ Tier 2 เท่านั้น |
