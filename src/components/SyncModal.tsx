import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Github, 
  Clock, 
  Settings, 
  Timer, 
  Check, 
  ShieldCheck, 
  Zap, 
  Calendar 
} from 'lucide-react';
import { SystemStatus, AutoSyncConfig } from '../types.ts';
import { parseCSVToRows } from '../clientDataEngine.ts';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported: (status: SystemStatus) => void;
  isBackendActive: boolean;
  onTriggerBackendSync: () => void;
  isSyncing: boolean;
  systemStatus: SystemStatus | null;
  onUpdateAutoSync?: (enabled: boolean, intervalMinutes: number) => Promise<void> | void;
}

const INTERVAL_OPTIONS = [
  { value: 15, label: '15 Menit', desc: 'Sangat sering' },
  { value: 30, label: '30 Menit', desc: 'Rekomendasi default' },
  { value: 60, label: '1 Jam', desc: 'Optimal untuk tim operasional' },
  { value: 180, label: '3 Jam', desc: 'Cukup untuk update harian' },
  { value: 360, label: '6 Jam', desc: 'Cocok dengan jadwal GitHub' },
  { value: 720, label: '12 Jam', desc: 'Dua kali sehari' },
  { value: 1440, label: '24 Jam', desc: 'Sekali sehari setiap malam' },
];

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onDataImported,
  isBackendActive,
  onTriggerBackendSync,
  isSyncing,
  systemStatus,
  onUpdateAutoSync,
}) => {
  const [activeTab, setActiveTab] = useState<'autosync' | 'upload' | 'github'>('autosync');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Auto-sync configuration state
  const currentAutoSync: AutoSyncConfig = systemStatus?.autoSync || {
    enabled: true,
    intervalMinutes: 30,
    lastSyncTime: systemStatus?.meta?.lastSync || null,
    nextSyncTime: null,
    totalRuns: 0,
    lastStatus: 'idle',
    lastError: null,
  };

  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(currentAutoSync.enabled);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(currentAutoSync.intervalMinutes || 30);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (systemStatus?.autoSync) {
      setAutoSyncEnabled(systemStatus.autoSync.enabled);
      setIntervalMinutes(systemStatus.autoSync.intervalMinutes || 30);
    }
  }, [systemStatus?.autoSync]);

  if (!isOpen) return null;

  const handleToggleAutoSync = async () => {
    const nextState = !autoSyncEnabled;
    setAutoSyncEnabled(nextState);
    if (onUpdateAutoSync) {
      setIsSavingConfig(true);
      try {
        await onUpdateAutoSync(nextState, intervalMinutes);
        setConfigFeedback(nextState ? 'Auto-Sync berhasil diaktifkan!' : 'Auto-Sync telah dinonaktifkan.');
        setTimeout(() => setConfigFeedback(null), 3000);
      } finally {
        setIsSavingConfig(false);
      }
    }
  };

  const handleIntervalChange = async (newInterval: number) => {
    setIntervalMinutes(newInterval);
    if (onUpdateAutoSync) {
      setIsSavingConfig(true);
      try {
        await onUpdateAutoSync(autoSyncEnabled, newInterval);
        setConfigFeedback(`Interval Auto-Sync diubah ke ${newInterval} menit.`);
        setTimeout(() => setConfigFeedback(null), 3000);
      } finally {
        setIsSavingConfig(false);
      }
    }
  };

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

  // Helper formatting for next sync
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner">
              <RefreshCw className={`w-4 h-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight">Pengaturan Auto-Sync & Pembaruan</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  Spreadsheet Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sinkronisasi otomatis dengan Google Spreadsheet secara berkala
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('autosync')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-[1px] flex items-center gap-1.5 ${
              activeTab === 'autosync'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Auto-Sync Otomatis</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-[1px] flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah CSV Manual</span>
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
            <span>GitHub Actions</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {activeTab === 'autosync' && (
            <div className="space-y-4">
              {/* Feedback Alert */}
              {configFeedback && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{configFeedback}</span>
                </div>
              )}

              {/* Status Card */}
              <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm border border-slate-700/60">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Status Auto-Sync Server
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {autoSyncEnabled ? `Berjalan otomatis setiap ${intervalMinutes} menit` : 'Auto-Sync sedang dinonaktifkan'}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={handleToggleAutoSync}
                    disabled={isSavingConfig}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoSyncEnabled ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Terakhir Sinkron</span>
                    <span className="font-semibold text-white">
                      {formatTime(currentAutoSync.lastSyncTime || systemStatus?.meta?.lastSync)}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Sinkron Berikutnya</span>
                    <span className="font-semibold text-amber-300">
                      {autoSyncEnabled ? formatTime(currentAutoSync.nextSyncTime) : 'Tidak aktif'}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Total Baris Terindeks</span>
                    <span className="font-semibold text-emerald-400">
                      {systemStatus?.totalRows ? systemStatus.totalRows.toLocaleString('id-ID') : '398.532'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interval Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-blue-600" />
                    <span>Frekuensi / Interval Auto-Sync:</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {intervalMinutes} Menit
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {INTERVAL_OPTIONS.slice(0, 4).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleIntervalChange(opt.value)}
                      disabled={!autoSyncEnabled || isSavingConfig}
                      className={`p-2.5 rounded-xl text-left border transition text-xs relative ${
                        intervalMinutes === opt.value
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      } ${!autoSyncEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt.label}</span>
                        {intervalMinutes === opt.value && (
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {INTERVAL_OPTIONS.slice(4).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleIntervalChange(opt.value)}
                      disabled={!autoSyncEnabled || isSavingConfig}
                      className={`p-2 rounded-xl text-left border transition text-xs ${
                        intervalMinutes === opt.value
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      } ${!autoSyncEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt.label}</span>
                        {intervalMinutes === opt.value && (
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Trigger Now */}
              <div className="pt-2">
                <button
                  onClick={onTriggerBackendSync}
                  disabled={isSyncing}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sedang Menyinkronkan dari Spreadsheet...' : 'Sinkronkan Sekarang Secara Manual'}</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-1.5">
                  Proses sinkronisasi langsung mengunduh Google Spreadsheet tanpa mengganggu tampilan saat ini.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Unggah CSV Langsung (Offline / GitHub Pages)</p>
                  <p className="text-blue-800 text-[11px]">
                    Jika Anda menggunakan website di GitHub Pages atau sedang offline, Anda dapat mengekspor spreadsheet ke format CSV lalu mengunggahnya ke sini. Data langsung diproses di memori browser secara instan!
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
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Github className="w-4 h-4" />
                  <span>Otomasi Auto-Sync GitHub Actions (Setiap 6 Jam)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Untuk repositori GitHub Anda, kami telah mengonfigurasi workflow GitHub Actions terjadwal otomatis:
                </p>
                <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-[11px]">
                  .github/workflows/sync-data.yml
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-900">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Jadwal Cron Otomatis:</span>
                </p>
                <p className="text-[11px] text-emerald-800">
                  Workflow ini otomatis dijalankan oleh server GitHub setiap <b>6 jam sekali</b> (pukul 00:00, 06:00, 12:00, dan 18:00 UTC). Server GitHub akan mengunduh spreadsheet, memperbarui database dan file web, lalu me-redeploy ke GitHub Pages secara otomatis tanpa Anda perlu menyalakan komputer!
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                  Cara Memicu Manual di GitHub:
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                  <li>Buka repositori GitHub Anda di browser.</li>
                  <li>Klik tab <b>Actions</b> di bagian atas repositori.</li>
                  <li>Pilih workflow <b>Sync Spreadsheet Data &amp; Deploy</b>.</li>
                  <li>Klik tombol <b>Run workflow</b> &gt; <b>Run workflow</b>.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {autoSyncEnabled ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Auto-Sync Aktif ({intervalMinutes}m)
              </span>
            ) : (
              <span className="text-slate-400">Auto-Sync Dinonaktifkan</span>
            )}
          </div>
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
