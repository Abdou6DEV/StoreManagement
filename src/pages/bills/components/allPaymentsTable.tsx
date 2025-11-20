import React from "react";
import { Calendar, CreditCard, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../../../lib/components/tooltip";
import { Badge } from "../../../lib/components/badge";
import { Button } from "../../../lib/components/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../../../lib/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../lib/components/popover";
import { cn } from "../../../lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../../lib/components/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../lib/components/select";

interface Payment {
  id: string;
  billId: string;
  amount: number;
  paidDate: Date;
  notes?: string | null;
  bill: {
    id: string;
    title: string;
    type: string;
  };
}

interface AllPaymentsTableProps {
  payments: Payment[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (size: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  billTypes: string[];
  showFilters?: boolean;
}

const AllPaymentsTable: React.FC<AllPaymentsTableProps> = ({ 
  payments, 
  currentPage, 
  totalPages, 
  itemsPerPage, 
  onPageChange, 
  onItemsPerPageChange,
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  billTypes,
  showFilters = true
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const formatCurrency = (amount: number) => {
    // Bills are stored in centimes, so always divide by 100
    const value = amount / 100;
    // Remove trailing .00 if it's a whole number
    const cleanValue = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
    return `${cleanValue} ${t("bills.currency", "DA")}`;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const renderPageNumbers = () => {
    const items = [];
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
              onPageChange(i);
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
  };

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;
  const hasNoData = payments.length === 0;


  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <CreditCard className="w-12 h-12 text-purple-500 mb-1" />
        <h3 className="text-xl font-semibold text-foreground">
          {t("bills.noPaymentsTitle", "No payments found")}
        </h3>
        <p className="text-base text-muted-foreground max-w-md">
          {t("bills.noPaymentsDesc", "No payments have been recorded yet.")}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Table */}
      <div className="overflow-auto rounded-lg border border-muted">
        <table
          className={`min-w-full text-sm ${isRTL ? "text-right" : "text-left"}`}
        >
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.paymentDate", "Payment Date")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.billName", "Bill Name")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.billType", "Bill Type")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.amount", "Amount")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.notes", "Notes")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="h-[48px] hover:bg-muted/40 transition"
              >
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(payment.paidDate)}</span>
                  </div>
                </td>
                <td                                           
                  className={`px-4 py-2 font-medium ${isRTL ? "text-right" : "text-left"}`}
                >
                  {payment.bill.title}
                </td>
                <td className={`px-4 py-2 font-medium ${isRTL ? "text-right" : "text-left"}`}>
                  {payment.bill.type}
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span className="text-base font-bold text-blue-400">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  {payment.notes || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {payments.length > 0 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                {isFirstPage || hasNoData ? (
                  <span className="opacity-50 pointer-events-none select-none">
                    <PaginationPrevious href="#" />
                  </span>
                ) : (
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage - 1);
                    }}
                    href="#"
                  />
                )}
              </PaginationItem>

              {renderPageNumbers()}

              <PaginationItem>
                {isLastPage || hasNoData ? (
                  <span className="opacity-50 pointer-events-none select-none">
                    <PaginationNext href="#" />
                  </span>
                ) : (
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage + 1);
                    }}
                    href="#"
                  />
                )}
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
};

export default AllPaymentsTable;
