import React from "react";
import { useTranslation } from "react-i18next";
import "../../lib/i18n";

export default function History() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">
            {t("salesHistory")}
          </h2>
          <p className="text-muted-foreground">
            {t("noSalesHistory")}
          </p>
        </div>
        
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">
            {t("purchaseHistory")}
          </h2>
          <p className="text-muted-foreground">
            {t("noPurchaseHistory")}
          </p>
        </div>
      </div>
    </div>
  );
}
