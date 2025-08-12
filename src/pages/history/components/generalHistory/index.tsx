import type { AggregationLevel } from "../../../../types";
import { useGeneralHistoryData } from "./useGeneralHistoryData";
import GeneralHistoryControls from "./generalHistoryControls";
import GeneralHistoryTable from "./generalHistoryTable";
import SharedPagination from "../sharedPagination";
import LoadingState from "./loadingState";
import EmptyState from "./emptyState";

interface GeneralHistoryProps {
  onPeriodSelect?: (period: AggregationLevel, periodValue: string) => void;
}

export default function GeneralHistory({ onPeriodSelect }: GeneralHistoryProps) {
  const {
    aggregationLevel,
    setAggregationLevel,
    aggregatedData,
    loading,
    currentPage,
    setCurrentPage,
    totalPages,
    currentData,
  } = useGeneralHistoryData();

  const handleRowDoubleClick = (period: string) => {
    if (onPeriodSelect) {
      onPeriodSelect(aggregationLevel, period);
    }
  };

  return (
    <div className="space-y-6">
      <GeneralHistoryControls
        aggregationLevel={aggregationLevel}
        onAggregationLevelChange={setAggregationLevel}
      />

      {loading ? (
        <LoadingState />
      ) : aggregatedData.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <GeneralHistoryTable
            data={currentData}
            aggregationLevel={aggregationLevel}
            onRowDoubleClick={handleRowDoubleClick}
          />
          <SharedPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
