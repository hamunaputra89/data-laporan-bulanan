import React from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Download, 
  Printer, 
  ExternalLink, 
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { SystemStatus, FilterState } from '../types.ts';

interface NavbarProps {
  status: SystemStatus | null;
  filters: FilterState;
  onRefresh: () => void;
  onOpenPrintModal: () => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  filters,
  onRefresh,
  onOpenPrintModal,
  onTriggerSync,
  isSyncing,
}) => {
  const spreadsheetUrl = "https://docs.google.com/spreadsheets/d/1bdD0HshoPpbbhMNzlCfAfV4UGUOaSwjhoYMmLLbbJ_I/edit?gid=1566921166#gid=1566921166";

  const getExportUrl = () => {
    const params = new URLSearchParams();
    if (filters.month && filters.month !== 'all') params.set('month', filters.month);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.courier && filters.courier !== 'all') params.set('courier', filters.courier);
    if (filters.packer && filters.packer !== 'all') params.set('packer', filters.packer);
    if (filters.sloc && filters.sloc !== 'all') params.set('sloc', filters.sloc);
    if (filters.handover && filters.handover !== 'all') params.set('handover', filters.handover);
    if (filters.search) params.set('search', filters.search);
    return `/api/export?${params.toString()}`;
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-inner">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight leading-none">
                  Laporan Bulanan Logistik & Pengiriman
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Database Terindeks: {status?.totalRows ? status.totalRows.toLocaleString('id-ID') : '398.532'} Pesanan</span>
                {status?.meta?.lastSync && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" /> Terakhir Sinkron: {status.meta.lastSync}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Original Spreadsheet */}
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
              title="Buka Spreadsheet Asli di Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Sheet</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            {/* Sync from Google Sheets */}
            <button
              onClick={onTriggerSync}
              disabled={isSyncing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isSyncing 
                  ? 'bg-amber-950/70 text-amber-300 border border-amber-800/80 cursor-wait' 
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
              title="Sinkronkan data terbaru langsung dari Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-blue-400'}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data'}</span>
            </button>

            {/* Print Official Monthly Report */}
            <button
              onClick={onOpenPrintModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Cetak atau simpan Laporan Bulanan Resmi sebagai PDF"
            >
              <Printer className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Cetak Laporan</span>
            </button>

            {/* Export CSV */}
            <a
              href={getExportUrl()}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
              title="Unduh data terfilter dalam format file CSV / Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
