import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "../../lib/components/button";
import { FileText, ChevronDown, Check, CreditCard, DollarSign, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../lib/contexts/toastContext";
import { useAuth } from "../../lib/contexts/authContext";
import { useOverdueBills } from "../../lib/contexts/overdueBillsContext";
import { useDueSoonBills } from "../../lib/contexts/dueSoonBillsContext";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../../lib/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../lib/components/popover";
import { cn } from "../../lib/utils";
import { BadgeNotification } from "../../lib/components/badgeNotification";
import { Tooltip } from "../../lib/components/tooltip";

import BillsTable from "./components/billsTable";
import AllPaymentsTable from "./components/allPaymentsTable";
import AddBillForm from "./components/addBillForm";

interface Bill {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  amount: number;
  nextBillDate: Date;
  duration: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  payments?: {
    id: string;
    amount: number;
    paidDate: Date;
    notes?: string | null;
  }[];
}

export default function BillsPage() {
  const location = useLocation();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { unseenOverdueBillsCount, markOverdueBillsAsSeen } = useOverdueBills();
  const { unseenDueSoonBillsCount, markDueSoonBillsAsSeen, dueSoonThresholdDays } = useDueSoonBills();
  const notificationAction = (location.state as { notificationAction?: string } | null)?.notificationAction;
  const [openPanel, setOpenPanel] = useState<"add" | null>(null);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [allPayments, setAllPayments] = useState<{
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
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  
  // Pagination state
  const [billsCurrentPage, setBillsCurrentPage] = useState(1);
  const [billsItemsPerPage, setBillsItemsPerPage] = useState(10);
  const [paymentsCurrentPage, setPaymentsCurrentPage] = useState(1);
  const [paymentsItemsPerPage, setPaymentsItemsPerPage] = useState(10);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  
  // Payments filter states
  const [paymentsSearchTerm, setPaymentsSearchTerm] = useState("");
  const [paymentsTypeFilter, setPaymentsTypeFilter] = useState("all");
  const [billTypes, setBillTypes] = useState<string[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [seenOverdueBills, setSeenOverdueBills] = useState<Set<string>>(new Set());
  const [seenDueSoonBills, setSeenDueSoonBills] = useState<Set<string>>(new Set());
  const [newlyOverdueBillsIds, setNewlyOverdueBillsIds] = useState<Set<string>>(new Set());
  const [newlyDueSoonBillsIds, setNewlyDueSoonBillsIds] = useState<Set<string>>(new Set());
  const [isViewingOverdueTable, setIsViewingOverdueTable] = useState(false);
  const [isViewingDueSoonTable, setIsViewingDueSoonTable] = useState(false);

  const loadBills = async () => {
    try {
      setLoading(true);
      const billsData = await window.api.database.bills.getAll();
      setAllBills(billsData);
    } catch (error) {
      console.error("Error loading bills:", error);
      showToast(t("bills.failedToLoadBills", "Failed to load bills"), "error");
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering and sorting logic (like stock table)
  const filteredBills = allBills
    .filter((bill: Bill) => {
      // Search filter
      const search = searchTerm.toLowerCase();
      const matchesSearch = !search || 
        bill.title.toLowerCase().includes(search) ||
        (bill.description && bill.description.toLowerCase().includes(search)) ||
        bill.type.toLowerCase().includes(search) ||
        (bill.notes && bill.notes.toLowerCase().includes(search));

      // Type filter
      const matchesType = typeFilter === "all" || bill.type === typeFilter;

      // Status filter (recurring vs one-time)
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "recurring" && bill.duration !== "NO_NEXT") ||
        (statusFilter === "oneTime" && bill.duration === "NO_NEXT");

      // Due status filter
      let matchesDueStatus = true;
      if (dueFilter !== "all") {
        // Exclude one-time bills from due status filtering
        if (bill.duration === "NO_NEXT") {
          matchesDueStatus = false;
        } else {
          const today = new Date();
          const dueDate = new Date(bill.nextBillDate);
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (dueFilter === "dueSoon") {
            matchesDueStatus = diffDays <= dueSoonThresholdDays && diffDays >= 0;
          } else if (dueFilter === "overdue") {
            matchesDueStatus = diffDays < 0;
          }
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesDueStatus;
    })
    .sort((a, b) => {
      // Prioritize highlighted bills (newly overdue and due soon)
      const aIsHighlighted = newlyOverdueBillsIds.has(a.id) || newlyDueSoonBillsIds.has(a.id);
      const bIsHighlighted = newlyOverdueBillsIds.has(b.id) || newlyDueSoonBillsIds.has(b.id);
      
      if (aIsHighlighted && !bIsHighlighted) return -1;
      if (!aIsHighlighted && bIsHighlighted) return 1;
      
      // If both or neither are highlighted, sort by next bill date
      return new Date(a.nextBillDate).getTime() - new Date(b.nextBillDate).getTime();
    });

  // Calculate newly overdue/due soon bills for highlighting (always, not just when filtered)
  useEffect(() => {
    // Always calculate highlighting for all bills
    const overdueBills = allBills.filter(bill => {
      if (bill.duration === "NO_NEXT") return false;
      const today = new Date();
      const dueDate = new Date(bill.nextBillDate);
      return dueDate < today && !seenOverdueBills.has(bill.id);
    });
    
    const dueSoonBills = allBills.filter(bill => {
      if (bill.duration === "NO_NEXT") return false;
      const today = new Date();
      const dueDate = new Date(bill.nextBillDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= dueSoonThresholdDays && diffDays >= 0 && !seenDueSoonBills.has(bill.id);
    });
    
    setNewlyOverdueBillsIds(new Set(overdueBills.map(bill => bill.id)));
    setNewlyDueSoonBillsIds(new Set(dueSoonBills.map(bill => bill.id)));
  }, [allBills, seenOverdueBills, seenDueSoonBills, dueSoonThresholdDays]);

  // Handle marking as seen when viewing filtered tables
  useEffect(() => {
    if (dueFilter === "overdue") {
      // Mark that we're viewing the overdue table
      setIsViewingOverdueTable(true);
      setIsViewingDueSoonTable(false);
    } else if (dueFilter === "dueSoon") {
      // Mark that we're viewing the due soon table
      setIsViewingDueSoonTable(true);
      setIsViewingOverdueTable(false);
    } else {
      // Mark as seen when filter is changed away from overdue or due soon
      if (isViewingOverdueTable) {
        markOverdueBillsAsSeen();
        setIsViewingOverdueTable(false);
      }
      if (isViewingDueSoonTable) {
        markDueSoonBillsAsSeen();
        setIsViewingDueSoonTable(false);
      }
    }
  }, [dueFilter, isViewingOverdueTable, isViewingDueSoonTable, markOverdueBillsAsSeen, markDueSoonBillsAsSeen]);


  // Reset pagination when filters change
  useEffect(() => {
    setBillsCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, dueFilter, dueSoonThresholdDays]);

  // Reset payments pagination when payments filters change
  useEffect(() => {
    setPaymentsCurrentPage(1);
  }, [paymentsSearchTerm, paymentsTypeFilter]);

  // Filter payments
  const filteredPayments = allPayments.filter((payment) => {
    // Search filter
    const search = paymentsSearchTerm.toLowerCase();
    const matchesSearch = !search || 
      payment.bill.title.toLowerCase().includes(search) ||
      payment.bill.type.toLowerCase().includes(search) ||
      (payment.notes && payment.notes.toLowerCase().includes(search));

    // Type filter
    const matchesType = paymentsTypeFilter === "all" || payment.bill.type === paymentsTypeFilter;

    return matchesSearch && matchesType;
  });

  // Pagination calculations
  const billsTotalPages = Math.ceil(filteredBills.length / billsItemsPerPage);
  const paymentsTotalPages = Math.ceil(filteredPayments.length / paymentsItemsPerPage);
  
  const paginatedBills = filteredBills.slice(
    (billsCurrentPage - 1) * billsItemsPerPage,
    billsCurrentPage * billsItemsPerPage
  );
  
  const paginatedPayments = filteredPayments.slice(
    (paymentsCurrentPage - 1) * paymentsItemsPerPage,
    paymentsCurrentPage * paymentsItemsPerPage
  );


  useEffect(() => {
    setPaymentsCurrentPage(1);
  }, [allPayments]);

  const loadBillTypes = async () => {
    try {
      const types = await window.api.database.bills.getBillTypes();
      setBillTypes(types);
    } catch (error) {
      console.error("Error loading bill types:", error);
    }
  };

  const loadAllPayments = async () => {
    try {
      const payments = await window.api.database.bills.getAllPayments();
      setAllPayments(payments);
    } catch (error) {
      console.error("Error loading all payments:", error);
      showToast(t("bills.failedToLoadPayments", "Failed to load payments"), "error");
    }
  };



  // Load seen bills from localStorage
  useEffect(() => {
    const savedOverdue = localStorage.getItem('seenOverdueBills');
    const savedDueSoon = localStorage.getItem('seenDueSoonBills');
    
    if (savedOverdue) {
      setSeenOverdueBills(new Set(JSON.parse(savedOverdue)));
    }
    if (savedDueSoon) {
      setSeenDueSoonBills(new Set(JSON.parse(savedDueSoon)));
    }
  }, []);

  // Save seen bills to localStorage when they change
  useEffect(() => {
    localStorage.setItem('seenOverdueBills', JSON.stringify(Array.from(seenOverdueBills)));
  }, [seenOverdueBills]);

  useEffect(() => {
    localStorage.setItem('seenDueSoonBills', JSON.stringify(Array.from(seenDueSoonBills)));
  }, [seenDueSoonBills]);

  useEffect(() => {
    loadBills();
    loadBillTypes();
  }, []);

  // Handle notification actions
  useEffect(() => {
    if (notificationAction === 'overdue') {
      setDueFilter('overdue');
    } else if (notificationAction === 'dueSoon') {
      setDueFilter('dueSoon');
    }
  }, [notificationAction]);

  const handleEdit = () => {
    // This will be handled by the EditBillModal in the BillsTable component
    // We just need to refresh the bills list
    loadBills();
  };

  const handleDelete = async (billId: string) => {
    try {
      setDeleteLoading(billId);
      const bill = allBills.find((b) => b.id === billId);
      const billTitle = bill?.title ?? billId;
      await window.api.database.bills.delete(billId);
      await loadBills();
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.billDeleted",
        details: `"${billTitle}" (${bill?.type ?? ""})`,
      }).catch(() => {});
      showToast(t("bills.billDeletedSuccessfully", "Bill deleted successfully"), "success");
    } catch (error) {
      console.error("Error deleting bill:", error);
      showToast(t("bills.failedToDeleteBill", "Failed to delete bill"), "error");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleBillAdded = () => {
    loadBills();
    setOpenPanel(null);
    setEditingBill(null);
  };

  const handleBillUpdated = () => {
    loadBills();
    setOpenPanel(null);
    setEditingBill(null);
  };

  const handleViewPayments = () => {
    setShowAllPayments(true);
    loadAllPayments();
  };

  const handleBackToBills = () => {
    setShowAllPayments(false);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <main className="px-6 md:px-12 flex-1 space-y-4">
      <AddBillForm 
        openPanel={openPanel} 
        setOpenPanel={setOpenPanel}
        editingBill={editingBill}
        onBillAdded={handleBillAdded}
        onBillUpdated={handleBillUpdated}
      />
      
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-6 space-y-4">
          {/* Header with toggle button */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-3">
              {showAllPayments ? (
                <CreditCard className="w-7 h-7 text-purple-600" />
              ) : (
                <CreditCard className="w-7 h-7 text-purple-600" />
              )}
              <h1 className="text-2xl font-bold">
              {showAllPayments ? t("bills.allPayments", "All Payments") : t("bills.billsList", "Bills List")}
              </h1>
            </div>
            <div className="flex items-center gap-3">
            <Tooltip
              content={showAllPayments 
                ? t("bills.backToBillsTooltip", "Return to bills management view") 
                : t("bills.viewAllPaymentsTooltip", "View all payments history")
              }
            >
            <Button
              onClick={showAllPayments ? handleBackToBills : handleViewPayments}
              variant="outline"
                className="gap-2"
            >
              <FileText className="w-4 h-4" />
              {showAllPayments ? t("bills.backToBills", "Back to Bills") : t("bills.allPaymentsView", "All Payments View")}
            </Button>
            </Tooltip>
            </div>
          </div>

          {/* Filters - only show for bills view */}
          {!showAllPayments && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Items per page selector - shown in both views */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t("stock.itemsPerPage", "Items per page:")}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="px-3 py-1.5 min-w-[70px]"
                        aria-label={t(
                          "stock.selectItemsPerPage",
                          "Select items per page",
                        )}
                      >
                        {billsItemsPerPage}
                        <ChevronDown className="ml-2 w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[120px] p-0 z-50">
                      <Command shouldFilter={false}>
                        <CommandList>
                          <CommandGroup>
                            {[5, 10, 25, 50, 100].map((size) => (
                              <CommandItem
                                key={size}
                                value={size.toString()}
                                onSelect={() => {
                                  setBillsItemsPerPage(size);
                                }}
                              >
                                {size}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    billsItemsPerPage === size ? "opacity-100" : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Search input - shown in both views */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t("bills.searchBills", "Search bills...")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 rounded-md border-2 border-primary/20 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition w-[350px]"
                    aria-label={t("bills.searchBills", "Search bills")}
                  />
                </div>

                {/* Type Filter Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="px-3 py-1.5"
                      aria-label={t("bills.filterByType", "Filter by type")}
                    >
                      {typeFilter === "all" ? t("bills.allTypes", "All Types") : typeFilter}
                      <ChevronDown className="ml-2 w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 z-50">
                    <Command shouldFilter={false}>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            key="all"
                            value=""
                            onSelect={() => setTypeFilter("all")}
                          >
                            {t("bills.allTypes", "All Types")}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                typeFilter === "all" ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                    {billTypes.map(type => (
                            <CommandItem
                              key={type}
                              value={type}
                              onSelect={() => setTypeFilter(type)}
                            >
                              {type}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  typeFilter === type ? "opacity-100" : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Status Filter Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="px-3 py-1.5"
                      aria-label={t("bills.filterByStatus", "Filter by status")}
                    >
                      {statusFilter === "all" ? t("bills.allStatuses", "All Statuses") : 
                       statusFilter === "recurring" ? t("bills.actif", "Actif") : 
                       t("bills.inactif", "Inactif")}
                      <ChevronDown className="ml-2 w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 z-50">
                    <Command shouldFilter={false}>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            key="all"
                            value=""
                            onSelect={() => setStatusFilter("all")}
                          >
                            {t("bills.allStatuses", "All Statuses")}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                statusFilter === "all" ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                          <CommandItem
                            key="recurring"
                            value="recurring"
                            onSelect={() => setStatusFilter("recurring")}
                          >
                            {t("bills.actif", "Actif")}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                statusFilter === "recurring" ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                          <CommandItem
                            key="oneTime"
                            value="oneTime"
                            onSelect={() => setStatusFilter("oneTime")}
                          >
                            {t("bills.inactif", "Inactif")}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                statusFilter === "oneTime" ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Due Status Filter Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 relative"
                      aria-label={t("bills.filterByDueStatus", "Filter by due status")}
                    >
                      <div className="flex items-center gap-2">
                        {dueFilter === "all" ? t("bills.allDueStatuses", "All Due Statuses") : 
                         dueFilter === "dueSoon" ? t("bills.dueSoon", "Due Soon") : 
                         t("bills.overdue", "Overdue")}
                        {unseenOverdueBillsCount > 0 && (
                          <BadgeNotification 
                            count={unseenOverdueBillsCount} 
                            variant="red"
                            className="h-4 text-xs"
                          />
                        )}
                        {unseenOverdueBillsCount === 0 && unseenDueSoonBillsCount > 0 && (
                          <BadgeNotification 
                            count={unseenDueSoonBillsCount} 
                            variant="orange"
                            className="h-4 text-xs"
                          />
                        )}
                      </div>
                      <ChevronDown className="ml-2 w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 z-50">
                    <Command shouldFilter={false}>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            key="all"
                            value=""
                            onSelect={() => setDueFilter("all")}
                          >
                            {t("bills.allDueStatuses", "All Due Statuses")}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                dueFilter === "all" ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                          <CommandItem
                            key="dueSoon"
                            value="dueSoon"
                            onSelect={() => setDueFilter("dueSoon")}
                          >
                            <div className="flex items-center gap-2">
                              {t("bills.dueSoon", "Due Soon")}
                              {unseenDueSoonBillsCount > 0 && (
                                <BadgeNotification 
                                  count={unseenDueSoonBillsCount} 
                                  variant="orange"
                                  className="absolute top-1 right-3 z-10"
                                />
                              )}
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                dueFilter === "dueSoon" ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                          <CommandItem
                            key="overdue"
                            value="overdue"
                            onSelect={() => setDueFilter("overdue")}
                          >
                            <div className="flex items-center gap-2">
                              {t("bills.overdue", "Overdue")}
                              {unseenOverdueBillsCount > 0 && (
                                <BadgeNotification 
                                  count={unseenOverdueBillsCount} 
                                  variant="red"
                                  className="absolute top-1 right-3 z-10"
                                />
                              )}
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                dueFilter === "overdue" ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
                </div>
          )}

          {/* Filters for payments view */}
          {showAllPayments && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Items per page selector - shown in both views */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t("stock.itemsPerPage", "Items per page:")}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                <Button
                        variant="outline"
                        className="px-3 py-1.5 min-w-[70px]"
                        aria-label={t(
                          "stock.selectItemsPerPage",
                          "Select items per page",
                        )}
                      >
                        {paymentsItemsPerPage}
                        <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[120px] p-0 z-50">
                      <Command shouldFilter={false}>
                        <CommandList>
                          <CommandGroup>
                            {[5, 10, 25, 50, 100].map((size) => (
                              <CommandItem
                                key={size}
                                value={size.toString()}
                                onSelect={() => {
                                  setPaymentsItemsPerPage(size);
                                }}
                              >
                                {size}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    paymentsItemsPerPage === size ? "opacity-100" : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Search input - shown in both views */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t("bills.searchPayments", "Search payments...")}
                    value={paymentsSearchTerm}
                    onChange={(e) => setPaymentsSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 rounded-md border-2 border-primary/20 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition w-[350px]"
                    aria-label={t("bills.searchPayments", "Search payments")}
                  />
                </div>

                {/* Type Filter Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                <Button
                      variant="outline"
                      className="px-3 py-1.5"
                      aria-label={t("bills.filterByType", "Filter by type")}
                    >
                      {paymentsTypeFilter === "all" ? t("bills.allTypes", "All Types") : paymentsTypeFilter}
                      <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 z-50">
                    <Command shouldFilter={false}>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            key="all"
                            value=""
                            onSelect={() => setPaymentsTypeFilter("all")}
                          >
                            {t("bills.allTypes", "All Types")}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                paymentsTypeFilter === "all" ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                    {billTypes.map(type => (
                            <CommandItem
                              key={type}
                              value={type}
                              onSelect={() => setPaymentsTypeFilter(type)}
                            >
                              {type}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  paymentsTypeFilter === type ? "opacity-100" : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

                 {/* Table Content */}
                 {showAllPayments ? (
                   <AllPaymentsTable 
                     payments={paginatedPayments}
                     currentPage={paymentsCurrentPage}
                     totalPages={paymentsTotalPages}
                     itemsPerPage={paymentsItemsPerPage}
                     onPageChange={setPaymentsCurrentPage}
                     onItemsPerPageChange={setPaymentsItemsPerPage}
                     searchTerm={paymentsSearchTerm}
                     onSearchChange={setPaymentsSearchTerm}
                     typeFilter={paymentsTypeFilter}
                     onTypeFilterChange={setPaymentsTypeFilter}
                     billTypes={billTypes}
                   />
                 ) : (
                   <>
                   <BillsTable
                     bills={paginatedBills}
                     onEdit={handleEdit}
                     onDelete={handleDelete}
                     deleteLoading={deleteLoading}
                     onViewPayments={handleViewPayments}
                     currentPage={billsCurrentPage}
                     totalPages={billsTotalPages}
                     itemsPerPage={billsItemsPerPage}
                     onPageChange={setBillsCurrentPage}
                     onItemsPerPageChange={setBillsItemsPerPage}
                      dueFilter={dueFilter}
                      dueSoonThresholdDays={dueSoonThresholdDays}
                      newlyOverdueBillsIds={newlyOverdueBillsIds}
                      newlyDueSoonBillsIds={newlyDueSoonBillsIds}
            onMarkOverdueAsSeen={markOverdueBillsAsSeen}
            onMarkDueSoonAsSeen={markDueSoonBillsAsSeen}
                   />
                   </>
                 )}
        </div>
      </div>
    </main>
  );
}