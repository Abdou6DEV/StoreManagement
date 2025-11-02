import React, { useEffect, useState, useMemo } from "react";
import type { Payment } from "@prisma/client";
import { Modal } from "./modal";
import { Loader2, CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../contexts/toastContext";
import { ClientSuggestion, Sale, CartItem } from "../../types";
import { ConfirmDialog } from "./confirmDialog";
import PaymentTabs from "./paymentsModal/paymentTabs";
import PaymentSearch from "./paymentsModal/paymentSearch";
import PaymentTable from "./paymentsModal/paymentTable";
import PaymentSummaryTab from "./paymentsModal/paymentSummaryTab";
import SaleDetailsModal from "./saleDetailsModal";
import { printReceiptDirectly } from "../../pages/cashier/components/receiptModal";

interface PaymentsModalProps {
  client: ClientSuggestion;
  onClose: () => void;
}

type TabType = "summary" | "credits" | "versements";

const PaymentsModal: React.FC<PaymentsModalProps> = ({ client, onClose }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmUnpaidDialog, setConfirmUnpaidDialog] = useState<{
    open: boolean;
    paymentId: string | null;
  }>({ open: false, paymentId: null });

  // Sale details modal state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showSaleDetailsModal, setShowSaleDetailsModal] = useState(false);

  const itemsPerPage = 5;

  // Handle viewing sale details
  const handleViewSaleDetails = async (saleId: string) => {
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
    }
  };

  // Handle printing receipt
  const handlePrintReceipt = async (sale: Sale) => {
    try {
      // Convert saleItems to CartItem format
      const cartItems: CartItem[] = sale.saleItems.map((item: Sale["saleItems"][0]) => ({
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

      // Get payment date
      const paymentDate = sale.payment?.paidDate
        ? new Date(sale.payment.paidDate)
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
        (message, type) => showToast(message, type || "info")
      );
    } catch (error) {
      console.error("Failed to print receipt:", error);
      showToast(
        t("cashier.printError", "Failed to print receipt"),
        "error"
      );
    }
  };

  // Filter payments by type and search
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    if (activeTab === "credits") {
      filtered = payments.filter((p) => p.type === "CREDIT");
    } else if (activeTab === "versements") {
      filtered = payments.filter((p) => p.type === "VERSEMENT");
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.givenAmount.toString().includes(searchLower) ||
          (p.dueDate &&
            new Date(p.dueDate)
              .toLocaleDateString()
              .toLowerCase()
              .includes(searchLower)) ||
          (p.createdAt &&
            new Date(p.createdAt)
              .toLocaleDateString()
              .toLowerCase()
              .includes(searchLower)) ||
          (p.paidDate &&
            new Date(p.paidDate)
              .toLocaleDateString()
              .toLowerCase()
              .includes(searchLower)),
      );
    }

    return filtered;
  }, [payments, activeTab, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredPayments.slice(startIndex, endIndex);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const credits = payments.filter((p) => p.type === "CREDIT");
    const versements = payments.filter((p) => p.type === "VERSEMENT");

    const totalCredits = credits.reduce((sum, p) => sum + p.givenAmount, 0);
    const totalVersements = versements.reduce(
      (sum, p) => sum + p.givenAmount,
      0,
    );
    const pendingCredits = credits
      .filter((p) => !p.paidDate)
      .reduce((sum, p) => sum + p.givenAmount, 0);
    const pendingVersements = versements
      .filter((p) => !p.paidDate)
      .reduce((sum, p) => sum + p.givenAmount, 0);
    const paidCredits = credits
      .filter((p) => p.paidDate)
      .reduce((sum, p) => sum + p.givenAmount, 0);
    const paidVersements = versements
      .filter((p) => p.paidDate)
      .reduce((sum, p) => sum + p.givenAmount, 0);

    return {
      totalCredits,
      totalVersements,
      pendingCredits,
      pendingVersements,
      paidCredits,
      paidVersements,
      balance: totalCredits - totalVersements,
      creditsCount: credits.length,
      versementsCount: versements.length,
      pendingCreditsCount: credits.filter((p) => !p.paidDate).length,
      pendingVersementsCount: versements.filter((p) => !p.paidDate).length,
      paidCreditsCount: credits.filter((p) => p.paidDate).length,
      paidVersementsCount: versements.filter((p) => p.paidDate).length,
    };
  }, [payments]);

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      await window.api.database.payments.markAsPaid(paymentId, new Date());

      setPayments((prevPayments) =>
        prevPayments.map((payment) =>
          payment.id === paymentId
            ? { ...payment, paidDate: new Date() }
            : payment,
        ),
      );

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

  const handleMarkAsUnpaid = async (paymentId: string) => {
    try {
      await window.api.database.payments.markAsPaid(paymentId, null);

      setPayments((prevPayments) =>
        prevPayments.map((payment) =>
          payment.id === paymentId ? { ...payment, paidDate: null } : payment,
        ),
      );

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

  const handleUpdateAmount = async (paymentId: string) => {
    try {
      await window.api.database.payments.updateAmount(paymentId, editAmount);
      setEditingPayment(null);

      setPayments((prevPayments) =>
        prevPayments.map((payment) =>
          payment.id === paymentId
            ? { ...payment, givenAmount: editAmount }
            : payment,
        ),
      );

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

  const refreshPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.database.payments.getByClientWithInfo(client.id);
      setPayments(data);
    } catch (err) {
      setError(t("clients.paymentsError", "Failed to fetch payments"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPayments();
  }, [client.id]);

  const handleEditStart = (paymentId: string, amount: number) => {
    setEditingPayment(paymentId);
    setEditAmount(amount);
  };

  const handleEditCancel = () => {
    setEditingPayment(null);
  };

  const handleEditSave = (paymentId: string) => {
    handleUpdateAmount(paymentId);
  };

  const handleEditAmountChange = (amount: number) => {
    setEditAmount(amount);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewCredits = () => {
    setActiveTab("credits");
  };

  const handleViewVersements = () => {
    setActiveTab("versements");
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t("clients.paymentsTitle", {
        name: client.name,
        defaultValue: "Payments for {{name}}",
      })}
      subtitle={t(
        "clients.paymentsDesc",
        "View and manage all credits and versements for this client.",
      )}
      icon={<CreditCard className="w-5 h-5 text-red-500" />}
      size="full"
      className="max-w-[80vw] max-h-[85vh]"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <PaymentTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          creditsCount={summaryStats.creditsCount}
          versementsCount={summaryStats.versementsCount}
        />

        {/* Search and Controls */}
        {(activeTab === "credits" || activeTab === "versements") && (
          <PaymentSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="animate-spin" />{" "}
              {t("clients.paymentsLoading", "Loading payments...")}
            </div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : payments.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              {t("clients.noPayments", "No payments found for this client.")}
            </div>
          ) : (
            <>
              {activeTab === "summary" && (
                <PaymentSummaryTab
                  summaryStats={summaryStats}
                  onViewCredits={handleViewCredits}
                  onViewVersements={handleViewVersements}
                />
              )}
              {activeTab === "credits" && (
                <PaymentTable
                  payments={currentData}
                  activeTab="credits"
                  editingPayment={editingPayment}
                  editAmount={editAmount}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onEditStart={handleEditStart}
                  onEditCancel={handleEditCancel}
                  onEditSave={handleEditSave}
                  onEditAmountChange={handleEditAmountChange}
                  onMarkAsPaid={handleMarkAsPaid}
                  onMarkAsUnpaid={handleMarkAsUnpaidConfirm}
                  onViewSaleDetails={handleViewSaleDetails}
                  onPageChange={handlePageChange}
                />
              )}
              {activeTab === "versements" && (
                <PaymentTable
                  payments={currentData}
                  activeTab="versements"
                  editingPayment={editingPayment}
                  editAmount={editAmount}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onEditStart={handleEditStart}
                  onEditCancel={handleEditCancel}
                  onEditSave={handleEditSave}
                  onEditAmountChange={handleEditAmountChange}
                  onMarkAsPaid={handleMarkAsPaid}
                  onMarkAsUnpaid={handleMarkAsUnpaidConfirm}
                  onViewSaleDetails={handleViewSaleDetails}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </div>

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
    </Modal>
  );
};

export default PaymentsModal;
