import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Wrench, Loader2, Check, User, Plus, Users, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { DatePicker } from "../../../lib/components/datePicker";
import { Popover, PopoverContent, PopoverTrigger } from "../../../lib/components/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "../../../lib/components/command";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";
import { cn } from "../../../lib/utils";
import AddClientModal from "../../../pages/cashier/components/addClientModal";
import { generateReceiptBarcode } from "../../../lib/utils/barcodeVisual";
import { printServiceLabel } from "../utils/serviceLabelPrintUtils";
import { NoPrinterModal } from "../../../lib/components/noPrinterModal";
import { Tooltip } from "../../../lib/components/tooltip";

interface Client {
  id: string;
  name: string;
  phone?: string;
}

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

interface AddServiceFormProps {
  openPanel: "add" | null;
  setOpenPanel: React.Dispatch<React.SetStateAction<"add" | null>>;
  editingService?: ServiceAppointment | null;
  onServiceAdded?: () => void;
  onServiceUpdated?: () => void;
}

const initialForm = {
    name: "",
    serviceType: "",
    description: "",
  costPrice: "",
  servicePrice: "",
    clientId: "",
    dueDate: "",
    notes: "",
};

export default function AddServiceForm({
  openPanel,
  setOpenPanel,
  editingService,
  onServiceAdded,
  onServiceUpdated,
}: AddServiceFormProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [serviceNameToTypeMap, setServiceNameToTypeMap] = useState<Map<string, string>>(new Map());
  const [isExistingService, setIsExistingService] = useState(false);
  
  // Enhanced dropdown states
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [filteredTypes, setFilteredTypes] = useState<string[]>([]);
  const [filteredNames, setFilteredNames] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(-1);
  const [selectedNameIndex, setSelectedNameIndex] = useState(-1);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Add client modal state
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [showNoReceiptPrinterModal, setShowNoReceiptPrinterModal] = useState(false);
  const [showNoLabelPrinterModal, setShowNoLabelPrinterModal] = useState(false);
  const [hideCostPrice, setHideCostPrice] = useState(true);
  const initialIsPaidRef = useRef<boolean | null>(null);

  // Refs for dropdown management and field navigation
  const typeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const clientButtonRef = useRef<HTMLButtonElement>(null);
  const costPriceRef = useRef<HTMLInputElement>(null);
  const servicePriceRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingService) {
      setForm({
        name: editingService.name,
        serviceType: editingService.serviceType,
        description: editingService.description || "",
        costPrice: editingService.costPrice.toString(),
        servicePrice: editingService.servicePrice.toString(),
        clientId: editingService.clientId,
        dueDate: editingService.dueDate.split('T')[0],
        notes: editingService.notes || "",
      });
      setSelectedClient(editingService.client ? { id: editingService.client.id, name: editingService.client.name, phone: editingService.client.phone } : null);
      setIsExistingService(true);
      // Load payment status and store initial for change detection
      window.api.database.serviceAppointments.getPaymentStatus(editingService.id)
        .then((status) => {
          initialIsPaidRef.current = status;
          setIsPaid(status);
        })
        .catch(() => {
          initialIsPaidRef.current = false;
          setIsPaid(false);
        });
    } else {
      initialIsPaidRef.current = null;
      // Set default due date to 3 days later for new services
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      const defaultDateString = defaultDate.toISOString().split('T')[0];
      
      setForm({
        ...initialForm,
        dueDate: defaultDateString,
      });
      setIsExistingService(false);
      setIsPaid(false);
    }
  }, [editingService, openPanel]);

  useEffect(() => {
    if (openPanel) {
      loadServiceData();
    }
  }, [openPanel]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is on a dropdown item (don't close if clicking on dropdown items)
      if (target.closest("[data-type-dropdown]") || target.closest("[data-name-dropdown]")) {
        return;
      }
      
      // Close dropdowns
      setShowTypeDropdown(false);
      setSelectedTypeIndex(-1);
      setShowNameDropdown(false);
      setSelectedNameIndex(-1);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadServiceData = async () => {
    try {
      const [clientsData, typesData, namesData, allAppointments] = await Promise.all([
        window.api.database.clients.getAll(),
        window.api.database.serviceAppointments.getServiceTypes(),
        window.api.database.serviceAppointments.getServiceNames(),
        window.api.database.serviceAppointments.getAll()
      ]);
      setClients(clientsData);
      setServiceTypes(typesData);
      setServiceNames(namesData);
      setFilteredNames(namesData); // Initialize filtered names
      
      // Create a map from service name to service type
      // Use the most recent occurrence of each service name
      const nameToTypeMap = new Map<string, string>();
      allAppointments.forEach((appointment: { name: string; serviceType: string }) => {
        // Only update if not already in map (keeps the first/most recent occurrence)
        if (!nameToTypeMap.has(appointment.name)) {
          nameToTypeMap.set(appointment.name, appointment.serviceType);
        }
      });
      setServiceNameToTypeMap(nameToTypeMap);
    } catch (error) {
      console.error("Error loading service data:", error);
    }
  };

  const handleAddClient = async () => {
    try {
      const newClient = await window.api.database.clients.create({
        name: clientName.trim(),
        phone: clientPhone.trim() || undefined,
        address: clientAddress.trim() || undefined,
        notes: clientNotes.trim() || undefined,
      });
      
      // Refresh clients list
      await loadServiceData();
      
      // Select the newly created client
      const updatedClients = await window.api.database.clients.getAll();
      const createdClient = updatedClients.find((c: Client) => c.id === newClient.id);
      if (createdClient) {
        selectClient(createdClient);
        setClientPopoverOpen(false);
      }
      const lines = ["From service form:", `Client: ${newClient.name}`];
      if (newClient.phone?.trim()) lines.push(`Phone: ${newClient.phone.trim()}`);
      if (newClient.address?.trim()) lines.push(`Address: ${newClient.address.trim()}`);
      if (newClient.notes?.trim()) lines.push(`Notes: ${newClient.notes.trim()}`);
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.clientAdded",
        details: lines.join("\n"),
      }).catch(() => {});
      // Reset form and close modal
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setClientNotes("");
      setShowAddClientModal(false);
      
      showToast(t("clients.addSuccess", "Client added successfully"), "success");
    } catch (error) {
      console.error("Error adding client:", error);
      showToast(t("clients.addError", "Failed to add client"), "error");
    }
  };

  const handleFormChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const filteredClients = clients
    .filter(
      (client) =>
        client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (client.phone &&
          client.phone.toLowerCase().includes(clientSearch.toLowerCase())),
    )
    .slice(0, 100);


  // Enhanced type search with filtering
  const handleTypeSearch = (value: string) => {
    setForm((prev) => ({ ...prev, serviceType: value }));
    
    if (value.trim()) {
      const filtered = serviceTypes.filter((type) =>
        type.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredTypes(filtered);
      setShowTypeDropdown(true);
      setSelectedTypeIndex(-1);
    } else {
      setFilteredTypes([]);
      setShowTypeDropdown(false);
      setSelectedTypeIndex(-1);
    }
  };

  // Keyboard navigation for type dropdown
  const handleTypeKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        if (!showTypeDropdown || filteredTypes.length === 0) return;
        e.preventDefault();
        setSelectedTypeIndex(prev => 
          prev < filteredTypes.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        if (!showTypeDropdown || filteredTypes.length === 0) return;
        e.preventDefault();
        setSelectedTypeIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case "Enter":
        e.preventDefault();
        if (showTypeDropdown && selectedTypeIndex >= 0 && selectedTypeIndex < filteredTypes.length) {
          selectType(filteredTypes[selectedTypeIndex]);
        } else {
          // If no dropdown or no selection, navigate to next field
          handleFieldKeyDown(e, "type");
        }
        break;
      case "Escape":
        setShowTypeDropdown(false);
        setSelectedTypeIndex(-1);
        break;
    }
  };

  // Service name search handler
  const handleNameSearch = (value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
    
    if (value.trim()) {
      const filtered = serviceNames.filter((name) =>
        name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredNames(filtered);
      setShowNameDropdown(true);
      setSelectedNameIndex(-1);
    } else {
      setFilteredNames([]);
      setShowNameDropdown(false);
      setSelectedNameIndex(-1);
    }
  };

  // Keyboard navigation for name dropdown
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        if (!showNameDropdown || filteredNames.length === 0) return;
        e.preventDefault();
        setSelectedNameIndex(prev => 
          prev < filteredNames.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        if (!showNameDropdown || filteredNames.length === 0) return;
        e.preventDefault();
        setSelectedNameIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case "Enter":
        e.preventDefault();
        if (showNameDropdown && selectedNameIndex >= 0 && selectedNameIndex < filteredNames.length) {
          selectName(filteredNames[selectedNameIndex]);
        } else {
          // If no dropdown or no selection, navigate to next field
          handleFieldKeyDown(e, "name");
        }
        break;
      case "Escape":
        setShowNameDropdown(false);
        setSelectedNameIndex(-1);
        break;
    }
  };

  // Select client
  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setForm(prev => ({ ...prev, clientId: client.id }));
  };

  // Select type
  const selectType = (type: string) => {
    setForm(prev => ({ ...prev, serviceType: type }));
    setShowTypeDropdown(false);
    setSelectedTypeIndex(-1);
  };

  const selectName = (name: string) => {
    // Automatically set the service type when a service name is selected
    const correspondingType = serviceNameToTypeMap.get(name);
    if (correspondingType) {
      setForm(prev => ({ ...prev, name: name, serviceType: correspondingType }));
    } else {
      setForm(prev => ({ ...prev, name: name }));
    }
    setShowNameDropdown(false);
    setSelectedNameIndex(-1);
  };

  // Keyboard navigation between fields
  const handleFieldKeyDown = (e: React.KeyboardEvent, currentField: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      // Close any open dropdowns first
      setShowTypeDropdown(false);
      setShowNameDropdown(false);
      setSelectedTypeIndex(-1);
      setSelectedNameIndex(-1);
      
      // Navigate to next field
      switch (currentField) {
        case "name":
          typeInputRef.current?.focus();
          break;
        case "type":
          clientButtonRef.current?.click();
          break;
        case "client":
          costPriceRef.current?.focus();
          break;
        case "dueDate":
          costPriceRef.current?.focus();
          break;
        case "costPrice":
          servicePriceRef.current?.focus();
          break;
        case "servicePrice":
          descriptionRef.current?.focus();
          break;
        case "description":
          notesRef.current?.focus();
          break;
        case "notes":
          // Submit form if on last field
          handleAddService(e as React.FormEvent);
          break;
      }
    }
  };

  // Print Service Ticket function
  const printServiceTicket = async (
    serviceId: string,
    serviceName: string,
    serviceType: string,
    description: string,
    notes: string,
    dueDate: string,
    servicePrice: number,
    clientName?: string,
    isPaid = false
  ) => {
    const receiptPrinterName = (await window.api.database.options.get("receiptPrinterName")) ?? "";
    if (!receiptPrinterName.trim()) {
      setShowNoReceiptPrinterModal(true);
      return;
    }
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
    const serviceNumber = serviceId.substring(0, 8);

    // Generate barcode from service ID (8 characters max)
    const generateServiceBarcodeData = () => {
      try {
        return generateReceiptBarcode(serviceId, {
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

    // Generate service ticket HTML
    const generateTicketHTML = () => {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Service Ticket - Bon de Réparation</title>
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
              .receipt[dir="rtl"] .service-field-value.service-price-value {
                direction: ltr;
                text-align: right;
                unicode-bidi: embed;
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
                  image-rendering: -webkit-optimize-contrast;
                  image-rendering: crisp-edges;
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
              .ticket-title {
                text-align: center;
                font-size: 18px;
                font-weight: 900;
                margin: 8px 0;
                color: #000;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .service-info {
                margin: 8px 0;
                color: #000;
              }
              .service-field {
                margin-bottom: 10px;
                display: flex;
                width: 100%;
                justify-content: space-between;
                align-items: flex-start;
              }
              .service-field-label {
                font-weight: 900;
                font-size: 15px;
                color: #000;
                padding-right: 10px;
                flex-shrink: 0;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              .service-field-label.service-name-label,
              .service-field-label.service-type-label {
                font-size: 15px;
                font-weight: 900;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              .service-field-value {
                font-weight: 900;
                text-align: left;
                font-size: 16px;
                color: #000000;
                margin-left: 10px;
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
                margin-bottom: 10px;
                align-items: flex-start;
              }
              .service-field-multiline .service-field-label {
                font-weight: 900;
                font-size: 15px;
                color: #000;
                padding-right: 10px;
                flex-shrink: 0;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              .service-field-multiline .service-field-value {
                font-weight: 900;
                text-align: left;
                font-size: 16px;
                color: #000000;
                margin-left: 10px;
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
                margin-bottom: 8px;
                width: 100%;
                font-weight: 900;
                font-size: 15px;
                color: #000;
              }
              .service-field-problems .service-field-value {
                display: block;
                padding-left: 20px;
                text-align: left;
                margin-left: 0;
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
            <div class="receipt"${language === "ar" ? ' dir="rtl"' : ''}>
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
                <div>${receiptTranslations[language].date}: ${currentDate.toLocaleDateString()}</div>
                <div>${receiptTranslations[language].time}: ${currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>

              <!-- Client Info -->
              ${clientName ? `<div class="client-info">${receiptTranslations[language].client}: ${clientName}</div>` : ""}

              <div class="divider"></div>

              <!-- Ticket Title -->
              <div class="ticket-title">${receiptTranslations[language].ticketTitle}</div>

              <div class="divider"></div>

              <!-- Service Information -->
              <div class="service-info">
                <div class="service-field">
                  <span class="service-field-label service-name-label">${receiptTranslations[language].serviceName}:</span>
                  <span class="service-field-value">${serviceName}</span>
                </div>
                <div class="service-field">
                  <span class="service-field-label service-type-label">${receiptTranslations[language].serviceType}:</span>
                  <span class="service-field-value">${serviceType}</span>
                </div>
                ${description ? `
                <div class="service-field service-field-multiline">
                  <span class="service-field-label">${receiptTranslations[language].deviceName}:</span>
                  <span class="service-field-value">${description}</span>
                </div>
                ` : ""}
                ${notes ? `
                <div class="service-field service-field-multiline service-field-problems">
                  <span class="service-field-label">${receiptTranslations[language].problems}:</span>
                  <span class="service-field-value">${notes}</span>
                </div>
                ` : ""}
                <div class="service-field">
                  <span class="service-field-label">${receiptTranslations[language].dueDate}:</span>
                  <span class="service-field-value">${new Date(dueDate).toLocaleDateString()}</span>
                </div>
                <div class="service-field">
                  <span class="service-field-label">${receiptTranslations[language].servicePrice}:</span>
                  <span class="service-field-value service-price-value" dir="ltr">\u200E${servicePrice.toLocaleString('en-US')} DA ${isPaid ? `(${receiptTranslations[language].payed})` : `(${receiptTranslations[language].notPayed})`}</span>
                </div>
              </div>

              <div class="divider"></div>

              <!-- Service ID with Barcode -->
              <div class="receipt-id">
                ${serviceBarcode ? `
                  <div style="text-align: center; margin-bottom: 2px;">
                    <img src="${serviceBarcode}" alt="Service Barcode" style="max-width: 100%; height: 80px; image-rendering: auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact;" />
                  </div>
                ` : ''}
                <div class="receipt-id-text">${receiptTranslations[language].ticketId}: ${serviceNumber}</div>
              </div>

              <!-- Welcome Message -->
              <div class="welcome">
                ${footerMessage ? footerMessage.split('\n').map(line => `<div>${line}</div>`).join('') : `
                  <div>${receiptTranslations[language].serviceTicketThankYou}</div>
                  <div>${receiptTranslations[language].serviceTicketComeAgain}</div>
                `}
              </div>
              
              <!-- Watermark -->
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

  const handleAddService = async (e: React.FormEvent, shouldPrint = false) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.name.trim() || !form.serviceType.trim() || !form.servicePrice.trim()) {
      showToast(t("services.fillRequiredFields", "Please fill all required fields (Name, Type, Service Price)"), "error");
      return;
    }
    
    // If user wants to print receipt, check receipt printer first; if not set, show modal and do not add service
    if (shouldPrint) {
      const receiptPrinterName = (await window.api.database.options.get("receiptPrinterName")) ?? "";
      if (!receiptPrinterName.trim()) {
        setShowNoReceiptPrinterModal(true);
        return;
      }
    }
    
    // Set costPrice to 0 if empty
    const costPrice = form.costPrice.trim() === "" ? 0 : parseFloat(form.costPrice) || 0;
    const servicePrice = parseFloat(form.servicePrice) || 0;
    
    // Warn if cost price is higher than service price
    if (costPrice > servicePrice) {
      showToast(t("services.costPriceHigherThanServicePrice", "Warning: Cost price is higher than service price. This will result in a loss."), "error");
    }
    
    setLoading(true);
    try {
      // Set default due date to 3 days later if not provided
      let dueDate = form.dueDate;
      if (!dueDate) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 3);
        dueDate = defaultDate.toISOString().split('T')[0];
      }

      if (editingService) {
        // Update existing service
        const serviceData = {
          name: form.name.trim(),
          serviceType: form.serviceType.trim(),
          description: form.description.trim() || undefined,
          costPrice: costPrice,
          servicePrice: servicePrice,
          clientId: form.clientId.trim() || undefined,
          dueDate: new Date(dueDate),
          notes: form.notes.trim() || undefined,
        };

        await window.api.database.serviceAppointments.update(editingService.id, serviceData);
        // Update payment status
        await window.api.database.serviceAppointments.updatePaymentStatus(editingService.id, isPaid);
        const changeLines: string[] = [];
        if (serviceData.name !== (editingService.name ?? "")) changeLines.push(`Name: ${editingService.name ?? ""} → ${serviceData.name}`);
        if (serviceData.serviceType !== (editingService.serviceType ?? "")) changeLines.push(`Service type: ${editingService.serviceType ?? ""} → ${serviceData.serviceType}`);
        if ((serviceData.description ?? "") !== (editingService.description ?? "")) changeLines.push(`Description: ${editingService.description ?? ""} → ${serviceData.description ?? ""}`);
        if (serviceData.costPrice !== (editingService.costPrice ?? 0)) changeLines.push(`Cost price: ${editingService.costPrice ?? 0} → ${serviceData.costPrice}`);
        if (serviceData.servicePrice !== (editingService.servicePrice ?? 0)) changeLines.push(`Service price: ${editingService.servicePrice ?? 0} → ${serviceData.servicePrice}`);
        const oldDue = editingService.dueDate ? new Date(editingService.dueDate).toISOString().split("T")[0] : "";
        if (dueDate !== oldDue) changeLines.push(`Due date: ${oldDue} → ${dueDate}`);
        if ((serviceData.notes ?? "") !== (editingService.notes ?? "")) changeLines.push(`Notes: ${editingService.notes ?? ""} → ${serviceData.notes ?? ""}`);
        const oldClientName = editingService.client?.name ?? "—";
        const newClientName = selectedClient?.name ?? clients.find((c) => c.id === form.clientId)?.name ?? "—";
        if (oldClientName !== newClientName) changeLines.push(`Client: ${oldClientName} → ${newClientName}`);
        if (initialIsPaidRef.current !== null && isPaid !== initialIsPaidRef.current) {
          changeLines.push(`Payment: ${initialIsPaidRef.current ? "Paid" : "Unpaid"} → ${isPaid ? "Paid" : "Unpaid"}`);
        }
        const detailsStr = changeLines.length > 0
          ? `Service ID: ${editingService.id}\nService: ${serviceData.name}\n${changeLines.join("\n")}`
          : `Service ID: ${editingService.id}\nService: ${serviceData.name}`;
        window.api?.activityLog?.log({
          username: user?.username ?? "unknown",
          action: "activityLog.actions.serviceUpdated",
          details: detailsStr,
        }).catch(() => {});
        onServiceUpdated?.();
        showToast(t("services.serviceUpdatedSuccessfully", "Service updated successfully"), "success");
      } else {
        // Create new service
        const serviceData = {
          name: form.name.trim(),
          serviceType: form.serviceType.trim(),
          description: form.description.trim() || undefined,
          costPrice: costPrice,
          servicePrice: servicePrice,
          clientId: form.clientId.trim() || undefined,
          dueDate: new Date(dueDate),
          notes: form.notes.trim() || undefined,
        };

        const newService = await window.api.database.serviceAppointments.create(serviceData);
        // Save payment status
        if (newService?.id && isPaid) {
          await window.api.database.serviceAppointments.updatePaymentStatus(newService.id, isPaid);
        }
        window.api?.activityLog?.log({
          username: user?.username ?? "unknown",
          action: "activityLog.actions.serviceCreated",
          details: `Service ID: ${newService.id}`,
        }).catch(() => {});
        onServiceAdded?.();
        showToast(t("services.serviceAddedSuccessfully", "Service added successfully"), "success");

        // Print service ticket if requested
        if (shouldPrint && newService?.id) {
          await printServiceTicket(
            newService.id,
            serviceData.name,
            serviceData.serviceType,
            serviceData.description || "",
            serviceData.notes || "",
            dueDate,
            serviceData.servicePrice,
            selectedClient?.name,
            isPaid
          );
        }
      }
      
      setForm(initialForm);
      setIsExistingService(false);
    } catch (err) {
      showToast(t("services.failedToSaveService", "Failed to save service"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintServiceLabel = async () => {
    const labelPrinterName = (await window.api.database.options.get("labelPrinterName_20x40")) ?? (await window.api.database.options.get("labelPrinterName")) ?? "";
    if (!labelPrinterName.trim()) {
      setShowNoLabelPrinterModal(true);
      return;
    }
    try {
      const clientName = selectedClient?.name ?? clients.find((c) => c.id === form.clientId)?.name ?? "";
      await printServiceLabel(
        {
          serviceName: form.name.trim(),
          clientName,
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

  return (
    <>
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <header
        className="flex items-center justify-between p-6 cursor-pointer select-none"
        onClick={() => setOpenPanel(openPanel === "add" ? null : "add")}
        aria-expanded={openPanel === "add"}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
            <Wrench className="w-5 h-5 text-cyan-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {editingService ? t("services.editService", "Edit Service") : isExistingService ? t("services.updateService", "Update Service") : t("services.addService", "Add Service")}
          </h2>
          </div>
        {openPanel === "add" ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </header>
      {openPanel === "add" && (
        <form onSubmit={handleAddService} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Legend>
              <label>{t("services.serviceName", "Service Name")}</label>
              <div className="relative">
                <input
                  ref={nameInputRef}
                  data-field="service-name"
                  type="text"
                  placeholder={t("services.enterServiceName", "Enter service name")}
                  value={form.name}
                  onChange={(e) => handleNameSearch(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  onFocus={() => {
                    if (form.name.trim()) {
                      setShowNameDropdown(true);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  required
                />
                
                {/* Enhanced name dropdown */}
                {showNameDropdown && filteredNames.length > 0 && (
                  <div 
                    data-name-dropdown
                    className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                  >
                    {filteredNames.map((name, index) => (
                      <div
                        key={name}
                        className={cn(
                          "px-4 py-3 cursor-pointer text-sm transition-colors border-b border-border last:border-b-0",
                          index === selectedNameIndex
                            ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300"
                            : "hover:bg-muted text-foreground"
                        )}
                        onClick={() => selectName(name)}
                      >
                        <div className="font-medium">{name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Legend>
            <Legend>
              <label>{t("services.serviceType", "Service Type")}</label>
              <div className="relative">
                <input
                  ref={typeInputRef}
                  data-field="service-type"
                  type="text"
                  placeholder={t("services.enterServiceType", "Enter service type")}
                  value={form.serviceType}
                  onChange={(e) => handleTypeSearch(e.target.value)}
                  onKeyDown={handleTypeKeyDown}
                  onFocus={() => {
                    if (form.serviceType.trim()) {
                      setShowTypeDropdown(true);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  required
                />
                
                {/* Enhanced type dropdown */}
                {showTypeDropdown && filteredTypes.length > 0 && (
                  <div 
                    data-type-dropdown
                    className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                  >
                    {filteredTypes.map((type, index) => (
                      <div
                        key={type}
                        className={cn(
                          "px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between",
                          selectedTypeIndex === index && "bg-muted/50"
                        )}
                        onMouseDown={() => selectType(type)}
                        onMouseEnter={() => setSelectedTypeIndex(index)}
                      >
                        <div className="font-medium text-foreground">{type}</div>
                        {selectedTypeIndex === index && (
                          <Check className="w-4 h-4 text-cyan-600" />
                          )}
                        </div>
                    ))}
                    </div>
                  )}
                </div>
            </Legend>
            <Legend>
              <label>{t("services.client", "Client")} <span className="text-muted-foreground text-xs">({t("common.optional", "Optional")})</span></label>
              <div className="flex gap-2">
                <Popover
                  open={clientPopoverOpen}
                  onOpenChange={(open) => {
                    setClientPopoverOpen(open);
                    if (open) setClientSearch(""); // Reset search when opening
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      ref={clientButtonRef}
                      variant="outline"
                      className="flex-1 justify-start px-4 py-3 h-12 text-sm"
                      aria-label={t("services.client", "Client")}
                      onKeyDown={(e) => handleFieldKeyDown(e, "client")}
                    >
                      {selectedClient ? selectedClient.name : t("services.searchClient", "Search for client")}
                      <ChevronDown className="ml-auto w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50">
                    <Command shouldFilter={false}>
                      <div className="flex items-center border-b">
                        <CommandInput
                          placeholder={t("services.searchClient", "Search for client")}
                          className="h-9 flex-1 border-0"
                          value={clientSearch}
                          onValueChange={setClientSearch}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 mr-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientPopoverOpen(false);
                            setShowAddClientModal(true);
                          }}
                          title={t("cashier.addNewClient", "Add New Client")}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <CommandList>
                        <CommandGroup>
                          {filteredClients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.name}
                              onSelect={() => {
                                selectClient(client);
                                setClientPopoverOpen(false);
                              }}
                            >
                              <User className="w-4 h-4 mr-2" />
                              <div className="flex-1">
                                <div className="font-medium">{client.name}</div>
                                {client.phone && (
                                  <div className="text-sm text-muted-foreground">{client.phone}</div>
                                )}
                              </div>
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  selectedClient?.id === client.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-3 flex items-center justify-center gap-1"
                  onClick={() => setShowAddClientModal(true)}
                  title={t("cashier.addNewClient", "Add New Client")}
                >
                  <Users className="w-4 h-4" />
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Legend>
            <Legend>
              <label>{t("services.dueDate", "Due Date")}</label>
              <DatePicker
                value={form.dueDate}
                onChange={(date) => handleFormChange("dueDate", date)}
                placeholder={t("services.selectDueDate", "Select due date (default: 3 days later)")}
                className="w-full h-12 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                min={new Date().toISOString().split('T')[0]}
              />
            </Legend>
            <Legend>
              <label>{t("services.costPrice", "Cost Price")} ({t("common.currency", "DA")})</label>
              <div className="flex items-center gap-2">
                <input
                  ref={costPriceRef}
                  data-field="service-cost-price"
                  type={hideCostPrice ? "password" : "number"}
                  step="0.01"
                  min="0"
                  placeholder={t("services.enterCostPrice", "Enter cost price")}
                  value={form.costPrice}
                  onChange={(e) => handleFormChange("costPrice", e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, "costPrice")}
                  className={`flex-1 px-4 py-3 rounded-lg border bg-card text-sm focus:outline-none focus:ring-1 transition-all ${
                    form.servicePrice && form.costPrice && parseFloat(form.costPrice) > parseFloat(form.servicePrice)
                      ? "border-red-500 focus:ring-red-500/50 focus:border-red-500"
                      : "border-border focus:ring-cyan-500/50 focus:border-cyan-500"
                  }`}
                />
                <label className="flex items-center space-x-2 cursor-pointer text-sm text-muted-foreground whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHideCostPrice(!hideCostPrice);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      hideCostPrice
                        ? 'bg-cyan-600 border-cyan-600 text-white'
                        : 'border-gray-300 hover:border-cyan-400 dark:border-gray-600 dark:hover:border-cyan-500'
                    }`}
                  >
                    {hideCostPrice && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span 
                    className="text-xs select-none"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHideCostPrice(!hideCostPrice);
                    }}
                  >
                    {t("services.hideCostPrice", "Hide")}
                  </span>
                </label>
              </div>
              {form.servicePrice && form.costPrice && parseFloat(form.costPrice) > parseFloat(form.servicePrice) && (
                <p className="text-xs text-red-500 mt-1">
                  {t("services.costPriceHigherThanServicePrice", "Warning: Cost price is higher than service price. This will result in a loss.")}
                </p>
              )}
            </Legend>
            <Legend>
              <label>{t("services.servicePrice", "Service Price")} ({t("common.currency", "DA")})</label>
            <input
                ref={servicePriceRef}
                data-field="service-price"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("services.enterServicePrice", "Enter service price")}
                value={form.servicePrice}
                onChange={(e) => handleFormChange("servicePrice", e.target.value)}
                onKeyDown={(e) => handleFieldKeyDown(e, "servicePrice")}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              required
            />
            </Legend>
            <Legend>
              <label>{t("services.description", "Description")}</label>
              <input
                ref={descriptionRef}
                type="text"
                placeholder={t("services.enterDescriptionOptional", "Enter device name (optional)")}
                value={form.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                onKeyDown={(e) => handleFieldKeyDown(e, "description")}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </Legend>
            <Legend>
              <label>{t("services.notes", "Notes")}</label>
              <input
                ref={notesRef}
                type="text"
                placeholder={t("services.enterNotesOptional", "Enter notes (optional)")}
                value={form.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                onKeyDown={(e) => handleFieldKeyDown(e, "notes")}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </Legend>
            <Legend>
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
            </Legend>
          </div>
          <hr />
          <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading || !form.name.trim() || !form.serviceType.trim() || !form.servicePrice.trim()}
              className="bg-cyan-600 hover:bg-cyan-700 text-white h-10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editingService ? t("services.updating", "Updating...") : isExistingService ? t("services.updating", "Updating...") : t("services.adding", "Adding...")}
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  {editingService ? t("services.updateService", "Update Service") : isExistingService ? t("services.updateService", "Update Service") : t("services.addService", "Add Service")}
                </>
              )}
          </Button>
          <Button
            type="button"
            disabled={loading || !form.name.trim() || !form.serviceType.trim() || !form.servicePrice.trim()}
            className="bg-cyan-600 hover:bg-cyan-700 text-white h-10 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={(e) => handleAddService(e, true)}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("services.adding", "Adding...")}
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                {t("services.addServiceAndPrintTicket", "Add Service and Print Service Ticket")}
              </>
            )}
          </Button>
          <Tooltip
            content={form.name?.trim() ? t("services.printServiceLabelTooltip", "Print service label(s)") : t("services.serviceNameRequiredForLabel", "Service name is required to print a label")}
            position="top"
          >
            <Button
              type="button"
              disabled={!form.name?.trim()}
              onClick={() => handlePrintServiceLabel()}
              className="bg-cyan-600 hover:bg-cyan-700 text-white h-10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              {t("services.printServiceLabel", "Print Service Label")}
            </Button>
          </Tooltip>
        </div>
      </form>
      )}
      
      <AddClientModal
        open={showAddClientModal}
        onClose={() => {
          setShowAddClientModal(false);
          setClientName("");
          setClientPhone("");
          setClientAddress("");
          setClientNotes("");
        }}
        clientName={clientName}
        setClientName={setClientName}
        clientPhone={clientPhone}
        setClientPhone={setClientPhone}
        clientAddress={clientAddress}
        setClientAddress={setClientAddress}
        clientNotes={clientNotes}
        setClientNotes={setClientNotes}
        t={t}
        onConfirm={handleAddClient}
      />
    </section>
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

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="space-y-2 text-sm [&>label]:font-medium">
      {children}
    </legend>
  );
}

