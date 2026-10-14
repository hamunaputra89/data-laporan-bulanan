import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Github, 
  FileCheck,
  ArrowRight,
  Info
} from 'lucide-react';
import { SystemStatus } from '../types.ts';
import { parseCSVToRows } from '../clientDataEngine.ts';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported: (status: SystemStatus) => void;
  isBackendActive: boolean;
  onTriggerBackendSync: () => void;
  isSyncing: boolean;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onDataImported,
  isBackendActive,
  onTriggerBackendSync,
  isSyncing,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'github' | 'server'>('upload');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadError(null);
    setUploadSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.length < 50) {
          throw new Error('File CSV kosong atau tidak valid.');
        }

        const { rows, status } = parseCSVToRows(text);
        if (rows.length === 0) {
          throw new Error('Tidak ada data pesanan yang terbaca dari file CSV.');
        }

        setUploadSuccess(
          `Berhasil memuat ${rows.length.toLocaleString('id-ID')} data pesanan! Filter dan laporan telah diperbarui.`
        );
        onDataImported(status);
        setTimeout(() => {
          setIsProcessingFile(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setUploadError(err.message || 'Gagal memproses file CSV.');
        setIsProcessingFile(false);
      }
    };

    reader.onerror = () => {
      setUploadError('Gagal membaca file dari komputer Anda.');
      setIsProcessingFile(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Sinkronisasi & Pembaruan Data</h3>
              <p className="text-[11px] text-slate-400">
                Pilihan metode pembaruan data untuk website GitHub Pages
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-[1px] flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah CSV (Instan)</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-[1px] flex items-center gap-1.5 ${
              activeTab === 'github'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>Otomasi GitHub Actions</span>
          </button>

          {isBackendActive && (
            <button
              onClick={() => setActiveTab('server')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-[1px] flex items-center gap-1.5 ${
                activeTab === 'server'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Server Sync</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Kenapa di GitHub Pages tidak bisa sinkron langsung via tombol?</p>
                  <p className="text-blue-800 text-[11px]">
                    GitHub Pages merupakan hosting web statis murni tanpa server backend. Google Spreadsheet juga melarang peramban web (browser) mengunduh file secara otomatis lintas domain (kebijakan CORS).
                  </p>
                  <p className="text-blue-800 text-[11px] mt-1 font-medium">
                    Cara termudah: Unduh file CSV dari spreadsheet sekali (File &gt; Download &gt; CSV), lalu pilih file di bawah ini. Data langsung terintegrasi secara instan tanpa perlu reload!
                  </p>
                </div>
              </div>

              {/* Upload Dropzone */}
              <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 flex items-center justify-center mb-3 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {isProcessingFile ? 'Sedang memproses data...' : 'Klik untuk memilih File CSV Spreadsheet'}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Format .csv hasil ekspor sheet (Mendukung hingga ratusan ribu baris)
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  disabled={isProcessingFile}
                  className="hidden"
                />
              </label>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>{uploadSuccess}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Github className="w-4 h-4" />
                  <span>Otomasi Sinkronisasi Terjadwal (GitHub Actions)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Jika Anda ingin data di GitHub Pages ter-update secara otomatis setiap hari tanpa perlu upload manual, repository ini telah dilengkapi dengan workflow GitHub Actions:
                </p>
                <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-[11px]">
                  .github/workflows/sync-data.yml
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                  Langkah Menjalankan di GitHub:
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                  <li>Buka repositori GitHub Anda di browser.</li>
                  <li>Klik tab <b>Actions</b> di bagian atas repositori.</li>
                  <li>Pilih workflow <b>Sync Spreadsheet Data &amp; Deploy</b> di menu sebelah kiri.</li>
                  <li>Klik tombol <b>Run workflow</b> &gt; <b>Run workflow</b>.</li>
                  <li>GitHub akan otomatis mengunduh spreadsheet terbaru dan meng-update website Anda dalam 1-2 menit!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'server' && isBackendActive && (
            <div className="space-y-4 text-xs text-slate-600">
              <p>
                Server backend Node.js / Express terdeteksi aktif. Anda dapat memicu sinkronisasi langsung dari database.
              </p>
              <button
                onClick={onTriggerBackendSync}
                disabled={isSyncing}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sedang Menyinkronkan...' : 'Mulai Sinkronisasi Server'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
