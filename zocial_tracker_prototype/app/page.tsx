"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import KPICard from '../components/KPICard';
import TrendChart from '../components/TrendChart';
import PlatformDonut from '../components/PlatformDonut';
import CampaignTable from '../components/CampaignTable';
import PipelineFlow from '../components/PipelineFlow';
import ChatInterface from '../components/ChatInterface';
import OCRchatTab from '../components/OCRchatTab';
import {
  Post,
  Campaign,
  TrendPoint,
  fetchLiveSheetsData,
  INITIAL_POSTS,
  INITIAL_CAMPAIGNS,
  INITIAL_TREND_DATA,
  SHEET_URL,
} from '../lib/data';
import { runPipelineSimulation, PipelineStep } from '../lib/pipeline';
import { Bell, RefreshCw, ExternalLink } from 'lucide-react';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [module, setModule] = useState<'home' | 'zocial' | 'ocrchat'>('home');
  
  // Data states
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [trendData, setTrendData] = useState<TrendPoint[]>(INITIAL_TREND_DATA);
  const [lastSynced, setLastSynced] = useState<string>('02:04 AM');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Pipeline simulation states
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([
    { id: "tier1", label: "Meta/TikTok API", tier: "Tier 1", tools: ["Meta API", "TikTok API"], status: "success", message: "Fetched 4 posts ✓ (Last Sync)" },
    { id: "tier2a", label: "Playwright + Gemini Vision", tier: "Tier 2a", tools: ["Playwright", "Gemini 2.5"], status: "skipped", message: "Standby" },
    { id: "tier2b", label: "MCP Browser Agent", tier: "Tier 2b", tools: ["MCP Protocol"], status: "skipped", message: "Standby" },
    { id: "tier3", label: "Apify Scrapers", tier: "Tier 3", tools: ["Apify Bot"], status: "skipped", message: "Standby" },
  ]);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([
    "[02:00:00 AM] [system] Daily Acquisiton cron triggered...",
    "[02:00:02 AM] [api] Connecting to Meta Graph API...",
    "[02:02:14 AM] [api] ✅ Success: Fetched 4 posts from official APIs.",
    "[02:02:15 AM] [system] Syncing data to Google Sheets... ✓",
    "[02:04:00 AM] [system] Syncing data to Supabase database... ✓",
    "[02:04:02 AM] [system] Cron job finished successfully."
  ]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Data table states
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterCampaign, setFilterCampaign] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load live data from Google Sheets on mount
  const loadData = async () => {
    setIsLoadingData(true);
    const data = await fetchLiveSheetsData();
    setPosts(data.posts);
    setCampaigns(data.campaigns);
    setTrendData(data.trend);
    setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setIsLoadingData(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Apify Tier 3 real scraper state
  const [apifyHandles, setApifyHandles] = useState<Record<string, string>>({
    instagram: '',
    tiktok: '',
    facebook: '',
  });
  const [apifyRunIds, setApifyRunIds] = useState<Record<string, { runId: string; datasetId: string }>>({});
  const [apifyStatus, setApifyStatus] = useState<string>('');

  // Trigger real Apify scraper for a platform
  const runApifyScraper = async (platform: string, handles: string[]) => {
    const res = await fetch('/api/apify-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, handles }),
    });
    const data = await res.json();
    if (data.runId) {
      setApifyRunIds(prev => ({ ...prev, [platform]: { runId: data.runId, datasetId: data.datasetId } }));
    }
    return data;
  };

  // Poll Apify run until done, merge results into posts
  const pollApifyResult = async (platform: string, runId: string, datasetId: string) => {
    const maxWait = 120; // 2 min
    for (let i = 0; i < maxWait; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const res = await fetch(`/api/apify-run?runId=${runId}&datasetId=${datasetId}&platform=${platform}`);
      const data = await res.json();
      setApifyStatus(`${platform}: ${data.status}`);
      if (data.status === 'SUCCEEDED' && data.posts?.length > 0) {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.post_id));
          const newPosts = data.posts.filter((p: Post) => !existingIds.has(p.post_id));
          return [...newPosts, ...prev];
        });
        return data.posts;
      }
      if (data.status === 'FAILED' || data.status === 'ABORTED') break;
    }
    return [];
  };

  // Run pipeline — Tier 1 sim then Tier 3 real Apify
  const handleStartSimulation = async () => {
    setIsSimulating(true);
    setPipelineLogs([]);

    const platforms = ['instagram', 'tiktok', 'facebook']
      .filter(p => apifyHandles[p].trim() !== '');

    if (platforms.length > 0) {
      // Real Apify run (Tier 3)
      const nowStr = () => new Date().toLocaleTimeString();
      setPipelineSteps(prev => prev.map(s =>
        s.id === 'tier3' ? { ...s, status: 'running', message: 'Triggering Apify...' } : { ...s, status: 'skipped' }
      ));
      setPipelineLogs([`[${nowStr()}] [tier3] Triggering Apify scrapers for: ${platforms.join(', ')}`]);

      for (const platform of platforms) {
        const handles = apifyHandles[platform].split(',').map(h => h.trim()).filter(Boolean);
        const run = await runApifyScraper(platform, handles);
        if (run.runId) {
          setPipelineLogs(prev => [...prev, `[${nowStr()}] [apify] ${platform} run started: ${run.runId}`]);
          const posts = await pollApifyResult(platform, run.runId, run.datasetId);
          setPipelineLogs(prev => [...prev,
            posts.length > 0
              ? `[${nowStr()}] [apify] ✅ ${platform}: ${posts.length} posts fetched`
              : `[${nowStr()}] [apify] ⚠️ ${platform}: no posts returned`
          ]);
        } else {
          setPipelineLogs(prev => [...prev, `[${nowStr()}] [apify] ❌ ${platform}: ${run.error}`]);
        }
      }
      setPipelineSteps(prev => prev.map(s =>
        s.id === 'tier3' ? { ...s, status: 'success', message: `Done (${platforms.join(', ')})` } : s
      ));
    } else {
      // No handles set — run simulation only
      await runPipelineSimulation((steps, newLog) => {
        setPipelineSteps(steps);
        setPipelineLogs(prev => [...prev, newLog]);
      });
    }

    setIsSimulating(false);
    setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  // Compute stats
  const totalReach = posts.reduce((sum, p) => sum + p.reach, 0);
  const totalEngage = posts.reduce((sum, p) => sum + (p.likes + p.comments + p.shares + p.saves), 0);
  const avgER = totalReach > 0 ? ((totalEngage / totalReach) * 100).toFixed(1) + '%' : '0.0%';
  
  // Find best post
  const bestPost = posts.length > 0 
    ? [...posts].sort((a, b) => b.engagement_rate - a.engagement_rate)[0]
    : null;

  // Platform breakdown for donut chart
  const platformData = ['instagram', 'tiktok', 'facebook'].map(plat => {
    const platReach = posts.filter(p => p.platform === plat).reduce((sum, p) => sum + p.reach, 0);
    return {
      name: plat.charAt(0).toUpperCase() + plat.slice(1),
      value: platReach
    };
  });

  // Filtered posts for data table
  const filteredPosts = posts.filter(p => {
    const matchPlat = filterPlatform === 'all' || p.platform === filterPlatform;
    const matchCamp = filterCampaign === 'all' || p.campaign_tag === filterCampaign;
    const matchSearch = searchQuery === '' || 
      p.post_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.campaign_tag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchPlat && matchCamp && matchSearch;
  });

  const getSectionTitle = () => {
    if (module === 'home') return 'Club OS — ระบบจัดการ CUTS';
    if (module === 'ocrchat') return 'OCRchat — Finance';
    switch (currentTab) {
      case 'overview': return 'Overview Dashboard';
      case 'performance': return 'Performance Trends';
      case 'pipeline': return 'Acquisition Pipeline';
      case 'data': return 'Content Database';
      case 'chat': return 'AI Analyst Assistant';
      default: return 'Zocial Tracker';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Left Sidebar */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} module={module} setModule={setModule} />

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
          <h2 className="text-lg font-bold text-slate-900">{getSectionTitle()}</h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>Last Synced: {lastSynced}</span>
            </span>
            <a
              href={SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 border border-green-300 text-green-700 text-xs font-medium transition-all"
              title="Open Google Sheet"
            >
              <ExternalLink size={13} />
              View Sheet
            </a>
            <button
              onClick={loadData}
              disabled={isLoadingData}
              className={`p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-all ${
                isLoadingData ? 'animate-spin opacity-50' : ''
              }`}
              title="Refresh Data from Sheets"
            >
              <RefreshCw size={16} />
            </button>
            <button className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-all">
              <Bell size={16} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-grow p-8 space-y-6">

          {/* HOME MODULE SELECTOR */}
          {module === 'home' && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center mb-4">
                  <img
                    src="/cuts-logo.png"
                    alt="CUTS Logo"
                    className="w-24 h-24 object-contain rounded-2xl shadow-lg shadow-pink-500/20"
                    onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                  />
                </div>
                <h1 className="text-4xl font-bold text-slate-900">Club OS</h1>
                <p className="text-slate-500 text-base">ระบบจัดการ Marketing + Finance ของ CUTS</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                <button
                  onClick={() => { setModule('zocial'); setCurrentTab('overview'); }}
                  className="group rounded-2xl p-8 text-left border border-slate-200 bg-white hover:border-pink-500 hover:bg-pink-50 transition-all duration-200 shadow-lg hover:shadow-[#B81D67]/10"
                >
                  <div className="text-3xl mb-4">📊</div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-pink-600 transition-colors">Zocial Tracker</h2>
                  <p className="text-sm text-slate-500">วิเคราะห์ Social Media · Pipeline · AI Assistant</p>
                  <div className="mt-4 text-xs text-green-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                    Live Pipeline Online
                  </div>
                </button>
                <button
                  onClick={() => setModule('ocrchat')}
                  className="group rounded-2xl p-8 text-left border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 shadow-lg hover:shadow-emerald-500/10"
                >
                  <div className="text-3xl mb-4">🧾</div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-emerald-400 transition-colors">OCRchat</h2>
                  <p className="text-sm text-slate-500">สแกนใบเสร็จด้วย AI · บันทึกรายจ่าย · Supabase + Sheets</p>
                  <div className="mt-4 text-xs text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    Gemini 1.5 Flash Ready
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ZOCIAL TRACKER TABS */}
          {module === 'zocial' && currentTab === 'overview' && (
            <div className="space-y-6">
              {/* Row 1: KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard 
                  icon="👁️" 
                  label="Total Reach รวม" 
                  value={totalReach.toLocaleString()} 
                  change="▲12.4% vs 7d" 
                  changeType="up"
                />
                <KPICard 
                  icon="❤️" 
                  label="Total Engagement" 
                  value={totalEngage.toLocaleString()} 
                  change="▲18.2% vs 7d" 
                  changeType="up"
                />
                <KPICard 
                  icon="📊" 
                  label="Avg. Engagement Rate" 
                  value={avgER} 
                  badge="✨ Above Benchmark"
                />
                <KPICard 
                  icon="🏆" 
                  label="Best Performing Content" 
                  value={bestPost ? bestPost.post_id : 'None'} 
                  badge={bestPost ? `ER ${bestPost.engagement_rate}%` : undefined}
                />
              </div>

              {/* Row 2: Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-800">📈 Reach & Engagement Rate Trend (7 วัน)</h3>
                  </div>
                  <TrendChart data={trendData} />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-800">🍕 Reach Breakdown by Platform</h3>
                  </div>
                  <PlatformDonut data={platformData} />
                </div>
              </div>

              {/* Row 3: Campaign ROI Table */}
              <CampaignTable campaigns={campaigns} />
            </div>
          )}

          {/* PERFORMANCE TAB */}
          {module === 'zocial' && currentTab === 'performance' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-xl">
                <h3 className="text-md font-bold text-slate-900 mb-4">📈 Reach & Engagement Trends</h3>
                <TrendChart data={trendData} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 p-6 rounded-xl flex flex-col justify-center">
                  <h3 className="text-md font-bold text-slate-900 mb-2">Platform Breakdown</h3>
                  <PlatformDonut data={platformData} />
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-md font-bold text-slate-900 mb-4">💡 Optimization Insights (ข้อแนะนำฝ่าย Innovation)</h3>
                    <ul className="space-y-3 text-sm text-slate-600 leading-relaxed">
                      <li className="flex gap-2">
                        <span className="text-green-500">✔</span>
                        <span><strong>Recruiter-2026:</strong> ผลตอบรับดีมาก (ER 16.2%!) การใช้คลิปสั้นแบบวิดีโอ (Reels/TikTok) คุ้มค่าที่สุด งบประมาณ 1,950 บาท เข้าถึงผู้คน 32,200 คน (CPR เพียง 0.06 บาท)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-500">⚠</span>
                        <span><strong>Workshop-AI:</strong> มีประสิทธิภาพต่ำมาก (ER 5%, CPR 2.91 บาท) แคมเปญนี้จ่ายสูงกว่าถึง 36 เท่า แนะนำให้ฝ่ายการตลาดหันมาใช้วิดีโอสั้นแทนการใช้รูปภาพนิ่งนิ่งในเฟสบุ๊คเพื่อดึงคน</span>
                      </li>
                    </ul>
                  </div>
                  <div className="border-t border-slate-200 pt-4 mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Generated automatically by AI Analyst</span>
                    <button 
                      onClick={() => setCurrentTab('chat')} 
                      className="text-[#B81D67] font-semibold hover:underline"
                    >
                      Ask AI Analyst →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PIPELINE TAB */}
          {module === 'zocial' && currentTab === 'pipeline' && (
            <div className="space-y-4">
              {/* Apify Account Handles Config */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-1">⚡ Tier 3 — Apify Live Scraper</h3>
                <p className="text-xs text-slate-500 mb-4">ใส่ username ของแต่ละ platform แล้วกด Run Pipeline เพื่อดึงข้อมูลจริง (ว่างไว้ = รัน simulation เท่านั้น)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['instagram', 'tiktok', 'facebook'] as const).map(platform => (
                    <div key={platform}>
                      <label className="block text-xs text-slate-500 mb-1 capitalize">{platform} username</label>
                      <input
                        type="text"
                        value={apifyHandles[platform]}
                        onChange={e => setApifyHandles(prev => ({ ...prev, [platform]: e.target.value }))}
                        placeholder={platform === 'instagram' ? 'e.g. chulatechstartup' : platform === 'tiktok' ? 'e.g. cts_official' : 'e.g. ChulaTS'}
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:border-[#B81D67]"
                      />
                    </div>
                  ))}
                </div>
                {apifyStatus && (
                  <p className="text-xs text-yellow-400 mt-3">🔄 {apifyStatus}</p>
                )}
              </div>

              <PipelineFlow
                steps={pipelineSteps}
                logs={pipelineLogs}
                onStartSimulation={handleStartSimulation}
                isSimulating={isSimulating}
              />
            </div>
          )}

          {/* DATA TABLE TAB */}
          {module === 'zocial' && currentTab === 'data' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              {/* Filters Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-md font-bold text-slate-900">🗄️ Content Database (คลังข้อมูลดิบจากสคริปต์)</h3>
                
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหา Post ID หรือแคมเปญ..."
                    className="bg-[#141722] border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#B81D67] w-48"
                  />
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="bg-[#141722] border border-slate-200 text-xs text-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#B81D67]"
                  >
                    <option value="all">All Platforms</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="facebook">Facebook</option>
                  </select>
                  <select
                    value={filterCampaign}
                    onChange={(e) => setFilterCampaign(e.target.value)}
                    className="bg-[#141722] border border-slate-200 text-xs text-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#B81D67]"
                  >
                    <option value="all">All Campaigns</option>
                    <option value="Recruiter-2026">Recruiter-2026</option>
                    <option value="casecompetition">casecompetition</option>
                    <option value="Workshop-AI">Workshop-AI</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Post ID</th>
                      <th className="py-3 px-4">Platform</th>
                      <th className="py-3 px-4">Content Type</th>
                      <th className="py-3 px-4 text-right">Reach</th>
                      <th className="py-3 px-4 text-right">Likes</th>
                      <th className="py-3 px-4 text-right">Comments</th>
                      <th className="py-3 px-4 text-right">Shares</th>
                      <th className="py-3 px-4 text-right text-pink-500 font-bold">ER%</th>
                      <th className="py-3 px-4">Data Source</th>
                      <th className="py-3 px-4">Campaign</th>
                      <th className="py-3 px-4">Recorded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-8 text-slate-500 text-xs font-mono">
                          No posts found matching the filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPosts.map((p) => {
                        const platColor = 
                          p.platform === 'instagram' ? 'bg-[#B81D67]/10 text-[#B81D67] border-[#B81D67]/20' :
                          p.platform === 'tiktok' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                          'bg-[#0668E1]/10 text-[#0668E1] border-[#0668E1]/20';
                        return (
                          <tr key={p.post_id} className="border-b border-slate-200 hover:bg-slate-100/30 transition-colors text-xs text-slate-600">
                            <td className="py-3 px-4 font-mono font-bold text-slate-800">{p.post_id}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${platColor}`}>
                                {p.platform.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 uppercase text-[10px] font-mono text-slate-500">{p.content_type}</td>
                            <td className="py-3 px-4 text-right font-mono">{p.reach.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono">{p.likes.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono">{p.comments.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono">{p.shares.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-[#B81D67]">{p.engagement_rate}%</td>
                            <td className="py-3 px-4">
                              <span className="bg-[#2D3148] text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase">
                                {p.data_source}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-slate-500 font-mono">{p.campaign_tag}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono">{p.recorded_at}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI ASSISTANT TAB */}
          {module === 'zocial' && currentTab === 'chat' && (
            <ChatInterface />
          )}

          {module === 'ocrchat' && (
            <OCRchatTab />
          )}

        </main>
      </div>
    </div>
  );
}
