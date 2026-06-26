import { INITIAL_POSTS, INITIAL_CAMPAIGNS } from "../../../lib/data";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const apiKey = process.env.GROQ_CHAT_KEY || "";
    if (!apiKey) {
      return Response.json({ reply: "❌ กรุณาตั้งค่า `GROQ_CHAT_KEY` ใน Environment Variables เพื่อใช้งาน AI Assistant" });
    }

    const systemPrompt = `คุณคือบอทวิเคราะห์ข้อมูลการตลาดของชมรม Chula Tech Startup 2026
ตอบเป็นภาษาไทย กระชับ และใช้ตัวเลขจริงจากข้อมูลด้านล่างเสมอ
ถ้าถามเรื่องสูตร ให้อธิบายพร้อมตัวเลขจาก dataset นี้
หลีกเลี่ยงการใช้ markdown ตกแต่งเว้นเสียแต่เป็นตัวหนา (เช่น **ข้อความ**) หรือจัดรูปแบบรายการ

=== ข้อมูลโพสต์ปัจจุบัน ===
${JSON.stringify(INITIAL_POSTS, null, 2)}

=== ข้อมูลแคมเปญ ===
${JSON.stringify(INITIAL_CAMPAIGNS, null, 2)}

=== สูตรที่ใช้ ===
ER (Engagement Rate) = (Likes + Comments + Shares + Saves) / Reach * 100
VS (Virality Score) = Shares / Reach * 100
CPR (Cost per Reach) = Spend / Reach
CPE (Cost per Engagement) = Spend / Total Engagements

เมื่อสรุปแคมเปญ ให้แสดง: Reach, ER%, Spend, CPR, CPE และประเมินความคุ้มค่าเสมอ (เปรียบเทียบความคุ้มค่าข้ามแคมเปญ)`;

    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "ไม่สามารถตอบได้ในขณะนี้";
    return Response.json({ reply });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Groq Chat API error:", msg);
    return Response.json({ reply: `❌ เกิดข้อผิดพลาด: ${msg}` }, { status: 500 });
  }
}
