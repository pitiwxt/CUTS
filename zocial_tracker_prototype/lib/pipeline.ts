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

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Simulates the pipeline execution step-by-step
export async function runPipelineSimulation(
  onUpdate: (steps: PipelineStep[], newLogLine: string) => void
): Promise<PipelineStep[]> {
  const steps: PipelineStep[] = [
    { id: "tier1", label: "Meta/TikTok API", tier: "Tier 1", tools: ["Meta API", "TikTok API"], status: "idle", message: "Waiting..." },
    { id: "tier2a", label: "Playwright + Gemini Vision", tier: "Tier 2a", tools: ["Playwright", "Gemini 2.5"], status: "idle", message: "Standby" },
    { id: "tier2b", label: "MCP Browser Agent", tier: "Tier 2b", tools: ["MCP Protocol"], status: "idle", message: "Standby" },
    { id: "tier3", label: "Apify Scrapers", tier: "Tier 3", tools: ["Apify Bot"], status: "idle", message: "Standby" },
  ];

  const nowStr = () => new Date().toLocaleTimeString();

  // Initialize
  onUpdate([...steps], `[${nowStr()}] [system] Daily Acquisiton cron triggered (Scheduled 02:00 AM)...`);
  await delay(800);

  // Tier 1: Try Primary APIs
  steps[0].status = "running";
  steps[0].message = "Connecting to Meta Graph API and TikTok Web API...";
  onUpdate([...steps], `[${nowStr()}] [api] Trying Tier 1 (Official APIs) connection...`);
  await delay(1200);

  // Simulate API Failure (e.g. rate limit / token expired)
  steps[0].status = "failed";
  steps[0].message = "Rate limit exceeded / Token expired (401)";
  steps[0].duration = 1200;
  onUpdate([...steps], `[${nowStr()}] [api] ❌ Tier 1 Failed: Rate limit exceeded or access token expired. Failover triggered!`);
  await delay(1000);

  // Tier 2a: Try Playwright + Gemini Vision
  steps[1].status = "running";
  steps[1].message = "Launching Playwright headless & capturing screenshots...";
  onUpdate([...steps], `[${nowStr()}] [vision] Launching Playwright Chromium, navigating to profiles...`);
  await delay(1500);

  steps[1].message = "Analyzing screenshots with Gemini 2.5 Flash OCR...";
  onUpdate([...steps], `[${nowStr()}] [vision] Screenshot taken. Requesting Gemini 2.5 Vision analysis...`);
  await delay(1500);

  // Simulate captcha/login block on TikTok/Instagram
  steps[1].status = "failed";
  steps[1].message = "Login wall on IG & Captcha on TikTok";
  steps[1].duration = 3000;
  onUpdate([...steps], `[${nowStr()}] [vision] ❌ Tier 2a Failed: Blocked by Instagram Login Wall and TikTok Captcha slider.`);
  await delay(1000);

  // Tier 2b: Try MCP Browser Agent (Antigravity proxy)
  steps[2].status = "running";
  steps[2].message = "Handing off to Antigravity Browser Agent...";
  onUpdate([...steps], `[${nowStr()}] [mcp] Routing target URLs to Antigravity Agent MCP proxy...`);
  await delay(1200);

  steps[2].status = "failed";
  steps[2].message = "Proxy endpoint timeout / blocked by Cloudflare";
  steps[2].duration = 1200;
  onUpdate([...steps], `[${nowStr()}] [mcp] ❌ Tier 2b Failed: Browser agent timeout on Cloudflare checkpoint.`);
  await delay(1000);

  // Tier 3: Try Apify Scrapers
  steps[3].status = "running";
  steps[3].message = "Spawning Apify Actors with rotating residential proxies...";
  onUpdate([...steps], `[${nowStr()}] [apify] Triggering Apify actors (apify~instagram, clockworks~tiktok, apify~facebook)...`);
  await delay(1500);

  steps[3].message = "Fetching datasets from Apify Storage...";
  onUpdate([...steps], `[${nowStr()}] [apify] Apify actors succeeded. Downloading and parsing JSON datasets...`);
  await delay(1500);

  steps[3].status = "success";
  steps[3].message = "Scraped 9 posts successfully!";
  steps[3].duration = 3000;
  onUpdate([...steps], `[${nowStr()}] [apify] ✅ Tier 3 Succeeded: Fetched 9 posts from IG, TT, and FB.`);
  await delay(1000);

  onUpdate([...steps], `[${nowStr()}] [system] Syncing scraped data to Google Sheets...`);
  await delay(1200);
  onUpdate([...steps], `[${nowStr()}] [system] 🔑 Sheets: service_account.json authenticated. Written 9 rows to 'Daily Stats'.`);

  onUpdate([...steps], `[${nowStr()}] [system] Syncing data to Supabase PostgreSQL database...`);
  await delay(1000);
  onUpdate([...steps], `[${nowStr()}] [system] 💾 Supabase: Upserted 9 rows successfully into table 'public.post_stats'.`);

  onUpdate([...steps], `[${nowStr()}] [system] 🎉 Cron job completed successfully!`);

  return steps;
}
