import React from 'react';
import { LayoutDashboard, BarChart3, GitFork, Table, Bot, Receipt, ChevronLeft, TrendingUp } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  module: 'home' | 'zocial' | 'ocrchat';
  setModule: (m: 'home' | 'zocial' | 'ocrchat') => void;
}

const zocialItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'pipeline', label: 'Pipeline Status', icon: GitFork },
  { id: 'data', label: 'Data Table', icon: Table },
  { id: 'chat', label: 'AI Assistant', icon: Bot },
];

export default function Sidebar({ currentTab, setCurrentTab, module, setModule }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10 shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 bg-pink-600 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-semibold text-pink-700 uppercase tracking-wider">Chula Tech Startup</span>
        </div>
        <button
          onClick={() => setModule('home')}
          className="flex items-center gap-2 group"
        >
          <img src="/cuts-logo.png" alt="CUTS" className="w-7 h-7 rounded-md object-contain" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
          <h1 className="text-lg font-bold text-slate-800 group-hover:text-pink-600 transition-colors">
            Club OS
          </h1>
          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">v2.0</span>
        </button>
        {module !== 'home' && (
          <button
            onClick={() => setModule('home')}
            className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft size={12} />
            <span>เปลี่ยน Module</span>
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {module === 'home' && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 px-3 mb-2">Select Module</p>
            <button
              onClick={() => { setModule('zocial'); setCurrentTab('overview'); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all group"
            >
              <TrendingUp size={18} className="text-pink-500" />
              <div className="text-left">
                <div>Zocial Tracker</div>
                <div className="text-[10px] text-slate-400 font-normal">Social Media Analytics</div>
              </div>
            </button>
            <button
              onClick={() => setModule('ocrchat')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
            >
              <Receipt size={18} className="text-emerald-500" />
              <div className="text-left">
                <div>OCRchat</div>
                <div className="text-[10px] text-slate-400 font-normal">Finance & Receipts</div>
              </div>
            </button>
          </>
        )}

        {module === 'zocial' && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 px-3 mb-2">Zocial Tracker</p>
            {zocialItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </>
        )}

        {module === 'ocrchat' && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 px-3 mb-2">OCRchat — Finance</p>
            <button
              onClick={() => setModule('ocrchat')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white shadow-md"
            >
              <Receipt size={17} />
              <span>อัปโหลดใบเสร็จ</span>
            </button>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 space-y-1">
        <span className="block font-medium text-slate-600">นายพิธิวัฒน์ ฉิมพลี (โฟร์) ปี 2</span>
        <span className="block text-pink-600 font-semibold">ฝ่าย Innovation</span>
        <div className="pt-1 border-t border-slate-200 flex justify-between text-[10px]">
          <span>© CUTS 2026</span>
          <span>Club OS v2.0</span>
        </div>
      </div>
    </aside>
  );
}
