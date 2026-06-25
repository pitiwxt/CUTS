import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface KPICardProps {
  icon: string;
  label: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  badge?: string;
}

export default function KPICard({ icon, label, value, change, changeType, badge }: KPICardProps) {
  const getChangeColor = () => {
    if (changeType === 'up') return 'text-green-500 bg-green-500/10 border border-green-500/20';
    if (changeType === 'down') return 'text-red-500 bg-red-500/10 border border-red-500/20';
    return 'text-slate-400 bg-slate-400/10 border border-slate-400/20';
  };

  const getChangeIcon = () => {
    if (changeType === 'up') return <ArrowUp size={12} />;
    if (changeType === 'down') return <ArrowDown size={12} />;
    return <Minus size={12} />;
  };

  return (
    <div className="bg-[#1A1D27] border border-[#2D3148] p-5 rounded-xl flex flex-col justify-between hover:border-[#3d4361] transition-all relative overflow-hidden group">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-xl bg-[#252A37] p-2 rounded-lg group-hover:scale-110 transition-transform duration-200">{icon}</span>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-100 font-sans tracking-tight mb-2">{value}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {change && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${getChangeColor()}`}>
              {getChangeIcon()}
              {change}
            </span>
          )}
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-[#B81D67] font-semibold">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
