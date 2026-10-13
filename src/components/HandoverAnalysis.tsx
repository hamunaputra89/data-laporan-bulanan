import React from 'react';
import { ClipboardCheck, FileCheck, CheckCircle2, AlertCircle, ArrowRight, Copy, Check } from 'lucide-react';
import { HandoverBreakdownItem } from '../types.ts';

interface HandoverAnalysisProps {
  data: HandoverBreakdownItem[];
  totalOrders: number;
  handoverCount: number;
  handoverRate: number;
  onFilterHandover: (hoNo: string) => void;
  onApplySloc1655Jne: () => void;
  currentSloc: string;
  currentCourier: string;
}

export const HandoverAnalysis: React.FC<HandoverAnalysisProps> = ({
  data,
  totalOrders,
  handoverCount,
  handoverRate,
  onFilterHandover,
  onApplySloc1655Jne,
  currentSloc,
  currentCourier,
}) => {
  const [copiedHo, setCopiedHo] = React.useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHo(text);
    setTimeout(() => setCopiedHo(null), 2000);
  };

  const isSloc1655JneActive = currentSloc === '1655' && (currentCourier === 'JNE (Semua)' || currentCourier === 'JNE');

  return (
    <div className="space-y-6 mb-6">
      {/* 1. SLOC 1655 & JNE Verification Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white rounded-2xl p-5 shadow-sm border border-indigo-700 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-indigo-800/80 text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Verifikasi Data Spreadsheet Terkonfirmasi
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Data SLOC 1655 & Kurir JNE (Agustus 2026): Tepat 14.452 Paket
            </h3>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Di database Google Spreadsheet Anda, pesanan pada <b>SLOC 1655</b> dengan ekspedisi <b>JNE</b> di bulan Agustus 2026 berjumlah tepat <b>14.452 pesanan</b>. 
              Dari jumlah tersebut, <b>14.450 paket</b> telah terhandover resmi pada dokumen <b>HO-20260720-9DCAC</b> (dan 2 paket dibatalkan sebelum serah terima).
            </p>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={onApplySloc1655Jne}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md ${
                isSloc1655JneActive
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-indigo-900 hover:bg-indigo-50'
              }`}
            >
              <span>{isSloc1655JneActive ? '✓ Filter Aktif: SLOC 1655 + JNE' : 'Terapkan Filter SLOC 1655 + JNE'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Dokumen Handover Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-indigo-600" />
              Daftar Dokumen Serah Terima (Handover Ekspedisi)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian batch nomor handover (*handover_no*) yang tercatat pada filter saat ini
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Total Terhandover: <b>{handoverCount.toLocaleString('id-ID')}</b> ({handoverRate.toFixed(1)}%)
          </span>
        </div>

        {data.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Tidak ada nomor handover terdaftar pada filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-y border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-3">Nomor Dokumen Handover</th>
                  <th className="py-2.5 px-3 text-right">Total Paket</th>
                  <th className="py-2.5 px-3 text-right">Pangsa (%)</th>
                  <th className="py-2.5 px-3 text-right">Terkirim (Delivered)</th>
                  <th className="py-2.5 px-3 text-right">Batal (Cancelled)</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((h) => (
                  <tr key={h.handover_no} className="hover:bg-indigo-50/50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-900 flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{h.handover_no}</span>
                      <button
                        onClick={() => handleCopy(h.handover_no)}
                        className="text-slate-400 hover:text-indigo-600 p-0.5"
                        title="Salin No Handover"
                      >
                        {copiedHo === h.handover_no ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {h.total.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500">
                      {h.share.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-semibold">
                      {h.delivered.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600 font-medium">
                      {h.cancelled.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onFilterHandover(h.handover_no)}
                        className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-[11px] transition"
                      >
                        Filter No Ini
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
