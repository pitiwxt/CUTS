# Club OS — Full Implementation Guide
## Finance (OCRchat) + Campaign ROI + Dashboard
### สำหรับ AI Agent ที่รับผิดชอบสร้างระบบจริง

---

## ภาพรวมระบบทั้งหมด

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLUB OS                                  │
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────┐            │
│  │  ZOCIAL TRACKER  │          │    OCRchat        │            │
│  │  (Marketing)     │          │    (Finance)      │            │
│  │                  │          │                   │            │
│  │  Apify → n8n     │          │  LINE Bot → n8n   │            │
│  │  → Sheets        │          │  → Gemini OCR     │            │
│  │  → Supabase      │          │  → Drive + Sheets │            │
│  └────────┬─────────┘          └────────┬──────────┘            │
│           │                             │                        │
│           └──────────┬──────────────────┘                        │
│                      ↓ JOIN by Campaign Tag                      │
│              ┌───────────────┐                                   │
│              │   Supabase    │  ← ฐานข้อมูลกลาง                 │
│              │  PostgreSQL   │                                   │
│              └───────┬───────┘                                   │
│                      ↓                                           │
│         ┌────────────┴────────────┐                              │
│         ↓                         ↓                              │
│  ┌─────────────┐         ┌─────────────────┐                    │
│  │Looker Studio│         │  Claude AI Chat │                    │
│  │  Dashboard  │         │  (MCP + DB)     │                    │
│  └─────────────┘         └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

# PART 1 — ระบบ Finance: OCRchat

## ขั้นตอนที่ 1: ตั้ง LINE Bot

### 1-A: สร้าง LINE Messaging API Channel

1. ไปที่ https://developers.line.biz → Login ด้วย LINE account ของชมรม
2. กด **"Create a new provider"** → ตั้งชื่อ `Chula Tech Startup`
3. กด **"Create a new channel"** → เลือก **"Messaging API"**
4. กรอก:
   - Channel name: `OCRchat Finance Bot`
   - Channel description: `ระบบส่งใบเสร็จของชมรม CTS`
   - Category: Other
5. กด Create
6. ไปที่ tab **"Messaging API"**:
   - คัดลอก **Channel access token** (กด Issue)
   - คัดลอก **Channel secret**
7. เปิด **"Allow bot to join group chats"** = ON
8. เปิด **"Auto-reply messages"** = OFF
9. บันทึก:
   - `LINE_CHANNEL_ACCESS_TOKEN=xxx`
   - `LINE_CHANNEL_SECRET=xxx`

---

### 1-B: ตั้ง Webhook ใน n8n รับข้อความจาก LINE

ใน n8n สร้าง Workflow ชื่อ `OCRchat_Receipt_Handler`:

**Node 1: Webhook Trigger**
```
Type: Webhook
Method: POST
Path: /ocrchat-line
Authentication: None (จะ verify ด้วย signature เอง)
```
→ คัดลอก Webhook URL (เช่น `https://your-n8n.com/webhook/ocrchat-line`)
→ นำไปใส่ใน LINE Developer Console → Webhook URL

**Node 2: Code — Verify LINE Signature + Extract**
```javascript
const crypto = require('crypto');
const body = $input.first().json.body;
const headers = $input.first().json.headers;

// Verify LINE signature
const signature = headers['x-line-signature'];
const hash = crypto
  .createHmac('SHA256', process.env.LINE_CHANNEL_SECRET)
  .update(JSON.stringify(body))
  .digest('base64');

if (hash !== signature) {
  throw new Error('Invalid LINE signature');
}

// ดึงข้อมูลจาก event
const events = body.events || [];
const results = [];

for (const event of events) {
  if (event.type === 'message') {
    if (event.message.type === 'image') {
      // สมาชิกส่งรูปใบเสร็จ
      results.push({
        json: {
          type: 'image',
          messageId: event.message.id,
          userId: event.source.userId,
          groupId: event.source.groupId || null,
          replyToken: event.replyToken,
          timestamp: new Date(event.timestamp).toISOString()
        }
      });
    } else if (event.message.type === 'text') {
      // สมาชิกพิมพ์ campaign tag
      results.push({
        json: {
          type: 'text',
          text: event.message.text,
          userId: event.source.userId,
          replyToken: event.replyToken
        }
      });
    }
  }
}

return results;
```

---

### 1-C: ดึงรูปภาพจาก LINE และส่งให้ Gemini อ่าน

**Node 3: IF — แยก image vs text**
- Branch A (image) → ดำเนินการต่อ
- Branch B (text) → บันทึก campaign tag ชั่วคราว

**Node 4: HTTP Request — ดาวน์โหลดรูปจาก LINE**
```
Method: GET
URL: https://api-data.line.me/v2/bot/message/{{$json.messageId}}/content
Headers:
  Authorization: Bearer {{$env.LINE_CHANNEL_ACCESS_TOKEN}}

Response: Binary (ไฟล์รูป)
```

**Node 5: HTTP Request — ส่งรูปให้ Gemini OCR**
```
Method: POST
URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
Headers:
  x-goog-api-key: {{$env.GEMINI_API_KEY}}
  Content-Type: application/json

Body (JSON):
{
  "contents": [
    {
      "parts": [
        {
          "text": "นี่คือใบเสร็จ/บิล กรุณาดึงข้อมูลต่อไปนี้ออกมาเป็น JSON เท่านั้น ห้ามมีข้อความอื่น:\n{\n  \"store_name\": \"ชื่อร้าน\",\n  \"total_amount\": ตัวเลขยอดรวม (number),\n  \"date\": \"YYYY-MM-DD\",\n  \"items\": [\"รายการสินค้า 1\", \"รายการสินค้า 2\"],\n  \"receipt_type\": \"restaurant|retail|ads|transport|other\"\n}\nถ้าอ่านค่าใดไม่ได้ให้ใส่ null"
        },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "{{$binary.data.toString('base64')}}"
          }
        }
      ]
    }
  ]
}
```

**Node 6: Code — Parse Gemini Response**
```javascript
const response = $input.first().json;
const text = response.candidates[0].content.parts[0].text;

// ทำความสะอาด JSON (ตัด markdown code block)
const cleanJson = text
  .replace(/```json/g, '')
  .replace(/```/g, '')
  .trim();

let extracted;
try {
  extracted = JSON.parse(cleanJson);
} catch (e) {
  // ถ้า parse ไม่ได้ ใช้ค่าเริ่มต้น
  extracted = {
    store_name: 'อ่านไม่ได้',
    total_amount: 0,
    date: new Date().toISOString().split('T')[0],
    items: [],
    receipt_type: 'other'
  };
}

// เพิ่ม metadata
return [{
  json: {
    ...extracted,
    submitter_line_id: $('Node 2').first().json.userId,
    recorded_at: new Date().toISOString().split('T')[0],
    status: 'pending',
    tx_id: `TX-${Date.now().toString().slice(-6)}`
  }
}];
```

---

## ขั้นตอนที่ 2: อัปโหลดรูปไป Google Drive + บันทึกลง Sheets

**Node 7: HTTP Request — อัปโหลดรูปไป Google Drive**
```
Method: POST
URL: https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
Headers:
  Authorization: Bearer {{$env.GOOGLE_ACCESS_TOKEN}}
  Content-Type: multipart/related; boundary=boundary123

Body: multipart (ใช้ n8n Google Drive node แทนได้ง่ายกว่า)
```

> **ง่ายกว่า**: ใช้ n8n built-in **Google Drive node**
> - Operation: Upload File
> - Parent Folder: ตั้งชื่อโฟลเดอร์เป็น `Receipts/2026/{{$now.format('MMMM')}}`
> - File Name: `{{$json.tx_id}}_{{$json.store_name}}_{{$json.recorded_at}}.jpg`

**Node 8: Google Sheets — บันทึกรายการ**

ใช้ n8n Google Sheets node:
```
Operation: Append Row
Sheet ID: {{$env.GOOGLE_SHEET_ID}}
Sheet Name: Expenses
Values:
  A (TX ID):        {{$json.tx_id}}
  B (Submitter):    {{$json.submitter_line_id}}
  C (Store):        {{$json.store_name}}
  D (Amount):       {{$json.total_amount}}
  E (Date):         {{$json.date}}
  F (Items):        {{$json.items.join(', ')}}
  G (Type):         {{$json.receipt_type}}
  H (Campaign Tag): (ว่างไว้ก่อน — สมาชิกจะพิมพ์ส่งมาทีหลัง)
  I (Drive URL):    {{$json.drive_url}}
  J (Status):       pending
  K (Recorded At):  {{$json.recorded_at}}
```

**Node 9: HTTP Request — ตอบกลับ LINE**
```
Method: POST
URL: https://api.line.me/v2/bot/message/reply
Headers:
  Authorization: Bearer {{$env.LINE_CHANNEL_ACCESS_TOKEN}}
  Content-Type: application/json

Body:
{
  "replyToken": "{{$('Node 2').first().json.replyToken}}",
  "messages": [
    {
      "type": "text",
      "text": "✅ รับใบเสร็จแล้วครับ!\n\n🏪 ร้าน: {{$json.store_name}}\n💰 ยอดรวม: {{$json.total_amount}} บาท\n📅 วันที่: {{$json.date}}\n🔖 TX: {{$json.tx_id}}\n\nกรุณาพิมพ์ชื่อแคมเปญต่อเลยครับ\nตัวอย่าง: Recruiter-2026"
    }
  ]
}
```

---

## ขั้นตอนที่ 3: รับ Campaign Tag จากสมาชิก

**Workflow แยก: `OCRchat_Tag_Handler`**

เมื่อสมาชิกพิมพ์ Campaign Tag ส่งมา:

**Node 1: Code — ดึง TX ล่าสุดของ user นั้น + อัปเดต campaign tag**
```javascript
// ดึง TX ID ล่าสุดของ user นี้จาก Sheets
// (ค้นหาแถวที่ submitter_line_id ตรงกัน และ campaign_tag ว่างอยู่)
const campaignTag = $json.text.trim();
const userId = $json.userId;

return [{
  json: {
    campaign_tag: campaignTag,
    userId: userId,
    // TX ID จะหาจาก Sheets ใน node ถัดไป
  }
}];
```

**Node 2: Google Sheets — ค้นหาแถวล่าสุดของ user และอัปเดต Campaign Tag**
```
Operation: Update Row
Lookup Column: Submitter (col B)
Lookup Value: {{$json.userId}}
Update: Column H (Campaign Tag) = {{$json.campaign_tag}}
```

**Node 3: ตอบกลับ LINE**
```json
{
  "messages": [{
    "type": "text",
    "text": "🏷️ บันทึก Campaign Tag: {{$json.campaign_tag}} เรียบร้อยครับ!\nทีม Finance จะตรวจสอบและกดยืนยันภายใน 24 ชั่วโมง"
  }]
}
```

---

## ขั้นตอนที่ 4: แจ้งทีม Finance ผ่าน Discord

**Node: HTTP Request — Discord Webhook**
```
Method: POST
URL: {{$env.DISCORD_WEBHOOK_URL}}
Content-Type: application/json

Body:
{
  "embeds": [
    {
      "title": "🧾 ใบเสร็จใหม่รอตรวจสอบ",
      "color": 16711782,
      "fields": [
        { "name": "TX ID", "value": "{{$json.tx_id}}", "inline": true },
        { "name": "ร้าน", "value": "{{$json.store_name}}", "inline": true },
        { "name": "ยอดเงิน", "value": "{{$json.total_amount}} บาท", "inline": true },
        { "name": "Campaign", "value": "{{$json.campaign_tag}}", "inline": true },
        { "name": "วันที่", "value": "{{$json.date}}", "inline": true },
        { "name": "รายการ", "value": "{{$json.items}}", "inline": false }
      ],
      "footer": { "text": "กด Verify ใน Google Sheets เพื่อยืนยัน" },
      "image": { "url": "{{$json.drive_url}}" }
    }
  ]
}
```

> **หมายเหตุ**: Discord Webhook ส่งแจ้งเตือนได้ แต่ "ปุ่ม Verify ใน Discord" ต้องใช้ Discord Bot (แยก scope) — สำหรับ prototype ให้ Finance กด Verify ใน Google Sheets โดยตรงจะง่ายกว่า

---

## ขั้นตอนที่ 5: Finance กด Verify ใน Sheets → Sync ลง Supabase

**Workflow: `OCRchat_Nightly_Sync`**

รันทุกคืน 23:30 น. — sync รายการที่ Status = `verified` จาก Sheets → Supabase

```javascript
// Code Node: normalize Sheets data → Supabase schema
const rows = $input.all();

return rows
  .filter(r => r.json.status === 'verified' && r.json.tx_id)
  .map(r => ({
    json: {
      tx_id: r.json.tx_id,
      submitter: r.json.submitter_line_id,
      store_name: r.json.store_name,
      amount: parseFloat(r.json.total_amount) || 0,
      receipt_date: r.json.date,
      receipt_type: r.json.receipt_type,
      campaign_tag: r.json.campaign_tag || '',
      drive_url: r.json.drive_url,
      status: 'verified',
      recorded_at: r.json.recorded_at
    }
  }));
```

**HTTP Request → Supabase:**
```
POST {{$env.SUPABASE_URL}}/rest/v1/expenses
Headers:
  apikey: {{$env.SUPABASE_SERVICE_KEY}}
  Authorization: Bearer {{$env.SUPABASE_SERVICE_KEY}}
  Prefer: resolution=merge-duplicates
Body: ={{$json}}
```

---

# PART 2 — โครงสร้างฐานข้อมูล Supabase ทั้งหมด

รัน SQL นี้ใน Supabase SQL Editor ทั้งหมดครั้งเดียว:

```sql
-- ตาราง 1: สถิติโพสต์ (จาก Zocial Tracker)
CREATE TABLE IF NOT EXISTS post_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
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
  recorded_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, recorded_at)
);

-- ตาราง 2: รายการรายจ่าย (จาก OCRchat)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tx_id TEXT NOT NULL UNIQUE,
  submitter TEXT,
  store_name TEXT,
  amount DECIMAL(10,2) DEFAULT 0,
  receipt_date DATE,
  receipt_type TEXT DEFAULT 'other',
  campaign_tag TEXT DEFAULT '',
  drive_url TEXT,
  status TEXT DEFAULT 'pending',   -- pending | verified | rejected
  recorded_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View: Campaign ROI — JOIN ทั้งสองตาราง
CREATE OR REPLACE VIEW campaign_roi AS
SELECT
  COALESCE(p.campaign_tag, e.campaign_tag) AS campaign_tag,
  SUM(DISTINCT p.reach) AS total_reach,
  SUM(DISTINCT p.likes + p.comments + p.shares + p.saves) AS total_engage,
  AVG(p.engagement_rate) AS avg_er,
  SUM(e.amount) AS total_spend,
  CASE
    WHEN SUM(DISTINCT p.reach) > 0
    THEN ROUND(SUM(e.amount) / SUM(DISTINCT p.reach), 4)
    ELSE 0
  END AS cpr,
  CASE
    WHEN SUM(DISTINCT p.likes + p.comments + p.shares + p.saves) > 0
    THEN ROUND(SUM(e.amount) / SUM(DISTINCT p.likes + p.comments + p.shares + p.saves), 4)
    ELSE 0
  END AS cpe,
  COUNT(DISTINCT p.post_id) AS post_count,
  COUNT(DISTINCT e.tx_id) AS expense_count
FROM post_stats p
FULL OUTER JOIN expenses e
  ON p.campaign_tag = e.campaign_tag
  AND e.status = 'verified'
WHERE COALESCE(p.campaign_tag, e.campaign_tag) != ''
GROUP BY COALESCE(p.campaign_tag, e.campaign_tag);

-- Indexes
CREATE INDEX idx_post_stats_campaign ON post_stats(campaign_tag);
CREATE INDEX idx_post_stats_date ON post_stats(recorded_at);
CREATE INDEX idx_expenses_campaign ON expenses(campaign_tag);
CREATE INDEX idx_expenses_status ON expenses(status);

-- Row Level Security
ALTER TABLE post_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service full access" ON post_stats USING (true) WITH CHECK (true);
CREATE POLICY "service full access" ON expenses USING (true) WITH CHECK (true);
```

---

# PART 3 — Campaign ROI: เชื่อมข้อมูลข้ามแผนก

## ตัวอย่างข้อมูลที่ได้เมื่อ Query view `campaign_roi`

```sql
SELECT * FROM campaign_roi ORDER BY total_spend DESC;
```

ผลลัพธ์:
```
campaign_tag    | total_reach | total_engage | avg_er | total_spend | cpr   | cpe
----------------|-------------|--------------|--------|-------------|-------|------
Recruiter-2026  | 22,700      | 3,630        | 17.1%  | ฿1,950      | ฿0.08 | ฿0.53
Workshop-AI     | 1,100       | 55           | 5.0%   | ฿3,200      | ฿2.91 | ฿58.18
```

## n8n Workflow: Calculate ROI on-demand

สร้าง Workflow `Campaign_ROI_Calculator` — รันทุกเช้า 07:00 น.:

```javascript
// Code Node: ดึง campaign_roi view แล้วส่งแจ้งเตือนถ้ามี campaign ที่ CPE สูงผิดปกติ
const campaigns = $input.all().map(c => c.json);

const alerts = campaigns.filter(c => {
  const cpe = parseFloat(c.cpe);
  return cpe > 10; // CPE สูงกว่า 10 บาท = น่าเป็นห่วง
});

if (alerts.length > 0) {
  // ส่ง Discord alert
  return alerts.map(a => ({
    json: {
      alert: true,
      campaign: a.campaign_tag,
      cpe: a.cpe,
      message: `⚠️ แคมเปญ "${a.campaign_tag}" มี CPE สูงถึง ฿${a.cpe} ต่อ Engagement — ควรทบทวนกลยุทธ์`
    }
  }));
}
```

---

# PART 4 — Looker Studio Dashboard

## การตั้งค่า Data Sources

**Source 1: post_stats**
```
Connector: PostgreSQL
Host: db.xxxxxxxxxx.supabase.co
Port: 5432
Database: postgres
Username: postgres
Password: (Supabase password)
Table: post_stats
```

**Source 2: expenses**
```
Table: expenses
```

**Source 3: campaign_roi (view)**
```
Custom Query:
SELECT * FROM campaign_roi
```

---

## Layout Dashboard (3 หน้า)

### หน้า 1: Overview
```
Row 1: KPI Cards (4 card)
  [Total Reach 7d] [Total Engage 7d] [Avg ER%] [Total Spend]

Row 2: Charts
  [Line: Reach + ER per day]    [Donut: Platform breakdown]

Row 3: Campaign ROI Table
  [campaign_tag | reach | engage | spend | CPR | CPE | post_count]
```

### หน้า 2: Marketing Detail
```
Row 1: Filter bar [Platform] [Campaign Tag] [Date Range]

Row 2: Bar Chart — ER by post (เรียงจากมาก → น้อย)

Row 3: Table — all posts with ER%, VS%, Data Source
```

### หน้า 3: Finance
```
Row 1: KPI [Total Spend] [Verified Count] [Pending Count]

Row 2: Bar Chart — spend by campaign_tag

Row 3: Table — all expenses with status filter
```

---

# PART 5 — สรุปทุก Workflow ใน n8n

| Workflow | Trigger | หน้าที่ |
|----------|---------|--------|
| `Daily_IG_TikTok_FB_Scrape` | Schedule 02:00 | Apify → Sheets → Supabase |
| `OCRchat_Receipt_Handler` | LINE Webhook | รับรูป → Gemini OCR → Drive + Sheets + Discord |
| `OCRchat_Tag_Handler` | LINE Webhook | รับ Campaign Tag → อัปเดต Sheets |
| `Nightly_Sheets_to_Supabase` | Schedule 23:30 | Sync Sheets verified → Supabase |
| `Campaign_ROI_Calculator` | Schedule 07:00 | Query ROI view → alert ถ้า CPE สูง |

---

# PART 6 — Keys ทั้งหมดที่ต้องเตรียม

| Key | ได้จากไหน | ใช้ใน |
|-----|-----------|-------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers Console | OCRchat workflows |
| `LINE_CHANNEL_SECRET` | LINE Developers Console | OCRchat webhook verify |
| `DISCORD_WEBHOOK_URL` | Discord → Server Settings → Integrations → Webhooks | แจ้ง Finance |
| `GEMINI_API_KEY` | aistudio.google.com → Get API Key | OCR ใบเสร็จ |
| `GOOGLE_SHEET_ID_EXPENSES` | URL ของ Google Sheet รายจ่าย | Expense logging |
| `GOOGLE_SHEET_ID_MARKETING` | URL ของ Google Sheet marketing | Post stats |
| `SUPABASE_URL` | Supabase → Settings → API | ทุก sync workflow |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API | ทุก sync workflow |
| `APIFY_TOKEN` | apify.com → Settings → Integrations | Marketing scraping |

---

# PART 7 — ลำดับการทำ (Checklist)

```
สัปดาห์ที่ 1-2: MVP
  □ สมัคร LINE Developers → สร้าง Messaging API channel
  □ ตั้ง n8n (Docker local หรือ Cloud)
  □ สร้าง n8n Workflow: OCRchat_Receipt_Handler
  □ ทดสอบส่งรูปใบเสร็จจริงเข้า LINE Bot → ดูผล Gemini
  □ สร้าง Google Sheet 2 ชีต: Expenses + Marketing Stats
  □ สร้างตารางใน Supabase ด้วย SQL ข้างบน

สัปดาห์ที่ 3-4: Full Automation
  □ สร้าง n8n Workflow: Daily_IG_TikTok_FB_Scrape
  □ สร้าง n8n Workflow: OCRchat_Tag_Handler
  □ สร้าง n8n Workflow: Nightly_Sheets_to_Supabase
  □ ทดสอบ end-to-end: ส่งใบเสร็จ → ดูใน Supabase
  □ ตั้ง Discord Webhook แจ้งเตือน Finance

สัปดาห์ที่ 5: Integration + Dashboard
  □ สร้าง campaign_roi view ใน Supabase
  □ เชื่อม Looker Studio กับ Supabase (PostgreSQL connector)
  □ สร้าง 3 หน้า Dashboard ตาม layout ข้างบน
  □ สร้าง n8n Workflow: Campaign_ROI_Calculator
  □ ทดสอบ: ซื้อของจริง → ส่งบิล → ดูใน Dashboard ว่า CPR/CPE เปลี่ยนมั้ย
```
