import React from 'react';
import { Truck, CheckCircle, XCircle, ArrowUpRight, BarChart } from 'lucide-react';
import { CourierBreakdownItem } from '../types.ts';

interface CourierAnalysisProps {
  data: CourierBreakdownItem[];
  onSelectCourier: (courier: string) => void;
  selectedCourier: string;
}

export const CourierAnalysis: React.FC<CourierAnalysisProps> = ({
  data,
  onSelectCourier,
  selectedCourier,
}) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            Kinerja Ekspedisi & Logistik Kurir
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Komparasi volume pengiriman dan tingkat keberhasilan (Delivered Rate) tiap kurir
          </p>
        </div>
        <span className="text-xs text-slate-400">
          Klik baris kurir untuk memfilter otomatis
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-y border-slate-200/80">
            <tr>
              <th className="py-2.5 px-3">Nama Ekspedisi Kurir</th>
              <th className="py-2.5 px-3 text-right">Total Paket</th>
              <th className="py-2.5 px-3 text-right">Pangsa (%)</th>
              <th className="py-2.5 px-3 text-right">Berhasil (Delivered)</th>
              <th className="py-2.5 px-3 text-right">Batal (Cancelled)</th>
              <th className="py-2.5 px-3 text-right">Success Rate (%)</th>
              <th className="py-2.5 px-3">Visualisasi Rasio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((c) => {
              const isSelected = selectedCourier === c.courier;
              return (
                <tr
                  key={c.courier}
                  onClick={() => onSelectCourier(isSelected ? 'all' : c.courier)}
                  className={`cursor-pointer transition hover:bg-blue-50/60 ${
                    isSelected ? 'bg-blue-50/90 font-medium' : ''
                  }`}
                >
                  <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>{c.courier}</span>
                    {isSelected && (
                      <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-normal">
                        Terpilih
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    {c.total.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500">
                    {c.share.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-semibold">
                    {c.delivered.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-600 font-medium">
                    {c.cancelled.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                      c.deliveredRate >= 75
                        ? 'bg-emerald-100 text-emerald-800'
                        : c.deliveredRate >= 50
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {c.deliveredRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 w-44">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${c.deliveredRate}%` }}
                        className="bg-emerald-500 h-full"
                        title={`Terkirim: ${c.deliveredRate.toFixed(1)}%`}
                      />
                      <div
                        style={{ width: `${100 - c.deliveredRate}%` }}
                        className="bg-rose-300 h-full"
                        title={`Gagal/Batal: ${(100 - c.deliveredRate).toFixed(1)}%`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
