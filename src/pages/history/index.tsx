import React, { useEffect, useState } from "react";
import { Loader2, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import SalesTable from "./components/salesTable";
import SearchBar from "./components/searchBar";
import PaymentsTable from "./components/paymentsTable";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../lib/components/ui/pagination";

type SaleWithDetails = Awaited<
  ReturnType<typeof window.api.database.sales.getAll>
>[0];

export default function History() {
  const { t } = useTranslation();
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [view, setView] = useState<"sales" | "payments">("sales");

  const fetchSales = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.database.sales.getAll();
      setSales(data);
    } catch (err) {
      setError(t("history.fetchError", "Failed to fetch sales history"));
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.database.payments.getAll();
      setPayments(data);
    } catch (err) {
      setError(
        t("history.fetchPaymentsError", "Failed to fetch payment history"),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "sales") {
      fetchSales();
    } else {
      fetchPayments();
    }
  }, [view]);

  // Filtering logic
  const filteredSales = sales
    // Exclude sales with any payment of type 'VERSEMENT'
    .filter((sale) =>
      !Array.isArray(sale.payments) ||
      !sale.payments.some((payment) => payment.type === "VERSEMENT")
    )
    .filter((sale) => {
      const searchLower = search.toLowerCase();
      return (
        sale.id.toLowerCase().includes(searchLower) ||
        sale.client?.name.toLowerCase().includes(searchLower) ||
        sale.client?.phone?.toLowerCase().includes(searchLower) ||
        sale.saleItems.some((item) =>
          item.product.name.toLowerCase().includes(searchLower),
        ) ||
        (sale.isPaidInCash &&
          ("cash".includes(searchLower) ||
            "paid".includes(searchLower) ||
            "full".includes(searchLower))) ||
        (!sale.isPaidInCash &&
          sale.remainingAmount <= 0 &&
          "paid".includes(searchLower)) ||
        (!sale.isPaidInCash &&
          sale.totalPaid > 0 &&
          sale.remainingAmount > 0 &&
          "unpaid".includes(searchLower)) ||
        (!sale.isPaidInCash &&
          sale.totalPaid === 0 &&
          "pending".includes(searchLower))
      );
    });

  const filteredPayments = payments.filter((payment) => {
    const searchLower = search.toLowerCase();
    return (
      payment.id?.toLowerCase().includes(searchLower) ||
      payment.saleId?.toLowerCase().includes(searchLower) ||
      payment.client?.name?.toLowerCase().includes(searchLower) ||
      payment.client?.phone?.toLowerCase().includes(searchLower) ||
      payment.type?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const totalSalesPages = Math.max(
    1,
    Math.ceil(filteredSales.length / itemsPerPage),
  );
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalPaymentsPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / itemsPerPage),
  );
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset to page 1 when search or itemsPerPage changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, itemsPerPage, view]);

  return (
    <main className="px-6 md:px-12 flex-1 space-y-4">
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 mb-4">
          <Receipt className="w-7 h-7 text-cyan-500" />
          <h1 className="text-2xl font-bold">
            {t("history.title", "Sales & Payment History")}
          </h1>
        </div>

        {/* Toggle between Sales and Payments */}
        <div className="flex gap-2 mb-4">
          <button
            className={`px-4 py-2 rounded-md font-medium border ${view === "sales" ? "bg-primary text-white" : "bg-card text-foreground border-border"}`}
            onClick={() => setView("sales")}
          >
            {t("history.salesTab", "Sales History")}
          </button>
          <button
            className={`px-4 py-2 rounded-md font-medium border ${view === "payments" ? "bg-primary text-white" : "bg-card text-foreground border-border"}`}
            onClick={() => setView("payments")}
          >
            {t("history.paymentsTab", "Payment History")}
          </button>
        </div>

        {/* Items per page selector and search bar in the same row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("history.itemsPerPage", "Items per page:")}
            </span>
            <select
              className="px-2 py-1 border rounded text-sm bg-card"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label={t(
                "history.selectItemsPerPage",
                "Select items per page",
              )}
            >
              {[5, 10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <SearchBar search={search} setSearch={setSearch} />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" />
            {t(
              "history.loading",
              view === "sales"
                ? "Loading sales history..."
                : "Loading payment history...",
            )}
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <>
            {view === "sales" ? (
              <SalesTable sales={paginatedSales} />
            ) : (
              <PaymentsTable payments={paginatedPayments} />
            )}

            {/* Pagination Navigation */}
            {(view === "sales" ? totalSalesPages : totalPaymentsPages) > 1 && (
              <Pagination className="mt-6">
                <PaginationContent>
                  <PaginationItem>
                    {currentPage === 1 ||
                    (view === "sales"
                      ? filteredSales.length
                      : filteredPayments.length) === 0 ? (
                      <span className="opacity-50 pointer-events-none select-none">
                        <PaginationPrevious href="#" />
                      </span>
                    ) : (
                      <PaginationPrevious
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(currentPage - 1);
                        }}
                        href="#"
                      />
                    )}
                  </PaginationItem>
                  {/* Page numbers with ellipsis if needed */}
                  {(() => {
                    const items = [];
                    const totalPages =
                      view === "sales" ? totalSalesPages : totalPaymentsPages;
                    let start = Math.max(1, currentPage - 2);
                    let end = Math.min(totalPages, currentPage + 2);
                    if (currentPage <= 3) {
                      end = Math.min(5, totalPages);
                    } else if (currentPage >= totalPages - 2) {
                      start = Math.max(1, totalPages - 4);
                    }
                    if (start > 1) {
                      items.push(
                        <PaginationItem key="start-ellipsis">
                          <PaginationEllipsis />
                        </PaginationItem>,
                      );
                    }
                    for (let i = start; i <= end; i++) {
                      items.push(
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={i === currentPage}
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(i);
                            }}
                          >
                            {i}
                          </PaginationLink>
                        </PaginationItem>,
                      );
                    }
                    if (end < totalPages) {
                      items.push(
                        <PaginationItem key="end-ellipsis">
                          <PaginationEllipsis />
                        </PaginationItem>,
                      );
                    }
                    return items;
                  })()}
                  <PaginationItem>
                    {currentPage ===
                      (view === "sales"
                        ? totalSalesPages
                        : totalPaymentsPages) ||
                    (view === "sales"
                      ? filteredSales.length
                      : filteredPayments.length) === 0 ? (
                      <span className="opacity-50 pointer-events-none select-none">
                        <PaginationNext href="#" />
                      </span>
                    ) : (
                      <PaginationNext
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(currentPage + 1);
                        }}
                        href="#"
                      />
                    )}
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </section>
    </main>
  );
}
