import { useState } from "react";
import { Calendar, Plus } from "lucide-react";
import { Button } from "../../lib/components/button";
import { useTranslation } from "react-i18next";
import { ServicesTable } from "./components/servicesTable";
import AddServiceForm from "./components/addServiceForm";

export default function ServicesPage() {
  const { t } = useTranslation();
  const [openPanel, setOpenPanel] = useState<"add" | null>(null);

  return (
    <main className="px-6 md:px-12 flex-1 space-y-4">
      <AddServiceForm openPanel={openPanel} setOpenPanel={setOpenPanel} />
      
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-7 h-7 text-red-500" />
            <h1 className="text-2xl font-bold">
              {t("services.title", "Service Requests")}
            </h1>
          </div>
          <Button
            onClick={() => setOpenPanel("add")}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("services.addService", "Add Service")}
          </Button>
        </div>
        
        <ServicesTable />
      </div>
    </main>
  );
}

