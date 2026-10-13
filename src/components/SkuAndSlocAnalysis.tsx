import React from 'react';
import { Package, Building2, Tag } from 'lucide-react';
import { SkuBreakdownItem, SlocBreakdownItem } from '../types.ts';

interface SkuAndSlocAnalysisProps {
  skuData: SkuBreakdownItem[];
  slocData: SlocBreakdownItem[];
  onSelectSloc: (sloc: string) => void;
  selectedSloc: string;
}

export const SkuAndSlocAnalysis: React.FC<SkuAndSlocAnalysisProps> = ({
  skuData,
  slocData,
  onSelectSloc,
  selectedSloc,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Left: Top SKUs */}
      <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1">
          <Package className="w-4 h-4 text-blue-600" />
          Top 10 SKU Barang Terbanyak Diproses
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Produk yang paling sering dipacking dan dikirim pada periode laporan ini
        </p>

        <div className="space-y-2.5">
          {skuData.slice(0, 8).map((item, idx) => {
            const deliveredRate = item.total > 0 ? (item.delivered / item.total) * 100 : 0;
            return (
              <div key={item.sku} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition">
                <div className="flex items-center gap-2 max-w-[65%]">
                  <span className="w-4 h-4 rounded bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-mono font-medium text-slate-800 truncate" title={item.sku}>
                    {item.sku}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">
                    {item.total.toLocaleString('id-ID')} unit
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                    {deliveredRate.toFixed(0)}% kirim
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: SLOC Warehouse Location */}
      <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-amber-600" />
          Distribusi Gudang (SLOC Storage Location)
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Beban kapasitas pemrosesan per area gudang logistik
        </p>

        <div className="space-y-3">
          {slocData.map((s) => {
            const isSelected = selectedSloc === s.sloc;
            return (
              <div
                key={s.sloc}
                onClick={() => onSelectSloc(isSelected ? 'all' : s.sloc)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                    : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-800">
                    SLOC {s.sloc}
                  </span>
                  <span className="font-bold text-slate-900">
                    {s.total.toLocaleString('id-ID')} paket ({s.share.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${s.share}%` }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
