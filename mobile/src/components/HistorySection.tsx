import { useMemo, useState } from "react";
import { ArrowLeft, Banknote, Calendar, CalendarDays, ChevronLeft, ChevronRight, Clock, Copy, CreditCard, DollarSign, Eye, LayoutGrid, List, Receipt, Search, ShoppingBag, Trash2, TrendingUp, User, X } from "lucide-react";
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
const money = (v: number, lang: MobileLanguage) => new Intl.NumberFormat(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en", { maximumFractionDigits: 2 }).format(v) + " DA";
const dateLabel = (key: string, lang: MobileLanguage, month = false) => !key ? "—" : new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en", month ? { month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" }).format(parseLocal(key.length === 7 ? key + "-01" : key));
const dateTimeLabel = (value: unknown, lang: MobileLanguage) => { const d = new Date(str(value)); return value && !Number.isNaN(d.getTime()) ? new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }).format(d) : "—"; };
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
  en: { general:"General history", details:"Details history", daily:"Daily", monthly:"Monthly", from:"From", to:"To", sales:"Sales", revenue:"Revenue", profit:"Profit", purchases:"Purchases", bills:"Bills payments", avg:"Average %", highlight:"Highlight profits", net:"Calculate net profit", totals:"Show total", items:"Items per page", period:"Period", count:"Sales count", total:"Total", search:"Search sales, clients, products…", noData:"No history for this period.", noSales:"No sales found.", noPurchases:"No purchases found.", noBills:"No bill payments found.", back:"Back to general history", client:"Client", status:"Read-only details", list:"List view", grid:"Card view", sort:"Sort by", newest:"Newest first", oldest:"Oldest first", high:"Highest amount", low:"Lowest amount", previous:"Previous", next:"Next", page:"Page", of:"of", saleItems:"Sale items", supplier:"Supplier", title:"Bill", readOnly:"History is read-only on mobile.", aboveAvg:"Above average", belowAvg:"Below average", historyUnavailable:"Sales history is not available from this server yet. Some history totals may be incomplete.", creditPaid:"Credit (Paid)", creditUnpaid:"Credit (Unpaid)", versementPaid:"Versement (Paid)", versementUnpaid:"Versement (Unpaid)", itemCount:"items", paymentsCount:"payments", notes:"Notes", description:"Description", seller:"Seller", type:"Type", today:"Today", saleDetails:"Sale Details", saleInformation:"Sale Information", date:"Date", paymentInformation:"Payment Information", paymentMethod:"Payment Method", cash:"Cash", credit:"Credit", versement:"Versement", paidAmount:"Paid Amount", itemsSummary:"Items Summary", totalItems:"Total Items", paymentSummary:"Payment Summary", product:"Product", qty:"Qty", unit:"Unit", totalLabel:"Total", nbrItems:"Nbr Items", subtotal:"Subtotal", paid:"Paid", discount:"Discount", remaining:"Remaining", currency:"DA", view:"View", delete:"Delete", copied:"Copied" },
  fr: { general:"Historique général", details:"Détails de l’historique", daily:"Par jour", monthly:"Par mois", from:"Du", to:"Au", sales:"Ventes", revenue:"Chiffre d’affaires", profit:"Bénéfice", purchases:"Achats", bills:"Paiements de factures", avg:"Moyenne %", highlight:"Mettre en évidence les bénéfices", net:"Calculer le bénéfice net", totals:"Afficher le total", items:"Lignes par page", period:"Période", count:"Nombre de ventes", total:"Total", search:"Rechercher ventes, clients, produits…", noData:"Aucun historique pour cette période.", noSales:"Aucune vente trouvée.", noPurchases:"Aucun achat trouvé.", noBills:"Aucun paiement trouvé.", back:"Retour à l’historique général", client:"Client", status:"Détails en lecture seule", list:"Vue liste", grid:"Vue cartes", sort:"Trier par", newest:"Plus récent", oldest:"Plus ancien", high:"Montant le plus élevé", low:"Montant le plus faible", previous:"Précédent", next:"Suivant", page:"Page", of:"sur", saleItems:"Articles vendus", supplier:"Fournisseur", title:"Facture", readOnly:"Historique en lecture seule sur mobile.", aboveAvg:"Au-dessus de la moyenne", belowAvg:"Sous la moyenne", historyUnavailable:"L’historique des ventes n’est pas disponible sur ce serveur. Certains totaux peuvent être incomplets.", creditPaid:"Crédit (payé)", creditUnpaid:"Crédit (impayé)", versementPaid:"Versement (payé)", versementUnpaid:"Versement (impayé)", itemCount:"articles", paymentsCount:"paiements", notes:"Notes", description:"Description", seller:"Vendeur", type:"Type", today:"Aujourd’hui", saleDetails:"Détails de la vente", saleInformation:"Informations sur la vente", date:"Date", paymentInformation:"Informations de paiement", paymentMethod:"Mode de paiement", cash:"Espèces", credit:"Crédit", versement:"Versement", paidAmount:"Montant payé", itemsSummary:"Résumé des articles", totalItems:"Total des articles", paymentSummary:"Résumé du paiement", product:"Produit", qty:"Qté", unit:"Unité", totalLabel:"Total", nbrItems:"Nombre d’articles", subtotal:"Sous-total", paid:"Payé", discount:"Remise", remaining:"Reste", currency:"DA", view:"Voir", delete:"Supprimer", copied:"Copié" },
  ar: { general:"السجل العام", details:"تفاصيل السجل", daily:"يومي", monthly:"شهري", from:"من", to:"إلى", sales:"المبيعات", revenue:"الإيرادات", profit:"الربح", purchases:"المشتريات", bills:"مدفوعات الفواتير", avg:"متوسط %", highlight:"تمييز الأرباح", net:"حساب صافي الربح", totals:"إظهار الإجمالي", items:"عدد الصفوف", period:"الفترة", count:"عدد المبيعات", total:"الإجمالي", search:"ابحث عن المبيعات والعملاء والمنتجات…", noData:"لا توجد بيانات لهذه الفترة.", noSales:"لا توجد مبيعات.", noPurchases:"لا توجد مشتريات.", noBills:"لا توجد مدفوعات.", back:"العودة إلى السجل العام", client:"العميل", status:"تفاصيل للقراءة فقط", list:"عرض القائمة", grid:"عرض البطاقات", sort:"ترتيب حسب", newest:"الأحدث أولاً", oldest:"الأقدم أولاً", high:"الأعلى مبلغاً", low:"الأقل مبلغاً", previous:"السابق", next:"التالي", page:"صفحة", of:"من", saleItems:"عناصر البيع", supplier:"المورد", title:"الفاتورة", readOnly:"السجل للقراءة فقط على الهاتف.", aboveAvg:"أعلى من المتوسط", belowAvg:"أقل من المتوسط", historyUnavailable:"سجل المبيعات غير متاح من الخادم حالياً وقد تكون بعض الإجماليات غير مكتملة.", creditPaid:"بيع آجل (مدفوع)", creditUnpaid:"بيع آجل (غير مدفوع)", versementPaid:"تقسيط (مدفوع)", versementUnpaid:"تقسيط (غير مدفوع)", itemCount:"عناصر", paymentsCount:"مدفوعات", notes:"ملاحظات", description:"الوصف", seller:"البائع", type:"النوع", today:"اليوم", saleDetails:"تفاصيل البيع", saleInformation:"معلومات البيع", date:"التاريخ", paymentInformation:"معلومات الدفع", paymentMethod:"طريقة الدفع", cash:"نقداً", credit:"دين", versement:"دفعة", paidAmount:"المبلغ المدفوع", itemsSummary:"ملخص العناصر", totalItems:"إجمالي العناصر", paymentSummary:"ملخص الدفع", product:"المنتج", qty:"الكمية", unit:"الوحدة", totalLabel:"الإجمالي", nbrItems:"عدد العناصر", subtotal:"المجموع الفرعي", paid:"مدفوع", discount:"التخفيض", remaining:"المتبقي", currency:"دج", view:"عرض", delete:"حذف", copied:"تم النسخ" }
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
  const [tableScrolled, setTableScrolled] = useState(false);
  const [selected, setSelected] = useState<{ mode: Mode; key: string } | null>(null);
  const [selectedSale, setSelectedSale] = useState<MobileRow | null>(null);
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
  const productDetails = useMemo(() => new Map(data.products.map(r => [str(r.source_id), { name:str(r.name), category:str(r.category_name) }] as const)), [data.products]);
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
    validBillPayments.forEach(p => { const d = recordDate(p, "paid_date"); if (inBounds(d, dateBounds)) get(periodKey(d, mode)).bills += num(p.amount) / 100; });
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
  const purchasesTotal = detailPurchases.reduce((s,r) => s + purchaseAmount(data.purchase_items, str(r.source_id)), 0), billsTotal = detailBills.reduce((s,r) => s + num(r.amount) / 100, 0);
  const previousRevenue = previousSales.reduce((s,r) => s + num(r.total_amount_with_discount), 0), previousProfit = previousSales.reduce((s,r) => s + num(r.total_profit), 0);
  const growth = (cur:number, prev:number) => { const rate = prev === 0 ? (cur > 0 ? 100 : 0) : ((cur-prev)/prev)*100; return (rate >= 0 ? "+" : "") + rate.toFixed(1) + "%"; };
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
      <div className={`mobile-history-table-wrap${tableScrolled ? " is-horizontally-scrolled" : ""}`} onScroll={e=>setTableScrolled(Math.abs(e.currentTarget.scrollLeft)>1)}><table className="mobile-history-table">
        <thead><tr><th>{t.period}</th><th>{t.count}</th><th>{t.revenue}</th><th>{netProfit?t.net:t.profit}</th><th>{t.purchases}</th><th>{t.bills}</th><th>{t.avg}</th></tr></thead>
        <tbody>
          {visibleRows.map(r=>{const p=netProfit?r.profit-r.bills:r.profit, avg=averageProfit===0?(p>0?100:0):((p-averageProfit)/averageProfit)*100, diff=averageProfit===0?(p>0?100:0):((p-averageProfit)/Math.abs(averageProfit))*100, rowClass=highlight?(diff>=10?"highlight-high":diff<0?"highlight-low":""):""; return <tr className={rowClass} key={r.key} tabIndex={0} role="button" onClick={()=>openPeriod(r.key)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")openPeriod(r.key);}}>
            <td><button className="mobile-history-period-link" type="button" title={dateLabel(r.key,language,mode==="month")} aria-label={dateLabel(r.key,language,mode==="month")} onClick={e=>{e.stopPropagation();openPeriod(r.key);}}>{dateLabel(r.key,language,mode==="month")}</button></td><td>{r.count}</td><td>{money(r.revenue,language)}</td><td className={highlight?(diff>=10?"profit-high":diff<0?"profit-low":""):""}>{money(p,language)}</td><td>{money(r.purchases,language)}</td><td>{money(r.bills,language)}</td><td className={avg>0?"profit-high":avg<0?"profit-low":""}>{avg>=0?"+":""}{avg.toFixed(1)}%</td>
          </tr>;})}
          {!visibleRows.length?<tr><td colSpan={7} className="mobile-history-empty">{t.noData}</td></tr>:null}
          {showTotals&&rows.length?<tr className="mobile-history-total"><th>{t.total}</th><th>{totals.count}</th><th>{money(totals.revenue,language)}</th><th className={highlight?((netProfit?totals.profit-totals.bills:totals.profit)>=0?"total-positive":"total-negative"):""}>{money(netProfit?totals.profit-totals.bills:totals.profit,language)}</th><th>{money(totals.purchases,language)}</th><th>{money(totals.bills,language)}</th><th><span className="mobile-history-total-comparison"><span title={t.aboveAvg}>▲ {aboveAverageCount}</span><span title={t.belowAvg}>▼ {belowAverageCount}</span></span></th></tr>:null}
        </tbody></table></div>
      <Pagination page={page} pageCount={totalPages} onPage={setPage} t={t}/>
    </> : <>
      <button type="button" className="mobile-history-back" onClick={()=>setSelected(null)}><ArrowLeft size={17}/>{t.back}</button>
      <div className="mobile-history-heading"><div><h2>{t.details}</h2><p>{dateLabel(selected.key,language,selected.mode==="month")}</p></div></div>
      <div className="mobile-history-summary">
        <Summary tone="revenue" title={t.revenue} value={money(salesTotal,language)} detail={detailSales.length+" "+t.sales.toLowerCase()} growth={previousBounds?growth(salesTotal,previousRevenue):undefined}/>
        <Summary tone="profit" title={t.profit} value={money(salesProfit,language)} growth={previousBounds?growth(salesProfit,previousProfit):undefined}/>
        <Summary tone="bills" title={t.bills} value={money(billsTotal,language)} detail={detailBills.length+" "+t.paymentsCount}/>
        <Summary tone="purchases" title={t.purchases} value={money(purchasesTotal,language)} detail={detailPurchases.length+" "+t.purchases.toLowerCase()}/>
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
        {shownDetailRows.map(s=>{
          const id=str(s.source_id), items=data.sale_items.filter(i=>str(i.sale_source_id)===id), client=clients.get(str(s.client_source_id))||"", payment=paymentsBySale.get(id);
          const paymentLabel=payment ? payment.type==="CREDIT" ? (payment.paid_date?t.creditPaid:t.creditUnpaid) : payment.type==="VERSEMENT" ? (payment.paid_date?t.versementPaid:t.versementUnpaid) : "" : "";
          const totalItems=num(s.total_items)||items.reduce((sum,it)=>sum+num(it.quantity),0);
          const tokens=items.map(it=>{const name=it.product_source_id?products.get(str(it.product_source_id)):it.manual_product_source_id?products.get(str(it.manual_product_source_id)):services.get(str(it.service_source_id));const base=it.service_source_id?`🔧 ${name||"—"}`:(name||"—");const qty=num(it.quantity)||1;return qty>1?`${qty}× ${base}`:base;});
          const saleDate=new Date(str(s.source_created_at)), today=new Date();
          const isToday=!Number.isNaN(saleDate.getTime())&&saleDate.toDateString()===today.toDateString();
          const cardDate=Number.isNaN(saleDate.getTime())?"—":`${isToday?t.today:pad(saleDate.getDate())+"/"+pad(saleDate.getMonth()+1)+"/"+saleDate.getFullYear()} - ${pad(saleDate.getHours())}:${pad(saleDate.getMinutes())}`;
          return <article className="mobile-history-sale-card" key={id} onClick={()=>setSelectedSale(s)}>
            <div className="mobile-history-desktop-sale-header">
              <div className="mobile-history-desktop-sale-meta"><span><Clock size={15}/>{cardDate}</span>{client?<span><User size={15}/>{client}</span>:null}{paymentLabel?<span className={`mobile-history-desktop-payment ${payment.paid_date?"is-paid":"is-unpaid"}`}>{paymentLabel}</span>:null}</div>
              <div className="mobile-history-desktop-sale-money"><strong>{money(num(s.total_amount_with_discount),language)}</strong><strong>{money(num(s.total_profit),language)}</strong></div>
            </div>
            <div className="mobile-history-desktop-item-preview" title={tokens.join(", ")}>{tokens.slice(0,2).join(", ")}{tokens.length>2?` +${tokens.length-2} more`:""}</div>
            <div className="mobile-history-desktop-sale-footer"><span className="mobile-history-desktop-item-count"><ShoppingBag size={16}/>{totalItems} {t.itemsLabel}</span><div className="mobile-history-desktop-actions"><button type="button" disabled title={t.readOnly} className="mobile-history-delete-button"><Trash2 size={13}/>{t.delete}</button><button type="button" onClick={e=>{e.stopPropagation();setSelectedSale(s);}} className="mobile-history-view-button"><Eye size={13}/>{t.view}</button></div></div>
          </article>;
        })}
        {!shownDetailRows.length?<p className="mobile-history-empty">{t.noSales}</p>:null}
      </div>:tab==="purchases"?<div className="mobile-history-record-list">
        {shownDetailRows.map(p=>{const id=str(p.source_id), items=data.purchase_items.filter(i=>str(i.purchase_source_id)===id);return <article className="mobile-history-record-card mobile-history-desktop-record-card" key={id}>
          <div className="mobile-history-desktop-record-header"><div><time>{dateTimeLabel(p.source_created_at,language)}</time>{suppliers.get(str(p.supplier_source_id))?<strong>{t.seller}: {suppliers.get(str(p.supplier_source_id))}</strong>:null}</div><strong className="is-purchase-total">{money(purchaseAmount(data.purchase_items,id),language)}</strong></div>
          <div className="mobile-history-desktop-purchase-items">{items.map((it,i)=>{const product=productDetails.get(str(it.product_source_id));return <div key={str(it.source_id)||i}><span>{product?.name||products.get(str(it.product_source_id))||"—"} ({product?.category||"—"}) x <b>{num(it.quantity)}</b></span><strong>{money(num(it.price)*num(it.quantity),language)}</strong></div>;})}</div>
        </article>;})}
        {!shownDetailRows.length?<p className="mobile-history-empty">{t.noPurchases}</p>:null}
      </div>:<div className="mobile-history-record-list">
        {shownDetailRows.map(p=>{const bill=bills.get(str(p.bill_source_id));return <article className="mobile-history-record-card mobile-history-desktop-record-card mobile-history-bill-card" key={str(p.source_id)}>
          <div className="mobile-history-desktop-record-header"><div><time>{dateTimeLabel(p.paid_date,language)}</time><strong>{str(bill?.title)||t.title}</strong></div><strong className="mobile-history-desktop-bill-amount">{money(num(p.amount)/100,language)}</strong></div>
          <div className="mobile-history-desktop-bill-info"><span>{t.type||"Type"}: <b>{str(bill?.type)||"—"}</b></span><span>{str(bill?.description)||""}</span></div>
          {p.notes?<div className="mobile-history-desktop-bill-notes"><span>{t.notes}:</span><strong>{str(p.notes)}</strong></div>:null}
        </article>;})}
        {!shownDetailRows.length?<p className="mobile-history-empty">{t.noBills}</p>:null}
      </div>}
      <Pagination page={detailPage} pageCount={detailPageCount} onPage={setDetailPage} t={t}/>
      {selectedSale?<SaleSummaryModal sale={selectedSale} data={data} language={language} labels={t} products={products} services={services} onClose={()=>setSelectedSale(null)}/>:null}
    </>} 
  </div>;
}
function Summary({ tone, title, value, detail, growth }: { tone:"revenue"|"profit"|"bills"|"purchases"; title:string; value:string; detail?:string; growth?:string }) {
  return <article className={`mobile-history-summary-card tone-${tone}`}><span>{title}</span><strong>{value}</strong>{detail?<small>{detail}</small>:null}{growth?<small className={`mobile-history-growth ${growth.startsWith("-")?"negative":"positive"}`}>{growth} <span>vs previous</span></small>:null}</article>;
}
function Pagination({ page, pageCount, onPage, t }: { page:number; pageCount:number; onPage:(n:number)=>void; t:Labels }) {
  if (pageCount<=1) return null;
  return <div className="mobile-history-pagination"><button type="button" disabled={page<=1} onClick={()=>onPage(Math.max(1,page-1))}><ChevronLeft size={16}/>{t.previous}</button><span>{t.page} {page} {t.of} {pageCount}</span><button type="button" disabled={page>=pageCount} onClick={()=>onPage(Math.min(pageCount,page+1))}>{t.next}<ChevronRight size={16}/></button></div>;
}


function SaleSummaryModal({ sale, data, language, labels:t, products, services, onClose }: { sale:MobileRow; data:MobileBundle; language:MobileLanguage; labels:Labels; products:Map<string,string>; services:Map<string,string>; onClose:()=>void }) {
  const id=str(sale.source_id), items=data.sale_items.filter(i=>str(i.sale_source_id)===id), payment=data.payments.find(p=>str(p.sale_source_id)===id);
  const client=data.clients.find(c=>str(c.source_id)===str(sale.client_source_id));
  const cart=items.map((it,index)=>({name:it.product_source_id?products.get(str(it.product_source_id))||"—":it.manual_product_source_id?products.get(str(it.manual_product_source_id))||"—":services.get(str(it.service_source_id))||"—", qty:num(it.quantity)||1, price:num(it.price), isService:Boolean(it.service_source_id)}));
  const subtotal=cart.reduce((sum,item)=>sum+item.price*item.qty,0), discount=num(sale.discount), total=subtotal-discount;
  const isCash=!payment, paymentType=isCash?"none":payment?.type==="VERSEMENT"?"versement":"credit";
  const paidAmount=isCash?num(sale.total_amount_with_discount):(num(payment?.given_amount)||num(sale.total_amount_with_discount));
  const remaining=Math.max(0,total-paidAmount), itemCount=cart.reduce((sum,item)=>sum+item.qty,0);
  const formatFullDate=(v:unknown)=>{const d=new Date(str(v));return v&&!Number.isNaN(d.getTime())?new Intl.DateTimeFormat(language==="ar"?"ar-DZ":language==="fr"?"fr-DZ":"en",{dateStyle:"short",timeStyle:"medium"}).format(d):"—";};
  const copyId=()=>{void navigator.clipboard?.writeText(id);};
  return <div className="mobile-history-sale-modal-backdrop" onClick={onClose} role="presentation"><section className="mobile-history-sale-modal" role="dialog" aria-modal="true" aria-label={t.saleDetails} dir={language==="ar"?"rtl":"ltr"} onClick={e=>e.stopPropagation()}>
    <header className="mobile-history-sale-modal-header"><div className="mobile-history-sale-modal-title"><span><Receipt size={19}/></span><div><h3>{t.saleDetails}</h3><div><small>{id}</small><button type="button" onClick={copyId} aria-label="Copy sale ID"><Copy size={13}/></button></div></div></div><button type="button" className="mobile-history-modal-close" onClick={onClose} aria-label="Close"><X size={19}/></button></header>
    <div className="mobile-history-sale-modal-content">
      <section className="mobile-history-sale-info-panel"><div><h4><Calendar size={16}/>{t.saleInformation}</h4><div className="mobile-history-sale-info-box"><small>{t.date}</small><strong>{formatFullDate(sale.source_created_at)}</strong></div>{client?<div className="mobile-history-sale-info-box"><small><User size={12}/>{t.client}</small><strong>{str(client.name)}</strong></div>:null}</div>
        <div><h4><CreditCard size={16}/>{t.paymentInformation}</h4><div className="mobile-history-sale-info-box"><small>{t.paymentMethod}</small><strong className="mobile-history-method-value">{isCash?<Banknote size={14} className="is-cash"/>:<CreditCard size={14} className="is-credit"/>}{isCash?t.cash:paymentType==="versement"?t.versement:t.credit}</strong></div><div className="mobile-history-sale-info-box is-paid-amount"><small>{t.paidAmount}</small><strong>{money(paidAmount,language)}</strong></div></div>
        <div><h4><ShoppingBag size={16}/>{t.itemsSummary}</h4><div className="mobile-history-sale-info-box"><small>{t.totalItems}</small><strong>{itemCount} {t.itemsLabel}</strong></div></div>
      </section>
      <section className="mobile-history-payment-summary"><h4><DollarSign size={16}/>{t.paymentSummary}</h4><div className="mobile-history-payment-summary-inner">{client?<><div className="mobile-history-payment-client"><span>{t.client}:</span><strong>{str(client.name)}</strong></div><div className="mobile-history-payment-divider"/> </>:null}
        <div className="mobile-history-payment-table-wrap"><table><thead><tr><th>{t.product}</th><th>{t.qty}</th><th>{t.unit}</th><th>{t.totalLabel}</th></tr></thead><tbody>{cart.length?cart.map((item,index)=><tr key={index}><td>{item.isService?`🔧 ${item.name}`:item.name}</td><td>{item.qty}</td><td>{item.price.toLocaleString()}</td><td>{(item.qty*item.price).toLocaleString()}</td></tr>):<tr><td colSpan={4}>—</td></tr>}</tbody></table></div>
        <div className="mobile-history-payment-bottom"><div><span>{t.nbrItems}</span><span>{itemCount}</span></div>{discount>0?<div><span>{t.subtotal}</span><span>{subtotal.toLocaleString()} {t.currency}</span></div>:null}{paymentType==="credit"?<div><span>{t.paid}</span><span>{paidAmount.toLocaleString()} {t.currency}</span></div>:null}{paymentType==="versement"&&paidAmount>0?<div><span>{t.versement}</span><span>{paidAmount.toLocaleString()} {t.currency}</span></div>:null}{discount>0?<div><span>{t.discount}</span><span>-{discount.toLocaleString()} {t.currency}</span></div>:null}{(paymentType==="credit"||(paymentType==="versement"&&paidAmount>0))?<div className="is-remaining"><strong>{t.remaining}</strong><strong>{remaining.toLocaleString()} {t.currency}</strong></div>:null}<div className="is-total"><strong>{t.totalLabel}</strong><strong>{total.toLocaleString()} {t.currency}</strong></div></div>
      </div></section>
    </div>
  </section></div>;
}
