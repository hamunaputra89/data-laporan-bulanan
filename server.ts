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

function getDb(): DatabaseSync {
  if (!db) {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error('Database file does not exist yet');
    }
    db = new DatabaseSync(DB_PATH);
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
    db = new DatabaseSync(DB_PATH);
  }
}

const app = express();
app.use(express.json());

let isSyncing = false;
let syncProgress = '';

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

// 2. Trigger Sync API
app.post('/api/sync', (req: Request, res: Response) => {
  if (isSyncing) {
    return res.json({ status: 'already_running', message: 'Sync is already in progress' });
  }

  isSyncing = true;
  syncProgress = 'Memulai unduhan data dari Google Spreadsheet...';

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
      reloadDb();
    } else {
      syncProgress = `Gagal sinkronisasi (exit code ${code})`;
    }
  });

  res.json({ status: 'started', message: 'Sync process started in background' });
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

// 5. CSV Export API
app.get('/api/export', (req: Request, res: Response) => {
  try {
    const database = getDb();
    const { whereClause, params } = buildFilter(req.query);

    const filename = `Laporan_Bulanan_${req.query.month || 'Semua'}_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write BOM for Indonesian Excel compatibility
    res.write('\uFEFF');
    res.write('Marketplace Order ID,Status,MIT DN,SKU Number,Kurir,AWB (Resi),SN,SLOC,Packer,Print Date,No Handover\n');

    // Limit export to 25,000 for browser memory safety
    const exportSql = `
      SELECT order_id, status, mit_dn, sku, courier, awb, sn, sloc, packer, print_date, handover_no
      FROM orders
      ${whereClause}
      ORDER BY print_date DESC
      LIMIT 25000
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
