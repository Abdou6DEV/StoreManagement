import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../../lib/components/pagination";

interface GeneralHistoryPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function GeneralHistoryPagination({
  currentPage,
  totalPages,
  onPageChange,
}: GeneralHistoryPaginationProps) {
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
            const maxVisiblePages = 10;

            // Calculate start and end of visible page range
            let startPage = Math.max(
              1,
              currentPage - Math.floor(maxVisiblePages / 2),
            );
            const endPage = Math.min(
              totalPages,
              startPage + maxVisiblePages - 1,
            );

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
}
