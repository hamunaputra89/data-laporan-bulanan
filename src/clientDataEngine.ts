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
  HandoverBreakdownItem 
} from './types.ts';

// Row indices:
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

const monthCache = new Map<string, RawRow[]>();

export async function loadMonthData(month: string): Promise<RawRow[]> {
  const targetMonth = month && month !== 'all' ? month : '2026-08';
  if (monthCache.has(targetMonth)) {
    return monthCache.get(targetMonth)!;
  }

  try {
    const res = await fetch(`./data/month-${targetMonth}.json`);
    if (res.ok) {
      const data: RawRow[] = await res.json();
      monthCache.set(targetMonth, data);
      return data;
    }
  } catch (err) {
    console.warn(`Failed to fetch static data for month ${targetMonth}:`, err);
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
    if (filters.courier === 'JNE (Semua)' || filters.courier === 'JNE') {
      if (!row[4].startsWith('JNE')) return false;
    } else if (filters.courier === 'J&T (Semua)' || filters.courier === 'J&T') {
      if (!row[4].startsWith('J&T')) return false;
    } else if (filters.courier === 'SPX (Semua)' || filters.courier === 'SPX') {
      if (!row[4].startsWith('SPX')) return false;
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
    if (filters.handover === 'yes' && !row[10]) return false;
    if (filters.handover === 'no' && row[10]) return false;
  }

  // 6. Date Range (Print Date)
  if (filters.startDate) {
    const pDate = row[9] ? row[9].slice(0, 10) : '';
    if (pDate && pDate < filters.startDate) return false;
  }
  if (filters.endDate) {
    const pDate = row[9] ? row[9].slice(0, 10) : '';
    if (pDate && pDate > filters.endDate) return false;
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

    if (
      !orderId.includes(s) &&
      !awb.includes(s) &&
      !sn.includes(s) &&
      !sku.includes(s) &&
      !mitDn.includes(s) &&
      !ho.includes(s)
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

    if (ho) handover++;
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
    if (ho) {
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
    .slice(0, 10);

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

  // Map to index:
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

  // Create a sorted view or slice
  // To keep it fast, if dataset is large, sort directly:
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

// Client-side Direct Google Sheets Sync via CORS
export async function syncDirectFromGoogleSheets(): Promise<{
  success: boolean;
  rowCount: number;
  message: string;
}> {
  const url =
    'https://docs.google.com/spreadsheets/d/1bdD0HshoPpbbhMNzlCfAfV4UGUOaSwjhoYMmLLbbJ_I/gviz/tq?tqx=out:csv&gid=1566921166';

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Sheets mengembalikan status: ${res.status}`);
  }

  const csvText = await res.text();
  const lines = csvText.split(/\r?\n/);

  // Group rows by month
  const grouped = new Map<string, RawRow[]>();
  let rowCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Fast parse quotes
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
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current);

    if (cells.length >= 10) {
      rowCount++;
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

      let list = grouped.get(ym);
      if (!list) {
        list = [];
        grouped.set(ym, list);
      }
      list.push(row);
    }
  }

  // Update in-memory month cache
  for (const [ym, rows] of grouped.entries()) {
    monthCache.set(ym, rows);
  }

  return {
    success: true,
    rowCount,
    message: `Berhasil menyinkronkan ${rowCount.toLocaleString('id-ID')} pesanan langsung dari Google Spreadsheet!`,
  };
}
