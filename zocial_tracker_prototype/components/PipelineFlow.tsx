import React from 'react';
import { PipelineStep } from '../lib/pipeline';
import { CheckCircle2, XCircle, Play, AlertCircle, FastForward } from 'lucide-react';

interface PipelineFlowProps {
  steps: PipelineStep[];
  logs: string[];
  onStartSimulation: () => void;
  isSimulating: boolean;
}

export default function PipelineFlow({ steps, logs, onStartSimulation, isSimulating }: PipelineFlowProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'border-amber-500 bg-amber-500/5 text-amber-500 shadow-md shadow-amber-500/10 animate-pulse';
      case 'success': return 'border-green-500 bg-green-500/5 text-green-500 shadow-md shadow-green-500/5';
      case 'failed': return 'border-red-500 bg-red-500/5 text-red-500 shadow-md shadow-red-500/5';
      case 'skipped': return 'border-slate-500 border-dashed bg-slate-500/5 text-slate-400';
      default: return 'border-[#2D3148] bg-[#1A1D27] text-slate-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="animate-bounce" size={14} />;
      case 'success': return <CheckCircle2 size={14} />;
      case 'failed': return <XCircle size={14} />;
      case 'skipped': return <FastForward size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Simulation flow column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#1A1D27] border border-[#2D3148] rounded-xl p-5">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-md font-bold text-slate-100 flex items-center gap-2">
                <span>🔄</span> Fallback Acquisition Pipeline (ระบบสับเปลี่ยนดึงข้อมูล)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                จำลอง Logic การกู้คืนการดึงข้อมูล 3 ระดับ เมื่อ API หรือโปรเซสพัง
              </p>
            </div>
            <button
              onClick={onStartSimulation}
              disabled={isSimulating}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                isSimulating 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-[#B81D67] text-white hover:bg-[#a01657] shadow-lg shadow-[#B81D67]/15'
              }`}
            >
              <span>⚡</span> {isSimulating ? "กำลังรันจำลอง..." : "เริ่มจำลองการรัน"}
            </button>
          </div>

          <div className="relative pl-6 border-l-2 border-[#2D3148] space-y-6 ml-4">
            {steps.map((step, idx) => {
              const status = step.status;
              const stepColor = getStatusColor(status);
              return (
                <div key={step.id} className="relative">
                  {/* Step bullet node */}
                  <div className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                    status === 'running' ? 'bg-amber-500 text-white animate-pulse border-amber-600' :
                    status === 'success' ? 'bg-green-500 text-white border-green-600' :
                    status === 'failed' ? 'bg-red-500 text-white border-red-600' :
                    status === 'skipped' ? 'bg-[#252A37] text-slate-500 border-[#2D3148]' :
                    'bg-[#252A37] text-slate-400 border-[#2D3148]'
                  }`}>
                    {idx + 1}
                  </div>

                  <div className={`border p-4 rounded-xl transition-all ${stepColor}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] font-semibold text-[#B81D67] tracking-wider uppercase bg-[#B81D67]/5 px-2 py-0.5 rounded border border-[#B81D67]/10 mr-2">
                          {step.tier}
                        </span>
                        <h3 className="text-sm font-bold text-slate-100 inline">{step.label}</h3>
                      </div>
                      <span className="text-xs font-semibold flex items-center gap-1">
                        {getStatusIcon(status)}
                        {status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-mono mt-2 bg-[#0F1117]/50 p-2 rounded border border-[#2D3148]/40">
                      {step.message}
                    </p>

                    <div className="flex gap-2 mt-3 flex-wrap">
                      {step.tools.map(tool => (
                        <span key={tool} className="text-[9px] font-mono bg-[#252A37] text-slate-400 px-1.5 py-0.5 rounded border border-[#2D3148]">
                          {tool}
                        </span>
                      ))}
                      {step.duration && (
                        <span className="text-[9px] font-mono text-slate-500 ml-auto">
                          Duration: {step.duration}ms
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Terminal log column */}
      <div className="space-y-6">
        <div className="bg-[#0F1117] border border-[#2D3148] rounded-xl overflow-hidden h-full flex flex-col min-h-[500px]">
          <div className="bg-[#1A1D27] border-b border-[#2D3148] px-4 py-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span className="text-xs font-bold text-slate-300 ml-2 font-mono">n8n Execution Log</span>
          </div>
          <div className="flex-1 p-4 font-mono text-xs text-slate-300 space-y-2 overflow-y-auto max-h-[550px] leading-relaxed">
            {logs.map((log, index) => {
              let logClass = "text-slate-400";
              if (log.includes("❌")) logClass = "text-red-500 font-bold";
              else if (log.includes("✅") || log.includes("success")) logClass = "text-green-500 font-bold";
              else if (log.includes("Trying") || log.includes("Triggering")) logClass = "text-amber-400";

              return (
                <div key={index} className={`border-b border-[#2D3148]/30 pb-2 ${logClass}`}>
                  {log}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
