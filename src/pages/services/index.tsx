import { useState, useEffect } from "react";
import { Wrench, BarChart3, FileText } from "lucide-react";
import { Button } from "../../lib/components/button";
import { Tooltip } from "../../lib/components/tooltip";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { unseenOverdueServicesCount, markOverdueServicesAsSeen } = useOverdueServices();
  const { unseenDueSoonServicesCount, markDueSoonServicesAsSeen, dueSoonThresholdDays } = useDueSoonServices();
  const [openPanel, setOpenPanel] = useState<"add" | null>(null);
  const [showServiceTypes, setShowServiceTypes] = useState(false);
  const [services, setServices] = useState<ServiceAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    dateFilter: "all",
  });
  const [seenOverdueServices, setSeenOverdueServices] = useState<Set<string>>(new Set());
  const [seenDueSoonServices, setSeenDueSoonServices] = useState<Set<string>>(new Set());
  const [newlyOverdueServicesIds, setNewlyOverdueServicesIds] = useState<Set<string>>(new Set());
  const [newlyDueSoonServicesIds, setNewlyDueSoonServicesIds] = useState<Set<string>>(new Set());
  const [isViewingOverdueTable, setIsViewingOverdueTable] = useState(false);
  const [isViewingDueSoonTable, setIsViewingDueSoonTable] = useState(false);

  // Load services and service types
  useEffect(() => {
    loadServices();
    loadServiceTypes();
  }, [currentPage, itemsPerPage, filters]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const allServices = await window.api.database.serviceAppointments.getAll();
      
      // Apply filters
      let filteredServices = allServices;
      
      if (filters.search) {
        filteredServices = filteredServices.filter((service: ServiceAppointment) =>
          service.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          service.serviceType.toLowerCase().includes(filters.search.toLowerCase()) ||
          (service.client && service.client.name.toLowerCase().includes(filters.search.toLowerCase()))
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
      
      // Date filter
      if (filters.dateFilter === "overdue") {
        const today = new Date();
        filteredServices = filteredServices.filter((service: ServiceAppointment) => {
          const dueDate = new Date(service.dueDate);
          return dueDate < today && !service.isCompleted;
        });
      } else if (filters.dateFilter === "dueSoon") {
        const today = new Date();
        const dueSoonDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        filteredServices = filteredServices.filter((service: ServiceAppointment) => {
          const dueDate = new Date(service.dueDate);
          return dueDate >= today && dueDate <= dueSoonDate && !service.isCompleted;
        });
      }
      
      // Sort services: incomplete first, then by due date
      filteredServices.sort((a: ServiceAppointment, b: ServiceAppointment) => {
        // First sort by completion status (incomplete first)
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }
        // Then sort by due date (earliest first)
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      
      // Calculate pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedServices = filteredServices.slice(startIndex, endIndex);
      
      setServices(paginatedServices);
      setTotalPages(Math.ceil(filteredServices.length / itemsPerPage));
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
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

  const handleServiceAdded = () => {
    setOpenPanel(null);
    loadServices();
  };

  const handleServiceUpdated = () => {
    loadServices();
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      setDeleteLoading(serviceId);
      await window.api.database.serviceAppointments.delete(serviceId);
      loadServices();
    } catch (error) {
      console.error("Error deleting service:", error);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleViewServiceTypes = () => {
    setShowServiceTypes(true);
  };

  const handleBackToServices = () => {
    setShowServiceTypes(false);
  };


  return (
    <main className="px-6 md:px-12 flex-1 space-y-4">
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
              onEdit={handleServiceUpdated}
              onDelete={handleDeleteService}
              deleteLoading={deleteLoading}
              onViewHistory={() => {}}
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          ) : (
            /* Service Types Table */
            <ServiceTypesTable
              currentPage={currentPage}
              totalPages={totalPages}
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