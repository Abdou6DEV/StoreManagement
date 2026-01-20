import React, { useState, useEffect, useMemo } from "react";

import { Button } from "../../../lib/components/button";

import { ConfirmDialog } from "../../../lib/components/confirmDialog";

import { Loader2, CreditCard, ArrowUpCircle, Users } from "lucide-react";

import { useTranslation } from "react-i18next";

import { useToast } from "../../../lib/contexts/toastContext";

import { useOverduePayments } from "../../../lib/contexts/overduePaymentsContext";

import { useDueSoonPayments } from "../../../lib/contexts/dueSoonPaymentsContext";

import type { PaymentWithClient, Sale } from "../../../types";

import SaleDetailsModal from "../../../lib/components/saleDetailsModal";
import VersementDetailsModal from "../../../lib/components/versementDetailsModal";
import { printReceiptDirectly } from "../../cashier/components/receiptModal";
import type { CartItem } from "../../../types";

import PaymentFilters from "./paymentFilters";

import PaymentTable from "./paymentTable";

import { Tooltip } from "../../../lib/components/tooltip";

import {

  Pagination,

  PaginationContent,

  PaginationItem,

  PaginationLink,

  PaginationPrevious,

  PaginationNext,

  PaginationEllipsis,

} from "../../../lib/components/pagination";

import {

  isOverdue,

  isDueSoon,

  getFilteredPayments,

} from "../utils/paymentUtils";



interface AllPaymentsViewProps {

  onBack: () => void;

  payments: PaymentWithClient[];

  loading: boolean;

  error: string | null;

  onRefresh: () => void;

  onClientsRefresh?: () => void;

  initialClientFilter?: { id: string; name: string } | null;
  onConsumeInitialClientFilter?: () => void;

}



const AllPaymentsView: React.FC<AllPaymentsViewProps> = ({

  onBack,

  payments,

  loading,

  error,

  onRefresh,

  onClientsRefresh,

  initialClientFilter,
  onConsumeInitialClientFilter,

}) => {

  const { t } = useTranslation();

  const { showToast } = useToast();

  const { markOverdueCreditsAsSeen, markOverdueVersementsAsSeen } = useOverduePayments();

  const { markDueSoonCreditsAsSeen, markDueSoonVersementsAsSeen, dueSoonThresholdDays } = useDueSoonPayments();

  

  // We need to access the seen payments from localStorage to determine which ones are truly unseen

  const [seenOverdueCredits, setSeenOverdueCredits] = useState<Set<string>>(new Set());

  const [seenOverdueVersements, setSeenOverdueVersements] = useState<Set<string>>(new Set());

  const [seenDueSoonCredits, setSeenDueSoonCredits] = useState<Set<string>>(new Set());

  const [seenDueSoonVersements, setSeenDueSoonVersements] = useState<Set<string>>(new Set());

  const [editingPayment, setEditingPayment] = useState<string | null>(null);

  const [editAmount, setEditAmount] = useState<number>(0);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">(

    "unpaid",

  );

  const [typeFilter, setTypeFilter] = useState<"all" | "CREDIT" | "VERSEMENT">(

    "all",

  );

  const [dateFilter, setDateFilter] = useState<"all" | "overdue" | "dueSoon">(

    "all",

  );

  const [confirmPaidDialog, setConfirmPaidDialog] = useState<{

    open: boolean;

    paymentId: string | null;

  }>({ open: false, paymentId: null });

  const [confirmUnpaidDialog, setConfirmUnpaidDialog] = useState<{

    open: boolean;

    paymentId: string | null;

  }>({ open: false, paymentId: null });

  const [cancelVersementDialog, setCancelVersementDialog] = useState<{

    open: boolean;

    paymentId: string | null;

    clientName?: string;

  }>({ open: false, paymentId: null });



  // State to track newly overdue payment IDs for highlighting

  const [newlyOverdueCreditsIds, setNewlyOverdueCreditsIds] = useState<Set<string>>(new Set());

  const [newlyOverdueVersementsIds, setNewlyOverdueVersementsIds] = useState<Set<string>>(new Set());

  

  // State to track newly due soon payment IDs for highlighting

  const [newlyDueSoonCreditsIds, setNewlyDueSoonCreditsIds] = useState<Set<string>>(new Set());

  const [newlyDueSoonVersementsIds, setNewlyDueSoonVersementsIds] = useState<Set<string>>(new Set());

  

  // Track if we're currently viewing the overdue table

  const [isViewingOverdueTable, setIsViewingOverdueTable] = useState(false);

  

  // Track if we're currently viewing the due soon table

  const [isViewingDueSoonTable, setIsViewingDueSoonTable] = useState(false);
  const [selectedPaymentsClient, setSelectedPaymentsClient] = useState<{
    id: string;
    name: string;
  } | null>(null);



  // Load seen payments from localStorage

  useEffect(() => {

    const savedCredits = localStorage.getItem('seenOverdueCredits');

    const savedVersements = localStorage.getItem('seenOverdueVersements');

    const savedDueSoonCredits = localStorage.getItem('seenDueSoonCredits');

    const savedDueSoonVersements = localStorage.getItem('seenDueSoonVersements');

    

    if (savedCredits) {

      try {

        setSeenOverdueCredits(new Set(JSON.parse(savedCredits)));

      } catch (error) {

        console.error('Failed to load seen overdue credits:', error);

      }

    }

    

    if (savedVersements) {

      try {

        setSeenOverdueVersements(new Set(JSON.parse(savedVersements)));

      } catch (error) {

        console.error('Failed to load seen overdue versements:', error);

      }

    }

    

    if (savedDueSoonCredits) {

      try {

        setSeenDueSoonCredits(new Set(JSON.parse(savedDueSoonCredits)));

      } catch (error) {

        console.error('Failed to load seen due soon credits:', error);

      }

    }

    

    if (savedDueSoonVersements) {

      try {

        setSeenDueSoonVersements(new Set(JSON.parse(savedDueSoonVersements)));

      } catch (error) {

        console.error('Failed to load seen due soon versements:', error);

      }

    }

  }, []);



  // Sync seen payments with localStorage changes (when context updates them)

  useEffect(() => {

    const handleStorageChange = () => {

      const savedCredits = localStorage.getItem('seenOverdueCredits');

      const savedVersements = localStorage.getItem('seenOverdueVersements');

      const savedDueSoonCredits = localStorage.getItem('seenDueSoonCredits');

      const savedDueSoonVersements = localStorage.getItem('seenDueSoonVersements');

      

      if (savedCredits) {

        try {

          setSeenOverdueCredits(new Set(JSON.parse(savedCredits)));

        } catch (error) {

          console.error('Failed to sync seen overdue credits:', error);

        }

      }

      

      if (savedVersements) {

        try {

          setSeenOverdueVersements(new Set(JSON.parse(savedVersements)));

        } catch (error) {

          console.error('Failed to sync seen overdue versements:', error);

        }

      }

      

      if (savedDueSoonCredits) {

        try {

          setSeenDueSoonCredits(new Set(JSON.parse(savedDueSoonCredits)));

        } catch (error) {

          console.error('Failed to sync seen due soon credits:', error);

        }

      }

      

      if (savedDueSoonVersements) {

        try {

          setSeenDueSoonVersements(new Set(JSON.parse(savedDueSoonVersements)));

        } catch (error) {

          console.error('Failed to sync seen due soon versements:', error);

        }

      }

    };



    // Listen for storage changes

    window.addEventListener('storage', handleStorageChange);

    

    // Also poll every 1 second to catch local updates

    const interval = setInterval(handleStorageChange, 1000);



    return () => {

      window.removeEventListener('storage', handleStorageChange);

      clearInterval(interval);

    };

  }, []);



  // Pagination state for credits

  const [creditsCurrentPage, setCreditsCurrentPage] = useState(1);

  const creditsItemsPerPage = 10;



  // Pagination state for versements

  const [versementsCurrentPage, setVersementsCurrentPage] = useState(1);

  // Sale details modal state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showSaleDetailsModal, setShowSaleDetailsModal] = useState(false);
  const [loadingSaleDetails, setLoadingSaleDetails] = useState(false);

  // Versement details modal state
  const [selectedVersement, setSelectedVersement] = useState<PaymentWithClient | null>(null);
  const [showVersementDetailsModal, setShowVersementDetailsModal] = useState(false);

  const versementsItemsPerPage = 10;

  // Handle viewing sale details
  const handleViewSaleDetails = async (saleId: string) => {
    setLoadingSaleDetails(true);
    try {
      const sale = await window.api.database.sales.getById(saleId);
      if (sale) {
        setSelectedSale(sale);
        setShowSaleDetailsModal(true);
      } else {
        showToast(
          t("clients.saleNotFound", "Sale not found"),
          "error"
        );
      }
    } catch (error) {
      console.error("Error fetching sale details:", error);
      showToast(
        t("clients.saleDetailsError", "Failed to load sale details"),
        "error"
      );
    } finally {
      setLoadingSaleDetails(false);
    }
  };

  // Handle printing receipt
  const handlePrintReceipt = async (sale: Sale) => {
    try {
      // Convert saleItems to CartItem format
      const cartItems: CartItem[] = sale.saleItems.map((item) => ({
        id: item.product?.id || item.service?.id || `manual-${item.id}`,
        name:
          item.product?.name ||
          item.manualProduct?.name ||
          item.service?.name ||
          "",
        price: item.price,
        qty: item.quantity,
        boughtPrice: item.boughtPrice || undefined,
        isManual: !item.product && !item.service,
        isService: !!item.service,
        manualProductType: item.manualProduct?.type,
        description: item.service?.description,
        serviceCostPrice: item.service ? (item.boughtPrice || item.service?.costPrice) : undefined,
        serviceAppointmentId: item.service?.serviceAppointmentId || undefined,
      }));

      // Determine payment type
      const paymentType: "none" | "credit" | "versement" = sale.isPaidInCash
        ? "none"
        : sale.payment?.type === "VERSEMENT"
          ? "versement"
          : "credit";

      // Get payment date (when fully paid)
      const paymentDate = sale.payment?.paidDate
        ? new Date(sale.payment.paidDate)
        : undefined;

      // Get due date (for unpaid credit/versement)
      const dueDate = sale.payment?.dueDate
        ? new Date(sale.payment.dueDate)
        : undefined;

      // Call print function
      await printReceiptDirectly(
        cartItems,
        sale.client?.name || "",
        sale.discount,
        sale.paidAmount,
        paymentType,
        paymentDate,
        sale.id,
        (message, type) => showToast(message, type || "info"),
        dueDate,
        new Date(sale.createdAt) // Pass the sale date
      );
    } catch (error) {
      console.error("Failed to print receipt:", error);
      showToast(
        t("cashier.printError", "Failed to print receipt"),
        "error"
      );
    }
  };

  // Handle viewing versement details
  const handleViewVersementDetails = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setSelectedVersement(payment);
      setShowVersementDetailsModal(true);
    }
  };

  const paymentClients = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; phone?: string | null }
    >();
    payments.forEach((payment) => {
      if (payment.client?.id && !map.has(payment.client.id)) {
        map.set(payment.client.id, {
          id: payment.client.id,
          name: payment.client.name,
          phone: payment.client.phone,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [payments]);

  useEffect(() => {
    if (
      selectedPaymentsClient &&
      !payments.some((payment) => payment.client?.id === selectedPaymentsClient.id)
    ) {
      setSelectedPaymentsClient(null);
      setSearch("");
    }
  }, [payments, selectedPaymentsClient]);

  useEffect(() => {
    if (initialClientFilter) {
      setSelectedPaymentsClient(initialClientFilter);
      setSearch(initialClientFilter.name);
      onConsumeInitialClientFilter?.();
    }
  }, [initialClientFilter, onConsumeInitialClientFilter]);

  const handlePaymentsSearchChange = (value: string) => {
    if (selectedPaymentsClient) {
      setSelectedPaymentsClient(null);
    }
    setSearch(value);
  };

  const handleSelectPaymentsClient = (client: { id: string; name: string }) => {
    setSelectedPaymentsClient(client);
    setSearch(client.name);
  };

  const handleClearPaymentsClient = () => {
    setSelectedPaymentsClient(null);
    setSearch("");
  };

  const filterBySelectedClient = (list: PaymentWithClient[]) => {
    if (!selectedPaymentsClient) {
      return list;
    }
    return list.filter(
      (payment) => payment.client?.id === selectedPaymentsClient.id,
    );
  };

  const credits = filterBySelectedClient(
    payments.filter((p) => p.type === "CREDIT"),
  );

  const versements = filterBySelectedClient(
    payments.filter((p) => p.type === "VERSEMENT"),
  );


  const handleMarkAsPaid = async (paymentId: string) => {

    try {

      await window.api.database.payments.markAsPaid(paymentId, new Date());



      onRefresh(); // Refresh payments after marking as paid
      onClientsRefresh?.(); // Refresh clients list to update totals



      showToast(

        t("clients.paymentMarkedAsPaid", "Payment marked as paid"),

        "success",

      );

    } catch (err) {

      showToast(

        t("clients.paymentMarkError", "Failed to mark payment as paid"),

        "error",

      );

    }

  };

  

  const handleMarkAsPaidConfirm = (paymentId: string) => {

    setConfirmPaidDialog({ open: true, paymentId });

  };



  const handleConfirmMarkAsPaid = async () => {

    if (confirmPaidDialog.paymentId) {

      await handleMarkAsPaid(confirmPaidDialog.paymentId);

      setConfirmPaidDialog({ open: false, paymentId: null });

    }

  };



  const handleMarkAsUnpaid = async (paymentId: string) => {

    try {

      await window.api.database.payments.markAsPaid(paymentId, null);



      onRefresh(); // Refresh payments after marking as unpaid
      onClientsRefresh?.(); // Refresh clients list to update totals



      showToast(

        t("clients.paymentMarkedAsUnpaid", "Payment marked as unpaid"),

        "success",

      );

    } catch (err) {

      showToast(

        t("clients.paymentUnmarkError", "Failed to mark payment as unpaid"),

        "error",

      );

    }

  };



  const handleMarkAsUnpaidConfirm = (paymentId: string) => {

    setConfirmUnpaidDialog({ open: true, paymentId });

  };



  const handleConfirmMarkAsUnpaid = async () => {

    if (confirmUnpaidDialog.paymentId) {

      await handleMarkAsUnpaid(confirmUnpaidDialog.paymentId);

      setConfirmUnpaidDialog({ open: false, paymentId: null });

    }

  };



  const handleCancelVersementRequest = (paymentId: string) => {

    const payment = payments.find((p) => p.id === paymentId);

    setCancelVersementDialog({

      open: true,

      paymentId,

      clientName: payment?.client.name,

    });

  };



  const handleCancelVersement = async (paymentId: string) => {

    try {

      await window.api.database.payments.cancelVersement(paymentId);

      onRefresh();
      onClientsRefresh?.(); // Refresh clients list to update totals



      showToast(

        t(

          "clients.versementCancelled",

          "Versement cancelled and products restored",

        ),

        "success",

      );

    } catch (error) {

      console.error("Failed to cancel versement:", error);

      showToast(

        t("clients.versementCancelError", "Failed to cancel versement"),

        "error",

      );

      throw error;

    }

  };



  const handleConfirmCancelVersement = async () => {

    if (!cancelVersementDialog.paymentId) {

      return;

    }



    try {

      await handleCancelVersement(cancelVersementDialog.paymentId);

    } finally {

      setCancelVersementDialog({ open: false, paymentId: null });

    }

  };



  const handleUpdateAmount = async (paymentId: string) => {

    try {

      await window.api.database.payments.updateAmount(paymentId, editAmount);

      setEditingPayment(null);



      onRefresh(); // Refresh payments after updating amount
      onClientsRefresh?.(); // Refresh clients list to update totals



      showToast(

        t("clients.paymentAmountUpdated", "Payment amount updated"),

        "success",

      );

    } catch (err) {

      showToast(

        t("clients.paymentAmountError", "Failed to update payment amount"),

        "error",

      );

    }

  };



  const filteredCredits = getFilteredPayments(

    credits,

    search,

    statusFilter,

    typeFilter,

    dateFilter,

    dueSoonThresholdDays,

    newlyOverdueCreditsIds,

    newlyDueSoonCreditsIds,

  );

  const filteredVersements = getFilteredPayments(

    versements,

    search,

    statusFilter,

    typeFilter,

    dateFilter,

    dueSoonThresholdDays,

    newlyOverdueVersementsIds,

    newlyDueSoonVersementsIds,

  );



  // Pagination logic for credits

  const creditsTotalPages = Math.max(

    1,

    Math.ceil(filteredCredits.length / creditsItemsPerPage),

  );

  const paginatedCredits = filteredCredits.slice(

    (creditsCurrentPage - 1) * creditsItemsPerPage,

    creditsCurrentPage * creditsItemsPerPage,

  );



  // Pagination logic for versements

  const versementsTotalPages = Math.max(

    1,

    Math.ceil(filteredVersements.length / versementsItemsPerPage),

  );

  const paginatedVersements = filteredVersements.slice(

    (versementsCurrentPage - 1) * versementsItemsPerPage,

    versementsCurrentPage * versementsItemsPerPage,

  );



  // Reset to page 1 when filters change

  React.useEffect(() => {

    setCreditsCurrentPage(1);

    setVersementsCurrentPage(1);

  }, [search, statusFilter, typeFilter, dateFilter]);



  // Calculate newly overdue payment IDs when overdue filter is applied

  useEffect(() => {

    if (dateFilter === "overdue") {

      // Mark that we're viewing the overdue table

      setIsViewingOverdueTable(true);

      

      // Only set highlighting if we weren't already viewing the overdue table

      // This prevents the highlighting from disappearing when the effect re-runs

      if (!isViewingOverdueTable) {

        // Get current overdue credits that are truly unseen

        const overdueCredits = payments.filter(payment => 

          payment.type === "CREDIT" && 

          !payment.paidDate && 

          isOverdue(payment.dueDate) &&

          !seenOverdueCredits.has(payment.id)

        );

        

        // Get current overdue versements that are truly unseen

        const overdueVersements = payments.filter(payment => 

          payment.type === "VERSEMENT" && 

          !payment.paidDate && 

          isOverdue(payment.dueDate) &&

          !seenOverdueVersements.has(payment.id)

        );



        // Only highlight truly unseen overdue payments

        setNewlyOverdueCreditsIds(new Set(overdueCredits.map(p => p.id)));

        setNewlyOverdueVersementsIds(new Set(overdueVersements.map(p => p.id)));

      }

      // Don't mark as seen automatically - let user see the highlighting

    } else if (dateFilter === "dueSoon") {

      // Mark that we're viewing the due soon table

      setIsViewingDueSoonTable(true);

      

      // Only set highlighting if we weren't already viewing the due soon table

      // This prevents the highlighting from disappearing when the effect re-runs

      if (!isViewingDueSoonTable) {

        // Get current due soon credits that are truly unseen

        const dueSoonCredits = payments.filter(payment => 

          payment.type === "CREDIT" && 

          !payment.paidDate && 

          isDueSoon(payment.dueDate, dueSoonThresholdDays) &&

          !seenDueSoonCredits.has(payment.id)

        );

        

        // Get current due soon versements that are truly unseen

        const dueSoonVersements = payments.filter(payment => 

          payment.type === "VERSEMENT" && 

          !payment.paidDate && 

          isDueSoon(payment.dueDate, dueSoonThresholdDays) &&

          !seenDueSoonVersements.has(payment.id)

        );



        // Only highlight truly unseen due soon payments

        setNewlyDueSoonCreditsIds(new Set(dueSoonCredits.map(p => p.id)));

        setNewlyDueSoonVersementsIds(new Set(dueSoonVersements.map(p => p.id)));

      }

      // Don't mark as seen automatically - let user see the highlighting

    } else {

      // Mark as seen when filter is changed away from overdue (only if we were viewing the table)

      if (isViewingOverdueTable && (dateFilter === "all" || dateFilter === "dueSoon")) {

        markOverdueCreditsAsSeen();

        markOverdueVersementsAsSeen();

        setIsViewingOverdueTable(false);

      }

      

      // Mark as seen when filter is changed away from due soon (only if we were viewing the table)

      if (isViewingDueSoonTable && (dateFilter === "all" || dateFilter === "overdue")) {

        markDueSoonCreditsAsSeen();

        markDueSoonVersementsAsSeen();

        setIsViewingDueSoonTable(false);

      }

      

      // Clear highlighting when filter is not overdue or due soon

      setNewlyOverdueCreditsIds(new Set());

      setNewlyOverdueVersementsIds(new Set());

      setNewlyDueSoonCreditsIds(new Set());

      setNewlyDueSoonVersementsIds(new Set());

    }

  }, [dateFilter, payments, seenOverdueCredits, seenOverdueVersements, seenDueSoonCredits, seenDueSoonVersements, isViewingOverdueTable, isViewingDueSoonTable]);



  // Handle back button click - mark as seen if viewing overdue or due soon table

  const handleBackClick = () => {

    if (isViewingOverdueTable) {

      markOverdueCreditsAsSeen();

      markOverdueVersementsAsSeen();

    }

    if (isViewingDueSoonTable) {

      markDueSoonCreditsAsSeen();

      markDueSoonVersementsAsSeen();

    }

    onBack();

  };



  // Mark as seen when component unmounts (when navigating away from the page)

  useEffect(() => {

    return () => {

      // Only mark as seen if we were viewing the overdue table

      if (isViewingOverdueTable) {

        markOverdueCreditsAsSeen();

        markOverdueVersementsAsSeen();

      }

      // Only mark as seen if we were viewing the due soon table

      if (isViewingDueSoonTable) {

        markDueSoonCreditsAsSeen();

        markDueSoonVersementsAsSeen();

      }

    };

  }, [isViewingOverdueTable, isViewingDueSoonTable, markOverdueCreditsAsSeen, markOverdueVersementsAsSeen, markDueSoonCreditsAsSeen, markDueSoonVersementsAsSeen]);



  return (

    <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <CreditCard className="w-7 h-7 text-red-500" />

          <h1 className="text-2xl font-bold">

            {t("clients.allPaymentsTitle", "All Credits & Versements")}

          </h1>

        </div>

        <Tooltip

          content={t(

            "clients.clientsViewTooltip",

            "View Clients List and manage them",

          )}

        >

          <Button

            onClick={handleBackClick}

            variant="outline"

            className="flex items-center gap-2"

          >

            <Users className="w-4 h-4" />

            {t("clients.backToClients", "View All Clients")}

          </Button>

        </Tooltip>

      </div>



      {/* Filters */}

      <PaymentFilters

        search={search}

        setSearch={handlePaymentsSearchChange}

        statusFilter={statusFilter}

        setStatusFilter={setStatusFilter}

        typeFilter={typeFilter}

        setTypeFilter={setTypeFilter}

        dateFilter={dateFilter}

        setDateFilter={setDateFilter}

        clients={paymentClients}

        selectedClientId={selectedPaymentsClient?.id ?? null}

        onSelectClient={handleSelectPaymentsClient}

        onClearSelectedClient={handleClearPaymentsClient}

      />



      {/* Content */}

      {loading ? (

        <div className="flex items-center gap-2 text-muted-foreground">

          <Loader2 className="animate-spin" />{" "}

          {t("clients.paymentsLoading", "Loading payments...")}

        </div>

      ) : error ? (

        <div className="text-red-500">{error}</div>

      ) : payments.length === 0 ? (

        <div className="text-muted-foreground text-center py-8">

          {t("clients.noPayments", "No payments found.")}

        </div>

      ) : (

        <div className="space-y-6">

          {/* Credits Section */}

          <div className="space-y-3">

            <div className="flex items-center gap-2">

              <ArrowUpCircle className="w-5 h-5 text-red-500" />

              <h3 className="text-lg font-semibold">

                {t("clients.credits", "Credits")} ({filteredCredits.length})

              </h3>

            </div>

            {filteredCredits.length > 0 ? (

              <>

                <PaymentTable

                  payments={paginatedCredits}

                  allPayments={filteredCredits}

                  type="CREDIT"

                  editingPayment={editingPayment}

                  editAmount={editAmount}

                  setEditingPayment={setEditingPayment}

                  setEditAmount={setEditAmount}

                  handleUpdateAmount={handleUpdateAmount}

                  onMarkAsPaid={handleMarkAsPaidConfirm}

                  onMarkAsUnpaidConfirm={handleMarkAsUnpaidConfirm}

                  onViewSaleDetails={handleViewSaleDetails}
                  onViewVersementDetails={handleViewVersementDetails}

                  onRefreshPayments={onRefresh}

                  onClientsRefresh={onClientsRefresh}

                  isOverdue={isOverdue}

                  isDueSoon={(dueDate) => isDueSoon(dueDate, dueSoonThresholdDays)}

                  newlyOverdueIds={newlyOverdueCreditsIds}

                  newlyDueSoonIds={newlyDueSoonCreditsIds}

                />

                {/* Pagination for Credits */}

                {creditsTotalPages > 1 && (

                  <Pagination className="mt-6">

                    <PaginationContent>

                      <PaginationItem>

                        {creditsCurrentPage === 1 ||

                        filteredCredits.length === 0 ? (

                          <span className="opacity-50 pointer-events-none select-none">

                            <PaginationPrevious href="#" />

                          </span>

                        ) : (

                          <PaginationPrevious

                            onClick={(e) => {

                              e.preventDefault();

                              setCreditsCurrentPage(creditsCurrentPage - 1);

                            }}

                            href="#"

                          />

                        )}

                      </PaginationItem>

                      {/* Page numbers with ellipsis if needed */}

                      {(() => {

                        const items = [];

                        let start = Math.max(1, creditsCurrentPage - 2);

                        let end = Math.min(

                          creditsTotalPages,

                          creditsCurrentPage + 2,

                        );

                        if (creditsCurrentPage <= 3) {

                          end = Math.min(5, creditsTotalPages);

                        } else if (

                          creditsCurrentPage >=

                          creditsTotalPages - 2

                        ) {

                          start = Math.max(1, creditsTotalPages - 4);

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

                                isActive={i === creditsCurrentPage}

                                href="#"

                                onClick={(e) => {

                                  e.preventDefault();

                                  setCreditsCurrentPage(i);

                                }}

                              >

                                {i}

                              </PaginationLink>

                            </PaginationItem>,

                          );

                        }

                        if (end < creditsTotalPages) {

                          items.push(

                            <PaginationItem key="end-ellipsis">

                              <PaginationEllipsis />

                            </PaginationItem>,

                          );

                        }

                        return items;

                      })()}

                      <PaginationItem>

                        {creditsCurrentPage === creditsTotalPages ||

                        filteredCredits.length === 0 ? (

                          <span className="opacity-50 pointer-events-none select-none">

                            <PaginationNext href="#" />

                          </span>

                        ) : (

                          <PaginationNext

                            onClick={(e) => {

                              e.preventDefault();

                              setCreditsCurrentPage(creditsCurrentPage + 1);

                            }}

                            href="#"

                          />

                        )}

                      </PaginationItem>

                    </PaginationContent>

                  </Pagination>

                )}

              </>

            ) : (

              <div className="text-muted-foreground text-center py-4 border border-dashed rounded-lg">

                {t("clients.noCredits", "No credits found")}

              </div>

            )}

          </div>



          {/* Versements Section */}

          <div className="space-y-3">

            <div className="flex items-center gap-2">

              <ArrowUpCircle className="w-5 h-5 text-red-500" />

              <h3 className="text-lg font-semibold">

                {t("clients.versements", "Versements")} (

                {filteredVersements.length})

              </h3>

            </div>

            {filteredVersements.length > 0 ? (

              <>

                <PaymentTable

                  payments={paginatedVersements}

                  allPayments={filteredVersements}

                  type="VERSEMENT"

                  editingPayment={editingPayment}

                  editAmount={editAmount}

                  setEditingPayment={setEditingPayment}

                  setEditAmount={setEditAmount}

                  handleUpdateAmount={handleUpdateAmount}

                  onMarkAsPaid={handleMarkAsPaidConfirm}

                  onMarkAsUnpaidConfirm={handleMarkAsUnpaidConfirm}

                  onViewSaleDetails={handleViewSaleDetails}
                  onViewVersementDetails={handleViewVersementDetails}

                  onRefreshPayments={onRefresh}

                  onClientsRefresh={onClientsRefresh}
                  onCancelVersement={handleCancelVersementRequest}

                  isOverdue={isOverdue}

                  isDueSoon={(dueDate) => isDueSoon(dueDate, dueSoonThresholdDays)}

                  newlyOverdueIds={newlyOverdueVersementsIds}

                  newlyDueSoonIds={newlyDueSoonVersementsIds}

                />

                {/* Pagination for Versements */}

                {versementsTotalPages > 1 && (

                  <Pagination className="mt-6">

                    <PaginationContent>

                      <PaginationItem>

                        {versementsCurrentPage === 1 ||

                        filteredVersements.length === 0 ? (

                          <span className="opacity-50 pointer-events-none select-none">

                            <PaginationPrevious href="#" />

                          </span>

                        ) : (

                          <PaginationPrevious

                            onClick={(e) => {

                              e.preventDefault();

                              setVersementsCurrentPage(

                                versementsCurrentPage - 1,

                              );

                            }}

                            href="#"

                          />

                        )}

                      </PaginationItem>

                      {/* Page numbers with ellipsis if needed */}

                      {(() => {

                        const items = [];

                        let start = Math.max(1, versementsCurrentPage - 2);

                        let end = Math.min(

                          versementsTotalPages,

                          versementsCurrentPage + 2,

                        );

                        if (versementsCurrentPage <= 3) {

                          end = Math.min(5, versementsTotalPages);

                        } else if (

                          versementsCurrentPage >=

                          versementsTotalPages - 2

                        ) {

                          start = Math.max(1, versementsTotalPages - 4);

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

                                isActive={i === versementsCurrentPage}

                                href="#"

                                onClick={(e) => {

                                  e.preventDefault();

                                  setVersementsCurrentPage(i);

                                }}

                              >

                                {i}

                              </PaginationLink>

                            </PaginationItem>,

                          );

                        }

                        if (end < versementsTotalPages) {

                          items.push(

                            <PaginationItem key="end-ellipsis">

                              <PaginationEllipsis />

                            </PaginationItem>,

                          );

                        }

                        return items;

                      })()}

                      <PaginationItem>

                        {versementsCurrentPage === versementsTotalPages ||

                        filteredVersements.length === 0 ? (

                          <span className="opacity-50 pointer-events-none select-none">

                            <PaginationNext href="#" />

                          </span>

                        ) : (

                          <PaginationNext

                            onClick={(e) => {

                              e.preventDefault();

                              setVersementsCurrentPage(

                                versementsCurrentPage + 1,

                              );

                            }}

                            href="#"

                          />

                        )}

                      </PaginationItem>

                    </PaginationContent>

                  </Pagination>

                )}

              </>

            ) : (

              <div className="text-muted-foreground text-center py-4 border border-dashed rounded-lg">

                {t("clients.noVersements", "No versements found")}

              </div>

            )}

          </div>

        </div>

      )}



      <ConfirmDialog

        open={confirmPaidDialog.open}

        onOpenChange={(open) =>

          setConfirmPaidDialog({ open, paymentId: null })

        }

        title={t("clients.confirmMarkAsPaid", "Confirm Mark as Paid")}

        message={t(

          "clients.confirmMarkAsPaidMessage",

          "Are you sure you want to mark this payment as paid? This will update the payment status immediately.",

        )}

        confirmText={t("clients.markAsPaid", "Mark as Paid")}

        cancelText={t("clients.cancel", "Cancel")}

        variant="success"

        onConfirm={handleConfirmMarkAsPaid}

      />

      <ConfirmDialog

        open={confirmUnpaidDialog.open}

        onOpenChange={(open) =>

          setConfirmUnpaidDialog({ open, paymentId: null })

        }

        title={t("clients.confirmMarkAsUnpaid", "Confirm Mark as Unpaid")}

        message={t(

          "clients.confirmMarkAsUnpaidMessage",

          "Are you sure you want to mark this payment as unpaid? This action cannot be undone.",

        )}

        confirmText={t("clients.markAsUnpaid", "Mark as Unpaid")}

        cancelText={t("clients.cancel", "Cancel")}

        variant="warning"

        onConfirm={handleConfirmMarkAsUnpaid}

      />

      <ConfirmDialog

        open={cancelVersementDialog.open}

        onOpenChange={(open) =>

          setCancelVersementDialog({ open, paymentId: null })

        }

        title={t("clients.confirmVersementCancelTitle", "Cancel Versement?")}

        message={t(

          "clients.confirmVersementCancelMessage",

          "This will delete the versement for {{name}} and restore the products to stock. This action cannot be undone.",

          {

            name: cancelVersementDialog.clientName ||

              t("clients.thisClient", "this client"),

          },

        )}

        confirmText={t("clients.cancelVersement", "Cancel Versement")}

        cancelText={t("clients.keepVersement", "Keep Versement")}

        variant="danger"

        onConfirm={handleConfirmCancelVersement}

      />

      {/* Sale Details Modal */}
      <SaleDetailsModal
        sale={selectedSale}
        isOpen={showSaleDetailsModal}
        onClose={() => {
          setShowSaleDetailsModal(false);
          setSelectedSale(null);
        }}
        onPrint={handlePrintReceipt}
      />

      {/* Versement Details Modal */}
      <VersementDetailsModal
        payment={selectedVersement}
        isOpen={showVersementDetailsModal}
        onClose={() => {
          setShowVersementDetailsModal(false);
          setSelectedVersement(null);
        }}
        onDeleted={() => {
          onRefresh();
          onClientsRefresh?.(); // Refresh clients list to update totals
          setShowVersementDetailsModal(false);
          setSelectedVersement(null);
        }}
      />

    </div>

  );

};



export default AllPaymentsView;


