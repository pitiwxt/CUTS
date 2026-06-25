import { NextRequest } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Groq vision model that supports image input
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  try {
    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) return Response.json({ error: "No image uploaded" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const prompt = `คุณเป็นผู้เชี่ยวชาญอ่านใบเสร็จ/สลิปธนาคาร กรุณาวิเคราะห์รูปนี้และส่งคืนเป็น JSON เท่านั้น ห้ามมีข้อความอื่น

กฎสำคัญ:
1. อ่านข้อความทุกอย่างในรูปให้ครบ รวมถึงชื่อแอป ชื่อธนาคาร โลโก้ ตัวเลข วันที่
2. ถ้าอ่านค่าใดไม่ได้ชัด ให้ "เดา" หรือ "อนุมาน" จากบริบทที่เห็น อย่าใส่ null
3. store_name: ถ้าเป็นสลิปโอนเงิน ใช้ชื่อแอป/ธนาคารที่เห็น เช่น "YouTrip", "KBank", "PromptPay" ถ้าเป็นใบเสร็จร้านค้าใช้ชื่อร้าน
4. receipt_type: เลือกจาก restaurant/retail/ads/transport/other — ถ้าเป็นสลิปโอนเงิน/ท่องเที่ยว ใช้ transport ถ้าเป็นร้านอาหาร ใช้ restaurant
5. items: ใส่รายการสินค้า หรือถ้าไม่มีให้ใส่คำอธิบายสั้นๆ เช่น ["โอนเงิน YouTrip 710 บาท"]
6. total_amount: ดูยอดสุดท้ายหรือยอดรวมหลัก
7. date: ถ้าอ่านปีเป็น พ.ศ. ให้แปลงเป็น ค.ศ. (2568 → 2025, 2569 → 2026)

ส่งคืนในรูปแบบ:
{
  "store_name": "ชื่อร้าน/แอป/ธนาคารที่อนุมานได้",
  "total_amount": ตัวเลข,
  "date": "YYYY-MM-DD",
  "items": ["รายการที่อ่านได้หรืออนุมาน"],
  "receipt_type": "ประเภทที่เหมาะสม"
}`;

    const body = {
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_completion_tokens: 1024,
    };

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      const errMsg = json?.error?.message || JSON.stringify(json);
      return Response.json({ error: `Groq error: ${errMsg}` }, { status: 500 });
    }

    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    let extracted;
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      extracted = {
        store_name: raw || "อ่านไม่ได้",
        total_amount: null,
        date: new Date().toISOString().split("T")[0],
        items: [],
        receipt_type: "other",
      };
    }

    return Response.json(extracted);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
