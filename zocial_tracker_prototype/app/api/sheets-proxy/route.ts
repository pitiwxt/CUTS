import { NextRequest } from "next/server";

const SPREADSHEET_ID = process.env.SHEETS_SPREADSHEET_ID || "";
const SHEET_NAME = "Daily Stats";

// Server-side proxy — bypasses CORS on gviz/tq endpoint
export async function GET(_req: NextRequest) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      return Response.json({ error: `Sheets returned ${res.status}` }, { status: res.status });
    }

    const csv = await res.text();

    // Basic sanity check — gviz sometimes returns an HTML error page
    if (csv.startsWith("<!DOCTYPE") || csv.startsWith("<html")) {
      return Response.json(
        { error: "Sheet not publicly accessible. Go to File → Share → Publish to web (CSV)" },
        { status: 403 }
      );
    }

    return new Response(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
