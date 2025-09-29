import { useState, useEffect } from "react";
import { Wrench, BarChart3 } from "lucide-react";
import { Button } from "../../lib/components/button";
import { useTranslation } from "react-i18next";
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
  clientId: string;
  dueDate: string;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    phone?: string;
  };
}

export default function ServicesPage() {
  const { t } = useTranslation();
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
          service.client.name.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      // Status filter
      if (filters.status === "complete") {
        filteredServices = filteredServices.filter((service: ServiceAppointment) => service.isCompleted);
      } else if (filters.status === "incomplete") {
        filteredServices = filteredServices.filter((service: ServiceAppointment) => !service.isCompleted);
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


  return (
    <main className="px-6 md:px-12 flex-1 space-y-4">
      <AddServiceForm 
        openPanel={openPanel} 
        setOpenPanel={setOpenPanel}
        onServiceAdded={handleServiceAdded}
        onServiceUpdated={handleServiceUpdated}
      />
      
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Wrench className="w-7 h-7 text-cyan-500" />
            <h1 className="text-2xl font-bold">
              {t("services.title", "Service Requests")}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowServiceTypes(false)}
              variant={!showServiceTypes ? "default" : "outline"}
              className={!showServiceTypes ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "border-cyan-200 text-cyan-600 hover:bg-cyan-50 dark:border-cyan-800 dark:text-cyan-400 dark:hover:bg-cyan-950/30"}
            >
              <Wrench className="w-4 h-4 mr-2" />
              {t("services.services", "Services")}
            </Button>
            <Button
              onClick={() => setShowServiceTypes(true)}
              variant={showServiceTypes ? "default" : "outline"}
              className={showServiceTypes ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "border-cyan-200 text-cyan-600 hover:bg-cyan-50 dark:border-cyan-800 dark:text-cyan-400 dark:hover:bg-cyan-950/30"}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {t("services.viewAllTypes", "View All Types")}
            </Button>
          </div>
        </div>
        
        {!showServiceTypes ? (
          <>
            {/* Filters */}
            <ServicesFilters
              filters={filters}
              itemsPerPage={itemsPerPage}
              onFilterChange={handleFilterChange}
              onItemsPerPageChange={setItemsPerPage}
            />
            
            {/* Services Table */}
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
          </>
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

    </main>
  );
}