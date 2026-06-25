# Zocial Tracker — Redesign Brief
## สำหรับ AI Agent ที่รับผิดชอบแก้ไข Frontend + Backend

---

## 1. ปัญหาของเวอร์ชันปัจจุบัน (v1.0)

### ปัญหา UX/Visual
- หน้าตาดูเหมือน "รายงาน PDF" ไม่ใช่ dashboard จริง
- layout เป็น single column ยาวลงมา ต้อง scroll มากเกินไป
- ไม่มี sidebar / navigation — ไม่รู้ว่ามีกี่ section
- ตาราง "คลังข้อมูลดิบ" ไม่โหลดข้อมูลจริง (empty table)
- ไม่มี chart จริง มีแค่ตัวเลข scorecard
- สีและ typography ดูไม่ professional — ใช้สีขาวพื้นธรรมดา ไม่มี design system
- Bot simulator ทำงานได้แค่ตอบ hardcode ไม่ได้ต่อ AI จริง

### ปัญหา Functionality
- ปุ่ม "เริ่มจำลอง" แสดง animation แต่ไม่ดึงข้อมูลจริงจากไหนเลย
- Filter Campaign Tag ไม่ทำงาน (ตารางว่างอยู่แล้ว)
- ตัวเลข Reach/Engage เป็น hardcode ไม่ได้คำนวณจากข้อมูลจริง
- ไม่มี chart แสดงแนวโน้มรายวัน/รายสัปดาห์

---

## 2. เป้าหมายของ v2.0

**"ดูเหมือนระบบ dashboard จริง ที่ทีม marketing ชมรมจะเปิดใช้ทุกเช้า"**

ผู้ใช้งาน 2 กลุ่ม:
- **ฝ่ายบริหาร** — เปิดดู KPI summary, แนวโน้ม, คำนวณ ROI ข้ามแผนก
- **ฝ่าย Innovation (โฟร์)** — demo ให้คณะกรรมการดูว่าระบบทำงานอย่างไร

---

## 3. Design System ที่ต้องใช้

### Color Palette
```
Background:   #0F1117  (dark navy — ไม่ใช่ขาว)
Surface:      #1A1D27  (card background)
Border:       #2D3148  (card border)
Primary:      #B81D67  (chulapink — ใช้สำหรับ accent และ CTA)
Success:      #22C55E  (green — ER สูง, status online)
Warning:      #F59E0B  (amber — fallback tier)
Danger:       #EF4444  (red — tier ล้มเหลว)
Text:         #F1F5F9  (white-ish)
Text Muted:   #64748B  (gray)
```

### Typography
```
Font: Inter หรือ Geist Sans
Headers: font-weight 700, letter-spacing tight
Body: font-weight 400, line-height 1.6
Monospace: สำหรับ log และ code
```

### Layout
```
Desktop: 2-column layout
  - Sidebar ซ้าย: 220px (navigation)
  - Main content ขวา: flex-fill
Mobile: hamburger menu + bottom tab bar
```

---

## 4. Frontend — โครงสร้างหน้าใหม่ทั้งหมด

### 4.1 Sidebar (ซ้าย — fixed)
```
ZOCIAL TRACKER
Chula Tech Startup 2026
[status dot: ● Live]

Navigation:
─────────────
📊  Overview
📈  Performance
🔄  Pipeline Status
🗄️  Data Table
🤖  AI Assistant
⚙️  Settings
```

### 4.2 Header Bar (บน)
```
[ชื่อ section ปัจจุบัน]          [🔔] [Last synced: 02:04 AM ✓] [Run Now ▶]
```

### 4.3 Page: Overview (หน้าหลัก)

**Row 1 — KPI Scorecards (4 card แนวนอน)**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total Reach  │ │ Total Engage │ │  Avg. ER     │ │  Best Post   │
│   33,300     │ │   5,395      │ │   16.2%      │ │  TT_2602     │
│ ▲12% 7d      │ │ ▲18% 7d      │ │ ✨ Above avg │ │  ER 18.0%    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**Row 2 — Charts (2 column)**
```
┌─────────────────────────────┐ ┌─────────────────────┐
│  Reach & ER Trend (7 days)  │ │  Platform Breakdown  │
│  [Line chart dual axis]     │ │  [Donut chart]       │
│  x: วันที่ y1: reach y2: ER │ │  IG / TT / FB        │
└─────────────────────────────┘ └─────────────────────┘
```

**Row 3 — Campaign ROI Table**
```
┌─────────────────────────────────────────────────────────────┐
│  Campaign Performance                    [Filter ▼]         │
│  Campaign Tag    Reach    ER%    Spend   CPR      CPE       │
│  Recruiter-2026  22,700  16.2%  ฿1,950  ฿0.08   ฿0.53     │
│  Workshop-AI      1,100   5.0%  ฿3,200  ฿2.90   ฿58.18    │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Page: Pipeline Status (ที่ควรดูสวยที่สุด)

แสดง real-time pipeline แบบ flow diagram — ไม่ใช่แค่ list

```
[n8n Scheduler 02:00]
       ↓ triggered
  ┌─────────────────────────────────────────────────┐
  │              ACQUISITION PIPELINE               │
  │                                                 │
  │  ● Tier 1: Meta/TikTok API    [✅ SUCCESS]       │
  │    └─ 02:02:14  Fetched 4 posts                 │
  │                                                 │
  │  ○ Tier 2a: Playwright+Vision [⏭ SKIPPED]       │
  │  ○ Tier 2b: MCP Browser       [⏭ SKIPPED]       │
  │  ○ Tier 3: Apify              [⏭ SKIPPED]       │
  └─────────────────────────────────────────────────┘
       ↓ data ready
  [Google Sheets Buffer] ──sync──► [Supabase PostgreSQL]
       ↓
  [Looker Studio Dashboard]    [Claude AI Chat]
```

Animation: เมื่อกด "Run Simulation" ให้แสดง animated flow จาก node ไป node

### 4.5 Page: AI Assistant

ออกแบบให้ดูเหมือน Chat interface จริง ไม่ใช่ widget มุมหน้าจอ

```
┌────────────────────────────────────────────────┐
│  🤖 Zocial AI Assistant                        │
│  Powered by Claude API                         │
├────────────────────────────────────────────────┤
│                                                │
│  [AI bubble] สวัสดีครับ! ผมคือบอทของชมรม...   │
│                                                │
│  [User bubble] สรุปแคมเปญ Recruiter-2026       │
│                                                │
│  [AI bubble] แคมเปญ Recruiter-2026 มี...       │
│    📊 Reach: 22,700  ER: 16.2%                 │
│    💰 Spend: ฿1,950  CPR: ฿0.08               │
│    ✅ คุ้มค่ากว่า Workshop-AI 36x              │
│                                                │
├────────────────────────────────────────────────┤
│  [Suggested] สรุป Recruiter | วิเคราะห์ CPE   │
│  ┌──────────────────────────────────[ส่ง ▶]─┐  │
│  │ พิมพ์คำถาม...                            │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

## 5. Backend — สิ่งที่ต้องเปลี่ยน/เพิ่ม

### 5.1 Data Layer (แทน hardcode)

**สร้างไฟล์ `lib/data.js` หรือ `lib/mockData.ts`:**

```javascript
// ข้อมูลจำลองที่ realistic — ใช้แทน hardcode กระจัดกระจาย
export const POSTS = [
  {
    post_id: "IG_2601",
    platform: "instagram",
    content_type: "reel",
    reach: 4500,
    likes: 810,
    comments: 67,
    shares: 0,
    saves: 23,
    engagement_rate: 20.0,
    virality_score: 0,
    data_source: "api",
    campaign_tag: "Recruiter-2026",
    recorded_at: "2026-06-20"
  },
  {
    post_id: "TT_2602",
    platform: "tiktok",
    content_type: "video",
    reach: 18200,
    likes: 2184,
    comments: 273,
    shares: 273,
    saves: 0,
    engagement_rate: 15.0,
    virality_score: 1.5,
    data_source: "apify",
    campaign_tag: "Recruiter-2026",
    recorded_at: "2026-06-21"
  },
  {
    post_id: "FB_2603",
    platform: "facebook",
    content_type: "image",
    reach: 1100,
    likes: 44,
    comments: 7,
    shares: 4,
    saves: 0,
    engagement_rate: 5.0,
    virality_score: 0.36,
    data_source: "apify",
    campaign_tag: "Workshop-AI",
    recorded_at: "2026-06-22"
  },
  {
    post_id: "TT_2605",
    platform: "tiktok",
    content_type: "video",
    reach: 9500,
    likes: 1615,
    comments: 95,
    shares: 95,
    saves: 0,
    engagement_rate: 18.0,
    virality_score: 1.0,
    data_source: "apify",
    campaign_tag: "Recruiter-2026",
    recorded_at: "2026-06-23"
  }
];

export const CAMPAIGNS = [
  {
    tag: "Recruiter-2026",
    spend: 1950,
    totalReach: 32200,
    totalEngage: 5415,
    cpr: 0.06,
    cpe: 0.36
  },
  {
    tag: "Workshop-AI",
    spend: 3200,
    totalReach: 1100,
    totalEngage: 55,
    cpr: 2.91,
    cpe: 58.18
  }
];

// ข้อมูลสำหรับ Trend Chart (7 วัน)
export const TREND_DATA = [
  { date: "6/19", reach: 4500, er: 20.0 },
  { date: "6/20", reach: 18200, er: 15.0 },
  { date: "6/21", reach: 0, er: 0 },
  { date: "6/22", reach: 1100, er: 5.0 },
  { date: "6/23", reach: 9500, er: 18.0 },
  { date: "6/24", reach: 0, er: 0 },
  { date: "6/25", reach: 0, er: 0 }
];
```

### 5.2 Gemini API Integration (AI Assistant จริง)

**สร้าง API Route: `app/api/chat/route.ts`**

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import { INITIAL_POSTS, INITIAL_CAMPAIGNS } from "../../../lib/data";

const apiKey = process.env.GEMINI_API_KEY || "";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    if (!apiKey) {
      return Response.json({ reply: "❌ กรุณาตั้งค่า `GEMINI_API_KEY` ใน Environment Variables เพื่อใช้งาน AI Assistant" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `
      คุณคือบอทวิเคราะห์ข้อมูลการตลาดของชมรม Chula Tech Startup 2026
      ตอบเป็นภาษาไทย กระชับ และใช้ตัวเลขจริงจากข้อมูลด้านล่างเสมอ
      ถ้าถามเรื่องสูตร ให้อธิบายพร้อมตัวเลขจาก dataset นี้
      หลีกเลี่ยงการใช้ markdown ตกแต่งเว้นเสียแต่เป็นตัวหนา (เช่น **ข้อความ**) หรือจัดรูปแบบรายการ
      
      === ข้อมูลโพสต์ปัจจุบัน ===
      \${JSON.stringify(INITIAL_POSTS, null, 2)}

      === ข้อมูลแคมเปญ ===
      \${JSON.stringify(INITIAL_CAMPAIGNS, null, 2)}

      === สูตรที่ใช้ ===
      ER (Engagement Rate) = (Likes + Comments + Shares + Saves) / Reach * 100
      VS (Virality Score) = Shares / Reach * 100
      CPR (Cost per Reach) = Spend / Reach
      CPE (Cost per Engagement) = Spend / Total Engagements

      เมื่อสรุปแคมเปญ ให้แสดง: Reach, ER%, Spend, CPR, CPE และประเมินความคุ้มค่าเสมอ (เปรียบเทียบความคุ้มค่าข้ามแคมเปญ)
    `;

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\nกรุณายืนยันว่าเข้าใจบริบทข้อมูลการตลาดทั้งหมดแล้ว" }]
        },
        {
          role: "model",
          parts: [{ text: "เข้าใจบริบทข้อมูลการตลาดทั้งหมดของชมรม Chula Tech Startup 2026 แล้วครับ พร้อมวิเคราะห์ด้วยข้อมูลจริงและสูตรที่กำหนดทันที" }]
        }
      ]
    });

    const result = await chat.sendMessage(message);
    const replyText = result.response.text();

    return Response.json({ reply: replyText });
  } catch (error: any) {
    console.error("Gemini Chat API error:", error);
    return Response.json({ reply: \`❌ เกิดข้อผิดพลาดในการดึงข้อมูลจาก AI: \${error.message}\` }, { status: 500 });
  }
}
```
```

### 5.3 Pipeline Simulation (แทน animation hardcode)

**สร้าง `lib/pipeline.ts`:**

```typescript
export type TierStatus = "idle" | "running" | "success" | "failed" | "skipped";

export interface PipelineStep {
  id: string;
  label: string;
  tier: string;
  tools: string[];
  status: TierStatus;
  message: string;
  duration?: number; // ms
}

// จำลองการรัน pipeline ทีละขั้น
export async function runPipelineSimulation(
  onUpdate: (steps: PipelineStep[]) => void
): Promise<PipelineStep[]> {
  const steps: PipelineStep[] = [
    { id: "tier1", label: "Meta/TikTok API", tier: "Tier 1", tools: ["Meta API", "TikTok API"], status: "idle", message: "Waiting..." },
    { id: "tier2a", label: "Playwright + Gemini Vision", tier: "Tier 2a", tools: ["Playwright", "Gemini"], status: "idle", message: "Standby" },
    { id: "tier2b", label: "MCP Browser Agent", tier: "Tier 2b", tools: ["MCP Protocol"], status: "idle", message: "Standby" },
    { id: "tier3", label: "Apify Scrapers", tier: "Tier 3", tools: ["Apify"], status: "idle", message: "Standby" },
  ];

  // Tier 1: สำเร็จเสมอ (จำลอง)
  steps[0].status = "running";
  steps[0].message = "Connecting to Meta Graph API...";
  onUpdate([...steps]);
  await delay(1200);

  steps[0].status = "success";
  steps[0].message = "Fetched 4 posts ✓";
  steps[0].duration = 1200;
  onUpdate([...steps]);

  // Tier 2, 3: skip เพราะ Tier 1 สำเร็จ
  for (let i = 1; i < steps.length; i++) {
    steps[i].status = "skipped";
    steps[i].message = "Skipped (Tier 1 succeeded)";
  }
  onUpdate([...steps]);

  return steps;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
```

---

## 6. Tech Stack ที่ใช้

```
Framework:    Next.js 14 (App Router)
Styling:      Tailwind CSS
Charts:       Recharts
Icons:        Lucide React
AI:           Google Generative AI SDK (@google/generative-ai)
Deploy:       Vercel
```

---

## 7. ไฟล์ที่ต้องสร้าง/แก้ (File Structure)

```
app/
  layout.tsx              ← เพิ่ม RootLayout ครอบระบบ
  page.tsx                ← หน้า Dashboard หลัก (สลับ Tab: Overview, Performance, Pipeline, Data, Chat)
  globals.css             ← สไตล์โกลบอลและ scrollbar
  api/
    chat/route.ts         ← Gemini 2.5 API endpoint

components/
  Sidebar.tsx             ← Navigation sidebar
  KPICard.tsx             ← Scorecard component
  TrendChart.tsx          ← Recharts line chart
  PlatformDonut.tsx       ← Recharts donut chart
  CampaignTable.tsx       ← Sortable/filterable table
  PipelineFlow.tsx        ← Animated pipeline diagram
  ChatInterface.tsx       ← Full-page chat UI

lib/
  data.ts                 ← Mock data & Google Sheets live loader
  pipeline.ts             ← Pipeline simulation logic
```

---

## 8. สิ่งที่ต้องทำทีละขั้น (Checklist สำหรับ AI)

```
Phase 1 — Layout & Design System
  ☑ เปลี่ยน background เป็น dark (#0F1117)
  ☑ สร้าง Sidebar component พร้อม navigation
  ☑ สร้าง layout.tsx ครอบ sidebar + main content
  ☑ ย้ายข้อมูลทั้งหมดเข้า lib/data.ts

Phase 2 — Overview Page
  ☑ สร้าง KPICard component (4 cards)
  ☑ สร้าง TrendChart (Recharts LineChart dual axis)
  ☑ สร้าง PlatformDonut (Recharts PieChart)
  ☑ สร้าง CampaignTable พร้อม filter

Phase 3 — Pipeline Page
  ☑ สร้าง PipelineFlow component (animated)
  ☑ เชื่อม runPipelineSimulation กับ UI
  ☑ แสดง n8n execution log แบบ real-time scroll

Phase 4 — AI Assistant
  ☑ สร้าง api/chat/route.ts (Gemini 2.5 API)
  ☑ สร้าง ChatInterface component
  ☑ เชื่อม suggested questions กับ API
  ☑ แสดง loading state ระหว่าง AI ตอบ

Phase 5 — Polish
  ☑ Responsive mobile (hamburger menu)
  ☑ Transition/animation ระหว่าง page
  ☑ Error states สำหรับทุก component
```

---

## 9. ตัวอย่าง Component สำคัญ

### KPICard.tsx
```tsx
interface KPICardProps {
  icon: string;
  label: string;
  value: string;
  change: string;        // "+12% vs 7 วันก่อน"
  changeType: "up" | "down" | "neutral";
  badge?: string;        // "✨ สูงกว่าเกณฑ์"
}
```

### PipelineFlow.tsx
```tsx
// แสดง node แต่ละ tier เป็น card
// status: idle = gray border
//         running = amber border + pulse animation
//         success = green border + checkmark
//         failed = red border + X
//         skipped = gray dashed border + →
// เชื่อม node ด้วยเส้น arrow (SVG หรือ CSS)
```

### ChatInterface.tsx
```tsx
// messages: { role: "user"|"ai", content: string, timestamp: Date }[]
// ส่ง POST /api/chat { message: string }
// แสดง typing indicator ระหว่างรอ
// Suggested questions เป็นปุ่มให้กดได้
```

---

## 10. Environment Variables ที่ต้องตั้งใน Vercel

```env
GEMINI_API_KEY=AIzaSyDdYURaB-obOsRCzhUfezO9zSxD-BYtOBs
```

ไม่ต้องมี env อื่น นอกจากคีย์ API ของ Gemini เพื่อเรียกใช้ AI Assistant ในระบบจริง
```
