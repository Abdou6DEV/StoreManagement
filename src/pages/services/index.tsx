import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Wrench, BarChart3, FileText } from "lucide-react";
import { Button } from "../../lib/components/button";
import { Tooltip } from "../../lib/components/tooltip";
import { useTranslation } from "react-i18next";
import { useToast } from "../../lib/contexts/toastContext";
import { useAuth } from "../../lib/contexts/authContext";
import { useOverdueServices } from "../../lib/contexts/overdueServicesContext";
import { useDueSoonServices } from "../../lib/contexts/dueSoonServicesContext";
import ServicesTable from "./components/servicesTable";
import ServicesFilters from "./components/servicesFilters";
import AddServiceForm from "./components/addServiceForm";
import ServiceTypesTable from "./components/serviceTypesTable";

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

export default function ServicesPage() {
  const location = useLocation();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { unseenOverdueServicesCount, markOverdueServicesAsSeen } = useOverdueServices();
  const { unseenDueSoonServicesCount, markDueSoonServicesAsSeen, dueSoonThresholdDays } = useDueSoonServices();
  const notificationAction = (location.state as { notificationAction?: string } | null)?.notificationAction;
  const appliedInitialSearchRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const [openPanel, setOpenPanel] = useState<"add" | null>(null);
  const [showServiceTypes, setShowServiceTypes] = useState(false);
  const [services, setServices] = useState<ServiceAppointment[]>([]);
  const [filteredServicesList, setFilteredServicesList] = useState<ServiceAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    dateFilter: "all",
    startDate: "",
    endDate: "",
    hideProfit: true,
  });
  const [seenOverdueServices, setSeenOverdueServices] = useState<Set<string>>(new Set());
  const [seenDueSoonServices, setSeenDueSoonServices] = useState<Set<string>>(new Set());
  const [newlyOverdueServicesIds, setNewlyOverdueServicesIds] = useState<Set<string>>(new Set());
  const [newlyDueSoonServicesIds, setNewlyDueSoonServicesIds] = useState<Set<string>>(new Set());
  const [isViewingOverdueTable, setIsViewingOverdueTable] = useState(false);
  const [isViewingDueSoonTable, setIsViewingDueSoonTable] = useState(false);
  const [soldServiceIds, setSoldServiceIds] = useState<Set<string>>(new Set());

  // Initialize default date range on first load (from first service date to last service date)
  useEffect(() => {
    const initializeDefaultDates = async () => {
      try {
        const allServices = await window.api.database.serviceAppointments.getAll();
        
        if (allServices.length > 0) {
          const dueDates = allServices
            .map((service: ServiceAppointment) => new Date(service.dueDate))
            .filter((date: Date) => !isNaN(date.getTime()))
            .sort((a: Date, b: Date) => a.getTime() - b.getTime());
          
          if (dueDates.length > 0) {
            const firstDate = dueDates[0];
            const lastDate = dueDates[dueDates.length - 1];
            
            // Format dates as YYYY-MM-DD
            const formatDate = (date: Date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            };
            
            setFilters((prev) => {
              // Only set defaults if dates are not already set
              if (!prev.startDate && !prev.endDate) {
                return {
                  ...prev,
                  startDate: formatDate(firstDate),
                  endDate: formatDate(lastDate),
                };
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error("Error initializing default dates:", error);
      }
    };
    
    initializeDefaultDates();
  }, []); // Only run once on mount

  // Handle notification actions and initial search (e.g. from activity log service ID click)
  useEffect(() => {
    const state = location.state as { notificationAction?: string; search?: string } | null;
    if (state?.search != null && state.search.trim() !== "" && !appliedInitialSearchRef.current) {
      appliedInitialSearchRef.current = true;
      setFilters((prev) => ({ ...prev, search: state.search.trim() }));
      setCurrentPage(1);
      window.history.replaceState({ ...state, search: undefined }, "");
    }
    if (state?.notificationAction === 'overdue') {
      setFilters((prev) => ({ ...prev, dateFilter: 'overdue' }));
    } else if (state?.notificationAction === 'dueSoon') {
      setFilters((prev) => ({ ...prev, dateFilter: 'dueSoon' }));
    }
  }, [location.state]);

  // Load services and service types
  useEffect(() => {
    loadServices();
    loadServiceTypes();
  }, [currentPage, itemsPerPage, filters]);

  const loadServices = async () => {
    try {
      // Only show the full-page "Loading services..." state on first entry to this page.
      // Subsequent table actions (pagination, filters, profit toggle) should not flash the initial loader.
      if (!hasLoadedOnceRef.current) setLoading(true);
      const allServices = await window.api.database.serviceAppointments.getAll();
      
      // Apply filters
      let filteredServices = allServices;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase().trim();
        filteredServices = filteredServices.filter((service: ServiceAppointment) =>
          service.id.toLowerCase().includes(searchLower) ||
          service.name.toLowerCase().includes(searchLower) ||
          service.serviceType.toLowerCase().includes(searchLower) ||
          (service.description && service.description.toLowerCase().includes(searchLower)) ||
          (service.client && service.client.name.toLowerCase().includes(searchLower))
        );
      }
      
      // Status filter
      if (filters.status === "complete") {
        // Show only completed services
        filteredServices = filteredServices.filter((service: ServiceAppointment) => service.isCompleted);
      } else if (filters.status === "incomplete") {
        // Show only incomplete services
        filteredServices = filteredServices.filter((service: ServiceAppointment) => !service.isCompleted);
      } else {
        // Default "all": show all services (both completed and incomplete)
        // No filtering needed - show all services
      }
      
      // Date range filter (from/to dates)
      if (filters.startDate || filters.endDate) {
        filteredServices = filteredServices.filter((service: ServiceAppointment) => {
          const dueDate = new Date(service.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          if (filters.startDate && filters.endDate) {
            const startDate = new Date(filters.startDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            return dueDate >= startDate && dueDate <= endDate;
          } else if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            startDate.setHours(0, 0, 0, 0);
            return dueDate >= startDate;
          } else if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            return dueDate <= endDate;
          }
          return true;
        });
      }
      
      // Date filter (overdue/dueSoon) - only applies if date range is not set
      if (!filters.startDate && !filters.endDate) {
        if (filters.dateFilter === "overdue") {
          const today = new Date();
          filteredServices = filteredServices.filter((service: ServiceAppointment) => {
            const dueDate = new Date(service.dueDate);
            return dueDate < today && !service.isCompleted;
          });
        } else if (filters.dateFilter === "dueSoon") {
          const today = new Date();
          const dueSoonDate = new Date(today.getTime() + dueSoonThresholdDays * 24 * 60 * 60 * 1000);
          filteredServices = filteredServices.filter((service: ServiceAppointment) => {
            const dueDate = new Date(service.dueDate);
            return dueDate >= today && dueDate <= dueSoonDate && !service.isCompleted;
          });
        }
      }
      
      // Calculate newly overdue/due soon services for highlighting
      let currentNewlyOverdueServicesIds = new Set<string>();
      let currentNewlyDueSoonServicesIds = new Set<string>();
      
      if (filters.dateFilter === "overdue") {
        // Mark that we're viewing the overdue table
        setIsViewingOverdueTable(true);
        setIsViewingDueSoonTable(false);
        
        // Only calculate highlighting if we weren't already viewing the overdue table
        if (!isViewingOverdueTable) {
          const overdueServices = filteredServices.filter((service: ServiceAppointment) => {
            const today = new Date();
            const dueDate = new Date(service.dueDate);
            return dueDate < today && !service.isCompleted && !seenOverdueServices.has(service.id);
          });
          currentNewlyOverdueServicesIds = new Set(overdueServices.map((service: ServiceAppointment) => service.id));
          setNewlyOverdueServicesIds(currentNewlyOverdueServicesIds);
          setNewlyDueSoonServicesIds(new Set());
        } else {
          currentNewlyOverdueServicesIds = newlyOverdueServicesIds;
        }
      } else if (filters.dateFilter === "dueSoon") {
        // Mark that we're viewing the due soon table
        setIsViewingOverdueTable(false);
        setIsViewingDueSoonTable(true);
        
        // Only calculate highlighting if we weren't already viewing the due soon table
        if (!isViewingDueSoonTable) {
          const dueSoonServices = filteredServices.filter((service: ServiceAppointment) => {
            const today = new Date();
            const dueDate = new Date(service.dueDate);
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= dueSoonThresholdDays && diffDays >= 0 && !service.isCompleted && !seenDueSoonServices.has(service.id);
          });
          currentNewlyDueSoonServicesIds = new Set(dueSoonServices.map((service: ServiceAppointment) => service.id));
          setNewlyOverdueServicesIds(new Set());
          setNewlyDueSoonServicesIds(currentNewlyDueSoonServicesIds);
        } else {
          currentNewlyDueSoonServicesIds = newlyDueSoonServicesIds;
        }
      } else {
        // Not viewing overdue or due soon tables
        setIsViewingOverdueTable(false);
        setIsViewingDueSoonTable(false);
        setNewlyOverdueServicesIds(new Set());
        setNewlyDueSoonServicesIds(new Set());
      }
      
      // Check sold status for completed services before sorting
      const completedServices = filteredServices.filter((s: ServiceAppointment) => s.isCompleted);
      const currentSoldServiceIds = new Set<string>();
      
      if (completedServices.length > 0) {
        const soldChecks = await Promise.all(
          completedServices.map(async (service: ServiceAppointment) => {
            const isSold = await window.api.database.serviceAppointments.isSold(service.id);
            return { id: service.id, isSold };
          })
        );
        
        soldChecks
          .filter(check => check.isSold)
          .forEach(check => currentSoldServiceIds.add(check.id));
      }
      
      // Also treat services with price 0 as "sold" (finalized) since they're not passed to cashier
      completedServices
        .filter((s: ServiceAppointment) => s.servicePrice === 0)
        .forEach((s: ServiceAppointment) => currentSoldServiceIds.add(s.id));
      
      // Store sold service IDs for the table component to use
      setSoldServiceIds(currentSoldServiceIds);
      
      // Sort services: highlighted first, then incomplete, completed but not sold, completed (sold), all by creation date (latest first)
      filteredServices.sort((a: ServiceAppointment, b: ServiceAppointment) => {
        // First prioritize highlighted services (newly overdue and due soon)
        const aIsHighlighted = currentNewlyOverdueServicesIds.has(a.id) || currentNewlyDueSoonServicesIds.has(a.id);
        const bIsHighlighted = currentNewlyOverdueServicesIds.has(b.id) || currentNewlyDueSoonServicesIds.has(b.id);
        
        if (aIsHighlighted && !bIsHighlighted) return -1;
        if (!aIsHighlighted && bIsHighlighted) return 1;
        
        // If both or neither are highlighted, sort by status priority:
        // 1. Incomplete first
        // 2. Completed but not sold second
        // 3. Completed (sold) third
        
        const aIsCompleted = a.isCompleted;
        const bIsCompleted = b.isCompleted;
        const aIsSold = aIsCompleted && currentSoldServiceIds.has(a.id);
        const bIsSold = bIsCompleted && currentSoldServiceIds.has(b.id);
        
        // If one is incomplete and the other is completed
        if (aIsCompleted !== bIsCompleted) {
          return aIsCompleted ? 1 : -1; // Incomplete first
        }
        
        // Both are completed, check sold status
        if (aIsCompleted && bIsCompleted) {
          // If one is sold and the other is not, prioritize completed but not sold
          if (aIsSold !== bIsSold) {
            return aIsSold ? 1 : -1; // Completed but not sold comes first
          }
        }
        
        // Same status priority, sort by creation date (latest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      // Store filtered services for footer
      setFilteredServicesList(filteredServices);
      
      // Calculate pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedServices = filteredServices.slice(startIndex, endIndex);
      
      setServices(paginatedServices);
      setTotalPages(Math.ceil(filteredServices.length / itemsPerPage));
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  };

  const loadServiceTypes = async () => {
    try {
      const types = await window.api.database.serviceAppointments.getServiceTypes();
      setServiceTypes(types);
    } catch (error) {
      console.error("Error loading service types:", error);
    }
  };

  // Load seen services from localStorage
  useEffect(() => {
    const savedOverdue = localStorage.getItem('seenOverdueServices');
    const savedDueSoon = localStorage.getItem('seenDueSoonServices');
    
    if (savedOverdue) {
      setSeenOverdueServices(new Set(JSON.parse(savedOverdue)));
    }
    if (savedDueSoon) {
      setSeenDueSoonServices(new Set(JSON.parse(savedDueSoon)));
    }
  }, []);

  // Save seen services to localStorage when they change
  useEffect(() => {
    localStorage.setItem('seenOverdueServices', JSON.stringify(Array.from(seenOverdueServices)));
  }, [seenOverdueServices]);

  useEffect(() => {
    localStorage.setItem('seenDueSoonServices', JSON.stringify(Array.from(seenDueSoonServices)));
  }, [seenDueSoonServices]);

  // Mark services as seen when viewing overdue/due soon tables
  useEffect(() => {
    if (filters.dateFilter === "overdue" && isViewingOverdueTable) {
      // Mark all overdue services as seen
      const overdueServiceIds = services
        .filter((service: ServiceAppointment) => {
          const today = new Date();
          const dueDate = new Date(service.dueDate);
          return dueDate < today && !service.isCompleted;
        })
        .map((service: ServiceAppointment) => service.id);
      
      if (overdueServiceIds.length > 0) {
        setSeenOverdueServices(prev => new Set([...prev, ...overdueServiceIds]));
        markOverdueServicesAsSeen();
      }
    } else if (filters.dateFilter === "dueSoon" && isViewingDueSoonTable) {
      // Mark all due soon services as seen
      const dueSoonServiceIds = services
        .filter((service: ServiceAppointment) => {
          const today = new Date();
          const dueDate = new Date(service.dueDate);
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= dueSoonThresholdDays && diffDays >= 0 && !service.isCompleted;
        })
        .map((service: ServiceAppointment) => service.id);
      
      if (dueSoonServiceIds.length > 0) {
        setSeenDueSoonServices(prev => new Set([...prev, ...dueSoonServiceIds]));
        markDueSoonServicesAsSeen();
      }
    }
  }, [filters.dateFilter, isViewingOverdueTable, isViewingDueSoonTable, services, markOverdueServicesAsSeen, markDueSoonServicesAsSeen, dueSoonThresholdDays]);

  // Helper function to reset date filters to include today
  const resetDateFiltersToIncludeToday = async () => {
    try {
      const allServices = await window.api.database.serviceAppointments.getAll();
      
      if (allServices.length > 0) {
        const dueDates = allServices
          .map((service: ServiceAppointment) => new Date(service.dueDate))
          .filter((date: Date) => !isNaN(date.getTime()))
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());
        
        if (dueDates.length > 0) {
          const firstDate = dueDates[0];
          const lastDate = dueDates[dueDates.length - 1];
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Ensure today is always included in the date range
          // startDate: earliest of first service date or today
          // endDate: latest of last service date or today
          const startDate = firstDate < today ? firstDate : today;
          const endDate = lastDate > today ? lastDate : today;
          
          // Format dates as YYYY-MM-DD
          const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          setFilters((prev) => ({
            ...prev,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
          }));
        }
      }
    } catch (error) {
      console.error("Error resetting date filters:", error);
    }
  };

  const handleServiceAdded = async () => {
    setOpenPanel(null);
    // Reset date filters to include today before loading services
    await resetDateFiltersToIncludeToday();
    loadServices();
  };

  const handleServiceUpdated = () => {
    loadServices();
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      setDeleteLoading(serviceId);
      const service = services.find((s) => s.id === serviceId);
      const serviceName = service ? `${service.name} (${service.serviceType})` : serviceId;
      const clientName = service?.client?.name ?? "—";
      await window.api.database.serviceAppointments.delete(serviceId);
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.serviceDeleted",
        details: `Service ID: ${serviceId}\nService: ${serviceName}\nClient: ${clientName}`,
      }).catch((): undefined => undefined);
      loadServices();
      showToast(
        t("services.serviceDeletedSuccessfully", "Service deleted successfully"),
        "success",
      );
    } catch (error) {
      console.error("Error deleting service:", error);
      showToast(
        t("services.failedToDeleteService", "Failed to delete service"),
        "error",
      );
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset pagination only when the filter changes the dataset.
    // UI-only toggles like profit visibility should not kick the user back to page 1.
    if (key !== "hideProfit") {
      setCurrentPage(1);
    }
  };

  const handleViewServiceTypes = () => {
    setShowServiceTypes(true);
    setCurrentPage(1); // Reset to first page when switching views
  };

  const handleBackToServices = () => {
    setShowServiceTypes(false);
    setCurrentPage(1); // Reset to first page when switching views
  };


  return (
    <main className="px-2 md:px-4 flex-1 space-y-4">
      <AddServiceForm 
        openPanel={openPanel} 
        setOpenPanel={setOpenPanel}
        onServiceAdded={handleServiceAdded}
        onServiceUpdated={handleServiceUpdated}
      />
      
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-6 space-y-4">
          {/* Header with toggle button */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-3">
              {showServiceTypes ? (
                <BarChart3 className="w-7 h-7 text-cyan-500" />
              ) : (
                <Wrench className="w-7 h-7 text-cyan-500" />
              )}
              <h1 className="text-2xl font-bold">
                {showServiceTypes ? t("services.serviceTypes", "Service Types") : t("services.serviceRequests", "Service Requests")}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip
                content={showServiceTypes 
                  ? t("services.backToServicesTooltip", "Return to service requests view") 
                  : t("services.viewServiceTypesTooltip", "View all service types")
                }
              >
                <Button
                  onClick={showServiceTypes ? handleBackToServices : handleViewServiceTypes}
                  variant="outline"
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {showServiceTypes ? t("services.backToServices", "Back to Services") : t("services.viewServiceTypes", "Service Types View")}
                </Button>
              </Tooltip>
            </div>
          </div>
          {/* Filters - only show for services view */}
          {!showServiceTypes && (
            <ServicesFilters
              filters={filters}
              itemsPerPage={itemsPerPage}
              onFilterChange={handleFilterChange}
              onItemsPerPageChange={setItemsPerPage}
              unseenOverdueCount={unseenOverdueServicesCount}
              unseenDueSoonCount={unseenDueSoonServicesCount}
            />
          )}
          
          {!showServiceTypes ? (
            /* Services Table */
            <ServicesTable
              services={services}
              filteredServices={filteredServicesList}
              loading={loading}
              onEdit={handleServiceUpdated}
              onDelete={handleDeleteService}
              deleteLoading={deleteLoading}
              onViewHistory={() => {
                // TODO: Implement service history view
              }}
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              dueSoonThresholdDays={dueSoonThresholdDays}
              newlyOverdueServicesIds={newlyOverdueServicesIds}
              newlyDueSoonServicesIds={newlyDueSoonServicesIds}
              onMarkOverdueAsSeen={markOverdueServicesAsSeen}
              onMarkDueSoonAsSeen={markDueSoonServicesAsSeen}
              soldServiceIds={soldServiceIds}
              hideProfit={filters.hideProfit}
            />
          ) : (
            /* Service Types Table */
            <ServiceTypesTable
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </div>
      </div>

    </main>
  );
}