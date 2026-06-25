import React from 'react';
import { LayoutDashboard, BarChart3, GitFork, Table, Bot, Settings, Power } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'pipeline', label: 'Pipeline Status', icon: GitFork },
    { id: 'data', label: 'Data Table', icon: Table },
    { id: 'chat', label: 'AI Assistant', icon: Bot },
  ];

  return (
    <aside className="w-64 bg-[#1A1D27] border-r border-[#2D3148] flex flex-col fixed h-full z-10">
      <div className="p-6 border-b border-[#2D3148]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-pink-600 rounded-full animate-pulse"></div>
          <span className="text-xs font-semibold text-[#B81D67] uppercase tracking-wider">Chula Tech Startup</span>
        </div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          Zocial Tracker
          <span className="text-[10px] bg-[#2D3148] text-slate-400 px-1.5 py-0.5 rounded font-mono font-normal">v2.0</span>
        </h1>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-green-500 font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span>Live Pipeline Online</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#B81D67] text-white shadow-lg shadow-[#B81D67]/15'
                  : 'text-slate-400 hover:bg-[#252A37] hover:text-slate-100'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#2D3148] bg-[#141722] text-xs text-slate-500 space-y-2">
        <div>
          <span className="block font-medium text-slate-400">Developer Profile:</span>
          <span className="block">นายพิธิวัฒน์ ฉิมพลี (โฟร์) ปี 2</span>
          <span className="block text-pink-600 font-semibold">ฝ่าย Innovation</span>
        </div>
        <div className="pt-2 border-t border-[#2D3148] flex justify-between items-center text-[10px]">
          <span>© CTS 2026</span>
          <span>v2.0.0-prod</span>
        </div>
      </div>
    </aside>
  );
}
