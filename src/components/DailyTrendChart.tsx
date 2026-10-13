import React, { useState } from 'react';
import { BarChart3, TrendingUp, Calendar, Info } from 'lucide-react';
import { DailyTrendItem } from '../types.ts';

interface DailyTrendChartProps {
  data: DailyTrendItem[];
  monthName: string;
}

export const DailyTrendChart: React.FC<DailyTrendChartProps> = ({ data, monthName }) => {
  const [hoveredItem, setHoveredItem] = useState<DailyTrendItem | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-center text-slate-400">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
        <p className="text-sm">Tidak ada riwayat tanggal cetak untuk filter ini</p>
      </div>
    );
  }

  // Find max value for scaling
  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const totalVolume = data.reduce((acc, d) => acc + d.total, 0);
  const totalDelivered = data.reduce((acc, d) => acc + d.delivered, 0);
  const avgDaily = Math.round(totalVolume / data.length);

  // Peak day
  const peakDay = [...data].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Tren Volume & Keberhasilan Harian ({monthName})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribusi pemrosesan pesanan per hari: Terkirim (Hijau) vs Dibatalkan (Merah)
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
            <span className="text-slate-600">Terkirim</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-400"></span>
            <span className="text-slate-600">Batal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-300"></span>
            <span className="text-slate-600">Lainnya</span>
          </div>
        </div>
      </div>

      {/* Stats summary strip */}
      <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-50 p-2.5 rounded-xl text-center text-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">Rata-rata Harian</span>
          <span className="font-bold text-slate-700 text-sm">{avgDaily.toLocaleString('id-ID')} pkt/hari</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Hari Tersibuk</span>
          <span className="font-bold text-blue-700 text-sm">
            {peakDay ? `${peakDay.date.slice(-2)} (${peakDay.total.toLocaleString('id-ID')})` : '-'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Delivery Rate Periode</span>
          <span className="font-bold text-emerald-700 text-sm">
            {totalVolume > 0 ? ((totalDelivered / totalVolume) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="relative pt-6 pb-2">
        {/* Tooltip Floating Info */}
        {hoveredItem && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg z-10 flex items-center gap-3 pointer-events-none">
            <span className="font-bold text-amber-300">{hoveredItem.date}</span>
            <span>Total: <b>{hoveredItem.total.toLocaleString('id-ID')}</b></span>
            <span className="text-emerald-400">Terkirim: <b>{hoveredItem.delivered.toLocaleString('id-ID')}</b></span>
            <span className="text-rose-400">Batal: <b>{hoveredItem.cancelled.toLocaleString('id-ID')}</b></span>
            <span className="text-blue-300">
              ({hoveredItem.total > 0 ? ((hoveredItem.delivered / hoveredItem.total) * 100).toFixed(1) : 0}% sukses)
            </span>
          </div>
        )}

        <div className="h-44 flex items-end gap-1 sm:gap-1.5 w-full overflow-x-auto pb-6 scrollbar-thin pt-2">
          {data.map((item) => {
            const heightPct = Math.max((item.total / maxTotal) * 100, 3);
            const deliveredPct = item.total > 0 ? (item.delivered / item.total) * 100 : 0;
            const cancelledPct = item.total > 0 ? (item.cancelled / item.total) * 100 : 0;
            const otherPct = Math.max(0, 100 - deliveredPct - cancelledPct);
            const dayNum = item.date.slice(-2);

            return (
              <div
                key={item.date}
                className="flex-1 min-w-[14px] sm:min-w-[20px] flex flex-col items-center group relative cursor-pointer"
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Stacked Bar */}
                <div 
                  className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse transition-all duration-150 group-hover:brightness-110 shadow-sm"
                  style={{ height: `${heightPct}%` }}
                >
                  {/* Delivered Portion (bottom) */}
                  <div
                    style={{ height: `${deliveredPct}%` }}
                    className="w-full bg-emerald-500"
                  />
                  {/* Cancelled Portion */}
                  <div
                    style={{ height: `${cancelledPct}%` }}
                    className="w-full bg-rose-400"
                  />
                  {/* Other Portion */}
                  <div
                    style={{ height: `${otherPct}%` }}
                    className="w-full bg-blue-300"
                  />
                </div>

                {/* Day label underneath */}
                <span className="absolute -bottom-5 text-[10px] text-slate-400 group-hover:text-blue-600 font-medium whitespace-nowrap">
                  {dayNum}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
