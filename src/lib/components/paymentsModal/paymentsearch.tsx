import React from "react";
import { Search } from "lucide-react";
import { Input } from "../input";
import { useTranslation } from "react-i18next";

interface PaymentSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const PaymentSearch: React.FC<PaymentSearchProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <Input
          placeholder={t(
            "clients.searchPaymentsPlaceholder",
            "Search by amount, due date, paid date, or created date...",
          )}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  );
};

export default PaymentSearch;
