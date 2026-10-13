import React from 'react';
import { X, Copy, Check, Package, Truck, User, Calendar, Tag, ShieldCheck } from 'lucide-react';
import { OrderItem } from '../types.ts';

interface OrderDetailModalProps {
  order: OrderItem | null;
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose }) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!order) return null;

  const copyVal = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fields = [
    { label: 'Marketplace Order ID', val: order.order_id, key: 'order_id', isMono: true, bold: true },
    { label: 'Status Pengiriman', val: order.status, key: 'status', isBadge: true },
    { label: 'MIT DN (Delivery Note)', val: order.mit_dn || '-', key: 'mit_dn', isMono: true },
    { label: 'SKU Number (Item)', val: order.sku || '-', key: 'sku', isMono: true, bold: true },
    { label: 'Kurir Ekspedisi', val: order.courier || '-', key: 'courier' },
    { label: 'Nomor Resi / AWB', val: order.awb || '-', key: 'awb', isMono: true, bold: true, highlight: true },
    { label: 'Nomor Serial (SN)', val: order.sn || 'Tidak Ada SN', key: 'sn', isMono: true },
    { label: 'Storage Location (SLOC)', val: order.sloc ? `SLOC ${order.sloc}` : '-', key: 'sloc' },
    { label: 'Petugas Packer', val: order.packer || 'Belum Ditugaskan', key: 'packer' },
    { label: 'Tanggal Cetak (Print Date)', val: order.print_date || 'Tanpa Tanggal', key: 'print_date' },
    { label: 'Nomor Handover', val: order.handover_no || 'Belum Ada Handover', key: 'handover_no', isMono: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Detail Pesanan Gudang</h3>
              <p className="text-[11px] text-slate-400 font-mono">ID: {order.order_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-4 sm:p-6 space-y-3 max-h-[75vh] overflow-y-auto">
          {fields.map((f) => (
            <div
              key={f.key}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                f.highlight
                  ? 'bg-blue-50/60 border-blue-200'
                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100/60'
              }`}
            >
              <div className="min-w-0 pr-2">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {f.label}
                </span>
                <span className={`block truncate ${f.isMono ? 'font-mono' : ''} ${f.bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                  {f.val}
                </span>
              </div>

              {f.val && f.val !== '-' && f.val !== 'Tidak Ada SN' && (
                <button
                  onClick={() => copyVal(f.key, f.val)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition flex-shrink-0"
                  title="Salin nilai"
                >
                  {copiedKey === f.key ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
