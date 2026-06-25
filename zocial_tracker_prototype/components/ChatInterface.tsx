"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      content: `สวัสดีครับ! ยินดีต้อนรับสู่ **Zocial AI Assistant** 🤖 

ผมคือผู้ช่วยวิเคราะห์ข้อมูลการตลาดของชมรม **Chula Tech Startup 2026** ข้อมูลสถิติของโพสต์ล่าสุดและข้อมูลค่าใช้จ่ายงบประมาณแคมเปญ ถูกโหลดเข้าระบบเรียบร้อยแล้วครับ

คุณสามารถพิมพ์ถามคำถามเพื่อวิเคราะห์สรุปแคมเปญ ROI หรือเปรียบเทียบผลลัพธ์การตลาดได้เลยครับ!`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "สรุปแคมเปญ Recruiter-2026",
    "วิเคราะห์เปรียบเทียบ CPE แคมเปญ",
    "ขอสูตรคำนวณ ER และ CPE"
  ];

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.reply || "ขออภัยครับ เกิดความผิดพลาดในการสื่อสารกับบอท", timestamp: new Date() }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: "❌ ไม่สามารถติดต่อเซิร์ฟเวอร์ AI Assistant ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#1A1D27] border border-[#2D3148] rounded-xl flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="bg-[#202433] border-b border-[#2D3148] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#B81D67] p-2 rounded-lg text-white">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Zocial AI Assistant</span>
              <span className="text-[10px] bg-[#B81D67]/10 border border-[#B81D67]/20 text-[#B81D67] px-1.5 py-0.5 rounded font-bold font-mono">
                Claude 3.5 Sonnet
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">ระบบ AI วิเคราะห์ประสิทธิภาพ ROI การตลาดและประสิทธิภาพแคมเปญชมรม</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#B81D67] font-semibold">
          <Sparkles size={14} className="animate-spin" />
          <span>Real-time Data Active</span>
        </div>
      </div>

      {/* Messages Box */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#141722]/40 scrollbar-thin">
        {messages.map((m, idx) => {
          const isBot = m.role === 'bot';
          return (
            <div key={idx} className={`flex gap-3 max-w-[85%] ${isBot ? '' : 'ml-auto flex-row-reverse'}`}>
              <div className={`p-2.5 rounded-lg flex-shrink-0 h-9 w-9 flex items-center justify-center border ${
                isBot ? 'bg-[#2D3148] border-[#2D3148] text-[#B81D67]' : 'bg-[#B81D67] border-[#B81D67] text-white'
              }`}>
                {isBot ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className={`p-4 rounded-xl text-sm leading-relaxed border ${
                isBot 
                  ? 'bg-[#1A1D27] border-[#2D3148] text-slate-200' 
                  : 'bg-[#B81D67]/10 border-[#B81D67]/30 text-slate-200'
              }`}>
                {/* Parse simple markdown for bolding */}
                <div 
                  className="space-y-2 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: m.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/`(.*?)`/g, '<code class="bg-[#2D3148] px-1 py-0.5 rounded text-xs font-mono">$1</code>')
                  }}
                />
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex gap-3 max-w-[80%]">
            <div className="bg-[#2D3148] border border-[#2D3148] text-[#B81D67] h-9 w-9 rounded-lg flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div className="bg-[#1A1D27] border border-[#2D3148] p-4 rounded-xl text-sm text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#B81D67] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-[#B81D67] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-[#B81D67] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              <span>Claude is thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Questions */}
      <div className="px-5 py-3 border-t border-[#2D3148]/60 bg-[#1A1D27] flex gap-2 flex-wrap items-center">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Suggested:</span>
        {suggestedQuestions.map(q => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            className="text-xs bg-[#252A37] hover:bg-[#2c3242] border border-[#2D3148] text-slate-300 px-3 py-1.5 rounded-full transition-all hover:border-[#3d4361]"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
        className="p-4 border-t border-[#2D3148] bg-[#1A1D27] flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ถามบอทเกี่ยวกับประสิทธิภาพแคมเปญ, คำนวณ ROI, หรือสูตรต่าง ๆ..."
          className="flex-1 bg-[#141722] border border-[#2D3148] rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#B81D67] transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`bg-[#B81D67] text-white p-2.5 rounded-lg transition-all flex items-center justify-center ${
            !input.trim() || isLoading 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-[#a01657] shadow-lg shadow-[#B81D67]/15'
          }`}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
