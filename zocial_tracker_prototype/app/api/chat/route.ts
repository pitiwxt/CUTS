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
      ${JSON.stringify(INITIAL_POSTS, null, 2)}

      === ข้อมูลแคมเปญ ===
      ${JSON.stringify(INITIAL_CAMPAIGNS, null, 2)}

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
    return Response.json({ reply: `❌ เกิดข้อผิดพลาดในการดึงข้อมูลจาก AI: ${error.message}` }, { status: 500 });
  }
}
