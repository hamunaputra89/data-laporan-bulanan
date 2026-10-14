import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BarChart3, 
  Truck, 
  Users, 
  Package, 
  FileText, 
  RefreshCw, 
  ClipboardCheck
} from 'lucide-react';

import { 
  FilterState, 
  SystemStatus, 
  AnalyticsResponse, 
  OrderItem 
} from './types.ts';

import { Navbar } from './components/Navbar.tsx';
import { FilterBar } from './components/FilterBar.tsx';
import { SummaryCards } from './components/SummaryCards.tsx';
import { DailyTrendChart } from './components/DailyTrendChart.tsx';
import { CourierAnalysis } from './components/CourierAnalysis.tsx';
import { PackerAnalysis } from './components/PackerAnalysis.tsx';
import { SkuAndSlocAnalysis } from './components/SkuAndSlocAnalysis.tsx';
import { OrdersTable } from './components/OrdersTable.tsx';
import { OrderDetailModal } from './components/OrderDetailModal.tsx';
import { PrintReportModal } from './components/PrintReportModal.tsx';
import { HandoverAnalysis } from './components/HandoverAnalysis.tsx';
import { SyncModal } from './components/SyncModal.tsx';
import { 
  RawRow,
  loadMonthData, 
  matchFilter, 
  computeAnalytics, 
  computeOrders, 
  exportFilteredRowsToCSV,
  getDataUrl 
} from './clientDataEngine.ts';

const DEFAULT_FILTERS: FilterState = {
  month: '2026-08', // Default to active full month in dataset
  startDate: '',
  endDate: '',
  status: 'all',
  courier: 'all',
  packer: 'all',
  sloc: 'all',
  handover: 'all',
  search: '',
};

export default function App() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [currentFilteredRows, setCurrentFilteredRows] = useState<RawRow[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'couriers' | 'packers' | 'products' | 'handover' | 'orders'>('overview');
  const [sortBy, setSortBy] = useState('print_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isBackendActive, setIsBackendActive] = useState(false);

  const prevFiltersRef = useRef<string>('');

  // 1. Fetch system status & filter options (supports server & GitHub Pages static fallback)
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data: SystemStatus = await res.json();
        setSystemStatus(data);
        const isDbReady = data.isReady !== false && ((data.totalRows || 0) > 0 || (data.meta?.rowCount || 0) > 0);
        setIsBackendActive(isDbReady);
        setIsSyncing(Boolean(data.isSyncing));
        return;
      }
    } catch {
      // Backend not available -> GitHub Pages static mode
    }

    try {
      const staticUrl = getDataUrl('status.json');
      const fallbackRes = await fetch(staticUrl);
      if (fallbackRes.ok) {
        const data: SystemStatus = await fallbackRes.json();
        setSystemStatus(data);
        setIsBackendActive(false);
      }
    } catch (staticErr) {
      console.warn('Gagal memuat status statis:', staticErr);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // 2. Build URL search params from filters
  const buildQueryParams = useCallback((f: FilterState) => {
    const params = new URLSearchParams();
    if (f.month && f.month !== 'all') params.set('month', f.month);
    if (f.startDate) params.set('startDate', f.startDate);
    if (f.endDate) params.set('endDate', f.endDate);
    if (f.status && f.status !== 'all') params.set('status', f.status);
    if (f.courier && f.courier !== 'all') params.set('courier', f.courier);
    if (f.packer && f.packer !== 'all') params.set('packer', f.packer);
    if (f.sloc && f.sloc !== 'all') params.set('sloc', f.sloc);
    if (f.handover && f.handover !== 'all') params.set('handover', f.handover);
    if (f.search.trim()) params.set('search', f.search.trim());
    return params;
  }, []);

  // 3. Unified Data Loading Engine: Filters & Analytics
  const loadData = useCallback(async (
    currentFilters: FilterState,
    page: number,
    limit: number,
    sBy: string,
    sOrder: 'asc' | 'desc',
    forceReloadRows: boolean = false
  ) => {
    const filterKey = JSON.stringify(currentFilters);
    const filtersChanged = filterKey !== prevFiltersRef.current || forceReloadRows;
    prevFiltersRef.current = filterKey;

    if (filtersChanged) {
      setIsLoadingAnalytics(true);
      setIsLoadingOrders(true);
    }

    // Try backend if active
    let backendWorked = false;
    if (isBackendActive) {
      try {
        const params = buildQueryParams(currentFilters);
        const res = await fetch(`/api/report/analytics?${params.toString()}`);
        if (res.ok) {
          const data: AnalyticsResponse = await res.json();
          setAnalytics(data);

          params.set('page', page.toString());
          params.set('limit', limit.toString());
          params.set('sortBy', sBy);
          params.set('sortOrder', sOrder);
          const oRes = await fetch(`/api/orders?${params.toString()}`);
          if (oRes.ok) {
            const oData = await oRes.json();
            setOrders(oData.data || []);
            setPagination(oData.pagination || { page, limit, total: (oData.data || []).length, totalPages: 1 });
            backendWorked = true;
          }
        }
      } catch {
        backendWorked = false;
      }
    }

    if (backendWorked) {
      setIsLoadingAnalytics(false);
      setIsLoadingOrders(false);
      return;
    }

    // Client Data Engine (100% works on GitHub Pages & offline)
    try {
      let filtered: RawRow[] = [];

      if (filtersChanged || currentFilteredRows.length === 0) {
        const rawRows = await loadMonthData(currentFilters.month);
        filtered = rawRows.filter((r) => matchFilter(r, currentFilters));
        setCurrentFilteredRows(filtered);

        const analyticsResult = computeAnalytics(filtered);
        setAnalytics(analyticsResult);
      } else {
        filtered = currentFilteredRows;
      }

      const ordersResult = computeOrders(filtered, page, limit, sBy, sOrder);
      setOrders(ordersResult.orders);
      setPagination({
        page,
        limit,
        total: ordersResult.total,
        totalPages: ordersResult.totalPages,
      });
    } catch (err) {
      console.error('Client data engine error:', err);
    } finally {
      setIsLoadingAnalytics(false);
      setIsLoadingOrders(false);
    }
  }, [buildQueryParams, isBackendActive, currentFilteredRows]);

  // Trigger data load when filters change
  useEffect(() => {
    loadData(filters, 1, pagination.limit, sortBy, sortOrder, true);
  }, [filters, sortBy, sortOrder]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    if (!isBackendActive && currentFilteredRows.length > 0) {
      const ordersResult = computeOrders(currentFilteredRows, newPage, pagination.limit, sortBy, sortOrder);
      setOrders(ordersResult.orders);
    } else {
      loadData(filters, newPage, pagination.limit, sortBy, sortOrder, false);
    }
  };

  // Handle limit change
  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    if (!isBackendActive && currentFilteredRows.length > 0) {
      const ordersResult = computeOrders(currentFilteredRows, 1, newLimit, sortBy, sortOrder);
      setOrders(ordersResult.orders);
      setPagination({
        page: 1,
        limit: newLimit,
        total: ordersResult.total,
        totalPages: ordersResult.totalPages,
      });
    } else {
      loadData(filters, 1, newLimit, sortBy, sortOrder, false);
    }
  };

  // Handle sort column change
  const handleSortChange = (col: string) => {
    const newSortOrder = sortBy === col && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(col);
    setSortOrder(newSortOrder);

    if (!isBackendActive && currentFilteredRows.length > 0) {
      const ordersResult = computeOrders(currentFilteredRows, pagination.page, pagination.limit, col, newSortOrder);
      setOrders(ordersResult.orders);
    }
  };

  // Export Filtered & Sorted Records directly to CSV
  const handleExportFiltered = useCallback(async () => {
    setSyncNotice('Menyiapkan berkas export CSV untuk data yang difilter & disortir...');

    try {
      const monthName = filters.month && filters.month !== 'all' ? filters.month : 'SemuaBulan';
      const courierPart = filters.courier !== 'all' ? `_${filters.courier.replace(/[\s\(\)]+/g, '_')}` : '';
      const slocPart = filters.sloc !== 'all' ? `_SLOC${filters.sloc}` : '';
      const statusPart = filters.status !== 'all' ? `_${filters.status}` : '';
      const sortPart = `_urut_${sortBy}_${sortOrder}`;
      const customFileName = `Laporan_Logistik_${monthName}${courierPart}${slocPart}${statusPart}${sortPart}.csv`;

      if (isBackendActive) {
        // Direct download from server backend with filter and sort params
        const params = buildQueryParams(filters);
        params.set('sortBy', sortBy);
        params.set('sortOrder', sortOrder);
        const exportUrl = `/api/export?${params.toString()}`;

        const a = document.createElement('a');
        a.href = exportUrl;
        a.download = customFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setSyncNotice('Berkas export CSV berhasil diunduh!');
        setTimeout(() => setSyncNotice(null), 3500);
        return;
      }

      // Client Data Engine (offline / GitHub Pages mode)
      let rowsToExport = currentFilteredRows;
      if (!rowsToExport || rowsToExport.length === 0) {
        const rawRows = await loadMonthData(filters.month);
        rowsToExport = rawRows.filter((r) => matchFilter(r, filters));
        setCurrentFilteredRows(rowsToExport);
      }

      if (rowsToExport.length === 0) {
        setSyncNotice('Tidak ada data yang cocok dengan filter untuk diekspor.');
        setTimeout(() => setSyncNotice(null), 4000);
        return;
      }

      exportFilteredRowsToCSV(rowsToExport, sortBy, sortOrder, customFileName);
      setSyncNotice(`Export CSV berhasil (${rowsToExport.length.toLocaleString('id-ID')} data diunduh)!`);
      setTimeout(() => setSyncNotice(null), 3500);
    } catch (err) {
      console.error('Export error:', err);
      setSyncNotice('Gagal menyiapkan export CSV. Silakan coba kembali.');
      setTimeout(() => setSyncNotice(null), 4000);
    }
  }, [buildQueryParams, currentFilteredRows, filters, isBackendActive, sortBy, sortOrder]);

  // Trigger sync from Google Sheet
  const handleTriggerSync = async () => {
    if (!isBackendActive) {
      // In GitHub Pages (static), open SyncModal for CSV upload or GitHub Actions
      setShowSyncModal(true);
      return;
    }

    setIsSyncing(true);
    setSyncNotice('Memulai sinkronisasi data dari Google Spreadsheet...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      setSyncNotice(data.message || 'Sinkronisasi sedang diproses...');

      const checkInterval = setInterval(async () => {
        const sRes = await fetch('/api/status');
        if (sRes.ok) {
          const sData: SystemStatus = await sRes.json();
          setSystemStatus(sData);
          if (!sData.isSyncing) {
            clearInterval(checkInterval);
            setIsSyncing(false);
            setSyncNotice('Sinkronisasi selesai! Data telah diperbarui.');
            loadData(filters, 1, pagination.limit, sortBy, sortOrder, true);
            setTimeout(() => setSyncNotice(null), 4000);
          }
        }
      }, 3000);
    } catch {
      setIsSyncing(false);
      setShowSyncModal(true);
    }
  };

  // Month label helper
  const getMonthLabel = (ym: string) => {
    if (!ym || ym === 'all') return 'Semua Periode';
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        status={systemStatus}
        filters={filters}
        onRefresh={() => loadData(filters, pagination.page, pagination.limit, sortBy, sortOrder, true)}
        onOpenPrintModal={() => setShowPrintModal(true)}
        onTriggerSync={handleTriggerSync}
        onExport={handleExportFiltered}
        isSyncing={isSyncing}
        filteredCount={pagination.total}
      />

      {/* Sync Notification Banner */}
      {syncNotice && (
        <div className="bg-blue-600 text-white text-xs font-medium py-2 px-4 text-center flex items-center justify-center gap-2 shadow-inner">
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Automatic Filter Bar */}
        <FilterBar
          filters={filters}
          options={systemStatus?.filterOptions}
          onChange={(newFilters) => setFilters(newFilters)}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />

        {/* Executive Summary Cards */}
        <SummaryCards
          summary={analytics?.summary}
          prevMonth={analytics?.prevMonthSummary}
          monthName={getMonthLabel(filters.month)}
        />

        {/* Navigation Tabs for Analytical Perspectives */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Ringkasan & Tren Harian</span>
          </button>

          <button
            onClick={() => setActiveTab('couriers')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'couriers'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Kinerja Kurir & Ekspedisi</span>
          </button>

          <button
            onClick={() => setActiveTab('packers')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'packers'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Produktivitas Tim Packer</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>SKU Barang & Lokasi Gudang (SLOC)</span>
          </button>

          <button
            onClick={() => setActiveTab('handover')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'handover'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Dokumen Handover ({analytics?.summary?.handoverCount?.toLocaleString('id-ID') || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Semua Data Transaksi ({pagination.total.toLocaleString('id-ID')})</span>
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'overview' && (
          <div>
            {/* Daily Trend Chart */}
            <DailyTrendChart
              data={analytics?.dailyTrend || []}
              monthName={getMonthLabel(filters.month)}
            />

            {/* Courier preview and Packer preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <CourierAnalysis
                data={analytics?.courierBreakdown.slice(0, 6) || []}
                onSelectCourier={(c) => setFilters({ ...filters, courier: c })}
                selectedCourier={filters.courier}
              />
              <PackerAnalysis
                data={analytics?.packerBreakdown.slice(0, 6) || []}
                onSelectPacker={(p) => setFilters({ ...filters, packer: p })}
                selectedPacker={filters.packer}
              />
            </div>

            {/* Orders Table with Export */}
            <OrdersTable
              orders={orders}
              pagination={pagination}
              isLoading={isLoadingOrders}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              onSelectOrder={(ord) => setSelectedOrder(ord)}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              onExport={handleExportFiltered}
            />
          </div>
        )}

        {activeTab === 'couriers' && (
          <div>
            <CourierAnalysis
              data={analytics?.courierBreakdown || []}
              onSelectCourier={(c) => setFilters({ ...filters, courier: c })}
              selectedCourier={filters.courier}
            />
            <OrdersTable
              orders={orders}
              pagination={pagination}
              isLoading={isLoadingOrders}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              onSelectOrder={(ord) => setSelectedOrder(ord)}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              onExport={handleExportFiltered}
            />
          </div>
        )}

        {activeTab === 'packers' && (
          <div>
            <PackerAnalysis
              data={analytics?.packerBreakdown || []}
              onSelectPacker={(p) => setFilters({ ...filters, packer: p })}
              selectedPacker={filters.packer}
            />
            <OrdersTable
              orders={orders}
              pagination={pagination}
              isLoading={isLoadingOrders}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              onSelectOrder={(ord) => setSelectedOrder(ord)}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              onExport={handleExportFiltered}
            />
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <SkuAndSlocAnalysis
              skuData={analytics?.skuBreakdown || []}
              slocData={analytics?.slocBreakdown || []}
              onSelectSloc={(s) => setFilters({ ...filters, sloc: s })}
              selectedSloc={filters.sloc}
            />
            <OrdersTable
              orders={orders}
              pagination={pagination}
              isLoading={isLoadingOrders}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              onSelectOrder={(ord) => setSelectedOrder(ord)}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              onExport={handleExportFiltered}
            />
          </div>
        )}

        {activeTab === 'handover' && (
          <div>
            <HandoverAnalysis
              data={analytics?.handoverBreakdown || []}
              totalOrders={analytics?.summary?.totalOrders || 0}
              handoverCount={analytics?.summary?.handoverCount || 0}
              handoverRate={analytics?.summary?.handoverRate || 0}
              onFilterHandover={(hoNo) => setFilters({ ...filters, search: hoNo })}
              onApplySloc1655Jne={() => {
                setFilters({
                  ...filters,
                  month: '2026-08',
                  sloc: '1655',
                  courier: 'JNE (Semua)',
                  status: 'all',
                  search: '',
                });
              }}
              currentSloc={filters.sloc}
              currentCourier={filters.courier}
            />
            <OrdersTable
              orders={orders}
              pagination={pagination}
              isLoading={isLoadingOrders}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              onSelectOrder={(ord) => setSelectedOrder(ord)}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              onExport={handleExportFiltered}
            />
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <OrdersTable
              orders={orders}
              pagination={pagination}
              isLoading={isLoadingOrders}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              onSelectOrder={(ord) => setSelectedOrder(ord)}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              onExport={handleExportFiltered}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Sistem Laporan Bulanan Logistik &bull; Filter &amp; Export Data Otomatis
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportFiltered}
              className="text-slate-600 hover:text-blue-600 transition font-medium"
            >
              Export CSV Terfilter
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => setShowPrintModal(true)}
              className="text-slate-600 hover:text-blue-600 transition"
            >
              Cetak Dokumen
            </button>
          </div>
        </div>
      </footer>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Official Monthly Print Report Modal */}
      {showPrintModal && (
        <PrintReportModal
          analytics={analytics}
          filters={filters}
          onClose={() => setShowPrintModal(false)}
          monthLabel={getMonthLabel(filters.month)}
        />
      )}

      {/* Data Sync & Upload Modal */}
      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onDataImported={(status) => {
          setSystemStatus(status);
          loadData(filters, 1, pagination.limit, sortBy, sortOrder, true);
        }}
        isBackendActive={isBackendActive}
        onTriggerBackendSync={handleTriggerSync}
        isSyncing={isSyncing}
      />
    </div>
  );
}
