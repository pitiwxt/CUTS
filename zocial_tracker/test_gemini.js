const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function main() {
  console.log("Testing with GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent("Hello, are you there?");
    console.log("Success with gemini-1.5-flash:", result.response.text());
  } catch (err) {
    console.error("Failed with gemini-1.5-flash:", err.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent("Hello, are you there?");
    console.log("Success with gemini-pro:", result.response.text());
  } catch (err) {
    console.error("Failed with gemini-pro:", err.message);
  }
}

main().catch(console.error);
