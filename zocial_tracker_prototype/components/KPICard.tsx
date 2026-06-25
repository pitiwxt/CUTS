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
    if (changeType === 'up') return 'text-green-600 bg-green-50 border border-green-200';
    if (changeType === 'down') return 'text-red-600 bg-red-50 border border-red-200';
    return 'text-slate-500 bg-slate-100 border border-slate-200';
  };

  const getChangeIcon = () => {
    if (changeType === 'up') return <ArrowUp size={12} />;
    if (changeType === 'down') return <ArrowDown size={12} />;
    return <Minus size={12} />;
  };

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all relative overflow-hidden group shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-xl bg-slate-100 p-2 rounded-lg group-hover:scale-110 transition-transform duration-200">{icon}</span>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-900 font-sans tracking-tight mb-2">{value}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {change && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${getChangeColor()}`}>
              {getChangeIcon()}
              {change}
            </span>
          )}
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-pink-700 font-semibold">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
