"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import KPICard from '../components/KPICard';
import TrendChart from '../components/TrendChart';
import PlatformDonut from '../components/PlatformDonut';
import CampaignTable from '../components/CampaignTable';
import PipelineFlow from '../components/PipelineFlow';
import ChatInterface from '../components/ChatInterface';
import { 
  Post, 
  Campaign, 
  TrendPoint, 
  fetchLiveSheetsData, 
  INITIAL_POSTS, 
  INITIAL_CAMPAIGNS, 
  INITIAL_TREND_DATA 
} from '../lib/data';
import { runPipelineSimulation, PipelineStep } from '../lib/pipeline';
import { Bell, RefreshCw } from 'lucide-react';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('overview');
  
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

  // Run pipeline simulation
  const handleStartSimulation = async () => {
    setIsSimulating(true);
    setPipelineLogs([]);
    
    await runPipelineSimulation((steps, newLog) => {
      setPipelineSteps(steps);
      setPipelineLogs(prev => [...prev, newLog]);
    });
    
    setIsSimulating(false);
    // After simulation, refresh data
    await loadData();
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
    <div className="flex min-h-screen bg-[#0F1117] text-slate-100 font-sans antialiased">
      {/* Left Sidebar */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col">
        {/* Top Header Bar */}
        <header className="h-16 bg-[#1A1D27] border-b border-[#2D3148] px-8 flex items-center justify-between sticky top-0 z-20">
          <h2 className="text-lg font-bold text-slate-100">{getSectionTitle()}</h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-[#252A37] border border-[#2D3148] px-3 py-1.5 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>Last Synced: {lastSynced}</span>
            </span>
            <button 
              onClick={loadData}
              disabled={isLoadingData}
              className={`p-2 rounded-lg bg-[#252A37] hover:bg-[#2c3242] border border-[#2D3148] text-slate-300 transition-all ${
                isLoadingData ? 'animate-spin opacity-50' : ''
              }`}
              title="Refresh Data from Sheets"
            >
              <RefreshCw size={16} />
            </button>
            <button className="p-2 rounded-lg bg-[#252A37] hover:bg-[#2c3242] border border-[#2D3148] text-slate-300 transition-all">
              <Bell size={16} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-grow p-8 space-y-6">
          
          {/* OVERVIEW TAB */}
          {currentTab === 'overview' && (
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
                <div className="lg:col-span-2 bg-[#1A1D27] border border-[#2D3148] rounded-xl p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-200">📈 Reach & Engagement Rate Trend (7 วัน)</h3>
                  </div>
                  <TrendChart data={trendData} />
                </div>
                <div className="bg-[#1A1D27] border border-[#2D3148] rounded-xl p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-200">🍕 Reach Breakdown by Platform</h3>
                  </div>
                  <PlatformDonut data={platformData} />
                </div>
              </div>

              {/* Row 3: Campaign ROI Table */}
              <CampaignTable campaigns={campaigns} />
            </div>
          )}

          {/* PERFORMANCE TAB */}
          {currentTab === 'performance' && (
            <div className="space-y-6">
              <div className="bg-[#1A1D27] border border-[#2D3148] p-6 rounded-xl">
                <h3 className="text-md font-bold text-slate-100 mb-4">📈 Reach & Engagement Trends</h3>
                <TrendChart data={trendData} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1A1D27] border border-[#2D3148] p-6 rounded-xl flex flex-col justify-center">
                  <h3 className="text-md font-bold text-slate-100 mb-2">Platform Breakdown</h3>
                  <PlatformDonut data={platformData} />
                </div>
                <div className="bg-[#1A1D27] border border-[#2D3148] p-6 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-md font-bold text-slate-100 mb-4">💡 Optimization Insights (ข้อแนะนำฝ่าย Innovation)</h3>
                    <ul className="space-y-3 text-sm text-slate-300 leading-relaxed">
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
                  <div className="border-t border-[#2D3148] pt-4 mt-4 flex items-center justify-between text-xs text-slate-500">
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
          {currentTab === 'pipeline' && (
            <PipelineFlow 
              steps={pipelineSteps} 
              logs={pipelineLogs} 
              onStartSimulation={handleStartSimulation} 
              isSimulating={isSimulating}
            />
          )}

          {/* DATA TABLE TAB */}
          {currentTab === 'data' && (
            <div className="bg-[#1A1D27] border border-[#2D3148] rounded-xl p-6 space-y-6">
              {/* Filters Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-md font-bold text-slate-100">🗄️ Content Database (คลังข้อมูลดิบจากสคริปต์)</h3>
                
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหา Post ID หรือแคมเปญ..."
                    className="bg-[#141722] border border-[#2D3148] rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#B81D67] w-48"
                  />
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="bg-[#141722] border border-[#2D3148] text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#B81D67]"
                  >
                    <option value="all">All Platforms</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="facebook">Facebook</option>
                  </select>
                  <select
                    value={filterCampaign}
                    onChange={(e) => setFilterCampaign(e.target.value)}
                    className="bg-[#141722] border border-[#2D3148] text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#B81D67]"
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
                    <tr className="border-b border-[#2D3148] text-slate-400 text-xs uppercase tracking-wider font-semibold">
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
                          <tr key={p.post_id} className="border-b border-[#2D3148] hover:bg-[#252A37]/30 transition-colors text-xs text-slate-300">
                            <td className="py-3 px-4 font-mono font-bold text-slate-200">{p.post_id}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${platColor}`}>
                                {p.platform.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 uppercase text-[10px] font-mono text-slate-400">{p.content_type}</td>
                            <td className="py-3 px-4 text-right font-mono">{p.reach.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono">{p.likes.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono">{p.comments.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono">{p.shares.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-[#B81D67]">{p.engagement_rate}%</td>
                            <td className="py-3 px-4">
                              <span className="bg-[#2D3148] text-slate-300 border border-[#2D3148] px-1.5 py-0.5 rounded text-[10px] font-mono uppercase">
                                {p.data_source}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-slate-400 font-mono">{p.campaign_tag}</span>
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
          {currentTab === 'chat' && (
            <ChatInterface />
          )}

        </main>
      </div>
    </div>
  );
}
