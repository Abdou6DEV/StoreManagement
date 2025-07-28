import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../lib/components/dialog";
import { Button } from "../../../lib/components/button";

interface BarcodePrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productPrice: number | string;
  codebar: string;
  onPrint: () => void;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  open,
  onOpenChange,
  productName,
  productPrice,
  codebar,
  onPrint,
}) => {
  const { t } = useTranslation();

  // Generate barcode preview in modal
  useEffect(() => {
    if (open && codebar) {
      console.log("Modal opened, generating barcode for:", codebar);
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById("barcode-preview");
        console.log("Found element:", element);
        if (element?.tagName === "svg") {
          const svg = element as unknown as SVGSVGElement;
          // Clear previous content
          svg.innerHTML = "";

          // Import JsBarcode dynamically for the preview
          import("jsbarcode")
            .then(({ default: JsBarcode }) => {
              console.log("JsBarcode imported successfully");
              try {
                JsBarcode(svg, codebar, {
                  format: "EAN13",
                  width: 4,
                  height: 105,
                  displayValue: true,
                  background: "#ffffff",
                  lineColor: "#000000",
                  margin: 0,
                  fontSize: 30,
                  textMargin: 1,
                });
                console.log("Barcode generated successfully");
              } catch (error) {
                console.error("Failed to generate barcode preview:", error);
                // Fallback: show text if barcode generation fails
                svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="8">${codebar}</text>`;
              }
            })
            .catch((error) => {
              console.error("Failed to import JsBarcode:", error);
              // Fallback if import fails
              const element = document.getElementById("barcode-preview");
              if (element?.tagName === "svg") {
                const svg = element as unknown as SVGSVGElement;
                svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="8">${codebar}</text>`;
              }
            });
        } else {
          console.error("SVG element not found or not an SVG");
        }
      }, 100);
    }
  }, [open, codebar]);

  const handlePrint = () => {
    onPrint();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("stock.printBarcodeTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-4">
              {t("stock.barcodePreviewText")}
            </div>

            {/* Actual Label Preview - exactly as it will be printed */}
            <div
              className="inline-block border-2 border-gray-400 bg-white p-6"
              style={{ width: "600px", height: "240px" }}
            >
              <div className="h-full flex flex-col justify-between">
                {/* Product Info Section */}
                <div className="text-center">
                  <div
                    className="text-xs font-medium leading-tight"
                    style={{
                      fontSize: "28px",
                      lineHeight: "1.2",
                      marginBottom: "2px",
                    }}
                  >
                    {productName || t("stock.productNameFallback")}
                  </div>
                  <div
                    className="text-xs font-black"
                    style={{ fontSize: "42px" }}
                  >
                    {productPrice
                      ? Number(productPrice).toLocaleString() + " DA"
                      : t("stock.priceFallback")}
                  </div>
                </div>

                {/* Barcode Section */}
                <div className="text-center">
                  <svg
                    id="barcode-preview"
                    className="w-full h-[105px] mx-auto"
                    style={{ minHeight: "105px" }}
                  ></svg>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("stock.cancel")}
            </Button>
            <Button onClick={handlePrint}>{t("stock.printLabel")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
