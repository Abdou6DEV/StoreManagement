import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FileText, TrendingUp } from "lucide-react";
import { createPortal } from "react-dom";
import GeneralHistory from "./components/generalHistory";
import DetailsHistory from "./components/detailsHistory";
import { useTooltip } from "../../lib/contexts/tooltipContext";
import type { AggregationLevel, SelectedPeriod } from "../../types";

export default function History() {
  const { t } = useTranslation();
  const { showTooltips } = useTooltip();
  const [activeTab, setActiveTab] = useState<"general" | "details">("general");
  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [tooltipCoords, setTooltipCoords] = useState({ x: -1000, y: -1000 });
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handlePeriodSelect = (
    period: AggregationLevel,
    periodValue: string,
  ) => {
    setSelectedPeriod({ period, periodValue });
    setActiveTab("details");
  };

  const show = (tabId: string) => {
    if (!showTooltips) return;
    setHoveredTab(tabId);
    updatePosition(tabId);
    timeoutRef.current = window.setTimeout(() => {
      setVisible(true);
    }, 200);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
    // Delay clearing hoveredTab to allow transition to complete
    setTimeout(() => {
      setHoveredTab(null);
    }, 200);
  };

  const handleMouseLeave = (event: React.MouseEvent) => {
    // Only hide if we're not hovering over any tab
    const isHoveringAnyTab = Object.keys(tabRefs.current).some(tabId => {
      const tabRef = tabRefs.current[tabId];
      if (!tabRef) return false;
      const rect = tabRef.getBoundingClientRect();
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      return mouseX >= rect.left && mouseX <= rect.right && 
             mouseY >= rect.top && mouseY <= rect.bottom;
    });
    
    if (!isHoveringAnyTab) {
      hide();
    }
  };

  const updatePosition = (tabId: string) => {
    const tabRef = tabRefs.current[tabId];
    if (!tabRef) return;
    const rect = tabRef.getBoundingClientRect();
    const margin = 8;
    const x = rect.left + rect.width / 2;
    const y = rect.top - margin;
    setTooltipCoords({ x, y });
  };

  const tabs = [
    {
      id: "general" as const,
      label: t("history.generalHistory"),
      icon: TrendingUp,
      tooltip: t("history.tooltips.generalTab"),
    },
    {
      id: "details" as const,
      label: t("history.detailsHistory"),
      icon: FileText,
      tooltip: t("history.tooltips.detailsTab"),
    },
  ];

  return (
    <div className="flex-1 space-y-6 -mt-10">
      {/* Tabs */}
      <div className="w-full border-b border-border">
        <nav className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <div
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                className="flex-1 relative"
                onMouseEnter={() => show(tab.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-center gap-4 py-4 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              </div>
            );
          })}
        </nav>
        
        {/* Tooltip identical to tooltip.tsx */}
        {hoveredTab && createPortal(
          <div
            className={`fixed z-[9999] px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg pointer-events-none bg-black text-white dark:bg-white dark:text-black transition-all duration-200 ease-out ${
              visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
            }`}
            style={{
              left: `${tooltipCoords.x}px`,
              top: `${tooltipCoords.y}px`,
              transform: "translate(-50%, -100%)",
            }}
            role="tooltip"
          >
            {tabs.find(tab => tab.id === hoveredTab)?.tooltip}
          </div>,
          document.body,
        )}
      </div>

      {/* Tab Content */}
      <div className="min-h-[650px]">
        {activeTab === "general" && (
          <GeneralHistory onPeriodSelect={handlePeriodSelect} />
        )}
        {activeTab === "details" && (
          <DetailsHistory selectedPeriod={selectedPeriod} />
        )}
      </div>
    </div>
  );
}
