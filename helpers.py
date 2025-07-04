from database import c
from datetime import datetime

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