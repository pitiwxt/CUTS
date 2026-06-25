import React from 'react';
import { Campaign } from '../lib/data';

interface CampaignTableProps {
  campaigns: Campaign[];
}

export default function CampaignTable({ campaigns }: CampaignTableProps) {
  return (
    <div className="bg-[#1A1D27] border border-[#2D3148] rounded-xl p-5 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-md font-bold text-slate-100 flex items-center gap-2">
          <span>📊</span> Campaign Performance (วิเคราะห์ ROI)
        </h2>
        <span className="text-xs text-slate-400 bg-[#252A37] px-2 py-1 rounded">
          Sync status: Live Budget & Stats
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2D3148] text-slate-400 text-xs uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Campaign Tag</th>
              <th className="py-3 px-4 text-right">Reach รวม</th>
              <th className="py-3 px-4 text-right">Engage รวม</th>
              <th className="py-3 px-4 text-right">Spend (งบจ่าย)</th>
              <th className="py-3 px-4 text-right text-pink-500 font-bold">CPR (ต่อ Reach)</th>
              <th className="py-3 px-4 text-right text-pink-500 font-bold">CPE (ต่อ Engage)</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              // Highlighting ROI efficiency
              const isEfficient = c.tag === 'Recruiter-2026';
              return (
                <tr 
                  key={c.tag} 
                  className={`border-b border-[#2D3148] hover:bg-[#252A37]/30 transition-colors text-sm text-slate-300 ${
                    isEfficient ? 'bg-green-500/5' : ''
                  }`}
                >
                  <td className="py-4 px-4 font-semibold text-slate-200">
                    <div className="flex items-center gap-2">
                      <span>{c.tag}</span>
                      {isEfficient && (
                        <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-mono border border-green-500/20">
                          Best ROI
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-mono">{c.totalReach.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right font-mono">{c.totalEngage.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right font-mono">฿{c.spend.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-200">฿{c.cpr.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-200">฿{c.cpe.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
