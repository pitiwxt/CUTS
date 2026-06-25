import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const supabase = createClient(supabaseUrl, supabaseKey);

// Optional: Google Apps Script web app URL for Sheets append
const SHEETS_WEBHOOK = process.env.SHEETS_WEBHOOK_URL || "";

async function appendToSheets(row: Record<string, unknown>) {
  if (!SHEETS_WEBHOOK) return;
  try {
    // Use GET with query params — Apps Script POST redirect drops the body
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(row)) {
      if (v !== null && v !== undefined) params.append(k, String(v));
    }
    await fetch(`${SHEETS_WEBHOOK}?${params.toString()}`, { method: "GET" });
  } catch {
    // Sheets sync failure is non-critical
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const txId = `TX-${Date.now().toString().slice(-8)}`;
  const today = new Date().toISOString().split("T")[0];

  const row = {
    tx_id: txId,
    submitter: body.submitter || "web",
    store_name: body.store_name || null,
    amount: parseFloat(body.total_amount) || 0,
    receipt_date: body.date || today,
    receipt_type: body.receipt_type || "other",
    campaign_tag: body.campaign_tag || "",
    drive_url: null,
    status: "pending",
    recorded_at: today,
  };

  const { data, error } = await supabase
    .from("expenses")
    .insert(row)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Async append to Google Sheets (non-blocking)
  appendToSheets({
    ...row,
    items: body.items || [],
    sheet_tab: "CUTS-Club-OS",
  });

  return Response.json({ success: true, tx_id: txId, data });
}

export async function PATCH(req: NextRequest) {
  const { tx_id, status, campaign_tag } = await req.json();
  if (!tx_id) return Response.json({ error: "tx_id required" }, { status: 400 });

  const updates: Record<string, string> = {};
  if (status) updates.status = status;
  if (campaign_tag !== undefined) updates.campaign_tag = campaign_tag;

  const { error } = await supabase.from("expenses").update(updates).eq("tx_id", tx_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
