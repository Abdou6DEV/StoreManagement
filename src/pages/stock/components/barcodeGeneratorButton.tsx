import React, { useState } from "react";
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
  const handleClick = () => {
    if (codebar) {
      onPrint();
    } else {
      onGenerate();
    }
  };

  const getTooltipContent = () => {
    if (generatingBarcode) {
      return "Generating unique barcode...";
    } else if (codebar) {
      return "Print barcode label for this product";
    } else {
      return "Generate unique EAN-13 barcode";
    }
  };

  const getButtonText = () => {
    if (generatingBarcode) {
      return "Generating...";
    } else if (codebar) {
      return "Print";
    } else {
      return "Generate";
    }
  };

  return (
    <Tooltip content={getTooltipContent()}>
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