import React, { useState } from "react";
import { Printer, Eye, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { t as i18nT } from "i18next";
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
  dueDate?: Date;
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
  showToast?: (message: string, type?: "success" | "error" | "info") => void,
  dueDate?: Date
) => {
  
  // Store information - will be loaded from database
  let storeInfo = {
    name: "Store Management",
    address: "Your Store Address",
    phone: "Phone: +1234567890",
  };
  let storeLogo: string | null = null;
  let footerMessage = "";

  // Helper function to calculate warranty period in days
  const calculateWarrantyPeriod = (warrantyDateStr: string, lang: string, receiptTranslations: any): string => {
    try {
      const warrantyDate = new Date(warrantyDateStr);
      const today = new Date();
      const diffTime = warrantyDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const langKey = lang as "fr" | "en" | "ar";
      const translations = receiptTranslations[langKey] as any;
      
      if (!translations) {
        // Fallback if translations not found
        if (diffDays < 0) return "Expired";
        if (diffDays === 0) return "Today";
        // Calculate years, months, and days
        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        const days = diffDays % 30;
        
        const parts: string[] = [];
        if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
        if (months > 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
        if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
        
        return parts.length > 0 ? parts.join(" and ") : "0 days";
      }
      
      if (diffDays < 0) return translations["expired"] || "Expired";
      if (diffDays === 0) return translations["today"] || "Today";
      
      // Calculate years, months, and days
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      const days = diffDays % 30;
      
      const parts: string[] = [];
      if (years > 0) {
        parts.push(`${years} ${years === 1 ? (translations["year"] || "year") : (translations["years"] || "years")}`);
      }
      if (months > 0) {
        parts.push(`${months} ${months === 1 ? (translations["month"] || "month") : (translations["months"] || "months")}`);
      }
      if (days > 0) {
        parts.push(`${days} ${days === 1 ? (translations["day"] || "day") : (translations["days"] || "days")}`);
      }
      
      // Get "and" translation or use default
      const andWord = translations["and"] || "and";
      return parts.length > 0 ? parts.join(` ${andWord} `) : `0 ${translations["days"] || "days"}`;
    } catch {
      return "";
    }
  };

  // Helper function to generate category info sections HTML
  const generateCategoryInfoSections = (cart: any[], lang: string, receiptTranslations: any): string => {
    const sections: string[] = [];
    
    cart.forEach((item) => {
      if (item.categoryInfo && item.categoryInfo.length > 0) {
        item.categoryInfo.forEach((unitInfo: any, unitIndex: number) => {
          // Skip if no meaningful info
          if (!unitInfo.imeiSerialNumber && !unitInfo.warranty && !unitInfo.usedNew && !unitInfo.problemsReplacedParts && !unitInfo.specifications) {
            return;
          }
          
          const productName = item.qty > 1 ? `${item.name.replace(/\n/g, " ")} #${unitIndex + 1}` : item.name.replace(/\n/g, " ");
          const infoFields: string[] = [];
          let warrantyFields = "";
          
          // Collect information fields (non-warranty)
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
          
          // Collect warranty fields separately
          if (unitInfo.warranty) {
            try {
              const warrantyDate = new Date(unitInfo.warranty);
              const warrantyPeriod = calculateWarrantyPeriod(unitInfo.warranty, lang, receiptTranslations);
              const warrantyTitle = lang === "fr" ? "Garantie" : lang === "ar" ? "الضمان" : "Warranty";
              const durationLabel = lang === "fr" ? "Durée" : lang === "ar" ? "المدة" : "Duration";
              const expiresLabel = lang === "fr" ? "Expiré le" : lang === "ar" ? "تنتهي في" : "Expires";
              
              warrantyFields = `
                <div class="category-info-section-title">${warrantyTitle}</div>
                <div class="category-info-fields-container">
                  ${warrantyPeriod ? `
                    <div class="category-info-field">
                      <span class="category-info-label">${durationLabel}:</span>
                      <span class="category-info-value">${warrantyPeriod}</span>
                    </div>
                  ` : ''}
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
          
          // Build the section if there's any content
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
      systemDevelopedBy: "Ce système est développé par REDA TECH",
      contact: "Contact",
      imei: "IMEI",
      warrantyPeriod: "Période de garantie",
      warrantyExpiration: "Date d'expiration de garantie",
      condition: "État",
      problemsReplacedParts: "Problèmes/Pièces remplacées",
      specifications: "Spécifications",
      expired: "Expiré",
      today: "Aujourd'hui",
      day: "jour",
      days: "jours",
      month: "mois",
      months: "mois",
      year: "année",
      years: "années",
      and: "et"
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
      systemDevelopedBy: "This System is developed by REDA TECH",
      contact: "Contact",
      imei: "IMEI",
      warrantyPeriod: "Warranty Period",
      warrantyExpiration: "Warranty Expiration Date",
      condition: "Condition",
      problemsReplacedParts: "Problems/Replaced Parts",
      specifications: "Specifications",
      expired: "Expired",
      today: "Today",
      day: "day",
      days: "days",
      month: "month",
      months: "months",
      year: "year",
      years: "years",
      and: "and"
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
      systemDevelopedBy: "تم تطوير هذا النظام بواسطة REDA TECH",
      contact: "الاتصال",
      imei: "IMEI",
      warrantyPeriod: "فترة الضمان",
      warrantyExpiration: "تاريخ انتهاء الضمان",
      condition: "الحالة",
      problemsReplacedParts: "المشاكل/الأجزاء المستبدلة",
      specifications: "المواصفات",
      expired: "منتهي",
      today: "اليوم",
      day: "يوم",
      days: "أيام",
      month: "شهر",
      months: "أشهر",
      year: "سنة",
      years: "سنوات",
      and: "و"
    }
  };

  // Load store information from database
  let language: "fr" | "en" | "ar" = "fr"; // Default to French
  let logoInverted = false;
  let logoSize = 100; // Default logo size
  try {
      const [name, address, phone, phones, footer, loadedLanguage, logo, needsInversion, logoSizeStr] = await Promise.all([
        window.api.database.options.get("storeName"),
        window.api.database.options.get("storeAddress"),
        window.api.database.options.get("storePhone"),
        window.api.database.options.get("storePhoneNumbers"),
        window.api.database.options.get("receiptFooterMessage"),
        window.api.database.options.get("receiptLanguage"),
        window.api.database.options.get("storeLogo"),
        window.api.database.options.get("logoNeedsInversion"),
        window.api.database.options.get("logoSize"),
      ]);
    storeLogo = logo || null;
    logoInverted = needsInversion === "true";
    logoSize = logoSizeStr ? parseInt(logoSizeStr) : 100;

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
        width: 3,
        height: 80,
        displayValue: false,
        fontSize: 12,
        margin: 10,
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
              font-size: 36px;
              font-weight: 900;
              margin-bottom: 1px;
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
              margin: 0 auto 6px auto;
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
                image-rendering: auto;
                image-rendering: -webkit-optimize-contrast;
              }
            }
            .store-info {
              font-size: 11px;
              margin-bottom: 3px;
              color: #000;
              font-weight: 900;
              line-height: 1.3;
            }
            .receipt-info {
              font-size: 11px;
              margin-bottom: 10px;
              color: #000;
              font-weight: 900;
              line-height: 1.4;
            }
            .divider {
              border-top: 1px solid #000000;
              margin: 2px 0;
            }
            .receipt-table {
              width: 100%;
              border-collapse: collapse;
              margin: 4px 0;
              font-size: 12px;
            }
            .receipt-table th,
            .receipt-table td {
              border: 1px solid #000000;
              padding: 2px 3px;
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
              font-size: 12px;
              font-weight: 900;
              background-color: #ffffff;
              padding: 3px 3px;
            }
            .receipt-table td {
              font-size: 11px;
              line-height: 1.2;
              padding: 2px 3px;
            }
            .receipt-table .col-item {
              width: auto;
              min-width: 0;
              word-wrap: break-word;
              word-break: break-word;
              overflow-wrap: break-word;
              font-size: 14px;
            }
            .receipt-table .col-qty {
              width: 28px;
              text-align: center;
              font-weight: 900;
              font-size: 14px;
            }
            .receipt-table .col-price {
              width: 52px;
              text-align: right;
              font-weight: 900;
              font-size: 14px;
              white-space: nowrap;
            }
            .receipt-table .col-total {
              width: 52px;
              text-align: right;
              font-weight: 900;
              font-size: 14px;
              white-space: nowrap;
            }
            .receipt-table tbody tr {
              min-height: 16px;
            }
            .receipt-table tbody tr td {
              vertical-align: middle;
            }
            .category-info {
              font-size: 9px;
              line-height: 1.3;
              color: #000;
              margin-top: 2px;
              padding-left: 2px;
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
              border-top: 1px solid #000000;
              margin: 4px 0 6px 0;
            }
            .category-info-product-name {
              font-weight: 900;
              font-size: 14px;
              margin-bottom: 6px;
              margin-top: 2px;
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
              margin-bottom: 5px;
              font-size: 12px;
              line-height: 1.5;
            }
            .category-info-field-multiline {
              margin-bottom: 8px;
              flex-direction: column;
              align-items: flex-start !important;
            }
            .category-info-label {
              font-weight: 700;
              font-size: 13px;
              display: inline-block;
              margin-right: 8px;
            }
            .category-info-value {
              font-weight: 900;
              font-size: 13px;
              color: #000000;
              display: inline-block;
              word-break: break-word;
              text-align: right;
              flex: 1;
              margin-left: auto;
            }
            .category-info-field-multiline .category-info-label {
              display: block;
              margin-bottom: 3px;
              margin-right: 0;
              width: 100%;
              font-size: 13px;
            }
            .category-info-field-multiline .category-info-value {
              display: block;
              padding-left: 8px;
              text-align: left;
              margin-left: 0 !important;
              width: 100%;
              font-size: 13px;
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
              font-size: 12px;
              margin-top: 8px;
              margin-bottom: 4px;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .receipt-table tfoot td {
              font-weight: 900;
              font-size: 13px;
              padding: 3px 3px;
              border-top: 2px solid #000000;
              white-space: nowrap;
            }
            .receipt-table tfoot .total-label {
              text-align: right;
              font-weight: 900;
              font-size: 13px;
              white-space: nowrap;
            }
            .receipt-table tfoot .total-value {
              text-align: right;
              font-weight: 900;
              font-size: 14px;
              white-space: nowrap;
            }
            .receipt-table tfoot .final-total {
              border-top: 2px solid #000000;
              font-size: 15px;
              font-weight: 900;
            }
            .receipt-table tfoot .final-total.total-value {
              font-size: 16px;
              font-weight: 900;
            }
            .payment-info {
              margin-top: 4px;
              font-size: 13px;
              color: #000;
              font-weight: 900;
              line-height: 1.2;
            }
            .payment-info > div {
              margin-bottom: 0px;
              line-height: 1.2;
            }
            .client-info {
              margin-bottom: 4px;
              font-size: 11px;
              color: #000;
              font-weight: 900;
              line-height: 1.3;
            }
            .receipt-id {
              text-align: center;
              margin: 10px 0 2px 0;
              padding: 2px 0;
              border-top: 1px solid #000000;
            }
            .receipt-id-text {
              font-size: 11px;
              margin-top: 2px;
              color: #000;
              font-weight: 900;
            }
            .welcome {
              text-align: center;
              margin-top: 4px;
              font-size: 11px;
              font-weight: 900;
              color: #000;
              line-height: 1.4;
            }
            .watermark {
              text-align: left;
              margin-top: 4px;
              padding-top: 3px;
              border-top: 1px solid #000000;
              font-size: 9px;
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
              * {
                print-color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body {
                margin: 0;
                padding: 0px;
                background: white !important;
                width: 77mm;
                print-color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                -webkit-font-smoothing: none;
                font-smooth: never;
                text-rendering: optimizeLegibility;
              }
              .receipt {
                width: 77mm;
                margin: 0;
                max-width: 77mm;
                border: none;
                border-radius: 0;
                padding: 2px 3px 0px 0px;
                box-shadow: none;
                print-color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                -webkit-font-smoothing: none;
                font-smooth: never;
                text-rendering: optimizeLegibility;
              }
              img, svg {
                image-rendering: auto;
                image-rendering: -webkit-optimize-contrast;
                max-width: 100%;
                height: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt"${(language as "fr" | "en" | "ar") === "ar" ? ' dir="rtl"' : ''}>
            <!-- Store Header -->
            <div class="header">
              ${storeLogo ? `
                <img src="${storeLogo}" alt="Store Logo" class="store-logo${logoInverted ? ' inverted' : ''}" />
              ` : `
                <div class="store-name">${storeInfo.name}</div>
              `}
              <div class="store-info">${storeInfo.address}</div>
              <div class="store-info">${storeInfo.phone}</div>
            </div>

            <!-- Date and Time -->
            <div class="receipt-info">
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].date}: ${currentDate.toLocaleDateString()}</div>
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].time}: ${currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            <!-- Client Info -->
            ${clientName ? `<div class="client-info">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].client}: ${clientName}</div>` : ""}

            <div class="divider"></div>

            <!-- Items Table -->
            <table class="receipt-table">
              <thead>
                <tr>
                  <th class="col-item">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].item}</th>
                  <th class="col-qty">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].qty}</th>
                  <th class="col-price">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].price}</th>
                  <th class="col-total">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].total}</th>
                </tr>
              </thead>
              <tbody>
                ${cart
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
                    <td colspan="3" class="total-label">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].subtotal}:</td>
                    <td class="total-value">${total.toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</td>
                  </tr>
                  <tr>
                    <td colspan="3" class="total-label">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].discount}:</td>
                    <td class="total-value">-${discount.toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</td>
                  </tr>
                  <tr>
                    <td colspan="3" class="total-label final-total">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].finalTotal}:</td>
                    <td class="total-value final-total">${finalTotal.toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</td>
                  </tr>
                `
                    : `
                  <tr>
                    <td colspan="3" class="total-label final-total">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].finalTotal}:</td>
                    <td class="total-value final-total">${finalTotal.toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</td>
                  </tr>
                `
                }
              </tfoot>
            </table>

            <!-- Category Information Sections -->
            ${generateCategoryInfoSections(cart, (language as "fr" | "en" | "ar") || "fr", receiptTranslations)}

            <!-- Payment Info -->
            ${
              paymentType !== "none"
                ? `
              <div class="payment-info">
                <div class="divider"></div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].payment} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].type}: ${paymentType === "credit" ? receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].credit : receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].versement}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].amountPaid}: ${paymentAmount.toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].dueDate}: ${dueDate ? dueDate.toLocaleDateString() : (paymentDate ? paymentDate.toLocaleDateString() : "N/A")}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].remaining}: ${(finalTotal - paymentAmount).toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</div>
              </div>
            `
                : ""
            }

            <!-- Receipt ID with Barcode -->
            <div class="receipt-id">
              ${receiptBarcode ? `
                <div style="text-align: center; margin-bottom: 2px;">
                  <img src="${receiptBarcode}" alt="Receipt Barcode" style="max-width: 100%; height: 80px; image-rendering: auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact;" />
                </div>
              ` : ''}
              <div class="receipt-id-text">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].receiptId}: ${receiptNumber.substring(0, 8)}</div>
            </div>

            <!-- Welcome Message -->
            <div class="welcome">
              ${footerMessage ? footerMessage.split('\n').map(line => `<div>${line}</div>`).join('') : `
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].thankYou}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].comeAgain}</div>
                <div style="margin-top: 1px;">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].appreciate}</div>
              `}
            </div>
            
            <!-- Watermark -->
            <div class="watermark">
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].systemDevelopedBy}</div>
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].contact}: 0793420745</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  try {
    const receiptHTML = generateReceiptHTML();
    
    // Use iframe method that respects CSS @page rule (like the original implementation)
    // This ensures the 70mm width is properly respected
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      showToast?.("Failed to initialize print", "error");
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(receiptHTML);
    iframeDoc.close();

    iframe.onload = () => {
      setTimeout(() => {
        try {
          // Use Electron's silent print if available, otherwise regular print
          if (window.api?.app?.printSilently) {
            // Get the iframe's HTML content and print it silently
            const iframeHTML = iframeDoc.documentElement.outerHTML;
            window.api.app.printSilently(`<!DOCTYPE html>${iframeHTML}`)
              .then(() => {
                showToast?.(i18nT("cashier.printSuccess", "Receipt sent to printer"), "success");
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
              })
              .catch((error: Error) => {
                console.error("Silent print failed, falling back to regular print:", error);
                // Fallback to regular print
                iframe.contentWindow?.print();
                setTimeout(() => {
                  if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                  }
                }, 100);
              });
          } else {
            // Fallback to browser print
            iframe.contentWindow?.print();
            setTimeout(() => {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
            }, 100);
          }
        } catch (error) {
          console.error("Print error:", error);
          showToast?.("Failed to print receipt", "error");
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }
      }, 200); // Delay to ensure CSS is loaded
    };
  } catch (error) {
    console.error("Print error:", error);
    showToast?.(i18nT("cashier.printError", "Failed to print receipt"), "error");
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
  dueDate,
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
      systemDevelopedBy: "Ce système est développé par REDA TECH",
      contact: "Contact",
      imei: "IMEI",
      warrantyPeriod: "Période de garantie",
      warrantyExpiration: "Date d'expiration de garantie",
      condition: "État",
      problemsReplacedParts: "Problèmes/Pièces remplacées",
      specifications: "Spécifications",
      expired: "Expiré",
      today: "Aujourd'hui",
      day: "jour",
      days: "jours",
      month: "mois",
      months: "mois",
      year: "année",
      years: "années",
      and: "et"
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
      systemDevelopedBy: "This System is developed by REDA TECH",
      contact: "Contact",
      imei: "IMEI",
      warrantyPeriod: "Warranty Period",
      warrantyExpiration: "Warranty Expiration Date",
      condition: "Condition",
      problemsReplacedParts: "Problems/Replaced Parts",
      specifications: "Specifications",
      expired: "Expired",
      today: "Today",
      day: "day",
      days: "days",
      month: "month",
      months: "months",
      year: "year",
      years: "years",
      and: "and"
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
      systemDevelopedBy: "تم تطوير هذا النظام بواسطة REDA TECH",
      contact: "الاتصال",
      imei: "IMEI",
      warrantyPeriod: "فترة الضمان",
      warrantyExpiration: "تاريخ انتهاء الضمان",
      condition: "الحالة",
      problemsReplacedParts: "المشاكل/الأجزاء المستبدلة",
      specifications: "المواصفات",
      expired: "منتهي",
      today: "اليوم",
      day: "يوم",
      days: "أيام",
      month: "شهر",
      months: "أشهر",
      year: "سنة",
      years: "سنوات",
      and: "و"
    }
  };

  // Store information - will be loaded from database
  const [storeInfo, setStoreInfo] = useState({
    name: "Store Management",
    address: "Address: Your Store Address",
    phone: "Phone: +1234567890",
  });
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [logoNeedsInversion, setLogoNeedsInversion] = useState(false);
  const [logoSize, setLogoSize] = useState<number>(100);
  const [footerMessage, setFooterMessage] = useState("");
  const [language, setLanguage] = useState<"fr" | "en" | "ar">("fr");

  // Load store information from database
  React.useEffect(() => {
    const loadStoreInfo = async () => {
      try {
        const [name, address, phone, phones, footer, language, logo, needsInversion, logoSizeStr] = await Promise.all([
          window.api.database.options.get("storeName"),
          window.api.database.options.get("storeAddress"),
          window.api.database.options.get("storePhone"),
          window.api.database.options.get("storePhoneNumbers"),
          window.api.database.options.get("receiptFooterMessage"),
          window.api.database.options.get("receiptLanguage"),
          window.api.database.options.get("storeLogo"),
          window.api.database.options.get("logoNeedsInversion"),
          window.api.database.options.get("logoSize"),
        ]);
        setStoreLogo(logo || null);
        setLogoNeedsInversion(needsInversion === "true");
        setLogoSize(logoSizeStr ? parseInt(logoSizeStr) : 100);
        
        const loadedLanguage = (language as "fr" | "en" | "ar") || "fr";
        setLanguage(loadedLanguage);
        
        const allPhones = [phone, ...(phones ? JSON.parse(phones) : [])].filter(p => p && p.trim() !== "");
        const phoneDisplay = allPhones.length > 0 
          ? allPhones.map(p => `${receiptTranslations[loadedLanguage].phone}: ${p}`).join('<br>')
          : `${receiptTranslations[loadedLanguage].phone}: +1234567890`;
        
        setStoreInfo({
          name: name || "Store Management",
          address: address ? `${receiptTranslations[loadedLanguage].address}: ${address}` : `${receiptTranslations[loadedLanguage].address}: Your Store Address`,
          phone: phoneDisplay,
        });
        setFooterMessage(footer || "");
      } catch (error) {
        console.error("Failed to load store information:", error);
      }
    };
    
    loadStoreInfo();
  }, []);

  // Calculate totals - memoized to prevent infinite loops
  const total = React.useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.price, 0), [cart]);
  const finalTotal = React.useMemo(() => total - discount, [total, discount]);
  const currentDate = React.useMemo(() => new Date(), []);
  const receiptNumber = React.useMemo(() => saleId || `TEMP-${Date.now()}`, [saleId]);

  // Generate barcode from receipt ID (8 characters max)
  const generateReceiptBarcodeData = () => {
    try {
      // Use the new 8-character receipt barcode function
      return generateReceiptBarcode(receiptNumber, {
        format: 'CODE128',
        width: 3,
        height: 80,
        displayValue: false,
        fontSize: 12,
        margin: 10,
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
      const receiptHTML = generateReceiptHTML();
      
      // Use iframe method that respects CSS @page rule (like the original implementation)
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        toast.showToast(t("cashier.printError", "Failed to initialize print"), "error");
        document.body.removeChild(iframe);
        setIsPrinting(false);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(receiptHTML);
      iframeDoc.close();

      iframe.onload = () => {
        setTimeout(() => {
          try {
            // Try silent print first, fallback to regular print
            if (window.api?.app?.printSilently) {
              const iframeHTML = iframeDoc.documentElement.outerHTML;
              window.api.app.printSilently(`<!DOCTYPE html>${iframeHTML}`)
                .then(() => {
                  toast.showToast(t("cashier.printSuccess", "Receipt sent to printer"), "success");
                  if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                  }
                  setIsPrinting(false);
                })
                .catch((error: Error) => {
                  rendererLogger.error("Silent print failed, using regular print", "ReceiptModal", error);
                  // Fallback to regular print - this will show dialog but respects CSS correctly
                  iframe.contentWindow?.print();
                  setTimeout(() => {
                    if (iframe.parentNode) {
                      document.body.removeChild(iframe);
                    }
                    setIsPrinting(false);
                  }, 100);
                });
            } else {
              // Fallback to browser print
              iframe.contentWindow?.print();
              toast.showToast(t("cashier.printSuccess", "Receipt sent to printer"), "success");
              setTimeout(() => {
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
                setIsPrinting(false);
              }, 100);
            }
          } catch (printError) {
            rendererLogger.error("Print error", "ReceiptModal", printError);
            toast.showToast(t("cashier.printError", "Failed to print receipt"), "error");
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
            setIsPrinting(false);
          }
        }, 200); // Delay to ensure CSS is loaded
      };
    } catch (error) {
      rendererLogger.error("Print error", "ReceiptModal", error);
      toast.showToast(t("cashier.printError", "Failed to print receipt"), "error");
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

  // Helper function to calculate warranty period in days (for component)
  const calculateWarrantyPeriodLocal = (warrantyDateStr: string): string => {
    try {
      const warrantyDate = new Date(warrantyDateStr);
      const today = new Date();
      const diffTime = warrantyDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const langKey = (language as "fr" | "en" | "ar") || "fr";
      const translations = receiptTranslations[langKey] as any;
      
      if (!translations) {
        // Fallback if translations not found
        if (diffDays < 0) return "Expired";
        if (diffDays === 0) return "Today";
        // Calculate years, months, and days
        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        const days = diffDays % 30;
        
        const parts: string[] = [];
        if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
        if (months > 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
        if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
        
        return parts.length > 0 ? parts.join(" and ") : "0 days";
      }
      
      if (diffDays < 0) return translations["expired"] || "Expired";
      if (diffDays === 0) return translations["today"] || "Today";
      
      // Calculate years, months, and days
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      const days = diffDays % 30;
      
      const parts: string[] = [];
      if (years > 0) {
        parts.push(`${years} ${years === 1 ? (translations["year"] || "year") : (translations["years"] || "years")}`);
      }
      if (months > 0) {
        parts.push(`${months} ${months === 1 ? (translations["month"] || "month") : (translations["months"] || "months")}`);
      }
      if (days > 0) {
        parts.push(`${days} ${days === 1 ? (translations["day"] || "day") : (translations["days"] || "days")}`);
      }
      
      // Get "and" translation or use default
      const andWord = translations["and"] || "and";
      return parts.length > 0 ? parts.join(` ${andWord} `) : `0 ${translations["days"] || "days"}`;
    } catch {
      return "";
    }
  };

  // Helper function to generate category info sections HTML (for component)
  const generateCategoryInfoSectionsLocal = (cart: CartItem[], lang: string): string => {
    const sections: string[] = [];
    
    cart.forEach((item) => {
      if (item.categoryInfo && item.categoryInfo.length > 0) {
        item.categoryInfo.forEach((unitInfo, unitIndex: number) => {
          // Skip if no meaningful info
          if (!unitInfo.imeiSerialNumber && !unitInfo.warranty && !unitInfo.usedNew && !unitInfo.problemsReplacedParts && !unitInfo.specifications) {
            return;
          }
          
          const productName = item.qty > 1 ? `${item.name.replace(/\n/g, " ")} #${unitIndex + 1}` : item.name.replace(/\n/g, " ");
          const infoFields: string[] = [];
          let warrantyFields = "";
          
          // Collect information fields (non-warranty)
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
          
          // Collect warranty fields separately
          if (unitInfo.warranty) {
            try {
              const warrantyDate = new Date(unitInfo.warranty);
              const warrantyPeriod = calculateWarrantyPeriodLocal(unitInfo.warranty);
              const warrantyTitle = lang === "fr" ? "Garantie" : lang === "ar" ? "الضمان" : "Warranty";
              const durationLabel = lang === "fr" ? "Durée" : lang === "ar" ? "المدة" : "Duration";
              const expiresLabel = lang === "fr" ? "Expiré le" : lang === "ar" ? "تنتهي في" : "Expires";
              
              warrantyFields = `
                <div class="category-info-section-title">${warrantyTitle}</div>
                <div class="category-info-fields-container">
                  ${warrantyPeriod ? `
                    <div class="category-info-field">
                      <span class="category-info-label">${durationLabel}:</span>
                      <span class="category-info-value">${warrantyPeriod}</span>
                    </div>
                  ` : ''}
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
          
          // Build the section if there's any content
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
              font-size: 36px;
              font-weight: 900;
              margin-bottom: 1px;
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
              margin: 0 auto 6px auto;
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
                image-rendering: auto;
                image-rendering: -webkit-optimize-contrast;
              }
            }
            .store-info {
              font-size: 11px;
              margin-bottom: 3px;
              color: #000;
              font-weight: 900;
              line-height: 1.3;
            }
            .receipt-info {
              font-size: 12px;
              margin-bottom: 6px;
              color: #000;
              font-weight: 900;
            }
            .divider {
              border-top: 1px solid #000000;
              margin: 2px 0;
            }
            .receipt-table {
              width: 100%;
              border-collapse: collapse;
              margin: 4px 0;
              font-size: 12px;
            }
            .receipt-table th,
            .receipt-table td {
              border: 1px solid #000000;
              padding: 2px 3px;
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
              font-size: 12px;
              font-weight: 900;
              background-color: #ffffff;
              padding: 3px 3px;
            }
            .receipt-table td {
              font-size: 11px;
              line-height: 1.2;
              padding: 2px 3px;
            }
            .receipt-table .col-item {
              width: auto;
              min-width: 0;
              word-wrap: break-word;
              word-break: break-word;
              overflow-wrap: break-word;
              font-size: 12px;
            }
            .receipt-table .col-qty {
              width: 28px;
              text-align: center;
              font-weight: 900;
              font-size: 14px;
            }
            .receipt-table .col-price {
              width: 52px;
              text-align: right;
              font-weight: 900;
              font-size: 14px;
              white-space: nowrap;
            }
            .receipt-table .col-total {
              width: 52px;
              text-align: right;
              font-weight: 900;
              font-size: 14px;
              white-space: nowrap;
            }
            .receipt-table tbody tr {
              min-height: 16px;
            }
            .receipt-table tbody tr td {
              vertical-align: middle;
            }
            .category-info {
              font-size: 9px;
              line-height: 1.3;
              color: #000;
              margin-top: 2px;
              padding-left: 2px;
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
              border-top: 1px solid #000000;
              margin: 4px 0 6px 0;
            }
            .category-info-product-name {
              font-weight: 900;
              font-size: 14px;
              margin-bottom: 6px;
              margin-top: 2px;
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
              margin-bottom: 5px;
              font-size: 12px;
              line-height: 1.5;
            }
            .category-info-field-multiline {
              margin-bottom: 8px;
              flex-direction: column;
              align-items: flex-start !important;
            }
            .category-info-label {
              font-weight: 700;
              font-size: 13px;
              display: inline-block;
              margin-right: 8px;
            }
            .category-info-value {
              font-weight: 900;
              font-size: 13px;
              color: #000000;
              display: inline-block;
              word-break: break-word;
              text-align: right;
              flex: 1;
              margin-left: auto;
            }
            .category-info-field-multiline .category-info-label {
              display: block;
              margin-bottom: 3px;
              margin-right: 0;
              width: 100%;
              font-size: 13px;
            }
            .category-info-field-multiline .category-info-value {
              display: block;
              padding-left: 8px;
              text-align: left;
              margin-left: 0 !important;
              width: 100%;
              font-size: 13px;
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
              font-size: 12px;
              margin-top: 8px;
              margin-bottom: 4px;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .receipt-table tfoot td {
              font-weight: 900;
              font-size: 13px;
              padding: 3px 3px;
              border-top: 2px solid #000000;
              white-space: nowrap;
            }
            .receipt-table tfoot .total-label {
              text-align: right;
              font-weight: 900;
              font-size: 13px;
              white-space: nowrap;
            }
            .receipt-table tfoot .total-value {
              text-align: right;
              font-weight: 900;
              font-size: 14px;
              white-space: nowrap;
            }
            .receipt-table tfoot .final-total {
              border-top: 2px solid #000000;
              font-size: 15px;
              font-weight: 900;
            }
            .receipt-table tfoot .final-total.total-value {
              font-size: 16px;
              font-weight: 900;
            }
            .payment-info {
              margin-top: 4px;
              font-size: 13px;
              color: #000;
              font-weight: 900;
              line-height: 1.4;
            }
            .payment-info > div {
              margin-bottom: 2px;
            }
            .client-info {
              margin-bottom: 4px;
              font-size: 11px;
              color: #000;
              font-weight: 900;
              line-height: 1.3;
            }
            .receipt-id {
              text-align: center;
              margin: 6px 0 2px 0;
              padding: 2px 0;
              border-top: 1px solid #000000;
            }
            .receipt-id-text {
              font-size: 11px;
              margin-top: 2px;
              color: #000;
              font-weight: 900;
            }
            .welcome {
              text-align: center;
              margin-top: 4px;
              font-size: 11px;
              font-weight: 900;
              color: #000;
              line-height: 1.4;
            }
            .watermark {
              text-align: left;
              margin-top: 4px;
              padding-top: 3px;
              border-top: 1px solid #000000;
              font-size: 9px;
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
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt"${(language as "fr" | "en" | "ar") === "ar" ? ' dir="rtl"' : ''}>
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
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].date}: ${currentDate.toLocaleDateString()}</div>
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].time}: ${currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            <!-- Client Info -->
            ${clientName ? `<div class="client-info">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].client}: ${clientName}</div>` : ""}

            <div class="divider"></div>

            <!-- Items Table -->
            <table class="receipt-table">
              <thead>
                <tr>
                  <th class="col-item">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].item}</th>
                  <th class="col-qty">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].qty}</th>
                  <th class="col-price">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].price}</th>
                  <th class="col-total">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].total}</th>
                </tr>
              </thead>
              <tbody>
                ${cart
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
                    <td colspan="3" class="total-label">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].subtotal}:</td>
                    <td class="total-value">${total.toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</td>
                  </tr>
                  <tr>
                    <td colspan="3" class="total-label">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].discount}:</td>
                    <td class="total-value">-${discount.toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</td>
                  </tr>
                  <tr>
                    <td colspan="3" class="total-label final-total">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].finalTotal}:</td>
                    <td class="total-value final-total">${finalTotal.toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</td>
                  </tr>
                `
                    : `
                  <tr>
                    <td colspan="3" class="total-label final-total">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].finalTotal}:</td>
                    <td class="total-value final-total">${finalTotal.toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</td>
                  </tr>
                `
                }
              </tfoot>
            </table>

            <!-- Category Information Sections -->
            ${generateCategoryInfoSectionsLocal(cart, (language as "fr" | "en" | "ar") || "fr")}

            <!-- Payment Info -->
            ${
              paymentType !== "none"
                ? `
              <div class="payment-info">
                <div class="divider"></div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].payment} ${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].type}: ${paymentType === "credit" ? receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].credit : receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].versement}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].amountPaid}: ${paymentAmount.toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].dueDate}: ${dueDate ? dueDate.toLocaleDateString() : (paymentDate ? paymentDate.toLocaleDateString() : "N/A")}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].remaining}: ${(finalTotal - paymentAmount).toLocaleString()}${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].currency}</div>
              </div>
            `
                : ""
            }

            <!-- Receipt ID with Barcode -->
            <div class="receipt-id">
              ${receiptBarcode ? `
                <div style="text-align: center; margin-bottom: 2px;">
                  <img src="${receiptBarcode}" alt="Receipt Barcode" style="max-width: 100%; height: 80px; image-rendering: auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact;" />
                </div>
              ` : ''}
              <div class="receipt-id-text">ID: ${shortReceiptId}</div>
            </div>

            <!-- Welcome Message -->
            <div class="welcome">
              ${footerMessage ? footerMessage.split('\n').map(line => `<div>${line}</div>`).join('') : `
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].thankYou}</div>
                <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].comeAgain}</div>
                <div style="margin-top: 1px;">${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].appreciate}</div>
              `}
            </div>
            
            <!-- Watermark -->
            <div class="watermark">
              <div>${receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].systemDevelopedBy}</div>
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
        <div className="font-mono text-sm bg-muted rounded-lg p-6 border border-border" dir={language === "ar" ? "rtl" : "ltr"}>
          {/* Store Header */}
          <div className="text-center mb-4">
            {storeLogo ? (
              <img 
                src={storeLogo} 
                alt="Store Logo" 
                className={`mx-auto mb-2 ${logoNeedsInversion ? 'inverted' : ''}`}
                style={{ 
                  maxWidth: `${Math.round(180 * (logoSize / 100))}px`,
                  maxHeight: `${Math.round(70 * (logoSize / 100))}px`,
                  filter: logoNeedsInversion ? 'grayscale(100%) contrast(300%) brightness(0.3) invert(1)' : 'grayscale(100%) contrast(300%) brightness(0.3)'
                }}
              />
            ) : (
              <div className="font-bold text-lg">{storeInfo.name}</div>
            )}
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
            <div>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].time}: {currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
            {React.useMemo(() => cart.flatMap((item) => {
              // If item has categoryInfo, expand by quantity but don't show category info inline
              if (item.categoryInfo && item.categoryInfo.length > 0) {
                return Array.from({ length: item.qty }, (_, unitIndex) => {
                  return (
                    <div
                      key={`${item.id}-${unitIndex}`}
                      className="flex justify-between items-start mb-1 min-h-[14px]"
                    >
                      <span className="flex-1 mr-2 text-xs break-words leading-tight">
                        {item.qty > 1 ? `${item.name} #${unitIndex + 1}` : item.name}
                      </span>
                      <span className="w-5 text-center font-bold text-xs mr-3 flex-shrink-0">
                        1
                      </span>
                      <span className="w-9 text-right text-xs mr-2 flex-shrink-0">
                        {item.price.toLocaleString()}
                      </span>
                      <span className="w-12 text-right font-bold text-xs flex-shrink-0">
                        {item.price.toLocaleString()}
                      </span>
                    </div>
                  );
                });
              }
              // No categoryInfo, show as single row
              return (
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
              );
            }), [cart])}
          </div>

          <div className="border-t border-black dark:border-white my-2" />

          {/* Totals */}
          <div className="font-bold mb-2">
            {discount > 0 ? (
              <>
                <div className="flex justify-between mb-1">
                  <span>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].subtotal}:</span>
                  <span>
                    {total.toLocaleString()}{receiptTranslations[language].currency}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].discount}:</span>
                  <span>
                    -{discount.toLocaleString()}{receiptTranslations[language].currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].finalTotal}:</span>
                  <span>
                    {finalTotal.toLocaleString()}{receiptTranslations[language].currency}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].finalTotal}:</span>
                <span>
                  {finalTotal.toLocaleString()} {receiptTranslations[language].currency}
                </span>
              </div>
            )}
          </div>

          {/* Category Information Sections */}
          {React.useMemo(() => {
            const sections: React.ReactElement[] = [];
            cart.forEach((item) => {
              if (item.categoryInfo && item.categoryInfo.length > 0) {
                item.categoryInfo.forEach((unitInfo, unitIndex: number) => {
                  // Skip if no meaningful info
                  if (!unitInfo.imeiSerialNumber && !unitInfo.warranty && !unitInfo.usedNew && !unitInfo.problemsReplacedParts) {
                    return;
                  }
                  
                  const productName = item.qty > 1 ? `${item.name} #${unitIndex + 1}` : item.name;
                  const infoLines: React.ReactElement[] = [];
                  const warrantyLines: React.ReactElement[] = [];
                  
                  // Collect information fields (non-warranty)
                  if (unitInfo.imeiSerialNumber) {
                    infoLines.push(
                      <div key="imei" className="text-xs">
                        {receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].imei}: {unitInfo.imeiSerialNumber}
                      </div>
                    );
                  }
                  
                  if (unitInfo.usedNew) {
                    const conditionText = unitInfo.usedNew === "new" 
                      ? ((language as "fr" | "en" | "ar") === "fr" ? "Neuf" : (language as "fr" | "en" | "ar") === "ar" ? "جديد" : "New")
                      : ((language as "fr" | "en" | "ar") === "fr" ? "Occasion" : (language as "fr" | "en" | "ar") === "ar" ? "مستعمل" : "Used");
                    infoLines.push(
                      <div key="condition" className="text-xs">
                        {receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].condition}: {conditionText}
                      </div>
                    );
                  }
                  
                  if (unitInfo.problemsReplacedParts) {
                    const problemsLines = unitInfo.problemsReplacedParts.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                    infoLines.push(
                      <div key="problems" className="text-xs">
                        {receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].problemsReplacedParts}: {problemsLines.map((line, idx) => (
                          <React.Fragment key={idx}>
                            {line}
                            {idx < problemsLines.length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </div>
                    );
                  }
                  
                  if (unitInfo.specifications) {
                    const specsLines = unitInfo.specifications.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                    infoLines.push(
                      <div key="specifications" className="text-xs">
                        {receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].specifications}: {specsLines.map((line, idx) => (
                          <React.Fragment key={idx}>
                            {line}
                            {idx < specsLines.length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </div>
                    );
                  }
                  
                  // Collect warranty fields separately
                  if (unitInfo.warranty) {
                    try {
                      const warrantyDate = new Date(unitInfo.warranty);
                      const warrantyPeriod = calculateWarrantyPeriodLocal(unitInfo.warranty);
                      const warrantyTitle = language === "fr" ? "Garantie" : language === "ar" ? "الضمان" : "Warranty";
                      const durationLabel = language === "fr" ? "Durée" : language === "ar" ? "المدة" : "Duration";
                      const expiresLabel = language === "fr" ? "Expiré le" : language === "ar" ? "تنتهي في" : "Expires";
                      
                      warrantyLines.push(
                        <div key="warranty-title" className="text-xs font-semibold mb-1 text-center">
                          {warrantyTitle}
                        </div>
                      );
                      if (warrantyPeriod) {
                        warrantyLines.push(
                          <div key="warranty-period" className="text-xs ml-2">
                            {durationLabel}: {warrantyPeriod}
                          </div>
                        );
                      }
                      warrantyLines.push(
                        <div key="warranty-exp" className="text-xs ml-2">
                          {expiresLabel}: {warrantyDate.toLocaleDateString()}
                        </div>
                      );
                    } catch {
                      // Invalid date, skip
                    }
                  }
                  
                  // Build section lines
                  const lines: React.ReactElement[] = [];
                  if (infoLines.length > 0) {
                    const infoTitle = language === "fr" ? "Informations" : language === "ar" ? "المعلومات" : "Information";
                    lines.push(
                      <div key="info-title" className="text-xs font-semibold mb-1 text-center">
                        {infoTitle}
                      </div>
                    );
                    lines.push(...infoLines);
                  }
                  if (warrantyLines.length > 0) {
                    if (infoLines.length > 0) {
                      lines.push(<div key="warranty-spacer" className="mt-2" />);
                    }
                    lines.push(...warrantyLines);
                  }
                  
                  if (lines.length > 0) {
                    sections.push(
                      <div key={`${item.id}-${unitIndex}`} className="mt-2 space-y-1">
                        <div className="border-t border-black dark:border-white pt-2" />
                        <div className="font-bold text-xs">{productName}</div>
                        <div className="space-y-1">{lines}</div>
                      </div>
                    );
                  }
                });
              }
            });
            return sections.length > 0 ? <>{sections}</> : null;
          }, [cart, language])}

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
                  {receiptTranslations[language].amountPaid}: {paymentAmount.toLocaleString()}{" "}
                  {receiptTranslations[language].currency}
                </div>
                <div>
                  {receiptTranslations[language].dueDate}:{" "}
                  {dueDate ? dueDate.toLocaleDateString() : (paymentDate ? paymentDate.toLocaleDateString() : "N/A")}
                </div>
                <div>
                  {receiptTranslations[language].remaining}: {(finalTotal - paymentAmount).toLocaleString()}{" "}
                  {receiptTranslations[language].currency}
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
              <div className="whitespace-pre-line">{footerMessage}</div>
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
            <div>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].systemDevelopedBy}</div>
            <div>{receiptTranslations[(language as "fr" | "en" | "ar") || "fr"].contact}: 0793420745</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
