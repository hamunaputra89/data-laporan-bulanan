import React, { useState } from 'react';
import { 
  Calendar, 
  Filter, 
  Search, 
  RotateCcw, 
  Truck, 
  UserCheck, 
  Building2, 
  Tag, 
  ChevronDown, 
  SlidersHorizontal,
  X,
  Sparkles
} from 'lucide-react';
import { FilterState, FilterOptions } from '../types.ts';

interface FilterBarProps {
  filters: FilterState;
  options: FilterOptions | undefined;
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  options,
  onChange,
  onReset,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Month labels format
  const formatMonthLabel = (ym: string) => {
    if (!ym || ym === 'all') return 'Semua Bulan';
    if (ym === 'Tanpa Tanggal') return 'Tanpa Tanggal';
    const [year, month] = ym.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${monthNames[mIdx]} ${year}`;
    }
    return ym;
  };

  const handleMonthSelect = (ym: string) => {
    onChange({
      ...filters,
      month: ym,
      startDate: '',
      endDate: '',
    });
  };

  const handlePreset = (type: string) => {
    switch (type) {
      case 'all':
        onChange({ ...filters, status: 'all', courier: 'all', search: '' });
        break;
      case 'delivered':
        onChange({ ...filters, status: 'Delivered' });
        break;
      case 'cancelled':
        onChange({ ...filters, status: 'Cancelled' });
        break;
      case 'returned':
        onChange({ ...filters, status: 'Returned' });
        break;
      case 'handover_yes':
        onChange({ ...filters, handover: 'yes' });
        break;
      case 'handover_no':
        onChange({ ...filters, handover: 'no' });
        break;
      case 'jne':
        onChange({ ...filters, courier: 'JNE (Semua)' });
        break;
      case 'jnt':
        onChange({ ...filters, courier: 'J&T (Semua)' });
        break;
      case 'spx':
        onChange({ ...filters, courier: 'SPX (Semua)' });
        break;
      default:
        break;
    }
  };

  // Count active non-default filters
  const activeCount = [
    filters.month !== '2026-08' && filters.month !== 'all',
    Boolean(filters.startDate || filters.endDate),
    filters.status !== 'all',
    filters.courier !== 'all',
    filters.packer !== 'all',
    filters.sloc !== 'all',
    filters.handover !== 'all',
    Boolean(filters.search.trim()),
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 mb-6 transition-all">
      {/* 1. Quick Month Selector Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Pilih Periode Bulan Laporan (Filter Otomatis)
          </label>
          <span className="text-xs text-slate-400">
            {filters.month === 'all' ? 'Menampilkan akumulasi seluruh data' : `Periode aktif: ${formatMonthLabel(filters.month)}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => handleMonthSelect('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filters.month === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Bulan
          </button>

          {options?.months?.map((m) => {
            const isSelected = filters.month === m.year_month;
            return (
              <button
                key={m.year_month}
                onClick={() => handleMonthSelect(m.year_month)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{formatMonthLabel(m.year_month)}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {m.count.toLocaleString('id-ID')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Search & Main Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Bar */}
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari Order ID, No Resi AWB, SN, SKU, No Handover..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="lg:col-span-2">
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => onChange({ ...filters, status: e.target.value })}
              className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            >
              <option value="all">Semua Status</option>
              {options?.statuses?.map((st) => (
                <option key={st.status} value={st.status}>
                  {st.status} ({st.count.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Courier Dropdown */}
        <div className="lg:col-span-3">
          <div className="relative">
            <select
              value={filters.courier}
              onChange={(e) => onChange({ ...filters, courier: e.target.value })}
              className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            >
              <option value="all">Semua Kurir Ekspedisi</option>
              {options?.couriers?.map((c) => (
                <option key={c.courier} value={c.courier}>
                  {c.courier} ({c.count.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Advanced Filters Toggle & Reset Button */}
        <div className="lg:col-span-3 flex items-center justify-end gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              showAdvanced || activeCount > 0
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter Lanjutan</span>
            {activeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </button>

          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
            title="Kembalikan semua filter ke pengaturan awal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* 3. Advanced Collapsible Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50/70 p-3 rounded-xl">
          {/* Custom Date Range Start */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Tanggal Mulai (Print Date)
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Custom Date Range End */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Tanggal Akhir (Print Date)
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* SLOC Location Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Storage Location (SLOC)
            </label>
            <div className="relative">
              <select
                value={filters.sloc}
                onChange={(e) => onChange({ ...filters, sloc: e.target.value })}
                className="w-full appearance-none pl-2.5 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Lokasi SLOC</option>
                {options?.slocs?.map((sl) => (
                  <option key={sl.sloc} value={sl.sloc}>
                    SLOC {sl.sloc} ({sl.count.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Handover Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Status Handover / Serah Terima
            </label>
            <div className="relative">
              <select
                value={filters.handover || 'all'}
                onChange={(e) => onChange({ ...filters, handover: e.target.value })}
                className="w-full appearance-none pl-2.5 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="all">Semua Status Handover</option>
                <option value="yes">✓ Sudah Terhandover (Ada No. HO)</option>
                <option value="no">✕ Belum Terhandover (Tanpa HO)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Packer Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Petugas Packer Gudang
            </label>
            <div className="relative">
              <select
                value={filters.packer}
                onChange={(e) => onChange({ ...filters, packer: e.target.value })}
                className="w-full appearance-none pl-2.5 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Petugas Packer</option>
                {options?.packers?.map((p) => (
                  <option key={p.packer} value={p.packer}>
                    {p.packer} ({p.count.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* 4. Quick Filter Presets Row */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Preset Cepat:
        </span>
        <button
          onClick={() => handlePreset('handover_yes')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
            filters.handover === 'yes'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
          }`}
        >
          ✓ Sudah Terhandover
        </button>
        <button
          onClick={() => handlePreset('delivered')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
            filters.status === 'Delivered'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
          }`}
        >
          ✓ Hanya Terkirim (Delivered)
        </button>
        <button
          onClick={() => handlePreset('cancelled')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
            filters.status === 'Cancelled'
              ? 'bg-rose-600 text-white'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
          }`}
        >
          ✕ Pesanan Dibatalkan
        </button>
        <button
          onClick={() => handlePreset('returned')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
            filters.status === 'Returned'
              ? 'bg-amber-600 text-white'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
          }`}
        >
          ↻ Retur Barang
        </button>
        <button
          onClick={() => handlePreset('jne')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
            filters.courier === 'JNE (Semua)' || filters.courier === 'JNE'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Kurir JNE
        </button>
        <button
          onClick={() => handlePreset('jnt')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
            filters.courier === 'J&T (Semua)' || filters.courier === 'J&T'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Kurir J&T
        </button>
        <button
          onClick={() => handlePreset('spx')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
            filters.courier === 'SPX (Semua)' || filters.courier === 'SPX'
              ? 'bg-orange-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Kurir SPX
        </button>
      </div>

      {/* 5. Active Filter Tags */}
      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium text-[11px]">Filter Aktif:</span>
          {filters.month !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
              Bulan: {formatMonthLabel(filters.month)}
              <X className="w-3 h-3 cursor-pointer hover:text-blue-900" onClick={() => handleMonthSelect('all')} />
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
              Status: {filters.status}
              <X className="w-3 h-3 cursor-pointer hover:text-emerald-900" onClick={() => onChange({ ...filters, status: 'all' })} />
            </span>
          )}
          {filters.courier !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px]">
              Kurir: {filters.courier}
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => onChange({ ...filters, courier: 'all' })} />
            </span>
          )}
          {filters.packer !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[11px]">
              Packer: {filters.packer}
              <X className="w-3 h-3 cursor-pointer hover:text-violet-900" onClick={() => onChange({ ...filters, packer: 'all' })} />
            </span>
          )}
          {filters.sloc !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
              SLOC: {filters.sloc}
              <X className="w-3 h-3 cursor-pointer hover:text-amber-900" onClick={() => onChange({ ...filters, sloc: 'all' })} />
            </span>
          )}
          {filters.handover && filters.handover !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
              Handover: {filters.handover === 'yes' ? 'Sudah Terhandover' : 'Belum Handover'}
              <X className="w-3 h-3 cursor-pointer hover:text-blue-900" onClick={() => onChange({ ...filters, handover: 'all' })} />
            </span>
          )}
          {(filters.startDate || filters.endDate) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[11px]">
              Rentang: {filters.startDate || 'Awal'} s/d {filters.endDate || 'Akhir'}
              <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => onChange({ ...filters, startDate: '', endDate: '' })} />
            </span>
          )}
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px]">
              Kata Kunci: "{filters.search}"
              <X className="w-3 h-3 cursor-pointer hover:text-sky-900" onClick={() => onChange({ ...filters, search: '' })} />
            </span>
          )}
        </div>
      )}
    </div>
  );
};
