import React, { useState } from "react";
import { Printer, Eye, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../../lib/components/modal";
import type { CartItem } from "../../../types";
import rendererLogger from "../../../lib/logger/rendererLogger";
import { generateReceiptBarcode } from "../../../lib/utils/barcodeVisual";
import { useToast } from "../../../lib/contexts/toastContext";

interface Props {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  clientName: string;
  discount: number;
  paymentAmount: number;
  paymentType: "none" | "credit" | "versement";
  paymentDate?: Date;
  saleId?: string;
}

// Export the print function for direct use
export const printReceiptDirectly = async (
  cart: CartItem[],
  clientName: string,
  discount: number,
  paymentAmount: number,
  paymentType: "none" | "credit" | "versement",
  paymentDate?: Date,
  saleId?: string,
  showToast?: (message: string, type?: "success" | "error" | "info") => void
) => {
  
  // Store information - will be loaded from database
  let storeInfo = {
    name: "Store Management",
    address: "Your Store Address",
    phone: "Phone: +1234567890",
  };
  let footerMessage = "";

  // Receipt translations
  const receiptTranslations = {
    fr: {
      address: "Adresse",
      phone: "Téléphone",
      date: "Date",
      time: "Heure",
      item: "ARTICLE",
      qty: "QTÉ",
      price: "PRIX",
      total: "TOTAL",
      client: "Client",
      discount: "Remise",
      subtotal: "Sous-total",
      finalTotal: "Total",
      payment: "Paiement",
      type: "Type",
      credit: "Crédit",
      versement: "Versement",
      amountPaid: "Montant Payé",
      dueDate: "Date d'Échéance",
      remaining: "Restant",
      currency: "DA",
      thankYou: "Merci pour votre achat!",
      comeAgain: "Revenez nous voir",
      appreciate: "Nous apprécions votre confiance",
      receiptId: "ID",
      storeManagement: "Système de Gestion de Magasin",
      contact: "Contact"
    },
    en: {
      address: "Address",
      phone: "Phone",
      date: "Date",
      time: "Time",
      item: "ITEM",
      qty: "QTY",
      price: "PRICE",
      total: "TOTAL",
      client: "Client",
      discount: "Discount",
      subtotal: "Subtotal",
      finalTotal: "Total",
      payment: "Payment",
      type: "Type",
      credit: "Credit",
      versement: "Installment",
      amountPaid: "Amount Paid",
      dueDate: "Due Date",
      remaining: "Remaining",
      currency: "DA",
      thankYou: "Thank you for your purchase!",
      comeAgain: "Please come again",
      appreciate: "We appreciate your business",
      receiptId: "ID",
      storeManagement: "Store Management System",
      contact: "Contact"
    },
    ar: {
      address: "العنوان",
      phone: "الهاتف",
      date: "التاريخ",
      time: "الوقت",
      item: "المادة",
      qty: "الكمية",
      price: "السعر",
      total: "المجموع",
      client: "العميل",
      discount: "الخصم",
      subtotal: "المجموع الفرعي",
      finalTotal: "المجموع النهائي",
      payment: "الدفع",
      type: "النوع",
      credit: "الائتمان",
      versement: "التقسيط",
      amountPaid: "المبلغ المدفوع",
      dueDate: "تاريخ الاستحقاق",
      remaining: "المتبقي",
      currency: "دج",
      thankYou: "شكراً لشرائك!",
      comeAgain: "نرجو زيارتنا مرة أخرى",
      appreciate: "نقدر ثقتكم بنا",
      receiptId: "الرقم",
      storeManagement: "نظام إدارة المتجر",
      contact: "الاتصال"
    }
  };

  // Load store information from database
  let language: "fr" | "en" | "ar" = "fr"; // Default to French
  try {
    const [name, address, phone, phones, footer, loadedLanguage] = await Promise.all([
      window.api.database.options.get("storeName"),
      window.api.database.options.get("storeAddress"),
      window.api.database.options.get("storePhone"),
      window.api.database.options.get("storePhoneNumbers"),
      window.api.database.options.get("receiptFooterMessage"),
      window.api.database.options.get("receiptLanguage"),
    ]);

    language = (loadedLanguage as "fr" | "en" | "ar") || "fr";

    const allPhones = [phone, ...(phones ? JSON.parse(phones) : [])].filter(p => p && p.trim() !== "");
    const phoneDisplay = allPhones.length > 0 
      ? allPhones.map(p => `${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].phone}: ${p}`).join('<br>')
      : `${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].phone}: +1234567890`;

    storeInfo = {
      name: name || "Store Management",
      address: address ? `${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].address}: ${address}` : `${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].address}: Your Store Address`,
      phone: phoneDisplay,
    };
    footerMessage = footer || "";
  } catch (error) {
    console.error("Failed to load store information:", error);
  }

  // Calculate totals
  const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const finalTotal = total - discount;
  const currentDate = new Date();
  const receiptNumber = saleId || `TEMP-${Date.now()}`;
  

  // Generate barcode from receipt ID (8 characters max)
  const generateReceiptBarcodeData = () => {
    try {
      // Use the new 8-character receipt barcode function
      return generateReceiptBarcode(receiptNumber, {
        format: 'CODE128',
        width: 2.5,
        height: 80,
        displayValue: false,
        fontSize: 12,
        margin: 15,
      });
    } catch (error) {
      console.error('Failed to generate receipt barcode:', error);
      return null;
    }
  };

  const receiptBarcode = generateReceiptBarcodeData();

  // Generate receipt HTML after loading all data
  const generateReceiptHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt Preview</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              font-family: 'Courier New', monospace;
              background: #f5f5f5;
            }
            body {
              margin-top: 0 !important;
              padding-top: 0 !important;
            }
            .receipt {
              width: 70mm;
              max-width: 70mm;
              margin: 0;
              background: white;
              border: none;
              border-radius: 0;
              padding: 4px;
              box-shadow: none;
              font-size: 12px;
              overflow: visible;
            }
            /* RTL Support for Arabic */
            .receipt[dir="rtl"] {
              direction: rtl;
            }
            .receipt[dir="rtl"] .header {
              text-align: center;
            }
            .receipt[dir="rtl"] .store-name {
              text-align: center;
            }
            .receipt[dir="rtl"] .item-name {
              text-align: right;
            }
            .receipt[dir="rtl"] .item-qty {
              text-align: center;
            }
            .receipt[dir="rtl"] .item-price {
              text-align: right;
            }
            .receipt[dir="rtl"] .item-total {
              text-align: right;
            }
            .receipt[dir="rtl"] .header-item-name {
              text-align: right;
            }
            .receipt[dir="rtl"] .header-qty {
              text-align: center;
            }
            .receipt[dir="rtl"] .header-price {
              text-align: right;
            }
            .receipt[dir="rtl"] .header-total {
              text-align: right;
            }
            .receipt[dir="rtl"] .receipt-id {
              text-align: center;
            }
            .receipt[dir="rtl"] .welcome {
              text-align: center;
            }
            .receipt[dir="rtl"] .watermark {
              text-align: right;
            }
            /* Fix table layout for RTL - reverse column order */
            .receipt[dir="rtl"] .item {
              direction: rtl;
            }
            .receipt[dir="rtl"] .items-header {
              direction: rtl;
            }
            /* Keep text direction LTR for numbers and prices */
            .receipt[dir="rtl"] .item-qty,
            .receipt[dir="rtl"] .item-price,
            .receipt[dir="rtl"] .item-total,
            .receipt[dir="rtl"] .header-qty,
            .receipt[dir="rtl"] .header-price,
            .receipt[dir="rtl"] .header-total {
              direction: ltr;
            }
            .header {
              text-align: center;
              margin-bottom: 1px;
              margin-top: 0;
            }
            .store-name {
              font-size: 36px;
              font-weight: 900;
              margin-bottom: 1px;
              margin-top: 0;
              padding-top: 0;
              color: #000;
              letter-spacing: 1px;
              text-shadow: 1px 1px 0px #000;
            }
            .store-info {
              font-size: 12px;
              margin-bottom: 2px;
              color: #000;
              font-weight: 900;
            }
            .receipt-info {
              font-size: 12px;
              margin-bottom: 2px;
              color: #000;
              font-weight: 900;
            }
            .divider {
              border-top: 1px solid #000;
              margin: 2px 0;
            }
            .items {
              margin-bottom: 2px;
            }
            .item {
              display: flex;
              width: 100%;
              margin-bottom: 1px;
              font-size: 12px;
              line-height: 1.1;
              min-height: 14px;
              font-weight: 900;
              padding-bottom: 1px;
            }
            .item-name {
              flex: 1;
              padding-right: 4px;
              word-wrap: break-word;
              word-break: break-word;
              white-space: normal;
              line-height: 1.1;
              color: #000;
              overflow-wrap: break-word;
              min-width: 0;
              max-width: calc(100% - 140px);
            }
            .item-qty {
              width: 28px;
              text-align: center;
              font-weight: 800;
              color: #000;
              font-size: 13px;
              flex-shrink: 0;
              margin-right: 2px;
            }
            .item-price {
              width: 50px;
              text-align: right;
              color: #000;
              font-size: 13px;
              flex-shrink: 0;
              margin-right: 4px;
            }
            .item-total {
              width: 50px;
              text-align: right;
              font-weight: 800;
              color: #000;
              font-size: 13px;
              flex-shrink: 0;
            }
            .items-header {
              display: flex;
              width: 100%;
              margin-bottom: 2px;
              font-size: 12px;
              font-weight: 800;
              border-bottom: 1px solid #000;
              padding-bottom: 1px;
              color: #000;
            }
            .header-qty {
              width: 28px;
              text-align: center;
              margin-right: 2px;
            }
            .header-price {
              width: 50px;
              text-align: right;
              margin-right: 4px;
            }
            .header-total {
              width: 50px;
              text-align: right;
            }
            .header-item-name {
              flex: 1;
              padding-right: 4px;
              max-width: calc(100% - 140px);
            }
            .totals {
              font-size: 13px;
              font-weight: 800;
              color: #000;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .payment-info {
              margin-top: 2px;
              font-size: 13px;
              color: #000;
              font-weight: 900;
            }
            .client-info {
              margin-bottom: 2px;
              font-size: 12px;
              color: #000;
              font-weight: 900;
            }
            .receipt-id {
              text-align: center;
              margin: 2px 0;
              padding: 2px 0;
              border-top: 1px solid #000;
            }
            .receipt-id-text {
              font-size: 12px;
              margin-top: 1px;
              color: #000;
              font-weight: 900;
            }
            .welcome {
              text-align: center;
              margin-top: 1px;
              font-size: 12px;
              font-weight: 800;
              color: #000;
            }
            .watermark {
              text-align: left;
              margin-top: 3px;
              padding-top: 2px;
              border-top: 1px solid #000;
              font-size: 9px;
              color: #000;
              font-weight: 800;
              line-height: 1.2;
            }
            @page {
              size: 70mm auto;
              margin: 0;
              padding: 0;
            }
            @media print {
              body {
                margin: 0;
                padding: 0px;
                background: white;
                width: 80mm;
              }
              .receipt {
                width: 80mm;
                margin: 0;
                max-width: 80mm;
                border: none;
                border-radius: 0;
                padding: 0px;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt"${(language as "fr" | "en" | "ar") === "ar" ? ' dir="rtl"' : ''}>
            <!-- Store Header -->
            <div class="header">
              <div class="store-name">${storeInfo.name}</div>
              <div class="store-info">${storeInfo.address}</div>
              <div class="store-info">${storeInfo.phone}</div>
            </div>

            <!-- Date and Time -->
            <div class="receipt-info">
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].date}: ${currentDate.toLocaleDateString()}</div>
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].time}: ${currentDate.toLocaleTimeString()}</div>
            </div>

            <!-- Client Info -->
            ${clientName ? `<div class="client-info">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].client}: ${clientName}</div>` : ""}

            <div class="divider"></div>

            <!-- Items -->
            <div class="items">
              <div class="items-header">
                <div class="header-item-name">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].item}</div>
                <div class="header-qty">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].qty}</div>
                <div class="header-price">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].price}</div>
                <div class="header-total">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].total}</div>
              </div>
              ${cart
                .map(
                  (item) => `
                <div class="item">
                  <div class="item-name">${item.name.replace(/\n/g, " ")}</div>
                  <div class="item-qty">${item.qty}</div>
                  <div class="item-price">${item.price.toLocaleString()}</div>
                  <div class="item-total">${(item.qty * item.price).toLocaleString()}</div>
                </div>
              `,
                )
                .join("")}
            </div>

            <div class="divider"></div>

            <!-- Totals -->
            <div class="totals">
              <div class="total-row">
                <span>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].subtotal}:</span>
                <span>${total.toLocaleString()} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</span>
              </div>
              ${
                discount > 0
                  ? `
                <div class="total-row">
                  <span>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].discount}:</span>
                  <span>-${discount.toLocaleString()} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</span>
                </div>
              `
                  : ""
              }
              ${
                discount > 0 || (paymentType !== "none" && paymentAmount > 0)
                  ? `
                <div class="total-row">
                  <span>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].finalTotal}:</span>
                  <span>${finalTotal.toLocaleString()} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</span>
                </div>
              `
                  : ""
              }
            </div>

            <!-- Payment Info -->
            ${
              paymentType !== "none" && paymentAmount > 0
                ? `
              <div class="payment-info">
                <div class="divider"></div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].payment} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].type}: ${paymentType === "credit" ? receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].credit : receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].versement}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].amountPaid}: ${paymentAmount.toLocaleString()} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].dueDate}: ${paymentDate ? paymentDate.toLocaleDateString() : "N/A"}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].remaining}: ${(finalTotal - paymentAmount).toLocaleString()} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</div>
              </div>
            `
                : ""
            }

            <!-- Receipt ID with Barcode -->
            <div class="receipt-id">
              ${receiptBarcode ? `
                <div style="text-align: center; margin-bottom: 2px;">
                  <img src="${receiptBarcode}" alt="Receipt Barcode" style="max-width: 100%; height: 80px;" />
                </div>
              ` : ''}
              <div class="receipt-id-text">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].receiptId}: ${receiptNumber.substring(0, 8)}</div>
            </div>

            <!-- Welcome Message -->
            <div class="welcome">
              ${footerMessage ? footerMessage : `
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].thankYou}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].comeAgain}</div>
                <div style="margin-top: 1px;">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].appreciate}</div>
              `}
            </div>
            
            <!-- Watermark -->
            <div class="watermark">
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].storeManagement}</div>
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].contact}: 0793420745</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast?.("Failed to open print window", "error");
      return;
    }

    const receiptHTML = generateReceiptHTML();
    
    
    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Wait for the content to fully load, then show both preview and print dialog
    printWindow.onload = () => {
      // Focus the window to make sure content is visible
      printWindow.focus();
      
      
      // Wait a bit more to ensure content is fully rendered, then print
      setTimeout(() => {
        printWindow.print();
        // Don't close immediately, let user see the preview
        // printWindow.close();
      }, 200);
    };
  } catch (error) {
    console.error("Print error:", error);
    showToast?.("Failed to print receipt", "error");
  }
};

export default function ReceiptModal({
  open,
  onClose,
  cart,
  clientName,
  discount,
  paymentAmount,
  paymentType,
  paymentDate,
  saleId,
}: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [isPrinting, setIsPrinting] = useState(false);

  // Receipt translations
  const receiptTranslations = {
    fr: {
      address: "Adresse",
      phone: "Téléphone",
      date: "Date",
      time: "Heure",
      item: "ARTICLE",
      qty: "QTÉ",
      price: "PRIX",
      total: "TOTAL",
      client: "Client",
      discount: "Remise",
      subtotal: "Sous-total",
      finalTotal: "Total",
      payment: "Paiement",
      type: "Type",
      credit: "Crédit",
      versement: "Versement",
      amountPaid: "Montant Payé",
      dueDate: "Date d'Échéance",
      remaining: "Restant",
      currency: "DA",
      thankYou: "Merci pour votre achat!",
      comeAgain: "Revenez nous voir",
      appreciate: "Nous apprécions votre confiance",
      receiptId: "ID",
      storeManagement: "Système de Gestion de Magasin",
      contact: "Contact"
    },
    en: {
      address: "Address",
      phone: "Phone",
      date: "Date",
      time: "Time",
      item: "ITEM",
      qty: "QTY",
      price: "PRICE",
      total: "TOTAL",
      client: "Client",
      discount: "Discount",
      subtotal: "Subtotal",
      finalTotal: "Total",
      payment: "Payment",
      type: "Type",
      credit: "Credit",
      versement: "Installment",
      amountPaid: "Amount Paid",
      dueDate: "Due Date",
      remaining: "Remaining",
      currency: "DA",
      thankYou: "Thank you for your purchase!",
      comeAgain: "Please come again",
      appreciate: "We appreciate your business",
      receiptId: "ID",
      storeManagement: "Store Management System",
      contact: "Contact"
    },
    ar: {
      address: "العنوان",
      phone: "الهاتف",
      date: "التاريخ",
      time: "الوقت",
      item: "المادة",
      qty: "الكمية",
      price: "السعر",
      total: "المجموع",
      client: "العميل",
      discount: "الخصم",
      subtotal: "المجموع الفرعي",
      finalTotal: "المجموع النهائي",
      payment: "الدفع",
      type: "النوع",
      credit: "الائتمان",
      versement: "التقسيط",
      amountPaid: "المبلغ المدفوع",
      dueDate: "تاريخ الاستحقاق",
      remaining: "المتبقي",
      currency: "دج",
      thankYou: "شكراً لشرائك!",
      comeAgain: "نرجو زيارتنا مرة أخرى",
      appreciate: "نقدر ثقتكم بنا",
      receiptId: "الرقم",
      storeManagement: "نظام إدارة المتجر",
      contact: "الاتصال"
    }
  };

  // Store information - will be loaded from database
  const [storeInfo, setStoreInfo] = useState({
    name: "Store Management",
    address: "Address: Your Store Address",
    phone: "Phone: +1234567890",
  });
  const [footerMessage, setFooterMessage] = useState("");

  // Load store information from database
  React.useEffect(() => {
    const loadStoreInfo = async () => {
      try {
        const [name, address, phone, phones, footer, language] = await Promise.all([
          window.api.database.options.get("storeName"),
          window.api.database.options.get("storeAddress"),
          window.api.database.options.get("storePhone"),
          window.api.database.options.get("storePhoneNumbers"),
          window.api.database.options.get("receiptFooterMessage"),
          window.api.database.options.get("receiptLanguage"),
        ]);
        
        const allPhones = [phone, ...(phones ? JSON.parse(phones) : [])].filter(p => p && p.trim() !== "");
        const phoneDisplay = allPhones.length > 0 
          ? allPhones.map(p => `${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].phone}: ${p}`).join('<br>')
          : `${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].phone}: +1234567890`;
        
        setStoreInfo({
          name: name || "Store Management",
          address: address ? `${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].address}: ${address}` : `${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].address}: Your Store Address`,
          phone: phoneDisplay,
        });
        setFooterMessage(footer || "");
      } catch (error) {
        console.error("Failed to load store information:", error);
      }
    };
    
    loadStoreInfo();
  }, []);

  // Calculate totals
  const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const finalTotal = total - discount;
  const currentDate = new Date();
  const receiptNumber = saleId || `TEMP-${Date.now()}`;

  // Generate barcode from receipt ID (8 characters max)
  const generateReceiptBarcodeData = () => {
    try {
      // Use the new 8-character receipt barcode function
      return generateReceiptBarcode(receiptNumber, {
        format: 'CODE128',
        width: 2.5,
        height: 80,
        displayValue: false,
        fontSize: 12,
        margin: 15,
      });
    } catch (error) {
      console.error('Failed to generate receipt barcode:', error);
      return null;
    }
  };

  const receiptBarcode = generateReceiptBarcodeData();
  const shortReceiptId = receiptNumber.substring(0, 8);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.showToast(t("cashier.printError", "Failed to open print window"), "error");
        return;
      }

      const receiptHTML = generateReceiptHTML();
      printWindow.document.write(receiptHTML);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
        toast.showToast(t("cashier.printSuccess", "Receipt sent to printer"), "success");
      };
    } catch (error) {
      rendererLogger.error("Print error", "ReceiptModal", error);
      toast.showToast(t("cashier.printError", "Failed to print receipt"), "error");
    } finally {
      setIsPrinting(false);
    }
  };


  const handlePreview = () => {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      toast.showToast(t("cashier.previewError", "Failed to open preview window"), "error");
      return;
    }

    const receiptHTML = generateReceiptHTML();
    previewWindow.document.write(receiptHTML);
    previewWindow.document.close();
    previewWindow.focus();
  };

  const generateReceiptHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt Preview</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              font-family: 'Courier New', monospace;
              background: #f5f5f5;
            }
            body {
              margin-top: 0 !important;
              padding-top: 0 !important;
            }
            .receipt {
              width: 70mm;
              max-width: 70mm;
              margin: 0;
              background: white;
              border: none;
              border-radius: 0;
              padding: 4px;
              box-shadow: none;
              font-size: 12px;
              overflow: visible;
            }
            /* RTL Support for Arabic */
            .receipt[dir="rtl"] {
              direction: rtl;
            }
            .receipt[dir="rtl"] .header {
              text-align: center;
            }
            .receipt[dir="rtl"] .store-name {
              text-align: center;
            }
            .receipt[dir="rtl"] .item-name {
              text-align: right;
            }
            .receipt[dir="rtl"] .item-qty {
              text-align: center;
            }
            .receipt[dir="rtl"] .item-price {
              text-align: right;
            }
            .receipt[dir="rtl"] .item-total {
              text-align: right;
            }
            .receipt[dir="rtl"] .header-item-name {
              text-align: right;
            }
            .receipt[dir="rtl"] .header-qty {
              text-align: center;
            }
            .receipt[dir="rtl"] .header-price {
              text-align: right;
            }
            .receipt[dir="rtl"] .header-total {
              text-align: right;
            }
            .receipt[dir="rtl"] .receipt-id {
              text-align: center;
            }
            .receipt[dir="rtl"] .welcome {
              text-align: center;
            }
            .receipt[dir="rtl"] .watermark {
              text-align: right;
            }
            /* Fix table layout for RTL - reverse column order */
            .receipt[dir="rtl"] .item {
              direction: rtl;
            }
            .receipt[dir="rtl"] .items-header {
              direction: rtl;
            }
            /* Keep text direction LTR for numbers and prices */
            .receipt[dir="rtl"] .item-qty,
            .receipt[dir="rtl"] .item-price,
            .receipt[dir="rtl"] .item-total,
            .receipt[dir="rtl"] .header-qty,
            .receipt[dir="rtl"] .header-price,
            .receipt[dir="rtl"] .header-total {
              direction: ltr;
            }
            .header {
              text-align: center;
              margin-bottom: 1px;
              margin-top: 0;
            }
            .store-name {
              font-size: 36px;
              font-weight: 900;
              margin-bottom: 1px;
              margin-top: 0;
              padding-top: 0;
              color: #000;
              letter-spacing: 1px;
              text-shadow: 1px 1px 0px #000;
            }
            .store-info {
              font-size: 12px;
              margin-bottom: 2px;
              color: #000;
              font-weight: 900;
            }
            .receipt-info {
              font-size: 12px;
              margin-bottom: 2px;
              color: #000;
              font-weight: 900;
            }
            .divider {
              border-top: 1px solid #000;
              margin: 2px 0;
            }
            .items {
              margin-bottom: 2px;
            }
            .item {
              display: flex;
              width: 100%;
              margin-bottom: 1px;
              font-size: 12px;
              line-height: 1.1;
              min-height: 14px;
              font-weight: 900;
              padding-bottom: 1px;
            }
            .item-name {
              flex: 1;
              padding-right: 4px;
              word-wrap: break-word;
              word-break: break-word;
              white-space: normal;
              line-height: 1.1;
              color: #000;
              overflow-wrap: break-word;
              min-width: 0;
              max-width: calc(100% - 140px);
            }
            .item-qty {
              width: 28px;
              text-align: center;
              font-weight: 800;
              color: #000;
              font-size: 13px;
              flex-shrink: 0;
              margin-right: 2px;
            }
            .item-price {
              width: 50px;
              text-align: right;
              color: #000;
              font-size: 13px;
              flex-shrink: 0;
              margin-right: 4px;
            }
            .item-total {
              width: 50px;
              text-align: right;
              font-weight: 800;
              color: #000;
              font-size: 13px;
              flex-shrink: 0;
            }
            .items-header {
              display: flex;
              width: 100%;
              margin-bottom: 2px;
              font-size: 12px;
              font-weight: 800;
              border-bottom: 1px solid #000;
              padding-bottom: 1px;
              color: #000;
            }
            .header-qty {
              width: 28px;
              text-align: center;
              margin-right: 2px;
            }
            .header-price {
              width: 50px;
              text-align: right;
              margin-right: 4px;
            }
            .header-total {
              width: 50px;
              text-align: right;
            }
            .header-item-name {
              flex: 1;
              padding-right: 4px;
              max-width: calc(100% - 140px);
            }
            .totals {
              font-size: 13px;
              font-weight: 800;
              color: #000;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .payment-info {
              margin-top: 2px;
              font-size: 13px;
              color: #000;
              font-weight: 900;
            }
            .client-info {
              margin-bottom: 2px;
              font-size: 12px;
              color: #000;
              font-weight: 900;
            }
            .receipt-id {
              text-align: center;
              margin: 2px 0;
              padding: 2px 0;
              border-top: 1px solid #000;
            }
            .receipt-id-text {
              font-size: 12px;
              margin-top: 1px;
              color: #000;
              font-weight: 900;
            }
            .welcome {
              text-align: center;
              margin-top: 1px;
              font-size: 12px;
              font-weight: 800;
              color: #000;
            }
            .watermark {
              text-align: left;
              margin-top: 3px;
              padding-top: 2px;
              border-top: 1px solid #000;
              font-size: 9px;
              color: #000;
              font-weight: 800;
              line-height: 1.2;
            }
            @page {
              size: 70mm auto;
              margin: 0;
              padding: 0;
            }
            @media print {
              body {
                margin: 0;
                padding: 0px;
                background: white;
                width: 80mm;
              }
              .receipt {
                width: 80mm;
                margin: 0;
                max-width: 80mm;
                border: none;
                border-radius: 0;
                padding: 0px;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt"${(language as "fr" | "en" | "ar") === "ar" ? ' dir="rtl"' : ''}>
            <!-- Store Header -->
            <div class="header">
              <div class="store-name">${storeInfo.name}</div>
              <div class="store-info">${storeInfo.address}</div>
              <div class="store-info">${storeInfo.phone}</div>
            </div>

            <!-- Date and Time -->
            <div class="receipt-info">
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].date}: ${currentDate.toLocaleDateString()}</div>
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].time}: ${currentDate.toLocaleTimeString()}</div>
            </div>

            <!-- Client Info -->
            ${clientName ? `<div class="client-info">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].client}: ${clientName}</div>` : ""}

            <div class="divider"></div>

            <!-- Items -->
            <div class="items">
              <div class="items-header">
                <div class="header-item-name">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].item}</div>
                <div class="header-qty">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].qty}</div>
                <div class="header-price">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].price}</div>
                <div class="header-total">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].total}</div>
              </div>
              ${cart
                .map(
                  (item) => `
                <div class="item">
                  <div class="item-name">${item.name.replace(/\n/g, " ")}</div>
                  <div class="item-qty">${item.qty}</div>
                  <div class="item-price">${item.price.toLocaleString()}</div>
                  <div class="item-total">${(item.qty * item.price).toLocaleString()}</div>
                </div>
              `,
                )
                .join("")}
            </div>

            <div class="divider"></div>

            <!-- Totals -->
            <div class="totals">
              <div class="total-row">
                <span>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].subtotal}:</span>
                <span>${total.toLocaleString()} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</span>
              </div>
              ${
                discount > 0
                  ? `
                <div class="total-row">
                  <span>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].discount}:</span>
                  <span>-${discount.toLocaleString()} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</span>
                </div>
              `
                  : ""
              }
              ${
                discount > 0 || (paymentType !== "none" && paymentAmount > 0)
                  ? `
                <div class="total-row">
                  <span>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].finalTotal}:</span>
                  <span>${finalTotal.toLocaleString()} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</span>
                </div>
              `
                  : ""
              }
            </div>

            <!-- Payment Info -->
            ${
              paymentType !== "none" && paymentAmount > 0
                ? `
              <div class="payment-info">
                <div class="divider"></div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].payment} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].type}: ${paymentType === "credit" ? receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].credit : receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].versement}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].amountPaid}: ${paymentAmount.toLocaleString()} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].dueDate}: ${paymentDate ? paymentDate.toLocaleDateString() : "N/A"}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].remaining}: ${(finalTotal - paymentAmount).toLocaleString()} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</div>
              </div>
            `
                : ""
            }

            <!-- Receipt ID with Barcode -->
            <div class="receipt-id">
              ${receiptBarcode ? `
                <div style="text-align: center; margin-bottom: 2px;">
                  <img src="${receiptBarcode}" alt="Receipt Barcode" style="max-width: 100%; height: 80px;" />
                </div>
              ` : ''}
              <div class="receipt-id-text">ID: ${shortReceiptId}</div>
            </div>

            <!-- Welcome Message -->
            <div class="welcome">
              ${footerMessage ? footerMessage : `
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].thankYou}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].comeAgain}</div>
                <div style="margin-top: 1px;">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].appreciate}</div>
              `}
            </div>
            
            <!-- Watermark -->
            <div class="watermark">
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].storeManagement}</div>
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].contact}: 0793420745</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("cashier.receipt", "Receipt")}
      subtitle={t("cashier.receiptPreview", "Preview and print your receipt")}
      icon={<FileText className="w-5 h-5 text-blue-600" />}
      size="lg"
      className="max-w-2xl"
      actions={[
        {
          label: t("cashier.preview", "Preview"),
          onClick: handlePreview,
          variant: "outline",
          icon: <Eye className="w-4 h-4" />,
        },
        {
          label: t("cashier.print", "Print"),
          onClick: handlePrint,
          loading: isPrinting,
          disabled: isPrinting,
          icon: <Printer className="w-4 h-4" />,
        },
      ]}
    >
      <div className="overflow-y-auto max-h-[70vh]">
        <div className="font-mono text-sm bg-muted rounded-lg p-6 border border-border" dir={receiptLanguage === "ar" ? "rtl" : "ltr"}>
          {/* Store Header */}
          <div className="text-center mb-4">
            <div className="font-bold text-lg">{storeInfo.name}</div>
            <div className="text-xs text-muted-foreground">
              {storeInfo.address}
            </div>
            <div className="text-xs text-muted-foreground">
              {storeInfo.phone}
            </div>
          </div>

          {/* Date and Time */}
          <div className="mb-4">
            <div>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].date}: {currentDate.toLocaleDateString()}</div>
            <div>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].time}: {currentDate.toLocaleTimeString()}</div>
          </div>

          {/* Client Info */}
          {clientName && (
            <div className="mb-4">
              <div>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].client}: {clientName}</div>
            </div>
          )}

          <div className="border-t border-black dark:border-white my-2" />

          {/* Items */}
          <div className="mb-4">
            {/* Items Header */}
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-black dark:border-white">
              <span className="flex-1 mr-2 text-xs font-bold">{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].item}</span>
              <span className="w-5 text-center text-xs font-bold mr-3">
                {receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].qty}
              </span>
              <span className="w-9 text-right text-xs font-bold mr-2">
                {receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].price}
              </span>
              <span className="w-12 text-right text-xs font-bold">{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].total}</span>
            </div>
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-start mb-1 min-h-[14px]"
              >
                <span className="flex-1 mr-2 text-xs break-words leading-tight">
                  {item.name}
                </span>
                <span className="w-5 text-center font-bold text-xs mr-3 flex-shrink-0">
                  {item.qty}
                </span>
                <span className="w-9 text-right text-xs mr-2 flex-shrink-0">
                  {item.price.toLocaleString()}
                </span>
                <span className="w-12 text-right font-bold text-xs flex-shrink-0">
                  {(item.qty * item.price).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-black dark:border-white my-2" />

          {/* Totals */}
          <div className="font-bold mb-2">
            <div className="flex justify-between mb-1">
              <span>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].subtotal}:</span>
              <span>
                {total.toLocaleString()} {receiptTranslations[receiptLanguage].currency}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between mb-1">
                <span>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].discount}:</span>
                <span>
                  -{discount.toLocaleString()} {receiptTranslations[receiptLanguage].currency}
                </span>
              </div>
            )}
            {(discount > 0 ||
              (paymentType !== "none" && paymentAmount > 0)) && (
              <div className="flex justify-between">
                <span>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].finalTotal}:</span>
                <span>
                  {finalTotal.toLocaleString()} {receiptTranslations[receiptLanguage].currency}
                </span>
              </div>
            )}
          </div>

          {/* Payment Info */}
          {paymentType !== "none" && paymentAmount > 0 && (
            <>
              <div className="border-t border-black dark:border-white my-2" />
              <div className="text-xs space-y-1">
                <div>
                  {receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].payment} {receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].type}:{" "}
                  {paymentType === "credit" ? receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].credit : receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].versement}
                </div>
                <div>
                  {receiptTranslations[receiptLanguage].amountPaid}: {paymentAmount.toLocaleString()}{" "}
                  {receiptTranslations[receiptLanguage].currency}
                </div>
                <div>
                  {receiptTranslations[receiptLanguage].dueDate}:{" "}
                  {paymentDate ? paymentDate.toLocaleDateString() : "N/A"}
                </div>
                <div>
                  {receiptTranslations[receiptLanguage].remaining}: {(finalTotal - paymentAmount).toLocaleString()}{" "}
                  {receiptTranslations[receiptLanguage].currency}
                </div>
              </div>
            </>
          )}

          {/* Receipt ID with Barcode */}
          <div className="border-t border-black dark:border-white my-1" />
          <div className="text-center my-2 flex flex-col items-center py-1">
            {receiptBarcode && (
              <div className="mb-1">
                <img 
                  src={receiptBarcode} 
                  alt="Receipt Barcode" 
                  className="max-w-[250px] h-[60px] mx-auto"
                />
              </div>
            )}
            <div className="text-xs mt-1">
              ID: {shortReceiptId}
            </div>
          </div>

          {/* Welcome Message */}
          <div className="border-t border-black dark:border-white my-1" />
          <div className="text-center text-sm font-bold mt-1">
            {footerMessage ? (
              <div>{footerMessage}</div>
            ) : (
              <>
                <div>Thank you for your purchase!</div>
                <div>Please come again</div>
                <div className="mt-1">We appreciate your business</div>
              </>
            )}
          </div>
          
          {/* Watermark */}
          <div className="border-t border-dashed border-black my-1" />
          <div className="text-center text-[8px] text-black mt-1 font-bold leading-tight">
            <div>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].storeManagement}</div>
            <div>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].contact}: 0793420745</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
