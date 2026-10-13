import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  Package, 
  Clock, 
  Truck, 
  User, 
  ExternalLink,
  Eye
} from 'lucide-react';
import { OrderItem } from '../types.ts';

interface OrdersTableProps {
  orders: OrderItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onSelectOrder: (order: OrderItem) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (col: string) => void;
}

export const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  pagination,
  isLoading,
  onPageChange,
  onLimitChange,
  onSelectOrder,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Ready to Ship':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Returned':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            Data Detail Transaksi Pesanan Gudang
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ditemukan {pagination.total.toLocaleString('id-ID')} baris data yang cocok dengan filter
          </p>
        </div>

        {/* Page size limit */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>Tampilkan:</span>
          <select
            value={pagination.limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
            className="border border-slate-200 rounded-lg px-2.5 py-1 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="15">15 per halaman</option>
            <option value="25">25 per halaman</option>
            <option value="50">50 per halaman</option>
            <option value="100">100 per halaman</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto relative min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold bg-white px-4 py-2 rounded-xl shadow-md border border-slate-100">
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              Memuat data...
            </div>
          </div>
        )}

        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-3 w-12 text-center">No</th>
              <th 
                className="py-3 px-3 cursor-pointer hover:text-blue-600"
                onClick={() => onSortChange('order_id')}
              >
                <div className="flex items-center gap-1">
                  <span>Marketplace Order ID</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th 
                className="py-3 px-3 cursor-pointer hover:text-blue-600"
                onClick={() => onSortChange('status')}
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-3">SKU Barang</th>
              <th 
                className="py-3 px-3 cursor-pointer hover:text-blue-600"
                onClick={() => onSortChange('courier')}
              >
                <div className="flex items-center gap-1">
                  <span>Kurir / Ekspedisi</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-3">No. Resi (AWB)</th>
              <th 
                className="py-3 px-3 cursor-pointer hover:text-blue-600"
                onClick={() => onSortChange('packer')}
              >
                <div className="flex items-center gap-1">
                  <span>Packer</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-3">SLOC</th>
              <th 
                className="py-3 px-3 cursor-pointer hover:text-blue-600"
                onClick={() => onSortChange('print_date')}
              >
                <div className="flex items-center gap-1">
                  <span>Tanggal Print</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  Tidak ditemukan pesanan dengan kombinasi filter ini.
                </td>
              </tr>
            ) : (
              orders.map((order, idx) => {
                const rowNum = (pagination.page - 1) * pagination.limit + idx + 1;
                return (
                  <tr
                    key={order.id || idx}
                    onClick={() => onSelectOrder(order)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {rowNum}
                    </td>

                    {/* Order ID */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-mono font-medium text-slate-800">
                        <span>{order.order_id}</span>
                        <button
                          onClick={(e) => handleCopy(order.order_id, e)}
                          className="text-slate-400 hover:text-blue-600 transition"
                          title="Salin Order ID"
                        >
                          {copiedId === order.order_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {order.mit_dn && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          DN: {order.mit_dn}
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(order.status)}`}>
                        {order.status || '-'}
                      </span>
                    </td>

                    {/* SKU */}
                    <td className="py-2.5 px-3 font-mono text-slate-700 font-medium">
                      {order.sku || '-'}
                      {order.sn && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          SN: {order.sn}
                        </span>
                      )}
                    </td>

                    {/* Courier */}
                    <td className="py-2.5 px-3 text-slate-700">
                      {order.courier || '-'}
                    </td>

                    {/* AWB */}
                    <td className="py-2.5 px-3 font-mono">
                      {order.awb ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-blue-600 font-semibold">{order.awb}</span>
                          <button
                            onClick={(e) => handleCopy(order.awb, e)}
                            className="text-slate-400 hover:text-blue-600 transition"
                            title="Salin No Resi AWB"
                          >
                            {copiedId === order.awb ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Packer */}
                    <td className="py-2.5 px-3 text-slate-700">
                      {order.packer || <span className="text-slate-400 italic">Belum assign</span>}
                    </td>

                    {/* SLOC */}
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {order.sloc ? `SLOC ${order.sloc}` : '-'}
                    </td>

                    {/* Print Date */}
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {order.print_date || <span className="text-slate-400 italic">Tanpa tanggal</span>}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrder(order);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition"
                        title="Lihat Detail Pesanan"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Halaman <span className="font-bold text-slate-900">{pagination.page}</span> dari{' '}
          <span className="font-bold text-slate-900">{pagination.totalPages || 1}</span>{' '}
          (Total {pagination.total.toLocaleString('id-ID')} pesanan)
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(1)}
            disabled={pagination.page <= 1}
            className="px-2 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
          >
            Awal
          </button>
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Sebelumnya</span>
          </button>

          <span className="px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200">
            {pagination.page}
          </span>

          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1"
          >
            <span>Berikutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPageChange(pagination.totalPages)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-2 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
          >
            Akhir
          </button>
        </div>
      </div>
    </div>
  );
};
