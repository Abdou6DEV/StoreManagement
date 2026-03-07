import React, { useState, useEffect } from "react";
import { Wrench, Loader2, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Modal } from "../../../lib/components/modal";
import { DatePicker } from "../../../lib/components/datePicker";
import { useToast } from "../../../lib/contexts/toastContext";
import { Tooltip } from "../../../lib/components/tooltip";
import { generateReceiptBarcode } from "../../../lib/utils/barcodeVisual";
import { printServiceLabel } from "../utils/serviceLabelPrintUtils";
import { NoPrinterModal } from "../../../lib/components/noPrinterModal";

interface ServiceAppointment {
  id: string;
  name: string;
  serviceType: string;
  description?: string;
  costPrice: number;
  servicePrice: number;
  clientId?: string;
  dueDate: string;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    phone?: string;
  };
}

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceAppointment | null;
  onServiceUpdated: () => void;
}

export default function EditServiceModal({
  isOpen,
  onClose,
  service,
  onServiceUpdated,
}: EditServiceModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    serviceType: "",
    description: "",
    costPrice: "",
    servicePrice: "",
    dueDate: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [showNoReceiptPrinterModal, setShowNoReceiptPrinterModal] = useState(false);
  const [showNoLabelPrinterModal, setShowNoLabelPrinterModal] = useState(false);

  useEffect(() => {
    if (service) {
      // Format dueDate to YYYY-MM-DD format for DatePicker
      const dueDateString = service.dueDate 
        ? new Date(service.dueDate).toISOString().split('T')[0]
        : "";
      
      setForm({
        name: service.name || "",
        serviceType: service.serviceType || "",
        description: service.description || "",
        costPrice: service.costPrice.toString() || "",
        servicePrice: service.servicePrice.toString() || "",
        dueDate: dueDateString,
        notes: service.notes || "",
      });
      // Load payment status
      window.api.database.serviceAppointments.getPaymentStatus(service.id)
        .then(setIsPaid)
        .catch(() => setIsPaid(false));
    }
  }, [service]);

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!service) return;

    setLoading(true);
    try {
      const serviceData = {
        name: form.name.trim(),
        serviceType: form.serviceType.trim(),
        description: form.description.trim() || undefined,
        costPrice: parseFloat(form.costPrice) || 0,
        servicePrice: parseFloat(form.servicePrice) || 0,
        dueDate: form.dueDate ? new Date(form.dueDate) : new Date(service.dueDate),
        notes: form.notes.trim() || undefined,
      };

      await window.api.database.serviceAppointments.update(service.id, serviceData);
      // Update payment status
      await window.api.database.serviceAppointments.updatePaymentStatus(service.id, isPaid);
      onServiceUpdated();
      showToast(t("services.serviceUpdatedSuccessfully", "Service updated successfully"), "success");
      onClose();
    } catch (err) {
      showToast(t("services.failedToSaveService", "Failed to save service"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintServiceLabel = async () => {
    if (!service) return;
    const labelPrinterName = (await window.api.database.options.get("labelPrinterName")) ?? "";
    if (!labelPrinterName.trim()) {
      setShowNoLabelPrinterModal(true);
      return;
    }
    try {
      await printServiceLabel(
        {
          serviceName: form.name.trim(),
          clientName: service.client?.name ?? "",
          deviceName: (form.description || form.serviceType || "").trim(),
          price: form.servicePrice || 0,
          isPaid,
        },
        1,
        {
          service: t('services.serviceLabelService', 'Service:'),
          client: t('services.serviceLabelClient', 'Client:'),
          device: t('services.serviceLabelDevice', 'Device:'),
          price: t('services.serviceLabelPrice', 'Price:'),
          payed: t('services.payed', 'Payed'),
          notPayed: t('services.notPayed', 'Not payed'),
        }
      );
      showToast(t("services.serviceLabelPrinted", "Service label printed successfully"), "success");
    } catch (err) {
      showToast(t("services.serviceLabelPrintError", "Failed to print service label"), "error");
    }
  };

  // Print Service Ticket function (same as in addServiceForm)
  const printServiceTicket = async () => {
    if (!service) return;

    const receiptPrinterName = (await window.api.database.options.get("receiptPrinterName")) ?? "";
    if (!receiptPrinterName.trim()) {
      setShowNoReceiptPrinterModal(true);
      return;
    }
    
    // Get current payment status
    const currentIsPaid = isPaid;

    // Receipt translations
    const receiptTranslations = {
      fr: {
        address: "Adresse",
        phone: "Téléphone",
        date: "Date",
        time: "Heure",
        client: "Client",
        serviceName: "Service",
        serviceType: "Type",
        deviceName: "Nom de l'appareil",
        problems: "Problèmes/Pannes",
          dueDate: "Date d'échéance",
          servicePrice: "Prix du service",
          payed: "Payé",
          notPayed: "Non Payé",
          storeManagement: "Gestion de Magasin",
        systemDevelopedBy: "Ce système est développé par REDA TECH",
        contact: "Contact",
        thankYou: "Merci pour votre confiance",
        comeAgain: "À bientôt",
        appreciate: "Nous apprécions votre visite",
        serviceTicketThankYou: "Merci de nous avoir choisis",
        serviceTicketComeAgain: "Revenez nous voir",
        ticketId: "ID du ticket",
        ticketTitle: "BON DU SERVICE",
      },
      en: {
        address: "Address",
        phone: "Phone",
        date: "Date",
        time: "Time",
        client: "Client",
        serviceName: "Service",
        serviceType: "Type",
        deviceName: "Device Name",
        problems: "Problems/Breakdowns",
        dueDate: "Due Date",
          servicePrice: "Service Price",
          payed: "Payed",
          notPayed: "Not Payed",
          storeManagement: "Store Management",
          systemDevelopedBy: "This System is developed by REDA TECH",
          contact: "Contact",
          thankYou: "Thank you for your trust",
          comeAgain: "See you soon",
          appreciate: "We appreciate your visit",
          serviceTicketThankYou: "Thank you for choosing us",
          serviceTicketComeAgain: "See you soon",
          ticketId: "Ticket ID",
          ticketTitle: "SERVICE TICKET",
        },
      ar: {
        address: "العنوان",
        phone: "الهاتف",
        date: "التاريخ",
        time: "الوقت",
        client: "العميل",
        serviceName: "الخدمة",
        serviceType: "النوع",
        deviceName: "اسم الجهاز",
        problems: "المشاكل/الأعطال",
        dueDate: "تاريخ الاستحقاق",
          servicePrice: "سعر الخدمة",
          payed: "مدفوع",
          notPayed: "غير مدفوع",
          storeManagement: "إدارة المتجر",
          systemDevelopedBy: "تم تطوير هذا النظام بواسطة REDA TECH",
          contact: "اتصل",
          thankYou: "شكرًا لثقتك",
          comeAgain: "نراك قريبًا",
          appreciate: "نقدر زيارتك",
          serviceTicketThankYou: "شكراً لاختيارك لنا",
          serviceTicketComeAgain: "نراك قريباً",
          ticketId: "معرف التذكرة",
          ticketTitle: "تذكرة الخدمة",
        },
    };

    // Load admin receipt settings
    let storeInfo = {
      name: "Store Management",
      address: "Your Store Address",
      phone: "Phone: +1234567890",
    };
    let storeLogo: string | null = null;
    let footerMessage = "";
    let language: "fr" | "en" | "ar" = "fr";
    let logoInverted = false;
    let logoSize = 100; // Default logo size

    try {
      const [name, address, phone, phones, footer, loadedLanguage, logo, needsInversion, logoSizeStr] = await Promise.all([
        window.api.database.options.get("storeName"),
        window.api.database.options.get("storeAddress"),
        window.api.database.options.get("storePhone"),
        window.api.database.options.get("storePhoneNumbers"),
        window.api.database.options.get("serviceTicketFooterMessage"),
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
        ? allPhones.map(p => `${receiptTranslations[language].phone}: ${p}`).join('<br>')
        : `${receiptTranslations[language].phone}: +1234567890`;

      storeInfo = {
        name: name || "Store Management",
        address: address ? `${receiptTranslations[language].address}: ${address}` : `${receiptTranslations[language].address}: Your Store Address`,
        phone: phoneDisplay,
      };
      footerMessage = footer || "";
    } catch (error) {
      console.error("Failed to load store information:", error);
    }

    const currentDate = new Date();
    const serviceNumber = service.id.substring(0, 8);

    // Generate barcode from service ID
    const generateServiceBarcodeData = () => {
      try {
        return generateReceiptBarcode(service.id, {
          format: 'CODE128',
          width: 3,
          height: 80,
          displayValue: false,
          fontSize: 12,
          margin: 10,
        });
      } catch (error) {
        console.error('Failed to generate service barcode:', error);
        return null;
      }
    };

    const serviceBarcode = generateServiceBarcodeData();
    const dueDateString = form.dueDate || service.dueDate;

    // Generate service ticket HTML (same structure as addServiceForm)
    const generateTicketHTML = () => {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Service Ticket - Bon de Réparation</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact; }
              html, body { margin: 0; padding: 0; width: 100%; height: 100%; font-family: 'Courier New', monospace; background: #f5f5f5; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact; }
              body { margin-top: 0 !important; padding-top: 0 !important; }
              .receipt { width: 70mm; max-width: 70mm; margin: 0; background: white; border: none; border-radius: 0; padding: 4px; box-shadow: none; font-size: 12px; overflow: visible; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact; text-rendering: optimizeLegibility; }
              .receipt * { print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact; }
              img, svg { image-rendering: auto; max-width: 100%; height: auto; }
              .receipt[dir="rtl"] { direction: rtl; }
              .receipt[dir="rtl"] .header { text-align: center; }
              .receipt[dir="rtl"] .store-name { text-align: center; }
              .receipt[dir="rtl"] .service-field-label { text-align: right; }
              .receipt[dir="rtl"] .service-field-value { text-align: right; }
              .receipt[dir="rtl"] .service-field-multiline .service-field-value { text-align: right; }
              .receipt[dir="rtl"] .receipt-id { text-align: center; }
              .receipt[dir="rtl"] .welcome { text-align: center; }
              .receipt[dir="rtl"] .watermark { text-align: right; }
              .receipt[dir="rtl"] .service-field-value.service-price-value { direction: ltr; text-align: right; unicode-bidi: embed; }
              .header { text-align: center; margin-bottom: 1px; margin-top: 0; }
              .store-name { font-size: 36px; font-weight: 900; margin-bottom: 1px; margin-top: 0; padding-top: 0; color: #000000; letter-spacing: 1px; }
              .store-logo { max-width: ${Math.round(300 * (logoSize / 100))}px; max-height: ${Math.round(120 * (logoSize / 100))}px; width: auto; height: auto; margin: 0 auto 6px auto; display: block; filter: grayscale(100%) contrast(300%) brightness(0.3); image-rendering: auto; image-rendering: -webkit-optimize-contrast; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact; }
              .store-logo.inverted { filter: grayscale(100%) contrast(300%) brightness(0.3) invert(1); }
              @media print { .store-name { text-shadow: none; -webkit-font-smoothing: none; font-smooth: never; } .store-logo { max-width: ${Math.round(250 * (logoSize / 100))}px; max-height: ${Math.round(100 * (logoSize / 100))}px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; } }
              .store-info { font-size: 11px; margin-bottom: 3px; color: #000; font-weight: 900; line-height: 1.3; }
              .receipt-info { font-size: 11px; margin-bottom: 10px; color: #000; font-weight: 900; line-height: 1.4; }
              .divider { border-top: 1px solid #000000; margin: 2px 0; }
              .ticket-title { text-align: center; font-size: 18px; font-weight: 900; margin: 8px 0; color: #000; text-transform: uppercase; letter-spacing: 1px; }
              .service-info { margin: 8px 0; color: #000; }
              .service-field { margin-bottom: 10px; display: flex; width: 100%; justify-content: space-between; align-items: flex-start; }
              .service-field-label { font-weight: 900; font-size: 15px; color: #000; padding-right: 10px; flex-shrink: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
              .service-field-label.service-name-label,
              .service-field-label.service-type-label { font-size: 15px; font-weight: 900; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
              .service-field-value { font-weight: 900; text-align: left; font-size: 16px; color: #000000; margin-left: 10px; display: block; flex: 1; min-width: 0; word-wrap: normal; word-break: normal; overflow-wrap: normal; white-space: normal; line-height: 1.4; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
              .service-field-multiline { margin-bottom: 10px; align-items: flex-start; }
              .service-field-multiline .service-field-label { font-weight: 900; font-size: 15px; color: #000; padding-right: 10px; flex-shrink: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
              .service-field-multiline .service-field-value { font-weight: 900; text-align: left; font-size: 16px; color: #000000; margin-left: 10px; display: block; flex: 1; min-width: 0; word-wrap: normal; word-break: normal; overflow-wrap: normal; white-space: normal; line-height: 1.4; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
              .service-field-problems { display: block; }
              .service-field-problems .service-field-label { display: block; margin-bottom: 8px; width: 100%; font-weight: 900; font-size: 15px; color: #000; }
              .service-field-problems .service-field-value { display: block; padding-left: 20px; text-align: left; margin-left: 0; }
              .client-info { margin-bottom: 4px; font-size: 11px; color: #000; font-weight: 900; line-height: 1.3; }
              .receipt-id { text-align: center; margin: 10px 0 2px 0; padding: 2px 0; border-top: 1px solid #000000; }
              .receipt-id-text { font-size: 11px; margin-top: 2px; color: #000; font-weight: 900; }
              .welcome { text-align: center; margin-top: 4px; font-size: 11px; font-weight: 900; color: #000; line-height: 1.4; }
              .watermark { text-align: left; margin-top: 4px; padding-top: 3px; border-top: 1px solid #000000; font-size: 9px; color: #000; font-weight: 900; line-height: 1.3; }
              @page { size: 70mm auto; margin: 0; padding: 0; }
              @media print { * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; } body { margin: 0; padding: 0px; background: white !important; width: 77mm; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; -webkit-font-smoothing: none; font-smooth: never; text-rendering: optimizeLegibility; } .receipt { width: 77mm; margin: 0; max-width: 77mm; border: none; border-radius: 0; padding: 2px 3px 0px 0px; box-shadow: none; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; -webkit-font-smoothing: none; font-smooth: never; text-rendering: optimizeLegibility; } img, svg { image-rendering: auto; image-rendering: -webkit-optimize-contrast; max-width: 100%; height: auto; } }
            </style>
          </head>
          <body>
            <div class="receipt"${language === "ar" ? ' dir="rtl"' : ''}>
              <div class="header">
                ${storeLogo ? `
                  <img src="${storeLogo}" alt="Store Logo" class="store-logo${logoInverted ? ' inverted' : ''}" />
                ` : `
                  <div class="store-name">${storeInfo.name}</div>
                `}
                <div class="store-info">${storeInfo.address}</div>
                <div class="store-info">${storeInfo.phone}</div>
              </div>
              <div class="receipt-info">
                <div>${receiptTranslations[language].date}: ${currentDate.toLocaleDateString()}</div>
                <div>${receiptTranslations[language].time}: ${currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              ${service.client ? `<div class="client-info">${receiptTranslations[language].client}: ${service.client.name}</div>` : ""}
              <div class="divider"></div>
              <div class="ticket-title">${receiptTranslations[language].ticketTitle}</div>
              <div class="divider"></div>
              <div class="service-info">
                <div class="service-field">
                  <span class="service-field-label service-name-label">${receiptTranslations[language].serviceName}:</span>
                  <span class="service-field-value">${form.name || service.name}</span>
                </div>
                <div class="service-field">
                  <span class="service-field-label service-type-label">${receiptTranslations[language].serviceType}:</span>
                  <span class="service-field-value">${form.serviceType || service.serviceType}</span>
                </div>
                ${(form.description || service.description) ? `
                <div class="service-field service-field-multiline">
                  <span class="service-field-label">${receiptTranslations[language].deviceName}:</span>
                  <span class="service-field-value">${form.description || service.description || ""}</span>
                </div>
                ` : ""}
                ${(form.notes || service.notes) ? `
                <div class="service-field service-field-multiline service-field-problems">
                  <span class="service-field-label">${receiptTranslations[language].problems}:</span>
                  <span class="service-field-value">${form.notes || service.notes || ""}</span>
                </div>
                ` : ""}
                <div class="service-field">
                  <span class="service-field-label">${receiptTranslations[language].dueDate}:</span>
                  <span class="service-field-value">${new Date(dueDateString).toLocaleDateString()}</span>
                </div>
                <div class="service-field">
                  <span class="service-field-label">${receiptTranslations[language].servicePrice}:</span>
                  <span class="service-field-value service-price-value" dir="ltr">\u200E${(parseFloat(form.servicePrice) || service.servicePrice).toLocaleString('en-US')} DA ${currentIsPaid ? `(${receiptTranslations[language].payed})` : `(${receiptTranslations[language].notPayed})`}</span>
                </div>
              </div>
              <div class="divider"></div>
              <div class="receipt-id">
                ${serviceBarcode ? `
                  <div style="text-align: center; margin-bottom: 2px;">
                    <img src="${serviceBarcode}" alt="Service Barcode" style="max-width: 100%; height: 80px; image-rendering: auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact;" />
                  </div>
                ` : ''}
                <div class="receipt-id-text">${receiptTranslations[language].ticketId}: ${serviceNumber}</div>
              </div>
              <div class="welcome">
                ${footerMessage ? footerMessage.split('\n').map(line => `<div>${line}</div>`).join('') : `
                  <div>${receiptTranslations[language].serviceTicketThankYou}</div>
                  <div>${receiptTranslations[language].serviceTicketComeAgain}</div>
                `}
              </div>
              <div class="watermark">
                <div>${receiptTranslations[language].systemDevelopedBy}</div>
                <div>${receiptTranslations[language].contact}: 0793420745</div>
              </div>
            </div>
          </body>
        </html>
      `;
    };

    try {
      const ticketHTML = generateTicketHTML();
      
      // Use iframe method that respects CSS @page rule (like the receipt printing)
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
        showToast("Failed to initialize print", "error");
        document.body.removeChild(iframe);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(ticketHTML);
      iframeDoc.close();

      iframe.onload = () => {
        setTimeout(async () => {
          try {
            if (window.api?.app?.printSilently) {
              const iframeHTML = iframeDoc.documentElement.outerHTML;
              const deviceName = (await window.api.database.options.get("receiptPrinterName")) || "";
              window.api.app.printSilently(`<!DOCTYPE html>${iframeHTML}`, deviceName)
                .then(() => {
                  showToast(t("services.printSuccess", "Service ticket sent to printer"), "success");
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
            showToast(t("services.printTicketError", "Failed to print service ticket"), "error");
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }
        }, 200); // Delay to ensure CSS is loaded
      };
    } catch (error) {
      console.error("Print error:", error);
      showToast(t("services.printTicketError", "Failed to print service ticket"), "error");
    }
  };

  if (!service) return null;

  return (
    <>
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()} 
      size="xl"
      title={t("services.editService", "Edit Service")}
      icon={<Wrench className="w-5 h-5 text-cyan-600" />}
      showCloseButton={true}
    >
      <div className="p-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Service Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("services.serviceName", "Service Name")} *
              </label>
              <input
                type="text"
                placeholder={t("services.enterServiceName", "Enter service name")}
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                required
              />
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("services.serviceType", "Service Type")} *
              </label>
              <input
                type="text"
                placeholder={t("services.enterServiceType", "Enter service type")}
                value={form.serviceType}
                onChange={(e) => handleFormChange("serviceType", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                required
              />
            </div>

            {/* Cost Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("services.costPrice", "Cost Price")} ({t("common.currency", "DA")})
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={t("services.enterCostPrice", "Enter cost price")}
                value={form.costPrice}
                onChange={(e) => handleFormChange("costPrice", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </div>

            {/* Service Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("services.servicePrice", "Service Price")} ({t("common.currency", "DA")}) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={t("services.enterServicePrice", "Enter service price")}
                value={form.servicePrice}
                onChange={(e) => handleFormChange("servicePrice", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("services.description", "Description")}
              </label>
              <input
                type="text"
                placeholder={t("services.enterDescriptionOptional", "Enter device name (optional)")}
                value={form.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("services.notes", "Notes")}
              </label>
              <input
                type="text"
                placeholder={t("services.enterNotesOptional", "Enter notes (optional)")}
                value={form.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setIsPaid(true)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isPaid
                        ? 'bg-cyan-600 border-cyan-600 text-white'
                        : 'border-gray-300 hover:border-cyan-400 dark:border-gray-600 dark:hover:border-cyan-500'
                    }`}
                  >
                    {isPaid && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className="text-sm">{t("services.payed", "Payed")}</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setIsPaid(false)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      !isPaid
                        ? 'bg-cyan-600 border-cyan-600 text-white'
                        : 'border-gray-300 hover:border-cyan-400 dark:border-gray-600 dark:hover:border-cyan-500'
                    }`}
                  >
                    {!isPaid && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className="text-sm">{t("services.notPayed", "Not Payed")}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Client Info (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("services.client", "Client")}
            </label>
            <div className="w-full px-4 py-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
              {service.client ? (
                <>
                  <div className="font-medium">{service.client.name}</div>
                  {service.client.phone && (
                    <div className="text-sm text-muted-foreground">{service.client.phone}</div>
                  )}
                </>
              ) : (
                <div className="font-medium italic">{t("services.noClient", "No client assigned")}</div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("services.clientCannotBeChanged", "Client cannot be changed after service creation")}
            </p>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("services.dueDate", "Due Date")} *
            </label>
            <DatePicker
              value={form.dueDate}
              onChange={(date) => handleFormChange("dueDate", date)}
              placeholder={t("services.selectDueDate", "Select due date")}
              className="w-full h-12 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={printServiceTicket}
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              {t("services.printTicket", "Print Ticket")}
            </Button>
            <Tooltip
              content={form.name?.trim() ? t("services.printServiceLabelTooltip", "Print service label(s)") : t("services.serviceNameRequiredForLabel", "Service name is required to print a label")}
              position="top"
            >
              <Button
                type="button"
                disabled={!form.name?.trim()}
                onClick={() => handlePrintServiceLabel()}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                {t("services.printServiceLabel", "Print Service Label")}
              </Button>
            </Tooltip>
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("services.updating", "Updating...")}
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  {t("services.updateService", "Update Service")}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
    <NoPrinterModal
      open={showNoReceiptPrinterModal}
      onOpenChange={setShowNoReceiptPrinterModal}
      printerType="receipt"
    />
    <NoPrinterModal
      open={showNoLabelPrinterModal}
      onOpenChange={setShowNoLabelPrinterModal}
      printerType="label"
    />
    </>
  );
}
