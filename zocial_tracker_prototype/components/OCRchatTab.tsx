"use client";
import { useState, useRef, useCallback } from "react";

type OcrResult = {
  store_name: string | null;
  total_amount: number | null;
  date: string | null;
  items: string[];
  receipt_type: string | null;
};

type ExpenseStatus = "idle" | "scanning" | "done" | "saving" | "saved" | "error";

const RECEIPT_TYPES = ["restaurant", "retail", "ads", "transport", "other"] as const;

async function exportExpensesCSV() {
  const res = await fetch("/api/expenses");
  const data = await res.json();
  if (!data?.length) return alert("ยังไม่มีรายการ");
  const header = ["TX ID", "วันที่", "ร้าน", "ยอด", "ประเภท", "Campaign", "ผู้ส่ง", "สถานะ", "รูปใบเสร็จ"];
  const rows = data.map((r: Record<string, unknown>) => [
    r.tx_id, r.receipt_date, r.store_name, r.amount,
    r.receipt_type, r.campaign_tag, r.submitter, r.status, r.drive_url || "",
  ]);
  const csv = [header, ...rows].map(r => r.map(String).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "CUTS-Club-OS-expenses.csv"; a.click();
}

export default function OCRchatTab() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [form, setForm] = useState<OcrResult & { campaign_tag: string; submitter: string }>({
    store_name: "",
    total_amount: null,
    date: new Date().toISOString().split("T")[0],
    items: [],
    receipt_type: "other",
    campaign_tag: "",
    submitter: "",
  });
  const [status, setStatus] = useState<ExpenseStatus>("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setImageUrl(null);
    setStatus("idle");
    setTxId(null);
    setError(null);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const scanReceipt = async () => {
    if (!image) return;
    setStatus("scanning");
    setError(null);

    try {
      // Upload image to Supabase Storage in parallel with OCR
      const fd = new FormData();
      fd.append("image", image);

      const [ocrRes, uploadRes] = await Promise.all([
        fetch("/api/ocr", { method: "POST", body: fd }),
        fetch("/api/upload-image", { method: "POST", body: fd }),
      ]);

      if (!ocrRes.ok) throw new Error((await ocrRes.json()).error || "OCR failed");
      const data: OcrResult = await ocrRes.json();

      // Store image URL (non-blocking if upload fails)
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        if (uploadData.url) setImageUrl(uploadData.url);
      }

      setForm(prev => ({
        ...prev,
        store_name: data.store_name || "",
        total_amount: data.total_amount,
        date: data.date || prev.date,
        items: data.items || [],
        receipt_type: data.receipt_type || "other",
      }));
      setStatus("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const saveExpense = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, drive_url: imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTxId(data.tx_id);
      setStatus("saved");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const reset = () => {
    setImage(null);
    setPreview(null);
    setImageUrl(null);
    setStatus("idle");
    setTxId(null);
    setError(null);
    setForm({
      store_name: "", total_amount: null,
      date: new Date().toISOString().split("T")[0],
      items: [], receipt_type: "other",
      campaign_tag: "", submitter: "",
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">OCRchat</h2>
          <p className="text-sm mt-1 text-slate-500">อัปโหลดใบเสร็จ → AI อ่านข้อมูล → บันทึกรายจ่าย Supabase + Sheets</p>
        </div>
        <button
          onClick={exportExpensesCSV}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border border-slate-200"
        >
          ⬇️ Export CSV
        </button>
      </div>

      {status === "saved" ? (
        <div className="rounded-xl p-8 text-center border-2 border-emerald-400 bg-emerald-50">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-bold text-lg text-emerald-700">บันทึกแล้ว!</p>
          <p className="text-sm mt-1 text-slate-500">TX ID: <span className="font-mono text-slate-700">{txId}</span></p>
          {imageUrl && (
            <a href={imageUrl} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-emerald-600 underline">
              ดูรูปใบเสร็จที่อัปโหลด →
            </a>
          )}
          <button onClick={reset} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-pink-600 text-white block mx-auto">
            อัปโหลดใบเสร็จใหม่
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`rounded-xl cursor-pointer flex flex-col items-center justify-center min-h-52 transition-all ${
              dragging
                ? "border-2 border-pink-500 bg-pink-50"
                : "border-2 border-dashed border-slate-300 bg-slate-50 hover:border-pink-400 hover:bg-pink-50/30"
            }`}
          >
            {preview ? (
              <img src={preview} alt="receipt" className="max-h-48 max-w-full rounded-lg object-contain" />
            ) : (
              <>
                <div className="text-4xl mb-2">📎</div>
                <p className="text-sm font-medium text-slate-600">วาง หรือ คลิกเลือกรูป</p>
                <p className="text-xs mt-1 text-slate-400">JPG, PNG, WEBP</p>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {/* Scan Panel */}
          <div className="flex flex-col justify-between rounded-xl p-5 bg-white border border-slate-200 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-slate-400">ขั้นตอน</p>
              {[
                { step: "1", label: "อัปโหลดรูปใบเสร็จ", done: !!image },
                { step: "2", label: "กด Scan — AI อ่านข้อมูลพร้อมอัปรูป", done: ["done", "saving", "saved"].includes(status) },
                { step: "3", label: "ตรวจสอบ แก้ไข และบันทึก", done: (["saved"] as string[]).includes(status) },
              ].map(s => (
                <div key={s.step} className="flex items-center gap-3 mb-3">
                  <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                    s.done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                  }`}>
                    {s.done ? "✓" : s.step}
                  </div>
                  <span className={`text-sm ${s.done ? "text-slate-800" : "text-slate-400"}`}>{s.label}</span>
                </div>
              ))}
              {imageUrl && (
                <p className="text-xs text-emerald-600 mt-1">
                  📁 รูปอัปโหลดแล้ว <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="underline">ดูรูป</a>
                </p>
              )}
            </div>

            {error && (
              <p className="text-xs p-2 rounded mb-2 bg-red-50 text-red-600 border border-red-200">❌ {error}</p>
            )}

            <button
              onClick={scanReceipt}
              disabled={!image || status === "scanning" || status === "done"}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-40 text-white ${
                status === "done" ? "bg-emerald-500" : "bg-pink-600 hover:bg-pink-700"
              }`}
            >
              {status === "scanning" ? "⏳ กำลังอ่าน + อัปโหลดรูป..." : status === "done" ? "✅ อ่านแล้ว" : "🔍 Scan ใบเสร็จ"}
            </button>
          </div>
        </div>
      )}

      {/* Form after scan */}
      {(status === "done" || status === "saving" || status === "error") && (
        <div className="rounded-xl p-6 space-y-5 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">ข้อมูลจากใบเสร็จ</h3>
            <span className="text-xs px-2 py-1 rounded bg-pink-50 text-pink-600 border border-pink-200">แก้ไขได้</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="ชื่อร้าน">
              <input className="input-style" value={form.store_name || ""}
                onChange={e => setForm(p => ({ ...p, store_name: e.target.value }))} />
            </InputField>
            <InputField label="ยอดรวม (บาท)">
              <input className="input-style" type="number" value={form.total_amount ?? ""}
                onChange={e => setForm(p => ({ ...p, total_amount: parseFloat(e.target.value) || null }))} />
            </InputField>
            <InputField label="วันที่">
              <input className="input-style" type="date" value={form.date || ""}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </InputField>
            <InputField label="ประเภท">
              <select className="input-style" value={form.receipt_type || "other"}
                onChange={e => setForm(p => ({ ...p, receipt_type: e.target.value }))}>
                {RECEIPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </InputField>
          </div>

          <InputField label="รายการสินค้า (คั่นด้วย Enter)">
            <textarea className="input-style resize-none" rows={3}
              value={(form.items || []).join("\n")}
              onChange={e => setForm(p => ({ ...p, items: e.target.value.split("\n").filter(Boolean) }))} />
          </InputField>

          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-slate-400">ข้อมูลเพิ่มเติม</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Campaign Tag">
                <input className="input-style" placeholder="เช่น Recruiter-2026"
                  value={form.campaign_tag}
                  onChange={e => setForm(p => ({ ...p, campaign_tag: e.target.value }))} />
              </InputField>
              <InputField label="ชื่อผู้ส่ง">
                <input className="input-style" placeholder="ชื่อของคุณ"
                  value={form.submitter}
                  onChange={e => setForm(p => ({ ...p, submitter: e.target.value }))} />
              </InputField>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={saveExpense}
              disabled={status === "saving"}
              className="flex-1 py-3 rounded-lg font-semibold text-sm disabled:opacity-40 bg-pink-600 hover:bg-pink-700 text-white transition-colors"
            >
              {status === "saving" ? "⏳ กำลังบันทึก..." : "💾 บันทึกรายจ่าย + Sync Sheets"}
            </button>
            <button onClick={reset} className="px-4 py-3 rounded-lg text-sm bg-slate-100 text-slate-600 hover:bg-slate-200">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      <style>{`
        .input-style {
          width: 100%;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #1e293b;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input-style:focus { border-color: #db2777; }
        .input-style option { background: #ffffff; }
      `}</style>
    </div>
  );
}

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1 text-slate-500">{label}</label>
      {children}
    </div>
  );
}
