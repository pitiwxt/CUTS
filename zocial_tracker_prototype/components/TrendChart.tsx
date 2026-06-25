"use client";

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendPoint } from '../lib/data';

interface TrendChartProps {
  data: TrendPoint[];
}

export default function TrendChart({ data }: TrendChartProps) {
  // Sort data chronologically (e.g. M/D format sorted)
  const sortedData = [...data].sort((a, b) => {
    const parseDate = (dStr: string) => {
      const parts = dStr.split('/');
      return parts.length === 2 ? parseInt(parts[0]) * 100 + parseInt(parts[1]) : 0;
    };
    return parseDate(a.date) - parseDate(b.date);
  });

  if (sortedData.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center text-slate-500 text-sm">
        ยังไม่มีข้อมูล trend — ข้อมูลจะแสดงเมื่อมีโพสต์หลายวัน
      </div>
    );
  }

  // With only 1 point recharts won't draw lines — pad with a blank entry before & after
  const chartData = sortedData.length === 1
    ? [{ date: '', reach: 0, er: 0 }, ...sortedData, { date: ' ', reach: 0, er: 0 }]
    : sortedData;

  return (
    <div className="w-full h-80">
      {sortedData.length === 1 && (
        <p className="text-xs text-slate-500 mb-1 text-center">
          มีข้อมูลแค่ 1 วัน — เส้นกราฟจะขึ้นเมื่อมีข้อมูลหลายวัน
        </p>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2D3148" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#64748B"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            yAxisId="left"
            stroke="#64748B"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#64748B"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2D3148', borderRadius: '8px', color: '#F1F5F9' }}
            labelClassName="text-slate-400 font-bold"
            formatter={(value: any, name: any) => {
              if (name === "Reach") return [value.toLocaleString(), name];
              return [`${value}%`, name];
            }}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="reach"
            name="Reach"
            stroke="#60A5FA"
            strokeWidth={3}
            activeDot={{ r: 8 }}
            dot={{ stroke: '#60A5FA', strokeWidth: 2, r: 4, fill: '#0F1117' }}
            connectNulls={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="er"
            name="ER (%)"
            stroke="#B81D67"
            strokeWidth={3}
            dot={{ stroke: '#B81D67', strokeWidth: 2, r: 4, fill: '#0F1117' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
