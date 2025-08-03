import { useState } from "react";
import { Printer, Eye, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../../lib/components/Modal";
import type { CartItem } from "../../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  clientName: string;
  discount: number;
  paymentAmount: number;
  paymentType: "none" | "credit" | "versement";
  paymentDate?: Date;
  saleId?: string;
}

export default function ReceiptModal({
  open,
  onClose,
  cart,
  clientName,
  discount,
  paymentAmount,
  paymentType,
  paymentDate,
  saleId,
}: Props) {
  const { t } = useTranslation();
  const [isPrinting, setIsPrinting] = useState(false);

  // Store information (configurable via props or use defaults)
  const storeInfo = {
    name: "Store Management",
    address: "Your Store Address",
    phone: "Phone: +1234567890",
  };

  // Calculate totals
  const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const finalTotal = total - discount;
  const currentDate = new Date();
  const receiptNumber = saleId || `TEMP-${Date.now()}`;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert(t("cashier.printError", "Failed to open print window"));
        return;
      }

      const receiptHTML = generateReceiptHTML();
      printWindow.document.write(receiptHTML);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
        alert(t("cashier.printSuccess", "Receipt sent to printer"));
      };
    } catch (error) {
      console.error("Print error:", error);
      alert(t("cashier.printError", "Failed to print receipt"));
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePreview = () => {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      alert(t("cashier.previewError", "Failed to open preview window"));
      return;
    }

    const receiptHTML = generateReceiptHTML();
    previewWindow.document.write(receiptHTML);
    previewWindow.document.close();
    previewWindow.focus();
  };

  const generateReceiptHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt Preview</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Courier New', monospace;
              background: #f5f5f5;
            }
            .receipt {
              width: 80mm;
              max-width: 302px;
              margin: 0 auto;
              background: white;
              border: 1px solid #ccc;
              border-radius: 8px;
              padding: 16px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
            }
            .store-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 8px;
              color: #000;
            }
            .store-info {
              font-size: 11px;
              margin-bottom: 5px;
              color: #666;
            }
            .receipt-info {
              font-size: 11px;
              margin-bottom: 10px;
              color: #000;
            }
            .divider {
              border-top: 1px solid #000;
              margin: 10px 0;
            }
            .items {
              margin-bottom: 10px;
            }
            .item {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 6px;
              font-size: 11px;
              line-height: 1.2;
              min-height: 16px;
            }
            .item-name {
              flex: 1;
              margin-right: 8px;
              word-wrap: break-word;
              word-break: break-word;
              white-space: normal;
              line-height: 1.2;
              color: #000;
            }
            .item-qty {
              text-align: center;
              width: 20px;
              margin-right: 12px;
              font-weight: bold;
              color: #000;
            }
            .item-price {
              text-align: right;
              width: 35px;
              margin-right: 8px;
              color: #000;
            }
            .item-total {
              text-align: right;
              width: 45px;
              font-weight: bold;
              color: #000;
            }
            .items-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 11px;
              font-weight: bold;
              border-bottom: 1px solid #000;
              padding-bottom: 4px;
              color: #000;
            }
            .header-qty {
              text-align: center;
              width: 20px;
              margin-right: 12px;
            }
            .header-price {
              text-align: right;
              width: 35px;
              margin-right: 8px;
            }
            .header-total {
              text-align: right;
              width: 45px;
            }
            .totals {
              font-size: 12px;
              font-weight: bold;
              color: #000;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            .payment-info {
              margin-top: 10px;
              font-size: 11px;
              color: #000;
            }
            .client-info {
              margin-bottom: 10px;
              font-size: 11px;
              color: #000;
            }
            .receipt-id {
              text-align: center;
              margin: 25px 0;
              padding: 15px 0;
              border-top: 1px solid #000;
            }
            .receipt-id-text {
              font-size: 10px;
              margin-top: 8px;
              color: #000;
            }
            .welcome {
              text-align: center;
              margin-top: 15px;
              font-size: 11px;
              font-weight: bold;
              color: #000;
            }
            @media print {
              body {
                margin: 0;
                padding: 10px;
                background: white;
              }
              .receipt {
                width: 80mm;
                margin: 0 auto;
                max-width: 100%;
                border: none;
                border-radius: 0;
                padding: 10px;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <!-- Store Header -->
            <div class="header">
              <div class="store-name">${storeInfo.name}</div>
              <div class="store-info">${storeInfo.address}</div>
              <div class="store-info">${storeInfo.phone}</div>
            </div>

            <!-- Date and Time -->
            <div class="receipt-info">
              <div>Date: ${currentDate.toLocaleDateString()}</div>
              <div>Time: ${currentDate.toLocaleTimeString()}</div>
            </div>

            <!-- Client Info -->
            ${clientName ? `<div class="client-info">Client: ${clientName}</div>` : ""}

            <div class="divider"></div>

            <!-- Items -->
            <div class="items">
              <div class="items-header">
                <div class="item-name">ITEM</div>
                <div class="header-qty">QTY</div>
                <div class="header-price">PRICE</div>
                <div class="header-total">TOTAL</div>
              </div>
              ${cart
                .map(
                  (item) => `
                <div class="item">
                  <div class="item-name">${item.name.replace(/\n/g, " ")}</div>
                  <div class="item-qty">${item.qty}</div>
                  <div class="item-price">${item.price.toLocaleString()}</div>
                  <div class="item-total">${(item.qty * item.price).toLocaleString()}</div>
                </div>
              `,
                )
                .join("")}
            </div>

            <div class="divider"></div>

            <!-- Totals -->
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${total.toLocaleString()} ${t("cashier.currency", "DA")}</span>
              </div>
              ${
                discount > 0
                  ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>-${discount.toLocaleString()} ${t("cashier.currency", "DA")}</span>
                </div>
              `
                  : ""
              }
              ${
                discount > 0 || (paymentType !== "none" && paymentAmount > 0)
                  ? `
                <div class="total-row">
                  <span>New Total:</span>
                  <span>${finalTotal.toLocaleString()} ${t("cashier.currency", "DA")}</span>
                </div>
              `
                  : ""
              }
            </div>

            <!-- Payment Info -->
            ${
              paymentType !== "none" && paymentAmount > 0
                ? `
              <div class="payment-info">
                <div class="divider"></div>
                <div>Payment Type: ${paymentType === "credit" ? "Credit" : "Versement"}</div>
                <div>Amount Paid: ${paymentAmount.toLocaleString()} ${t("cashier.currency", "DA")}</div>
                <div>Due Date: ${paymentDate ? paymentDate.toLocaleDateString() : "N/A"}</div>
                <div>Remaining: ${(finalTotal - paymentAmount).toLocaleString()} ${t("cashier.currency", "DA")}</div>
              </div>
            `
                : ""
            }

            <!-- Receipt ID -->
            <div class="receipt-id">
              <div class="receipt-id-text">ID: ${receiptNumber.substring(0, 12)}</div>
            </div>

            <!-- Welcome Message -->
            <div class="welcome">
              <div>Thank you for your purchase!</div>
              <div>Please come again</div>
              <div style="margin-top: 5px;">We appreciate your business</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("cashier.receipt", "Receipt")}
      subtitle={t("cashier.receiptPreview", "Preview and print your receipt")}
      icon={<FileText className="w-5 h-5 text-blue-600" />}
      size="lg"
      className="max-w-2xl"
      actions={[
        {
          label: t("cashier.preview", "Preview"),
          onClick: handlePreview,
          variant: "outline",
          icon: <Eye className="w-4 h-4" />,
        },
        {
          label: t("cashier.print", "Print"),
          onClick: handlePrint,
          loading: isPrinting,
          disabled: isPrinting,
          icon: <Printer className="w-4 h-4" />,
        },
      ]}
    >
      <div className="overflow-y-auto max-h-[70vh]">
        <div className="font-mono text-sm bg-muted rounded-lg p-6 border border-border">
          {/* Store Header */}
          <div className="text-center mb-4">
            <div className="font-bold text-lg">{storeInfo.name}</div>
            <div className="text-xs text-muted-foreground">
              {storeInfo.address}
            </div>
            <div className="text-xs text-muted-foreground">
              {storeInfo.phone}
            </div>
          </div>

          {/* Date and Time */}
          <div className="mb-4">
            <div>Date: {currentDate.toLocaleDateString()}</div>
            <div>Time: {currentDate.toLocaleTimeString()}</div>
          </div>

          {/* Client Info */}
          {clientName && (
            <div className="mb-4">
              <div>Client: {clientName}</div>
            </div>
          )}

          <div className="border-t border-black dark:border-white my-2" />

          {/* Items */}
          <div className="mb-4">
            {/* Items Header */}
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-black dark:border-white">
              <span className="flex-1 mr-2 text-xs font-bold">ITEM</span>
              <span className="w-5 text-center text-xs font-bold mr-3">
                QTY
              </span>
              <span className="w-9 text-right text-xs font-bold mr-2">
                PRICE
              </span>
              <span className="w-12 text-right text-xs font-bold">TOTAL</span>
            </div>
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-start mb-1 min-h-[14px]"
              >
                <span className="flex-1 mr-2 text-xs break-words leading-tight">
                  {item.name}
                </span>
                <span className="w-5 text-center font-bold text-xs mr-3 flex-shrink-0">
                  {item.qty}
                </span>
                <span className="w-9 text-right text-xs mr-2 flex-shrink-0">
                  {item.price.toLocaleString()}
                </span>
                <span className="w-12 text-right font-bold text-xs flex-shrink-0">
                  {(item.qty * item.price).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-black dark:border-white my-2" />

          {/* Totals */}
          <div className="font-bold mb-2">
            <div className="flex justify-between mb-1">
              <span>Subtotal:</span>
              <span>
                {total.toLocaleString()} {t("cashier.currency", "DA")}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between mb-1">
                <span>Discount:</span>
                <span>
                  -{discount.toLocaleString()} {t("cashier.currency", "DA")}
                </span>
              </div>
            )}
            {(discount > 0 || (paymentType !== "none" && paymentAmount > 0)) && (
              <div className="flex justify-between">
                <span>New Total:</span>
                <span>
                  {finalTotal.toLocaleString()} {t("cashier.currency", "DA")}
                </span>
              </div>
            )}
          </div>

          {/* Payment Info */}
          {paymentType !== "none" && paymentAmount > 0 && (
            <>
              <div className="border-t border-black dark:border-white my-2" />
              <div className="text-xs space-y-1">
                <div>
                  Payment Type:{" "}
                  {paymentType === "credit" ? "Credit" : "Versement"}
                </div>
                <div>
                  Amount Paid: {paymentAmount.toLocaleString()}{" "}
                  {t("cashier.currency", "DA")}
                </div>
                <div>
                  Due Date:{" "}
                  {paymentDate ? paymentDate.toLocaleDateString() : "N/A"}
                </div>
                <div>
                  Remaining: {(finalTotal - paymentAmount).toLocaleString()}{" "}
                  {t("cashier.currency", "DA")}
                </div>
              </div>
            </>
          )}

          {/* Receipt ID */}
          <div className="border-t border-black dark:border-white my-2" />
          <div className="text-center my-3 flex flex-col items-center py-2">
            <div className="text-xs mt-2">
              ID: {receiptNumber.substring(0, 12)}
            </div>
          </div>

          {/* Welcome Message */}
          <div className="border-t border-black dark:border-white my-2" />
          <div className="text-center text-xs font-bold mt-2">
            <div>Thank you for your purchase!</div>
            <div>Please come again</div>
            <div className="mt-1">We appreciate your business</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
