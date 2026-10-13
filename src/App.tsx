import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { 
  BarChart3, 
  Truck, 
  Users, 
  Package, 
  FileText, 
  RefreshCw, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'couriers' | 'packers' | 'products' | 'handover' | 'orders'>('overview');
  const [sortBy, setSortBy] = useState('print_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // 1. Fetch system status & filter options
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data: SystemStatus = await res.json();
        setSystemStatus(data);
        setIsSyncing(data.isSyncing);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
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

  // 3. Fetch Analytics whenever filters change
  const fetchAnalytics = useCallback(async (currentFilters: FilterState) => {
    setIsLoadingAnalytics(true);
    try {
      const params = buildQueryParams(currentFilters);
      const res = await fetch(`/api/report/analytics?${params.toString()}`);
      if (res.ok) {
        const data: AnalyticsResponse = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [buildQueryParams]);

  // 4. Fetch Orders list with pagination & sorting
  const fetchOrders = useCallback(async (
    currentFilters: FilterState,
    page: number,
    limit: number,
    sBy: string,
    sOrder: 'asc' | 'desc'
  ) => {
    setIsLoadingOrders(true);
    try {
      const params = buildQueryParams(currentFilters);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      params.set('sortBy', sBy);
      params.set('sortOrder', sOrder);

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        setPagination(data.pagination || { page, limit, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [buildQueryParams]);

  // Trigger data load when filters change
  useEffect(() => {
    fetchAnalytics(filters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchOrders(filters, 1, pagination.limit, sortBy, sortOrder);
  }, [filters, fetchAnalytics, fetchOrders, sortBy, sortOrder]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    fetchOrders(filters, newPage, pagination.limit, sortBy, sortOrder);
  };

  // Handle limit change
  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    fetchOrders(filters, 1, newLimit, sortBy, sortOrder);
  };

  // Handle sort column change
  const handleSortChange = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  // Trigger sync from Google Sheet
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncNotice('Memulai sinkronisasi data dari Google Spreadsheet...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      setSyncNotice(data.message || 'Sinkronisasi sedang diproses...');

      // Poll status for a few cycles
      const checkInterval = setInterval(async () => {
        const sRes = await fetch('/api/status');
        if (sRes.ok) {
          const sData: SystemStatus = await sRes.json();
          setSystemStatus(sData);
          if (!sData.isSyncing) {
            clearInterval(checkInterval);
            setIsSyncing(false);
            setSyncNotice('Sinkronisasi selesai! Data telah diperbarui.');
            fetchAnalytics(filters);
            fetchOrders(filters, pagination.page, pagination.limit, sortBy, sortOrder);
            setTimeout(() => setSyncNotice(null), 4000);
          }
        }
      }, 3000);
    } catch (e: any) {
      console.error(e);
      setIsSyncing(false);
      setSyncNotice('Gagal sinkronisasi.');
      setTimeout(() => setSyncNotice(null), 4000);
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
        onRefresh={() => {
          fetchAnalytics(filters);
          fetchOrders(filters, pagination.page, pagination.limit, sortBy, sortOrder);
        }}
        onOpenPrintModal={() => setShowPrintModal(true)}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
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

            {/* Top Orders Quick Table */}
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
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Sistem Laporan Bulanan Logistik &bull; Sinkronisasi Data Spreadsheet Real-Time
          </span>
          <div className="flex items-center gap-3">
            <a
              href="https://docs.google.com/spreadsheets/d/1bdD0HshoPpbbhMNzlCfAfV4UGUOaSwjhoYMmLLbbJ_I/edit?gid=1566921166#gid=1566921166"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Google Sheets
            </a>
            <span>&bull;</span>
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
    </div>
  );
}
