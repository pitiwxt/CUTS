# 🏛️ Club OS — CUTS Marketing + Finance System

> ระบบบริหารจัดการข้อมูลการตลาดและการเงินอัตโนมัติ สำหรับชมรม **Chula Tech Startup (CUTS)**  
> พัฒนาโดย นายพิธิวัฒน์ ฉิมพลี (โฟร์) ปี 2 — ฝ่าย Innovation

---

## 🚀 Live Demo

**🌐 Website:** https://zocialtrackerprototype.vercel.app  
**📦 GitHub:** https://github.com/pitiwxt/CUTS

---

## 📦 Modules

### 1. 📊 Zocial Tracker (Marketing)
ระบบดึงสถิติ Social Media อัตโนมัติ 4 ชั้น (No Single Point of Failure):
- **Tier 1** — Meta / TikTok API (official)
- **Tier 2a** — Playwright + Gemini Vision (screenshot OCR fallback)
- **Tier 2b** — MCP Browser Agent (natural language control)
- **Tier 3** — Apify public scraper (last resort)

**Features:**
- KPI Dashboard — Reach, Engagement Rate, Virality Score
- Trend charts per platform (Recharts)
- AI Analyst chatbot — ask in Thai, get campaign insights
- Campaign ROI cross-reference via Campaign Tag

### 2. 🧾 OCRchat (Finance)
ระบบสแกนใบเสร็จและบันทึกรายจ่ายอัตโนมัติ:
- Drag & drop receipt image upload
- **Groq Llama 4 Scout Vision** — extracts store, amount, date, items
- AI infers missing fields from context
- Saves to **Supabase** `expenses` table + **Google Sheets** `CUTS-Club-OS`
- Export CSV for manual import

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16 + Tailwind CSS | Dashboard UI |
| AI Vision | Groq `meta-llama/llama-4-scout-17b-16e-instruct` | Receipt OCR |
| AI Chat | Google Gemini | Marketing analyst |
| Database | Supabase PostgreSQL | Core data store |
| Sheets Sync | Google Apps Script webhook | Finance export |
| Scraping | Apify | Social media Tier 3 |
| Deploy | Vercel | Production hosting |

---

## ⚙️ Setup & Development

```bash
# 1. Clone
git clone https://github.com/pitiwxt/CUTS.git
cd CUTS/zocial_tracker_prototype

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in your API keys in .env.local

# 4. Run locally
npm run dev
# → http://localhost:3000

# 5. Build for production
npm run build
```

---

## 🔐 Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ | OCRchat vision model (Llama 4 Scout) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase publishable key |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase secret key (server-side only) |
| `SHEETS_WEBHOOK_URL` | Optional | Apps Script for Sheets auto-sync |
| `APIFY_TOKEN` | Optional | Tier 3 scraper |
| `GEMINI_API_KEY` | Optional | AI chat assistant |

> ⚠️ **Never commit `.env.local` to git.** Already in `.gitignore`.

---

## 🗄️ Database Schema (Supabase)

```sql
-- Marketing data
CREATE TABLE post_stats (
  post_id TEXT, platform TEXT, campaign_tag TEXT,
  reach INT, impressions INT, likes INT,
  comments INT, shares INT, saves INT,
  recorded_at DATE,
  UNIQUE(post_id, recorded_at)
);

-- Finance data
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id TEXT UNIQUE, submitter TEXT,
  store_name TEXT, amount NUMERIC,
  receipt_date DATE, receipt_type TEXT,
  campaign_tag TEXT, status TEXT DEFAULT 'pending',
  recorded_at DATE
);

-- ROI cross-module view
CREATE VIEW campaign_roi AS
  SELECT campaign_tag,
    SUM(reach) AS total_reach,
    SUM(amount) AS total_spend,
    SUM(amount) / NULLIF(SUM(reach), 0) AS cost_per_reach
  FROM post_stats FULL OUTER JOIN expenses USING (campaign_tag)
  GROUP BY campaign_tag;
```

---

## 📁 Project Structure

```
zocial_tracker_prototype/
├── app/
│   ├── api/
│   │   ├── ocr/route.ts          ← Groq vision OCR
│   │   ├── expenses/route.ts     ← Supabase CRUD + Sheets sync
│   │   ├── chat/route.ts         ← Gemini AI analyst
│   │   ├── apify-run/route.ts    ← Tier 3 scraper trigger
│   │   └── sheets-proxy/route.ts ← CORS-safe Sheets reader
│   ├── layout.tsx
│   └── page.tsx                  ← Main SPA (module router)
├── components/
│   ├── Sidebar.tsx               ← Club OS / Zocial / OCRchat nav
│   ├── OCRchatTab.tsx            ← Finance module UI
│   ├── TrendChart.tsx            ← Recharts engagement trends
│   ├── PipelineFlow.tsx          ← 4-tier pipeline visualizer
│   └── ChatInterface.tsx         ← AI analyst chat
├── lib/
│   └── data.ts                   ← Sheets fetcher + mock data
├── .env.example                  ← Template for env vars
└── README.md
```

---

## 📄 License

MIT — Built for Chula Tech Startup Innovation Team Application 2026
