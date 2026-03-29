import { useState } from "react";
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

export default function GeneralHistory({
  onPeriodSelect,
}: GeneralHistoryProps) {
  const {
    aggregationLevel,
    setAggregationLevel,
    aggregatedData,
    loading,
    currentPage,
    setCurrentPage,
    totalPages,
    currentData,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    itemsPerPage,
    setItemsPerPage,
    availableDates,
  } = useGeneralHistoryData();
  const [highlightEnabled, setHighlightEnabled] = useState(false);
  const [netProfitEnabled, setNetProfitEnabled] = useState(false);
  const [showTotalsRow, setShowTotalsRow] = useState(true);

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
        highlightEnabled={highlightEnabled}
        onHighlightChange={setHighlightEnabled}
        netProfitEnabled={netProfitEnabled}
        onNetProfitChange={setNetProfitEnabled}
        showTotalsRow={showTotalsRow}
        onShowTotalsRowChange={setShowTotalsRow}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        availableDates={availableDates}
      />

      {loading ? (
        <LoadingState />
      ) : aggregatedData.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <GeneralHistoryTable
            data={currentData}
            allData={aggregatedData}
            aggregationLevel={aggregationLevel}
            onRowDoubleClick={handleRowDoubleClick}
            highlightEnabled={highlightEnabled}
            netProfitEnabled={netProfitEnabled}
            showTotalsRow={showTotalsRow}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
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
