import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDownWideNarrow, ArrowUpDown, Eye, Filter, Folder, Package, PackageX, Search, X,
} from "lucide-react";
import type { MobileBundle, MobileLanguage, MobileRow } from "../mobileApi";

type ViewMode = "products" | "categories";
type SortMode = "quantity" | "name" | "price";
type Labels = {
  products: string; search: string; categories: string; category: string; allCategories: string; filters: string; actualProfit: string;
  lowStock: string; outOfStock: string; noBarcode: string; bestSelling: string; worstSelling: string;
  clear: string; quantity: string; bought: string; selling: string; unitProfit: string; sold: string;
  actions: string; view: string; productCount: string; totalQuantity: string; stockCost: string;
  stockValue: string; potentialProfit: string; pageSize: string; page: string; of: string;
  previous: string; next: string; empty: string; productInfo: string; barcode: string; type: string;
  purchaseHistory: string; salesHistory: string; close: string; lowStockNote: string; availableHistory: string;
};
const LABELS: Record<MobileLanguage, Labels> = {
  en: {
    products:"Products",search:"Search",categories:"Categories",category:"Category",allCategories:"All categories",filters:"Filters",
    lowStock:"Low stock (≤5)",outOfStock:"Out of stock",noBarcode:"No barcode",bestSelling:"Best selling",worstSelling:"Worst selling",
    clear:"Clear filters",quantity:"Quantity",bought:"Bought price",selling:"Selling price",unitProfit:"Unit profit",sold:"Sold*",
    actions:"Sort",view:"View details",actualProfit:"Sales profit*",productCount:"Products",totalQuantity:"Total quantity",stockCost:"Stock cost",stockValue:"Selling value",
    potentialProfit:"Potential profit",pageSize:"Rows per page",page:"Page",of:"of",previous:"Previous",next:"Next",
    empty:"No products match these filters.",productInfo:"Product information",barcode:"Barcode",type:"Type",
    purchaseHistory:"Purchase history",salesHistory:"Sales history",close:"Close",
    lowStockNote:"Low-stock threshold is set to 5 because the desktop setting isn't synced to the PWA.",
    availableHistory:"*Sold quantity and linked histories use only the sales records currently available in the PWA, not guaranteed lifetime totals.",
  },
  fr: {
    products:"Produits",search:"Rechercher",categories:"Catégories",category:"Catégorie",allCategories:"Toutes les catégories",filters:"Filtres",
    lowStock:"Stock faible (≤5)",outOfStock:"Rupture de stock",noBarcode:"Sans code-barres",bestSelling:"Meilleures ventes",worstSelling:"Ventes les plus faibles",
    clear:"Effacer les filtres",quantity:"Quantité",bought:"Prix d’achat",selling:"Prix de vente",unitProfit:"Marge unitaire",sold:"Vendus*",
    actions:"Trier",view:"Voir les détails",actualProfit:"Bénéfice des ventes*",productCount:"Produits",totalQuantity:"Quantité totale",stockCost:"Coût du stock",stockValue:"Valeur de vente",
    potentialProfit:"Bénéfice potentiel",pageSize:"Lignes par page",page:"Page",of:"sur",previous:"Précédent",next:"Suivant",
    empty:"Aucun produit ne correspond à ces filtres.",productInfo:"Informations produit",barcode:"Code-barres",type:"Type",
    purchaseHistory:"Historique des achats",salesHistory:"Historique des ventes",close:"Fermer",
    lowStockNote:"Le seuil de stock faible est fixé à 5, car le réglage du bureau n’est pas synchronisé avec la PWA.",
    availableHistory:"*Les quantités vendues et historiques liés utilisent uniquement les ventes disponibles dans la PWA ; le total historique complet n’est pas garanti.",
  },
  ar: {
    products:"المنتجات",search:"بحث",categories:"الفئات",category:"الفئة",allCategories:"كل الفئات",filters:"الفلاتر",
    lowStock:"مخزون منخفض (≤5)",outOfStock:"نفد المخزون",noBarcode:"بدون باركود",bestSelling:"الأكثر مبيعاً",worstSelling:"الأقل مبيعاً",
    clear:"مسح الفلاتر",quantity:"الكمية",bought:"سعر الشراء",selling:"سعر البيع",unitProfit:"ربح الوحدة",sold:"المباع*",
    actions:"ترتيب",view:"عرض التفاصيل",actualProfit:"ربح المبيعات*",productCount:"المنتجات",totalQuantity:"إجمالي الكمية",stockCost:"تكلفة المخزون",stockValue:"قيمة البيع",
    potentialProfit:"الربح المحتمل",pageSize:"عدد الصفوف",page:"صفحة",of:"من",previous:"السابق",next:"التالي",
    empty:"لا توجد منتجات تطابق الفلاتر.",productInfo:"معلومات المنتج",barcode:"الباركود",type:"النوع",
    purchaseHistory:"سجل المشتريات",salesHistory:"سجل المبيعات",close:"إغلاق",
    lowStockNote:"تم اعتماد حد 5 وحدات للمخزون المنخفض لأن إعداد سطح المكتب غير متاح في تطبيق الهاتف.",
    availableHistory:"*الكميات المباعة والسجلات المرتبطة تعتمد فقط على سجلات المبيعات المتاحة حالياً في التطبيق.",
  },
};
const num = (value: unknown): number => { const parsed = typeof value === "number" ? value : Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; };
const str = (value: unknown): string => value == null ? "" : String(value);
const money = (amountDA: number, language: MobileLanguage): string => new Intl.NumberFormat(language === "ar" ? "ar-DZ" : language === "fr" ? "fr-DZ" : "en", { maximumFractionDigits: 2 }).format(amountDA) + " DA";
const dateLabel = (value: unknown, language: MobileLanguage): string => {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(date);
};
const productKey = (row: MobileRow): string => str(row.source_id ?? row.id);
export function StockSection({ data, language, query, onQueryChange }: { data: MobileBundle; language: MobileLanguage; query: string; onQueryChange: (query: string) => void }) {
  const t = LABELS[language];
  const [view, setView] = useState<ViewMode>("products");
  const [category, setCategory] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [outOfStock, setOutOfStock] = useState(false);
  const [noBarcode, setNoBarcode] = useState(false);
  const [salesSort, setSalesSort] = useState<"none" | "best" | "worst">("none");
  const [sort, setSort] = useState<SortMode>("quantity");
  const [pageSize, setPageSize] = useState(7);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MobileRow | null>(null);
  const [activeProductName, setActiveProductName] = useState<string | null>(null);
  const [activeProductNamePosition, setActiveProductNamePosition] = useState<{ top: number; left: number } | null>(null);
  const [stockTableScrolled, setStockTableScrolled] = useState(false);
  useEffect(() => setPage(1), [query, category, lowStock, outOfStock, noBarcode, salesSort, sort, pageSize, view]);
  useEffect(() => {
    if (!activeProductName) return;
    const dismissOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(".stock-product-name-wrap")) return;
      setActiveProductName(null);
      setActiveProductNamePosition(null);
    };
    const dismissOnViewportChange = () => {
      setActiveProductName(null);
      setActiveProductNamePosition(null);
    };
    document.addEventListener("pointerdown", dismissOnOutsideClick);
    window.addEventListener("scroll", dismissOnViewportChange, true);
    window.addEventListener("resize", dismissOnViewportChange);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsideClick);
      window.removeEventListener("scroll", dismissOnViewportChange, true);
      window.removeEventListener("resize", dismissOnViewportChange);
    };
  }, [activeProductName]);

  const salesMetrics = useMemo(() => {
    const productsById = new Map(data.products.map((product) => [productKey(product), product]));
    const metrics = new Map<string, { sold: number; profit: number }>();
    for (const item of data.sale_items) {
      const key = str(item.product_source_id);
      if (!key) continue;
      const product = productsById.get(key);
      const bought = item.bought_price == null ? num(product?.bought_price) : num(item.bought_price);
      const metric = metrics.get(key) ?? { sold: 0, profit: 0 };
      metric.sold += num(item.quantity);
      metric.profit += (num(item.price) - bought) * num(item.quantity);
      metrics.set(key, metric);
    }
    return metrics;
  }, [data.products, data.sale_items]);
  const filteredProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return data.products.filter((product) => {
      if (term && !str(product.name).toLocaleLowerCase().includes(term) && !str(product.codebar).toLocaleLowerCase().includes(term)) return false;
      if (category && str(product.category_name) !== category) return false;
      const quantity = num(product.quantity);
      if (lowStock && !(quantity > 0 && quantity <= 5)) return false;
      if (outOfStock && quantity !== 0) return false;
      if (noBarcode && str(product.codebar).trim()) return false;
      return true;
    }).sort((a, b) => {
      if (salesSort === "best") return (salesMetrics.get(productKey(b))?.sold ?? 0) - (salesMetrics.get(productKey(a))?.sold ?? 0);
      if (salesSort === "worst") return (salesMetrics.get(productKey(a))?.sold ?? 0) - (salesMetrics.get(productKey(b))?.sold ?? 0);
      if (sort === "name") return str(a.name).localeCompare(str(b.name));
      if (sort === "price") return num(b.selling_price) - num(a.selling_price);
      return num(b.quantity) - num(a.quantity);
    });
  }, [data.products, query, category, lowStock, outOfStock, noBarcode, salesSort, sort, salesMetrics]);

  const categories = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const grouped = new Map<string, { count: number; quantity: number; bought: number; selling: number }>();
    for (const product of data.products) {
      const name = str(product.category_name) || "—";
      const entry = grouped.get(name) ?? { count: 0, quantity: 0, bought: 0, selling: 0 };
      entry.count += 1;
      entry.quantity += num(product.quantity);
      entry.bought += num(product.quantity) * num(product.bought_price);
      entry.selling += num(product.quantity) * num(product.selling_price);
      grouped.set(name, entry);
    }
    return [...grouped.entries()].filter(([name]) => !term || name.toLocaleLowerCase().includes(term))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, values]) => ({ name, ...values, potential: values.selling - values.bought }));
  }, [data.products, query]);

  const totalPages = Math.max(1, Math.ceil((view === "products" ? filteredProducts.length : categories.length) / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleCategories = categories.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeFilters = lowStock || outOfStock || noBarcode || Boolean(category) || salesSort !== "none";
  const linkedPurchaseItems = selected ? data.purchase_items.filter((item) => str(item.product_source_id) === productKey(selected)) : [];
  const linkedSaleItems = selected ? data.sale_items.filter((item) => str(item.product_source_id) === productKey(selected)) : [];

  return <div className="stock-replica" dir={language === "ar" ? "rtl" : "ltr"}>
    <div className="stock-view-switch" role="tablist" aria-label={t.products}>
      <button type="button" role="tab" aria-selected={view === "products"} className={view === "products" ? "active" : ""} onClick={() => setView("products")}><Package size={16} />{t.products}</button>
      <button type="button" role="tab" aria-selected={view === "categories"} className={view === "categories" ? "active" : ""} onClick={() => setView("categories")}><Folder size={16} />{t.categories}</button>
    </div>
    {view === "products" ? <>
      <div className="stock-filter-row stock-filter-primary-row" aria-label={t.filters}>
        <label className="mobile-select-control stock-filter-category"><span>{t.category}</span><select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">{t.allCategories}</option>
          {data.categories.map((row) => <option key={str(row.source_id ?? row.name)} value={str(row.name)}>{str(row.name)}</option>)}
          {!data.categories_available ? [...new Set(data.products.map((row) => str(row.category_name)).filter(Boolean))].map((name) => <option key={name} value={name}>{name}</option>) : null}
        </select></label>
        <label className="mobile-select-control stock-filter-sort"><span>{t.actions}</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} disabled={salesSort !== "none"}><option value="quantity">{t.quantity} ↓</option><option value="name">A–Z</option><option value="price">{t.selling} ↓</option></select></label>
        <label className="mobile-select-control stock-filter-pagesize"><span>{t.pageSize}</span><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{[7,10,15,20,50].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
      </div>
      <div className="stock-filter-toggle-row">
        <button type="button" className={`stock-filter-toggle ${filtersOpen || activeFilters ? "active" : ""}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><Filter size={16} />{t.filters}<span className="stock-filter-toggle-count">{activeFilters ? "•" : ""}</span><span aria-hidden="true" className={`stock-filter-toggle-chevron ${filtersOpen ? "open" : ""}`}>⌄</span></button>
      </div>
      {filtersOpen ? <div className="stock-filter-row stock-filter-options-row" aria-label={t.filters}>
        <button type="button" className={`stock-filter-chip ${lowStock ? "selected" : ""}`} onClick={() => { setLowStock((v) => !v); if (!lowStock) setOutOfStock(false); }}><AlertTriangle size={15} />{t.lowStock}</button>
        <button type="button" className={`stock-filter-chip ${outOfStock ? "selected danger" : ""}`} onClick={() => { setOutOfStock((v) => !v); if (!outOfStock) setLowStock(false); }}><PackageX size={15} />{t.outOfStock}</button>
        <button type="button" className={`stock-filter-chip ${noBarcode ? "selected" : ""}`} onClick={() => setNoBarcode((v) => !v)}><Filter size={15} />{t.noBarcode}</button>
        <button type="button" className={`stock-filter-chip ${salesSort === "best" ? "selected" : ""}`} onClick={() => setSalesSort((v) => v === "best" ? "none" : "best")}><ArrowDownWideNarrow size={15} />{t.bestSelling}</button>
        <button type="button" className={`stock-filter-chip ${salesSort === "worst" ? "selected" : ""}`} onClick={() => setSalesSort((v) => v === "worst" ? "none" : "worst")}><ArrowUpDown size={15} />{t.worstSelling}</button>
        {activeFilters ? <button type="button" className="stock-filter-chip stock-clear-filters" onClick={() => { setCategory(""); setLowStock(false); setOutOfStock(false); setNoBarcode(false); setSalesSort("none"); }}>{t.clear}<X size={14} /></button> : null}
      </div> : null}
      <label className="mobile-search stock-search-row">
        <Search size={18} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t.search} aria-label={t.search} />
      </label>
      {lowStock ? <p className="stock-filter-note">{t.lowStockNote}</p> : null}
      {filteredProducts.length === 0 ? <p className="mobile-empty">{t.empty}</p> : <div className={"stock-table-scroll stock-product-table-scroll" + (stockTableScrolled ? " is-horizontally-scrolled" : "")} onScroll={(event) => setStockTableScrolled(event.currentTarget.scrollLeft !== 0)} role="region" aria-label={t.products} tabIndex={0}>
        <table className="stock-data-table">
          <thead><tr><th>{t.products}</th><th>{t.category}</th><th>{t.quantity}</th><th>{t.bought}</th><th>{t.selling}</th><th>{t.unitProfit}</th><th>{t.sold}</th><th>{t.actualProfit}</th><th>{t.view}</th></tr></thead>
          <tbody>{visibleProducts.map((product) => {
            const quantity = num(product.quantity), bought = num(product.bought_price), selling = num(product.selling_price);
            const metric = salesMetrics.get(productKey(product)) ?? { sold: 0, profit: 0 };
            const isOut = quantity === 0, isLow = quantity > 0 && quantity <= 5;
            return <tr className={isOut ? "is-out" : isLow ? "is-low" : ""} key={productKey(product)}>
              <td><div className="stock-table-product-name-wrap"><button type="button" className="stock-table-product-name" title={str(product.name)} aria-label={str(product.name) || "—"} aria-expanded={activeProductName === productKey(product)} onClick={(event) => { const key = productKey(product); if (activeProductName === key) { setActiveProductName(null); setActiveProductNamePosition(null); return; } const rect = event.currentTarget.getBoundingClientRect(); const tooltipWidth = Math.min(window.innerWidth * 0.84, 290); const left = Math.min(Math.max(rect.left + rect.width / 2, tooltipWidth / 2 + 8), window.innerWidth - tooltipWidth / 2 - 8); setActiveProductNamePosition({ top: rect.top - 8, left }); setActiveProductName(key); }}>{str(product.name) || "—"}</button><small>{str(product.codebar) || t.noBarcode}</small>{activeProductName === productKey(product) && activeProductNamePosition ? <div className="stock-product-name-tooltip" role="tooltip" style={{ top: activeProductNamePosition.top, left: activeProductNamePosition.left }}><div className="stock-product-tooltip-title">{str(product.name) || "—"}</div><div className="stock-product-tooltip-grid"><div><span>{t.quantity}</span><strong>{new Intl.NumberFormat(language).format(quantity)}</strong></div><div><span>{t.bought}</span><strong>{money(bought, language)}</strong></div><div><span>{t.selling}</span><strong>{money(selling, language)}</strong></div><div><span>{t.unitProfit}</span><strong className={selling >= bought ? "stock-positive" : "stock-negative"}>{money(selling - bought, language)}</strong></div></div></div> : null}</div></td>
              <td>{str(product.category_name) || "—"}</td>
              <td><span className={"stock-quantity-badge" + (isOut ? " out" : isLow ? " low" : "")}>{new Intl.NumberFormat(language).format(quantity)}</span></td>
              <td className="stock-money-cell">{money(bought, language)}</td>
              <td className="stock-money-cell">{money(selling, language)}</td>
              <td className={selling >= bought ? "stock-positive stock-money-cell" : "stock-negative stock-money-cell"}>{money(selling - bought, language)}</td>
              <td>{new Intl.NumberFormat(language).format(metric.sold)}</td>
              <td className={(metric.profit >= 0 ? "stock-positive" : "stock-negative") + " stock-money-cell"}>{money(metric.profit, language)}</td>
              <td><button type="button" className="stock-table-view" aria-label={t.view + ": " + str(product.name)} onClick={() => setSelected(product)}><Eye size={16} />{t.view}</button></td>
            </tr>;
          })}</tbody>

        </table>
      </div>}
    </> : <>
      <div className="stock-sort-row"><label className="mobile-select-control"><span>{t.pageSize}</span><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{[7,10,15,20,50].map((size) => <option key={size} value={size}>{size}</option>)}</select></label></div>
      {categories.length === 0 ? <p className="mobile-empty">{t.empty}</p> : <div className="stock-table-scroll" role="region" aria-label={t.categories} tabIndex={0}>
        <table className="stock-data-table stock-category-table">
          <thead><tr><th>{t.category}</th><th>{t.productCount}</th><th>{t.totalQuantity}</th><th>{t.stockCost}</th><th>{t.stockValue}</th><th>{t.potentialProfit}</th><th>{t.view}</th></tr></thead>
          <tbody>{visibleCategories.map((item) => <tr key={item.name}>
            <td>{item.name}</td><td>{new Intl.NumberFormat(language).format(item.count)}</td><td>{new Intl.NumberFormat(language).format(item.quantity)}</td>
            <td className="stock-money-cell">{money(item.bought, language)}</td><td className="stock-money-cell">{money(item.selling, language)}</td>
            <td className="stock-positive stock-money-cell">{money(item.potential, language)}</td>
            <td><button type="button" className="stock-table-view" onClick={() => { setCategory(item.name === "—" ? "" : item.name); setView("products"); }}><Eye size={16} />{t.view}</button></td>
          </tr>)}</tbody>

        </table>
      </div>}
    </>}
    {(view === "products" ? filteredProducts.length : categories.length) > 0 ? <div className="mobile-pagination">
      <button type="button" disabled={currentPage === 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>{t.previous}</button><span>{t.page} {currentPage} {t.of} {totalPages}</span>
      <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>{t.next}</button>
    </div> : null}
    {view === "products" && filteredProducts.length > 0 ? <div className="stock-table-totals" aria-label={t.products + " " + t.totalQuantity}>
      <div><span>{t.products}:</span><strong>{new Intl.NumberFormat(language).format(filteredProducts.length)}</strong></div>
      <div><span>{t.totalQuantity}:</span><strong>{new Intl.NumberFormat(language).format(filteredProducts.reduce((sum, product) => sum + num(product.quantity), 0))}</strong></div>
      <div><span>{t.stockCost}:</span><strong>{money(filteredProducts.reduce((sum, p) => sum + num(p.quantity) * num(p.bought_price), 0), language)}</strong></div>
      <div><span>{t.stockValue}:</span><strong>{money(filteredProducts.reduce((sum, p) => sum + num(p.quantity) * num(p.selling_price), 0), language)}</strong></div>
    </div> : view === "categories" && categories.length > 0 ? <div className="stock-table-totals" aria-label={t.categories + " " + t.totalQuantity}>
      <div><span>{t.categories}:</span><strong>{new Intl.NumberFormat(language).format(categories.length)}</strong></div>
      <div><span>{t.totalQuantity}:</span><strong>{new Intl.NumberFormat(language).format(categories.reduce((sum, item) => sum + item.quantity, 0))}</strong></div>
      <div><span>{t.stockCost}:</span><strong>{money(categories.reduce((sum, item) => sum + item.bought, 0), language)}</strong></div>
      <div><span>{t.stockValue}:</span><strong>{money(categories.reduce((sum, item) => sum + item.selling, 0), language)}</strong></div>
    </div> : null}
    {selected ? <div className="stock-modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section className="stock-detail-modal" role="dialog" aria-modal="true" aria-labelledby="stock-detail-title">
        <header><div><span>{t.productInfo}</span><h2 id="stock-detail-title">{str(selected.name) || "—"}</h2></div><button type="button" aria-label={t.close} onClick={() => setSelected(null)}><X size={20} /></button></header>
        <dl className="stock-detail-grid">
          <div><dt>{t.category}</dt><dd>{str(selected.category_name) || "—"}</dd></div>
          <div><dt>{t.quantity}</dt><dd>{new Intl.NumberFormat(language).format(num(selected.quantity))}</dd></div>
          <div><dt>{t.bought}</dt><dd>{money(num(selected.bought_price), language)}</dd></div>
          <div><dt>{t.selling}</dt><dd>{money(num(selected.selling_price), language)}</dd></div>
          <div><dt>{t.barcode}</dt><dd>{str(selected.codebar) || "—"}</dd></div>
          <div><dt>{t.type}</dt><dd>{str(selected.type) || "Product"}</dd></div>
        </dl>
        <h3>{t.purchaseHistory}</h3>
        {linkedPurchaseItems.length ? <div className="stock-history-list">{linkedPurchaseItems.slice(0,12).map((item,index) => {
          const purchase = data.purchases.find((row) => str(row.source_id) === str(item.purchase_source_id));
          return <div key={str(item.source_id) || index}><span>{dateLabel(purchase?.source_created_at ?? item.source_created_at,language)}</span><strong>{new Intl.NumberFormat(language).format(num(item.quantity))} × {money(num(item.price),language)}</strong></div>;
        })}</div> : <p className="stock-detail-muted">—</p>}
        <h3>{t.salesHistory}</h3>
        {linkedSaleItems.length ? <div className="stock-history-list">{linkedSaleItems.slice(0,12).map((item,index) => {
          const sale = data.sales.find((row) => str(row.source_id) === str(item.sale_source_id));
          return <div key={str(item.source_id) || index}><span>{dateLabel(sale?.source_created_at ?? item.source_updated_at,language)}</span><strong>{new Intl.NumberFormat(language).format(num(item.quantity))} × {money(num(item.price),language)}</strong></div>;
        })}</div> : <p className="stock-detail-muted">—</p>}
        <button type="button" className="stock-modal-close" onClick={() => setSelected(null)}>{t.close}</button>
      </section>
    </div> : null}
  </div>;
}
