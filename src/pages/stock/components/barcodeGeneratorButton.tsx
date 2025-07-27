import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Tooltip } from "../../../lib/components/tooltip";
import { Loader2, QrCode } from "lucide-react";

interface BarcodeGeneratorButtonProps {
  codebar: string;
  onGenerate: () => Promise<void>;
  onPrint: () => void;
  disabled?: boolean;
  generatingBarcode: boolean;
}

export const BarcodeGeneratorButton: React.FC<BarcodeGeneratorButtonProps> = ({
  codebar,
  onGenerate,
  onPrint,
  disabled = false,
  generatingBarcode,
}) => {
  const { t } = useTranslation();
  const handleClick = () => {
    if (codebar) {
      onPrint();
    } else {
      onGenerate();
    }
  };

  const getTooltipContent = () => {
    if (generatingBarcode) {
      return t("stock.barcodeGenerating");
    } else if (codebar) {
      return t("stock.barcodePrint");
    } else {
      return t("stock.barcodeGenerate");
    }
  };

  const getButtonText = () => {
    if (generatingBarcode) {
      return t("stock.generating");
    } else if (codebar) {
      return t("stock.print");
    } else {
      return t("stock.generate");
    }
  };

  return (
    <Tooltip content={getTooltipContent()} portal={false}>
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={generatingBarcode || disabled}
        className="px-3 py-3 flex items-center gap-2"
      >
        {generatingBarcode ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{getButtonText()}</span>
          </>
        ) : (
          <>
            <QrCode className="w-4 h-4" />
            <span>{getButtonText()}</span>
          </>
        )}
      </Button>
    </Tooltip>
  );
}; 