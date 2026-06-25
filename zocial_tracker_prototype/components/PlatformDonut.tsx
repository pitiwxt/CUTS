"use client";

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface PlatformDonutProps {
  data: { name: string; value: number }[];
}

export default function PlatformDonut({ data }: PlatformDonutProps) {
  const COLORS: Record<string, string> = {
    'Instagram': '#B81D67',
    'TikTok': '#00F2FE',
    'Facebook': '#0668E1'
  };

  return (
    <div className="w-full h-80 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748B'} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2D3148', borderRadius: '8px', color: '#F1F5F9' }}
            formatter={(value: any) => [value.toLocaleString() + " Reach", "Reach"]}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
