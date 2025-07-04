import customtkinter as ctk
from datetime import datetime
from calendar import monthrange
from helpers import get_history_year_range

def create_ctk_date_picker(parent, default=None):
    today = datetime.today()
    y, m, d = (default or today.strftime("%Y-%m-%d")).split("-")
    y, m, d = int(y), int(m), int(d)

    container = ctk.CTkFrame(parent, fg_color="transparent")

    min_year, max_year = get_history_year_range()
    years = [str(y) for y in range(min_year, max_year + 1)]
    year_box = ctk.CTkComboBox(container, values=years, width=70)
    year_box.set(str(y))
    year_box.pack(side="left", padx=2)

    months = [f"{i:02}" for i in range(1, 13)]
    month_box = ctk.CTkComboBox(container, values=months, width=60)
    month_box.set(f"{m:02}")
    month_box.pack(side="left", padx=2)

    def update_days(*_):
        y = int(year_box.get())
        m = int(month_box.get())
        days = [f"{i:02}" for i in range(1, monthrange(y, m)[1] + 1)]
        current_day = day_box.get()
        day_box.configure(values=days)
        if current_day not in days:
            day_box.set(days[-1])

    day_box = ctk.CTkComboBox(container, values=[], width=60)
    day_box.pack(side="left", padx=2)
    day_box.set(f"{d:02}")

    year_box.bind("<<ComboboxSelected>>", update_days)
    month_box.bind("<<ComboboxSelected>>", update_days)
    update_days()

    def get_date():
        return f"{year_box.get()}-{month_box.get()}-{day_box.get()}"

    container.get_date = get_date
    return container
