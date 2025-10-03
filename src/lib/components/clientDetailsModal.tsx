import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  ShoppingCart, 
  CreditCard, 
  Wrench, 
  XCircle,
  ChevronDown,
  User
} from "lucide-react";
import { Modal } from "./modal";
import { ClientSuggestion } from "../../types";
import type { Sale, Payment } from "@prisma/client";

interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  costPrice: number;
  servicePrice: number;
  serviceType: string;
  isCompleted: boolean;
  completedAt: Date | null;
  dueDate: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  status: "COMPLETED" | "PENDING";
}

interface ClientDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientSuggestion | null;
}

interface ClientData {
  sales: (Sale & {
    saleItems: Array<{
      id: string;
      quantity: number;
      price: number;
      product?: { name: string; categoryName: string };
      service?: { name: string; description: string | null };
    }>;
  })[];
  payments: Payment[];
  services: ServiceData[];
  totalSpent: number;
  totalCredits: number;
  totalVersements: number;
  pendingCredits: number;
  pendingVersements: number;
  balance: number;
}

export const ClientDetailsModal = ({
  open,
  onOpenChange,
  client,
}: ClientDetailsModalProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sales" | "payments" | "services">("sales");
  const [salesLimit, setSalesLimit] = useState(5);
  const [paymentsLimit, setPaymentsLimit] = useState(5);
  const [servicesLimit, setServicesLimit] = useState(5);

  useEffect(() => {
    if (open && client) {
      fetchClientData();
    }
  }, [open, client]);

  const fetchClientData = async () => {
    if (!client || !client.id) {
      console.error("No client or client ID provided");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching data for client:", client.id, client.name);
      
      // Fetch all client data in parallel
      const [salesData, paymentsData, servicesData] = await Promise.all([
        window.api.database.sales.getByClient(client.id).catch((err: any) => {
          console.error("Error fetching sales for client", client.id, ":", err);
          throw new Error(`Failed to fetch sales: ${err.message}`);
        }),
        window.api.database.payments.getByClientWithInfo(client.id).catch((err: any) => {
          console.error("Error fetching payments for client", client.id, ":", err);
          throw new Error(`Failed to fetch payments: ${err.message}`);
        }),
        window.api.database.services.getByClient(client.id).catch((err: any) => {
          console.error("Error fetching services for client", client.id, ":", err);
          throw new Error(`Failed to fetch services: ${err.message}`);
        })
      ]);
      
      console.log("Fetched data:", { salesData, paymentsData, servicesData });

      // Calculate totals
      const totalSpent = salesData.reduce((sum: number, sale: any) => 
        sum + sale.saleItems.reduce((itemSum: number, item: any) => itemSum + (item.price * item.quantity), 0), 0
      );

      const credits = paymentsData.filter((p: any) => p.type === "CREDIT");
      const versements = paymentsData.filter((p: any) => p.type === "VERSEMENT");
      
      const totalCredits = credits.reduce((sum: number, p: any) => {
        // For CREDIT: use remainingAmount if available, otherwise givenAmount
        return sum + (p.remainingAmount !== undefined ? p.remainingAmount : p.givenAmount);
      }, 0);
      const totalVersements = versements.reduce((sum: number, p: any) => sum + p.givenAmount, 0);
      const pendingCredits = credits.filter((p: any) => !p.paidDate).reduce((sum: number, p: any) => {
        // For CREDIT: use remainingAmount if available, otherwise givenAmount
        return sum + (p.remainingAmount !== undefined ? p.remainingAmount : p.givenAmount);
      }, 0);
      const pendingVersements = versements.filter((p: any) => !p.paidDate).reduce((sum: number, p: any) => sum + p.givenAmount, 0);
      const balance = totalCredits - totalVersements;

      setClientData({
        sales: salesData,
        payments: paymentsData,
        services: servicesData,
        totalSpent,
        totalCredits,
        totalVersements,
        pendingCredits,
        pendingVersements,
        balance
      });
    } catch (err) {
      setError(t("clients.fetchError", "Failed to fetch client data"));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const saleDate = new Date(date);
    const now = new Date();

    // Check if it's today
    const isToday = saleDate.toDateString() === now.toDateString();
    
    const hours = saleDate.getHours().toString().padStart(2, '0');
    const minutes = saleDate.getMinutes().toString().padStart(2, '0');

    if (isToday) {
      return `${t("today")} - ${hours}:${minutes}`;
    } else {
      // Format: DD/MM/YYYY - HH:MM
      const day = saleDate.getDate().toString().padStart(2, '0');
      const month = (saleDate.getMonth() + 1).toString().padStart(2, '0');
      const year = saleDate.getFullYear();

      return `${day}/${month}/${year} - ${hours}:${minutes}`;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency", "DA")}`;
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("clients.clientDetails", "Client Details")}
      subtitle={client?.name || "Loading..."}
      icon={<User className="w-5 h-5 text-blue-600" />}
      showCloseButton={false}
      size="lg"
      className="min-w-[70%] max-h-[70vh] overflow-y-auto"
      showFooter={false}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <XCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">{error}</p>
        </div>
      ) : clientData ? (
        <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
          {/* Client Details */}
          <div className="flex gap-6 items-center justify-center">
            {/* Client Info */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className={isRTL ? "text-right" : "text-left"}>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("clients.clientName", "Client Name")}
                </label>
                <p className="text-foreground font-medium">
                  {client.name}
                </p>
              </div>
              <div className={isRTL ? "text-right" : "text-left"}>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("clients.phone", "Phone")}
                </label>
                <p className="text-foreground">
                  {client.phone || t("clients.noPhone", "No phone")}
                </p>
              </div>
              <div className={isRTL ? "text-right" : "text-left"}>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("clients.totalSpent", "Total Spent")}
                </label>
                <p className="text-foreground font-medium text-green-600">
                  {formatCurrency(clientData.totalSpent)}
                </p>
              </div>
              <div className={isRTL ? "text-right" : "text-left"}>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("clients.totalCredits", "Total Credits")}
                </label>
                <p className="text-foreground">
                  {formatCurrency(clientData.totalCredits)}
                </p>
              </div>
              <div className={isRTL ? "text-right" : "text-left"}>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("clients.totalVersements", "Total Versements")}
                </label>
                <p className="text-foreground">
                  {formatCurrency(clientData.totalVersements)}
                </p>
              </div>
              <div className={isRTL ? "text-right" : "text-left"}>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("clients.balance", "Balance")}
                </label>
                <p className="text-foreground font-medium text-blue-600">
                  {formatCurrency(Math.abs(clientData.balance))}
                  {clientData.balance < 0 && " -"}
                </p>
              </div>
            </div>

            {/* Client Avatar */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <div className="w-32 h-32 flex items-center justify-center bg-muted/30 rounded-lg border border-border shadow-lg">
                <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {client.name.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-muted/30 p-1 rounded-lg">
            {[
              { id: "sales", label: t("clients.sales", "Sales"), icon: ShoppingCart },
              { id: "payments", label: t("clients.payments", "Payments"), icon: CreditCard },
              { id: "services", label: t("clients.services", "Services"), icon: Wrench }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sales Tab */}
          {activeTab === "sales" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`text-lg font-semibold flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <ShoppingCart className="w-5 h-5" />
                {t("clients.salesHistory", "Sales History")}
              </h3>
              {clientData.sales.length > 0 && (
                <div
                  className={`flex gap-4 text-sm text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <span>
                    {t("clients.totalSales", "Total Sales")}: {clientData.sales.length}
                  </span>
                  <span>
                    {t("clients.totalSpent", "Total Spent")}: {formatCurrency(clientData.totalSpent)}
                  </span>
                </div>
              )}
            </div>

            {clientData.sales.length > 0 ? (
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.saleId", "Sale ID")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.date", "Date")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.items", "Items")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.total", "Total")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {clientData.sales.slice(0, salesLimit).map((sale) => (
                        <tr
                          key={sale.id}
                          className="hover:bg-muted/40 transition"
                        >
                          <td
                            className={`px-4 py-3 text-sm font-mono text-blue-600 font-medium ${isRTL ? "text-right" : "text-left"}`}
                          >
                            #{sale.id.slice(-8)}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                          >
                            {formatDate(sale.createdAt)}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                          >
                            <div className="space-y-1">
                              {sale.saleItems.slice(0, 2).map((item, index) => (
                                <div key={index} className="text-xs">
                                  {item.product?.name || item.service?.name} x{item.quantity}
                                </div>
                              ))}
                              {sale.saleItems.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{sale.saleItems.length - 2} more
                                </div>
                              )}
                            </div>
                          </td>
                          <td
                            className={`px-4 py-3 text-sm font-medium text-green-600 ${isRTL ? "text-right" : "text-left"}`}
                          >
                            {formatCurrency(sale.saleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                className={`text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed ${isRTL ? "text-right" : "text-center"}`}
              >
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">
                  {t("clients.noSales", "No sales found")}
                </p>
                <p className="text-sm opacity-70">
                  {t("clients.noSalesDesc", "This client hasn't made any purchases yet")}
                </p>
              </div>
            )}

            {/* Show More Button for Sales */}
            {clientData.sales.length > 5 && (
              <div className="flex justify-center mt-4">
                {salesLimit < clientData.sales.length ? (
                  <button
                    onClick={() =>
                      setSalesLimit((prev) =>
                        Math.min(prev + 5, clientData.sales.length)
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                    {t("clients.showMore", "Show More")} (
                    {Math.min(5, clientData.sales.length - salesLimit)}{" "}
                    {t("clients.more", "more")})
                  </button>
                ) : (
                  <button
                    onClick={() => setSalesLimit(5)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("clients.showLess", "Show Less")}
                  </button>
                )}
              </div>
            )}
          </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`text-lg font-semibold flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <CreditCard className="w-5 h-5" />
                {t("clients.paymentsHistory", "Payments History")}
              </h3>
              {clientData.payments.length > 0 && (
                <div
                  className={`flex gap-4 text-sm text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <span>
                    {t("clients.totalPayments", "Total Payments")}: {clientData.payments.length}
                  </span>
                  <span>
                    {t("clients.totalCredits", "Total Credits")}: {formatCurrency(clientData.totalCredits)}
                  </span>
                  <span>
                    {t("clients.totalVersements", "Total Versements")}: {formatCurrency(clientData.totalVersements)}
                  </span>
                </div>
              )}
            </div>

            {clientData.payments.length > 0 ? (
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.paymentId", "Payment ID")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.date", "Date")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.type", "Type")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.status", "Status")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.amount", "Amount")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {clientData.payments.slice(0, paymentsLimit).map((payment) => (
                        <tr
                          key={payment.id}
                          className="hover:bg-muted/40 transition"
                        >
                          <td
                            className={`px-4 py-3 text-sm font-mono text-blue-600 font-medium ${isRTL ? "text-right" : "text-left"}`}
                          >
                            #{payment.id.slice(-8)}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                          >
                            {formatDate(payment.createdAt)}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                          >
                            {payment.type}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium ${
                              payment.paidDate 
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            }`}>
                              {payment.paidDate ? t("clients.paid", "Paid") : t("clients.pending", "Pending")}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-sm font-medium text-blue-600 ${isRTL ? "text-right" : "text-left"}`}
                          >
                            {formatCurrency(
                              payment.type === "CREDIT" && (payment as any).remainingAmount !== undefined
                                ? (payment as any).remainingAmount
                                : payment.givenAmount
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                className={`text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed ${isRTL ? "text-right" : "text-center"}`}
              >
                <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">
                  {t("clients.noPayments", "No payments found")}
                </p>
                <p className="text-sm opacity-70">
                  {t("clients.noPaymentsDesc", "This client has no payment history yet")}
                </p>
              </div>
            )}

            {/* Show More Button for Payments */}
            {clientData.payments.length > 5 && (
              <div className="flex justify-center mt-4">
                {paymentsLimit < clientData.payments.length ? (
                  <button
                    onClick={() =>
                      setPaymentsLimit((prev) =>
                        Math.min(prev + 5, clientData.payments.length)
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                    {t("clients.showMore", "Show More")} (
                    {Math.min(5, clientData.payments.length - paymentsLimit)}{" "}
                    {t("clients.more", "more")})
                  </button>
                ) : (
                  <button
                    onClick={() => setPaymentsLimit(5)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("clients.showLess", "Show Less")}
                  </button>
                )}
              </div>
            )}
          </div>
          )}

          {/* Services Tab */}
          {activeTab === "services" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`text-lg font-semibold flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <Wrench className="w-5 h-5" />
                {t("clients.servicesHistory", "Services History")}
              </h3>
              {clientData.services.length > 0 && (
                <div
                  className={`flex gap-4 text-sm text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <span>
                    {t("clients.totalServices", "Total Services")}: {clientData.services.length}
                  </span>
                  <span>
                    {t("clients.totalCost", "Total Cost")}: {formatCurrency(clientData.services.reduce((sum, service) => sum + service.costPrice, 0))}
                  </span>
                </div>
              )}
            </div>

            {clientData.services.length > 0 ? (
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.serviceName", "Service Name")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.description", "Description")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.cost", "Cost")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.status", "Status")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("clients.date", "Date")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {clientData.services.slice(0, servicesLimit).map((service) => (
                        <tr
                          key={service.id}
                          className="hover:bg-muted/40 transition"
                        >
                          <td
                            className={`px-4 py-3 text-sm font-medium text-foreground ${isRTL ? "text-right" : "text-left"}`}
                          >
                            {service.name}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                          >
                            {service.description || "-"}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm font-medium text-cyan-600 ${isRTL ? "text-right" : "text-left"}`}
                          >
                            {formatCurrency(service.costPrice)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              service.status === "COMPLETED" 
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                            }`}>
                              {service.status === "COMPLETED" 
                                ? t("clients.completed", "Completed") 
                                : t("clients.pending", "Pending")}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                          >
                            {formatDate(service.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                className={`text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed ${isRTL ? "text-right" : "text-center"}`}
              >
                <Wrench className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">
                  {t("clients.noServices", "No services found")}
                </p>
                <p className="text-sm opacity-70">
                  {t("clients.noServicesDesc", "This client has no service history yet")}
                </p>
              </div>
            )}

            {/* Show More Button for Services */}
            {clientData.services.length > 5 && (
              <div className="flex justify-center mt-4">
                {servicesLimit < clientData.services.length ? (
                  <button
                    onClick={() =>
                      setServicesLimit((prev) =>
                        Math.min(prev + 5, clientData.services.length)
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                    {t("clients.showMore", "Show More")} (
                    {Math.min(5, clientData.services.length - servicesLimit)}{" "}
                    {t("clients.more", "more")})
                  </button>
                ) : (
                  <button
                    onClick={() => setServicesLimit(5)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("clients.showLess", "Show Less")}
                  </button>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      ) : (
        <div
          className={`text-center py-8 text-muted-foreground ${isRTL ? "text-right" : "text-center"}`}
        >
          <p>
            {t(
              "clients.errorLoadingClient",
              "Error loading client information"
            )}
          </p>
        </div>
      )}
    </Modal>
  );
};

export default ClientDetailsModal;