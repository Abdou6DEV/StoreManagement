import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import {
  DashboardMetric,
  DashboardPanel,
  DASHBOARD_SERIES_COLORS,
} from "../../../src/lib/components/dashboardPresentation";
import type { MobileBundle, MobileLanguage, MobilePermissions, MobileRow } from "../mobileApi";

const OTHER_COLOR = "#6b7280";

const COPY = {
  en: {
    stock: "Stock statistics", clients: "Client statistics", services: "Service statistics",
    totalProducts: "Total products", totalQuantity: "Total quantity", stockCost: "Stock cost",
    stockValue: "Stock value", profitPotential: "Profit potential", lowStock: "Low stock",
    outOfStock: "Out of stock", averageMargin: "Average margin", marginPercent: "Average margin %",
    averageRoi: "Average ROI", noBarcode: "No barcode", worstSelling: "Worst-selling products",
    categories: "Top categories", products: "Top products", distributionNote: "Sales distribution requires History permission and complete sale-item data.",
    lowStockUnavailable: "Low-stock count unavailable: the desktop threshold is not included in mobile data.",
    clientsTotal: "Number of clients", activeClients: "Active clients (30 days)", inactiveClients: "Inactive clients", newClients: "New this month",
    retention: "Retention rate", unpaidCredit: "Unpaid credit", unpaidVersement: "Unpaid versement",
    paymentRate: "Payment rate", averageClientValue: "Average client value", creditSales: "Credit sales",
    normalSales: "Normal sales", paidCredits: "Paid credits", unpaidCredits: "Unpaid credits",
    topClients: "Top clients by revenue", others: "Others", clientsActivityUnavailable: "Sales-history permission and complete sales data are required for activity and revenue charts.",
    clientPaymentsUnavailable: "Complete payment data and linked sale totals are required for credit and payment metrics.",
    totalServices: "Total services", completed: "Completed", pending: "Pending", overdue: "Overdue",
    revenue: "Total revenue", cost: "Total cost", profit: "Total profit", turnaround: "Average turnaround",
    days: "days", completionRate: "Completion rate", serviceTypes: "Service types", serviceNames: "Service names",
    trends: "Trends", sixMonths: "6 months", twelveMonths: "12 months", allTime: "All time", currentMonthOnly: "Current month only",
    servicesUnavailable: "Service summary unavailable: the API's appointment limit was reached.",
    incomplete: "Summary hidden because the API record limit may have truncated this data.",
    count: "Count", valueLabel: "Value", share: "Share", salesCount: "sales", productsCount: "products", monthlyRevenue: "Revenue", monthlyProfit: "Profit", monthlyCompleted: "Completed",
    last365Days: "Last 365 days", chartEmpty: "No chart data to show.",
  },
  fr: {
    stock: "Statistiques du stock", clients: "Statistiques clients", services: "Statistiques des services",
    totalProducts: "Total des produits", totalQuantity: "Quantité totale", stockCost: "Coût du stock",
    stockValue: "Valeur du stock", profitPotential: "Profit potentiel", lowStock: "Stock faible",
    outOfStock: "Rupture de stock", averageMargin: "Marge moyenne", marginPercent: "Marge moyenne %",
    averageRoi: "ROI moyen", noBarcode: "Sans code-barres", worstSelling: "Produits les moins vendus",
    categories: "Meilleures catégories", products: "Meilleurs produits", distributionNote: "La répartition des ventes nécessite l’accès à l’historique et des articles complets.",
    lowStockUnavailable: "Seuil de stock faible indisponible dans les données mobiles.",
    clientsTotal: "Nombre de clients", activeClients: "Clients actifs (30 jours)", inactiveClients: "Clients inactifs", newClients: "Nouveaux ce mois",
    retention: "Taux de fidélisation", unpaidCredit: "Crédit impayé", unpaidVersement: "Versement impayé",
    paymentRate: "Taux de paiement", averageClientValue: "Valeur moyenne client", creditSales: "Ventes à crédit",
    normalSales: "Ventes normales", paidCredits: "Crédits payés", unpaidCredits: "Crédits impayés",
    topClients: "Meilleurs clients par chiffre d’affaires", others: "Autres", clientsActivityUnavailable: "L’accès à l’historique et des ventes complètes sont nécessaires pour les graphiques d’activité et de chiffre d’affaires.",
    clientPaymentsUnavailable: "Des paiements complets et les totaux des ventes liées sont requis pour les métriques de crédit.",
    totalServices: "Total des services", completed: "Terminés", pending: "En attente", overdue: "En retard",
    revenue: "Chiffre d’affaires", cost: "Coût total", profit: "Bénéfice total", turnaround: "Délai moyen",
    days: "jours", completionRate: "Taux de réalisation", serviceTypes: "Types de service", serviceNames: "Noms des services",
    trends: "Tendances", sixMonths: "6 mois", twelveMonths: "12 mois", allTime: "Tout", currentMonthOnly: "Mois en cours uniquement",
    servicesUnavailable: "Résumé indisponible : la limite de rendez-vous de l’API est atteinte.",
    incomplete: "Résumé masqué car la limite de l’API peut avoir tronqué les données.",
    count: "Nombre", valueLabel: "Valeur", share: "Part", salesCount: "ventes", productsCount: "produits", monthlyRevenue: "Chiffre d’affaires", monthlyProfit: "Bénéfice", monthlyCompleted: "Terminés",
    last365Days: "365 derniers jours", chartEmpty: "Aucune donnée graphique.",
  },
  ar: {
    stock: "إحصاءات المخزون", clients: "إحصاءات العملاء", services: "إحصاءات الخدمات",
    totalProducts: "إجمالي المنتجات", totalQuantity: "إجمالي الكمية", stockCost: "تكلفة المخزون",
    stockValue: "قيمة المخزون", profitPotential: "الربح المحتمل", lowStock: "مخزون منخفض",
    outOfStock: "نفد المخزون", averageMargin: "متوسط الهامش", marginPercent: "متوسط الهامش %",
    averageRoi: "متوسط العائد", noBarcode: "بلا باركود", worstSelling: "الأقل مبيعاً",
    categories: "أفضل الفئات", products: "أفضل المنتجات", distributionNote: "يتطلب توزيع المبيعات صلاحية السجل وبيانات عناصر كاملة.",
    lowStockUnavailable: "حد المخزون المنخفض غير متوفر في بيانات الهاتف.",
    clientsTotal: "عدد العملاء", activeClients: "عملاء نشطون (30 يوماً)", inactiveClients: "عملاء غير نشطين", newClients: "عملاء جدد هذا الشهر",
    retention: "معدل الاحتفاظ", unpaidCredit: "ائتمان غير مدفوع", unpaidVersement: "دفعة غير مدفوعة",
    paymentRate: "معدل الدفع", averageClientValue: "متوسط قيمة العميل", creditSales: "مبيعات ائتمانية",
    normalSales: "مبيعات عادية", paidCredits: "ائتمان مدفوع", unpaidCredits: "ائتمان غير مدفوع",
    topClients: "أفضل العملاء حسب الإيرادات", others: "أخرى", clientsActivityUnavailable: "يتطلب مخطط النشاط والإيرادات صلاحية السجل وبيانات مبيعات كاملة.",
    clientPaymentsUnavailable: "يتطلب حساب الائتمان بيانات دفع كاملة وإجماليات المبيعات المرتبطة.",
    totalServices: "إجمالي الخدمات", completed: "مكتمل", pending: "قيد الانتظار", overdue: "متأخر",
    revenue: "إجمالي الإيرادات", cost: "إجمالي التكلفة", profit: "إجمالي الربح", turnaround: "متوسط مدة الإنجاز",
    days: "أيام", completionRate: "معدل الإنجاز", serviceTypes: "أنواع الخدمات", serviceNames: "أسماء الخدمات",
    trends: "الاتجاهات", sixMonths: "6 أشهر", twelveMonths: "12 شهراً", allTime: "كل الوقت", currentMonthOnly: "الشهر الحالي فقط",
    servicesUnavailable: "الملخص غير متاح: تم بلوغ حد المواعيد في API.",
    incomplete: "أُخفي الملخص لاحتمال اقتطاع البيانات عند حد API.",
    count: "العدد", valueLabel: "القيمة", share: "النسبة", salesCount: "مبيعات", productsCount: "منتجات", monthlyRevenue: "الإيرادات", monthlyProfit: "الربح", monthlyCompleted: "مكتمل",
    last365Days: "آخر 365 يوماً", chartEmpty: "لا توجد بيانات للمخطط.",
  },
} as const;

type Slice = { key?: string; name: string; value: number; fill: string; detail?: string };

function number(value: number, language: MobileLanguage): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value);
}

function money(value: number, language: MobileLanguage): string {
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(Math.round(value))} DA`;
}

function value(row: MobileRow, key: string): number {
  return Number(row[key]) || 0;
}

function timestamp(row: MobileRow, key: string): Date | null {
  const date = new Date(String(row[key] ?? ""));
  return Number.isFinite(date.getTime()) ? date : null;
}

function StatGrid({
  items,
  language,
}: {
  items: Array<{ label: string; value: string | number }>;
  language: MobileLanguage;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
      {items.map((item) => (
        <DashboardMetric key={item.label} label={item.label} labelClassName="!text-xs">
          <strong className="text-lg font-bold tabular-nums text-foreground sm:text-xl">
            {typeof item.value === "number" ? number(item.value, language) : item.value}
          </strong>
        </DashboardMetric>
      ))}
    </div>
  );
}

function InteractivePie({
  data,
  language,
  valueFormat = "number",
  compact = false,
}: {
  data: Slice[];
  language: MobileLanguage;
  valueFormat?: "number" | "money";
  compact?: boolean;
}) {
  const [selectedSlice, setSelectedSlice] = useState<Slice | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const total = data.reduce((sum, row) => sum + row.value, 0);
  const copy = COPY[language];

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      if (!chartRef.current?.contains(event.target as Node)) {
        setSelectedSlice(null);
        setTooltipPosition(null);
      }
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    return () => document.removeEventListener("pointerdown", dismissOutside, true);
  }, []);

  const displayValue = (amount: number) => valueFormat === "money"
    ? money(amount, language)
    : number(amount, language);

  return (
    <div ref={chartRef} className={`mobile-dashboard-pie-chart ${compact ? "h-[220px]" : "h-[230px]"} min-w-0`} style={{ outline: "none" }} onClick={() => { setSelectedSlice(null); setTooltipPosition(null); }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart margin={{ top: 8, right: 10, bottom: 8, left: 10 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={0}
            outerRadius="74%"
            paddingAngle={0}
            stroke="none"
            strokeWidth={0}
            isAnimationActive={false}
            labelLine={false}
            label={({ cx, cy, midAngle, outerRadius, percent }) => {
              const centerX = Number(cx) || 0;
              const centerY = Number(cy) || 0;
              const radius = (Number(outerRadius) || 0) + 8;
              const angle = -(Number(midAngle) || 0) * Math.PI / 180;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);
              return (
                <text x={x} y={y} fill="var(--primary)" fontSize={11} fontWeight={800} textAnchor={x > centerX ? "start" : "end"} dominantBaseline="central" style={{ pointerEvents: "none", paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 2, strokeLinejoin: "round" }}>
                  {`${(Number(percent) * 100).toFixed(1)}%`}
                </text>
              );
            }}
          >
            {data.map((row, index) => (
              <Cell
                key={row.key ?? `${row.name}-${index}`}
                fill={row.fill}
                stroke="none"
                strokeWidth={0}
                style={{ outline: "none" }}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedSlice(row);
                  const tooltipWidth = Math.min(246, window.innerWidth - 16);
                  const chartBounds = chartRef.current?.getBoundingClientRect();
                  const chartCenterX = chartBounds ? chartBounds.left + chartBounds.width / 2 : window.innerWidth / 2;
                  const placeRight = event.clientX < chartCenterX;
                  const tooltipHeight = selectedSlice?.detail ? 190 : 125;
                  setTooltipPosition({
                    x: Math.max(8, Math.min(placeRight ? Math.max(event.clientX + 14, chartBounds?.right ?? 0) : Math.min(event.clientX - tooltipWidth - 14, (chartBounds?.left ?? window.innerWidth) - tooltipWidth), window.innerWidth - tooltipWidth - 8)),
                    y: Math.max(8, Math.min(event.clientY + 12, window.innerHeight - tooltipHeight - 8)),
                  });
                }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {selectedSlice && tooltipPosition ? createPortal(
        <div style={{ position: "fixed", left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 10000, minWidth: 150, maxWidth: "min(230px, calc(100vw - 16px))", border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", color: "var(--foreground)", padding: "11px 13px", boxShadow: "0 8px 24px rgba(0,0,0,0.24)", pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: selectedSlice.fill, flexShrink: 0, marginTop: 4 }} />
            <strong style={{ fontSize: 13, lineHeight: 1.35, overflowWrap: "anywhere" }}>{selectedSlice.name}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
            <span style={{ color: "var(--muted-foreground)" }}>{copy.valueLabel}</span>
            <strong style={{ fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{displayValue(selectedSlice.value)}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 4, fontSize: 12 }}>
            <span style={{ color: "var(--muted-foreground)" }}>{copy.share}</span>
            <strong style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{total > 0 ? `${(selectedSlice.value / total * 100).toFixed(1)}%` : "0%"}</strong>
          </div>
          {selectedSlice.detail ? <p style={{ marginTop: 8, paddingTop: 7, borderTop: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: 11, lineHeight: 1.5, overflowWrap: "anywhere" }}>{selectedSlice.detail}</p> : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function PieBreakdown({
  title,
  data,
  legendData,
  language,
  legendPercentageTotal,
  valueFormat = "number",
  compact = false,
}: {
  title: string;
  data: Slice[];
  legendData?: Slice[];
  language: MobileLanguage;
  legendPercentageTotal?: number;
  valueFormat?: "number" | "money";
  compact?: boolean;
}) {
  const dataTotal = data.reduce((sum, row) => sum + row.value, 0);
  const legendTotal = legendPercentageTotal ?? dataTotal;
  const legendRows = legendData ?? data;
  if (!data.length) return null;
  return (
    <section className={compact ? "min-w-0" : "mobile-dashboard-chart-section"}>
      <h3 className={`mb-2 text-base font-semibold text-foreground ${compact ? "text-center" : ""}`}>{title}</h3>
      <div className={compact ? "grid min-w-0 gap-2" : "grid min-w-0 gap-3 sm:grid-cols-2 sm:items-center"}>
        <InteractivePie data={data} language={language} valueFormat={valueFormat} compact={compact} />
        <div className={compact ? "grid grid-cols-1 gap-2" : "space-y-2"}>
          {legendRows.map((row, index) => (
            <div key={row.key ?? `${row.name}-${index}`} className="flex min-w-0 items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: row.fill }} />
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{row.name}</span>
                  {row.detail ? <span className="block truncate text-xs text-muted-foreground">{row.detail}</span> : null}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <strong className="tabular-nums">{valueFormat === "money" ? money(row.value, language) : number(row.value, language)}</strong>
                <span className="ml-2 text-xs text-muted-foreground">
                  {legendTotal > 0 ? `${((row.value / legendTotal) * 100).toFixed(1)}%` : "0%"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RadialBreakdown({
  title,
  rows,
  language,
}: {
  title: string;
  rows: Array<{ key: string; label: string; value: number; color: string }>;
  language: MobileLanguage;
}) {
  return (
    <PieBreakdown
      title={title}
      language={language}
      compact
      data={rows.map((row) => ({ key: row.key, name: row.label, value: row.value, fill: row.color }))}
    />
  );
}

function DataNotice({ children }: { children: string }) {
  return <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">{children}</p>;
}

export function MobileStockStats({
  data,
  permissions,
  language,
}: {
  data: MobileBundle;
  permissions: MobilePermissions;
  language: MobileLanguage;
}) {
  const copy = COPY[language];
  const [view, setView] = useState<"categories" | "products">("categories");
  const products = data.products;
  const productsComplete = products.length < 2000;
  const salesComplete = permissions.can_access_history && data.sales_history_available && data.sales.length < 5000;
  const itemsComplete = salesComplete && data.sale_items.length < 10000;
  const productMap = new Map(products.map((product) => [String(product.source_id), product]));
  const saleIds = new Set(data.sales.map((sale) => String(sale.source_id)));
  const soldByProduct = new Map<string, number>();
  for (const item of data.sale_items) {
    const productId = String(item.product_source_id ?? "");
    if (!productId || !productMap.has(productId) || !saleIds.has(String(item.sale_source_id))) continue;
    soldByProduct.set(productId, (soldByProduct.get(productId) ?? 0) + value(item, "quantity"));
  }
  const rankedProducts = [...soldByProduct.entries()]
    .flatMap(([id, sold]) => {
      const product = productMap.get(id);
      return product ? [{ id, sold, product }] : [];
    })
    .sort((a, b) => b.sold - a.sold);
  const categories = new Map<string, number>();
  const categoryProductCounts = new Map<string, number>();
  for (const row of rankedProducts) {
    const category = String(row.product.category_name ?? "");
    if (category) {
      categories.set(category, (categories.get(category) ?? 0) + row.sold);
      categoryProductCounts.set(category, (categoryProductCounts.get(category) ?? 0) + 1);
    }
  }
  const categoryRows = [...categories.entries()].sort((a, b) => b[1] - a[1]);
  const topCategories: Slice[] = categoryRows.slice(0, 5).map(([name, sold], index) => ({
    key: name,
    name,
    value: sold,
    fill: DASHBOARD_SERIES_COLORS[index % DASHBOARD_SERIES_COLORS.length],
    detail: `${number(categoryProductCounts.get(name) ?? 0, language)} ${copy.productsCount}`,
  }));
  const otherCategoryTotal = categoryRows.slice(5).reduce((sum, [, sold]) => sum + sold, 0);
  if (otherCategoryTotal > 0) topCategories.push({ key: "others", name: copy.others, value: otherCategoryTotal, fill: OTHER_COLOR });
  const topProductRows: Slice[] = rankedProducts.slice(0, 10).map(({ id, product, sold }, index) => ({
    key: id,
    name: String(product.name ?? ""),
    value: sold,
    fill: DASHBOARD_SERIES_COLORS[index % DASHBOARD_SERIES_COLORS.length],
    detail: String(product.category_name ?? ""),
  }));
  const otherProductTotal = rankedProducts.slice(10).reduce((sum, row) => sum + row.sold, 0);
  if (otherProductTotal > 0) topProductRows.push({ key: "others", name: copy.others, value: otherProductTotal, fill: OTHER_COLOR });

  const stats = useMemo(() => {
    const inventoryCost = products.reduce((sum, row) => sum + value(row, "bought_price") * value(row, "quantity"), 0);
    const inventoryValue = products.reduce((sum, row) => sum + value(row, "selling_price") * value(row, "quantity"), 0);
    const margins = products.map((row) => value(row, "selling_price") - value(row, "bought_price"));
    const marginPercentages = products.map((row) => {
      const selling = value(row, "selling_price");
      return selling === 0 ? 0 : ((selling - value(row, "bought_price")) / selling) * 100;
    });
    const rois = products.map((row) => {
      const bought = value(row, "bought_price");
      return bought === 0 ? 0 : ((value(row, "selling_price") - bought) / bought) * 100;
    });
    return {
      totalQuantity: products.reduce((sum, row) => sum + value(row, "quantity"), 0),
      inventoryCost,
      inventoryValue,
      profitPotential: inventoryValue - inventoryCost,
      outOfStock: products.filter((row) => value(row, "quantity") === 0).length,
      withoutBarcode: products.filter((row) => !String(row.codebar ?? "").trim()).length,
      averageMargin: margins.length ? margins.reduce((sum, row) => sum + row, 0) / margins.length : 0,
      averageMarginPercentage: marginPercentages.length ? marginPercentages.reduce((sum, row) => sum + row, 0) / marginPercentages.length : 0,
      averageRoi: rois.length ? rois.reduce((sum, row) => sum + row, 0) / rois.length : 0,
      worstSelling: rankedProducts.filter((row) => row.sold > 0).sort((a, b) => a.sold - b.sold).slice(0, 5).length,
    };
  }, [products, rankedProducts]);

  const chartRows = view === "categories" ? topCategories : topProductRows;
  return (
    <DashboardPanel stats className="dashboard-overview !min-h-0 !space-y-4 !p-4 sm:!p-6">
      <h2 className="text-lg font-semibold text-foreground">{copy.stock}</h2>
      {!productsComplete ? <DataNotice>{copy.incomplete}</DataNotice> : (
        <>
          <StatGrid language={language} items={[
            { label: copy.totalProducts, value: products.length },
            { label: copy.totalQuantity, value: stats.totalQuantity },
            { label: copy.stockCost, value: money(stats.inventoryCost, language) },
            { label: copy.stockValue, value: money(stats.inventoryValue, language) },
            { label: copy.profitPotential, value: money(stats.profitPotential, language) },
            { label: copy.outOfStock, value: stats.outOfStock },
            { label: copy.averageMargin, value: money(stats.averageMargin, language) },
            { label: copy.marginPercent, value: `${stats.averageMarginPercentage.toFixed(1)}%` },
            { label: copy.averageRoi, value: `${stats.averageRoi.toFixed(1)}%` },
            { label: copy.noBarcode, value: stats.withoutBarcode },
            { label: copy.worstSelling, value: itemsComplete ? stats.worstSelling : "—" },
          ]} />
          <div className="mobile-dashboard-toggle" data-columns="2" role="group">
            <button type="button" className={view === "categories" ? "selected" : ""} onClick={() => setView("categories")}>{copy.categories}</button>
            <button type="button" className={view === "products" ? "selected" : ""} onClick={() => setView("products")}>{copy.products}</button>
          </div>
          {itemsComplete ? (
            <PieBreakdown
              title={view === "categories" ? copy.categories : copy.products}
              data={chartRows}
              language={language}
              legendPercentageTotal={chartRows.reduce((sum, row) => sum + row.value, 0)}
            />
          ) : <DataNotice>{copy.distributionNote}</DataNotice>}
        </>
      )}
    </DashboardPanel>
  );
}

export function MobileClientStats({
  data,
  permissions,
  language,
}: {
  data: MobileBundle;
  permissions: MobilePermissions;
  language: MobileLanguage;
}) {
  const copy = COPY[language];
  const clientsComplete = data.clients.length < 2000;
  const salesComplete = permissions.can_access_history && data.sales_history_available && data.sales.length < 5000;
  const paymentsComplete = data.payments.length < 3000;
  const salesById = new Map(data.sales.map((sale) => [String(sale.source_id), sale]));
  const clientsById = new Map(data.clients.map((client) => [String(client.source_id), client]));
  const paymentBySale = new Map(data.payments.filter((payment) => payment.sale_source_id).map((payment) => [String(payment.sale_source_id), payment]));
  const creditAmountsComplete = paymentsComplete && data.payments.every((payment) =>
    payment.type !== "CREDIT" || payment.credit_amount != null || !payment.sale_source_id || salesById.has(String(payment.sale_source_id))
  );
  const clientActivityComplete = clientsComplete && salesComplete;
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeIds = new Set<string>();
  if (salesComplete) {
    for (const sale of data.sales) {
      const created = timestamp(sale, "source_created_at");
      if (sale.client_source_id && created && created >= thirtyDaysAgo) activeIds.add(String(sale.client_source_id));
    }
  }
  const newClients = data.clients.filter((client) => {
    const created = timestamp(client, "source_created_at");
    return created && created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }).length;

  const remainingCredit = (payment: MobileRow): number => {
    const given = value(payment, "given_amount");
    if (payment.credit_amount != null) return value(payment, "credit_amount") - given;
    const linkedSale = salesById.get(String(payment.sale_source_id ?? ""));
    if (linkedSale) return value(linkedSale, "total_amount_with_discount") - given;
    return -given;
  };
  const creditPayments = data.payments.filter((payment) => payment.type === "CREDIT");
  const versementPayments = data.payments.filter((payment) => payment.type === "VERSEMENT");
  const totalCredit = creditPayments.reduce((sum, payment) => sum + remainingCredit(payment), 0);
  const totalVersement = versementPayments.reduce((sum, payment) => sum + value(payment, "given_amount"), 0);
  const unpaidCredit = creditPayments.filter((payment) => !payment.paid_date).reduce((sum, payment) => sum + remainingCredit(payment), 0);
  const unpaidVersement = versementPayments.filter((payment) => !payment.paid_date).reduce((sum, payment) => sum + value(payment, "given_amount"), 0);
  const paidCredits = creditPayments.filter((payment) => Boolean(payment.paid_date)).length;
  const unpaidCredits = creditPayments.length - paidCredits;

  let creditSales = 0;
  let normalSales = 0;
  if (salesComplete && paymentsComplete) {
    for (const sale of data.sales) {
      if (paymentBySale.get(String(sale.source_id))?.type === "CREDIT") creditSales += 1;
      else normalSales += 1;
    }
  }

  const spend = new Map<string, { revenue: number; sales: number }>();
  if (salesComplete) {
    for (const sale of data.sales) {
      if (!sale.client_source_id) continue;
      const id = String(sale.client_source_id);
      const current = spend.get(id) ?? { revenue: 0, sales: 0 };
      spend.set(id, { revenue: current.revenue + value(sale, "total_amount_with_discount"), sales: current.sales + 1 });
    }
  }
  const rankedClients = [...spend.entries()].map(([id, totals]) => ({
    id,
    name: String(clientsById.get(id)?.name ?? "Unknown"),
    revenue: totals.revenue,
    sales: totals.sales,
  })).sort((a, b) => b.revenue - a.revenue);
  const topClients: Slice[] = rankedClients.slice(0, 10).map((client, index) => ({
    key: client.id,
    name: client.name,
    value: client.revenue,
    fill: DASHBOARD_SERIES_COLORS[index % DASHBOARD_SERIES_COLORS.length],
    detail: `${number(client.sales, language)} ${copy.salesCount}`,
  }));
  const otherRevenue = rankedClients.slice(10).reduce((sum, client) => sum + client.revenue, 0);
  if (otherRevenue > 0) topClients.push({ key: "others", name: copy.others, value: otherRevenue, fill: OTHER_COLOR });

  const paymentMetricsAvailable = creditAmountsComplete;
  const paymentRate = totalCredit + totalVersement > 0
    ? ((totalCredit + totalVersement - unpaidCredit - unpaidVersement) / (totalCredit + totalVersement)) * 100
    : 0;
  const averageClientValue = data.clients.length > 0 ? (totalCredit + totalVersement) / data.clients.length : 0;

  return (
    <DashboardPanel stats className="dashboard-overview !min-h-0 !space-y-4 !p-4 sm:!p-6">
      <h2 className="text-lg font-semibold text-foreground">{copy.clients}</h2>
      {!clientsComplete ? <DataNotice>{copy.incomplete}</DataNotice> : (
        <>
          <StatGrid language={language} items={[
            { label: copy.clientsTotal, value: data.clients.length },
            { label: copy.newClients, value: newClients },
            { label: copy.activeClients, value: clientActivityComplete ? activeIds.size : "—" },
            { label: copy.retention, value: clientActivityComplete && data.clients.length ? `${(activeIds.size / data.clients.length * 100).toFixed(1)}%` : "—" },
            { label: copy.unpaidCredit, value: paymentMetricsAvailable ? money(unpaidCredit, language) : "—" },
            { label: copy.unpaidVersement, value: paymentsComplete ? money(unpaidVersement, language) : "—" },
            { label: copy.paymentRate, value: paymentMetricsAvailable ? `${paymentRate.toFixed(1)}%` : "—" },
            { label: copy.averageClientValue, value: paymentMetricsAvailable ? money(averageClientValue, language) : "—" },
          ]} />
          {!clientActivityComplete ? <DataNotice>{copy.clientsActivityUnavailable}</DataNotice> : null}
          {!paymentMetricsAvailable ? <DataNotice>{copy.clientPaymentsUnavailable}</DataNotice> : null}
          {salesComplete && !paymentsComplete ? <DataNotice>{copy.incomplete}</DataNotice> : null}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {clientActivityComplete ? <RadialBreakdown title={copy.activeClients} rows={[
              { key: "active", label: copy.activeClients, value: activeIds.size, color: "var(--chart-1)" },
              { key: "inactive", label: copy.inactiveClients, value: Math.max(0, data.clients.length - activeIds.size), color: "var(--chart-2)" },
            ]} language={language} /> : null}
            {salesComplete && paymentsComplete ? <RadialBreakdown title={copy.creditSales} rows={[
              { key: "credit", label: copy.creditSales, value: creditSales, color: "var(--chart-1)" },
              { key: "normal", label: copy.normalSales, value: normalSales, color: "var(--chart-2)" },
            ]} language={language} /> : null}
            {paymentsComplete ? <RadialBreakdown title={copy.paidCredits} rows={[
              { key: "paid", label: copy.paidCredits, value: paidCredits, color: "var(--chart-1)" },
              { key: "unpaid", label: copy.unpaidCredits, value: unpaidCredits, color: "var(--chart-2)" },
            ]} language={language} /> : null}
          </div>
          {salesComplete ? <PieBreakdown title={copy.topClients} data={topClients} language={language} valueFormat="money" /> : null}
        </>
      )}
    </DashboardPanel>
  );
}

export function MobileServiceStats({
  data,
  language,
}: {
  data: MobileBundle;
  language: MobileLanguage;
}) {
  const copy = COPY[language];
  const [view, setView] = useState<"types" | "names">("names");
  const services = data.service_appointments;
  const now = new Date();
  const complete = services.length < 1000;
  const completed = services.filter((service) => service.is_completed === true);
  const pending = services.filter((service) => service.is_completed !== true);
  const overdue = pending.filter((service) => {
    const due = timestamp(service, "due_date");
    return due && due < now;
  });
  const totalRevenue = completed.reduce((sum, service) => sum + value(service, "service_price"), 0);
  const totalCost = completed.reduce((sum, service) => sum + value(service, "cost_price"), 0);
  const turnaround = completed.flatMap((service) => {
    const created = timestamp(service, "source_created_at");
    const finished = timestamp(service, "completed_at");
    return created && finished
      ? [Math.ceil(Math.abs(finished.getTime() - created.getTime()) / 86400000)]
      : [];
  });
  const averageTurnaround = turnaround.length
    ? Math.round(turnaround.reduce((sum, days) => sum + days, 0) / turnaround.length)
    : 0;

  const groupsByType = new Map<string, MobileRow[]>();
  const groupsByName = new Map<string, MobileRow[]>();
  for (const service of services) {
    const type = String(service.service_type ?? "");
    const name = String(service.name ?? "");
    groupsByType.set(type, [...(groupsByType.get(type) ?? []), service]);
    const key = `${name}|||${type}`;
    groupsByName.set(key, [...(groupsByName.get(key) ?? []), service]);
  }
  const summarizeGroup = (key: string, name: string, rows: MobileRow[], index: number): Slice & { profit: number } => {
    const done = rows.filter((row) => row.is_completed === true);
    const revenue = done.reduce((sum, row) => sum + value(row, "service_price"), 0);
    const cost = done.reduce((sum, row) => sum + value(row, "cost_price"), 0);
    const averagePrice = done.length ? revenue / done.length : 0;
    return {
      key,
      name,
      value: rows.length,
      fill: DASHBOARD_SERIES_COLORS[index % DASHBOARD_SERIES_COLORS.length],
      // Keep service pie tooltips concise; the detailed service totals are already shown above the chart.
      detail: "",
      profit: revenue - cost,
    };
  };
  const sortedTypeGroups = [...groupsByType.entries()].map(([name, rows]) => ({ name, rows }))
    .sort((a, b) => b.rows.length - a.rows.length);
  const typeRows: Slice[] = sortedTypeGroups.slice(0, 8)
    .map(({ name, rows }, index) => summarizeGroup(name, name || copy.others, rows, index));
  const otherTypeCount = sortedTypeGroups.slice(8).reduce((sum, group) => sum + group.rows.length, 0);
  if (otherTypeCount > 0) typeRows.push({ key: "others", name: copy.others, value: otherTypeCount, fill: OTHER_COLOR });

  const sortedNameGroups = [...groupsByName.entries()].map(([key, rows]) => ({ key, rows }))
    .sort((a, b) => b.rows.length - a.rows.length);
  const nameRows: Slice[] = sortedNameGroups.slice(0, 8)
    .map(({ key, rows }, index) => {
      const [name] = key.split("|||");
      return summarizeGroup(key, name || copy.others, rows, index);
    });
  const otherNameCount = sortedNameGroups.slice(8).reduce((sum, group) => sum + group.rows.length, 0);
  if (otherNameCount > 0) nameRows.push({ key: "others", name: copy.others, value: otherNameCount, fill: OTHER_COLOR });

  return (
    <DashboardPanel stats className="dashboard-overview !min-h-0 !space-y-4 !p-4 sm:!p-6">
      <h2 className="text-lg font-semibold text-foreground">{copy.services}</h2>
      {!complete ? <DataNotice>{copy.servicesUnavailable}</DataNotice> : (
        <>
          <StatGrid language={language} items={[
            { label: copy.totalServices, value: services.length },
            { label: copy.completed, value: completed.length },
            { label: copy.pending, value: pending.length },
            { label: copy.overdue, value: overdue.length },
            { label: copy.revenue, value: money(totalRevenue, language) },
            { label: copy.cost, value: money(totalCost, language) },
            { label: copy.profit, value: money(totalRevenue - totalCost, language) },
            { label: copy.turnaround, value: `${averageTurnaround} ${copy.days}` },
            { label: copy.completionRate, value: `${services.length ? (completed.length / services.length * 100).toFixed(1) : "0.0"}%` },
          ]} />
          <div className="mobile-dashboard-toggle" data-columns="2" role="group">
            <button type="button" className={view === "types" ? "selected" : ""} onClick={() => setView("types")}>{copy.serviceTypes}</button>
            <button type="button" className={view === "names" ? "selected" : ""} onClick={() => setView("names")}>{copy.serviceNames}</button>
          </div>
          {view === "types" ? <PieBreakdown title={copy.serviceTypes} data={typeRows} legendData={typeRows.slice(0, 5)} language={language} legendPercentageTotal={services.length} /> : null}
          {view === "names" ? <PieBreakdown title={copy.serviceNames} data={nameRows} legendData={nameRows.slice(0, 5)} language={language} legendPercentageTotal={services.length} /> : null}
        </>
      )}
    </DashboardPanel>
  );
}