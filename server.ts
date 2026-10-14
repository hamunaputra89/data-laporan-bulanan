import express, { Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_PATH = path.join(__dirname, 'data', 'warehouse.db');
const META_PATH = path.join(__dirname, 'data', 'meta.json');

let db: DatabaseSync | null = null;
let isSyncing = false;
let syncProgress = '';

interface AutoSyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncTime?: string | null;
  nextSyncTime?: string | null;
  totalRuns: number;
  lastStatus: 'idle' | 'running' | 'success' | 'error';
  lastError: string | null;
}

const AUTOSYNC_CONFIG_PATH = path.join(__dirname, 'data', 'autosync.json');

const autoSyncConfig: AutoSyncConfig = {
  enabled: true,
  intervalMinutes: 30, // 30 minutes default
  lastSyncTime: null,
  nextSyncTime: null,
  totalRuns: 0,
  lastStatus: 'idle',
  lastError: null,
};

let autoSyncTimer: NodeJS.Timeout | null = null;

function loadAutoSyncConfig() {
  try {
    if (fs.existsSync(AUTOSYNC_CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(AUTOSYNC_CONFIG_PATH, 'utf-8'));
      Object.assign(autoSyncConfig, data);
    }
  } catch (e) {
    console.warn('Failed to load autosync config:', e);
  }
}

function saveAutoSyncConfig() {
  try {
    const dir = path.dirname(AUTOSYNC_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(AUTOSYNC_CONFIG_PATH, JSON.stringify(autoSyncConfig, null, 2));
  } catch (e) {
    console.warn('Failed to save autosync config:', e);
  }
}

function scheduleNextAutoSync() {
  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer);
    autoSyncTimer = null;
  }

  if (!autoSyncConfig.enabled) {
    autoSyncConfig.nextSyncTime = null;
    saveAutoSyncConfig();
    return;
  }

  const intervalMs = Math.max(5, autoSyncConfig.intervalMinutes) * 60 * 1000;
  const nextDate = new Date(Date.now() + intervalMs);
  autoSyncConfig.nextSyncTime = nextDate.toISOString();
  saveAutoSyncConfig();

  console.log(`[AutoSync] Next recurring sync at ${autoSyncConfig.nextSyncTime} (${autoSyncConfig.intervalMinutes}m)`);

  autoSyncTimer = setTimeout(() => {
    console.log('[AutoSync] Recurring auto-sync triggered...');
    const started = startSyncProcess('auto');
    if (!started) {
      setTimeout(scheduleNextAutoSync, 2 * 60 * 1000);
    }
  }, intervalMs);
}

function startSyncProcess(trigger: 'manual' | 'auto' | 'init' = 'manual'): boolean {
  if (isSyncing) return false;

  isSyncing = true;
  syncProgress = `Memulai unduhan data dari Google Spreadsheet (${trigger === 'auto' ? 'Auto-Sync Terjadwal' : trigger === 'init' ? 'Inisialisasi Awal' : 'Manual'})...`;
  autoSyncConfig.lastStatus = 'running';
  saveAutoSyncConfig();

  const pyProcess = spawn('python3', [path.join(__dirname, 'scripts', 'sync.py')]);

  pyProcess.stdout.on('data', (data) => {
    syncProgress = data.toString().trim();
    console.log('[Sync Output]:', syncProgress);
  });

  pyProcess.stderr.on('data', (data) => {
    console.error('[Sync Error]:', data.toString());
  });

  pyProcess.on('close', (code) => {
    isSyncing = false;
    if (code === 0) {
      syncProgress = 'Sinkronisasi berhasil diselesaikan!';
      autoSyncConfig.lastSyncTime = new Date().toISOString();
      autoSyncConfig.lastStatus = 'success';
      autoSyncConfig.totalRuns = (autoSyncConfig.totalRuns || 0) + 1;
      autoSyncConfig.lastError = null;
      reloadDb();
    } else {
      syncProgress = `Gagal sinkronisasi (exit code ${code})`;
      autoSyncConfig.lastStatus = 'error';
      autoSyncConfig.lastError = `Exit code ${code}`;
    }
    saveAutoSyncConfig();
    scheduleNextAutoSync();
  });

  return true;
}


function getDb(): DatabaseSync | null {
  if (!db) {
    if (!fs.existsSync(DB_PATH)) {
      if (!isSyncing) {
        startSyncProcess();
      }
      return null;
    }
    try {
      db = new DatabaseSync(DB_PATH);
    } catch (e) {
      console.warn('Failed to open database file:', e);
      return null;
    }
  }
  return db;
}

function reloadDb(): void {
  if (db) {
    try {
      db.close();
    } catch (e) {
      console.warn('Error closing old db:', e);
    }
    db = null;
  }
  if (fs.existsSync(DB_PATH)) {
    try {
      db = new DatabaseSync(DB_PATH);
    } catch (e) {
      console.warn('Failed to reload database:', e);
    }
  }
}

const app = express();
app.use(express.json());


// Helper to build WHERE conditions
function buildFilter(query: Record<string, any>) {
  const conditions: string[] = [];
  const params: any[] = [];

  const { month, startDate, endDate, status, courier, packer, sloc, search, handover } = query;

  if (month && month !== 'all') {
    conditions.push('year_month = ?');
    params.push(month);
  }

  if (startDate) {
    conditions.push('substr(print_date, 1, 10) >= ?');
    params.push(startDate);
  }

  if (endDate) {
    conditions.push('substr(print_date, 1, 10) <= ?');
    params.push(endDate);
  }

  if (status && status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }

  if (courier && courier !== 'all') {
    if (courier === 'JNE (Semua)' || courier === 'JNE') {
      conditions.push("courier LIKE 'JNE%'");
    } else if (courier === 'J&T (Semua)' || courier === 'J&T') {
      conditions.push("courier LIKE 'J&T%'");
    } else if (courier === 'SPX (Semua)' || courier === 'SPX') {
      conditions.push("courier LIKE 'SPX%'");
    } else {
      conditions.push('courier = ?');
      params.push(courier);
    }
  }

  if (packer && packer !== 'all') {
    conditions.push('packer = ?');
    params.push(packer);
  }

  if (sloc && sloc !== 'all') {
    conditions.push('sloc = ?');
    params.push(sloc);
  }

  if (handover && handover !== 'all') {
    if (handover === 'yes' || handover === 'terhandover') {
      conditions.push("handover_no != ''");
    } else if (handover === 'no' || handover === 'belum') {
      conditions.push("handover_no = ''");
    }
  }

  if (search && typeof search === 'string' && search.trim()) {
    const s = `%${search.trim()}%`;
    conditions.push('(order_id LIKE ? OR awb LIKE ? OR sn LIKE ? OR sku LIKE ? OR mit_dn LIKE ?)');
    params.push(s, s, s, s, s);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

// 1. Status & Metadata API
app.get('/api/status', (req: Request, res: Response) => {
  try {
    let meta: any = {};
    if (fs.existsSync(META_PATH)) {
      meta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
    }

    if (!fs.existsSync(DB_PATH)) {
      return res.json({
        isReady: false,
        isSyncing,
        syncProgress,
        meta,
        message: 'Database is initializing...',
      });
    }

    const database = getDb();
    if (!database) {
      return res.json({
        isReady: false,
        isSyncing,
        syncProgress,
        meta,
        message: 'Database is initializing...',
      });
    }

    const countRow: any = database.prepare('SELECT COUNT(*) as count FROM orders').get();
    
    // Get unique months
    const months = (database.prepare(`
      SELECT year_month, COUNT(*) as count 
      FROM orders 
      GROUP BY year_month 
      ORDER BY CASE WHEN year_month = 'Tanpa Tanggal' THEN '0000' ELSE year_month END DESC
    `).all() as any[]);

    // Get unique statuses
    const statuses = (database.prepare(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      WHERE status != '' 
      GROUP BY status 
      ORDER BY count DESC
    `).all() as any[]);

    // Top couriers
    const rawCouriers = (database.prepare(`
      SELECT courier, COUNT(*) as count 
      FROM orders 
      WHERE courier != '' 
      GROUP BY courier 
      ORDER BY count DESC
    `).all() as any[]);

    const jneCount = (database.prepare("SELECT COUNT(*) as count FROM orders WHERE courier LIKE 'JNE%'").get() as any)?.count || 0;
    const jntCount = (database.prepare("SELECT COUNT(*) as count FROM orders WHERE courier LIKE 'J&T%'").get() as any)?.count || 0;
    const spxCount = (database.prepare("SELECT COUNT(*) as count FROM orders WHERE courier LIKE 'SPX%'").get() as any)?.count || 0;

    const couriers = [
      { courier: 'JNE (Semua)', count: jneCount },
      { courier: 'J&T (Semua)', count: jntCount },
      { courier: 'SPX (Semua)', count: spxCount },
      ...rawCouriers
    ];

    // Top packers
    const packers = (database.prepare(`
      SELECT packer, COUNT(*) as count 
      FROM orders 
      WHERE packer != '' 
      GROUP BY packer 
      ORDER BY count DESC 
      LIMIT 50
    `).all() as any[]);

    // SLOCs
    const slocs = (database.prepare(`
      SELECT sloc, COUNT(*) as count 
      FROM orders 
      WHERE sloc != '' 
      GROUP BY sloc 
      ORDER BY count DESC
    `).all() as any[]);

    res.json({
      isReady: true,
      isSyncing,
      syncProgress,
      meta,
      totalRows: countRow?.count || 0,
      autoSync: autoSyncConfig,
      filterOptions: {
        months,
        statuses,
        couriers,
        packers,
        slocs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2a. Sync & Auto-Sync Status API
app.get('/api/sync/status', (req: Request, res: Response) => {
  res.json({
    isSyncing,
    syncProgress,
    autoSync: autoSyncConfig,
  });
});

// 2b. Configure Auto-Sync API
app.post('/api/sync/auto', (req: Request, res: Response) => {
  try {
    const { enabled, intervalMinutes } = req.body || {};
    if (typeof enabled === 'boolean') {
      autoSyncConfig.enabled = enabled;
    }
    if (typeof intervalMinutes === 'number' && intervalMinutes >= 5) {
      autoSyncConfig.intervalMinutes = intervalMinutes;
    }
    scheduleNextAutoSync();
    res.json({
      status: 'updated',
      message: autoSyncConfig.enabled
        ? `Auto-Sync aktif setiap ${autoSyncConfig.intervalMinutes} menit`
        : 'Auto-Sync dinonaktifkan',
      autoSync: autoSyncConfig,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2c. Trigger Manual Sync API
app.post('/api/sync', (req: Request, res: Response) => {
  if (isSyncing) {
    return res.json({ status: 'already_running', message: 'Sync is already in progress', autoSync: autoSyncConfig });
  }

  startSyncProcess('manual');
  res.json({ status: 'started', message: 'Sync process started in background', autoSync: autoSyncConfig });
});

// Helper to calculate previous month (YYYY-MM)
function getPreviousMonth(ym: string): string | null {
  if (!ym || ym === 'all' || ym === 'Tanpa Tanggal') return null;
  const parts = ym.split('-');
  if (parts.length !== 2) return null;
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month)) return null;
  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${month.toString().padStart(2, '0')}`;
}

// 3. Analytics & Summary Report API
app.get('/api/report/analytics', (req: Request, res: Response) => {
  try {
    const database = getDb();
    if (!database) {
      return res.status(503).json({
        error: 'Database is initializing. Please wait a moment.',
        isReady: false,
        isSyncing,
      });
    }
    const { whereClause, params } = buildFilter(req.query);

    // Main KPI Summary
    const summarySql = `
      SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as deliveredCount,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledCount,
        SUM(CASE WHEN status = 'Shipped' THEN 1 ELSE 0 END) as shippedCount,
        SUM(CASE WHEN status = 'Ready to Ship' THEN 1 ELSE 0 END) as readyToShipCount,
        SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) as returnedCount,
        SUM(CASE WHEN status = 'Goods Issue' THEN 1 ELSE 0 END) as goodsIssueCount,
        SUM(CASE WHEN handover_no != '' THEN 1 ELSE 0 END) as handoverCount,
        COUNT(DISTINCT NULLIF(sku, '')) as uniqueSkus,
        COUNT(DISTINCT NULLIF(packer, '')) as activePackers
      FROM orders
      ${whereClause}
    `;

    const summary: any = database.prepare(summarySql).get(...params) || {};
    const total = summary.totalOrders || 0;
    summary.deliveredRate = total > 0 ? ((summary.deliveredCount || 0) / total) * 100 : 0;
    summary.cancelledRate = total > 0 ? ((summary.cancelledCount || 0) / total) * 100 : 0;
    summary.returnedRate = total > 0 ? ((summary.returnedCount || 0) / total) * 100 : 0;
    summary.handoverRate = total > 0 ? ((summary.handoverCount || 0) / total) * 100 : 0;

    // Previous Month KPI calculation if specific month is requested and not custom date range
    let prevMonthSummary: any = null;
    const currentMonth = req.query.month as string;
    if (currentMonth && currentMonth !== 'all' && currentMonth !== 'Tanpa Tanggal') {
      const prevMonth = getPreviousMonth(currentMonth);
      if (prevMonth) {
        const prevParams = [...params];
        // replace month param
        const prevWhere = whereClause.replace('year_month = ?', `year_month = '${prevMonth}'`);
        const prevSql = `
          SELECT 
            COUNT(*) as totalOrders,
            SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as deliveredCount,
            SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledCount,
            SUM(CASE WHEN status = 'Shipped' THEN 1 ELSE 0 END) as shippedCount,
            SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) as returnedCount
          FROM orders
          ${prevWhere}
        `;
        const prevRes: any = database.prepare(prevSql).get() || {};
        const prevTot = prevRes.totalOrders || 0;
        prevMonthSummary = {
          month: prevMonth,
          totalOrders: prevTot,
          deliveredCount: prevRes.deliveredCount || 0,
          deliveredRate: prevTot > 0 ? ((prevRes.deliveredCount || 0) / prevTot) * 100 : 0,
          cancelledCount: prevRes.cancelledCount || 0,
          cancelledRate: prevTot > 0 ? ((prevRes.cancelledCount || 0) / prevTot) * 100 : 0,
          momGrowth: prevTot > 0 ? ((total - prevTot) / prevTot) * 100 : 0,
        };
      }
    }

    // Daily Trend
    const dailySql = `
      SELECT 
        substr(print_date, 1, 10) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'Shipped' THEN 1 ELSE 0 END) as shipped
      FROM orders
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} print_date != '' AND length(print_date) >= 10
      GROUP BY substr(print_date, 1, 10)
      ORDER BY date ASC
    `;
    const dailyTrend = database.prepare(dailySql).all(...params);

    // Status Distribution
    const statusSql = `
      SELECT 
        status, 
        COUNT(*) as count 
      FROM orders
      ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;
    const statusRows = database.prepare(statusSql).all(...params) as any[];
    const statusDistribution = statusRows.map((r) => ({
      status: r.status || 'Tidak Diketahui',
      count: r.count,
      percentage: total > 0 ? (r.count / total) * 100 : 0,
    }));

    // Courier Breakdown
    const courierSql = `
      SELECT 
        courier,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) as returned
      FROM orders
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} courier != ''
      GROUP BY courier
      ORDER BY total DESC
      LIMIT 12
    `;
    const courierRows = database.prepare(courierSql).all(...params) as any[];
    const courierBreakdown = courierRows.map((r) => ({
      courier: r.courier,
      total: r.total,
      delivered: r.delivered,
      cancelled: r.cancelled,
      returned: r.returned,
      deliveredRate: r.total > 0 ? (r.delivered / r.total) * 100 : 0,
      share: total > 0 ? (r.total / total) * 100 : 0,
    }));

    // Packer Productivity Breakdown
    const packerSql = `
      SELECT 
        packer,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM orders
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} packer != ''
      GROUP BY packer
      ORDER BY total DESC
      LIMIT 15
    `;
    const packerRows = database.prepare(packerSql).all(...params) as any[];
    const packerBreakdown = packerRows.map((r) => ({
      packer: r.packer,
      total: r.total,
      delivered: r.delivered,
      cancelled: r.cancelled,
      deliveredRate: r.total > 0 ? (r.delivered / r.total) * 100 : 0,
    }));

    // Top SKUs
    const skuSql = `
      SELECT 
        sku,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as delivered
      FROM orders
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} sku != ''
      GROUP BY sku
      ORDER BY total DESC
      LIMIT 10
    `;
    const skuBreakdown = database.prepare(skuSql).all(...params);

    // SLOC Breakdown
    const slocSql = `
      SELECT 
        sloc,
        COUNT(*) as total
      FROM orders
      ${whereClause}
      GROUP BY sloc
      ORDER BY total DESC
    `;
    const slocRows = database.prepare(slocSql).all(...params) as any[];
    const slocBreakdown = slocRows.map((r) => ({
      sloc: r.sloc || 'Tidak Ada SLOC',
      total: r.total,
      share: total > 0 ? (r.total / total) * 100 : 0,
    }));

    // Handover Breakdown
    const handoverSql = `
      SELECT 
        handover_no,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM orders
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} handover_no != ''
      GROUP BY handover_no
      ORDER BY total DESC
      LIMIT 10
    `;
    const handoverRows = database.prepare(handoverSql).all(...params) as any[];
    const handoverBreakdown = handoverRows.map((r) => ({
      handover_no: r.handover_no,
      total: r.total,
      delivered: r.delivered,
      cancelled: r.cancelled,
      share: total > 0 ? (r.total / total) * 100 : 0,
    }));

    res.json({
      summary,
      prevMonthSummary,
      dailyTrend,
      statusDistribution,
      courierBreakdown,
      packerBreakdown,
      skuBreakdown,
      slocBreakdown,
      handoverBreakdown,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Paginated Orders List API
app.get('/api/orders', (req: Request, res: Response) => {
  try {
    const database = getDb();
    if (!database) {
      return res.status(503).json({
        error: 'Database is initializing. Please wait a moment.',
        isReady: false,
        data: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
      });
    }
    const { whereClause, params } = buildFilter(req.query);

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string, 10) || 25));
    const offset = (page - 1) * limit;

    // Allowed sort columns
    const allowedSortCols = ['id', 'order_id', 'status', 'mit_dn', 'sku', 'courier', 'awb', 'sn', 'sloc', 'packer', 'print_date'];
    const sortByParam = req.query.sortBy as string;
    const sortCol = allowedSortCols.includes(sortByParam) ? sortByParam : 'print_date';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*) as count FROM orders ${whereClause}`;
    const totalCount = ((database.prepare(countSql).get(...params) as any)?.count) || 0;

    const listSql = `
      SELECT id, order_id, status, mit_dn, sku, courier, awb, sn, sloc, packer, print_date, handover_no
      FROM orders
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const orders = database.prepare(listSql).all(...params);

    res.json({
      data: orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Orders query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. CSV Export API (Respects filter and user sort selection)
app.get('/api/export', (req: Request, res: Response) => {
  try {
    const database = getDb();
    if (!database) {
      return res.status(503).send('Database is initializing. Please wait a moment.');
    }
    const { whereClause, params } = buildFilter(req.query);

    const allowedSortCols: Record<string, string> = {
      order_id: 'order_id',
      status: 'status',
      mit_dn: 'mit_dn',
      sku: 'sku',
      courier: 'courier',
      awb: 'awb',
      sn: 'sn',
      sloc: 'sloc',
      packer: 'packer',
      print_date: 'print_date',
      handover_no: 'handover_no',
    };
    const sortByParam = req.query.sortBy as string;
    const sortCol = allowedSortCols[sortByParam] || 'print_date';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const monthName = (req.query.month as string) || 'Semua';
    const courierPart = req.query.courier && req.query.courier !== 'all' ? `_${(req.query.courier as string).replace(/[\s\(\)]+/g, '_')}` : '';
    const slocPart = req.query.sloc && req.query.sloc !== 'all' ? `_SLOC${req.query.sloc}` : '';
    const filename = `Laporan_Logistik_${monthName}${courierPart}${slocPart}_urut_${sortCol}_${sortOrder.toLowerCase()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write BOM for Indonesian Excel compatibility
    res.write('\uFEFF');
    res.write('Marketplace Order ID,Status,MIT DN,SKU Number,Kurir,AWB (Resi),SN,SLOC,Packer,Print Date,No Handover\n');

    // Export up to 100,000 rows according to current filtered and sorted criteria
    const exportSql = `
      SELECT order_id, status, mit_dn, sku, courier, awb, sn, sloc, packer, print_date, handover_no
      FROM orders
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT 100000
    `;

    const rows = database.prepare(exportSql).all(...params) as any[];

    for (const r of rows) {
      const escape = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
      res.write([
        escape(r.order_id),
        escape(r.status),
        escape(r.mit_dn),
        escape(r.sku),
        escape(r.courier),
        escape(r.awb),
        escape(r.sn),
        escape(r.sloc),
        escape(r.packer),
        escape(r.print_date),
        escape(r.handover_no),
      ].join(',') + '\n');
    }

    res.end();
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).send('Error generating export');
  }
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  loadAutoSyncConfig();

  if (!fs.existsSync(DB_PATH)) {
    console.log('Database not found on startup. Triggering initial sync in background...');
    startSyncProcess('init');
  } else {
    scheduleNextAutoSync();
  }

  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Logistics Monthly Report Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
