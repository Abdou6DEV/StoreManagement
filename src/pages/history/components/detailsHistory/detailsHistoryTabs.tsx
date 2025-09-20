import { useTranslation } from "react-i18next";
import { ShoppingCart, FileText, CreditCard } from "lucide-react";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useTooltip } from "../../../../lib/contexts/tooltipContext";

interface DetailsHistoryTabsProps {
  activeSection: "sales" | "purchases" | "billsPayments";
  onSectionChange: (section: "sales" | "purchases" | "billsPayments") => void;
  salesCount: number;
  purchasesCount: number;
  billsPaymentsCount: number;
}

export default function DetailsHistoryTabs({
  activeSection,
  onSectionChange,
  salesCount,
  purchasesCount,
  billsPaymentsCount,
}: DetailsHistoryTabsProps) {
  const { t } = useTranslation();
  const { showTooltips } = useTooltip();
  const [visible, setVisible] = useState(false);
  const [tooltipCoords, setTooltipCoords] = useState({ x: -1000, y: -1000 });
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const tabs = [
    {
      id: "sales" as const,
      label: t("history.sales"),
      icon: ShoppingCart,
      count: salesCount,
      tooltip: t("history.tooltips.salesTab"),
    },
    {
      id: "billsPayments" as const,
      label: t("history.billsPayments"),
      icon: CreditCard,
      count: billsPaymentsCount,
      tooltip: t("history.tooltips.billsPaymentsTab"),
    },
    {
      id: "purchases" as const,
      label: t("history.purchases"),
      icon: FileText,
      count: purchasesCount,
      tooltip: t("history.tooltips.purchasesTab"),
    },
  ];

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

  return (
    <div className="border-b border-border">
      <nav className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;

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
                onClick={() => onSectionChange(tab.id)}
                className={`w-full flex items-center justify-center gap-2 py-4 px-1 border-b-2 font-medium text-base transition-colors cursor-pointer ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className="bg-muted px-2 py-1 rounded-full text-sm font-medium">
                  {tab.count}
                </span>
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
  );
}
