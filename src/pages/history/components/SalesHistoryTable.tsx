import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Eye,
  Package,
  SortAsc,
  SortDesc,
  DollarSign,
  Calendar,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "../../../lib/components/button";
import { Input } from "../../../lib/components/input";
import { Badge } from "../../../lib/components/badge";
import { Skeleton } from "../../../lib/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../lib/components/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../lib/components/pagination";
import SaleDetailsModal from "../../../lib/components/saleDetailsModal";
import { DateRange } from "../../../types";

interface SalesHistoryTableProps {
  data: any[];
  isLoading: boolean;
  dateRange: DateRange;
  onSaleUpdated?: (updatedSale: any) => void;
  onSaleDeleted?: (saleId: string) => void;
}

type SortField = "date" | "client" | "amount" | "items";
type SortDirection = "asc" | "desc";

export const SalesHistoryTable: React.FC<SalesHistoryTableProps> = React.memo(
  ({ data, isLoading, dateRange, onSaleUpdated, onSaleDeleted }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<SortField>("date");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Reset to first page when data changes
    useEffect(() => {
      setCurrentPage(1);
    }, [data]);

    // Generate pagination range with ellipses
    const getPaginationRange = () => {
      const delta = 2; // Number of pages to show on each side of current page
      const range = [];
      const rangeWithDots = [];

      for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
      ) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, "...");
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push("...", totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    // Filter and sort data
    const filteredAndSortedData = useMemo(() => {
      const filtered = data.filter((sale) => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        const clientName = sale.client?.name?.toLowerCase() || "";
        const saleId = sale.id.toLowerCase();

        return clientName.includes(searchLower) || saleId.includes(searchLower);
      });

      // Sort data
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
          case "date":
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          case "client":
            aValue = a.client?.name || "";
            bValue = b.client?.name || "";
            break;
          case "amount":
            aValue = a.totalAmountWithDiscount;
            bValue = b.totalAmountWithDiscount;
            break;
          case "items":
            aValue = a.totalItems;
            bValue = b.totalItems;
            break;
          default:
            return 0;
        }

        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      return filtered;
    }, [data, searchTerm, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredAndSortedData.slice(startIndex, endIndex);

    const handleSort = (field: SortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
      setCurrentPage(1);
    };

    const handleViewSale = (sale: any) => {
      setSelectedSale(sale);
      setIsModalOpen(true);
    };

    const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedSale(null);
    };

    const handleSaleUpdated = (updatedSale: any) => {
      // Call the parent callback if provided
      onSaleUpdated?.(updatedSale);

      // Update the local selectedSale state to reflect changes
      setSelectedSale(updatedSale);
    };

    const handleSaleDeleted = (saleId: string) => {
      // Call the parent callback if provided
      onSaleDeleted?.(saleId);

      // Close the modal since the sale no longer exists
      setIsModalOpen(false);
      setSelectedSale(null);
    };

    const formatCurrency = (amount: number) => {
      return `${amount.toLocaleString()} ${t("currency")}`;
    };

    const formatDate = (date: string | Date) => {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const getPaymentStatus = (sale: any) => {
      if (sale.isPaidInCash) {
        return {
          label: t("history.paidInCash", "Paid in Cash"),
          variant: "default" as const,
        };
      }

      // Check if there's a payment associated with the sale and if it's been paid
      if (sale.payment && sale.payment.paidDate) {
        return {
          label: t("history.completed", "Completed"),
          variant: "default" as const,
        };
      }

      if (sale.remainingAmount > 0) {
        return {
          label: t("history.partiallyPaid", "Partially Paid"),
          variant: "warning" as const,
        };
      }

      return {
        label: t("history.fullyPaid", "Fully Paid"),
        variant: "default" as const,
      };
    };

    const SortableHeader: React.FC<{
      field: SortField;
      children: React.ReactNode;
    }> = ({ field, children }) => (
      <Button
        variant="ghost"
        onClick={() => handleSort(field)}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        {children}
        {sortField === field &&
          (sortDirection === "asc" ? (
            <SortAsc className="ml-1 h-4 w-4" />
          ) : (
            <SortDesc className="ml-1 h-4 w-4" />
          ))}
      </Button>
    );

    if (isLoading) {
      return (
        <div className="space-y-4">
          {/* Search and Controls Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-80" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-[180px]" />
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-4 text-left">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </th>
                    <th className="p-4 text-left">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </th>
                    <th className="p-4 text-left">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </th>
                    <th className="p-4 text-left">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </th>
                    <th className="p-4 text-left">
                      <Skeleton className="h-4 w-20" />
                    </th>
                    <th className="p-4 text-left">
                      <Skeleton className="h-4 w-24" />
                    </th>
                    <th className="p-4 text-left">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.min(10, itemsPerPage) }).map(
                    (_, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-8 w-16" />
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t("history.noSalesFound", "No sales found")}
          </h3>
          <p className="text-muted-foreground">
            {dateRange.startDate || dateRange.endDate
              ? t(
                  "history.noSalesInPeriod",
                  "No sales found in the selected period",
                )
              : t("history.noSalesAtAll", "No sales have been recorded yet")}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Search and Controls */}
        <div className="flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              placeholder={t(
                "history.searchSales",
                "Search sales by client or ID...",
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground font-medium">
              {t("history.showing", "Showing")} {startIndex + 1}-
              {Math.min(endIndex, filteredAndSortedData.length)}{" "}
              {t("history.of", "of")} {filteredAndSortedData.length}
            </span>
            <Select
              onValueChange={(value) => setItemsPerPage(Number(value))}
              defaultValue={itemsPerPage.toString()}
            >
              <SelectTrigger className="w-[180px] border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue
                  placeholder={t("history.itemsPerPage", "Items per page")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-4 text-left">
                    <SortableHeader field="date">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {t("history.date", "Date")}
                        {isLoading && (
                          <div className="w-2 h-2 bg-primary/20 rounded-full animate-pulse" />
                        )}
                      </div>
                    </SortableHeader>
                  </th>
                  <th className="p-4 text-left">
                    <SortableHeader field="client">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t("history.client", "Client")}
                        {isLoading && (
                          <div className="w-2 h-2 bg-primary/20 rounded-full animate-pulse" />
                        )}
                      </div>
                    </SortableHeader>
                  </th>
                  <th className="p-4 text-left">
                    <SortableHeader field="items">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {t("history.items", "Items")}
                        {isLoading && (
                          <div className="w-2 h-2 bg-primary/20 rounded-full animate-pulse" />
                        )}
                      </div>
                    </SortableHeader>
                  </th>
                  <th className="p-4 text-left">
                    <SortableHeader field="amount">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {t("history.amount", "Amount")}
                        {isLoading && (
                          <div className="w-2 h-2 bg-primary/20 rounded-full animate-pulse" />
                        )}
                      </div>
                    </SortableHeader>
                  </th>
                  <th className="p-4 text-left">
                    <div className="flex items-center gap-2">
                      {t("history.paymentStatus", "Payment Status")}
                      {isLoading && (
                        <div className="w-2 h-2 bg-primary/20 rounded-full animate-pulse" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-left">
                    <div className="flex items-center gap-2">
                      {t("history.status", "Status")}
                      {isLoading && (
                        <div className="w-2 h-2 bg-primary/20 rounded-full animate-pulse" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-left">
                    <div className="flex items-center gap-2">
                      {t("history.actions", "Actions")}
                      {isLoading && (
                        <div className="w-2 h-2 bg-primary/20 rounded-full animate-pulse" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((sale) => {
                  const paymentStatus = getPaymentStatus(sale);
                  return (
                    <tr key={sale.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {formatDate(sale.createdAt)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {sale.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {sale.client?.name ||
                            t("history.noClient", "No Client")}
                        </div>
                        {sale.client?.phone && (
                          <div className="text-xs text-muted-foreground">
                            {sale.client.phone}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {sale.totalItems} {t("history.items", "items")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sale.saleItems.length} {t("history.types", "types")}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {formatCurrency(sale.totalAmountWithDiscount)}
                        </div>
                        {sale.discount > 0 && (
                          <div className="text-xs text-muted-foreground line-through">
                            {formatCurrency(sale.totalAmount)}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {sale.discount > 0 ? (
                          <div className="text-sm text-red-600 font-medium">
                            -{formatCurrency(sale.discount)}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {t("history.noDiscount", "No discount")}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={paymentStatus.variant}>
                          {paymentStatus.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title={t("history.viewDetails", "View sale details")}
                          onClick={() => handleViewSale(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {getPaginationRange().map((page, index) => (
                <PaginationItem key={index}>
                  {page === "..." ? (
                    <span className="px-3 py-2 text-gray-500">...</span>
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(page as number)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        {/* Sale Details Modal */}
        <SaleDetailsModal
          sale={selectedSale}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSaleUpdated={handleSaleUpdated}
          onSaleDeleted={handleSaleDeleted}
        />
      </div>
    );
  },
);
