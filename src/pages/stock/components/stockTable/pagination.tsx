import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../../../lib/components/pagination";
import type { PaginationProps } from "./types";

export const StockPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  viewMode,
  filteredCategorySummaries,
  itemsPerPage,
}: PaginationProps) => {
  const totalPagesToShow =
    viewMode === "product"
      ? totalPages
      : Math.ceil(filteredCategorySummaries.length / itemsPerPage);

  if (
    !(
      (viewMode === "product" && totalPages > 1) ||
      (viewMode === "category" && totalPagesToShow > 1)
    )
  ) {
    return null;
  }

  const renderPageNumbers = () => {
    const items = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPagesToShow, currentPage + 2);

    if (currentPage <= 3) {
      end = Math.min(5, totalPagesToShow);
    } else if (currentPage >= totalPagesToShow - 2) {
      start = Math.max(1, totalPagesToShow - 4);
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

    if (end < totalPagesToShow) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    return items;
  };

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPagesToShow;
  const hasNoData =
    (viewMode === "product" && totalPages === 0) ||
    (viewMode === "category" && filteredCategorySummaries.length === 0);

  return (
    <Pagination className="mt-6">
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
  );
};
