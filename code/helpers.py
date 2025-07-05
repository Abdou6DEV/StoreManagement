from database import conn, c
from datetime import datetime

def is_descendant(widget, ancestor):
    """Returns True if widget is inside ancestor (or is ancestor)."""
    try:
        while widget:
            if widget == ancestor:
                return True
            widget = widget.master
    except Exception:
        return False
    return False

def get_history_year_range():
    c.execute("""
        SELECT MIN(timestamp) FROM (
            SELECT timestamp FROM quick_sales
            UNION ALL
            SELECT timestamp FROM purchases
            UNION ALL
            SELECT timestamp FROM bills
        )
    """)
    result = c.fetchone()[0]
    if result:
        min_year = int(result[:4])
    else:
        min_year = datetime.now().year

    max_year = datetime.now().year
    return min_year, max_year

def get_base_cash():
    c.execute("SELECT amount FROM base_cash WHERE id = 1")
    return round(c.fetchone()[0] or 0, 2)

def set_setting(key, value):
    c.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()

def get_setting(key, default=None):
    c.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = c.fetchone()
    return row[0] if row else default