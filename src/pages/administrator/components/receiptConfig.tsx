import React, { useEffect, useState } from "react";
import { Input } from "../../../lib/components/input";
import { Button } from "../../../lib/components/button";
import { Checkbox } from "../../../lib/components/checkbox";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../lib/contexts/toastContext";
import {
  Shield,
  Loader2,
  AlertCircle,
  Store,
  MapPin,
  Phone,
  MessageSquare,
  Eye,
  Plus,
  X,
  FileText,
  Receipt,
  Image as ImageIcon,
} from "lucide-react";
import { generateReceiptBarcode } from "../../../lib/utils/barcodeVisual";
import { processLogoForReceipt } from "../../../lib/utils/logoProcessor";

export const ReceiptConfig: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [footerMessage, setFooterMessage] = useState("");
  const [serviceTicketFooterMessage, setServiceTicketFooterMessage] = useState("");
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [logoNeedsInversion, setLogoNeedsInversion] = useState(false);
  const [logoSize, setLogoSize] = useState<number>(100); // Logo size percentage (50-150%)
  const [processingLogo, setProcessingLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<"receipt" | "serviceTicket">("receipt");
  const [previewOptions, setPreviewOptions] = useState({
    showDiscount: true,
    showCredit: true,
    showVersement: false,
    showClient: true,
    showInformation: false,
  });
  const [receiptLanguage, setReceiptLanguage] = useState<"fr" | "en" | "ar">("fr");

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
      contact: "Contact",
      systemDevelopedBy: "Ce système est développé par REDA TECH",
      imei: "IMEI",
      condition: "État",
      problemsReplacedParts: "Problèmes/Pièces remplacées",
      specifications: "Spécifications",
      ticketTitle: "BON DU SERVICE",
      serviceName: "Service",
      serviceType: "Type",
      deviceName: "Nom de l'appareil",
      problems: "Problèmes/Pannes",
      servicePrice: "Prix du service",
      payed: "Payé",
      notPayed: "Non Payé",
      ticketId: "ID du ticket",
      serviceTicketThankYou: "Merci de nous avoir choisis",
      serviceTicketComeAgain: "Revenez nous voir"
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
      contact: "Contact",
      systemDevelopedBy: "This System is developed by REDA TECH",
      imei: "IMEI",
      condition: "Condition",
      problemsReplacedParts: "Problems/Replaced Parts",
      specifications: "Specifications",
      ticketTitle: "SERVICE TICKET",
      serviceName: "Service",
      serviceType: "Type",
      deviceName: "Device Name",
      problems: "Problems/Breakdowns",
      servicePrice: "Service Price",
      payed: "Payed",
      notPayed: "Not Payed",
      ticketId: "Ticket ID",
      serviceTicketThankYou: "Thank you for choosing us",
      serviceTicketComeAgain: "See you soon"
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
      contact: "الاتصال",
      systemDevelopedBy: "تم تطوير هذا النظام بواسطة REDA TECH",
      imei: "IMEI",
      condition: "الحالة",
      problemsReplacedParts: "المشاكل/الأجزاء المستبدلة",
      specifications: "المواصفات",
      ticketTitle: "تذكرة الخدمة",
      serviceName: "الخدمة",
      serviceType: "النوع",
      deviceName: "اسم الجهاز",
      problems: "المشاكل/الأعطال",
      servicePrice: "سعر الخدمة",
      payed: "مدفوع",
      notPayed: "غير مدفوع",
      ticketId: "معرف التذكرة",
      serviceTicketThankYou: "شكراً لاختيارك لنا",
      serviceTicketComeAgain: "نراك قريباً"
    }
  };

  // Generate category info sections for preview
  const generateCategoryInfoSections = (cart: any[], lang: string): string => {
    if (!previewOptions.showInformation) return "";
    
    const sections: string[] = [];
    
    cart.forEach((item) => {
      if (item.categoryInfo && item.categoryInfo.length > 0) {
        item.categoryInfo.forEach((unitInfo: any, unitIndex: number) => {
          const productName = item.qty > 1 ? `${item.name.replace(/\n/g, " ")} #${unitIndex + 1}` : item.name.replace(/\n/g, " ");
          const infoFields: string[] = [];
          let warrantyFields = "";
          
          if (unitInfo.imeiSerialNumber) {
            infoFields.push(`
              <div class="category-info-field">
                <span class="category-info-label">${receiptTranslations[lang as "fr" | "en" | "ar"].imei}:</span>
                <span class="category-info-value">${unitInfo.imeiSerialNumber}</span>
              </div>
            `);
          }
          
          if (unitInfo.usedNew) {
            const conditionText = unitInfo.usedNew === "new" 
              ? (lang === "fr" ? "Neuf" : lang === "ar" ? "جديد" : "New")
              : (lang === "fr" ? "Occasion" : lang === "ar" ? "مستعمل" : "Used");
            infoFields.push(`
              <div class="category-info-field">
                <span class="category-info-label">${receiptTranslations[lang as "fr" | "en" | "ar"].condition}:</span>
                <span class="category-info-value">${conditionText}</span>
              </div>
            `);
          }
          
          if (unitInfo.problemsReplacedParts) {
            const problemsText = unitInfo.problemsReplacedParts.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0).join('<br>');
            infoFields.push(`
              <div class="category-info-field category-info-field-multiline">
                <span class="category-info-label">${receiptTranslations[lang as "fr" | "en" | "ar"].problemsReplacedParts}:</span>
                <div class="category-info-value">${problemsText}</div>
              </div>
            `);
          }
          
          if (unitInfo.specifications) {
            const specsText = unitInfo.specifications.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0).join('<br>');
            infoFields.push(`
              <div class="category-info-field category-info-field-multiline">
                <span class="category-info-label">${receiptTranslations[lang as "fr" | "en" | "ar"].specifications}:</span>
                <div class="category-info-value">${specsText}</div>
              </div>
            `);
          }
          
          if (unitInfo.warranty) {
            try {
              const warrantyDate = new Date(unitInfo.warranty);
              const warrantyTitle = lang === "fr" ? "Garantie" : lang === "ar" ? "الضمان" : "Warranty";
              const expiresLabel = lang === "fr" ? "Expiré le" : lang === "ar" ? "تنتهي في" : "Expires";
              
              warrantyFields = `
                <div class="category-info-section-title">${warrantyTitle}</div>
                <div class="category-info-fields-container">
                  <div class="category-info-field">
                    <span class="category-info-label">${expiresLabel}:</span>
                    <span class="category-info-value">${warrantyDate.toLocaleDateString()}</span>
                  </div>
                </div>
              `;
            } catch {
              // Invalid date, skip
            }
          }
          
          if (infoFields.length > 0 || warrantyFields) {
            const infoTitle = lang === "fr" ? "Informations" : lang === "ar" ? "المعلومات" : "Information";
            
            sections.push(`
              <div class="category-info-section">
                <div class="divider"></div>
                <div class="category-info-product-name">${productName}</div>
                ${infoFields.length > 0 ? `
                  <div class="category-info-section-title">${infoTitle}</div>
                  <div class="category-info-fields-container">
                    ${infoFields.join("")}
                  </div>
                ` : ''}
                ${warrantyFields}
              </div>
            `);
          }
        });
      }
    });
    
    return sections.join("");
  };

  // Generate preview receipt
  const generatePreviewReceipt = () => {
    const currentDate = new Date();
    const sampleCart: any[] = [
      { id: "1", name: "Sample Product 1", price: 25.50, qty: 2 },
      { id: "2", name: "Sample Product 2", price: 15.00, qty: 1 },
    ];
    
    // Add category info to first item if showInformation is enabled
    if (previewOptions.showInformation) {
      sampleCart[0].categoryInfo = [
        {
          imeiSerialNumber: "123456789012345",
          usedNew: "new",
          problemsReplacedParts: "Sample problem description\nLine 2 of problems",
          specifications: "Sample specifications\nLine 2 of specs",
          warranty: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    }
    
    const total = sampleCart.reduce((sum, item) => sum + item.qty * item.price, 0);
    const discount = previewOptions.showDiscount ? 10 : 0;
    const finalTotal = total - discount;
    const receiptNumber = "PREVIEW-12345678";
    const shortReceiptId = receiptNumber.substring(0, 8);
    
    // Generate barcode
    const receiptBarcode = generateReceiptBarcode(receiptNumber, {
      format: 'CODE128',
      width: 3,
      height: 80,
      displayValue: false,
      fontSize: 12,
      margin: 10,
    });

    const allPhones = [storePhone, ...phoneNumbers].filter(phone => phone.trim() !== "");
    const phoneDisplay = allPhones.length > 0 
      ? allPhones.map(phone => `${receiptTranslations[receiptLanguage].phone}: ${phone}`).join('<br>')
      : `${receiptTranslations[receiptLanguage].phone}: +1234567890`;

    const storeInfo = {
      name: storeName || "Store Management",
      address: storeAddress ? `${receiptTranslations[receiptLanguage].address}: ${storeAddress}` : `${receiptTranslations[receiptLanguage].address}: Your Store Address`,
      phone: phoneDisplay,
    };

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
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              font-family: 'Courier New', monospace;
              background: #f5f5f5;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            body {
              margin-top: 0 !important;
              padding-top: 0 !important;
            }
            .receipt {
              width: 150mm;
              max-width: 150mm;
              margin: 0 auto;
              background: white;
              border: none;
              border-radius: 0;
              padding: 12px;
              box-shadow: none;
              font-size: 14px;
              overflow: visible;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
              text-rendering: optimizeLegibility;
            }
            .receipt * {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            img, svg {
              image-rendering: auto;
              max-width: 100%;
              height: auto;
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
            /* RTL support for table */
            .receipt[dir="rtl"] .receipt-table {
              direction: rtl;
            }
            .receipt[dir="rtl"] .receipt-table .col-item {
              text-align: right;
            }
            /* Keep numbers and prices LTR */
            .receipt[dir="rtl"] .receipt-table .col-qty,
            .receipt[dir="rtl"] .receipt-table .col-price,
            .receipt[dir="rtl"] .receipt-table .col-total,
            .receipt[dir="rtl"] .receipt-table .total-value {
              direction: ltr;
              text-align: right;
            }
            .header {
              text-align: center;
              margin-bottom: 1px;
              margin-top: 0;
            }
            .store-name {
              font-size: 42px;
              font-weight: 900;
              margin-bottom: 3px;
              margin-top: 0;
              padding-top: 0;
              color: #000000;
              letter-spacing: 1px;
            }
            .store-logo {
              max-width: ${Math.round(300 * (logoSize / 100))}px;
              max-height: ${Math.round(120 * (logoSize / 100))}px;
              width: auto;
              height: auto;
              margin: 0 auto 8px auto;
              display: block;
              filter: grayscale(100%) contrast(300%) brightness(0.3);
              image-rendering: auto;
              image-rendering: -webkit-optimize-contrast;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .store-logo.inverted {
              filter: grayscale(100%) contrast(300%) brightness(0.3) invert(1);
            }
            @media print {
              .store-name {
                text-shadow: none;
                -webkit-font-smoothing: none;
                font-smooth: never;
              }
              .store-logo {
                max-width: ${Math.round(250 * (logoSize / 100))}px;
                max-height: ${Math.round(100 * (logoSize / 100))}px;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
              }
            }
            .store-info {
              font-size: 14px;
              margin-bottom: 4px;
              color: #000;
              font-weight: 900;
              line-height: 1.3;
            }
            .receipt-info {
              font-size: 15px;
              margin-bottom: 8px;
              color: #000;
              font-weight: 900;
            }
            .divider {
              border-top: 2px solid #000000;
              margin: 6px 0;
            }
            .receipt-table {
              width: 100%;
              border-collapse: collapse;
              margin: 6px 0;
              font-size: 15px;
            }
            .receipt-table th,
            .receipt-table td {
              border: 1.5px solid #000000;
              padding: 5px 8px;
              text-align: left;
              vertical-align: top;
              font-weight: 900;
              color: #000000;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .receipt-table th {
              text-align: center;
              font-size: 16px;
              font-weight: 900;
              background-color: #ffffff;
              padding: 6px 8px;
            }
            .receipt-table td {
              font-size: 15px;
              line-height: 1.3;
              padding: 5px 8px;
            }
            .receipt-table .col-item {
              width: auto;
              min-width: 0;
              word-wrap: break-word;
              word-break: break-word;
              overflow-wrap: break-word;
              font-size: 15px;
            }
            .receipt-table .col-qty {
              width: 50px;
              text-align: center;
              font-weight: 900;
              font-size: 16px;
            }
            .receipt-table .col-price {
              width: 80px;
              text-align: right;
              font-weight: 900;
              font-size: 16px;
              white-space: nowrap;
            }
            .receipt-table .col-total {
              width: 80px;
              text-align: right;
              font-weight: 900;
              font-size: 16px;
              white-space: nowrap;
            }
            .receipt-table tbody tr {
              min-height: 16px;
            }
            .receipt-table tbody tr td {
              vertical-align: middle;
            }
            .category-info {
              font-size: 12px;
              line-height: 1.3;
              color: #000;
              margin-top: 3px;
              padding-left: 4px;
            }
            .category-info-item {
              margin-bottom: 1px;
            }
            .category-info-section {
              margin-top: 8px;
              margin-bottom: 8px;
              padding: 4px 0;
            }
            .category-info-section .divider {
              border-top: 2px solid #000000;
              margin: 6px 0 8px 0;
            }
            .category-info-product-name {
              font-weight: 900;
              font-size: 18px;
              margin-bottom: 8px;
              margin-top: 4px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              text-align: center;
            }
            .category-info-fields-container {
              display: block;
              padding-left: 4px;
            }
            .category-info-field {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 6px;
              font-size: 15px;
              line-height: 1.5;
            }
            .category-info-field-multiline {
              margin-bottom: 8px;
              flex-direction: column;
              align-items: flex-start !important;
            }
            .category-info-label {
              font-weight: 700;
              font-size: 16px;
              display: inline-block;
              margin-right: 10px;
            }
            .category-info-value {
              font-weight: 900;
              font-size: 16px;
              color: #000000;
              display: inline-block;
              word-break: break-word;
              text-align: right;
              flex: 1;
              margin-left: auto;
            }
            .category-info-field-multiline .category-info-label {
              display: block;
              margin-bottom: 4px;
              margin-right: 0;
              width: 100%;
              font-size: 16px;
            }
            .category-info-field-multiline .category-info-value {
              display: block;
              padding-left: 8px;
              text-align: left;
              margin-left: 0 !important;
              width: 100%;
              font-size: 16px;
              font-weight: 900;
              color: #000000;
            }
            .category-info-warranty {
              margin-bottom: 8px;
            }
            .category-info-warranty-title {
              font-weight: 700;
              font-size: 12px;
              margin-bottom: 4px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .category-info-section-title {
              font-weight: 700;
              font-size: 16px;
              margin-top: 8px;
              margin-bottom: 6px;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .receipt-table tfoot td {
              font-weight: 900;
              font-size: 16px;
              padding: 6px 8px;
              border-top: 2px solid #000000;
              white-space: nowrap;
            }
            .receipt-table tfoot .total-label {
              text-align: right;
              font-weight: 900;
              font-size: 16px;
              white-space: nowrap;
            }
            .receipt-table tfoot .total-value {
              text-align: right;
              font-weight: 900;
              font-size: 18px;
              white-space: nowrap;
            }
            .receipt-table tfoot .final-total {
              border-top: 2px solid #000000;
              font-size: 19px;
              font-weight: 900;
            }
            .receipt-table tfoot .final-total.total-value {
              font-size: 20px;
              font-weight: 900;
            }
            .payment-info {
              margin-top: 8px;
              font-size: 16px;
              color: #000;
              font-weight: 900;
              line-height: 1.5;
            }
            .payment-info > div {
              margin-bottom: 4px;
            }
            .client-info {
              margin-bottom: 6px;
              font-size: 15px;
              color: #000;
              font-weight: 900;
              line-height: 1.3;
            }
            .receipt-id {
              text-align: center;
              margin: 8px 0 6px 0;
              padding: 6px 0;
              border-top: 2px solid #000000;
            }
            .receipt-id-text {
              font-size: 15px;
              margin-top: 4px;
              color: #000;
              font-weight: 900;
            }
            .welcome {
              text-align: center;
              margin-top: 8px;
              font-size: 16px;
              font-weight: 900;
              color: #000;
              line-height: 1.5;
            }
            .watermark {
              text-align: left;
              margin-top: 8px;
              padding-top: 6px;
              border-top: 2px solid #000000;
              font-size: 13px;
              color: #000;
              font-weight: 900;
              line-height: 1.3;
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
                width: 79mm;
              }
              .receipt {
                width: 79mm;
                margin: 0;
                max-width: 79mm;
                border: none;
                border-radius: 0;
                padding: 2px 3px 0px 0px;
                box-shadow: none;
                font-size: 12px;
              }
              .store-name {
                font-size: 36px;
              }
              .store-info {
                font-size: 11px;
              }
              .receipt-info {
                font-size: 12px;
              }
              .receipt-table {
                font-size: 12px;
              }
              .receipt-table th {
                font-size: 12px;
                padding: 3px 3px;
              }
              .receipt-table td {
                font-size: 11px;
                padding: 2px 3px;
              }
              .receipt-table .col-item {
                font-size: 12px;
              }
              .receipt-table .col-qty {
                font-size: 14px;
                width: 28px;
              }
              .receipt-table .col-price {
                font-size: 14px;
                width: 52px;
              }
              .receipt-table .col-total {
                font-size: 14px;
                width: 52px;
              }
              .receipt-table tfoot td {
                font-size: 13px;
                padding: 3px 3px;
              }
              .receipt-table tfoot .total-label {
                font-size: 13px;
              }
              .receipt-table tfoot .total-value {
                font-size: 14px;
              }
              .receipt-table tfoot .final-total {
                font-size: 15px;
              }
              .receipt-table tfoot .final-total.total-value {
                font-size: 16px;
              }
              .category-info {
                font-size: 9px;
              }
              .category-info-field {
                font-size: 12px;
              }
              .category-info-label {
                font-size: 13px;
              }
              .category-info-value {
                font-size: 13px;
              }
              .category-info-field-multiline .category-info-label {
                font-size: 13px;
              }
              .category-info-field-multiline .category-info-value {
                font-size: 13px;
              }
              .category-info-product-name {
                font-size: 14px;
              }
              .category-info-section-title {
                font-size: 12px;
              }
              .payment-info {
                font-size: 13px;
              }
              .client-info {
                font-size: 11px;
              }
              .receipt-id-text {
                font-size: 11px;
              }
              .welcome {
                font-size: 11px;
              }
              .watermark {
                font-size: 9px;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt"${receiptLanguage === "ar" ? ' dir="rtl"' : ''}>
            <!-- Store Header -->
            <div class="header">
              ${storeLogo ? `
                <img src="${storeLogo}" alt="Store Logo" class="store-logo${logoNeedsInversion ? ' inverted' : ''}" />
              ` : `
                <div class="store-name">${storeInfo.name}</div>
              `}
              <div class="store-info">${storeInfo.address}</div>
              <div class="store-info">${storeInfo.phone}</div>
            </div>

            <!-- Date and Time -->
            <div class="receipt-info">
              <div>${receiptTranslations[receiptLanguage].date}: ${currentDate.toLocaleDateString()}</div>
              <div>${receiptTranslations[receiptLanguage].time}: ${currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            <!-- Client Info -->
            ${previewOptions.showClient ? `<div class="client-info">${receiptTranslations[receiptLanguage].client}: Sample Customer</div>` : ""}

            <div class="divider"></div>

            <!-- Items Table -->
            <table class="receipt-table">
              <thead>
                <tr>
                  <th class="col-item">${receiptTranslations[receiptLanguage].item}</th>
                  <th class="col-qty">${receiptTranslations[receiptLanguage].qty}</th>
                  <th class="col-price">${receiptTranslations[receiptLanguage].price}</th>
                  <th class="col-total">${receiptTranslations[receiptLanguage].total}</th>
                </tr>
              </thead>
              <tbody>
                ${sampleCart
                  .flatMap((item) => {
                    // If item has categoryInfo, expand by quantity
                    if (item.categoryInfo && item.categoryInfo.length > 0) {
                      return Array.from({ length: item.qty }, (_, unitIndex) => {
                        return `
                          <tr>
                            <td class="col-item">
                              ${item.qty > 1 ? `${item.name.replace(/\n/g, " ")} #${unitIndex + 1}` : item.name.replace(/\n/g, " ")}
                            </td>
                            <td class="col-qty">1</td>
                            <td class="col-price">${item.price.toLocaleString()}</td>
                            <td class="col-total">${item.price.toLocaleString()}</td>
                          </tr>
                        `;
                      });
                    }
                    // No categoryInfo, show as single row
                    return `
                      <tr>
                        <td class="col-item">${item.name.replace(/\n/g, " ")}</td>
                        <td class="col-qty">${item.qty}</td>
                        <td class="col-price">${item.price.toLocaleString()}</td>
                        <td class="col-total">${(item.qty * item.price).toLocaleString()}</td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
              <tfoot>
                ${
                  discount > 0
                    ? `
                  <tr>
                    <td colspan="3" class="total-label">${receiptTranslations[receiptLanguage].subtotal}:</td>
                    <td class="total-value">${total.toLocaleString()}${receiptTranslations[receiptLanguage].currency}</td>
                  </tr>
                  <tr>
                    <td colspan="3" class="total-label">${receiptTranslations[receiptLanguage].discount}:</td>
                    <td class="total-value">-${discount.toLocaleString()}${receiptTranslations[receiptLanguage].currency}</td>
                  </tr>
                  <tr>
                    <td colspan="3" class="total-label final-total">${receiptTranslations[receiptLanguage].finalTotal}:</td>
                    <td class="total-value final-total">${finalTotal.toLocaleString()}${receiptTranslations[receiptLanguage].currency}</td>
                  </tr>
                `
                    : `
                  <tr>
                    <td colspan="3" class="total-label final-total">${receiptTranslations[receiptLanguage].finalTotal}:</td>
                    <td class="total-value final-total">${finalTotal.toLocaleString()}${receiptTranslations[receiptLanguage].currency}</td>
                  </tr>
                `
                }
              </tfoot>
            </table>

            <!-- Category Information Sections -->
            ${generateCategoryInfoSections(sampleCart, receiptLanguage)}

            <!-- Payment Info -->
            ${
              (previewOptions.showCredit || previewOptions.showVersement)
                ? `
              <div class="payment-info">
                <div class="divider"></div>
                <div>${receiptTranslations[receiptLanguage].payment} ${receiptTranslations[receiptLanguage].type}: ${previewOptions.showCredit ? receiptTranslations[receiptLanguage].credit : receiptTranslations[receiptLanguage].versement}</div>
                <div>${receiptTranslations[receiptLanguage].amountPaid}: 30.00 ${receiptTranslations[receiptLanguage].currency}</div>
                <div>${receiptTranslations[receiptLanguage].dueDate}: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                <div>${receiptTranslations[receiptLanguage].remaining}: ${(finalTotal - 30).toLocaleString()} ${receiptTranslations[receiptLanguage].currency}</div>
              </div>
            `
                : ""
            }

            <!-- Receipt ID with Barcode -->
            <div class="receipt-id">
              ${receiptBarcode ? `
                <div style="text-align: center; margin-bottom: 12px;">
                  <img src="${receiptBarcode}" alt="Receipt Barcode" style="max-width: 100%; height: 90px; image-rendering: auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact;" />
                </div>
              ` : ''}
              <div class="receipt-id-text">ID: ${shortReceiptId}</div>
            </div>

            <!-- Welcome Message -->
            <div class="welcome">
              ${footerMessage ? footerMessage.split('\n').map(line => `<div>${line}</div>`).join('') : `
                <div>${receiptTranslations[receiptLanguage].thankYou}</div>
                <div>${receiptTranslations[receiptLanguage].comeAgain}</div>
                <div style="margin-top: 1px;">${receiptTranslations[receiptLanguage].appreciate}</div>
              `}
            </div>
            
            <!-- Watermark -->
            <div class="watermark">
              <div>${receiptTranslations[receiptLanguage].systemDevelopedBy}</div>
              <div>${receiptTranslations[receiptLanguage].contact}: 0793420745</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // Generate service ticket preview
  const generateServiceTicketPreview = () => {
    const currentDate = new Date();
    const serviceNumber = "PREVIEW-12345678";
    const shortServiceId = serviceNumber.substring(0, 8);
    
    // Generate barcode
    const serviceBarcode = generateReceiptBarcode(serviceNumber, {
      format: 'CODE128',
      width: 3,
      height: 80,
      displayValue: false,
      fontSize: 12,
      margin: 10,
    });

    const allPhones = [storePhone, ...phoneNumbers].filter(phone => phone.trim() !== "");
    const phoneDisplay = allPhones.length > 0 
      ? allPhones.map(phone => `${receiptTranslations[receiptLanguage].phone}: ${phone}`).join('<br>')
      : `${receiptTranslations[receiptLanguage].phone}: +1234567890`;

    const storeInfo = {
      name: storeName || "Store Management",
      address: storeAddress ? `${receiptTranslations[receiptLanguage].address}: ${storeAddress}` : `${receiptTranslations[receiptLanguage].address}: Your Store Address`,
      phone: phoneDisplay,
    };

    // Sample service data
    const sampleService = {
      name: "Sample Service Name",
      type: "Repair",
      deviceName: "Sample Device Model",
      problems: "Sample problem description\nLine 2 of problems",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      price: 150.00,
      isPaid: false,
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Service Ticket Preview</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              font-family: 'Courier New', monospace;
              background: #f5f5f5;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            body {
              margin-top: 0 !important;
              padding-top: 0 !important;
            }
            .receipt {
              width: 150mm;
              max-width: 150mm;
              margin: 0 auto;
              background: white;
              border: none;
              border-radius: 0;
              padding: 12px;
              box-shadow: none;
              font-size: 14px;
              overflow: visible;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
              text-rendering: optimizeLegibility;
            }
            .receipt * {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            img, svg {
              image-rendering: auto;
              max-width: 100%;
              height: auto;
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
            .receipt[dir="rtl"] .service-field-label {
              text-align: right;
            }
            .receipt[dir="rtl"] .service-field-value {
              text-align: right;
            }
            .receipt[dir="rtl"] .service-field-multiline .service-field-value {
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
            .header {
              text-align: center;
              margin-bottom: 1px;
              margin-top: 0;
            }
            .store-name {
              font-size: 42px;
              font-weight: 900;
              margin-bottom: 3px;
              margin-top: 0;
              padding-top: 0;
              color: #000000;
              letter-spacing: 1px;
            }
            .store-logo {
              max-width: ${Math.round(300 * (logoSize / 100))}px;
              max-height: ${Math.round(120 * (logoSize / 100))}px;
              width: auto;
              height: auto;
              margin: 0 auto 8px auto;
              display: block;
              filter: grayscale(100%) contrast(300%) brightness(0.3);
              image-rendering: auto;
              image-rendering: -webkit-optimize-contrast;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .store-logo.inverted {
              filter: grayscale(100%) contrast(300%) brightness(0.3) invert(1);
            }
            @media print {
              .store-name {
                text-shadow: none;
                -webkit-font-smoothing: none;
                font-smooth: never;
              }
              .store-logo {
                max-width: ${Math.round(250 * (logoSize / 100))}px;
                max-height: ${Math.round(100 * (logoSize / 100))}px;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
              }
            }
            .store-info {
              font-size: 14px;
              margin-bottom: 4px;
              color: #000;
              font-weight: 900;
              line-height: 1.3;
            }
            .receipt-info {
              font-size: 15px;
              margin-bottom: 8px;
              color: #000;
              font-weight: 900;
            }
            .divider {
              border-top: 2px solid #000000;
              margin: 6px 0;
            }
            .ticket-title {
              text-align: center;
              font-size: 24px;
              font-weight: 900;
              margin: 12px 0;
              color: #000;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .service-info {
              margin: 12px 0;
              color: #000;
            }
            .service-field {
              margin-bottom: 12px;
              display: flex;
              width: 100%;
              justify-content: space-between;
              align-items: flex-start;
            }
            .service-field-label {
              font-weight: 900;
              font-size: 18px;
              color: #000;
              padding-right: 12px;
              flex-shrink: 0;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .service-field-label.service-name-label,
            .service-field-label.service-type-label {
              font-size: 18px;
              font-weight: 900;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .service-field-value {
              font-weight: 900;
              text-align: left;
              font-size: 20px;
              color: #000000;
              margin-left: 12px;
              display: block;
              flex: 1;
              min-width: 0;
              word-wrap: normal;
              word-break: normal;
              overflow-wrap: normal;
              white-space: normal;
              line-height: 1.4;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .service-field-multiline {
              margin-bottom: 12px;
              align-items: flex-start;
            }
            .service-field-multiline .service-field-label {
              font-weight: 900;
              font-size: 18px;
              color: #000;
              padding-right: 12px;
              flex-shrink: 0;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .service-field-multiline .service-field-value {
              font-weight: 900;
              text-align: left;
              font-size: 20px;
              color: #000000;
              margin-left: 12px;
              display: block;
              flex: 1;
              min-width: 0;
              word-wrap: normal;
              word-break: normal;
              overflow-wrap: normal;
              white-space: normal;
              line-height: 1.4;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .service-field-problems {
              display: block;
            }
            .service-field-problems .service-field-label {
              display: block;
              margin-bottom: 10px;
              width: 100%;
              font-weight: 900;
              font-size: 18px;
              color: #000;
            }
            .service-field-problems .service-field-value {
              display: block;
              padding-left: 24px;
              text-align: left;
              margin-left: 0;
            }
            .client-info {
              margin-bottom: 6px;
              font-size: 15px;
              color: #000;
              font-weight: 900;
              line-height: 1.3;
            }
            .receipt-id {
              text-align: center;
              margin: 8px 0 6px 0;
              padding: 6px 0;
              border-top: 2px solid #000000;
            }
            .receipt-id-text {
              font-size: 15px;
              margin-top: 4px;
              color: #000;
              font-weight: 900;
            }
            .welcome {
              text-align: center;
              margin-top: 8px;
              font-size: 16px;
              font-weight: 900;
              color: #000;
              line-height: 1.5;
            }
            .watermark {
              text-align: left;
              margin-top: 8px;
              padding-top: 6px;
              border-top: 2px solid #000000;
              font-size: 13px;
              color: #000;
              font-weight: 900;
              line-height: 1.3;
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
                width: 79mm;
              }
              .receipt {
                width: 79mm;
                margin: 0;
                max-width: 79mm;
                border: none;
                border-radius: 0;
                padding: 2px 3px 0px 0px;
                box-shadow: none;
                font-size: 12px;
              }
              .store-name {
                font-size: 36px;
              }
              .store-info {
                font-size: 11px;
              }
              .receipt-info {
                font-size: 11px;
              }
              .ticket-title {
                font-size: 18px;
              }
              .service-field-label {
                font-size: 15px;
              }
              .service-field-value {
                font-size: 16px;
              }
              .service-field-multiline .service-field-label {
                font-size: 15px;
              }
              .service-field-multiline .service-field-value {
                font-size: 16px;
              }
              .service-field-problems .service-field-label {
                font-size: 15px;
              }
              .client-info {
                font-size: 11px;
              }
              .receipt-id-text {
                font-size: 11px;
              }
              .welcome {
                font-size: 11px;
              }
              .watermark {
                font-size: 9px;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt"${receiptLanguage === "ar" ? ' dir="rtl"' : ''}>
            <!-- Store Header -->
            <div class="header">
              ${storeLogo ? `
                <img src="${storeLogo}" alt="Store Logo" class="store-logo${logoNeedsInversion ? ' inverted' : ''}" />
              ` : `
                <div class="store-name">${storeInfo.name}</div>
              `}
              <div class="store-info">${storeInfo.address}</div>
              <div class="store-info">${storeInfo.phone}</div>
            </div>

            <!-- Date and Time -->
            <div class="receipt-info">
              <div>${receiptTranslations[receiptLanguage].date}: ${currentDate.toLocaleDateString()}</div>
              <div>${receiptTranslations[receiptLanguage].time}: ${currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            <!-- Client Info -->
            ${previewOptions.showClient ? `<div class="client-info">${receiptTranslations[receiptLanguage].client}: Sample Customer</div>` : ""}

            <div class="divider"></div>

            <!-- Ticket Title -->
            <div class="ticket-title">${receiptTranslations[receiptLanguage].ticketTitle}</div>

            <div class="divider"></div>

            <!-- Service Information -->
            <div class="service-info">
              <div class="service-field">
                <span class="service-field-label service-name-label">${receiptTranslations[receiptLanguage].serviceName}:</span>
                <span class="service-field-value">${sampleService.name}</span>
              </div>
              <div class="service-field">
                <span class="service-field-label service-type-label">${receiptTranslations[receiptLanguage].serviceType}:</span>
                <span class="service-field-value">${sampleService.type}</span>
              </div>
              <div class="service-field service-field-multiline">
                <span class="service-field-label">${receiptTranslations[receiptLanguage].deviceName}:</span>
                <span class="service-field-value">${sampleService.deviceName}</span>
              </div>
              <div class="service-field service-field-multiline service-field-problems">
                <span class="service-field-label">${receiptTranslations[receiptLanguage].problems}:</span>
                <span class="service-field-value">${sampleService.problems}</span>
              </div>
              <div class="service-field">
                <span class="service-field-label">${receiptTranslations[receiptLanguage].dueDate}:</span>
                <span class="service-field-value">${sampleService.dueDate.toLocaleDateString()}</span>
              </div>
              <div class="service-field">
                <span class="service-field-label">${receiptTranslations[receiptLanguage].servicePrice}:</span>
                <span class="service-field-value">${sampleService.price.toLocaleString()} ${receiptTranslations[receiptLanguage].currency} ${sampleService.isPaid ? `(${receiptTranslations[receiptLanguage].payed})` : `(${receiptTranslations[receiptLanguage].notPayed})`}</span>
              </div>
            </div>

            <div class="divider"></div>

            <!-- Service ID with Barcode -->
            <div class="receipt-id">
              ${serviceBarcode ? `
                <div style="text-align: center; margin-bottom: 12px;">
                  <img src="${serviceBarcode}" alt="Service Barcode" style="max-width: 100%; height: 90px; image-rendering: auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact;" />
                </div>
              ` : ''}
              <div class="receipt-id-text">${receiptTranslations[receiptLanguage].ticketId}: ${shortServiceId}</div>
            </div>

            <!-- Welcome Message -->
            <div class="welcome">
              ${serviceTicketFooterMessage ? serviceTicketFooterMessage.split('\n').map(line => `<div>${line}</div>`).join('') : `
                <div>${receiptTranslations[receiptLanguage].serviceTicketThankYou}</div>
                <div>${receiptTranslations[receiptLanguage].serviceTicketComeAgain}</div>
              `}
            </div>
            
            <!-- Watermark -->
            <div class="watermark">
              <div>${receiptTranslations[receiptLanguage].systemDevelopedBy}</div>
              <div>${receiptTranslations[receiptLanguage].contact}: 0793420745</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // Update preview when form values change
  useEffect(() => {
    if (!loading) {
      if (previewMode === "receipt") {
        setPreviewReceipt(generatePreviewReceipt());
      } else {
        setPreviewReceipt(generateServiceTicketPreview());
      }
    }
  }, [storeName, storeAddress, storePhone, phoneNumbers, footerMessage, serviceTicketFooterMessage, storeLogo, logoNeedsInversion, logoSize, loading, previewOptions, receiptLanguage, previewMode]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      window.api.database.options.get("storeName"),
      window.api.database.options.get("storeAddress"),
      window.api.database.options.get("storePhone"),
      window.api.database.options.get("storePhoneNumbers"),
      window.api.database.options.get("receiptFooterMessage"),
      window.api.database.options.get("serviceTicketFooterMessage"),
      window.api.database.options.get("receiptLanguage"),
      window.api.database.options.get("storeLogo"),
      window.api.database.options.get("logoNeedsInversion"),
      window.api.database.options.get("logoSize"),
    ])
      .then(([name, address, phone, phones, footer, serviceFooter, language, logo, needsInversion, size]) => {
        setStoreName(name || "");
        setStoreAddress(address || "");
        setStorePhone(phone || "");
        setPhoneNumbers(phones ? JSON.parse(phones) : []);
        setFooterMessage(footer || "");
        setServiceTicketFooterMessage(serviceFooter || "");
        setReceiptLanguage((language as "fr" | "en" | "ar") || "fr");
        setStoreLogo(logo || null);
        setLogoNeedsInversion(needsInversion === "true");
        setLogoSize(size ? parseInt(size) : 100);
        setLoading(false);
      })
      .catch(() => {
        showToast(t("admin.loadError", "Failed to load receipt settings"), "error");
        setLoading(false);
      });
  }, []);

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, ""]);
  };

  const removePhoneNumber = (index: number) => {
    setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
  };

  const updatePhoneNumber = (index: number, value: string) => {
    const updated = [...phoneNumbers];
    updated[index] = value;
    setPhoneNumbers(updated);
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast(t("admin.invalidImageFile", "Please select a valid image file"), "error");
      return;
    }

    setProcessingLogo(true);
    try {
      // Read file as data URL
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const originalDataUrl = e.target?.result as string;
          console.log("Starting logo processing...");
          // Process logo for receipt (ultra-high quality processing)
          const result = await processLogoForReceipt(originalDataUrl);
          console.log("Logo processing complete. Saving to database...");
          setStoreLogo(result.dataUrl);
          setLogoNeedsInversion(result.needsInversion);
          showToast(t("admin.logoProcessed", "Logo processed and ready for printing"), "success");
        } catch (error) {
          showToast(t("admin.logoProcessError", "Failed to process logo"), "error");
        } finally {
          setProcessingLogo(false);
        }
      };
      reader.onerror = () => {
        showToast(t("admin.logoReadError", "Failed to read logo file"), "error");
        setProcessingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showToast(t("admin.logoUploadError", "Failed to upload logo"), "error");
      setProcessingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setStoreLogo(null);
    setLogoNeedsInversion(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        window.api.database.options.set("storeName", storeName),
        window.api.database.options.set("storeAddress", storeAddress),
        window.api.database.options.set("storePhone", storePhone),
        window.api.database.options.set("storePhoneNumbers", JSON.stringify(phoneNumbers)),
        window.api.database.options.set("receiptFooterMessage", footerMessage),
        window.api.database.options.set("serviceTicketFooterMessage", serviceTicketFooterMessage),
        window.api.database.options.set("receiptLanguage", receiptLanguage),
        window.api.database.options.set("storeLogo", storeLogo || ""),
        window.api.database.options.set("logoNeedsInversion", logoNeedsInversion ? "true" : "false"),
        window.api.database.options.set("logoSize", logoSize.toString()),
      ]);
      showToast(t("admin.receiptSaved", "Receipt settings saved successfully!"), "success");
    } catch {
      showToast(t("admin.receiptSaveError", "Failed to save receipt settings"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left Side - Configuration Form */}
      <section className="w-3/5 bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-orange-500" />
          <h1 className="text-2xl font-bold">
            {t("admin.receiptConfig", "Receipt Configuration")}
          </h1>
        </div>

        {/* Language Selection */}
        <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <label className="block text-base font-semibold">
                {t("admin.receiptLanguage", "Receipt Language")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t("admin.chooseReceiptLanguage", "Choose the language for receipt printing")}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setReceiptLanguage("fr")}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                receiptLanguage === "fr"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {t("admin.french", "Français")}
            </button>
            <button
              type="button"
              onClick={() => setReceiptLanguage("en")}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                receiptLanguage === "en"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {t("admin.english", "English")}
            </button>
            <button
              type="button"
              onClick={() => setReceiptLanguage("ar")}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                receiptLanguage === "ar"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {t("admin.arabic", "العربية")}
            </button>
          </div>
        </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Grid Layout for Store Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Store Name Setting */}
          <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <label
                  className="block text-base font-semibold"
                  htmlFor="storeName"
                >
                  {t("admin.storeName", "Store Name")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "admin.storeNameDesc",
                    "The name that appears at the top of receipts (if no logo is uploaded)"
                  )}
                </p>
              </div>
            </div>
            <Input
              id="storeName"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full text-lg"
              placeholder={t("admin.storeNamePlaceholder", "Enter store name")}
              disabled={loading || saving}
              aria-label={t("admin.storeName", "Store Name")}
            />
          </div>

          {/* Store Logo Setting */}
          <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <label className="block text-base font-semibold">
                  {t("admin.storeLogo", "Store Logo")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "admin.storeLogoDesc",
                    "Upload logo to display on receipts (will be converted to black/white)"
                  )}
                </p>
              </div>
            </div>
            
            {storeLogo ? (
              <div className="space-y-3">
                <div className="relative border border-border rounded-lg p-4 bg-background">
                  <img 
                    src={storeLogo} 
                    alt="Store Logo Preview" 
                    className="max-w-full max-h-32 mx-auto block"
                  />
                </div>
                
                {/* Logo Size Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {t("admin.logoSize", "Logo Size")}
                    </label>
                    <span className="text-sm text-muted-foreground font-mono">
                      {logoSize}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="5"
                    value={logoSize}
                    onChange={(e) => setLogoSize(parseInt(e.target.value))}
                    disabled={loading || saving || processingLogo}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>50%</span>
                    <span>100%</span>
                    <span>150%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.logoSizeDesc", "Adjust the logo size on printed receipts and tickets")}
                  </p>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveLogo}
                  disabled={loading || saving || processingLogo}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("admin.removeLogo", "Remove Logo")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleLogoUpload(file);
                    }
                  }}
                  disabled={loading || saving || processingLogo}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    processingLogo || loading || saving
                      ? "border-muted bg-muted cursor-not-allowed"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {processingLogo ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t("admin.processingLogo", "Processing logo...")}
                      </p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground text-center px-4">
                        <span className="font-semibold text-foreground">
                          {t("admin.clickToUpload", "Click to upload")}
                        </span>{" "}
                        {t("admin.orDragDrop", "or drag and drop")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("admin.logoFormatHint", "PNG, JPG, GIF (will be converted to black/white)")}
                      </p>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* Store Address Setting */}
          <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <label
                  className="block text-base font-semibold"
                  htmlFor="storeAddress"
                >
                  {t("admin.storeAddress", "Store Address")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "admin.storeAddressDesc",
                    "The address that appears on receipts"
                  )}
                </p>
              </div>
            </div>
            <Input
              id="storeAddress"
              type="text"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full text-lg"
              placeholder={t("admin.storeAddressPlaceholder", "Enter store address")}
              disabled={loading || saving}
              aria-label={t("admin.storeAddress", "Store Address")}
            />
          </div>

          {/* Store Phone Numbers Setting */}
          <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <label className="block text-base font-semibold">
                  {t("admin.storePhones", "Phone Numbers")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "admin.storePhonesDesc",
                    "Phone numbers that appear on receipts"
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPhoneNumber}
                disabled={loading || saving}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
{t("admin.addPhone", "Add Phone")}
              </Button>
            </div>
            
            {/* Primary Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t("admin.primaryPhone", "Primary Phone")}
              </label>
              <Input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full text-lg"
                placeholder={t("admin.primaryPhonePlaceholder", "Enter primary phone number")}
                disabled={loading || saving}
                aria-label="Primary Phone Number"
              />
            </div>

            {/* Additional Phone Numbers */}
            {phoneNumbers.map((phone, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => updatePhoneNumber(index, e.target.value)}
                  className="flex-1 text-lg"
                  placeholder={t("admin.additionalPhonePlaceholder", "Additional phone") + ` ${index + 1}`}
                  disabled={loading || saving}
                  aria-label={`Additional phone number ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removePhoneNumber(index)}
                  disabled={loading || saving}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Message Setting - Full Width */}
        <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <label
                className="block text-base font-semibold"
                htmlFor="footerMessage"
              >
                {t("admin.footerMessage", "Footer Message")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t(
                  "admin.footerMessageDesc",
                  "Custom message that appears at the bottom of receipts"
                )}
              </p>
            </div>
          </div>
          <textarea
            id="footerMessage"
            value={footerMessage}
            onChange={(e) => setFooterMessage(e.target.value)}
            className="w-full text-lg p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={t("admin.footerMessagePlaceholder", "Enter footer message")}
            disabled={loading || saving}
            rows={3}
            aria-label={t("admin.footerMessage", "Footer Message")}
          />
        </div>

        {/* Service Ticket Footer Message */}
        <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <label
                className="block text-base font-semibold"
                htmlFor="serviceTicketFooterMessage"
              >
                {t("admin.serviceTicketFooterMessage", "Service Ticket Footer Message")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t(
                  "admin.serviceTicketFooterMessageDesc",
                  "Custom message that appears at the bottom of service tickets"
                )}
              </p>
            </div>
          </div>
          <textarea
            id="serviceTicketFooterMessage"
            value={serviceTicketFooterMessage}
            onChange={(e) => setServiceTicketFooterMessage(e.target.value)}
            className="w-full text-lg p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={t("admin.serviceTicketFooterMessagePlaceholder", "Enter service ticket footer message")}
            disabled={loading || saving}
            rows={3}
            aria-label={t("admin.serviceTicketFooterMessage", "Service Ticket Footer Message")}
          />
        </div>

        {/* Save Button and Feedback */}
        <div className="flex flex-col md:flex-row items-center gap-4 pt-6 border-t border-border">
          <Button
            type="submit"
            disabled={loading || saving}
            className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 px-8 py-3 text-base rounded-lg shadow"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("admin.saving", "Saving...")}
              </>
            ) : (
              <>{t("admin.save", "Save Settings")}</>
            )}
          </Button>

          {/* Loading indicator */}
          {loading && (
            <span className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("admin.loading", "Loading settings...")}
            </span>
          )}
        </div>
      </form>
      </section>

      {/* Right Side - Live Preview */}
      <section className="w-2/5 bg-card border border-border rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold">
              {t("admin.receiptPreview", "Live Preview")}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode("receipt")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-sm ${
                previewMode === "receipt"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              <Receipt className="w-4 h-4" />
              {t("admin.receipt", "Receipt")}
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("serviceTicket")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-sm ${
                previewMode === "serviceTicket"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              <FileText className="w-4 h-4" />
              {t("admin.serviceTicket", "Service Ticket")}
            </button>
          </div>
        </div>
        
        <div className="h-full rounded-lg overflow-auto flex flex-col">
          <div className="flex justify-center w-full">
            {previewReceipt ? (
              <div className="w-full">
                <iframe
                  srcDoc={previewReceipt}
                  className="border border-border rounded-lg w-full"
                  title={previewMode === "receipt" ? "Receipt Preview" : "Service Ticket Preview"}
                  style={{ 
                    width: '100%', 
                    minHeight: '1000px',
                    border: 'none'
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Loading preview...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Preview Options - Only show for receipt preview */}
          {previewMode === "receipt" && (
          <div className="p-3 bg-muted/40 rounded-lg border border-border">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{t("admin.previewOptions", "Preview Options")}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Checkbox
                checked={previewOptions.showClient}
                onChange={(checked) => setPreviewOptions(prev => ({ ...prev, showClient: checked }))}
                label={t("admin.showClient", "Show Client")}
                color="orange"
              />
              
              <Checkbox
                checked={previewOptions.showDiscount}
                onChange={(checked) => setPreviewOptions(prev => ({ ...prev, showDiscount: checked }))}
                label={t("admin.showDiscount", "Show Discount")}
                color="orange"
              />
              
              <Checkbox
                checked={previewOptions.showCredit}
                onChange={(checked) => {
                  setPreviewOptions(prev => ({ 
                    ...prev, 
                    showCredit: checked,
                    showVersement: checked ? false : prev.showVersement
                  }));
                }}
                label={t("admin.showCredit", "Show Credit")}
                color="orange"
              />
              
              <Checkbox
                checked={previewOptions.showVersement}
                onChange={(checked) => {
                  setPreviewOptions(prev => ({ 
                    ...prev, 
                    showVersement: checked,
                    showCredit: checked ? false : prev.showCredit
                  }));
                }}
                label={t("admin.showVersement", "Show Versement")}
                color="orange"
              />
              
              <Checkbox
                checked={previewOptions.showInformation}
                onChange={(checked) => setPreviewOptions(prev => ({ ...prev, showInformation: checked }))}
                label={t("admin.showInformation", "Show Information")}
                color="orange"
              />
            </div>
          </div>
          )}
        </div>
      </section>
    </div>
  );
};
