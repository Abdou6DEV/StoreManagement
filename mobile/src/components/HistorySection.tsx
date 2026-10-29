import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List, Search, TrendingUp } from "lucide-react";
import type { MobileBundle, MobileLanguage, MobileRow } from "../mobileApi";
import "./HistorySection.css";
type Props = { data: MobileBundle; language: MobileLanguage };
type Mode = "day" | "month";
type Tab = "sales" | "purchases" | "bills";
type PeriodRow = { key: string; revenue: number; profit: number; purchases: number; bills: number; count: number };
type Bounds = { start: string; end: string };
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;
const str = (v: unknown) => v == null ? "" : String(v);
const pad = (v: number) => String(v).padStart(2, "0");
const localKey = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parseLocal = (key: string) => { const a = key.split("-").map(Number); return new Date(a[0], (a[1] || 1) - 1, a[2] || 1); };
const monthKey = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1);
const recordDate = (row: MobileRow, field: string) => { const v = row[field]; if (typeof v !== "string" || !v) return ""; const d = new Date(v); return Number.isNaN(d.getTime()) ? "" : localKey(d); };
const money = (v: number, lang: MobileLanguage) => new Intl.NumberFormat(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en", { maximumFractionDigits: 2 }).format(v / 100) + " DA";
const dateLabel = (key: string, lang: MobileLanguage, month = false) => !key ? "—" : new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en", month ? { month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" }).format(parseLocal(key.length === 7 ? key + "-01" : key));
const clamp = (v: string, min: string, max: string) => v < min ? min : v > max ? max : v;
const cutoffDate = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return localKey(d); };
const currentDay = () => localKey(new Date());
const monthStart = (v: string) => v + "-01";
const monthEnd = (v: string) => { const a = v.split("-").map(Number); return localKey(new Date(a[0], a[1], 0)); };
const periodKey = (d: string, mode: Mode) => mode === "day" ? d : d.slice(0, 7);
const inBounds = (d: string, b: Bounds) => Boolean(d) && d >= b.start && d <= b.end;
const pageSlice = <T,>(items: T[], page: number, size: number) => items.slice((page - 1) * size, page * size);
const purchaseAmount = (items: MobileRow[], id: string) => items.filter(i => str(i.purchase_source_id) === id).reduce((sum, i) => sum + num(i.price) * num(i.quantity), 0);
const LABELS = {
  en: { general:"General history", details:"Details history", daily:"Daily", monthly:"Monthly", from:"From", to:"To", sales:"Sales", revenue:"Revenue", profit:"Profit", purchases:"Purchases", bills:"Bills payments", avg:"Average %", highlight:"Highlight profits", net:"Calculate net profit", totals:"Show total", items:"Items per page", period:"Period", count:"Sales count", total:"Total", search:"Search sales, clients, products…", noData:"No history for this period.", noSales:"No sales found.", noPurchases:"No purchases found.", noBills:"No bill payments found.", back:"Back to general history", client:"Client", status:"Read-only details", list:"List view", grid:"Card view", sort:"Sort by", newest:"Newest first", oldest:"Oldest first", high:"Highest amount", low:"Lowest amount", previous:"Previous", next:"Next", page:"Page", of:"of", saleItems:"Sale items", supplier:"Supplier", title:"Bill", readOnly:"History is read-only on mobile.", aboveAvg:"Above average", belowAvg:"Below average", historyUnavailable:"Sales history is not available from this server yet. Some history totals may be incomplete." },
  fr: { general:"Historique général", details:"Détails de l’historique", daily:"Par jour", monthly:"Par mois", from:"Du", to:"Au", sales:"Ventes", revenue:"Chiffre d’affaires", profit:"Bénéfice", purchases:"Achats", bills:"Paiements de factures", avg:"Moyenne %", highlight:"Mettre en évidence les bénéfices", net:"Calculer le bénéfice net", totals:"Afficher le total", items:"Lignes par page", period:"Période", count:"Nombre de ventes", total:"Total", search:"Rechercher ventes, clients, produits…", noData:"Aucun historique pour cette période.", noSales:"Aucune vente trouvée.", noPurchases:"Aucun achat trouvé.", noBills:"Aucun paiement trouvé.", back:"Retour à l’historique général", client:"Client", status:"Détails en lecture seule", list:"Vue liste", grid:"Vue cartes", sort:"Trier par", newest:"Plus récent", oldest:"Plus ancien", high:"Montant le plus élevé", low:"Montant le plus faible", previous:"Précédent", next:"Suivant", page:"Page", of:"sur", saleItems:"Articles vendus", supplier:"Fournisseur", title:"Facture", readOnly:"Historique en lecture seule sur mobile.", aboveAvg:"Au-dessus de la moyenne", belowAvg:"Sous la moyenne", historyUnavailable:"L’historique des ventes n’est pas disponible sur ce serveur. Certains totaux peuvent être incomplets." },
  ar: { general:"السجل العام", details:"تفاصيل السجل", daily:"يومي", monthly:"شهري", from:"من", to:"إلى", sales:"المبيعات", revenue:"الإيرادات", profit:"الربح", purchases:"المشتريات", bills:"مدفوعات الفواتير", avg:"متوسط %", highlight:"تمييز الأرباح", net:"حساب صافي الربح", totals:"إظهار الإجمالي", items:"عدد الصفوف", period:"الفترة", count:"عدد المبيعات", total:"الإجمالي", search:"ابحث عن المبيعات والعملاء والمنتجات…", noData:"لا توجد بيانات لهذه الفترة.", noSales:"لا توجد مبيعات.", noPurchases:"لا توجد مشتريات.", noBills:"لا توجد مدفوعات.", back:"العودة إلى السجل العام", client:"العميل", status:"تفاصيل للقراءة فقط", list:"عرض القائمة", grid:"عرض البطاقات", sort:"ترتيب حسب", newest:"الأحدث أولاً", oldest:"الأقدم أولاً", high:"الأعلى مبلغاً", low:"الأقل مبلغاً", previous:"السابق", next:"التالي", page:"صفحة", of:"من", saleItems:"عناصر البيع", supplier:"المورد", title:"الفاتورة", readOnly:"السجل للقراءة فقط على الهاتف.", aboveAvg:"أعلى من المتوسط", belowAvg:"أقل من المتوسط", historyUnavailable:"سجل المبيعات غير متاح من الخادم حالياً وقد تكون بعض الإجماليات غير مكتملة." }
} as const;
type Labels = typeof LABELS[keyof typeof LABELS];

export function HistorySection({ data, language }: Props) {
  const t = LABELS[language], cutoff = cutoffDate(), today = currentDay();
  const minMonth = monthKey(parseLocal(cutoff)), maxMonth = monthKey(parseLocal(today));
  const [mode, setMode] = useState<Mode>("day");
  const [from, setFrom] = useState(() => { const d = parseLocal(today); d.setDate(d.getDate() - 29); const k = localKey(d); return k < cutoff ? cutoff : k; });
  const [to, setTo] = useState(today);
  const [highlight, setHighlight] = useState(false), [netProfit, setNetProfit] = useState(false), [showTotals, setShowTotals] = useState(true);
  const [pageSize, setPageSize] = useState(10), [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ mode: Mode; key: string } | null>(null);
  const [tab, setTab] = useState<Tab>("sales"), [detailSearch, setDetailSearch] = useState("");
  const [detailSort, setDetailSort] = useState<"newest" | "oldest" | "high" | "low">("newest");
  const [view, setView] = useState<"cards" | "list">("cards"), [detailPage, setDetailPage] = useState(1);
  const dateBounds = useMemo<Bounds>(() => {
    if (mode === "day") { const a = clamp(from, cutoff, today), b = clamp(to, cutoff, today); return a <= b ? { start:a, end:b } : { start:b, end:a }; }
    const a = clamp(from, minMonth, maxMonth), b = clamp(to, minMonth, maxMonth), start = monthStart(a <= b ? a : b), end = monthEnd(a <= b ? b : a);
    return { start:start < cutoff ? cutoff : start, end:end > today ? today : end };
  }, [mode, from, to, cutoff, today, minMonth, maxMonth]);
  const clients = useMemo(() => new Map(data.clients.map(r => [str(r.source_id), str(r.name)] as const)), [data.clients]);
  const suppliers = useMemo(() => new Map(data.suppliers.map(r => [str(r.source_id), str(r.name)] as const)), [data.suppliers]);
  const bills = useMemo(() => new Map(data.bills.map(r => [str(r.source_id), r] as const)), [data.bills]);
  const products = useMemo(() => new Map([...data.products, ...data.manual_products].map(r => [str(r.source_id), str(r.name)] as const)), [data.products, data.manual_products]);
  const services = useMemo(() => new Map(data.services.map(r => [str(r.source_id), str(r.name)] as const)), [data.services]);
  const paymentsBySale = useMemo(() => { const m = new Map<string, MobileRow>(); data.payments.forEach(r => { if (r.sale_source_id != null) m.set(str(r.sale_source_id), r); }); return m; }, [data.payments]);
  const validSales = useMemo(() => data.sales.filter(s => {
    if (!inBounds(recordDate(s, "source_created_at"), { start:cutoff, end:today })) return false;
    const p = paymentsBySale.get(str(s.source_id)); return !(p?.type === "VERSEMENT" && !p.paid_date);
  }), [data.sales, paymentsBySale, cutoff, today]);
  const validPurchases = useMemo(() => data.purchases.filter(p => inBounds(recordDate(p, "source_created_at"), { start:cutoff, end:today })), [data.purchases, cutoff, today]);
  const validBillPayments = useMemo(() => data.bill_payments.filter(p => inBounds(recordDate(p, "paid_date"), { start:cutoff, end:today })), [data.bill_payments, cutoff, today]);

  const rows = useMemo(() => {
    const m = new Map<string, PeriodRow>();
    const get = (key: string) => { let r = m.get(key); if (!r) { r = { key, revenue:0, profit:0, purchases:0, bills:0, count:0 }; m.set(key, r); } return r; };
    validSales.forEach(s => { const d = recordDate(s, "source_created_at"); if (inBounds(d, dateBounds)) { const r = get(periodKey(d, mode)); r.revenue += num(s.total_amount_with_discount); r.profit += num(s.total_profit); r.count++; } });
    validPurchases.forEach(p => { const d = recordDate(p, "source_created_at"); if (inBounds(d, dateBounds)) get(periodKey(d, mode)).purchases += purchaseAmount(data.purchase_items, str(p.source_id)); });
    validBillPayments.forEach(p => { const d = recordDate(p, "paid_date"); if (inBounds(d, dateBounds)) get(periodKey(d, mode)).bills += num(p.amount); });
    return [...m.values()].sort((a,b) => b.key.localeCompare(a.key));
  }, [validSales, validPurchases, validBillPayments, dateBounds, mode, data.purchase_items]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize)), visibleRows = pageSlice(rows, Math.min(page, totalPages), pageSize);
  const averageProfit = rows.length ? rows.reduce((sum,r) => sum + (netProfit ? r.profit - r.bills : r.profit), 0) / rows.length : 0;
  const totals = rows.reduce((s,r) => ({ revenue:s.revenue+r.revenue, profit:s.profit+r.profit, purchases:s.purchases+r.purchases, bills:s.bills+r.bills, count:s.count+r.count }), { revenue:0, profit:0, purchases:0, bills:0, count:0 });
  const aboveAverageCount = rows.filter(r => (netProfit ? r.profit - r.bills : r.profit) - averageProfit > 1e-6).length;
  const belowAverageCount = rows.filter(r => averageProfit - (netProfit ? r.profit - r.bills : r.profit) > 1e-6).length;
  const openPeriod = (key: string) => { setSelected({ mode, key }); setTab("sales"); setDetailSearch(""); setDetailSort("newest"); setDetailPage(1); setView("cards"); };
  const periodBounds = (s: { mode:Mode; key:string }): Bounds => {
    if (s.mode === "day") return { start:s.key, end:s.key };
    const start = monthStart(s.key), end = monthEnd(s.key); return { start:start < cutoff ? cutoff : start, end:end > today ? today : end };
  };
  const selectedBounds = selected ? periodBounds(selected) : null;
  const detailSales = useMemo(() => selectedBounds ? validSales.filter(s => inBounds(recordDate(s, "source_created_at"), selectedBounds)).sort((a,b) => str(b.source_created_at).localeCompare(str(a.source_created_at))) : [], [selectedBounds?.start, selectedBounds?.end, validSales]);
  const detailPurchases = useMemo(() => selectedBounds ? validPurchases.filter(p => inBounds(recordDate(p, "source_created_at"), selectedBounds)).sort((a,b) => str(b.source_created_at).localeCompare(str(a.source_created_at))) : [], [selectedBounds?.start, selectedBounds?.end, validPurchases]);
  const detailBills = useMemo(() => selectedBounds ? validBillPayments.filter(p => inBounds(recordDate(p, "paid_date"), selectedBounds)).sort((a,b) => str(b.paid_date).localeCompare(str(a.paid_date))) : [], [selectedBounds?.start, selectedBounds?.end, validBillPayments]);
  const previousBounds = useMemo<Bounds | null>(() => {
    if (!selected) return null;
    if (selected.mode === "day") { const d = parseLocal(selected.key); d.setDate(d.getDate()-1); const k = localKey(d); return k < cutoff ? null : { start:k, end:k }; }
    const a = selected.key.split("-").map(Number), d = new Date(a[0], a[1]-2, 1), start = localKey(d), end = localKey(new Date(d.getFullYear(), d.getMonth()+1, 0));
    return end < cutoff ? null : { start:start < cutoff ? cutoff : start, end:end > today ? today : end };
  }, [selected?.mode, selected?.key, cutoff, today]);
  const previousSales = previousBounds ? validSales.filter(s => inBounds(recordDate(s, "source_created_at"), previousBounds)) : [];
  const salesTotal = detailSales.reduce((s,r) => s + num(r.total_amount_with_discount), 0), salesProfit = detailSales.reduce((s,r) => s + num(r.total_profit), 0);
  const purchasesTotal = detailPurchases.reduce((s,r) => s + purchaseAmount(data.purchase_items, str(r.source_id)), 0), billsTotal = detailBills.reduce((s,r) => s + num(r.amount), 0);
  const previousRevenue = previousSales.reduce((s,r) => s + num(r.total_amount_with_discount), 0), previousProfit = previousSales.reduce((s,r) => s + num(r.total_profit), 0);
  const growth = (cur:number, prev:number) => prev > 0 ? (cur >= prev ? "+" : "") + ((cur-prev)/prev*100).toFixed(1) + "%" : "—";
  const detailRows = useMemo(() => {
    const q = detailSearch.trim().toLocaleLowerCase(), source = tab === "sales" ? detailSales : tab === "purchases" ? detailPurchases : detailBills;
    const filtered = source.filter(r => {
      if (!q) return true; const id = str(r.source_id);
      if (tab === "sales") {
        const items = data.sale_items.filter(i => str(i.sale_source_id) === id);
        const names = items.map(i => str(i.product_source_id ? products.get(str(i.product_source_id)) : i.manual_product_source_id ? products.get(str(i.manual_product_source_id)) : services.get(str(i.service_source_id)))).join(" ");
        return [id, clients.get(str(r.client_source_id)), names, recordDate(r,"source_created_at")].join(" ").toLocaleLowerCase().includes(q);
      }
      if (tab === "purchases") { const names = data.purchase_items.filter(i => str(i.purchase_source_id) === id).map(i => products.get(str(i.product_source_id)) || "").join(" "); return [id, suppliers.get(str(r.supplier_source_id)), names, recordDate(r,"source_created_at")].join(" ").toLocaleLowerCase().includes(q); }
      const bill = bills.get(str(r.bill_source_id)); return [id, bill?.title, bill?.type, r.notes, recordDate(r,"paid_date")].join(" ").toLocaleLowerCase().includes(q);
    });
    const amount = (r: MobileRow) => tab === "sales" ? num(r.total_amount_with_discount) : tab === "purchases" ? purchaseAmount(data.purchase_items, str(r.source_id)) : num(r.amount);
    return filtered.sort((a,b) => {
      const da = str(tab === "bills" ? a.paid_date : a.source_created_at), db = str(tab === "bills" ? b.paid_date : b.source_created_at);
      if (detailSort === "newest") return db.localeCompare(da); if (detailSort === "oldest") return da.localeCompare(db);
      return detailSort === "high" ? amount(b)-amount(a) : amount(a)-amount(b);
    });
  }, [tab, detailSales, detailPurchases, detailBills, detailSearch, detailSort, data.sale_items, data.purchase_items, products, services, clients, suppliers, bills]);
  const detailPageCount = Math.max(1, Math.ceil(detailRows.length / 10)), shownDetailRows = pageSlice(detailRows, Math.min(detailPage, detailPageCount), 10);
  const resetDetail = (next:Tab) => { setTab(next); setDetailPage(1); setDetailSearch(""); setDetailSort("newest"); };

  return <div className="mobile-history" dir={language === "ar" ? "rtl" : "ltr"}>
    {!selected ? <>
      <div className="mobile-history-heading"><div><h2>{t.general}</h2><p>{t.readOnly}</p></div><TrendingUp size={22}/></div>
      {!data.sales_history_available ? <div className="mobile-history-warning">{t.historyUnavailable}</div> : null}
      <div className="mobile-history-panel">
        <div className="mobile-history-mode" role="group" aria-label={t.period}>
          <button type="button" className={mode === "day" ? "active" : ""} onClick={() => { const d=parseLocal(today); d.setDate(d.getDate()-29); const k=localKey(d); setMode("day"); setFrom(k<cutoff?cutoff:k); setTo(today); setPage(1); }}><CalendarDays size={16}/>{t.daily}</button>
          <button type="button" className={mode === "month" ? "active" : ""} onClick={() => { const d=parseLocal(today); d.setDate(1); d.setMonth(d.getMonth()-11); setMode("month"); setFrom(clamp(monthKey(d),minMonth,maxMonth)); setTo(maxMonth); setPage(1); }}><TrendingUp size={16}/>{t.monthly}</button>
        </div>
        <div className="mobile-history-date-filters">
          <label><span>{t.from}</span><input type={mode==="day"?"date":"month"} min={mode==="day"?cutoff:minMonth} max={mode==="day"?today:maxMonth} value={from} onChange={e=>{setFrom(e.target.value);setPage(1);}}/></label>
          <label><span>{t.to}</span><input type={mode==="day"?"date":"month"} min={mode==="day"?cutoff:minMonth} max={mode==="day"?today:maxMonth} value={to} onChange={e=>{setTo(e.target.value);setPage(1);}}/></label>
        </div>
        <div className="mobile-history-options">
          <label><span>{t.items}</span><select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[5,10,30,50,100].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
          <label className="mobile-history-check"><input type="checkbox" checked={highlight} onChange={e=>setHighlight(e.target.checked)}/><span>{t.highlight}</span></label>
          <label className="mobile-history-check"><input type="checkbox" checked={netProfit} onChange={e=>setNetProfit(e.target.checked)}/><span>{t.net}</span></label>
          <label className="mobile-history-check"><input type="checkbox" checked={showTotals} onChange={e=>setShowTotals(e.target.checked)}/><span>{t.totals}</span></label>
        </div>
      </div>
      <div className="mobile-history-table-wrap"><table className="mobile-history-table">
        <thead><tr><th>{t.period}</th><th>{t.count}</th><th>{t.revenue}</th><th>{netProfit?t.net:t.profit}</th><th>{t.purchases}</th><th>{t.bills}</th><th>{t.avg}</th></tr></thead>
        <tbody>
          {visibleRows.map(r=>{const p=netProfit?r.profit-r.bills:r.profit, avg=averageProfit===0?(p>0?100:0):((p-averageProfit)/averageProfit)*100, diff=averageProfit===0?(p>0?100:0):((p-averageProfit)/Math.abs(averageProfit))*100, rowClass=highlight?(diff>=10?"highlight-high":diff<0?"highlight-low":""):""; return <tr className={rowClass} key={r.key} tabIndex={0} role="button" onClick={()=>openPeriod(r.key)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")openPeriod(r.key);}}>
            <td><button className="mobile-history-period-link" type="button" onClick={e=>{e.stopPropagation();openPeriod(r.key);}}>{dateLabel(r.key,language,mode==="month")}</button></td><td>{r.count}</td><td>{money(r.revenue,language)}</td><td className={highlight?(diff>=10?"profit-high":diff<0?"profit-low":""):""}>{money(p,language)}</td><td>{money(r.purchases,language)}</td><td>{money(r.bills,language)}</td><td className={avg>0?"profit-high":avg<0?"profit-low":""}>{avg>=0?"+":""}{avg.toFixed(1)}%</td>
          </tr>;})}
          {!visibleRows.length?<tr><td colSpan={7} className="mobile-history-empty">{t.noData}</td></tr>:null}
          {showTotals&&rows.length?<tr className="mobile-history-total"><th>{t.total}</th><th>{totals.count}</th><th>{money(totals.revenue,language)}</th><th>{money(netProfit?totals.profit-totals.bills:totals.profit,language)}</th><th>{money(totals.purchases,language)}</th><th>{money(totals.bills,language)}</th><th><span className="mobile-history-total-comparison"><span title={t.aboveAvg}>▲ {aboveAverageCount}</span><span title={t.belowAvg}>▼ {belowAverageCount}</span></span></th></tr>:null}
        </tbody></table></div>
      <Pagination page={page} pageCount={totalPages} onPage={setPage} t={t}/>
    </> : <>
      <button type="button" className="mobile-history-back" onClick={()=>setSelected(null)}><ArrowLeft size={17}/>{t.back}</button>
      <div className="mobile-history-heading"><div><h2>{t.details}</h2><p>{dateLabel(selected.key,language,selected.mode==="month")}</p></div></div>
      <div className="mobile-history-summary">
        <Summary title={t.revenue} value={money(salesTotal,language)} detail={detailSales.length+" "+t.sales.toLowerCase()} growth={previousBounds?growth(salesTotal,previousRevenue):undefined}/>
        <Summary title={t.profit} value={money(salesProfit,language)} growth={previousBounds?growth(salesProfit,previousProfit):undefined}/>
        <Summary title={t.bills} value={money(billsTotal,language)} detail={detailBills.length+" "+t.bills.toLowerCase()}/>
        <Summary title={t.purchases} value={money(purchasesTotal,language)} detail={detailPurchases.length+" "+t.purchases.toLowerCase()}/>
      </div>
      <div className="mobile-history-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab==="sales"} className={tab==="sales"?"active":""} onClick={()=>resetDetail("sales")}>{t.sales}<span>{detailSales.length}</span></button>
        <button type="button" role="tab" aria-selected={tab==="purchases"} className={tab==="purchases"?"active":""} onClick={()=>resetDetail("purchases")}>{t.purchases}<span>{detailPurchases.length}</span></button>
        <button type="button" role="tab" aria-selected={tab==="bills"} className={tab==="bills"?"active":""} onClick={()=>resetDetail("bills")}>{t.bills}<span>{detailBills.length}</span></button>
      </div>
      <div className="mobile-history-detail-toolbar">
        <label className="mobile-history-search"><Search size={16}/><input value={detailSearch} onChange={e=>{setDetailSearch(e.target.value);setDetailPage(1);}} placeholder={t.search}/></label>
        <label className="mobile-history-sort"><span>{t.sort}</span><select value={detailSort} onChange={e=>{setDetailSort(e.target.value as typeof detailSort);setDetailPage(1);}}><option value="newest">{t.newest}</option><option value="oldest">{t.oldest}</option><option value="high">{t.high}</option><option value="low">{t.low}</option></select></label>
        {tab==="sales"?<div className="mobile-history-view-toggle"><button type="button" aria-label={t.grid} className={view==="cards"?"active":""} onClick={()=>setView("cards")}><LayoutGrid size={16}/></button><button type="button" aria-label={t.list} className={view==="list"?"active":""} onClick={()=>setView("list")}><List size={16}/></button></div>:null}
      </div>
      {tab==="sales"?<div className={"mobile-history-sale-list "+(view==="list"?"is-list":"")}>
        {shownDetailRows.map(s=>{const id=str(s.source_id), items=data.sale_items.filter(i=>str(i.sale_source_id)===id), client=clients.get(str(s.client_source_id))||"—";return <details className="mobile-history-sale-card" key={id}>
          <summary><div className="mobile-history-sale-top"><strong>{client}</strong><time>{dateLabel(recordDate(s,"source_created_at"),language)}</time></div><div className="mobile-history-sale-values"><span>{money(num(s.total_amount_with_discount),language)}</span><strong>{money(num(s.total_profit),language)}</strong></div><div className="mobile-history-sale-meta"><span>{items.length+" "+t.saleItems.toLowerCase()}</span><span>#{id.slice(0,8)}</span></div></summary>
          <div className="mobile-history-item-list">{items.map((it,i)=>{const name=it.product_source_id?products.get(str(it.product_source_id)):it.manual_product_source_id?products.get(str(it.manual_product_source_id)):services.get(str(it.service_source_id));return <div key={str(it.source_id)||i}><span>{name||"—"} × {num(it.quantity)}</span><strong>{money(num(it.price)*num(it.quantity),language)}</strong></div>;})}</div>
          <div className="mobile-history-sale-footer"><span>{t.status}</span><strong>{money(num(s.total_profit),language)}</strong></div>
        </details>;})}
        {!shownDetailRows.length?<p className="mobile-history-empty">{t.noSales}</p>:null}
      </div>:tab==="purchases"?<div className="mobile-history-record-list">
        {shownDetailRows.map(p=>{const id=str(p.source_id), items=data.purchase_items.filter(i=>str(i.purchase_source_id)===id);return <article className="mobile-history-record-card" key={id}><div className="mobile-history-sale-top"><strong>{suppliers.get(str(p.supplier_source_id))||t.supplier}</strong><time>{dateLabel(recordDate(p,"source_created_at"),language)}</time></div><div className="mobile-history-sale-values"><span>{items.length+" "+t.saleItems.toLowerCase()}</span><strong>{money(purchaseAmount(id),language)}</strong></div>{items.map((it,i)=><div className="mobile-history-record-line" key={str(it.source_id)||i}><span>{products.get(str(it.product_source_id))||"—"} × {num(it.quantity)}</span><span>{money(num(it.price)*num(it.quantity),language)}</span></div>)}</article>;})}
        {!shownDetailRows.length?<p className="mobile-history-empty">{t.noPurchases}</p>:null}
      </div>:<div className="mobile-history-record-list">
        {shownDetailRows.map(p=>{const bill=bills.get(str(p.bill_source_id));return <article className="mobile-history-record-card" key={str(p.source_id)}><div className="mobile-history-sale-top"><strong>{str(bill?.title)||t.title}</strong><time>{dateLabel(recordDate(p,"paid_date"),language)}</time></div><div className="mobile-history-sale-values"><span>{str(bill?.type)||"—"}</span><strong>{money(num(p.amount),language)}</strong></div>{p.notes?<p className="mobile-history-notes">{str(p.notes)}</p>:null}</article>;})}
        {!shownDetailRows.length?<p className="mobile-history-empty">{t.noBills}</p>:null}
      </div>}
      <Pagination page={detailPage} pageCount={detailPageCount} onPage={setDetailPage} t={t}/>
    </>}
  </div>;
}
function Summary({ title, value, detail, growth }: { title:string; value:string; detail?:string; growth?:string }) {
  return <article className="mobile-history-summary-card"><span>{title}</span><strong>{value}</strong>{detail?<small>{detail}</small>:null}{growth?<small className={growth.startsWith("-")?"negative":growth==="—"?"":"positive"}>{growth} <span>vs previous</span></small>:null}</article>;
}
function Pagination({ page, pageCount, onPage, t }: { page:number; pageCount:number; onPage:(n:number)=>void; t:Labels }) {
  if (pageCount<=1) return null;
  return <div className="mobile-history-pagination"><button type="button" disabled={page<=1} onClick={()=>onPage(Math.max(1,page-1))}><ChevronLeft size={16}/>{t.previous}</button><span>{t.page} {page} {t.of} {pageCount}</span><button type="button" disabled={page>=pageCount} onClick={()=>onPage(Math.min(pageCount,page+1))}>{t.next}<ChevronRight size={16}/></button></div>;
}
