import React from 'react';
import { Users, Award, PackageCheck, CheckCircle2 } from 'lucide-react';
import { PackerBreakdownItem } from '../types.ts';

interface PackerAnalysisProps {
  data: PackerBreakdownItem[];
  onSelectPacker: (packer: string) => void;
  selectedPacker: string;
}

export const PackerAnalysis: React.FC<PackerAnalysisProps> = ({
  data,
  onSelectPacker,
  selectedPacker,
}) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" />
            Produktivitas & Leaderboard Packer Gudang
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Petugas pemackingan paket dengan kontribusi volume dan tingkat keberhasilan tertinggi
          </p>
        </div>
        <span className="text-xs text-slate-400">
          Klik nama packer untuk memfilter data
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.slice(0, 9).map((p, idx) => {
          const isSelected = selectedPacker === p.packer;
          const isTop3 = idx < 3;
          return (
            <div
              key={p.packer}
              onClick={() => onSelectPacker(isSelected ? 'all' : p.packer)}
              className={`p-3.5 rounded-xl border cursor-pointer transition relative ${
                isSelected
                  ? 'border-violet-500 bg-violet-50/70 shadow-sm'
                  : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    idx === 0
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : idx === 1
                      ? 'bg-slate-200 text-slate-700'
                      : idx === 2
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-xs text-slate-800 truncate max-w-[130px]">
                    {p.packer}
                  </span>
                </div>
                {isTop3 && <Award className="w-4 h-4 text-amber-500" />}
              </div>

              <div className="flex items-baseline justify-between mt-2">
                <span className="text-base font-extrabold text-slate-900">
                  {p.total.toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-400">paket</span>
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {p.deliveredRate.toFixed(1)}% Sukses
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${p.deliveredRate}%` }}
                  className="h-full bg-violet-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
