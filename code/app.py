# === IMPORTS ===
import customtkinter as ctk
from tkinter import messagebox
from datetime import datetime, timedelta
from calendar import monthrange
from datetime import datetime
from PIL import Image
import tkinter as tk

# === LOCAL IMPORTS ===
from components import create_ctk_date_picker
from database import conn, c, init_database
from config import APP_NAME, LOGO_PATH, LOGO_SIZE, MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, SIDEBAR_WIDTH, SIDEBAR_BG_COLOR, DEFAULT_HIGH_PROFIT_THRESHOLD, DEFAULT_LOW_PROFIT_THRESHOLD, STOCK_TYPES, SALES_TYPES, NON_PURCHASED_TYPES
from helpers import get_history_year_range, get_base_cash , set_setting , get_setting, is_descendant
from themes import apply_theme

# === DATABASE SETUP ===
init_database()

# === THEME SETUP ===
apply_theme()

# === MAIN APP WINDOW ===
app = ctk.CTk()
app.title(APP_NAME)
app.minsize(MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH)

stock_selected = False
qs_suggestion_listbox = None
suggestion_frame = None
estimated_row_height = 30  # height per row, roughly
stock_per_page = 20  # fallback default
bills_search_after_id = None

# Global references for both suggestion dropdowns
suggestion_frame = None
qs_suggestion_listbox = None
stock_suggestion_frame = None
stock_suggestion_listbox = None
app_initialized = False

def check_click_outside(event):
    global suggestion_frame, qs_suggestion_listbox
    global stock_suggestion_frame, stock_suggestion_listbox

    widget = event.widget

    # Check if click is outside Quick Sale suggestion
    if suggestion_frame and not is_descendant(widget, suggestion_frame):
        try: suggestion_frame.destroy()
        except: pass
        suggestion_frame = None
        qs_suggestion_listbox = None

    # Check if click is outside Stock suggestion
    if stock_suggestion_frame and not is_descendant(widget, stock_suggestion_frame):
        try: stock_suggestion_frame.destroy()
        except: pass
        stock_suggestion_frame = None
        stock_suggestion_listbox = None

# ✅ Bind ONCE globally
app.bind("<Button-1>", check_click_outside, add="+")

def fallback_enter(event=None):
    # Only trigger if on dashboard and product field is empty
    if pages["dashboard"].winfo_ismapped():
        if not qs_product.get().strip() and not qs_sold.get().strip():
            qs_product.focus()

app.bind("<Return>", fallback_enter)

def restore_stock_from_sale_by_id(sale_id):
    c.execute("SELECT product, category FROM quick_sales WHERE id = ?", (sale_id,))
    row = c.fetchone()
    if not row:
        return
    product, category = row
    c.execute("UPDATE stock SET qty = qty + 1 WHERE product = ? AND type = ?", (product, category))


# === FONT SETTINGS ===
title_font = ctk.CTkFont(family="Segoe UI", size=26, weight="bold")
info_font = ctk.CTkFont(family="Segoe UI", size=14, weight="bold")

# === SIDEBAR FRAME ===
sidebar = ctk.CTkFrame(app, width=SIDEBAR_WIDTH, corner_radius=0, fg_color=SIDEBAR_BG_COLOR)
sidebar.pack(side="left", fill="y")

# === LOGO AT TOP ===
from PIL import Image, ImageTk
logo_image = Image.open(LOGO_PATH).resize(LOGO_SIZE)
logo_ctk_image = ctk.CTkImage(light_image=logo_image, size=LOGO_SIZE)

logo_label = ctk.CTkLabel(sidebar, text="", image=logo_ctk_image, fg_color="transparent")
logo_label.pack(pady=(20, 10), anchor="n")

# === CONTAINER WITH PADDED BACKGROUND & ROUNDED EDGE ===
sidebar_button_container = ctk.CTkFrame(sidebar, fg_color="transparent", corner_radius=20)
sidebar_button_container.pack(padx=10, pady=40, fill="x")

# === BUTTON FUNCTION ===
def add_sidebar_btn(text, command):
    btn = ctk.CTkButton(
        sidebar_button_container,
        text=text,
        command=command,
        width=160,
        height=45,
        corner_radius=12,
        font=("Arial", 14, "bold"),
        text_color="white",
        fg_color="#3a3a3a",
        hover_color="#e53935"
    )
    btn.pack(pady=6, padx=10)
    return btn

# === MAIN AREA ===
main_area = ctk.CTkFrame(app, fg_color="transparent")
main_area.pack(side="right", fill="both", expand=True)

pages = {}
def show_page(name):
    for pg in pages.values():
        pg.pack_forget()
    pages[name].pack(fill="both", expand=True)
    if name == "stock":
        # Only load stock if the app is initialized
        if app_initialized:
            load_stock_table(0, force=True)

# === SIDEBAR BUTTONS ===
add_sidebar_btn("📊 Dashboard", lambda: show_page("dashboard"))
add_sidebar_btn("📅 History", lambda: show_history_page())
add_sidebar_btn("📦 Stock | Purchase", lambda: show_page("stock"))
add_sidebar_btn("📄 Money Management", lambda: show_page("bills"))
add_sidebar_btn("⚙ Settings", lambda: show_page("settings"))

# === PAGE CONTAINERS ===
for name in ["dashboard", "history", "purchases", "bills", "settings"]:
    pages[name] = ctk.CTkFrame(main_area, fg_color="transparent")

# === DASHBOARD PAGE ===
dash = pages["dashboard"]

header_frame = ctk.CTkFrame(dash, fg_color="transparent")
header_frame.pack(pady=20)

ctk.CTkLabel(header_frame, text="📊 Dashboard", font=title_font).pack(side="left")

dash_body = ctk.CTkFrame(dash, fg_color="transparent")
dash_body.pack(fill="both", expand=True, padx=20)

left_col = ctk.CTkFrame(dash_body, fg_color="transparent")
left_col.pack(side="left", fill="both", expand=True, padx=10, pady=10)

right_col = ctk.CTkFrame(dash_body, fg_color="transparent")
right_col.pack(side="right", fill="y", padx=10, pady=10)

# === HISTORY PAGE LOGIC PLACEHOLDER ===
def show_history_page():
    show_page("history")
    if not hasattr(show_history_page, "initialized"):
        switch_history_mode()  # will load General History by default
        show_history_page.initialized = True

def show_stock_suggestions(event=None):
    global qs_suggestion_listbox, suggestion_frame, stock_selected

    stock_selected = False

    # Re-enable fields
    qs_category.configure(state="normal")
    qs_bought.configure(state="normal", fg_color="#343638", text_color="white")

    text = qs_product.get().strip().lower()
    if not text:
        if suggestion_frame:
            suggestion_frame.destroy()
        qs_suggestion_listbox = None
        suggestion_frame = None
        return

    # Match product or type
    c.execute("""
        SELECT product, type, bought_price, selling_price 
        FROM stock 
        WHERE LOWER(product) LIKE ? OR LOWER(type) LIKE ?
    """, (f"%{text}%", f"%{text}%"))
    matches = c.fetchall()

    if suggestion_frame:
        suggestion_frame.destroy()
    if not matches:
        qs_suggestion_listbox = None
        suggestion_frame = None
        return

    # === NEW: Get longest entry for width
    longest = max((f"{row[0]} | {row[1]}" for row in matches), key=len)
    est_char_width = 9  # fine-tuned for Segoe UI 12
    dynamic_width = min(max(len(longest) * est_char_width, 180), 400)  # clamp to reasonable width

    # Create dropdown frame
    if suggestion_frame:
        suggestion_frame.destroy()
    suggestion_frame = tk.Frame(app, bg="#ccc", bd=1, relief="solid")
    suggestion_frame.place(
        x=qs_product.winfo_rootx() - app.winfo_rootx(),
        y=qs_product.winfo_rooty() - app.winfo_rooty() + qs_product.winfo_height(),
        width=dynamic_width
    )

    scrollbar = tk.Scrollbar(suggestion_frame, bg="#222", troughcolor="#111", activebackground="#555", highlightthickness=0)
    scrollbar.pack(side="right", fill="y")

    qs_suggestion_listbox = tk.Listbox(
        suggestion_frame,
        yscrollcommand=scrollbar.set,
        bg="#1a1a1a", fg="white",
        selectbackground="#B22222",
        font=("Segoe UI", 12),
        height=min(7, len(matches)),
        borderwidth=0,
        highlightthickness=0,
        activestyle="none"
    )
    qs_suggestion_listbox.pack(side="left", fill="both", expand=True)
    scrollbar.config(command=qs_suggestion_listbox.yview)

    for row in matches:
        qs_suggestion_listbox.insert("end", f"{row[0]} | {row[1]}")

    def on_select(event=None):
        global stock_selected, qs_suggestion_listbox, suggestion_frame
        try:
            selection = qs_suggestion_listbox.get(qs_suggestion_listbox.curselection())
            name, type_ = selection.split(" | ")
            c.execute("SELECT type, bought_price, selling_price FROM stock WHERE product = ? AND type = ?", (name, type_))
            result = c.fetchone()
            if result:
                t, b, s = result
                qs_product.delete(0, "end")
                qs_product.insert(0, name)
                qs_category.set(t)
                qs_category.configure(state="disabled")
                toggle_bought_price()
                qs_bought.delete(0, "end")
                qs_bought.insert(0, str(int(b)))
                qs_bought.configure(state="disabled", fg_color="#2a2a2a", text_color="#aaa")
                qs_sold.delete(0, "end")
                qs_sold.insert(0, str(int(s)))
                update_stock_status()
                stock_selected = True
        except:
            pass
        if suggestion_frame:
            suggestion_frame.destroy()
        qs_suggestion_listbox = None
        suggestion_frame = None

    # Auto-select first
    if qs_suggestion_listbox.size() > 0:
        qs_suggestion_listbox.select_set(0)
        qs_suggestion_listbox.activate(0)

    # Bind keyboard/mouse
    qs_suggestion_listbox.bind("<Return>", on_select)
    qs_suggestion_listbox.bind("<Double-Button-1>", on_select)
    qs_suggestion_listbox.bind("<Escape>", lambda e: suggestion_frame.destroy())

    qs_product.focus_set()


def show_stock_suggestions_for_stock(name_entry, type_combobox, bought_entry, selling_entry):
    global stock_suggestion_listbox, stock_suggestion_frame
    global suggestion_frame, qs_suggestion_listbox  # to safely destroy other suggestions

    text = name_entry.get().strip().lower()

    # Destroy if empty
    if not text:
        if stock_suggestion_frame:
            stock_suggestion_frame.destroy()
        stock_suggestion_frame = None
        stock_suggestion_listbox = None
        return

    c.execute("""
        SELECT product, type, bought_price, selling_price 
        FROM stock 
        WHERE LOWER(product) LIKE ? OR LOWER(type) LIKE ?
    """, (f"%{text}%", f"%{text}%"))
    matches = c.fetchall()

    if not matches:
        return

    # Destroy other suggestion
    if suggestion_frame:
        try: suggestion_frame.destroy()
        except: pass
        suggestion_frame = None
        qs_suggestion_listbox = None

    if stock_suggestion_frame:
        try: stock_suggestion_frame.destroy()
        except: pass

    # === NEW: Calculate dynamic width
    longest = max((f"{row[0]} | {row[1]}" for row in matches), key=len)
    est_char_width = 9  # Adjust for font size
    dynamic_width = min(max(len(longest) * est_char_width, 180), 400)  # Clamp

    # Create suggestion
    if stock_suggestion_frame:
        stock_suggestion_frame.destroy()
    stock_suggestion_frame = tk.Frame(app, bg="#000", bd=1, relief="solid")
    stock_suggestion_frame.place(
        x=name_entry.winfo_rootx() - app.winfo_rootx(),
        y=name_entry.winfo_rooty() - app.winfo_rooty() + name_entry.winfo_height(),
        width=dynamic_width
    )

    scrollbar = tk.Scrollbar(stock_suggestion_frame, bg="#222")
    scrollbar.pack(side="right", fill="y")

    stock_suggestion_listbox = tk.Listbox(
        stock_suggestion_frame,
        yscrollcommand=scrollbar.set,
        bg="#1a1a1a", fg="white",
        selectbackground="#B22222",
        font=("Segoe UI", 12),
        height=min(7, len(matches)),
        borderwidth=0,
        highlightthickness=0,
        activestyle="none"
    )
    stock_suggestion_listbox.pack(side="left", fill="both", expand=True)
    scrollbar.config(command=stock_suggestion_listbox.yview)

    for row in matches:
        stock_suggestion_listbox.insert("end", f"{row[0]} | {row[1]}")

    def select_item(event=None):
        global stock_suggestion_frame, stock_suggestion_listbox
        try:
            selection = stock_suggestion_listbox.get(stock_suggestion_listbox.curselection())
            name, typ = selection.split(" | ")
            name_entry.delete(0, "end")
            name_entry.insert(0, name)
            type_combobox.set(typ)

            c.execute("SELECT bought_price, selling_price FROM stock WHERE product = ? AND type = ?", (name, typ))
            b, s = c.fetchone()
            bought_entry.delete(0, "end")
            bought_entry.insert(0, str(int(b)))
            selling_entry.delete(0, "end")
            selling_entry.insert(0, str(int(s)))
        except:
            pass

        stock_suggestion_frame.destroy()
        stock_suggestion_listbox = None
        stock_suggestion_frame = None

    stock_suggestion_listbox.bind("<Return>", select_item)
    stock_suggestion_listbox.bind("<Double-Button-1>", select_item)
    stock_suggestion_listbox.bind("<Escape>", lambda e: stock_suggestion_frame.destroy())

# === TODAY'S SALES SECTION ===
today_frame = ctk.CTkFrame(left_col, corner_radius=10)
today_frame.pack(fill="x", padx=10, pady=10)

ctk.CTkLabel(today_frame, text="📅 Today's Sales", font=title_font).pack(pady=(10, 5))

today_total_lbl = ctk.CTkLabel(today_frame, text="Total: 0.00 DA",
                               font=info_font,)  # green
today_total_lbl.pack(anchor="w", padx=15, pady=2)

today_profit_lbl = ctk.CTkLabel(today_frame, text="Profit: 0.00 DA",
                                font=info_font, text_color="#00e676")  # green
today_profit_lbl.pack(anchor="w", padx=15, pady=2)


# === TREEVIEW ===
import tkinter.ttk as ttk  # use ttk only for Treeview

tree_frame = ctk.CTkFrame(today_frame, corner_radius=6)
tree_frame.pack(fill="x", padx=10, pady=(5, 10))
style = ttk.Style()
style.theme_use("default")

style.configure("Treeview",
    background="#2a2a2a",        # dark grey rows
    foreground="white",          # white text
    rowheight=28,
    fieldbackground="#2a2a2a",
    font=("Segoe UI", 11))

style.configure("Treeview.Heading",
    background="#e53935",  # your red
    foreground="white",
    font=("Segoe UI", 12, "bold"),
    relief="flat")

style.map("Treeview.Heading", background=[("active", "#e53935")])

style.map("Treeview",
    background=[('selected', '#c62828')],  # darker red on row select
    foreground=[('selected', 'white')])

today_sales_tree = ttk.Treeview(tree_frame,
    columns=("product", "category", "bought", "sold","profit", "time"),
    show="headings", height=6)

for col, label in zip(["product", "category", "bought", "sold","profit", "time"],
                      ["Product", "Category", "Bought", "Sold","profit", "Time"]):
    today_sales_tree.heading(col, text=label)
    today_sales_tree.column(col, anchor="center", width=100)

today_sales_tree.pack(fill="x")

today_sales_tree.tag_configure('even', background="#2a2a2a")
today_sales_tree.tag_configure('odd', background="#1f1f1f")

today_sales_tree.column("product", anchor="center")
today_sales_tree.column("category", anchor="center")
today_sales_tree.column("bought", anchor="center")
today_sales_tree.column("sold", anchor="center")
today_sales_tree.column("time", anchor="center")

# === ACTION BUTTONS ===
action_frame = ctk.CTkFrame(today_frame, fg_color="transparent")
action_frame.pack(pady=5)

# === QUICK SALE ENTRY FORM ===
quickf = ctk.CTkFrame(today_frame, corner_radius=8)
quickf.pack(padx=10, pady=(0, 10),anchor="center")

# --- First Row ---
row1 = ctk.CTkFrame(quickf, fg_color="transparent")
row1.pack(pady=4)

ctk.CTkLabel(row1, text="Product:", width=80).pack(side="left", padx=4)
qs_product = ctk.CTkEntry(row1, width=140)
qs_product.pack(side="left", padx=4)

ctk.CTkLabel(row1, text="Category:", width=80).pack(side="left", padx=4)
qs_category = ctk.CTkComboBox(
    row1, values=SALES_TYPES, width=150)
qs_category.pack(side="left", padx=4)
qs_category.set(SALES_TYPES[0])  # Default
current_category = SALES_TYPES[0]

qs_stock_status_lbl = ctk.CTkLabel(row1, text="", text_color="white")
qs_stock_status_lbl.pack(side="left", padx=10)
# --- Second Row ---
row2 = ctk.CTkFrame(quickf, fg_color="transparent")
row2.pack(pady=4)

qs_bought_lbl = ctk.CTkLabel(row2, text="Bought Price:", width=100)
qs_bought = ctk.CTkEntry(row2, width=100)
qs_bought_lbl.pack(side="left", padx=4)
qs_bought.pack(side="left", padx=4)

ctk.CTkLabel(row2, text="Sold Price:", width=80).pack(side="left", padx=4)
qs_sold = ctk.CTkEntry(row2, width=100)
qs_sold.pack(side="left", padx=4)

button_row = ctk.CTkFrame(quickf, fg_color="transparent")
button_row.pack(anchor="center")

def get_treeview_row_height(tree):
    tree.insert("", "end", iid="temp", values=[""] * len(tree["columns"]))
    tree.update_idletasks()
    bbox = tree.bbox("temp")
    tree.delete("temp")
    return bbox[3] if bbox else 24  # fallback to 24 if failed

def update_stock_status(event=None):
    name = qs_product.get().strip()
    cat = qs_category.get().strip()
    if not name or not cat:
        qs_stock_status_lbl.configure(text="")
        return

    c.execute("SELECT qty FROM stock WHERE product = ? AND type = ?", (name, cat))
    row = c.fetchone()
    if row:
        qty = row[0]
        qs_stock_status_lbl.configure(text=f"Stock: {qty}", text_color="#00e676")  # green
    else:
        qs_stock_status_lbl.configure(text="❌ Not in Stock", text_color="#ff5252")  # red
qs_suggestion_listbox = None 
qs_product.bind("<KeyRelease>", update_stock_status)
qs_category.bind("<<ComboboxSelected>>", update_stock_status)
update_stock_status()
def on_product_enter(event=None):
    if current_category in NON_PURCHASED_TYPES:
        qs_sold.focus()
    else:
        qs_bought.focus()

def resolve_product_enter():
    cat = qs_category.get().lower()
    if cat in NON_PURCHASED_TYPES:
        qs_sold.focus()
    else:
        qs_bought.focus()

def product_enter_event(event=None):
    global qs_suggestion_listbox
    try:
        if qs_suggestion_listbox and str(qs_suggestion_listbox) in app.children:
            if qs_suggestion_listbox.size() > 0:
                qs_suggestion_listbox.event_generate("<Return>")
                return
    except:
        pass

    # fallback: no suggestion, use default logic
    resolve_product_enter()

def on_qs_product_keyrelease(event=None):
    show_stock_suggestions(event)
    update_stock_status(event)

qs_product.bind("<KeyRelease>", on_qs_product_keyrelease)
qs_product.bind("<Return>", product_enter_event)
qs_bought.bind("<Return>", lambda e: qs_sold.focus())      # bought → sold
qs_sold.bind("<Return>", lambda e: add_quick_sale())       # sold → add

# === CATEGORY TOGGLE LOGIC
def toggle_bought_price():
    global current_category
    selected = qs_category.get().strip().lower()
    current_category = selected

    # Clear all widgets from row2
    for widget in row2.winfo_children():
        widget.pack_forget()

    # === Restore Bought Price widgets only if needed
    if selected not in NON_PURCHASED_TYPES:
        qs_bought_lbl.pack(side="left", padx=4)
        qs_bought.pack(side="left", padx=4)
    else:
        # If it's a NON_PURCHASED type and product name is empty, set it
        if not qs_product.get().strip():
            qs_product.insert(0, selected)

    # === Always pack Sold Price widgets
    ctk.CTkLabel(row2, text="Sold Price:", width=80).pack(side="left", padx=4)
    qs_sold.pack(side="left", padx=4)

# === BIND IT USING TRACE INSTEAD
def monitor_category_change():
    app.after(200, monitor_category_change)
    toggle_bought_price()

monitor_category_change()  # run loop

# === Apply logic immediately
toggle_bought_price()


# === DASHBOARD UPDATE ===
def update_dashboard():
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    start = today + " 00:00:00"
    end = today + " 23:59:59"

    # Cache results to prevent multiple queries
    c.execute("SELECT SUM(qty * bought_price) FROM stock")
    store_cash = c.fetchone()[0] or 0

    # === TODAY ===
    c.execute("SELECT SUM(sold_price) FROM quick_sales WHERE timestamp BETWEEN ? AND ?", (start, end))
    total = c.fetchone()[0] or 0

    c.execute("SELECT SUM(sold_price - bought_price) FROM quick_sales WHERE timestamp BETWEEN ? AND ?", (start, end))
    sales_profit = c.fetchone()[0] or 0

    if net_profit_var.get():
        c.execute("SELECT SUM(amount) FROM bills WHERE timestamp BETWEEN ? AND ?", (start, end))
        bills_today = c.fetchone()[0] or 0
        today_profit = sales_profit - bills_today
    else:
        today_profit = sales_profit

    today_total_lbl.configure(text=f"Total: {int(total):,}".replace(",", " ") + " DA")
    today_profit_lbl.configure(text=f"Profit: {int(today_profit):,}".replace(",", " ") + " DA")

    # === CASH ===
    cash_label.configure(text=f"💸 Current Cash: {int(get_base_cash()):,}".replace(",", " ") + " DA")
    store_cash_lbl.configure(text=f"📦 Store Cash: {int(store_cash):,}".replace(",", " ") + " DA")
    total_cash_lbl.configure(text=f"💰 Total Value: {int(get_base_cash() + store_cash):,}".replace(",", " ") + " DA")
    load_today_sales()
    
    # === MONTH ===
    m_start = now.strftime("%Y-%m-01 00:00:00")

    c.execute("SELECT SUM(sold_price) FROM quick_sales WHERE timestamp BETWEEN ? AND ?", (m_start, end))
    m_total = c.fetchone()[0] or 0

    c.execute("SELECT SUM(sold_price - bought_price) FROM quick_sales WHERE timestamp BETWEEN ? AND ?", (m_start, end))
    m_sales_profit = c.fetchone()[0] or 0

    if net_profit_var.get():
        c.execute("SELECT SUM(amount) FROM bills WHERE timestamp BETWEEN ? AND ?", (m_start, end))
        m_bills = c.fetchone()[0] or 0
        m_profit = m_sales_profit - m_bills
    else:
        m_profit = m_sales_profit

    month_total_lbl.configure(text=f"Total Revenue: {int(m_total):,}".replace(",", " ") + " DA")
    month_profit_lbl.configure(text=f"Profit: {int(m_profit):,}".replace(",", " ") + " DA")

    # === YEAR ===
    y_start = now.strftime("%Y-01-01 00:00:00")

    c.execute("SELECT SUM(sold_price) FROM quick_sales WHERE timestamp >= ?", (y_start,))
    y_total = c.fetchone()[0] or 0

    c.execute("SELECT SUM(sold_price - bought_price) FROM quick_sales WHERE timestamp >= ?", (y_start,))
    y_sales_profit = c.fetchone()[0] or 0

    if net_profit_var.get():
        c.execute("SELECT SUM(amount) FROM bills WHERE timestamp >= ?", (y_start,))
        y_bills = c.fetchone()[0] or 0
        y_profit = y_sales_profit - y_bills
    else:
        y_profit = y_sales_profit

    year_total_lbl.configure(text=f"Yearly Revenue: {int(y_total):,}".replace(",", " ") + " DA")
    year_profit_lbl.configure(text=f"Yearly Profit: {int(y_profit):,}".replace(",", " ") + " DA")

    # === OVERALL ===
    c.execute("SELECT SUM(sold_price) FROM quick_sales")
    o_total = c.fetchone()[0] or 0

    c.execute("SELECT SUM(sold_price - bought_price) FROM quick_sales")
    o_sales_profit = c.fetchone()[0] or 0

    if net_profit_var.get():
        c.execute("SELECT SUM(amount) FROM bills")
        o_bills = c.fetchone()[0] or 0
        o_profit = o_sales_profit - o_bills
    else:
        o_profit = o_sales_profit

    overall_total_lbl.configure(text=f"Overall Revenue: {int(o_total):,}".replace(",", " ") + " DA")
    overall_profit_lbl.configure(text=f"Overall Profit: {int(o_profit):,}".replace(",", " ") + " DA")

net_profit_var = ctk.BooleanVar(value=False)

ctk.CTkCheckBox(today_frame, text="Net Profit (Bills Included)",
                variable=net_profit_var,
                command=update_dashboard).pack(anchor="w", padx=15, pady=(0, 5))

# === LOAD TODAY SALES ===
def load_today_sales():
    from helpers import get_setting  # if not already imported

    # ✅ Load fresh thresholds from DB
    high_profit_threshold = int(get_setting("high_profit", DEFAULT_HIGH_PROFIT_THRESHOLD))
    low_profit_threshold = int(get_setting("low_profit", DEFAULT_LOW_PROFIT_THRESHOLD))
    
    today_sales_tree.delete(*today_sales_tree.get_children())
    today = datetime.now().strftime("%Y-%m-%d")
    start = today + " 00:00:00"
    end = today + " 23:59:59"

    # Define profit color tags
    today_sales_tree.tag_configure("high_profit", foreground="#00e676")  # green
    today_sales_tree.tag_configure("low_profit", foreground="#ff5252")   # red
    today_sales_tree.tag_configure("even", background="#2a2a2a")
    today_sales_tree.tag_configure("odd", background="#1f1f1f")

    c.execute("SELECT id, product, category, bought_price, sold_price, timestamp FROM quick_sales WHERE timestamp BETWEEN ? AND ?", (start, end))
    rows = c.fetchall()

    for i, row in enumerate(rows):
        sale_id, product, cat, bought, sold, time = row
        try:
            profit = float(sold) - float(bought)
        except ValueError:
            profit = 0

        # Choose background tag (even/odd row)
        base_tag = 'even' if i % 2 == 0 else 'odd'

        # Choose color tag based on profit
        if profit > high_profit_threshold:
            profit_tag = "high_profit"
        elif profit < low_profit_threshold:
            profit_tag = "low_profit"
        else:
            profit_tag = None

        tags = (base_tag,)
        if profit_tag:
            tags += (profit_tag,)

        today_sales_tree.insert("", "end", iid=f"sale_{sale_id}",
            values=(
                product,
                cat,
                f"{int(bought):,}".replace(",", " "),
                f"{int(sold):,}".replace(",", " "),
                f"{int(profit):,}".replace(",", " "),
                time
            ),
            tags=tags
        )

def show_add_versement_popup():
    try:
        name = qs_product.get().strip()
        cat = qs_category.get().strip()
        sold_price = int(qs_sold.get().strip())

        # Fetch bought price from stock
        c.execute("SELECT id, qty, bought_price FROM stock WHERE product = ? AND type = ?", (name, cat))
        row = c.fetchone()
        if not row:
            messagebox.showerror("Missing", f"'{name}' not found in stock.")
            return

        stock_id, qty, bought_price = row
        if qty <= 0:
            messagebox.showwarning("Stock", f"⚠ No stock left for {name}")
            return

        # === Versement Popup ===
        popup = ctk.CTkToplevel()
        popup.title("Add Versement")
        popup.geometry("420x370")
        popup.grab_set()

        ctk.CTkLabel(popup, text="Add Versement Entry", font=("Arial", 17, "bold")).pack(pady=10)

        form = ctk.CTkFrame(popup, fg_color="transparent")
        form.pack(pady=5, padx=20, fill="x")

        fields = {}
        labels = ["Name", "Phone", "Amount Versed", "Due Date"]
        for i, label in enumerate(labels):
            ctk.CTkLabel(form, text=label + ":", anchor="e", width=100).grid(row=i, column=0, padx=5, pady=6)
            if label == "Due Date":
                date_frame = ctk.CTkFrame(form, fg_color="transparent")
                date_frame.grid(row=i, column=1, padx=5, pady=6, sticky="w")
                picker = create_ctk_date_picker(date_frame, default=datetime.now().strftime("%Y-%m-%d"))
                picker.pack()
                fields["due"] = picker
            else:
                entry = ctk.CTkEntry(form, width=250)
                entry.grid(row=i, column=1, padx=5, pady=6, sticky="w")
                fields[label.lower().replace(" ", "_")] = entry

        def confirm_versement():
            try:
                client_name = fields["name"].get().strip()
                client_phone = fields["phone"].get().strip()
                amount_versed = int(fields["amount_versed"].get().strip())
                due_date = fields["due"].get_date()

                if not client_name:
                    messagebox.showwarning("Missing", "Name is required.")
                    return

                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                # Insert into versement table
                c.execute("""
                    INSERT INTO versement 
                    (timestamp, name, amount, reason, phone, payment_time, product, category, total_price, bought_price)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (now, client_name, amount_versed, name, client_phone, due_date, name, cat, sold_price, bought_price))

                # Deduct stock by 1
                c.execute("UPDATE stock SET qty = qty - 1 WHERE id = ?", (stock_id,))

                # Add money to base cash
                c.execute("UPDATE base_cash SET amount = amount + ?", (amount_versed,))

                conn.commit()
                popup.destroy()
                update_dashboard()
                load_stock_table()
                messagebox.showinfo("Saved", f"Versement added for {client_name}.")

            except Exception as e:
                messagebox.showerror("Error", f"Failed to save versement:\n{e}")

        # Confirm Button
        ctk.CTkButton(popup, text="💾 Confirm Versement", command=confirm_versement,
                      fg_color="#FF9100", hover_color="#F57C00").pack(pady=15)

    except Exception as e:
        messagebox.showerror("Error", f"Versement setup failed:\n{e}")

def show_credit_sale_popup():
    try:
        product = qs_product.get().strip()
        category = qs_category.get().strip()
        bought = qs_bought.get().strip()
        sold_price = int(qs_sold.get())

        if not product or not category or not sold_price or not bought:
            messagebox.showerror("Missing Info", "Please fill in product and price fields first.")
            return
    except:
        messagebox.showerror("Invalid Input", "Sold price must be a valid number.")
        return

    popup = ctk.CTkToplevel()
    popup.title("Add Credit Sale")
    popup.geometry("380x340")
    popup.grab_set()

    ctk.CTkLabel(popup, text="💳 Add Credit Info", font=("Arial", 16, "bold")).pack(pady=10)

    form = ctk.CTkFrame(popup, fg_color="transparent")
    form.pack(pady=10, padx=20, fill="x")

    # === Form Fields ===
    ctk.CTkLabel(form, text="Client Name:").grid(row=0, column=0, sticky="e", pady=5)
    client_name = ctk.CTkEntry(form)
    client_name.grid(row=0, column=1, pady=5)

    ctk.CTkLabel(form, text="Phone Number:").grid(row=1, column=0, sticky="e", pady=5)
    client_phone = ctk.CTkEntry(form)
    client_phone.grid(row=1, column=1, pady=5)

    ctk.CTkLabel(form, text="Amount Paid (DA):").grid(row=2, column=0, sticky="e", pady=5)
    amount_paid = ctk.CTkEntry(form)
    amount_paid.grid(row=2, column=1, pady=5)

    # === Due Date ===
    ctk.CTkLabel(form, text="Due Date:").grid(row=3, column=0, sticky="e", pady=5)
    due_frame = ctk.CTkFrame(form)
    due_frame.grid(row=3, column=1, padx=5, pady=5, sticky="w")

    from datetime import datetime
    today = datetime.today().strftime("%Y-%m-%d")
    credit_due2 = create_ctk_date_picker(due_frame, default=today)
    credit_due2.pack()

    # === Confirm Action ===
    def confirm_credit_sale():
        try:
            name = client_name.get().strip()
            phone = client_phone.get().strip()
            paid = int(amount_paid.get().strip())
            duedate = credit_due2.get_date()  # ✅ Get proper date

            if not name or paid < 0:
                raise ValueError("Invalid client info.")

            remaining = sold_price - paid
            if remaining < 0:
                messagebox.showerror("Overpaid", "Paid amount exceeds sold price.")
                return

            # 1. Insert sale like normal
            add_quick_sale()

            # 2. Insert credit
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            c.execute(
                "INSERT INTO credit (timestamp, name, amount, reason, phone, payment_time) VALUES (?, ?, ?, ?, ?, ?)",
                (now, name, remaining, product, phone, duedate)
            )
            c.execute("UPDATE base_cash SET amount = amount - ?", (remaining,))
            conn.commit()
            popup.destroy()
            load_credit_entries()
            update_dashboard()
            messagebox.showinfo("✅ Credit Sale", "Credit entry added successfully.")

        except Exception as e:
            messagebox.showerror("Error", f"Could not save credit.\n{e}")

    # === Buttons ===
    btns = ctk.CTkFrame(popup, fg_color="transparent")
    btns.pack(pady=10)

    ctk.CTkButton(btns, text="💾 Confirm", command=confirm_credit_sale,
                  fg_color="#43a047", hover_color="#2e7d32", width=100).pack(side="left", padx=10)
    ctk.CTkButton(btns, text="Cancel", command=popup.destroy,
                  fg_color="#757575", hover_color="#424242", width=100).pack(side="left", padx=10)


def add_quick_sale():
    try:
        name = qs_product.get()
        cat = qs_category.get()
        sold = int(qs_sold.get())
        bought = 0 if cat.lower() in NON_PURCHASED_TYPES else int(qs_bought.get())

        if sold < bought:
            confirm = messagebox.askyesno("Confirm Sale",
            f"⚠ The sold price ({int(sold)} DA) is lower than the bought price ({int(bought)} DA).\n"
            "ak sur? mela faha khsara!!")
            if not confirm:
                return

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute("INSERT INTO quick_sales (timestamp, product, category, bought_price, sold_price) VALUES (?, ?, ?, ?, ?)",
                  (now, name, cat, bought, sold))
        c.execute("UPDATE base_cash SET amount = amount + ?", (sold,))

        # Try updating stock - get specific item with quantity > 0
        c.execute("SELECT id, qty FROM stock WHERE product = ? AND type = ? AND qty > 0 LIMIT 1", (name, cat))
        existing = c.fetchone()
        if existing:
            stock_id, qty = existing
            if qty > 0:
                new_qty = max(0, qty - 1)
                c.execute("UPDATE stock SET qty = ? WHERE id = ?", (new_qty, stock_id))
            else:
                messagebox.showwarning("⚠ Stock", f"Product exists in stock but is out of quantity.")
        # else: it's a manual product, no stock action

        conn.commit()

        qs_product.delete(0, "end")
        qs_sold.delete(0, "end")
        qs_category.configure(state="normal")
        qs_bought.configure(state="normal", fg_color="#343638", text_color="white")
        qs_bought.delete(0, "end")
        update_stock_status()
        load_stock_table()
        update_dashboard()
        messagebox.showinfo("✅ Success", "Sale added successfully.")

    except Exception as e:
        messagebox.showerror("Error", f"Check input values.\n{e}")


# === DELETE SALE ===
def delete_selected_sale():
    selected = today_sales_tree.selection()
    if not selected:
        messagebox.showwarning("No selection", "Please select a sale to delete.")
        return

    sale_id = selected[0]
    # Extract ID from prefixed iid
    if sale_id.startswith("sale_"):
        sale_id = sale_id.split("_")[1]

    # Get product and category BEFORE deletion
    c.execute("SELECT product, category, sold_price FROM quick_sales WHERE id = ?", (sale_id,))
    row = c.fetchone()
    if row:
        name, cat, sold_price = row

        # Subtract from cash
        c.execute("UPDATE base_cash SET amount = amount - ?", (sold_price,))
        
        # Restore stock if exists
        c.execute("SELECT id FROM stock WHERE product = ? AND type = ?", (name, cat))
        stock_row = c.fetchone()
        if stock_row:
            stock_id = stock_row[0]
            c.execute("UPDATE stock SET qty = qty + 1 WHERE id = ?", (stock_id,))

    # Now delete the sale
    c.execute("DELETE FROM quick_sales WHERE id = ?", (sale_id,))
    conn.commit()

    update_dashboard()
    load_stock_table()

# === MODIFY SALE ===
def modify_selected_sale():
    # Determine which tree to use based on current page
    if pages["dashboard"].winfo_ismapped():
        # Dashboard page - use today_sales_tree
        selected = today_sales_tree.selection()
        if not selected:
            messagebox.showwarning("No selection", "Please select a sale to modify.")
            return
        
        sale_id = selected[0]
        if sale_id.startswith("sale_"):
            sale_id = sale_id.split("_")[1]
        
        # Fetch sale details from database
        c.execute("SELECT timestamp, product, category, bought_price, sold_price FROM quick_sales WHERE id = ?", (sale_id,))
        row = c.fetchone()
        if not row:
            return
        t, product, category, bought, sold = row
        entry_type = "Sale"
        price = str(sold)
        info = ""
    else:
        # History page - use detail_tree
        selected = detail_tree.focus()
        if not selected:
            return
        values = detail_tree.item(selected, "values")
        t, product, entry_type, price, info = values
        
        if entry_type != "Sale":
            messagebox.showwarning("Invalid", "Only sales can be modified from here.")
            return
        
        # Get sale ID
        if '_' in selected:
            _, sale_id = selected.split('_', 1)
        else:
            sale_id = selected
        
        # Fetch bought price from database
        c.execute("SELECT bought_price FROM quick_sales WHERE id = ?", (sale_id,))
        bought = c.fetchone()[0]

    # Create popup window
    popup = ctk.CTkToplevel()
    popup.title("Modify Sale")
    popup.geometry("300x250")  # Reduced height since we're removing a field
    popup.grab_set()

    ctk.CTkLabel(popup, text="Product").pack(pady=(10, 0))
    product_entry = ctk.CTkEntry(popup)
    product_entry.insert(0, product)
    product_entry.pack()

    ctk.CTkLabel(popup, text="Sold Price").pack(pady=(10, 0))
    sold_entry = ctk.CTkEntry(popup)
    sold_entry.insert(0, str(int(float(price.replace("-", "")))))  # Ensure integer display
    sold_entry.pack()

    # Display bought price as read-only information
    ctk.CTkLabel(popup, text="Original Bought Price").pack(pady=(10, 0))
    bought_display = ctk.CTkLabel(popup, text=str(bought))
    bought_display.pack()

    def save_mod():
        try:
            new_product = product_entry.get().strip()
            new_sold = int(sold_entry.get().strip())

            # Fetch original sale details for restoration
            c.execute("SELECT product, category, sold_price FROM quick_sales WHERE id = ?", (sale_id,))
            original_product, original_category, original_sold = c.fetchone()

            # Restore stock for original product
            c.execute("SELECT id FROM stock WHERE product = ? AND type = ?", (original_product, original_category))
            stock_row = c.fetchone()
            if stock_row:
                c.execute("UPDATE stock SET qty = qty + 1 WHERE id = ?", (stock_row[0],))

            # Subtract original sale amount from cash
            c.execute("UPDATE base_cash SET amount = amount - ?", (original_sold,))

            # Delete original sale
            c.execute("DELETE FROM quick_sales WHERE id = ?", (sale_id,))

            # Insert new sale (keeping original bought price)
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            c.execute("INSERT INTO quick_sales (timestamp, product, category, sold_price, bought_price) VALUES (?, ?, ?, ?, ?)",
                      (now, new_product, original_category, new_sold, bought))
            
            # Add new sale amount to cash
            c.execute("UPDATE base_cash SET amount = amount + ?", (new_sold,))
            
            # Update stock for new product
            c.execute("SELECT id, qty FROM stock WHERE product = ? AND type = ?", (new_product, original_category))
            new_stock_row = c.fetchone()
            
            if new_stock_row:
                new_stock_id, new_qty = new_stock_row
            
                if new_qty <= 0:
                    messagebox.showwarning("⚠ Stock", f"No stock left for product '{new_product}'. Modification completed, but stock is 0.")
                else:
                    # Deduct stock
                    c.execute("UPDATE stock SET qty = ? WHERE id = ?", (new_qty - 1, new_stock_id))
            else:
                print(f"⚠ Stock not found for '{new_product}' ({original_category}) — skipping stock deduction.")

            conn.commit()
            popup.destroy()
            
            # Refresh UI
            if pages["dashboard"].winfo_ismapped():
                load_today_sales()
            else:
                load_detail_history()
                
            update_dashboard()
            load_stock_table()
            messagebox.showinfo("Success", "Sale modified successfully.")
            
        except ValueError:
            messagebox.showerror("Error", "Sold price must be a whole number")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to modify sale:\n{str(e)}")

    ctk.CTkButton(popup, text="Save", command=save_mod).pack(pady=15)

delete_btn = ctk.CTkButton(action_frame, text="🗑 Delete Selected",
    command=delete_selected_sale,
    text_color="white", fg_color="#e53935", hover_color="#c62828", corner_radius=8)
delete_btn.pack(side="left", padx=10)

modify_btn = ctk.CTkButton(action_frame, text="⚙ Modify Selected",
    command=modify_selected_sale,
    text_color="white", fg_color="#1e88e5", hover_color="#1565c0", corner_radius=8)
modify_btn.pack(side="left", padx=10)

add_btn = ctk.CTkButton(button_row, text="➕ Add Sale", command=add_quick_sale,
                        text_color="white", fg_color="#43a047", hover_color="#388e3c", corner_radius=8)
add_btn.pack(side="left", padx=10, pady=10)

addc_btn = ctk.CTkButton(button_row, text="💳 Add Credit", command=show_credit_sale_popup,
                         text_color="white", fg_color="#E0A800", hover_color="#C79100", corner_radius=8)
addc_btn.pack(side="left", padx=10, pady=10)

addv_btn = ctk.CTkButton(button_row, text="📥 Add Versement", command=show_add_versement_popup,
                         text_color="white", fg_color="#2196F3", hover_color="#1976D2", corner_radius=8)
addv_btn.pack(side="left", padx=10, pady=10)
 
# === SECTION: THIS MONTH ===
month_frame = ctk.CTkFrame(right_col, corner_radius=10)
month_frame.pack(fill="x", padx=10, pady=(0, 10))

ctk.CTkLabel(month_frame, text="📆 This Month", font=title_font).pack(pady=(10, 5))

month_total_lbl = ctk.CTkLabel(month_frame, text="Total Revenue: 0.00 DA",
                               font=info_font)  # green
month_total_lbl.pack(anchor="w", padx=15, pady=2)

month_profit_lbl = ctk.CTkLabel(month_frame, text="Profit: 0.00 DA",
                                font=info_font, text_color="#00e676")  # green
month_profit_lbl.pack(anchor="w", padx=15, pady=2)

# === SECTION: YEARLY + OVERALL ===
year_frame = ctk.CTkFrame(right_col, corner_radius=10)
year_frame.pack(fill="x", padx=10, pady=(0, 10))

ctk.CTkLabel(year_frame, text="📈 Yearly & Overall", font=title_font).pack(pady=(10, 5))

year_total_lbl = ctk.CTkLabel(year_frame, text="Yearly Revenue: 0.00 DA",
                              font=info_font)
year_total_lbl.pack(anchor="w", padx=15, pady=2)

year_profit_lbl = ctk.CTkLabel(year_frame, text="Yearly Profit: 0.00 DA",
                               font=info_font, text_color="#00e676")
year_profit_lbl.pack(anchor="w", padx=15, pady=2)

overall_total_lbl = ctk.CTkLabel(year_frame, text="Overall Revenue: 0.00 DA",
                                 font=info_font)  # red
overall_total_lbl.pack(anchor="w", padx=15, pady=2)

overall_profit_lbl = ctk.CTkLabel(year_frame, text="Overall Profit: 0.00 DA",
                                  font=info_font, text_color="#00e676")  # red
overall_profit_lbl.pack(anchor="w", padx=15, pady=2)

# === SECTION: CASH IN STORE ===
cash_frame = ctk.CTkFrame(right_col, corner_radius=10)
cash_frame.pack(fill="x", padx=10, pady=(0, 10))

ctk.CTkLabel(cash_frame, text="💵 Cash in Store", font=title_font).pack(pady=(10, 5))

cash_label = ctk.CTkLabel(cash_frame, text="Current Cash: 0.00 DA",
                          font=info_font, text_color="#ef5350")  # red
cash_label.pack(anchor="w", padx=15, pady=2)
store_cash_lbl = ctk.CTkLabel(cash_frame, text="📦 Store Cash: 0.00 DA",
                              font=info_font, text_color="#FFB300")  # amber color
store_cash_lbl.pack(anchor="w", padx=15, pady=2)

total_cash_lbl = ctk.CTkLabel(cash_frame, text="💰 Total Value: 0 DA",
                             font=info_font, text_color="#FFD600")  # yellow
total_cash_lbl.pack(anchor="w", padx=15, pady=2)

# === HISTORY PAGE ===
history = pages["history"]

ctk.CTkLabel(history, text="📅 History", font=title_font).pack(pady=20)

# === MODE TOGGLE FRAME ===
mode_var = ctk.StringVar(value="general")
mode_frame = ctk.CTkFrame(history, fg_color="transparent")
mode_frame.pack(pady=5)

ctk.CTkRadioButton(mode_frame, text="General History", variable=mode_var, value="general",
                   command=lambda: switch_history_mode()).pack(side="left", padx=10)
ctk.CTkRadioButton(mode_frame, text="Detail History", variable=mode_var, value="detail",
                   command=lambda: switch_history_mode()).pack(side="left", padx=10)

# === SWITCHABLE CONTENT FRAME ===
history_container = ctk.CTkFrame(history, fg_color="transparent")
history_container.pack(fill="both", expand=True)

# === GENERAL HISTORY PAGE ===
general_frame = ctk.CTkFrame(history_container, fg_color="transparent")
highlight_enabled = ctk.BooleanVar(value=False)
group_mode = ctk.StringVar(value="day")  # default is 'day'

group_filter = ctk.CTkFrame(general_frame, fg_color="transparent")
group_filter.pack(pady=5)

ctk.CTkLabel(group_filter, text="Group By:").pack(side="left", padx=5)

group_menu = ctk.CTkComboBox(group_filter, variable=group_mode,
                             values=["day", "month", "year"], width=100)
group_menu.pack(side="left", padx=5)

highlight_checkbox = ctk.CTkCheckBox(
    group_filter,
    text="Enable Highlights",
    variable=highlight_enabled,
    onvalue=True,
    offvalue=False,
    command=lambda: load_general_history(0)
)
highlight_checkbox.pack(side="left", padx=10)

def update_date_picker(picker_frame, date_str):
    """Update the date picker with a new date"""
    # Destroy existing widgets in the picker frame
    for widget in picker_frame.winfo_children():
        widget.destroy()
    
    # Create new date picker with the specified date
    new_picker = create_ctk_date_picker(picker_frame, default=date_str)
    new_picker.pack(side="left")
    
    # Return the get_date function for future use
    return new_picker

# Force reload when group changes
def on_group_change(event=None):
    load_general_history(0)
def on_general_history_double_click(event):
    # Get the clicked item
    item = general_tree.identify_row(event.y)
    if not item:
        return
    
    # Get the date from the clicked row
    values = general_tree.item(item, 'values')
    if not values or len(values) < 1:
        return
    
    date_str = values[0]  # First column is the date
    
    # Switch to detail history view
    mode_var.set("detail")
    switch_history_mode()
    
    # Set the date range based on current grouping
    group_by = group_mode.get()
    
    try:
        if group_by == "day":
            # For day view, show that specific day
            start_date = end_date = date_str
        elif group_by == "month":
            # For month view, show the entire month
            year, month = date_str.split('-')
            last_day = str(monthrange(int(year), int(month))[1])
            start_date = f"{year}-{month}-01"
            end_date = f"{year}-{month}-{last_day}"
        elif group_by == "year":
            # For year view, show the entire year
            year = date_str
            start_date = f"{year}-01-01"
            end_date = f"{year}-12-31"
        
        # Update the date pickers without recreating them
        def update_picker(picker, date):
            y, m, d = date.split('-')
            for child in picker.winfo_children():
                if isinstance(child, ctk.CTkComboBox):
                    if child._values == [str(yr) for yr in range(min_year, max_year + 1)]:  # Year box
                        child.set(y)
                    elif child._values == [f"{i:02}" for i in range(1, 13)]:  # Month box
                        child.set(m)
                    else:  # Day box
                        child.set(d)
                        # Trigger day update
                        y_int = int(y)
                        m_int = int(m)
                        days = [f"{i:02}" for i in range(1, monthrange(y_int, m_int)[1] + 1)]
                        child.configure(values=days)
        
        # Get year range from your existing function
        min_year, max_year = get_history_year_range()
        
        # Update both pickers
        update_picker(start_picker, start_date)
        update_picker(end_picker, end_date)
        
    except Exception as e:
        messagebox.showerror("Error", f"Failed to parse date: {e}")
        return
    
    # Force reload of detail history
    global detail_page
    detail_page = 0
    load_detail_history(0)

group_menu.bind("<<ComboboxSelected>>", on_group_change)
group_menu.set("day")

# === TREEVIEW FOR GENERAL STATS ===
general_tree_container = ctk.CTkFrame(general_frame)
general_tree_container.pack(padx=10, pady=10, fill="both", expand=True)

general_tree = ttk.Treeview(general_tree_container,
                            columns=("date", "revenue", "profit", "purchases", "bills"),
                            show="headings", height=12)
general_tree.heading("date", text="Date")
general_tree.heading("revenue", text="Total Revenue (DA)")
general_tree.heading("profit", text="Profit (DA)")
general_tree.heading("purchases", text="Total Purchases (DA)")
general_tree.heading("bills", text="Total Bills (DA)")
general_tree.column("date", width=120)
general_tree.column("revenue", width=150)
general_tree.column("profit", width=150)
general_tree.column("purchases", width=150)
general_tree.column("bills", width=150)
general_tree.pack(fill="both", expand=True)
general_tree.tag_configure("above_avg", foreground="#00e676")  # Green
general_tree.tag_configure("below_avg", foreground="#ff5252")  # Red
general_tree.tag_configure('even', background="#2a2a2a",foreground="white")
general_tree.tag_configure('odd', background="#1f1f1f",foreground="white")
# === PAGINATION ===
# === PAGINATION CONTROLS ===
general_nav = ctk.CTkFrame(general_frame, fg_color="transparent")
general_nav.pack(pady=5)

general_page = 0  # make sure it's declared globally
general_page_lbl = ctk.CTkLabel(general_nav, text="Page 1")
general_page_lbl.pack(side="left", padx=10)

ctk.CTkButton(general_nav, text="⬅ Prev", command=lambda: load_general_history(-1),
              fg_color="#37474f", hover_color="#263238", text_color="white").pack(side="left", padx=5)

ctk.CTkButton(general_nav, text="Next ➡", command=lambda: load_general_history(1),
              fg_color="#37474f", hover_color="#263238", text_color="white").pack(side="left", padx=5)

general_tree.bind("<Double-1>", on_general_history_double_click)

def switch_history_mode():
    for widget in history_container.winfo_children():
        widget.pack_forget()

    if mode_var.get() == "general":
        general_frame.pack(fill="both", expand=True)
        load_general_history(0)
    else:
        detail_frame.pack(fill="both", expand=True)

def show_history_page():
    show_page("history")
    switch_history_mode()

def load_general_history(page_delta=0):
    global general_page

    # Calculate rows per page based on container height
    available_height = general_tree_container.winfo_height() or 400
    estimated_row_height = 28
    rows_per_page = max(1, available_height // estimated_row_height)

    temp_page = general_page + page_delta
    if temp_page < 0:
        return

    group_by = group_mode.get()
    group_expr = {
        "day": "DATE(timestamp)",
        "month": "strftime('%Y-%m', timestamp)",
        "year": "strftime('%Y', timestamp)"
    }.get(group_by, "DATE(timestamp)")

    # Build the base query
    base_query = f"""
        SELECT
            d.grp,
            COALESCE(qs.sales_total, 0),
            COALESCE(qs.sales_profit, 0) - COALESCE(bl.bills_total, 0),
            COALESCE(pur.purchase_total, 0),
            COALESCE(bl.bills_total, 0)
        FROM (
            SELECT DISTINCT {group_expr} AS grp FROM quick_sales
            UNION
            SELECT DISTINCT {group_expr} FROM bills
            UNION
            SELECT DISTINCT {group_expr} FROM purchases
        ) d
        LEFT JOIN (
            SELECT {group_expr} AS grp, SUM(sold_price) AS sales_total,
                   SUM(sold_price - bought_price) AS sales_profit
            FROM quick_sales
            GROUP BY grp
        ) qs ON d.grp = qs.grp
        LEFT JOIN (
            SELECT {group_expr} AS grp, SUM(amount) AS bills_total
            FROM bills
            GROUP BY grp
        ) bl ON d.grp = bl.grp
        LEFT JOIN (
            SELECT {group_expr} AS grp, SUM(cost * quantity) AS purchase_total
            FROM purchases
            GROUP BY grp
        ) pur ON d.grp = pur.grp
        ORDER BY d.grp DESC
    """
    
    # Execute base_query to get all rows
    c.execute(base_query)
    all_rows = c.fetchall()
    all_profits = [float(r[2]) for r in all_rows if r[2] is not None]
    average_profit = sum(all_profits) / len(all_profits) if all_profits else 0
    
    # Calculate total pages
    total_pages = (len(all_rows) + rows_per_page - 1) // rows_per_page
    if total_pages == 0:
        total_pages = 1
        
    # Only update page if results exist
    if page_delta > 0 and temp_page >= total_pages:
        return
    if not all_rows and temp_page != 0:
        return

    general_page = temp_page
    
    # Get the current page data
    start_idx = general_page * rows_per_page
    end_idx = start_idx + rows_per_page
    page_rows = all_rows[start_idx:end_idx]

    general_tree.delete(*general_tree.get_children())

    for i, row in enumerate(page_rows):
        tag = 'even' if i % 2 == 0 else 'odd'
        profit = float(row[2])
    
        # Default tags
        tags = (tag,)
    
        if highlight_enabled.get():  # ✅ Only apply highlights if checkbox is ON
            threshold_percent = 0.10
            lower_bound = average_profit * (1 - threshold_percent)
            upper_bound = average_profit * (1 + threshold_percent)
            lower_bound, upper_bound = min(lower_bound, upper_bound), max(lower_bound, upper_bound)
    
            if profit > upper_bound:
                tags += ("above_avg",)
            elif profit < lower_bound:
                tags += ("below_avg",)
    
        general_tree.insert("", "end", values=(
            row[0],
            f"{int(row[1]):,}".replace(",", " "),
            f"{int(row[2]):,}".replace(",", " "),
            f"{int(row[3]):,}".replace(",", " "),
            f"{int(row[4]):,}".replace(",", " ")
        ), tags=tags)


    # Update page label to show "X of Y"
    general_page_lbl.configure(text=f"Page {general_page + 1} of {total_pages}")

def on_general_resize(event):
    load_general_history(0)

general_tree_container.bind("<Configure>", on_general_resize)

def watch_group_mode():
    current = group_mode.get()
    if not hasattr(watch_group_mode, "last") or watch_group_mode.last != current:
        watch_group_mode.last = current
        load_general_history(0)
    group_mode.trace_add("write", lambda *_: load_general_history(0))

watch_group_mode()

default_start = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
default_end = datetime.now().strftime("%Y-%m-%d")

# === DETAIL HISTORY PLACEHOLDER ===
detail_frame = ctk.CTkFrame(history_container, fg_color="transparent")

# === DETAIL HISTORY FILTER BAR ===
filter_bar = ctk.CTkFrame(detail_frame, fg_color="transparent")
filter_bar.pack(pady=5)

# Checkboxes
show_sales_var = ctk.BooleanVar(value=True)
show_bills_var = ctk.BooleanVar(value=True)
show_purchases_var = ctk.BooleanVar(value=True)

ctk.CTkCheckBox(filter_bar, text="Sales", variable=show_sales_var,
                command=lambda: load_detail_history(0)).pack(side="left", padx=1)
ctk.CTkCheckBox(filter_bar, text="Bills", variable=show_bills_var,
                command=lambda: load_detail_history(0)).pack(side="left", padx=1)
ctk.CTkCheckBox(filter_bar, text="Purchases", variable=show_purchases_var,
                command=lambda: load_detail_history(0)).pack(side="left", padx=1)

import tkinter as tk 
# Date range
ctk.CTkLabel(filter_bar, text="From:").pack(side="left", padx=(20, 4))
start_picker = create_ctk_date_picker(filter_bar)
start_picker.pack(side="left", padx=5)

ctk.CTkLabel(filter_bar, text="To:").pack(side="left", padx=(10, 4))
end_picker = create_ctk_date_picker(filter_bar)
end_picker.pack(side="left", padx=5)

apply_btn = ctk.CTkButton(filter_bar, text="🔍 Apply Filter", command=lambda: load_detail_history(0),
                          fg_color="#1e88e5", hover_color="#1565c0", text_color="white")
apply_btn.pack(side="left", padx=10)


# Search by product
ctk.CTkLabel(filter_bar, text="🔍").pack(side="left", padx=(20, 4))
search_entry2 = ctk.CTkEntry(filter_bar, width=150, placeholder_text="Search product...")
search_entry2.pack(side="left")
search_entry2.bind("<KeyRelease>", lambda e: load_detail_history(0))

# Treeview placeholder
detail_tree_container = ctk.CTkFrame(detail_frame)
detail_tree_container.pack(padx=10, pady=10, fill="both", expand=True)

detail_tree = ttk.Treeview(
    detail_tree_container,
    columns=("timestamp", "product", "type", "amount", "profit", "info"),
    show="headings",
    height=15
)

detail_tree.heading("timestamp", text="Timestamp")
detail_tree.heading("product", text="Product")
detail_tree.heading("type", text="Type")
detail_tree.heading("amount", text="Amount")
detail_tree.heading("profit", text="Profit")
detail_tree.heading("info", text="Info")

detail_tree.column("timestamp", anchor="center", width=140)
detail_tree.column("product", anchor="center", width=120)
detail_tree.column("type", anchor="center", width=80)
detail_tree.column("amount", anchor="center", width=100)
detail_tree.column("profit", anchor="center", width=100)
detail_tree.column("info", anchor="w", width=300)

detail_tree.pack(fill="both", expand=True)
detail_tree.pack(fill="both", expand=True)

detail_tree.tag_configure('even', background="#2a2a2a")  # dark grey
detail_tree.tag_configure('odd', background="#1f1f1f")   # darker

app.after(200, lambda: load_detail_history(0))

def on_detail_double_click(event):
    selected = detail_tree.selection()
    if not selected:
        return

    item = detail_tree.item(selected[0])
    values = item["values"]
    if not values or len(values) < 5:
        return

    selected = detail_tree.focus()
    if not selected:
        return
    values = detail_tree.item(selected, "values")

    if len(values) < 5:
        return  # safety

    date, product, entry_type, amount_str, info = values[:5]
    
    # Extract ID from prefixed iid
    if '_' in selected:
        _, row_id = selected.split('_', 1)
        try:
            row_id = int(row_id)
        except ValueError:
            messagebox.showerror("Invalid ID", "Could not parse item ID")
            return
    else:
        row_id = selected
    
    show_edit_popup(date, product, entry_type, amount_str, info, row_id)
    
detail_tree.bind("<Double-1>", on_detail_double_click)

def show_edit_popup(date, product, entry_type, amount_str, info, row_id):
    popup = ctk.CTkToplevel()
    popup.title(f"Edit {entry_type}")
    popup.geometry("400x300")
    popup.grab_set()

    ctk.CTkLabel(popup, text=f"{entry_type} on {date}", font=info_font).pack(pady=10)

    # Create product entry
    ctk.CTkLabel(popup, text="Product:").pack(pady=(10, 0))
    product_entry = ctk.CTkEntry(popup, width=250)
    product_entry.insert(0, product)
    product_entry.pack()

    # Create amount entry
    ctk.CTkLabel(popup, text="Amount (DA):").pack(pady=(10, 0))
    amount_entry = ctk.CTkEntry(popup, width=250)
    numeric_part = ''.join(c for c in amount_str if c.isdigit() or c in "-.")
    amount_entry.insert(0, numeric_part)
    amount_entry.pack()

    # Create extra info field for Bill and Purchase
    extra_entry = None
    if entry_type in ["Bill", "Purchase"]:
        label_text = "Notes" if entry_type == "Bill" else "Seller"
        ctk.CTkLabel(popup, text=label_text).pack(pady=(10, 0))
        extra_entry = ctk.CTkEntry(popup, width=250)
        extra_entry.insert(0, info)
        extra_entry.pack()
        
    def delete_entry():
        confirm = messagebox.askyesno("Confirm", f"Delete this {entry_type.lower()}?")
        if not confirm:
            return

        if entry_type == "Sale":
            c.execute("SELECT sold_price FROM quick_sales WHERE id = ?", (row_id,))
            row = c.fetchone()
            if row:
                c.execute("UPDATE base_cash SET amount = amount - ?", (row[0],))
                restore_stock_from_sale_by_id(row_id)
                c.execute("DELETE FROM quick_sales WHERE id = ?", (row_id,))

        elif entry_type == "Bill":
            c.execute("SELECT amount FROM bills WHERE id = ?", (row_id,))
            row = c.fetchone()
            if row:
                c.execute("UPDATE base_cash SET amount = amount + ?", (row[0],))
                c.execute("DELETE FROM bills WHERE id = ?", (row_id,))

        elif entry_type == "Purchase":
            c.execute("SELECT product, category, quantity, cost FROM purchases WHERE id = ?", (row_id,))
            row = c.fetchone()
            if row:
                product, category, quantity, cost = row
                total_cost = quantity * cost

                # Reduce stock quantity
                c.execute("SELECT id, qty FROM stock WHERE product = ? AND type = ?", (product, category))
                stock_row = c.fetchone()
                if stock_row:
                    stock_id, current_qty = stock_row
                    new_qty = max(0, current_qty - quantity)  # Prevent negative quantities
                    c.execute("UPDATE stock SET qty = ? WHERE id = ?", (new_qty, stock_id))

                # Return money to cash
                c.execute("UPDATE base_cash SET amount = amount + ?", (total_cost,))
                c.execute("DELETE FROM purchases WHERE id = ?", (row_id,))

        conn.commit()
        update_dashboard()
        popup.destroy()
        load_detail_history(0)
        load_stock_table()

    def save_changes():
        new_product = product_entry.get().strip()
        new_amount = amount_entry.get().strip()
        new_info = extra_entry.get().strip() if extra_entry else ""

        try:
            new_amount = int(new_amount)
        except ValueError:
            messagebox.showerror("Error", "Invalid amount")
            return

        if entry_type == "Sale":
            c.execute("SELECT sold_price FROM quick_sales WHERE id = ?", (row_id,))
            row = c.fetchone()
            if row:
                delta = new_amount - row[0]
                c.execute("UPDATE base_cash SET amount = amount + ?", (delta,))
                c.execute("UPDATE quick_sales SET product = ?, sold_price = ? WHERE id = ?",
                          (new_product, new_amount, row_id))

        elif entry_type == "Bill":
            c.execute("SELECT amount FROM bills WHERE id = ?", (row_id,))
            row = c.fetchone()
            if row:
                delta = row[0] - new_amount
                c.execute("UPDATE base_cash SET amount = amount + ?", (delta,))
                c.execute("UPDATE bills SET category = ?, amount = ?, notes = ? WHERE id = ?",
                          (new_product, new_amount, new_info, row_id))

        elif entry_type == "Purchase":
            c.execute("SELECT quantity, cost FROM purchases WHERE id = ?", (row_id,))
            row = c.fetchone()
            if row:
                old_quantity, old_cost = row
                old_total = old_quantity * old_cost
                new_total = old_quantity * new_amount  # Use new_amount as the new cost per item
                delta = old_total - new_total
                c.execute("UPDATE base_cash SET amount = amount + ?", (delta,))
                c.execute("UPDATE purchases SET product = ?, cost = ?, seller = ? WHERE id = ?",
                          (new_product, new_amount, new_info, row_id))

                # CRITICAL: Update stock to reflect the new cost
                c.execute("SELECT id, qty FROM stock WHERE product = ? AND type = ?", (new_product, "Purchase"))
                stock_row = c.fetchone()
                
                if stock_row:
                    stock_id, stock_qty = stock_row
                
                    # Only allow price update if quantity matches exactly (means this is the only batch)
                    if stock_qty == old_quantity:
                        c.execute("UPDATE stock SET bought_price = ? WHERE id = ?", (new_amount, stock_id))
                    else:
                        messagebox.showinfo("Info", "Stock has mixed purchases. Bought price not changed to avoid error.")

        conn.commit()
        popup.destroy()
        update_dashboard()
        load_detail_history(0)
    btn_frame = ctk.CTkFrame(popup, fg_color="transparent")
    btn_frame.pack(pady=10)

    # Create Save and Delete buttons
    save_btn = ctk.CTkButton(btn_frame, text="💾 Save", command=save_changes,
                             fg_color="#43a047", hover_color="#2e7d32")
    save_btn.pack(side="left", padx=10)

    delete_btn = ctk.CTkButton(btn_frame, text="🗑 Delete", command=delete_entry,
                               fg_color="#e53935", hover_color="#b71c1c")
    delete_btn.pack(side="left", padx=10)

    # Disable Save for Purchase or Bill
    if entry_type.lower() in ("purchase", "bill"):
        save_btn.configure(state="disabled", text="Editing Disabled",fg_color="transparent")

# === Pagination for Detail History ===
detail_nav = ctk.CTkFrame(detail_frame, fg_color="transparent")
detail_nav.pack(pady=5)

detail_page = 0
detail_page_lbl = ctk.CTkLabel(detail_nav, text="Page 1")
detail_page_lbl.pack(side="left", padx=10)

ctk.CTkButton(detail_nav, text="⬅ Prev", command=lambda: load_detail_history(-1),
              fg_color="#37474f", hover_color="#263238", text_color="white").pack(side="left", padx=5)
ctk.CTkButton(detail_nav, text="Next ➡", command=lambda: load_detail_history(1),
              fg_color="#37474f", hover_color="#263238", text_color="white").pack(side="left", padx=5)

def load_detail_history(page_delta=0):
    global detail_page
    entries = []

    search_term = search_entry2.get().lower().strip()
    start_date = start_picker.get_date()
    end_date = end_picker.get_date()

    # Clear existing items first
    for item in detail_tree.get_children():
        detail_tree.delete(item)

    if show_sales_var.get():
        c.execute("SELECT id, timestamp, product, sold_price, bought_price FROM quick_sales")
        for sid, t, product, sold, bought in c.fetchall():
            if search_term and search_term not in product.lower():
                continue
            if (start_date and t < start_date) or (end_date and t > end_date + " 23:59:59"):
                continue
            try:
                profit = float(sold) - float(bought)
            except ValueError:
                profit = 0
            entries.append((
                "sale",
                sid,
                t,
                product,
                "Sale",
                f"{int(sold):,}".replace(",", " "),
                f"{int(profit):,}".replace(",", " "),
                ""  # Empty info field
            ))

    if show_purchases_var.get():
        c.execute("SELECT id, timestamp, product, category, quantity, cost, imei, seller FROM purchases")
        for pid, t, product, cat, qty, cost, imei, seller in c.fetchall():
            if search_term and search_term not in product.lower():
                continue
            if (start_date and t < start_date) or (end_date and t > end_date + " 23:59:59"):
                continue
            total_cost = qty * cost
            info = f"Qty: {qty} | {cat}"
            if cat.lower() == "phone":
                info = f"Seller: {seller or 'N/A'} | Phone number: {imei or 'N/A'}"
            entries.append((
                "purchase",
                pid,
                t,
                product,
                "Purchase",
                f"-{int(total_cost):,}".replace(",", " "),
                "-",
                info
            ))


    if show_bills_var.get():
        c.execute("SELECT id, timestamp, category, amount, notes FROM bills")
        for bid, t, cat, amount, note in c.fetchall():
            if search_term and (search_term not in (cat or "").lower()) and (search_term not in (note or "").lower()):
                continue
            if (start_date and t < start_date) or (end_date and t > end_date + " 23:59:59"):
                continue
            product = cat
            info = f"Notes: {note}" if note else ""
            entries.append((
                "bill",
                bid,
                t,
                product,
                "Bill",
                f"-{int(amount):,}".replace(",", " "),
                "-",
                info
            ))

    entries.sort(key=lambda x: x[2], reverse=True)  # Sort by timestamp

    available_height = detail_tree_container.winfo_height()
    if available_height < 100:
        app.after(200, lambda: load_detail_history(page_delta))
        return

    estimated_row_height = 28
    rows_per_page = max(10, available_height // estimated_row_height)
    
    # Calculate total pages
    total_entries = len(entries)
    total_pages = max(1, (total_entries + rows_per_page - 1) // rows_per_page)  # Ceiling division

    temp_page = detail_page + page_delta
    if temp_page < 0:
        temp_page = 0
    if temp_page >= total_pages:
        temp_page = total_pages - 1

    start_index = temp_page * rows_per_page
    end_index = start_index + rows_per_page
    page_data = entries[start_index:end_index]

    detail_page = temp_page
    detail_tree.delete(*detail_tree.get_children())

    for i, row in enumerate(page_data):
        entry_type, row_id, t, product, display_type, amount, profit, info = row
        tag = 'even' if i % 2 == 0 else 'odd'
        
        unique_iid = f"{entry_type}_{row_id}"
        detail_tree.insert("", "end", iid=unique_iid, 
            values=(t, product, display_type, amount, profit, info), 
            tags=(tag,))

    detail_page_lbl.configure(text=f"Page {detail_page + 1} of {total_pages}")


# === SETTINGS PAGE ===
settings = pages["settings"]
ctk.CTkLabel(settings, text="⚙️ Settings", font=title_font).pack(pady=15)

# Header bar
settings_edit_header = ctk.CTkFrame(settings, fg_color="#2a2a2a", corner_radius=8, height=35)
settings_edit_header.pack(fill="x", padx=30, pady=(0, 15))
ctk.CTkLabel(settings_edit_header, text="🔧 Edit Values", font=info_font).pack(pady=3)

# Main container for side-by-side layout
settings_border = ctk.CTkFrame(settings, fg_color="#43a047", corner_radius=10)
settings_border.pack(pady=20, padx=30)

# Inner frame with slightly smaller size
settings_main_frame = ctk.CTkFrame(settings_border, fg_color="#1a1a1a", corner_radius=8)
settings_main_frame.pack(padx=2, pady=2)

# === LEFT: Base Cash Section ===
base_cash_frame = ctk.CTkFrame(settings_main_frame, width=300, height=200)
base_cash_frame.grid(row=0, column=0, padx=40, pady=10)
base_cash_frame.pack_propagate(False)

ctk.CTkLabel(base_cash_frame, text="💵 Base Cash (DA):", font=info_font).pack(pady=(20, 8))
base_cash_entry = ctk.CTkEntry(base_cash_frame, width=180)
base_cash_entry.pack()

def update_base_cash():
    try:
        new_amt = int(base_cash_entry.get())
        c.execute("UPDATE base_cash SET amount = ? WHERE id = 1", (new_amt,))
        conn.commit()
        update_dashboard()
        messagebox.showinfo("Updated", "Cash updated successfully.")
    except:
        messagebox.showerror("Error", "Invalid amount.")

ctk.CTkButton(base_cash_frame, text="Update Base Cash", command=update_base_cash,
              width=180, fg_color="#43a047", hover_color="#2e7d32", text_color="white").pack(pady=20)

# === RIGHT: Profit Thresholds Section ===
threshold_frame = ctk.CTkFrame(settings_main_frame, width=300, height=230)
threshold_frame.grid(row=0, column=1, padx=40, pady=10)
threshold_frame.pack_propagate(False)

ctk.CTkLabel(threshold_frame, text="📈 High Profit Threshold:", font=info_font).pack(pady=(20, 8))
high_profit_entry = ctk.CTkEntry(threshold_frame, width=180)
high_profit_entry.insert(0, get_setting("high_profit", DEFAULT_HIGH_PROFIT_THRESHOLD))
high_profit_entry.pack()

ctk.CTkLabel(threshold_frame, text="📉 Low Profit Threshold:", font=info_font).pack(pady=(20, 8))
low_profit_entry = ctk.CTkEntry(threshold_frame, width=180)
low_profit_entry.insert(0, get_setting("low_profit", DEFAULT_LOW_PROFIT_THRESHOLD))
low_profit_entry.pack()

def apply_threshold_changes():
    global high_profit_threshold, low_profit_threshold
    try:
        high_profit_threshold = int(high_profit_entry.get())
        low_profit_threshold = int(low_profit_entry.get())

        # ✅ Save to database
        set_setting("high_profit", high_profit_threshold)
        set_setting("low_profit", low_profit_threshold)

        update_dashboard()
        messagebox.showinfo("Updated", "Thresholds updated successfully.")
    except:
        messagebox.showerror("Error", "Please enter valid numbers.")

ctk.CTkButton(threshold_frame, text="Update", command=apply_threshold_changes,
              width=100,height=40, fg_color="#43a047", hover_color="#2e7d32", text_color="white").pack(pady=20)

# === PASSWORD FRAME ===
password_frame = ctk.CTkFrame(settings_main_frame, width=300, height=230)
password_frame.grid(row=1, column=0, padx=20, pady=15)
password_frame.pack_propagate(False)

ctk.CTkLabel(password_frame, text="🔒 Password Settings", font=info_font).pack(pady=(20, 5))

existing_password = get_setting("password", None)

if existing_password is None or existing_password == "":
    new_pass_entry = ctk.CTkEntry(password_frame, width=180, placeholder_text="Set 4-digit Password", show="*")
    new_pass_entry.pack(pady=5)

    def set_password():
        pwd = new_pass_entry.get().strip()
        if len(pwd) == 4 and pwd.isdigit():
            set_setting("password", pwd)
            messagebox.showinfo("Success", "Password set.")
            new_pass_entry.delete(0, "end")
        else:
            messagebox.showerror("Error", "Password must be 4 digits.")

    ctk.CTkButton(password_frame, text="Set Password", command=set_password,
                  width=180, fg_color="#43a047", hover_color="#2e7d32", text_color="white").pack(pady=10)
else:
    current_pass = ctk.CTkEntry(password_frame, width=180, placeholder_text="Current Password", show="*")
    new_pass = ctk.CTkEntry(password_frame, width=180, placeholder_text="New 4-digit Password", show="*")
    current_pass.pack(pady=5)
    new_pass.pack(pady=5)

    def change_password():
        cur = current_pass.get().strip()
        new = new_pass.get().strip()
        if cur != existing_password:
            messagebox.showerror("Error", "Current password is incorrect.")
            return
        if len(new) == 4 and new.isdigit():
            set_setting("password", new)
            messagebox.showinfo("Updated", "Password updated successfully.")
            current_pass.delete(0, "end")
            new_pass.delete(0, "end")
        else:
            messagebox.showerror("Error", "New password must be 4 digits.")

    ctk.CTkButton(password_frame, text="Update Password", command=change_password,
                  width=180, fg_color="#ff9800", hover_color="#f57c00", text_color="white").pack(pady=10)

# === STOCK SETTINGS FRAME ===
stock_settings_frame = ctk.CTkFrame(settings_main_frame, width=300, height=230)
stock_settings_frame.grid(row=1, column=1, padx=20, pady=15)
stock_settings_frame.pack_propagate(False)

low_stock_val = get_setting("low_stock_qty", 2)
high_sales_val = get_setting("high_stock_sales", 8)

ctk.CTkLabel(stock_settings_frame, text="⚠️Low Stock", font=info_font).pack(pady=10)
low_stock_entry = ctk.CTkEntry(stock_settings_frame, width=180)
low_stock_entry.insert(0, str(low_stock_val))
low_stock_entry.pack(pady=5)

ctk.CTkLabel(stock_settings_frame,text="🔸Best Stock", font=info_font).pack(pady=10)
high_sales_entry = ctk.CTkEntry(stock_settings_frame, width=180)
high_sales_entry.insert(0, str(high_sales_val))
high_sales_entry.pack(pady=5)

def update_stock_settings():
    try:
        low_val = low_stock_entry.get().strip()
        high_val = high_sales_entry.get().strip()

        if not low_val.isdigit() or not high_val.isdigit():
            raise ValueError("Non-integer input.")

        low = int(low_val)
        high = int(high_val)

        set_setting("low_stock_qty", low)
        set_setting("high_stock_sales", high)

    except Exception as e:
        print("Validation error:", e)
        messagebox.showerror("Error", "Please enter valid numbers.")
        return  # stop execution here

    # ✅ Moved outside the try block
    update_dashboard()  # optional — keep if needed
    messagebox.showinfo("Saved", "Stock thresholds updated.")

ctk.CTkButton(stock_settings_frame, text="Update", command=update_stock_settings,
              width=180, fg_color="#43a047", hover_color="#2e7d32", text_color="white").pack(pady=10)


# === MODIFIED BILLS PAGE ===
bills = pages["bills"]
ctk.CTkLabel(bills, text="📄 Money Management", font=title_font).pack(pady=15)

# Create tab switch like history page
money_mode_var = ctk.StringVar(value="bills")
money_mode_frame = ctk.CTkFrame(bills, fg_color="transparent")
money_mode_frame.pack(pady=5)

ctk.CTkRadioButton(money_mode_frame, text="Bills", variable=money_mode_var, value="bills",
                   command=lambda: switch_money_mode()).pack(side="left", padx=10)
ctk.CTkRadioButton(money_mode_frame, text="Credit", variable=money_mode_var, value="credit",
                   command=lambda: switch_money_mode()).pack(side="left", padx=10)
ctk.CTkRadioButton(money_mode_frame, text="Versement", variable=money_mode_var, value="versement",
                   command=lambda: switch_money_mode()).pack(side="left", padx=10)

# Container for both tabs
money_container = ctk.CTkFrame(bills, fg_color="transparent")
money_container.pack(fill="both", expand=True)

# Initialize both frames (important for first load)
bills_frame = ctk.CTkFrame(money_container, fg_color="transparent")
credit_frame = ctk.CTkFrame(money_container, fg_color="transparent")
versement_frame = ctk.CTkFrame(money_container, fg_color="transparent")
def switch_money_mode():
    for widget in money_container.winfo_children():
        widget.pack_forget()
    if money_mode_var.get() == "bills":
        bills_frame.pack(fill="both", expand=True)
    elif money_mode_var.get() == "credit":
        credit_frame.pack(fill="both", expand=True)
    else:
        versement_frame.pack(fill="both", expand=True)

app.after(100, switch_money_mode)

# === BILLS TAB ===
# Add Bill Section
add_bill_header = ctk.CTkFrame(bills_frame, fg_color="#2a2a2a", corner_radius=8, height=35)
add_bill_header.pack(fill="x", pady=(5, 0), padx=20)
ctk.CTkLabel(add_bill_header, text="➕ Add Bill", font=info_font).pack(pady=3)

bf = ctk.CTkFrame(bills_frame)
bf.pack(pady=10)

b_category = ctk.CTkComboBox(bf, values=["Electricity", "Internet", "Lekhsayer", "Other"], width=150)
b_category.grid(row=0, column=0, padx=5)

b_amount = ctk.CTkEntry(bf, placeholder_text="Amount (DA)", width=150)
b_amount.grid(row=0, column=1, padx=5)

b_notes = ctk.CTkEntry(bf, placeholder_text="Notes (optional)", width=300)
b_notes.grid(row=0, column=2, padx=5)

def on_bills_search_change(event):
    global bills_search_after_id
    if bills_search_after_id:
        app.after_cancel(bills_search_after_id)
    bills_search_after_id = app.after(300, lambda: load_bills_table(0))

# === BILLS TABLE VIEW ===
from datetime import datetime, timedelta

# Pagination variables
bills_page = 0

# Date defaults
default_start = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
default_end = datetime.now().strftime("%Y-%m-%d")

bills_view_frame = ctk.CTkFrame(bills_frame, fg_color="transparent")
bills_view_frame.pack(fill="both", expand=True, padx=10, pady=10)

# Bill History Header
add_bill_history_header = ctk.CTkFrame(bills_view_frame, fg_color="#2a2a2a", corner_radius=8, height=35)
add_bill_history_header.pack(fill="x", pady=10, padx=20)  # Reduced bottom padding
ctk.CTkLabel(add_bill_history_header, text="🔍 History Bill", font=info_font).pack(pady=3)

# Filter bar - centered
filter_bar = ctk.CTkFrame(bills_view_frame, fg_color="transparent")
filter_bar.pack(pady=(0, 5))  # Reduced padding

# Container to center the filter controls
filter_container = ctk.CTkFrame(filter_bar, fg_color="transparent")
filter_container.pack()

ctk.CTkLabel(filter_container, text="From:").pack(side="left", padx=(5, 2))
bills_start_picker = create_ctk_date_picker(filter_container, default=default_start)
bills_start_picker.pack(side="left", padx=(0, 8))

ctk.CTkLabel(filter_container, text="To:").pack(side="left", padx=(5, 2))
bills_end_picker = create_ctk_date_picker(filter_container, default=default_end)
bills_end_picker.pack(side="left", padx=(0, 8))

ctk.CTkLabel(filter_container, text="🔍").pack(side="left", padx=(20, 4))
bills_search_entry = ctk.CTkEntry(filter_container, width=180, placeholder_text="Search category or notes...")
bills_search_entry.pack(side="left")
bills_search_entry.bind("<KeyRelease>", on_bills_search_change)

ctk.CTkButton(filter_container, text="🔍 Apply Filter", command=lambda: load_bills_table(0),
              fg_color="#0288d1", hover_color="#0277bd", text_color="white").pack(side="left", padx=10)

# Tree container
bills_table_container = ctk.CTkFrame(bills_view_frame)
bills_table_container.pack(padx=10, pady=10, fill="both", expand=True)

bills_tree = ttk.Treeview(
    bills_table_container,
    columns=("timestamp", "category", "amount", "notes"),
    show="headings",
    height=15
)
bills_tree.heading("timestamp", text="Timestamp")
bills_tree.heading("category", text="Category")
bills_tree.heading("amount", text="Amount")
bills_tree.heading("notes", text="Notes")

bills_tree.column("timestamp", anchor="center", width=140)
bills_tree.column("category", anchor="center", width=120)
bills_tree.column("amount", anchor="center", width=100)
bills_tree.column("notes", anchor="w", width=300)

bills_tree.pack(fill="both", expand=True)
bills_tree.tag_configure('even', background="#2a2a2a")
bills_tree.tag_configure('odd', background="#1f1f1f")

# Navigation bar
bills_nav = ctk.CTkFrame(bills_view_frame, fg_color="transparent")
bills_nav.pack(pady=5)

bills_page_lbl = ctk.CTkLabel(bills_nav, text="Page 1")
bills_page_lbl.pack(side="left", padx=10)

ctk.CTkButton(bills_nav, text="⬅ Prev", command=lambda: load_bills_table(-1),
              fg_color="#37474f", hover_color="#263238", text_color="white").pack(side="left", padx=5)
ctk.CTkButton(bills_nav, text="Next ➡", command=lambda: load_bills_table(1),
              fg_color="#37474f", hover_color="#263238", text_color="white").pack(side="left", padx=5)

# Load function
def load_bills_table(page_delta=0, initial_load=False):
    global bills_page
    global bills_search_after_id
    
    bills_search_after_id = None
    keyword = bills_search_entry.get().lower().strip()
    start_date = bills_start_picker.get_date()
    end_date = bills_end_picker.get_date()

    # Skip height check if initial load
    if not initial_load and bills_table_container.winfo_height() < 100:
        app.after(500, lambda: load_bills_table(page_delta))
        return

    # Build SQL query with filters
    query = "SELECT timestamp, category, amount, notes FROM bills WHERE 1=1"
    params = []
    
    # Add keyword filter to SQL
    if keyword:
        query += " AND (LOWER(category) LIKE ? OR LOWER(notes) LIKE ?)"
        params.extend([f"%{keyword}%", f"%{keyword}%"])
    
    # Add date filters to SQL
    try:
        from_dt = datetime.strptime(start_date, "%Y-%m-%d").strftime("%Y-%m-%d %H:%M:%S")
        to_dt = datetime.strptime(end_date + " 23:59:59", "%Y-%m-%d %H:%M:%S").strftime("%Y-%m-%d %H:%M:%S")
        query += " AND timestamp BETWEEN ? AND ?"
        params.extend([from_dt, to_dt])
    except Exception:
        pass

    query += " ORDER BY timestamp DESC"
    
    # Execute optimized query
    c.execute(query, params)
    rows = c.fetchall()
    
    bills_tree.delete(*bills_tree.get_children())

    # Calculate pagination
    available_height = bills_table_container.winfo_height()
    estimated_row_height = 28
    rows_per_page = 15 if initial_load else max(10, available_height // estimated_row_height) - 1

    total_entries = len(rows)
    total_pages = max(1, (total_entries + rows_per_page - 1) // rows_per_page)
    
    temp_page = bills_page + page_delta
    bills_page = max(0, min(temp_page, total_pages - 1))

    # Insert only the visible page
    page_start = bills_page * rows_per_page
    page_end = (bills_page + 1) * rows_per_page
    page_data = rows[page_start:page_end]

    for i, (ts, cat, amount, note) in enumerate(page_data):
        tag = "even" if i % 2 == 0 else "odd"
        formatted_amount = f"{amount:,} DA".replace(",", " ")
        bills_tree.insert("", "end", 
                         values=(ts, cat, formatted_amount, note or ""),
                         tags=(tag,))

    bills_page_lbl.configure(text=f"Page {bills_page + 1} of {total_pages}")
    
    if initial_load:
        app.after(500, lambda: load_bills_table(0))


# Init table
app.after(300, lambda: load_bills_table(initial_load=True))

def add_bill():
    try:
        amt = int(b_amount.get())
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute("INSERT INTO bills (timestamp, category, amount, notes) VALUES (?, ?, ?, ?)",
                  (now, b_category.get(), amt, b_notes.get()))
        c.execute("UPDATE base_cash SET amount = amount - ?", (amt,))
        conn.commit()
        update_dashboard()
        messagebox.showinfo("Saved", "✅ Bill added.")
        b_amount.delete(0, "end")
        b_notes.delete(0, "end")
    except Exception as e:
        messagebox.showerror("Error", f"Invalid input.\n{e}")

ctk.CTkButton(bf, text="➕ Add Bill", command=add_bill,
              fg_color="#f4511e", hover_color="#bf360c").grid(row=0, column=3, padx=10)

# CREDIT FUNCTIONS
def add_credit():
    try:
        name = credit_name.get().strip()
        amount = int(credit_amount.get().strip())
        reason = credit_reason.get().strip()
        phone = credit_phone.get().strip()
        due = credit_due.get_date() if hasattr(credit_due, 'get_date') else None

        if not name:
            raise ValueError("Name is required")

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute("INSERT INTO credit (timestamp, name, amount, reason, phone, payment_time) VALUES (?, ?, ?, ?, ?, ?)",
                  (now, name, amount, reason, phone, due))
        c.execute("UPDATE base_cash SET amount = amount - ?", (amount,))
        conn.commit()

        credit_name.delete(0, "end")
        credit_amount.delete(0, "end")
        credit_reason.delete(0, "end")
        credit_phone.delete(0, "end")

        load_credit_entries()
        update_dashboard()
        messagebox.showinfo("Success", f"Credit entry for {name} added.")
    except ValueError as e:
        messagebox.showerror("Error", f"Invalid input: {e}")
    except Exception as e:
        messagebox.showerror("Error", f"Error adding credit: {e}")

def delete_credit(cid):
    c.execute("SELECT amount FROM credit WHERE id = ?", (cid,))
    amount = c.fetchone()[0]
    if messagebox.askyesno("Confirm", "Delete this credit entry?"):
        c.execute("DELETE FROM credit WHERE id = ?", (cid,))
        c.execute("UPDATE base_cash SET amount = amount + ?", (amount,))
        conn.commit()
        load_credit_entries()
        update_dashboard()

def modify_credit(cid):
    c.execute("SELECT * FROM credit WHERE id = ?", (cid,))
    entry = c.fetchone()
    if not entry:
        return

    cid, timestamp, name, amount, reason, phone, due = entry

    popup = ctk.CTkToplevel()
    popup.title("Modify Credit")
    popup.geometry("420x360")
    popup.grab_set()

    ctk.CTkLabel(popup, text="Modify Credit Entry", font=("Arial", 16, "bold")).pack(pady=10)

    form = ctk.CTkFrame(popup, fg_color="transparent")
    form.pack(pady=10, padx=20, fill="x")

    labels = ["Name:", "Amount (DA):", "Phone:", "Reason:", "Due Date:"]
    entries = []

    for i, text in enumerate(labels):
        ctk.CTkLabel(form, text=text, anchor="e", width=100).grid(row=i, column=0, padx=5, pady=5, sticky="e")
        if i == 4:
            date_frame = ctk.CTkFrame(form, fg_color="transparent")
            date_frame.grid(row=i, column=1, padx=5, pady=5, sticky="w")
            default_due = None
            if due:
                try:
                    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                        try:
                            dt = datetime.strptime(due, fmt)
                            default_due = dt.strftime("%Y-%m-%d")
                            break
                        except:
                            continue
                except:
                    default_due = None

            entry_field = create_ctk_date_picker(date_frame, default=default_due)
            entry_field.pack()  # ✅ Required to show the date picker
        else:
            entry_field = ctk.CTkEntry(form, width=250)
            entry_field.grid(row=i, column=1, padx=5, pady=5, sticky="w")
        entries.append(entry_field)

    entries[0].insert(0, name)
    entries[1].insert(0, str(amount))
    entries[2].insert(0, phone or "")
    entries[3].insert(0, reason or "")

    def save_modifications():
        try:
            new_name = entries[0].get().strip()
            new_amount = int(entries[1].get().strip())
            new_phone = entries[2].get().strip()
            new_reason = entries[3].get().strip()
            new_due = entries[4].get_date() if hasattr(entries[4], 'get_date') else None

            delta = amount - new_amount

            c.execute("UPDATE base_cash SET amount = amount + ?", (delta,))
            c.execute("""
                UPDATE credit 
                SET name = ?, amount = ?, reason = ?, phone = ?, payment_time = ?
                WHERE id = ?
            """, (new_name, new_amount, new_reason, new_phone, new_due, cid))

            conn.commit()
            popup.destroy()
            load_credit_entries()
            update_dashboard()
            messagebox.showinfo("Updated", "Credit entry modified successfully.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to modify credit: {e}")

    btns = ctk.CTkFrame(popup, fg_color="transparent")
    btns.pack(pady=15)

    ctk.CTkButton(btns, text="💾 Save", command=save_modifications,
                  fg_color="#43a047", hover_color="#2e7d32", width=100).pack(side="left", padx=10)
    ctk.CTkButton(btns, text="Delete 🗑", command=lambda cid=cid: (delete_credit(cid) , popup.destroy()),
                  fg_color="#e53935", hover_color="#c62828", width=100).pack(side="left", padx=10)


# === CREDIT TAB ===
add_credit_header = ctk.CTkFrame(credit_frame, fg_color="#2a2a2a", corner_radius=8, height=35)
add_credit_header.pack(fill="x", pady=(5, 0), padx=20)
ctk.CTkLabel(add_credit_header, text="➕ Add Credit Entry", font=info_font).pack(pady=3)

form_frame = ctk.CTkFrame(credit_frame, fg_color="transparent")
form_frame.pack(pady=5, padx=20, fill="x")

ctk.CTkLabel(form_frame, text="Name:", width=70, anchor="e").grid(row=0, column=0, padx=5, pady=3)
credit_name = ctk.CTkEntry(form_frame, placeholder_text="Client Name", width=150)
credit_name.grid(row=0, column=1, padx=5, pady=3)

ctk.CTkLabel(form_frame, text="Amount:", width=70, anchor="e").grid(row=0, column=2, padx=5, pady=3)
credit_amount = ctk.CTkEntry(form_frame, placeholder_text="DA", width=100)
credit_amount.grid(row=0, column=3, padx=5, pady=3)

ctk.CTkLabel(form_frame, text="Phone:", width=70, anchor="e").grid(row=1, column=0, padx=5, pady=3)
credit_phone = ctk.CTkEntry(form_frame, placeholder_text="Number", width=150)
credit_phone.grid(row=1, column=1, padx=5, pady=3)

ctk.CTkLabel(form_frame, text="Reason:", width=70, anchor="e").grid(row=1, column=2, padx=5, pady=3)
credit_reason = ctk.CTkEntry(form_frame, placeholder_text="Purpose", width=150)
credit_reason.grid(row=1, column=3, padx=5, pady=3)

ctk.CTkLabel(form_frame, text="Due Date:", width=70, anchor="e").grid(row=2, column=0, padx=5, pady=3)
due_frame = ctk.CTkFrame(form_frame, fg_color="transparent")
due_frame.grid(row=2, column=1, padx=5, pady=3, sticky="w")

from datetime import datetime

today = datetime.today().strftime("%Y-%m-%d")
credit_due = create_ctk_date_picker(due_frame, default=today)
credit_due.pack() 

btn_frame = ctk.CTkFrame(credit_frame, fg_color="transparent")
btn_frame.pack(pady=(0, 5))
ctk.CTkButton(btn_frame, text="💾 Save Credit", command=add_credit,
              fg_color="#43a047", hover_color="#2e7d32", 
              width=140, height=32, corner_radius=8).pack()

# Add History Credit Header (new addition)
history_credit_header = ctk.CTkFrame(credit_frame, fg_color="#2a2a2a", corner_radius=8, height=35)
history_credit_header.pack(fill="x", pady=(10, 5), padx=20)
ctk.CTkLabel(history_credit_header, text="🔍 History Credit's", font=info_font).pack(pady=3)

# === Search & Filter UI ===
# === Filter Frame (centered layout) ===
filter_frame = ctk.CTkFrame(credit_frame, fg_color="transparent")
filter_frame.pack(pady=10)

row = ctk.CTkFrame(filter_frame, fg_color="transparent")
row.pack()
# Centered inner layout
ctk.CTkLabel(row, text="🔍",font=("Arial",20)).pack(side="left", padx=(4, 4))
search_entry3 = ctk.CTkEntry(row, placeholder_text="Search by name", width=150)
search_entry3.pack(side="left",padx=(0, 20))
def delayed_load(_):
    app.after(10, load_credit_entries)

search_entry3.bind("<KeyRelease>", delayed_load)

# Filter checkboxes row
show_unpaid = ctk.BooleanVar()
show_ontime = ctk.BooleanVar()
show_today = ctk.BooleanVar()

ctk.CTkCheckBox(
    row, text="Unpaid", variable=show_unpaid,
    command=lambda: load_credit_entries()).pack(side="right", padx=6)

ctk.CTkCheckBox(
    row, text="Still on Time", variable=show_ontime,
    command=lambda: load_credit_entries()).pack(side="right", padx=6)

ctk.CTkCheckBox(
    row, text="Today's Credit", variable=show_today,
    command=lambda: load_credit_entries()).pack(side="right", padx=6)

def create_credit_entry_frame(entry):
    cid, timestamp, name, amount, reason, phone, due = entry
    border_color = "#444"
    if due:
        try:
            # Try both formats just in case
            for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                try:
                    due_date = datetime.strptime(due, fmt).date()
                    break
                except:
                    continue
            else:
                due_date = None
    
            today = datetime.now().date()
            if due_date:
                if due_date < today:
                    border_color = "#e53935"  # red
                elif due_date == today:
                    border_color = "#FFB300"  # yellow
                else:
                    border_color = "#00e676"  # green
        except:
            pass

    frame = ctk.CTkFrame(entries_frame, border_width=1, border_color=border_color,
                         corner_radius=10)
    frame.pack(fill="x", padx=6, pady=4)
    
    content = ctk.CTkFrame(frame, fg_color="transparent", height=50)
    content.pack(fill="x", padx=10, pady=2)
    
    # Common style for all labels
    label_font = ("Arial", 19)
    label_padx = 5
    label_width = 100
    label_height = 20
    
    date_str = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S").strftime("%d/%m/%Y")
    ctk.CTkLabel(content, text=f"🗓 {date_str}", font=label_font,
                 width=label_width, height=label_height, anchor="center").pack(side="left", padx=label_padx)
    
    name_label = ctk.CTkLabel(content, text=f"👤 {name[:12]}{'..' if len(name) > 12 else ''}",
                              font=label_font, width=label_width, height=label_height, anchor="center")
    name_label.pack(side="left", padx=label_padx)
    name_label.bind("<Enter>", lambda e, n=name: name_label.configure(text=f"👤 {n}"))
    name_label.bind("<Leave>", lambda e: name_label.configure(text=f"👤 {name[:12]}{'..' if len(name) > 12 else ''}"))
    
    if reason:
        reason_label = ctk.CTkLabel(content, text=f"📝 {reason[:15]}{'..' if len(reason) > 15 else ''}",
                                    font=label_font, width=label_width, height=label_height, anchor="center")
        reason_label.pack(side="left", padx=label_padx)
        reason_label.bind("<Enter>", lambda e, r=reason: reason_label.configure(text=f"📝 {r}"))
        reason_label.bind("<Leave>", lambda e: reason_label.configure(text=f"📝 {reason[:15]}{'..' if len(reason) > 15 else ''}"))
    if phone:
        ctk.CTkLabel(content, text=f"📞 {phone}", font=label_font,
                 width=label_width, height=label_height, anchor="center").pack(side="left", padx=label_padx)
    ctk.CTkLabel(content, text=f"💰 {int(amount):,}".replace(",", " ") + "DA", font=label_font,
                 text_color="#FFD600", width=label_width, height=label_height, anchor="center").pack(side="left", padx=label_padx,pady=10)
    if due:
        ctk.CTkLabel(content, text=f"⏰ {due}", font=label_font,
                     width=label_width, height=label_height, anchor="center").pack(side="left", padx=label_padx)

    btn_frame = ctk.CTkFrame(content, fg_color="transparent", width=60)
    btn_frame.pack(side="right", padx=5)                                                            
    ctk.CTkButton(btn_frame, text="Edit ✏", width=40, height=30, command=lambda cid=cid: modify_credit(cid),
                  fg_color="#0288d1", hover_color="#0277bd", font=("Arial", 13)).pack(side="left", padx=6,pady=2)


def load_credit_entries():

    for widget in entries_frame.winfo_children():
        widget.destroy()

    c.execute("SELECT * FROM credit ORDER BY timestamp DESC")
    rows = c.fetchall()

    # Read and sanitize search input
    raw = search_entry3.get().strip()
    if raw.lower() in ["", "search by name", "search product..."]:
        keyword = None
    else:
        keyword = raw.lower()

    unpaid = show_unpaid.get()
    ontime = show_ontime.get()
    today_only = show_today.get()

    for entry in rows:
        cid, timestamp, name, amount, reason, phone, due = entry
        # Filter by keyword
        name_lower = name.strip().lower()
        if keyword and keyword not in name_lower:
            continue

        # Determine status
        status = None
        if due:
            try:
                for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                    try:
                        due_date = datetime.strptime(due, fmt).date()
                        break
                    except:
                        continue
                else:
                    due_date = None

                if due_date:
                    today = datetime.now().date()
                    if due_date < today:
                        status = 'red'
                    elif due_date == today:
                        status = 'yellow'
                    else:
                        status = 'green'
            except Exception as e:
                print("⚠️ Error parsing due date:", due, "|", e)

        # Apply filters only if selected
        if unpaid or ontime or today_only:
            if unpaid and status != 'red':
                continue
            if ontime and status != 'green':
                continue
            if today_only and status != 'yellow':
                continue

        create_credit_entry_frame(entry)



entries_frame = ctk.CTkScrollableFrame(credit_frame, fg_color="transparent", height=200)
entries_frame.pack(fill="both", expand=True, pady=7, padx=20)
# ===== END CREDIT FUNCTIONS =====
# Initialize credit entries
app.after(100, load_credit_entries)

# === VERSEMENT TAB ===
add_versement_header = ctk.CTkFrame(versement_frame, fg_color="#2a2a2a", corner_radius=8, height=35)
add_versement_header.pack(fill="x", pady=(5, 0), padx=20)
ctk.CTkLabel(add_versement_header, text="➕ Add Versement Entry", font=info_font).pack(pady=3)

verse_form = ctk.CTkFrame(versement_frame, fg_color="transparent")
verse_form.pack(pady=5, padx=20, fill="x")

verse_name = ctk.CTkEntry(verse_form, placeholder_text="Client Name", width=150)
verse_amount = ctk.CTkEntry(verse_form, placeholder_text="DA", width=100)
verse_phone = ctk.CTkEntry(verse_form, placeholder_text="Phone", width=150)
verse_reason = ctk.CTkEntry(verse_form, placeholder_text="Product", width=150)

ctk.CTkLabel(verse_form, text="Name:").grid(row=0, column=0, padx=5, pady=3)
verse_name.grid(row=0, column=1, padx=5, pady=3)

ctk.CTkLabel(verse_form, text="Amount:").grid(row=0, column=2, padx=5, pady=3)
verse_amount.grid(row=0, column=3, padx=5, pady=3)

ctk.CTkLabel(verse_form, text="Phone:").grid(row=1, column=0, padx=5, pady=3)
verse_phone.grid(row=1, column=1, padx=5, pady=3)

ctk.CTkLabel(verse_form, text="Reason:").grid(row=1, column=2, padx=5, pady=3)
verse_reason.grid(row=1, column=3, padx=5, pady=3)

ctk.CTkLabel(verse_form, text="Due Date:").grid(row=2, column=0, padx=5, pady=3)
verse_due_frame = ctk.CTkFrame(verse_form, fg_color="transparent")
verse_due_frame.grid(row=2, column=1, padx=5, pady=3, sticky="w")
verse_due = create_ctk_date_picker(verse_due_frame, default=today)
verse_due.pack()

# Button
ctk.CTkButton(versement_frame, text="💾 Save Versement", command=lambda: add_versement(),
              fg_color="#ff6f00", hover_color="#e65100", width=140).pack(pady=6)


def add_versement():
    try:
        name = verse_name.get().strip()
        amount = int(verse_amount.get().strip())
        phone = verse_phone.get().strip()
        reason = verse_reason.get().strip()
        due = verse_due.get_date() if hasattr(verse_due, 'get_date') else None

        if not name:
            raise ValueError("Name is required")

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute("INSERT INTO versement (timestamp, name, amount, reason, phone, payment_time) VALUES (?, ?, ?, ?, ?, ?)",
                  (now, name, amount, reason, phone, due))
        c.execute("UPDATE base_cash SET amount = amount + ?", (amount,))
        conn.commit()

        # Clear fields
        verse_name.delete(0, "end")
        verse_amount.delete(0, "end")
        verse_phone.delete(0, "end")
        verse_reason.delete(0, "end")

        load_versement_entries()
        update_dashboard()
        messagebox.showinfo("Saved", "Versement added successfully.")
    except Exception as e:
        messagebox.showerror("Error", f"Error: {e}")

# === Filter UI for Versement ===
versement_history_header = ctk.CTkFrame(versement_frame, fg_color="#2a2a2a", corner_radius=8, height=35)
versement_history_header.pack(fill="x", pady=(10, 5), padx=20)
ctk.CTkLabel(versement_history_header, text="🔍 History Versements", font=info_font).pack(pady=3)

versement_filter_frame = ctk.CTkFrame(versement_frame, fg_color="transparent")
versement_filter_frame.pack(pady=10)

versement_filter_row = ctk.CTkFrame(versement_filter_frame, fg_color="transparent")
versement_filter_row.pack()

ctk.CTkLabel(versement_filter_row, text="🔍", font=("Arial", 20)).pack(side="left", padx=(4, 4))

versement_search_entry = ctk.CTkEntry(versement_filter_row, placeholder_text="Search by name", width=150)
versement_search_entry.pack(side="left", padx=(0, 20))
def delayed_versement_load(_):
    app.after(10, load_versement_entries)
versement_search_entry.bind("<KeyRelease>", delayed_versement_load)

# Checkboxes
show_unpaid_versement = ctk.BooleanVar()
show_ontime_versement = ctk.BooleanVar()
show_today_versement = ctk.BooleanVar()

ctk.CTkCheckBox(
    versement_filter_row, text="Unpaid", variable=show_unpaid_versement,
    command=lambda: load_versement_entries()).pack(side="right", padx=6)

ctk.CTkCheckBox(
    versement_filter_row, text="Still on Time", variable=show_ontime_versement,
    command=lambda: load_versement_entries()).pack(side="right", padx=6)

ctk.CTkCheckBox(
    versement_filter_row, text="Today's Versement", variable=show_today_versement,
    command=lambda: load_versement_entries()).pack(side="right", padx=6)

# Scrollable list
versement_entries_frame = ctk.CTkScrollableFrame(versement_frame, fg_color="transparent", height=220)
versement_entries_frame.pack(fill="both", expand=True, pady=7, padx=20)

def create_versement_entry_frame(entry):
    vid, timestamp, name, amount, reason, phone, due, product, category, total_price, bought_price = entry
    border_color = "#444"

    # === Determine color based on due date ===
    if due:
        try:
            for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                try:
                    due_date = datetime.strptime(due, fmt).date()
                    break
                except:
                    continue
            else:
                due_date = None

            today = datetime.now().date()
            if due_date:
                if due_date < today:
                    border_color = "#e53935"  # red
                elif due_date == today:
                    border_color = "#FFB300"  # yellow
                else:
                    border_color = "#00e676"  # green
        except:
            pass

    frame = ctk.CTkFrame(versement_entries_frame, border_width=1, border_color=border_color, corner_radius=10)
    frame.pack(fill="x", padx=6, pady=4)

    content = ctk.CTkFrame(frame, fg_color="transparent", height=50)
    content.pack(fill="x", padx=10, pady=4)

    # Common visual style
    label_font = ("Arial", 19)
    label_padx = 5
    label_width = 100
    label_height = 20

    # Format date
    date_str = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S").strftime("%d/%m/%Y")

    # === Entry Labels ===
    ctk.CTkLabel(content, text=f"🗓 {date_str}", font=label_font, width=label_width,
                 height=label_height, anchor="center").pack(side="left", padx=label_padx)

    name_label = ctk.CTkLabel(content, text=f"👤 {name[:12]}{'..' if len(name) > 12 else ''}",
                              font=label_font, width=label_width, height=label_height, anchor="center")
    name_label.pack(side="left", padx=label_padx)
    name_label.bind("<Enter>", lambda e, n=name: name_label.configure(text=f"👤 {n}"))
    name_label.bind("<Leave>", lambda e: name_label.configure(text=f"👤 {name[:12]}{'..' if len(name) > 12 else ''}"))

    if reason:
        reason_label = ctk.CTkLabel(content, text=f"📝 {reason[:15]}{'..' if len(reason) > 15 else ''}",
                                    font=label_font, width=label_width, height=label_height, anchor="center")
        reason_label.pack(side="left", padx=label_padx)
        reason_label.bind("<Enter>", lambda e, r=reason: reason_label.configure(text=f"📝 {r}"))
        reason_label.bind("<Leave>", lambda e: reason_label.configure(text=f"📝 {reason[:15]}{'..' if len(reason) > 15 else ''}"))

    if phone:
        ctk.CTkLabel(content, text=f"📞 {phone}", font=label_font, width=label_width,
                     height=label_height, anchor="center").pack(side="left", padx=label_padx)

    ctk.CTkLabel(content, text=f"💰 {int(amount):,}".replace(",", " ") + " DA", font=label_font,
                 text_color="#FFD600", width=label_width, height=label_height, anchor="center").pack(side="left", padx=label_padx)

    if due:
        ctk.CTkLabel(content, text=f"⏰ {due}", font=label_font,
                     width=label_width, height=label_height, anchor="center").pack(side="left", padx=label_padx)

    # === Action Buttons ===
    btn_frame = ctk.CTkFrame(content, fg_color="transparent", width=60)
    btn_frame.pack(side="right", padx=5)

    ctk.CTkButton(btn_frame, text="Edit ✏", width=40, height=30,
                  font=("Arial", 13),
                  fg_color="#0288d1", hover_color="#0277bd",
                  command=lambda: modify_versement_popup(vid)).pack(side="left", padx=6, pady=2)
    

def load_versement_entries():
    for widget in versement_entries_frame.winfo_children():
        widget.destroy()

    c.execute("SELECT * FROM versement ORDER BY timestamp DESC")
    rows = c.fetchall()

    raw = versement_search_entry.get().strip()
    keyword = raw.lower() if raw and raw.lower() not in ["search by name", "search product..."] else None

    unpaid = show_unpaid_versement.get()
    ontime = show_ontime_versement.get()
    today_only = show_today_versement.get()

    for entry in rows:
        cid, timestamp, name, amount, reason, phone, due, product, category, total_price, bought_price = entry
        if keyword and keyword not in name.lower().strip():
            continue

        # Determine status
        status = None
        if due:
            try:
                for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                    try:
                        due_date = datetime.strptime(due, fmt).date()
                        break
                    except:
                        continue
                else:
                    due_date = None

                if due_date:
                    today = datetime.now().date()
                    if due_date < today:
                        status = 'red'
                    elif due_date == today:
                        status = 'yellow'
                    else:
                        status = 'green'
            except:
                pass

        if unpaid and status != 'red':
            continue
        if ontime and status != 'green':
            continue
        if today_only and status != 'yellow':
            continue

        create_versement_entry_frame(entry)
    
def mark_versement_as_paid(vid):
    try:
        # Fetch versement data
        c.execute("SELECT name, amount, reason, phone, product, category, total_price, bought_price FROM versement WHERE id = ?", (vid,))
        data = c.fetchone()

        if not data:
            messagebox.showerror("Error", "Versement entry not found.")
            return

        name, amount_versed, reason, phone, product, category, total_price, bought_price = data

        confirm = messagebox.askyesno("Confirm", f"Mark '{name}' as paid and register full sale?")
        if not confirm:
            return

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Insert into quick_sales
        c.execute("""
            INSERT INTO quick_sales (timestamp, product, category, bought_price, sold_price)
            VALUES (?, ?, ?, ?, ?)
        """, (now, product, category, bought_price, total_price))

        # Adjust base_cash (subtract already-versed)
        difference = total_price - amount_versed
        c.execute("UPDATE base_cash SET amount = amount + ?", (difference,))

        # Delete versement entry
        c.execute("DELETE FROM versement WHERE id = ?", (vid,))
        conn.commit()

        update_dashboard()
        load_versement_entries()
        load_today_sales()
        messagebox.showinfo("Paid", f"Sale for '{name}' completed. Remaining {difference:,} DA was added.")

    except Exception as e:
        messagebox.showerror("Error", f"Failed to mark versement as paid:\n{e}")

def modify_versement_popup(vid):
    c.execute("SELECT * FROM versement WHERE id = ?", (vid,))
    entry = c.fetchone()
    if not entry:
        messagebox.showerror("Error", "Versement not found.")
        return

    # Unpack entry
    (vid, ts, name, amount, reason, phone, due,
     product, category, total_price, bought_price) = entry

    popup = ctk.CTkToplevel()
    popup.title("Edit Versement")
    popup.geometry("460x420")
    popup.grab_set()

    ctk.CTkLabel(popup, text="📝 Edit Versement Entry", font=("Arial", 17, "bold")).pack(pady=8)

    form = ctk.CTkFrame(popup, fg_color="transparent")
    form.pack(pady=10, padx=20)

    # Fields
    fields = []
    labels = ["Name:", "Amount (DA):", "Phone:", "Due Date:"]
    values = [name, str(int(amount)), phone, due or ""]

    for i, (lbl, val) in enumerate(zip(labels, values)):
        ctk.CTkLabel(form, text=lbl).grid(row=i, column=0, padx=6, pady=6, sticky="e")
        if lbl == "Due Date:":
            date_frame = ctk.CTkFrame(form, fg_color="transparent")
            date_frame.grid(row=i, column=1, sticky="w")
            due_picker = create_ctk_date_picker(date_frame, default=due or today)
            due_picker.pack()
            fields.append(due_picker)
        else:
            entry = ctk.CTkEntry(form, width=220)
            entry.insert(0, val)
            entry.grid(row=i, column=1, padx=5, pady=6)
            fields.append(entry)

    # Show product info (if exists)
    if product:
        diffirence = total_price - amount
        prod_info = f"\nProduct: {product}\nTotal: {total_price:,} DA\nShould Pay: {diffirence:,} DA"
        ctk.CTkLabel(popup, text=prod_info, font=("Arial", 13), text_color="#aaa").pack(pady=5)

    # Action buttons
    btn_frame = ctk.CTkFrame(popup, fg_color="transparent")
    btn_frame.pack(pady=10)

    def save_changes():
        try:
            new_name = fields[0].get().strip()
            new_amount = int(fields[1].get().strip())
            new_phone = fields[2].get().strip()
            new_due = fields[3].get_date() if hasattr(fields[3], 'get_date') else None

            # Adjust base cash if amount changed
            delta = new_amount - amount
            c.execute("UPDATE base_cash SET amount = amount + ?", (delta,))

            # Update versement entry
            c.execute("""
                UPDATE versement
                SET name=?, amount=?, phone=?, payment_time=?
                WHERE id = ?
            """, (new_name, new_amount, new_phone, new_due, vid))
            conn.commit()
            popup.destroy()
            load_versement_entries()
            update_dashboard()
            messagebox.showinfo("Success", "Versement updated.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to update: {e}")

    def complete_payment():
        if bought_price is not None:
            mark_versement_as_paid(vid)
            popup.destroy()
        else:
            confirm = messagebox.askyesno("Confirm", f"No product info. Just remove entry and subtract {amount} DA from cash?")
            if confirm:
                c.execute("UPDATE base_cash SET amount = amount - ?", (amount,))
                c.execute("DELETE FROM versement WHERE id = ?", (vid,))
                conn.commit()
                popup.destroy()
                load_versement_entries()
                update_dashboard()
                messagebox.showinfo("Done", "Versement marked as paid. Please manually add sale.")

    ctk.CTkButton(btn_frame, text="💾 Save", width=90, command=save_changes,
                  fg_color="#0288d1", hover_color="#0277bd").pack(side="left", padx=10)
    ctk.CTkButton(btn_frame, text="✅ Paid", width=90, command=complete_payment,
                  fg_color="#43a047", hover_color="#2e7d32").pack(side="left", padx=10)
       
# === STOCK TAB ===
stock = pages["stock"] = ctk.CTkFrame(main_area, fg_color="transparent")
stock_page = 0
stock_per_page = 20
ctk.CTkLabel(stock, text="📦 Stock Management", font=title_font).pack(pady=20)
app.after(200, lambda: load_stock_table(0))
form_frame = ctk.CTkFrame(stock)
form_frame.pack(pady=10)

# === Row 1: Main Inputs + Button
top_row = ctk.CTkFrame(form_frame, fg_color="transparent")
top_row.pack()

stock_name = ctk.CTkEntry(top_row, placeholder_text="Product Name", width=140)
stock_name.pack(side="left", padx=5)
stock_name.bind("<KeyRelease>", lambda e: show_stock_suggestions_for_stock(stock_name, stock_type, stock_bought, stock_selling))

stock_type = ctk.CTkComboBox(top_row, values=STOCK_TYPES, width=130)
stock_type.set(STOCK_TYPES[0]) # Set default to first type
stock_type.pack(side="left", padx=5)

stock_qty = ctk.CTkEntry(top_row, placeholder_text="Qty", width=60)
stock_qty.pack(side="left", padx=5)

stock_bought = ctk.CTkEntry(top_row, placeholder_text="Bought Price", width=100)
stock_bought.pack(side="left", padx=5)

stock_selling = ctk.CTkEntry(top_row, placeholder_text="Selling Price", width=100)
stock_selling.pack(side="left", padx=5)

purchase_mode = ctk.BooleanVar(value=False)
purchase_checkbox = ctk.CTkCheckBox(top_row, text="Purchased", variable=purchase_mode)
purchase_checkbox.pack(side="left", padx=10)

# === Row 2: Reserved space for IMEI + Seller
extra_fields_frame = ctk.CTkFrame(form_frame, fg_color="transparent", height=30)
extra_fields_frame.pack(pady=(5, 0))  # Always packed, reserved height

stock_imei = ctk.CTkEntry(extra_fields_frame, placeholder_text="Phone number", width=180)
stock_seller = ctk.CTkEntry(extra_fields_frame, placeholder_text="Seller Name", width=180)

def update_extra_fields(*args):
    is_purchase = purchase_mode.get()
    is_phone = stock_type.get().lower() == "phone"

    for widget in extra_fields_frame.winfo_children():
        widget.pack_forget()

    if is_purchase and is_phone:
        stock_imei.pack(side="left", padx=5)
        stock_seller.pack(side="left", padx=5)

purchase_checkbox.configure(command=update_extra_fields)
stock_type.configure(command=update_extra_fields)
# === KEYBOARD NAVIGATION ===
def focus_next_stock_field(event=None):
    event.widget.tk_focusNext().focus()
    return "break"

stock_name.bind("<Return>", lambda e: stock_qty.focus_set())
stock_qty.bind("<Return>", lambda e: stock_bought.focus_set())
stock_bought.bind("<Return>", lambda e: stock_selling.focus_set())
stock_selling.bind("<Return>", focus_next_stock_field)

def add_stock_product():
    try:
        name = stock_name.get().strip()
        type_ = stock_type.get().strip()
        try:
            qty = int(stock_qty.get().strip())
        except ValueError:
            messagebox.showerror("Error", "Quantity must be a number")
            return
        bought = int(stock_bought.get().strip())
        selling = int(stock_selling.get().strip())
        is_purchase = purchase_mode.get()

        if not name or not type_:
            raise ValueError("Missing product name or type")

        # Validate phone-specific fields if it's a purchase
        imei = ""
        seller = ""
        if is_purchase and type_.lower() == "phone":
            imei = stock_imei.get().strip()
            seller = stock_seller.get().strip()
            if not imei:
                raise ValueError("IMEI is required for phone purchases")
            if not seller:
                raise ValueError("Seller name is required for phone purchases")

        # Add or update stock
        c.execute("SELECT id, qty FROM stock WHERE product = ? AND type = ?", (name, type_))
        existing = c.fetchone()
        if existing:
            c.execute("""
                UPDATE stock SET qty = qty + ?, bought_price = ?, selling_price = ? WHERE id = ?
            """, (qty, bought, selling, existing[0]))
        else:
            c.execute("""
                INSERT INTO stock (product, type, qty, bought_price, selling_price)
                VALUES (?, ?, ?, ?, ?)
            """, (name, type_, qty, bought, selling))

        # If purchased, add to purchases and update base cash
        if is_purchase:
            c.execute("""
                INSERT INTO purchases (timestamp, product, category, quantity, cost, imei, seller)
                VALUES (DATETIME('now'), ?, ?, ?, ?, ?, ?)
            """, (name, type_, qty, bought, imei or None, seller or None))
            c.execute("UPDATE base_cash SET amount = amount - ?", (qty * bought,))

        conn.commit()
        messagebox.showinfo("✅ Added", "Stock added successfully.")

        # Clear form
        stock_name.delete(0, "end")
        stock_qty.delete(0, "end")
        stock_bought.delete(0, "end")
        stock_selling.delete(0, "end")
        if 'stock_imei' in globals():
            stock_imei.delete(0, "end")
        if 'stock_seller' in globals():
            stock_seller.delete(0, "end")

        # Reset filters and search
        search_stock_var.set("")
        search_entry.delete(0, "end")
        search_entry.configure(text_color="gray")
        search_entry.insert(0, "Search product...")
        low_stock_var.set(False)
        worse_selling_var.set(False)
        best_selling_var.set(False)

        # Reset pagination and reload
        global stock_page
        stock_page = 0
        load_stock_table(0)  # Force reload to page 0
        update_dashboard()

    except Exception as e:
        messagebox.showerror("❌ Error", str(e))


ctk.CTkButton(top_row, text="➕ Add to Stock", command=add_stock_product,
              fg_color="#43a047", hover_color="#388e3c", text_color="white").pack(side="left", padx=10)


search_stock_var = ctk.StringVar()
search_stock_var.set("")

stock_filters_frame = ctk.CTkFrame(stock, fg_color="transparent")
stock_filters_frame.pack(pady=5)

search_entry = ctk.CTkEntry(stock_filters_frame, width=200)
search_entry.insert(0, "Search product...")
search_entry.configure(text_color="gray")
search_entry.pack(side="left", padx=5)

# Add these functions for search field behavior
def handle_focus_in(e):
    if search_entry.get() == "Search product...":
        search_entry.delete(0, "end")
        search_entry.configure(text_color="white")

def handle_focus_out(e):
    if not search_entry.get():
        search_entry.insert(0, "Search product...")
        search_entry.configure(text_color="gray")

def handle_stock_search(e):
    # Reset to first page when searching
    global stock_page
    stock_page = 0  # Reset page counter
    load_stock_table(0, force=True)

def set_stock_page(page_num):
    global stock_page
    stock_page = page_num

search_entry.bind("<FocusIn>", handle_focus_in)
search_entry.bind("<FocusOut>", handle_focus_out)

low_stock_var = ctk.BooleanVar()
worse_selling_var = ctk.BooleanVar()
best_selling_var = ctk.BooleanVar()

ctk.CTkCheckBox(stock_filters_frame, text="Low Stock", variable=low_stock_var,
                command=lambda: (set_stock_page(0), load_stock_table())).pack(side="left", padx=5)

def toggle_worst_selling():
    if worse_selling_var.get():
        best_selling_var.set(False)
    set_stock_page(0)
    load_stock_table()

def toggle_best_selling():
    if best_selling_var.get():
        worse_selling_var.set(False)
    set_stock_page(0)
    load_stock_table()

ctk.CTkCheckBox(stock_filters_frame, text="Worst Selling", variable=worse_selling_var,
                command=toggle_worst_selling).pack(side="left", padx=5)

ctk.CTkCheckBox(stock_filters_frame, text="Best Selling", variable=best_selling_var,
                command=toggle_best_selling).pack(side="left", padx=5)

def on_filter_change():
    load_stock_table(0)

search_entry.bind("<KeyRelease>", handle_stock_search)


stock_table_frame = ctk.CTkFrame(stock)
stock_table_frame.pack(fill="both", expand=True, padx=20, pady=10)

def edit_stock_entry_popup(event):
    selected = stock_tree.focus()
    if not selected:
        return

    values = stock_tree.item(selected, "values")
    stock_id = selected
    real_values = [
    values[0],  # Product
    values[1],  # Type
    values[2],  # Qty (should already be plain)
    values[3].replace(" ", ""),  # Bought price
    values[5].replace(" ", "")   # Selling price
    ]
    popup = ctk.CTkToplevel()
    popup.title("Edit Stock")
    popup.geometry("400x450")
    popup.grab_set()

    labels = ["Product", "Type", "Qty", "Bought Price", "Selling Price"]
    placeholders = ["Product", "Type", "Qty", "Bought", "Selling"]
    entries = []

    for i in range(len(labels)):
        ctk.CTkLabel(popup, text=labels[i], font=info_font).pack(pady=(10 if i == 0 else 5, 0))
        entry = ctk.CTkEntry(popup, placeholder_text=placeholders[i], width=250)
        entry.insert(0, real_values[i])
        entry.pack(pady=5)
        entries.append(entry)

    def save_changes():
        try:
            new_product = entries[0].get().strip()
            new_type = entries[1].get().strip()
            new_qty = int(entries[2].get().strip())
            new_bought = int(entries[3].get().strip())
            new_selling = int(entries[4].get().strip())

            c.execute("""
                UPDATE stock
                SET product = ?, type = ?, qty = ?, bought_price = ?, selling_price = ?
                WHERE id = ?
            """, (new_product, new_type, new_qty, new_bought, new_selling, stock_id))
            conn.commit()
            popup.destroy()
            load_stock_table(0)
            update_dashboard()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def delete_entry():
        confirm = messagebox.askyesno("Confirm", "Delete this stock item?")
        if not confirm:
            return
        c.execute("DELETE FROM stock WHERE id = ?", (stock_id,))
        conn.commit()
        popup.destroy()
        load_stock_table(0)
        update_dashboard()

    # Buttons
    btn_frame = ctk.CTkFrame(popup, fg_color="transparent")
    btn_frame.pack(pady=15)

    ctk.CTkButton(btn_frame, text="💾 Save", command=save_changes,
                  fg_color="#43a047", hover_color="#2e7d32").pack(side="left", padx=10)
    ctk.CTkButton(btn_frame, text="🗑 Delete", command=delete_entry,
                  fg_color="#e53935", hover_color="#b71c1c").pack(side="left", padx=10)

import tkinter.ttk as ttk

stock_tree = ttk.Treeview(
    stock_table_frame,
    columns=("product", "type", "qty", "bought", "total", "selling", "profit", "total_profit", "sold"),
    show="headings",
    height=12
)

stock_tree.heading("product", text="Product")
stock_tree.column("product", width=160)

stock_tree.heading("type", text="Type")
stock_tree.column("type", width=100)

stock_tree.heading("qty", text="Qty")
stock_tree.column("qty", width=10)

stock_tree.heading("bought", text="Bought")
stock_tree.column("bought", width=100)

stock_tree.heading("total", text="Total Bought")
stock_tree.column("total", width=100)

stock_tree.heading("selling", text="Selling")
stock_tree.column("selling", width=100)

stock_tree.heading("profit", text="Profit")
stock_tree.column("profit", width=100)

stock_tree.heading("total_profit", text="Total Profit")
stock_tree.column("total_profit", width=100)

stock_tree.heading("sold", text="Qty Sold")
stock_tree.column("sold", width=40)

stock_tree.pack(fill="both", expand=True, padx=10, pady=10)
stock_tree.tag_configure('even', background="#2a2a2a")
stock_tree.tag_configure('odd', background="#1f1f1f")

# === PART 3: Add total row summary ===
total_summary_label = ctk.CTkLabel(stock_table_frame, text="", font=("Segoe UI", 12, "bold"))
total_summary_label.pack(pady=(0, 10))

stock_tree.bind("<Double-1>", edit_stock_entry_popup)

# === Pagination Controls ===
nav_frame = ctk.CTkFrame(pages["stock"], fg_color="transparent")
nav_frame.pack(pady=5)

stock_page_lbl = ctk.CTkLabel(nav_frame, text="Page 1")
stock_page_lbl.pack(side="left", padx=10)

ctk.CTkButton(nav_frame, text="⬅ Prev", command=lambda: load_stock_table(-1),
              fg_color="#37474f", hover_color="#263238", text_color="white").pack(side="left", padx=5)
ctk.CTkButton(nav_frame, text="Next ➡", command=lambda: load_stock_table(1),
              fg_color="#37474f", hover_color="#263238", text_color="white").pack(side="left", padx=5)

stock_page = 0

app_initialized = False
def initialize_app():
    global app_initialized
    
    # Load initial data
    load_today_sales()
    update_dashboard()
    
    # Start on dashboard
    show_page("dashboard")
    
    # Set focus to product field
    qs_product.focus_set()
    
    # Set flag and load stock after UI is ready
    app.after(500, lambda: [
        setattr(globals(), 'app_initialized', True),
        load_stock_table(0, force=True)
    ])
def load_stock_table(page_delta=0, force=False):
    global stock_page, app_initialized
    from helpers import get_setting
    if force:
        stock_page = 0
        page_delta = 0
    if not force and not app_initialized:
        return
    low_stock_qty = int(get_setting("low_stock_qty", 2))
    high_stock_sales = int(get_setting("high_stock_sales", 8))
    available_height = stock_tree.winfo_height()
    estimated_row_height = 28
    rows_per_page = max(1, (available_height // estimated_row_height) - 1)
    
    c.execute("""
    SELECT product, category, COUNT(*) 
    FROM quick_sales 
    GROUP BY product, category
    """)
    sales_map = {(p, c): count for p, c, count in c.fetchall()}

    temp_page = stock_page + page_delta
    if temp_page < 0:
        return

    offset = temp_page * rows_per_page

    search_term = search_entry.get().strip().lower()
    if search_term == "search product...":
        search_term = ""

    try:
        # ✅ Precompute monthly sales count per (product, category)
        c.execute("""
            SELECT product, category, COUNT(*) 
            FROM quick_sales 
            WHERE timestamp >= DATE('now', '-1 month') 
            GROUP BY product, category
        """)
        sales_map = {(p, c): count for p, c, count in c.fetchall()}

        query = """
            SELECT s.id, s.product, s.type, s.qty, s.bought_price, 
                   (s.qty * s.bought_price) AS total_bought, 
                   s.selling_price, 
                   (s.selling_price - s.bought_price) AS profit,
                   (s.qty * (s.selling_price - s.bought_price)) AS total_profit
            FROM stock s
        """
        filters = []
        params = []

        if search_term:
            filters.append("(LOWER(s.product) LIKE ? OR LOWER(s.type) LIKE ?)")
            params.extend([f"%{search_term}%", f"%{search_term}%"])

        if low_stock_var.get():
            filters.append("(s.qty < ? AND LOWER(s.type) != 'phone')")
            params.append(low_stock_qty)
        if filters:
            query += " WHERE " + " AND ".join(filters)

        c.execute(query, params)
        all_rows = c.fetchall()

        # ✅ Python-side filtering for best/worst
        if worse_selling_var.get():
            all_rows = [row for row in all_rows if sales_map.get((row[1], row[2]), 0) == 0]
        elif best_selling_var.get():
            all_rows = [row for row in all_rows if sales_map.get((row[1], row[2]), 0) >= high_stock_sales]

        start_idx = offset
        end_idx = offset + rows_per_page
        page_rows = all_rows[start_idx:end_idx]

        if page_delta > 0 and not page_rows:
            return
        if not page_rows and temp_page != 0:
            return

        stock_page = temp_page
        stock_tree.delete(*stock_tree.get_children())

        for i, row in enumerate(page_rows):
            tag = 'even' if i % 2 == 0 else 'odd'
            qty_sold = sales_map.get((row[1], row[2]), 0)
            formatted_row = (
                row[1],  # product
                row[2],  # type
                int(row[3]),  # qty
                f"{int(row[4]):,}".replace(",", " "),  # bought_price
                f"{int(row[5]):,}".replace(",", " "),  # total_bought
                f"{int(row[6]):,}".replace(",", " "),  # selling_price
                f"{int(row[7]):,}".replace(",", " "),  # profit
                f"{int(row[8]):,}".replace(",", " "),  # total_profit
                qty_sold
            )
            stock_tree.insert("", "end", values=formatted_row, tags=(tag,), iid=row[0])

        stock_page_lbl.configure(text=f"Page {stock_page + 1} of {max(1, (len(all_rows) // rows_per_page) + 1)}")

        if all_rows:
            total_qty = sum(int(row[3]) for row in all_rows)
            total_bought = sum(int(row[5]) for row in all_rows)
            total_profit = sum(int(row[8]) for row in all_rows)
            total_sold_qty = sum(sales_map.get((row[1], row[2]), 0) for row in all_rows)
        else:
            total_qty, total_bought, total_profit,total_sold_qty = 0, 0, 0,0
       
        total_summary_label.configure(
            text=f"Total Items: {len(all_rows)}          Total Qty: {total_qty}          Total Value: {int(total_bought):,}".replace(",", " ") + " DA          Total Profit: " + f"{int(total_profit):,}".replace(",", " ") + f" DA          Sold: {total_sold_qty}"
        )

    except Exception as e:
        print("ERROR while loading stock table:", e)


stock_tree.bind("<Configure>", lambda e: load_stock_table(0))

def on_stock_resize(event):
    global app_initialized
    if 'app_initialized' in globals() and app_initialized:
        load_stock_table(0)

stock_tree.bind("<Configure>", on_stock_resize)

# === Initialize the app ===
def initialize_app():
    global app_initialized
    
    # Initial load with fixed rows
    load_stock_table(0, force=True)
    
    # Other initialization code...
    load_today_sales()
    update_dashboard()
    load_versement_entries()
    show_page("dashboard")
    qs_product.focus_set()
    
    # Enable dynamic resizing after UI is ready
    app.after(500, lambda: globals().update({'app_initialized': True}))

# === Run the application ===
def init_callback():
    initialize_app()
    app_initialized = True

app.after(500, init_callback)
app.mainloop()