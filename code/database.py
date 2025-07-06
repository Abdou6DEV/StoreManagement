import sqlite3
from config import DB_PATH

# === DATABASE SETUP ===
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

def init_database():
    c.execute("""CREATE TABLE IF NOT EXISTS base_cash (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        amount INTEGER
    )""")

    c.execute("INSERT OR IGNORE INTO base_cash (id, amount) VALUES (1, 0)")

    c.execute("""CREATE TABLE IF NOT EXISTS quick_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        product TEXT,
        category TEXT,
        bought_price INTEGER,
        sold_price INTEGER
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        product TEXT,
        category TEXT,
        quantity INTEGER,
        cost INTEGER,
        imei TEXT,
        seller TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        category TEXT,
        amount INTEGER,
        notes TEXT
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product TEXT,
        type TEXT,
        qty INTEGER,
        bought_price INTEGER,
        selling_price INTEGER
    )
    """)

    c.execute("""CREATE TABLE IF NOT EXISTS credit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        name TEXT,
        amount INTEGER,
        reason TEXT,
        phone TEXT
    )""")

    c.execute("PRAGMA table_info(credit)")
    columns = [col[1] for col in c.fetchall()]
    if "payment_time" not in columns:
        c.execute("ALTER TABLE credit ADD COLUMN payment_time TEXT")

    c.execute("""CREATE TABLE IF NOT EXISTS cash_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        description TEXT,
        amount INTEGER,
        balance INTEGER
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS versement (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        name TEXT,
        amount INTEGER,
        reason TEXT,
        phone TEXT,
        payment_time TEXT,
        product TEXT,
        category TEXT,
        total_price INTEGER,
        bought_price INTEGER
    )
    """)

    c.execute("CREATE INDEX IF NOT EXISTS idx_qs_timestamp ON quick_sales(timestamp)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_stock_product_type ON stock(product, type)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_bills_timestamp ON bills(timestamp)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_purchases_timestamp ON purchases(timestamp)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_stock_product ON stock(product)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_qs_timestamp ON quick_sales(timestamp)")

    conn.commit()
