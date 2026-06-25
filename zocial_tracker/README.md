# Zocial Tracker — Production Pipeline Codebase

นี่คือชุดโค้ดระบบจริงของระบบ **Zocial Tracker** สำหรับดึงข้อมูลสถิติคอนเทนต์อัตโนมัติ (ฝ่าย Marketing) ของชมรม **Chula Tech Startup 2026**

---

## 📂 โครงสร้างโฟลเดอร์

* `scraper_vision.js` — สคริปต์ Playwright + Gemini 1.5 Flash ดึงหน้าจอโพสต์มาถอดข้อมูล OCR
* `sheets_client.js` — ตัวเชื่อมต่อและอัปเดตแถวข้อมูลลงใน Google Sheets
* `supabase_client.js` — ตัวเชื่อมต่อข้อมูลลง Supabase PostgreSQL และ SQLite ท้องถิ่น
* `orchestrator.js` — ตัวรัน Logic Pipeline ทั้งหมด (ดึงข้อมูล -> คำนวณสูตร -> บันทึกส่งต่อ)
* `schema.sql` — โครงสร้างคำสั่ง SQL สำหรับเอาไปสร้างตารางในฐานข้อมูล Supabase
* `n8n_workflows/` — โฟลเดอร์เก็บเทมเพลต JSON นำเข้าสำหรับ workflow บน n8n

---

## ⚙️ ขั้นตอนการติดตั้งและการตั้งค่าระบบ

### 1. ติดตั้ง Dependencies และเว็บบราวเซอร์ Playwright
เปิด Terminal ในโฟลเดอร์โครงการนี้ แล้วรันคำสั่งดังนี้:
```bash
npm install
npx playwright install chromium
```

### 2. ตั้งค่าคีย์และบัญชีใช้งาน (.env)
คัดลอกไฟล์ต้นแบบ `.env.example` ไปเป็น `.env`:
```bash
cp .env.example .env
```
เปิดไฟล์ `.env` แล้วกรอก API keys ของคุณ:
* `GEMINI_API_KEY`: สมัครรับคีย์ได้ฟรีที่ [Google AI Studio](https://aistudio.google.com/)
* `SUPABASE_URL` และ `SUPABASE_SERVICE_KEY`: ดูได้จากหน้า API Settings บน Supabase
* `GOOGLE_SHEET_ID`: คัดลอกไอดีจาก URL หน้าเบราว์เซอร์ของ Google Sheet ชมรม
* วางไฟล์ `service_account.json` ของ Google Cloud ลงในโฟลเดอร์นี้เพื่อเข้าใช้งาน Sheets

### 3. รันคำสั่งโครงสร้างฐานข้อมูล
นำโค้ด SQL จากไฟล์ [schema.sql](schema.sql) ไปคัดลอกรันใน **SQL Editor** ของ Supabase เพื่อสร้างตาราง `post_stats` และดัชนีชี้วัดความเร็ว

---

## ⚡ วิธีการรันและทดสอบระบบ

### รันระบบจำลองในโหมด Dry-run (ทดสอบโดยยังไม่ต้องใส่คีย์จริง)
เพื่อตรวจสอบการรันฟังก์ชัน คำนวณสูตรคณิตศาสตร์ และบันทึกลงฐานข้อมูล SQLite ท้องถิ่นจำลอง สามารถรันคำสั่งนี้:
```bash
npm run test
```
ระบบจะรันผ่าน SQLite ท้องถิ่นชื่อ `local_tracker.db` และทดลองคำนวณและแสดงตารางผลลัพธ์ผ่านหน้าจอทันที

### รันเชื่อมต่อระบบจริงเพื่ออัปเดตข้อมูลขึ้นคลาวด์
เมื่อใส่คีย์จริงใน `.env` และผูก Google Sheet/Supabase แล้ว ให้รันคำสั่งนี้:
```bash
npm start
```

---

## 🔗 วิธีการเปิดใช้งานบน n8n

1. เข้า n8n Dashboard ของคุณ
2. กดสร้าง Workflow ใหม่
3. คลิกขวาตรงพื้นที่ว่าง เลือก **Import from File** จากนั้นอัปโหลดไฟล์ JSON จากโฟลเดอร์ `n8n_workflows/`
4. ตั้งค่าตัวแปรสภาพแวดล้อม (Environment Variables) หรือ Credentials ใน n8n ให้ตรงกับค่าในเครื่อง
