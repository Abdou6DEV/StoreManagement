import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Calendar, ShoppingCart, CreditCard } from "lucide-react";
import rendererLogger from "../../../lib/logger/rendererLogger";
import type { SaleForHistory, PaymentForHistory, PurchaseForHistory, SelectedPeriod } from "../../../types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../lib/components/pagination";

interface DetailsHistoryProps {
  selectedPeriod: SelectedPeriod | null;
}

export default function DetailsHistory({ selectedPeriod }: DetailsHistoryProps) {
  const { t } = useTranslation();
  const [sales, setSales] = useState<SaleForHistory[]>([]);
  const [payments, setPayments] = useState<PaymentForHistory[]>([]);
  const [purchases, setPurchases] = useState<PurchaseForHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"sales" | "payments" | "purchases">("sales");
  
  // Pagination state for each section
  const [salesPage, setSalesPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Calculate pagination for each section
  const salesTotalPages = Math.ceil(sales.length / itemsPerPage);
  const paymentsTotalPages = Math.ceil(payments.length / itemsPerPage);
  const purchasesTotalPages = Math.ceil(purchases.length / itemsPerPage);

  const salesStartIndex = (salesPage - 1) * itemsPerPage;
  const salesEndIndex = salesStartIndex + itemsPerPage;
  const currentSales = sales.slice(salesStartIndex, salesEndIndex);

  const paymentsStartIndex = (paymentsPage - 1) * itemsPerPage;
  const paymentsEndIndex = paymentsStartIndex + itemsPerPage;
  const currentPayments = payments.slice(paymentsStartIndex, paymentsEndIndex);

  const purchasesStartIndex = (purchasesPage - 1) * itemsPerPage;
  const purchasesEndIndex = purchasesStartIndex + itemsPerPage;
  const currentPurchases = purchases.slice(purchasesStartIndex, purchasesEndIndex);

  // Reset pagination when section changes
  useEffect(() => {
    setSalesPage(1);
    setPaymentsPage(1);
    setPurchasesPage(1);
  }, [activeSection]);

  // Reset pagination when period changes
  useEffect(() => {
    setSalesPage(1);
    setPaymentsPage(1);
    setPurchasesPage(1);
  }, [selectedPeriod]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPeriodData();
    }
  }, [selectedPeriod]);

  const fetchPeriodData = async () => {
    if (!selectedPeriod) return;

    try {
      setLoading(true);
      
      // Fetch data for the selected period
      const [salesData, paymentsData, purchasesData] = await Promise.all([
        window.api.database.sales.getBySpecificPeriod(selectedPeriod.period, selectedPeriod.periodValue),
        window.api.database.payments.getBySpecificPeriod(selectedPeriod.period, selectedPeriod.periodValue),
        window.api.database.purchases.getBySpecificPeriod(selectedPeriod.period, selectedPeriod.periodValue),
      ]);

      setSales(salesData);
      setPayments(paymentsData);
      setPurchases(purchasesData);

      rendererLogger.debug(
        "Period data fetched successfully",
        "DetailsHistory",
        {
          period: selectedPeriod.period,
          periodValue: selectedPeriod.periodValue,
          salesCount: salesData.length,
          paymentsCount: paymentsData.length,
          purchasesCount: purchasesData.length,
        },
      );
    } catch (error) {
      rendererLogger.error(
        "Error fetching period data",
        "DetailsHistory",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DA`;
  };

  const formatDate = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleString();
  };

  const getPeriodDisplayName = () => {
    if (!selectedPeriod) return "";
    
    if (selectedPeriod.period === "day") {
      return new Date(selectedPeriod.periodValue).toLocaleDateString();
    } else if (selectedPeriod.period === "month") {
      const [year, month] = selectedPeriod.periodValue.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      });
    } else {
      return selectedPeriod.periodValue;
    }
  };

  // Pagination component for each section
  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center mt-6">
        <Pagination>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
          />
          <PaginationContent>
            {(() => {
              const pages = [];
              const maxVisiblePages = 7;

              // Calculate start and end of visible page range
              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
              const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

              // Adjust start if we're near the end
              if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }

              // Generate visible page numbers
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => onPageChange(i)}
                      isActive={i === currentPage}
                    >
                      {i}
                    </PaginationLink>
                  </PaginationItem>,
                );
              }

              return pages;
            })()}
          </PaginationContent>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
          />
        </Pagination>
      </div>
    );
  };

  if (!selectedPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="p-4 bg-muted/20 rounded-full mb-4">
          <Calendar className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t("history.selectPeriod")}
        </h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          {t("history.selectPeriodHint")}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>{t("history.loadingPeriodData")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/3 to-primary/6 border border-primary/15 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {t("history.detailedHistory")}
            </h2>
            <p className="text-muted-foreground mt-1">
              {getPeriodDisplayName()}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <span>{sales.length} Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-600" />
              <span>{payments.length} Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-600" />
              <span>{purchases.length} Purchases</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { id: "sales" as const, label: t("history.sales"), icon: ShoppingCart, count: sales.length },
            { id: "payments" as const, label: t("history.payments"), icon: CreditCard, count: payments.length },
            { id: "purchases" as const, label: t("history.purchases"), icon: FileText, count: purchases.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className="bg-muted px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeSection === "sales" && (
          <div className="space-y-4">
            {sales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p>{t("history.noSalesFoundForPeriod")}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {currentSales.map((sale) => (
                    <div key={sale.id} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(sale.createdAt)}
                          </span>
                          {sale.client && (
                            <span className="text-sm font-medium">
                              {t("history.client")}: {sale.client.name}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(
                            sale.saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0) - sale.discount
                          )}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {sale.saleItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>
                              {item.product?.name || item.manualProduct?.name || item.service?.name} x {item.quantity}
                            </span>
                            <span className="text-muted-foreground">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                        {sale.discount > 0 && (
                          <div className="flex items-center justify-between text-sm text-red-600">
                            <span>{t("history.discount")}</span>
                            <span>-{formatCurrency(sale.discount)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls
                  currentPage={salesPage}
                  totalPages={salesTotalPages}
                  onPageChange={setSalesPage}
                />
              </>
            )}
          </div>
        )}

        {activeSection === "payments" && (
          <div className="space-y-4">
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p>{t("history.noPaymentsFoundForPeriod")}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {currentPayments.map((payment) => (
                    <div key={payment.id} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(payment.createdAt)}
                          </span>
                          <span className="text-sm font-medium">
                            {payment.client.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                                                     <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                             {payment.type}
                           </span>
                          <span className="text-sm font-semibold text-primary">
                            {formatCurrency(payment.givenAmount)}
                          </span>
                        </div>
                      </div>
                      {payment.sale && (
                        <div className="text-sm text-muted-foreground">
                          {t("history.relatedToSale")}: {payment.sale.id} ({formatDate(payment.sale.createdAt)})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <PaginationControls
                  currentPage={paymentsPage}
                  totalPages={paymentsTotalPages}
                  onPageChange={setPaymentsPage}
                />
              </>
            )}
          </div>
        )}

        {activeSection === "purchases" && (
          <div className="space-y-4">
            {purchases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p>{t("history.noPurchasesFoundForPeriod")}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {currentPurchases.map((purchase) => (
                    <div key={purchase.id} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(purchase.createdAt)}
                          </span>
                          {purchase.seller && (
                            <span className="text-sm font-medium">
                              {t("history.seller")}: {purchase.seller.name}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(
                            purchase.PurchaseItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                          )}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {purchase.PurchaseItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>
                              {item.product.name} ({item.product.categoryName}) x {item.quantity}
                            </span>
                            <span className="text-muted-foreground">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls
                  currentPage={purchasesPage}
                  totalPages={purchasesTotalPages}
                  onPageChange={setPurchasesPage}
                />A
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
