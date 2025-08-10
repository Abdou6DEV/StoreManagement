import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import {
  Search,
  Eye,
  Calendar,
  User,
  CreditCard,
  DollarSign,
  Clock,
  SortAsc,
  SortDesc,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { DateRange } from "../../../types";
import PaymentsModal from "../../../lib/components/paymentsModal";

interface PaymentsHistoryTableProps {
  data: any[];
  isLoading: boolean;
  dateRange: DateRange;
}

type SortField = "date" | "client" | "amount" | "type" | "status";
type SortDirection = "asc" | "desc";

export const PaymentsHistoryTable: React.FC<PaymentsHistoryTableProps> =
  React.memo(({ data, isLoading, dateRange }) => {
    const { t } = useTranslation();

    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortField, setSortField] = useState<SortField>("date");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);

    // Filter and sort data
    const filteredAndSortedData = useMemo(() => {
      const filtered = data.filter((payment) => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        const clientName = payment.client?.name?.toLowerCase() || "";
        const paymentId = payment.id.toLowerCase();

        return (
          clientName.includes(searchLower) || paymentId.includes(searchLower)
        );
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
            aValue = a.givenAmount;
            bValue = b.givenAmount;
            break;
          case "type":
            aValue = a.type;
            bValue = b.type;
            break;
          case "status":
            aValue = a.paidDate ? "paid" : "pending";
            bValue = b.paidDate ? "paid" : "pending";
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

    // Reset to first page when data changes
    useEffect(() => {
      setCurrentPage(1);
    }, [data]);

    const handleViewPayments = (payment: any) => {
      if (payment.client) {
        setSelectedClient(payment.client);
        setIsPaymentsModalOpen(true);
      }
    };

    const handleClosePaymentsModal = () => {
      setIsPaymentsModalOpen(false);
      setSelectedClient(null);
    };

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

    const getPaymentStatus = (payment: any) => {
      if (payment.paidDate) {
        return {
          label: t("history.paid", "Paid"),
          variant: "default" as const,
          icon: <CheckCircle className="h-4 w-4" />,
        };
      }

      const dueDate = new Date(payment.dueDate);
      const now = new Date();

      if (dueDate < now) {
        return {
          label: t("history.overdue", "Overdue"),
          variant: "destructive" as const,
          icon: <AlertCircle className="h-4 w-4" />,
        };
      }

      return {
        label: t("history.pending", "Pending"),
        variant: "secondary" as const,
        icon: <Clock className="h-4 w-4" />,
      };
    };

    const getPaymentTypeInfo = (type: string) => {
      switch (type) {
        case "CREDIT":
          return {
            label: t("history.credit", "Credit"),
            variant: "outline" as const,
            color: "text-blue-600",
          };
        case "VERSEMENT":
          return {
            label: t("history.versement", "Versement"),
            variant: "outline" as const,
            color: "text-green-600",
          };
        default:
          return {
            label: type,
            variant: "outline" as const,
            color: "text-gray-600",
          };
      }
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
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </th>
                    <th className="p-4 text-left">
                      <Skeleton className="h-4 w-20" />
                    </th>
                    <th className="p-4 text-left">
                      <Skeleton className="h-4 w-20" />
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
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-8 w-8 rounded" />
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
          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t("history.noPaymentsFound", "No payments found")}
          </h3>
          <p className="text-muted-foreground">
            {dateRange.startDate || dateRange.endDate
              ? t(
                  "history.noPaymentsInPeriod",
                  "No payments found in the selected period",
                )
              : t(
                  "history.noPaymentsAtAll",
                  "No payments have been recorded yet",
                )}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Search and Controls */}
        <div className="flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t(
                "history.searchPayments",
                "Search payments by client or ID...",
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("history.showing", "Showing")} {startIndex + 1}-
              {Math.min(endIndex, filteredAndSortedData.length)}{" "}
              {t("history.of", "of")} {filteredAndSortedData.length}
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
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
                    <SortableHeader field="type">
                      <div className="flex items-center gap-2">
                        {t("history.type", "Type")}
                        {isLoading && (
                          <div className="w-2 h-2 bg-primary/20 rounded-full animate-pulse" />
                        )}
                      </div>
                    </SortableHeader>
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
                {currentData.map((payment) => {
                  const paymentStatus = getPaymentStatus(payment);
                  const paymentType = getPaymentTypeInfo(payment.type);
                  return (
                    <tr key={payment.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {formatDate(payment.createdAt)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {payment.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {payment.client?.name ||
                            t("history.noClient", "No Client")}
                        </div>
                        {payment.client?.phone && (
                          <div className="text-xs text-muted-foreground">
                            {payment.client.phone}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {formatCurrency(payment.givenAmount)}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={paymentType.variant}
                          className={paymentType.color}
                        >
                          {paymentType.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={paymentStatus.variant}
                          className="flex items-center gap-1"
                        >
                          {paymentStatus.icon}
                          {paymentStatus.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title={t(
                            "history.viewClientPayments",
                            "View client payments",
                          )}
                          onClick={() => handleViewPayments(payment)}
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

        {/* Payments Modal */}
        {isPaymentsModalOpen && selectedClient && (
          <PaymentsModal
            client={selectedClient}
            onClose={handleClosePaymentsModal}
          />
        )}
      </div>
    );
  });
