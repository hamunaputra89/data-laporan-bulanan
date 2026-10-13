import { 
  PackageCheck, 
  PackageX, 
  Truck, 
  RotateCcw, 
  Layers, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck
} from 'lucide-react';
import { SummaryKPIs, PrevMonthKPIs } from '../types.ts';

interface SummaryCardsProps {
  summary: SummaryKPIs | undefined;
  prevMonth: PrevMonthKPIs | null | undefined;
  monthName: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  prevMonth,
  monthName,
}) => {
  if (!summary) return null;

  const total = summary.totalOrders || 0;
  const delivered = summary.deliveredCount || 0;
  const deliveredRate = summary.deliveredRate || 0;
  const cancelled = summary.cancelledCount || 0;
  const cancelledRate = summary.cancelledRate || 0;
  const inTransit = (summary.shippedCount || 0) + (summary.readyToShipCount || 0);
  const returned = summary.returnedCount || 0;
  const returnedRate = summary.returnedRate || 0;
  const handover = summary.handoverCount || 0;
  const handoverRate = summary.handoverRate || 0;

  // Render MoM badge
  const renderMomBadge = (currentRate: number, prevRate?: number, isPositiveGood = true) => {
    if (prevRate === undefined || prevRate === null) return null;
    const diff = currentRate - prevRate;
    if (Math.abs(diff) < 0.05) {
      return (
        <span className="inline-flex items-center text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
          <Minus className="w-2.5 h-2.5 mr-0.5" /> 0.0% MoM
        </span>
      );
    }
    const isGood = isPositiveGood ? diff > 0 : diff < 0;
    return (
      <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${
        isGood ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}>
        {diff > 0 ? (
          <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
        ) : (
          <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
        )}
        {diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs bln lalu
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* 1. Total Pesanan */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Pesanan Masuk
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {total.toLocaleString('id-ID')}
          </span>
          <span className="text-xs text-slate-500">paket</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Periode: {monthName}</span>
          {prevMonth && prevMonth.totalOrders > 0 && (
            <span className={`font-medium ${
              prevMonth.momGrowth >= 0 ? 'text-emerald-600' : 'text-slate-600'
            }`}>
              {prevMonth.momGrowth >= 0 ? '+' : ''}{prevMonth.momGrowth.toFixed(1)}% Vol MoM
            </span>
          )}
        </div>
      </div>

      {/* 2. Berhasil Terkirim (Delivered) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil Terkirim
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <PackageCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950 tracking-tight">
            {delivered.toLocaleString('id-ID')}
          </span>
          <span className="text-sm font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg">
            {deliveredRate.toFixed(1)}%
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-emerald-100">
          <span>Tingkat Sukses (Success Rate)</span>
          {prevMonth && renderMomBadge(deliveredRate, prevMonth.deliveredRate, true)}
        </div>
      </div>

      {/* 3. Status Terhandover (Serah Terima Kurir) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5" /> Terhandover
          </span>
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-indigo-950 tracking-tight">
            {handover.toLocaleString('id-ID')}
          </span>
          <span className="text-sm font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-lg">
            {handoverRate.toFixed(1)}%
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-indigo-100">
          <span>Serah Terima Ekspedisi</span>
          <span className="text-[11px] font-semibold text-indigo-700">
            {total - handover > 0 ? `${(total - handover).toLocaleString('id-ID')} blm HO` : 'Semua HO'}
          </span>
        </div>
      </div>

      {/* 4. Pesanan Dibatalkan (Cancelled) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-200/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-rose-50/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <PackageX className="w-3.5 h-3.5" /> Pesanan Batal
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <PackageX className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-rose-950 tracking-tight">
            {cancelled.toLocaleString('id-ID')}
          </span>
          <span className="text-sm font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-lg">
            {cancelledRate.toFixed(1)}%
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-rose-100">
          <span>Tingkat Pembatalan</span>
          {prevMonth && renderMomBadge(cancelledRate, prevMonth.cancelledRate, false)}
        </div>
      </div>

      {/* 4. Sedang Diproses & Retur */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            In-Transit & Retur
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {inTransit.toLocaleString('id-ID')}
          </span>
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded">
            Sedang Jalan
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-amber-500" /> Retur: {returned.toLocaleString('id-ID')} ({returnedRate.toFixed(2)}%)
          </span>
          <span className="text-[11px] text-slate-400">
            {summary.activePackers} Packer Aktif
          </span>
        </div>
      </div>
    </div>
  );
};
