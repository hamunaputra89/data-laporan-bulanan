export interface FilterState {
  month: string;
  startDate: string;
  endDate: string;
  status: string;
  courier: string;
  packer: string;
  sloc: string;
  handover: string;
  search: string;
}

export interface OrderItem {
  id: number;
  order_id: string;
  status: string;
  mit_dn: string;
  sku: string;
  courier: string;
  awb: string;
  sn: string;
  sloc: string;
  packer: string;
  print_date: string;
  handover_no: string;
}

export interface SummaryKPIs {
  totalOrders: number;
  deliveredCount: number;
  deliveredRate: number;
  cancelledCount: number;
  cancelledRate: number;
  shippedCount: number;
  readyToShipCount: number;
  returnedCount: number;
  returnedRate: number;
  goodsIssueCount: number;
  handoverCount: number;
  handoverRate: number;
  uniqueSkus: number;
  activePackers: number;
}

export interface PrevMonthKPIs {
  month: string;
  totalOrders: number;
  deliveredCount: number;
  deliveredRate: number;
  cancelledCount: number;
  cancelledRate: number;
  momGrowth: number;
}

export interface DailyTrendItem {
  date: string;
  total: number;
  delivered: number;
  cancelled: number;
  shipped: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  percentage: number;
}

export interface CourierBreakdownItem {
  courier: string;
  total: number;
  delivered: number;
  cancelled: number;
  returned: number;
  deliveredRate: number;
  share: number;
}

export interface PackerBreakdownItem {
  packer: string;
  total: number;
  delivered: number;
  cancelled: number;
  deliveredRate: number;
}

export interface SkuBreakdownItem {
  sku: string;
  total: number;
  delivered: number;
}

export interface SlocBreakdownItem {
  sloc: string;
  total: number;
  share: number;
}

export interface HandoverBreakdownItem {
  handover_no: string;
  total: number;
  delivered: number;
  cancelled: number;
  share: number;
}

export interface AnalyticsResponse {
  summary: SummaryKPIs;
  prevMonthSummary: PrevMonthKPIs | null;
  dailyTrend: DailyTrendItem[];
  statusDistribution: StatusDistributionItem[];
  courierBreakdown: CourierBreakdownItem[];
  packerBreakdown: PackerBreakdownItem[];
  skuBreakdown: SkuBreakdownItem[];
  slocBreakdown: SlocBreakdownItem[];
  handoverBreakdown: HandoverBreakdownItem[];
}

export interface FilterOptions {
  months: Array<{ year_month: string; count: number }>;
  statuses: Array<{ status: string; count: number }>;
  couriers: Array<{ courier: string; count: number }>;
  packers: Array<{ packer: string; count: number }>;
  slocs: Array<{ sloc: string; count: number }>;
}
 
export interface AutoSyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncTime?: string | null;
  nextSyncTime?: string | null;
  totalRuns?: number;
  lastStatus?: 'idle' | 'running' | 'success' | 'error';
  lastError?: string | null;
}

export interface SystemStatus {
  isReady: boolean;
  isSyncing: boolean;
  syncProgress: string;
  totalRows: number;
  meta: {
    lastSync?: string;
    rowCount?: number;
    spreadsheetId?: string;
    gid?: string;
    syncDurationSec?: number;
  };
  filterOptions: FilterOptions;
  autoSync?: AutoSyncConfig;
}

