import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDownWideNarrow, ArrowUpDown, Eye, Filter, Folder, Package, PackageX, X,
} from "lucide-react";
import type { MobileBundle, MobileLanguage, MobileRow } from "../mobileApi";

type ViewMode = "products" | "categories";
type SortMode = "quantity" | "name" | "price";
type Labels = {
  products: string; categories: string; category: string; allCategories: string; filters: string; actualProfit: string;
  lowStock: string; outOfStock: string; noBarcode: string; bestSelling: string; worstSelling: string;
  clear: string; quantity: string; bought: string; selling: string; unitProfit: string; sold: string;
  actions: string; view: string; productCount: string; totalQuantity: string; stockCost: string;
  stockValue: string; potentialProfit: string; pageSize: string; page: string; of: string;
  previous: string; next: string; empty: string; productInfo: string; barcode: string; type: string;
  purchaseHistory: string; salesHistory: string; close: string; lowStockNote: string; availableHistory: string;
};
const LABELS: Record<MobileLanguage, Labels> = {
  en: {
    products:"Products",categories:"Categories",category:"Category",allCategories:"All categories",filters:"Filters",
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
    products:"Produits",categories:"Catégories",category:"Catégorie",allCategories:"Toutes les catégories",filters:"Filtres",
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
    products:"المنتجات",categories:"الفئات",category:"الفئة",allCategories:"كل الفئات",filters:"الفلاتر",
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
const money = (centimes: number, language: MobileLanguage): string => new Intl.NumberFormat(language === "ar" ? "ar-DZ" : language === "fr" ? "fr-DZ" : "en", { maximumFractionDigits: 2 }).format(centimes / 100) + " DA";
const dateLabel = (value: unknown, language: MobileLanguage): string => {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(date);
};
const productKey = (row: MobileRow): string => str(row.source_id ?? row.id);
export function StockSection({ data, language, query }: { data: MobileBundle; language: MobileLanguage; query: string }) {
  const t = LABELS[language];
  const [view, setView] = useState<ViewMode>("products");
  const [category, setCategory] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [outOfStock, setOutOfStock] = useState(false);
  const [noBarcode, setNoBarcode] = useState(false);
  const [salesSort, setSalesSort] = useState<"none" | "best" | "worst">("none");
  const [sort, setSort] = useState<SortMode>("quantity");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MobileRow | null>(null);
  useEffect(() => setPage(1), [query, category, lowStock, outOfStock, noBarcode, salesSort, sort, pageSize, view]);

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
      entry.bought += num(product.quantity) * num(product.bought_price) / 100;
      entry.selling += num(product.quantity) * num(product.selling_price) / 100;
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
  const totals = filteredProducts.reduce((sum, product) => ({
    quantity: sum.quantity + num(product.quantity),
    bought: sum.bought + num(product.quantity) * num(product.bought_price) / 100,
    selling: sum.selling + num(product.quantity) * num(product.selling_price) / 100,
  }), { quantity: 0, bought: 0, selling: 0 });
  const activeFilters = lowStock || outOfStock || noBarcode || Boolean(category) || salesSort !== "none";
  const linkedPurchaseItems = selected ? data.purchase_items.filter((item) => str(item.product_source_id) === productKey(selected)) : [];
  const linkedSaleItems = selected ? data.sale_items.filter((item) => str(item.product_source_id) === productKey(selected)) : [];

  return <div className="stock-replica" dir={language === "ar" ? "rtl" : "ltr"}>
    <div className="stock-view-switch" role="tablist" aria-label={t.products}>
      <button type="button" role="tab" aria-selected={view === "products"} className={view === "products" ? "active" : ""} onClick={() => setView("products")}><Package size={16} />{t.products}</button>
      <button type="button" role="tab" aria-selected={view === "categories"} className={view === "categories" ? "active" : ""} onClick={() => setView("categories")}><Folder size={16} />{t.categories}</button>
    </div>
    {view === "products" ? <>
      <label className="stock-category-select mobile-select-control"><span>{t.category}</span><select value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="">{t.allCategories}</option>
        {data.categories.map((row) => <option key={str(row.source_id ?? row.name)} value={str(row.name)}>{str(row.name)}</option>)}
        {!data.categories_available ? [...new Set(data.products.map((row) => str(row.category_name)).filter(Boolean))].map((name) => <option key={name} value={name}>{name}</option>) : null}
      </select></label>
      <details className="stock-filter-details" open={activeFilters}>
        <summary><Filter size={16} />{t.filters}{activeFilters ? <span className="stock-filter-dot" /> : null}</summary>
        <div className="stock-filter-options">
          <button type="button" className={lowStock ? "selected" : ""} onClick={() => { setLowStock((v) => !v); if (!lowStock) setOutOfStock(false); }}><AlertTriangle size={15} />{t.lowStock}</button>
          <button type="button" className={outOfStock ? "selected danger" : ""} onClick={() => { setOutOfStock((v) => !v); if (!outOfStock) setLowStock(false); }}><PackageX size={15} />{t.outOfStock}</button>
          <button type="button" className={noBarcode ? "selected" : ""} onClick={() => setNoBarcode((v) => !v)}><Filter size={15} />{t.noBarcode}</button>
          <button type="button" className={salesSort === "best" ? "selected" : ""} onClick={() => setSalesSort((v) => v === "best" ? "none" : "best")}><ArrowDownWideNarrow size={15} />{t.bestSelling}</button>
          <button type="button" className={salesSort === "worst" ? "selected" : ""} onClick={() => setSalesSort((v) => v === "worst" ? "none" : "worst")}><ArrowUpDown size={15} />{t.worstSelling}</button>
        </div>
        {lowStock ? <p className="stock-filter-note">{t.lowStockNote}</p> : null}
        {activeFilters ? <button type="button" className="stock-clear-filters" onClick={() => { setCategory(""); setLowStock(false); setOutOfStock(false); setNoBarcode(false); setSalesSort("none"); }}>{t.clear}<X size={14} /></button> : null}
      </details>
      <div className="stock-sort-row">
        <label className="mobile-select-control"><span>{t.actions}</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} disabled={salesSort !== "none"}><option value="quantity">{t.quantity} ↓</option><option value="name">A–Z</option><option value="price">{t.selling} ↓</option></select></label>
        <label className="mobile-select-control"><span>{t.pageSize}</span><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{[5,10,25,50,100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
      </div>
      <div className="stock-summary-grid">
        <div><span>{t.products}</span><strong>{new Intl.NumberFormat(language).format(filteredProducts.length)}</strong></div>
        <div><span>{t.totalQuantity}</span><strong>{new Intl.NumberFormat(language).format(totals.quantity)}</strong></div>
        <div><span>{t.stockCost}</span><strong>{money(totals.bought * 100, language)}</strong></div>
        <div><span>{t.stockValue}</span><strong>{money(totals.selling * 100, language)}</strong></div>
      </div>
      {filteredProducts.length === 0 ? <p className="mobile-empty">{t.empty}</p> : <div className="stock-product-list">
        {visibleProducts.map((product) => {
          const quantity = num(product.quantity), bought = num(product.bought_price), selling = num(product.selling_price);
          const metric = salesMetrics.get(productKey(product)) ?? { sold: 0, profit: 0 };
          const sold = metric.sold;
          const isOut = quantity === 0, isLow = quantity > 0 && quantity <= 5;
          return <article className={"stock-product-card" + (isOut ? " is-out" : isLow ? " is-low" : "")} key={productKey(product)}>
            <div className="stock-product-top"><div className="stock-product-title"><h3>{str(product.name) || "—"}</h3><span>{str(product.category_name) || "—"}</span></div>
              <span className={"stock-quantity-badge" + (isOut ? " out" : isLow ? " low" : "")}>{new Intl.NumberFormat(language).format(quantity)} {t.quantity.toLocaleLowerCase()}</span></div>
            <div className="stock-product-values">
              <div><span>{t.bought}</span><strong>{money(bought, language)}</strong></div>
              <div><span>{t.selling}</span><strong>{money(selling, language)}</strong></div>
              <div><span>{t.unitProfit}</span><strong className={selling >= bought ? "stock-positive" : "stock-negative"}>{money(selling - bought, language)}</strong></div>
              <div><span>{t.sold}</span><strong>{new Intl.NumberFormat(language).format(sold)}</strong></div>
              <div><span>{t.actualProfit}</span><strong className={metric.profit >= 0 ? "stock-positive" : "stock-negative"}>{money(metric.profit, language)}</strong></div>
            </div>
            <div className="stock-product-footer"><span className="stock-barcode">{str(product.codebar) || t.noBarcode}</span><button type="button" onClick={() => setSelected(product)}><Eye size={16} />{t.view}</button></div>
          </article>;
        })}
      </div>}
      {filteredProducts.length > 0 ? <p className="stock-history-footnote">{t.availableHistory}</p> : null}
    </> : <>
      <div className="stock-sort-row"><label className="mobile-select-control"><span>{t.pageSize}</span><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{[5,10,25,50,100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label></div>
      <div className="stock-category-list">{visibleCategories.map((item) => <article className="stock-category-card" key={item.name}>
        <div className="stock-category-title"><Folder size={17} /><h3>{item.name}</h3></div>
        <div className="stock-product-values">
          <div><span>{t.productCount}</span><strong>{item.count}</strong></div>
          <div><span>{t.totalQuantity}</span><strong>{new Intl.NumberFormat(language).format(item.quantity)}</strong></div>
          <div><span>{t.stockCost}</span><strong>{money(item.bought * 100, language)}</strong></div>
          <div><span>{t.stockValue}</span><strong>{money(item.selling * 100, language)}</strong></div>
          <div><span>{t.potentialProfit}</span><strong className="stock-positive">{money(item.potential * 100, language)}</strong></div>
        </div>
        <button type="button" className="stock-category-view" onClick={() => { setCategory(item.name); setView("products"); }}><Eye size={15} />{t.view}</button>
      </article>)}{categories.length === 0 ? <p className="mobile-empty">{t.empty}</p> : null}</div>
    </>}
    {(view === "products" ? filteredProducts.length : categories.length) > 0 ? <div className="mobile-pagination">
      <button type="button" disabled={currentPage === 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>{t.previous}</button><span>{t.page} {currentPage} {t.of} {totalPages}</span>
      <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>{t.next}</button>
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
