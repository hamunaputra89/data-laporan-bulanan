import os
import sys
import csv
import urllib.request
import sqlite3
import time
import json
from datetime import datetime

SPREADSHEET_ID = "1bdD0HshoPpbbhMNzlCfAfV4UGUOaSwjhoYMmLLbbJ_I"
GID = "1566921166"
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=GID"

def sync_data():
    t0 = time.time()
    os.makedirs("data", exist_ok=True)
    temp_csv = "/tmp/sheet_data.csv"
    db_path = "data/warehouse.db"
    meta_path = "data/meta.json"

    print(f"[{datetime.now().isoformat()}] Starting sync from Google Spreadsheet...")
    
    # Download fresh CSV if requested or if temp doesn't exist
    url = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid={GID}"
    try:
        urllib.request.urlretrieve(url, temp_csv)
        print("Downloaded CSV successfully.")
    except Exception as e:
        print(f"Download error: {e}")
        if not os.path.exists(temp_csv):
            print("No local CSV backup available. Aborting.")
            return False

    temp_db = "data/warehouse_temp.db"
    if os.path.exists(temp_db):
        os.remove(temp_db)

    conn = sqlite3.connect(temp_db)
    cur = conn.cursor()
    cur.execute("PRAGMA synchronous = OFF")
    cur.execute("PRAGMA journal_mode = OFF")

    cur.execute("""
    CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT,
        status TEXT,
        mit_dn TEXT,
        sku TEXT,
        courier TEXT,
        awb TEXT,
        sn TEXT,
        sloc TEXT,
        packer TEXT,
        print_date TEXT,
        year_month TEXT,
        handover_no TEXT
    )
    """)

    row_count = 0
    with open(temp_csv, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            print("Empty CSV.")
            return False

        batch = []
        for r in reader:
            if not r:
                continue
            order_id = r[0].strip() if len(r) > 0 else ""
            status = r[1].strip() if len(r) > 1 else ""
            mit_dn = r[2].strip() if len(r) > 2 else ""
            sku = r[3].strip() if len(r) > 3 else ""
            courier = r[4].strip() if len(r) > 4 else ""
            awb = r[5].strip() if len(r) > 5 else ""
            sn = r[6].strip() if len(r) > 6 else ""
            sloc = r[7].strip() if len(r) > 7 else ""
            packer = r[8].strip() if len(r) > 8 else ""
            pdate = r[9].strip() if len(r) > 9 else ""
            ym = pdate[:7] if len(pdate) >= 7 else ("Tanpa Tanggal" if not pdate else pdate[:4])
            handover = r[10].strip() if len(r) > 10 else ""

            batch.append((order_id, status, mit_dn, sku, courier, awb, sn, sloc, packer, pdate, ym, handover))
            row_count += 1
            if len(batch) >= 15000:
                cur.executemany("""
                    INSERT INTO orders (order_id, status, mit_dn, sku, courier, awb, sn, sloc, packer, print_date, year_month, handover_no)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                """, batch)
                batch = []

        if batch:
            cur.executemany("""
                INSERT INTO orders (order_id, status, mit_dn, sku, courier, awb, sn, sloc, packer, print_date, year_month, handover_no)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """, batch)

    print("Building indexes...")
    cur.execute("CREATE INDEX idx_orders_ym ON orders(year_month)")
    cur.execute("CREATE INDEX idx_orders_status ON orders(status)")
    cur.execute("CREATE INDEX idx_orders_courier ON orders(courier)")
    cur.execute("CREATE INDEX idx_orders_packer ON orders(packer)")
    cur.execute("CREATE INDEX idx_orders_sloc ON orders(sloc)")
    cur.execute("CREATE INDEX idx_orders_printdate ON orders(print_date)")
    cur.execute("CREATE INDEX idx_orders_order_id ON orders(order_id)")
    cur.execute("CREATE INDEX idx_orders_awb ON orders(awb)")
    cur.execute("CREATE INDEX idx_orders_sku ON orders(sku)")
    cur.execute("CREATE INDEX idx_orders_sn ON orders(sn)")
    conn.commit()
    conn.close()

    # Atomically replace DB
    if os.path.exists(db_path):
        os.remove(db_path)
    os.rename(temp_db, db_path)

    metadata = {
        "lastSync": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "rowCount": row_count,
        "spreadsheetId": SPREADSHEET_ID,
        "gid": GID,
        "syncDurationSec": round(time.time() - t0, 2)
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Sync complete: {row_count} rows indexed in {metadata['syncDurationSec']}s")
    return True

if __name__ == "__main__":
    sync_data()
