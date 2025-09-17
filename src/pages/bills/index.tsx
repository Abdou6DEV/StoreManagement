import { useState, useEffect } from "react";
import { Button } from "../../lib/components/button";
import { Plus, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../lib/contexts/toastContext";
import { Input } from "../../lib/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../lib/components/select";
import { Badge } from "../../lib/components/badge";
import { Search, Calendar } from "lucide-react";

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
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [openPanel, setOpenPanel] = useState<"add" | null>(null);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
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
  const [durationFilter, setDurationFilter] = useState("all");
  const [dueSoonFilter, setDueSoonFilter] = useState(false);
  const [billTypes, setBillTypes] = useState<string[]>([]);

  const loadBills = async () => {
    try {
      setLoading(true);
      const billsData = await window.api.database.bills.getFiltered({
        search: searchTerm || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        duration: durationFilter !== "all" ? durationFilter : undefined,
      });
      
      // Filter for due soon if needed
      const filteredBills = dueSoonFilter 
        ? billsData.filter((bill: Bill) => {
            const today = new Date();
            const dueDate = new Date(bill.nextBillDate);
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 7 && diffDays >= 0;
          })
        : billsData;
      
      setBills(filteredBills);
    } catch (error) {
      console.error("Error loading bills:", error);
      showToast("Failed to load bills", "error");
    } finally {
      setLoading(false);
    }
  };

  // Pagination calculations
  const billsTotalPages = Math.ceil(bills.length / billsItemsPerPage);
  const paymentsTotalPages = Math.ceil(allPayments.length / paymentsItemsPerPage);
  
  const paginatedBills = bills.slice(
    (billsCurrentPage - 1) * billsItemsPerPage,
    billsCurrentPage * billsItemsPerPage
  );
  
  const paginatedPayments = allPayments.slice(
    (paymentsCurrentPage - 1) * paymentsItemsPerPage,
    paymentsCurrentPage * paymentsItemsPerPage
  );

  // Reset pagination when filters change
  useEffect(() => {
    setBillsCurrentPage(1);
  }, [searchTerm, typeFilter, durationFilter, dueSoonFilter]);

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
      showToast("Failed to load payments", "error");
    }
  };

  useEffect(() => {
    loadBills();
  }, [searchTerm, typeFilter, durationFilter, dueSoonFilter]);

  useEffect(() => {
    loadBillTypes();
  }, []);

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setOpenPanel("add");
  };

  const handleDelete = async (billId: string) => {
    try {
      setDeleteLoading(billId);
      await window.api.database.bills.delete(billId);
      await loadBills();
      showToast("Bill deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting bill:", error);
      showToast("Failed to delete bill", "error");
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {showAllPayments ? t("bills.allPayments", "All Payments") : t("bills.billsList", "Bills List")}
            </h2>
            <Button
              onClick={showAllPayments ? handleBackToBills : handleViewPayments}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {showAllPayments ? t("bills.backToBills", "Back to Bills") : t("bills.allPaymentsView", "All Payments View")}
            </Button>
          </div>

          {/* Filters - only show for bills view */}
          {!showAllPayments && (
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    type="text"
                    placeholder={t("bills.searchBills", "Search bills...")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {billTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={durationFilter} onValueChange={setDurationFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Durations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Durations</SelectItem>
                    <SelectItem value="NO_NEXT">No next bill</SelectItem>
                    <SelectItem value="1_MONTH">1 month</SelectItem>
                    <SelectItem value="2_MONTHS">2 months</SelectItem>
                    <SelectItem value="3_MONTHS">3 months</SelectItem>
                    <SelectItem value="6_MONTHS">6 months</SelectItem>
                    <SelectItem value="ANNUALLY">Annually</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant={dueSoonFilter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDueSoonFilter(!dueSoonFilter)}
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Due Soon
                </Button>
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
                   />
                 ) : (
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
                   />
                 )}
        </div>
      </div>
    </main>
  );
}