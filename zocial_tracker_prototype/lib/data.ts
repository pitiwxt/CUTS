// Centralized data and Google Sheets loader for Zocial Tracker

export interface Post {
  post_id: string;
  platform: string;
  content_type: string;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate: number;
  virality_score: number;
  data_source: string;
  campaign_tag: string;
  recorded_at: string;
}

export interface Campaign {
  tag: string;
  spend: number;
  totalReach: number;
  totalEngage: number;
  cpr: number;
  cpe: number;
}

export interface TrendPoint {
  date: string;
  reach: number;
  er: number;
}

// Initial Mock Data (Realistic fallback)
export const INITIAL_POSTS: Post[] = [
  {
    post_id: "IG_2601",
    platform: "instagram",
    content_type: "reel",
    reach: 4500,
    likes: 810,
    comments: 67,
    shares: 0,
    saves: 23,
    engagement_rate: 20.0,
    virality_score: 0,
    data_source: "api",
    campaign_tag: "Recruiter-2026",
    recorded_at: "2026-06-20"
  },
  {
    post_id: "TT_2602",
    platform: "tiktok",
    content_type: "video",
    reach: 18200,
    likes: 2184,
    comments: 273,
    shares: 273,
    saves: 0,
    engagement_rate: 15.0,
    virality_score: 1.5,
    data_source: "apify",
    campaign_tag: "Recruiter-2026",
    recorded_at: "2026-06-21"
  },
  {
    post_id: "FB_2603",
    platform: "facebook",
    content_type: "image",
    reach: 1100,
    likes: 44,
    comments: 7,
    shares: 4,
    saves: 0,
    engagement_rate: 5.0,
    virality_score: 0.36,
    data_source: "apify",
    campaign_tag: "Workshop-AI",
    recorded_at: "2026-06-22"
  },
  {
    post_id: "TT_2605",
    platform: "tiktok",
    content_type: "video",
    reach: 9500,
    likes: 1615,
    comments: 95,
    shares: 95,
    saves: 0,
    engagement_rate: 18.0,
    virality_score: 1.0,
    data_source: "apify",
    campaign_tag: "Recruiter-2026",
    recorded_at: "2026-06-23"
  }
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    tag: "Recruiter-2026",
    spend: 1950,
    totalReach: 32200,
    totalEngage: 5415,
    cpr: 0.06,
    cpe: 0.36
  },
  {
    tag: "Workshop-AI",
    spend: 3200,
    totalReach: 1100,
    totalEngage: 55,
    cpr: 2.91,
    cpe: 58.18
  }
];

export const INITIAL_TREND_DATA: TrendPoint[] = [
  { date: "6/19", reach: 4500, er: 20.0 },
  { date: "6/20", reach: 18200, er: 15.0 },
  { date: "6/21", reach: 0, er: 0 },
  { date: "6/22", reach: 1100, er: 5.0 },
  { date: "6/23", reach: 9500, er: 18.0 },
  { date: "6/24", reach: 0, er: 0 },
  { date: "6/25", reach: 0, er: 0 }
];

export const SPREADSHEET_ID = "1mOrmQ8JgnCHgvzAtMWJrC2Mhj2jDCIT9J1sw0XRoqpc";
export const SHEET_NAME = "Daily Stats";
export const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

// Helper to parse CSV (similar to local app.js parser)
export function parseCSV(csvText: string): any[] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip next quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField);
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        currentLine.push(currentField);
        currentField = '';
        if (currentLine.length > 1 || currentLine[0] !== '') {
          lines.push(currentLine);
        }
        currentLine = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
      } else {
        currentField += char;
      }
    }
  }
  if (currentLine.length > 0 || currentField !== '') {
    currentLine.push(currentField);
    lines.push(currentLine);
  }
  
  if (lines.length === 0) return [];
  
  const headers = lines[0].map(h => h.trim());
  return lines.slice(1).map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] !== undefined ? row[index].trim() : '';
    });
    return obj;
  });
}

// Fetch and normalize data from Google Sheet
export async function fetchLiveSheetsData(): Promise<{ posts: Post[]; campaigns: Campaign[]; trend: TrendPoint[] }> {
  try {
    const response = await fetch(CSV_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error("Failed to fetch Google Sheets CSV");
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    
    if (!rows || rows.length === 0) {
      throw new Error("No data parsed from Google Sheets");
    }

    const posts: Post[] = rows.map(r => {
      const reach = parseInt(r.reach) || 0;
      const likes = parseInt(r.likes) || 0;
      const comments = parseInt(r.comments) || 0;
      const shares = parseInt(r.shares) || 0;
      const saves = parseInt(r.saves) || 0;
      const er = parseFloat(r.engagement_rate) || (((likes + comments + shares + saves) / (reach || 1)) * 100);
      const vs = parseFloat(r.virality_score) || ((shares / (reach || 1)) * 100);

      return {
        post_id: r.post_id,
        platform: r.platform.toLowerCase(),
        content_type: r.content_type?.toLowerCase() || 'image',
        reach,
        likes,
        comments,
        shares,
        saves,
        engagement_rate: parseFloat(er.toFixed(2)),
        virality_score: parseFloat(vs.toFixed(2)),
        data_source: r.data_source || 'apify',
        campaign_tag: r.campaign_tag || 'General',
        recorded_at: r.recorded_at || new Date().toISOString().split('T')[0]
      };
    });

    // Generate Campaign ROI data dynamically based on posts
    // Finance spends are static from OCRchat/brief
    const spendMap: Record<string, number> = {
      'Recruiter-2026': 1950,
      'Workshop-AI': 3200
    };

    const campaignMap: Record<string, { tag: string; reach: number; engage: number }> = {};
    posts.forEach(p => {
      const tag = p.campaign_tag;
      if (!campaignMap[tag]) {
        campaignMap[tag] = { tag, reach: 0, engage: 0 };
      }
      campaignMap[tag].reach += p.reach;
      campaignMap[tag].engage += (p.likes + p.comments + p.shares + p.saves);
    });

    const campaigns: Campaign[] = Object.keys(campaignMap).map(tag => {
      const spend = spendMap[tag] || 1000; // default spend
      const c = campaignMap[tag];
      return {
        tag,
        spend,
        totalReach: c.reach,
        totalEngage: c.engage,
        cpr: parseFloat((spend / (c.reach || 1)).toFixed(2)),
        cpe: parseFloat((spend / (c.engage || 1)).toFixed(2))
      };
    });

    // Generate Trend Data dynamically based on dates present in posts
    const dateMap: Record<string, { reach: number; engage: number }> = {};
    posts.forEach(p => {
      const d = p.recorded_at;
      // Format as M/D
      let dateLabel = d;
      try {
        const parts = d.split('-');
        if (parts.length === 3) {
          dateLabel = `${parseInt(parts[1])}/${parseInt(parts[2])}`;
        }
      } catch (e) {}

      if (!dateMap[dateLabel]) {
        dateMap[dateLabel] = { reach: 0, engage: 0 };
      }
      dateMap[dateLabel].reach += p.reach;
      dateMap[dateLabel].engage += (p.likes + p.comments + p.shares + p.saves);
    });

    const trend: TrendPoint[] = Object.keys(dateMap).sort().map(dateLabel => {
      const d = dateMap[dateLabel];
      return {
        date: dateLabel,
        reach: d.reach,
        er: parseFloat((((d.engage) / (d.reach || 1)) * 100).toFixed(2))
      };
    });

    return { posts, campaigns, trend };
  } catch (error) {
    console.error("fetchLiveSheetsData failed, using initial mock data:", error);
    // Return mock data parsed from our INITIAL arrays
    return {
      posts: INITIAL_POSTS,
      campaigns: INITIAL_CAMPAIGNS,
      trend: INITIAL_TREND_DATA
    };
  }
}
