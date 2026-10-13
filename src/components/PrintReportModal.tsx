import React from 'react';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { AnalyticsResponse, FilterState } from '../types.ts';

interface PrintReportModalProps {
  analytics: AnalyticsResponse | null;
  filters: FilterState;
  onClose: () => void;
  monthLabel: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  analytics,
  filters,
  onClose,
  monthLabel,
}) => {
  if (!analytics) return null;

  const { summary, courierBreakdown, packerBreakdown, slocBreakdown } = analytics;

  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-200">
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-sm">Pratinjau Laporan Bulanan Resmi (Siap Cetak / PDF)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 max-h-[85vh] overflow-y-auto print:max-h-none print:p-0 print:overflow-visible text-slate-800 font-sans">
          {/* Header Formal */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                  Laporan Bulanan Operasional Logistik & Pengiriman
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Divisi Manajemen Gudang, Fulfillment & Distribusi Ekspedisi
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sistem Database Warehouse & Fulfillment Terverifikasi
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1 rounded-md mb-1">
                  Periode: {monthLabel}
                </span>
                <p className="text-[11px] text-slate-500">
                  Tanggal Terbit: {currentDateStr}
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Ringkasan Eksekutif (Executive Summary KPIs) */}
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 border-b border-slate-200 pb-1">
              I. Ringkasan Eksekutif Pemrosesan Pesanan
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Pesanan Diproses</span>
                <span className="text-lg font-black text-slate-900">{summary.totalOrders.toLocaleString('id-ID')}</span>
                <span className="text-[10px] text-slate-400 block">Unit Paket Terdaftar</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-emerald-800 uppercase font-semibold block">Berhasil Terkirim</span>
                <span className="text-lg font-black text-emerald-900">{summary.deliveredCount.toLocaleString('id-ID')}</span>
                <span className="text-[10px] font-bold text-emerald-700 block">{summary.deliveredRate.toFixed(2)}% Delivery Rate</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                <span className="text-[10px] text-rose-800 uppercase font-semibold block">Pesanan Batal</span>
                <span className="text-lg font-black text-rose-900">{summary.cancelledCount.toLocaleString('id-ID')}</span>
                <span className="text-[10px] font-bold text-rose-700 block">{summary.cancelledRate.toFixed(2)}% Cancel Rate</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">In-Transit / Retur</span>
                <span className="text-lg font-black text-slate-900">{(summary.shippedCount + summary.returnedCount).toLocaleString('id-ID')}</span>
                <span className="text-[10px] text-slate-500 block">Retur: {summary.returnedCount.toLocaleString('id-ID')} ({summary.returnedRate.toFixed(2)}%)</span>
              </div>
            </div>
          </div>

          {/* Section 2: Kinerja Kurir Ekspedisi */}
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 border-b border-slate-200 pb-1">
              II. Analisis Kinerja Ekspedisi Logistik
            </h2>
            <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200">
              <thead className="bg-slate-100 font-semibold text-[10px] uppercase text-slate-700">
                <tr>
                  <th className="p-2">Kurir</th>
                  <th className="p-2 text-right">Volume</th>
                  <th className="p-2 text-right">Pangsa (%)</th>
                  <th className="p-2 text-right">Delivered</th>
                  <th className="p-2 text-right">Cancelled</th>
                  <th className="p-2 text-right">Success Rate (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courierBreakdown.slice(0, 8).map((c) => (
                  <tr key={c.courier}>
                    <td className="p-2 font-semibold text-slate-800">{c.courier}</td>
                    <td className="p-2 text-right font-mono">{c.total.toLocaleString('id-ID')}</td>
                    <td className="p-2 text-right">{c.share.toFixed(1)}%</td>
                    <td className="p-2 text-right text-emerald-700 font-semibold">{c.delivered.toLocaleString('id-ID')}</td>
                    <td className="p-2 text-right text-rose-600">{c.cancelled.toLocaleString('id-ID')}</td>
                    <td className="p-2 text-right font-bold text-slate-900">{c.deliveredRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Produktivitas Tim Packer & Gudang */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 border-b border-slate-200 pb-1">
                III. Top 5 Petugas Packer
              </h2>
              <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200">
                <thead className="bg-slate-100 font-semibold text-[10px] uppercase text-slate-700">
                  <tr>
                    <th className="p-1.5">Nama Packer</th>
                    <th className="p-1.5 text-right">Total Paket</th>
                    <th className="p-1.5 text-right">Akurasi (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {packerBreakdown.slice(0, 5).map((p) => (
                    <tr key={p.packer}>
                      <td className="p-1.5 font-medium">{p.packer}</td>
                      <td className="p-1.5 text-right font-mono font-bold">{p.total.toLocaleString('id-ID')}</td>
                      <td className="p-1.5 text-right text-emerald-700">{p.deliveredRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 border-b border-slate-200 pb-1">
                IV. Distribusi Lokasi Gudang (SLOC)
              </h2>
              <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200">
                <thead className="bg-slate-100 font-semibold text-[10px] uppercase text-slate-700">
                  <tr>
                    <th className="p-1.5">SLOC</th>
                    <th className="p-1.5 text-right">Volume</th>
                    <th className="p-1.5 text-right">Pangsa (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slocBreakdown.map((s) => (
                    <tr key={s.sloc}>
                      <td className="p-1.5 font-medium">SLOC {s.sloc}</td>
                      <td className="p-1.5 text-right font-mono font-bold">{s.total.toLocaleString('id-ID')}</td>
                      <td className="p-1.5 text-right">{s.share.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Sign-off & Approval Section */}
          <div className="pt-6 border-t border-slate-300">
            <p className="text-[10px] text-slate-400 italic mb-4">
              Laporan ini dibuat otomatis dari sistem database analitik pemrosesan gudang. Seluruh data diverifikasi sesuai rekaman pengiriman.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <p className="text-[11px] text-slate-500 mb-14">Dibuat Oleh:</p>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">Staff Administrasi Gudang</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 mb-14">Diperiksa Oleh:</p>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">Supervisor Logistik</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 mb-14">Disetujui Oleh:</p>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">Head of Operations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
