import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "../../../lib/components/pagination";

interface SharedPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function SharedPagination({
  currentPage,
  totalPages,
  onPageChange,
}: SharedPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center mt-6">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            {currentPage === 1 ? (
              <span className="opacity-50 pointer-events-none select-none">
                <PaginationPrevious href="#" />
              </span>
            ) : (
              <PaginationPrevious
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(Math.max(1, currentPage - 1));
                }}
                href="#"
              />
            )}
          </PaginationItem>
          {/* Page numbers with ellipsis if needed */}
          {(() => {
            const items = [];
            let start = Math.max(1, currentPage - 4);
            let end = Math.min(totalPages, currentPage + 4);
            if (currentPage <= 5) {
              end = Math.min(10, totalPages);
            } else if (currentPage >= totalPages - 4) {
              start = Math.max(1, totalPages - 9);
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
          })()}
          <PaginationItem>
            {currentPage === totalPages ? (
              <span className="opacity-50 pointer-events-none select-none">
                <PaginationNext href="#" />
              </span>
            ) : (
              <PaginationNext
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(Math.min(totalPages, currentPage + 1));
                }}
                href="#"
              />
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
