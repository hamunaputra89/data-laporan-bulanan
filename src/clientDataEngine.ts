import { 
  FilterState, 
  AnalyticsResponse, 
  OrderItem, 
  SummaryKPIs, 
  DailyTrendItem, 
  CourierBreakdownItem, 
  PackerBreakdownItem, 
  SkuBreakdownItem, 
  SlocBreakdownItem, 
  HandoverBreakdownItem,
  SystemStatus
} from './types.ts';

// Row format in memory:
// 0: order_id, 1: status, 2: mit_dn, 3: sku, 4: courier, 5: awb, 6: sn, 7: sloc, 8: packer, 9: print_date, 10: handover_no
export type RawRow = [
  string, // 0: order_id
  string, // 1: status
  string, // 2: mit_dn
  string, // 3: sku
  string, // 4: courier
  string, // 5: awb
  string, // 6: sn
  string, // 7: sloc
  string, // 8: packer
  string, // 9: print_date
  string  // 10: handover_no
];

const KNOWN_MONTHS = [
  '2026-10',
  '2026-09',
  '2026-08',
  '2026-07',
  '2026-06',
  '2026-05',
  '2026-04',
  '2026-03',
  'Tanpa Tanggal'
];

const monthCache = new Map<string, RawRow[]>();
let customUploadedData: RawRow[] | null = null;

// Safe URL resolver for GitHub Pages and subpaths
export function getDataUrl(filename: string): string {
  const base = import.meta.env.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : base + '/';
  return `${cleanBase}data/${filename}`;
}

export function isSubFiltered(filters: FilterState): boolean {
  return Boolean(
    (filters.status && filters.status !== 'all') ||
    (filters.courier && filters.courier !== 'all') ||
    (filters.sloc && filters.sloc !== 'all') ||
    (filters.packer && filters.packer !== 'all') ||
    (filters.handover && filters.handover !== 'all') ||
    filters.startDate ||
    filters.endDate ||
    (filters.search && filters.search.trim())
  );
}

// Load month data with local caching and fallback
export async function loadMonthData(month: string): Promise<RawRow[]> {
  // If custom data was uploaded via CSV, use that
  if (customUploadedData && customUploadedData.length > 0) {
    if (!month || month === 'all') return customUploadedData;
    return customUploadedData.filter((r) => {
      const pDate = r[9] ? r[9].slice(0, 7) : 'Tanpa Tanggal';
      return pDate === month;
    });
  }

  // Handle 'all' months
  if (!month || month === 'all') {
    if (monthCache.has('all')) {
      return monthCache.get('all')!;
    }
    // Load default month first (2026-08) or combine months
    const aug = await loadSingleMonth('2026-08');
    return aug;
  }

  return loadSingleMonth(month);
}

async function loadSingleMonth(month: string): Promise<RawRow[]> {
  if (monthCache.has(month)) {
    return monthCache.get(month)!;
  }

  try {
    const url = getDataUrl(`month-${month}.json`);
    const res = await fetch(url);
    if (res.ok) {
      const data: RawRow[] = await res.json();
      monthCache.set(month, data);
      return data;
    }
  } catch (err) {
    console.warn(`Gagal memuat file statis untuk bulan ${month}:`, err);
  }

  return [];
}

// Check if a row matches the filters
export function matchFilter(row: RawRow, filters: FilterState): boolean {
  // 1. Status
  if (filters.status && filters.status !== 'all') {
    if (row[1] !== filters.status) return false;
  }

  // 2. Courier
  if (filters.courier && filters.courier !== 'all') {
    const cUpper = (row[4] || '').toUpperCase();
    if (filters.courier === 'JNE (Semua)' || filters.courier === 'JNE') {
      if (!cUpper.startsWith('JNE')) return false;
    } else if (filters.courier === 'J&T (Semua)' || filters.courier === 'J&T') {
      if (!cUpper.startsWith('J&T')) return false;
    } else if (filters.courier === 'SPX (Semua)' || filters.courier === 'SPX') {
      if (!cUpper.startsWith('SPX')) return false;
    } else {
      if (row[4] !== filters.courier) return false;
    }
  }

  // 3. SLOC
  if (filters.sloc && filters.sloc !== 'all') {
    if (row[7] !== filters.sloc) return false;
  }

  // 4. Packer
  if (filters.packer && filters.packer !== 'all') {
    if (row[8] !== filters.packer) return false;
  }

  // 5. Handover
  if (filters.handover && filters.handover !== 'all') {
    const hasHo = Boolean(row[10] && row[10].trim());
    if (filters.handover === 'yes' && !hasHo) return false;
    if (filters.handover === 'no' && hasHo) return false;
  }

  // 6. Date Range (Print Date)
  if (filters.startDate) {
    const pDate = row[9] ? row[9].slice(0, 10) : '';
    if (!pDate || pDate < filters.startDate) return false;
  }
  if (filters.endDate) {
    const pDate = row[9] ? row[9].slice(0, 10) : '';
    if (!pDate || pDate > filters.endDate) return false;
  }

  // 7. Search Keyword
  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim().toLowerCase();
    const orderId = (row[0] || '').toLowerCase();
    const awb = (row[5] || '').toLowerCase();
    const sn = (row[6] || '').toLowerCase();
    const sku = (row[3] || '').toLowerCase();
    const mitDn = (row[2] || '').toLowerCase();
    const ho = (row[10] || '').toLowerCase();
    const courier = (row[4] || '').toLowerCase();
    const packer = (row[8] || '').toLowerCase();

    if (
      !orderId.includes(s) &&
      !awb.includes(s) &&
      !sn.includes(s) &&
      !sku.includes(s) &&
      !mitDn.includes(s) &&
      !ho.includes(s) &&
      !courier.includes(s) &&
      !packer.includes(s)
    ) {
      return false;
    }
  }

  return true;
}

// Compute full analytics response from matched rows
export function computeAnalytics(filteredRows: RawRow[]): AnalyticsResponse {
  const total = filteredRows.length;
  let delivered = 0;
  let cancelled = 0;
  let shipped = 0;
  let readyToShip = 0;
  let returned = 0;
  let goodsIssue = 0;
  let handover = 0;

  const skuSet = new Set<string>();
  const packerSet = new Set<string>();

  const dailyMap = new Map<string, { total: number; delivered: number; cancelled: number; shipped: number }>();
  const statusMap = new Map<string, number>();
  const courierMap = new Map<string, { total: number; delivered: number; cancelled: number; returned: number }>();
  const packerMap = new Map<string, { total: number; delivered: number; cancelled: number }>();
  const skuMap = new Map<string, { total: number; delivered: number }>();
  const slocMap = new Map<string, number>();
  const hoMap = new Map<string, { total: number; delivered: number; cancelled: number }>();

  for (let i = 0; i < total; i++) {
    const r = filteredRows[i];
    const st = r[1] || '';
    const cr = r[4] || '';
    const pk = r[8] || '';
    const sk = r[3] || '';
    const sl = r[7] || '';
    const dt = r[9] && r[9].length >= 10 ? r[9].slice(0, 10) : '';
    const ho = r[10] || '';

    // Status counters
    if (st === 'Delivered') delivered++;
    else if (st === 'Cancelled') cancelled++;
    else if (st === 'Shipped') shipped++;
    else if (st === 'Ready to Ship') readyToShip++;
    else if (st === 'Returned') returned++;
    else if (st === 'Goods Issue') goodsIssue++;

    if (ho && ho.trim()) handover++;
    if (sk) skuSet.add(sk);
    if (pk) packerSet.add(pk);

    // Status distribution
    const curStatusCount = statusMap.get(st) || 0;
    statusMap.set(st, curStatusCount + 1);

    // Daily trend
    if (dt) {
      let dItem = dailyMap.get(dt);
      if (!dItem) {
        dItem = { total: 0, delivered: 0, cancelled: 0, shipped: 0 };
        dailyMap.set(dt, dItem);
      }
      dItem.total++;
      if (st === 'Delivered') dItem.delivered++;
      else if (st === 'Cancelled') dItem.cancelled++;
      else if (st === 'Shipped') dItem.shipped++;
    }

    // Courier breakdown
    if (cr) {
      let cItem = courierMap.get(cr);
      if (!cItem) {
        cItem = { total: 0, delivered: 0, cancelled: 0, returned: 0 };
        courierMap.set(cr, cItem);
      }
      cItem.total++;
      if (st === 'Delivered') cItem.delivered++;
      else if (st === 'Cancelled') cItem.cancelled++;
      else if (st === 'Returned') cItem.returned++;
    }

    // Packer breakdown
    if (pk) {
      let pItem = packerMap.get(pk);
      if (!pItem) {
        pItem = { total: 0, delivered: 0, cancelled: 0 };
        packerMap.set(pk, pItem);
      }
      pItem.total++;
      if (st === 'Delivered') pItem.delivered++;
      else if (st === 'Cancelled') pItem.cancelled++;
    }

    // SKU breakdown
    if (sk) {
      let skItem = skuMap.get(sk);
      if (!skItem) {
        skItem = { total: 0, delivered: 0 };
        skuMap.set(sk, skItem);
      }
      skItem.total++;
      if (st === 'Delivered') skItem.delivered++;
    }

    // SLOC breakdown
    const curSlocCount = slocMap.get(sl) || 0;
    slocMap.set(sl, curSlocCount + 1);

    // Handover breakdown
    if (ho && ho.trim()) {
      let hItem = hoMap.get(ho);
      if (!hItem) {
        hItem = { total: 0, delivered: 0, cancelled: 0 };
        hoMap.set(ho, hItem);
      }
      hItem.total++;
      if (st === 'Delivered') hItem.delivered++;
      else if (st === 'Cancelled') hItem.cancelled++;
    }
  }

  const summary: SummaryKPIs = {
    totalOrders: total,
    deliveredCount: delivered,
    deliveredRate: total > 0 ? (delivered / total) * 100 : 0,
    cancelledCount: cancelled,
    cancelledRate: total > 0 ? (cancelled / total) * 100 : 0,
    shippedCount: shipped,
    readyToShipCount: readyToShip,
    returnedCount: returned,
    returnedRate: total > 0 ? (returned / total) * 100 : 0,
    goodsIssueCount: goodsIssue,
    handoverCount: handover,
    handoverRate: total > 0 ? (handover / total) * 100 : 0,
    uniqueSkus: skuSet.size,
    activePackers: packerSet.size,
  };

  // Convert daily map to sorted list
  const dailyTrend: DailyTrendItem[] = Array.from(dailyMap.entries())
    .map(([date, val]) => ({ date, ...val }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Convert status map
  const statusDistribution = Array.from(statusMap.entries())
    .map(([status, count]) => ({
      status: status || 'Tidak Diketahui',
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Convert courier map
  const courierBreakdown: CourierBreakdownItem[] = Array.from(courierMap.entries())
    .map(([courier, val]) => ({
      courier,
      ...val,
      deliveredRate: val.total > 0 ? (val.delivered / val.total) * 100 : 0,
      share: total > 0 ? (val.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  // Convert packer map
  const packerBreakdown: PackerBreakdownItem[] = Array.from(packerMap.entries())
    .map(([packer, val]) => ({
      packer,
      ...val,
      deliveredRate: val.total > 0 ? (val.delivered / val.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  // Convert SKU map
  const skuBreakdown: SkuBreakdownItem[] = Array.from(skuMap.entries())
    .map(([sku, val]) => ({ sku, ...val }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Convert SLOC map
  const slocBreakdown: SlocBreakdownItem[] = Array.from(slocMap.entries())
    .map(([sloc, count]) => ({
      sloc: sloc || 'Tidak Ada SLOC',
      total: count,
      share: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Convert Handover map
  const handoverBreakdown: HandoverBreakdownItem[] = Array.from(hoMap.entries())
    .map(([handover_no, val]) => ({
      handover_no,
      ...val,
      share: total > 0 ? (val.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  return {
    summary,
    prevMonthSummary: null,
    dailyTrend,
    statusDistribution,
    courierBreakdown,
    packerBreakdown,
    skuBreakdown,
    slocBreakdown,
    handoverBreakdown,
  };
}

// Compute paginated orders from filtered rows
export function computeOrders(
  filteredRows: RawRow[],
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): { orders: OrderItem[]; total: number; totalPages: number } {
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;

  const colIndexMap: Record<string, number> = {
    order_id: 0,
    status: 1,
    mit_dn: 2,
    sku: 3,
    courier: 4,
    awb: 5,
    sn: 6,
    sloc: 7,
    packer: 8,
    print_date: 9,
    handover_no: 10,
  };

  const sortIdx = colIndexMap[sortBy] ?? 9;

  const sorted = [...filteredRows].sort((a, b) => {
    const valA = a[sortIdx] || '';
    const valB = b[sortIdx] || '';
    const cmp = valA.localeCompare(valB);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const sliced = sorted.slice(start, start + limit);

  const orders: OrderItem[] = sliced.map((r, idx) => ({
    id: start + idx + 1,
    order_id: r[0],
    status: r[1],
    mit_dn: r[2],
    sku: r[3],
    courier: r[4],
    awb: r[5],
    sn: r[6],
    sloc: r[7],
    packer: r[8],
    print_date: r[9],
    handover_no: r[10],
  }));

  return { orders, total, totalPages };
}

// Client-side CSV Text Parser and in-memory updater
export function parseCSVToRows(csvText: string): { rows: RawRow[]; status: SystemStatus } {
  const lines = csvText.split(/\r?\n/);
  const rows: RawRow[] = [];
  const monthCountMap = new Map<string, number>();
  const statusCountMap = new Map<string, number>();
  const courierCountMap = new Map<string, number>();
  const packerCountMap = new Map<string, number>();
  const slocCountMap = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells: string[] = [];
    let inQuotes = false;
    let current = '';
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        if (inQuotes && line[c + 1] === '"') {
          current += '"';
          c++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());

    if (cells.length >= 8) {
      const pdate = cells[9] ? cells[9].trim() : '';
      const ym = pdate.length >= 7 ? pdate.slice(0, 7) : (pdate ? pdate.slice(0, 4) : 'Tanpa Tanggal');
      
      const row: RawRow = [
        cells[0] || '',
        cells[1] || '',
        cells[2] || '',
        cells[3] || '',
        cells[4] || '',
        cells[5] || '',
        cells[6] || '',
        cells[7] || '',
        cells[8] || '',
        cells[9] || '',
        cells[10] || '',
      ];

      rows.push(row);

      // Counters
      monthCountMap.set(ym, (monthCountMap.get(ym) || 0) + 1);
      if (row[1]) statusCountMap.set(row[1], (statusCountMap.get(row[1]) || 0) + 1);
      if (row[4]) courierCountMap.set(row[4], (courierCountMap.get(row[4]) || 0) + 1);
      if (row[8]) packerCountMap.set(row[8], (packerCountMap.get(row[8]) || 0) + 1);
      if (row[7]) slocCountMap.set(row[7], (slocCountMap.get(row[7]) || 0) + 1);
    }
  }

  customUploadedData = rows;
  monthCache.clear();

  // Populate month cache
  for (const r of rows) {
    const ym = r[9] && r[9].length >= 7 ? r[9].slice(0, 7) : 'Tanpa Tanggal';
    let list = monthCache.get(ym);
    if (!list) {
      list = [];
      monthCache.set(ym, list);
    }
    list.push(r);
  }

  const months = Array.from(monthCountMap.entries())
    .map(([year_month, count]) => ({ year_month, count }))
    .sort((a, b) => b.year_month.localeCompare(a.year_month));

  const statuses = Array.from(statusCountMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const couriers = Array.from(courierCountMap.entries())
    .map(([courier, count]) => ({ courier, count }))
    .sort((a, b) => b.count - a.count);

  const packers = Array.from(packerCountMap.entries())
    .map(([packer, count]) => ({ packer, count }))
    .sort((a, b) => b.count - a.count);

  const slocs = Array.from(slocCountMap.entries())
    .map(([sloc, count]) => ({ sloc, count }))
    .sort((a, b) => b.count - a.count);

  const nowStr = new Date().toLocaleString('id-ID');

  const status: SystemStatus = {
    isReady: true,
    isSyncing: false,
    syncProgress: '',
    meta: {
      lastSync: nowStr,
      rowCount: rows.length,
      spreadsheetId: '',
      gid: ''
    },
    totalRows: rows.length,
    filterOptions: {
      months,
      statuses,
      couriers,
      packers,
      slocs
    }
  };

  return { rows, status };
}

// Export Filtered & Sorted Records directly to CSV file in browser
export function exportFilteredRowsToCSV(
  rows: RawRow[],
  sortBy: string = 'print_date',
  sortOrder: 'asc' | 'desc' = 'desc',
  customFileName?: string
) {
  const colIndexMap: Record<string, number> = {
    order_id: 0,
    status: 1,
    mit_dn: 2,
    sku: 3,
    courier: 4,
    awb: 5,
    sn: 6,
    sloc: 7,
    packer: 8,
    print_date: 9,
    handover_no: 10,
  };

  const sortIdx = colIndexMap[sortBy] ?? 9;

  // Sort rows according to current user sort criteria
  const sorted = [...rows].sort((a, b) => {
    const valA = a[sortIdx] || '';
    const valB = b[sortIdx] || '';
    const cmp = valA.localeCompare(valB);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const headers = [
    'marketplace_order_id',
    'status',
    'mit_dn',
    'sku_number',
    'courier',
    'awb',
    'sn',
    'SLOC',
    'Packer',
    'Printdate',
    'handover_no'
  ];

  const escapeCSV = (val: string) => {
    if (val === null || val === undefined) return '""';
    const s = String(val);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return `"${s}"`;
  };

  const csvLines = [headers.join(',')];
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    csvLines.push(r.map(escapeCSV).join(','));
  }

  // Prepend UTF-8 BOM so Excel in Windows/Mac opens characters and text columns cleanly
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const fileName = customFileName || `laporan_logistik_terfilter_${new Date().toISOString().slice(0, 10)}.csv`;
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
