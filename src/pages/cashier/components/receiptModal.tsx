import { useState, useEffect, useRef } from "react";
import { X, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CartItem } from "../../../types";
import JsBarcode from "jsbarcode";

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
  const barcodeRef = useRef<SVGSVGElement>(null);

  // Store information (configurable via props or use defaults)
  const storeInfo = {
    name: "Store Management",
    address: "Your Store Address",
    phone: "Phone: +1234567890"
  };

  // Calculate totals
  const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const finalTotal = total - discount;
  const currentDate = new Date();
  const receiptNumber = saleId || `TEMP-${Date.now()}`;

  // Generate barcode when modal opens
  useEffect(() => {
    if (open && barcodeRef.current && receiptNumber) {
      generateBarcode();
    }
  }, [open, receiptNumber]);

  // Real scannable barcode generation
  const generateBarcode = () => {
    if (!barcodeRef.current) return;

    const shortText = receiptNumber.substring(0, 12).toUpperCase();
    const svg = barcodeRef.current;
    
    // Clear previous content
    svg.innerHTML = '';
    
    try {
      JsBarcode(svg, shortText, {
        format: "CODE128",
        width: 1.5,
        height: 30,
        displayValue: false,
        background: "#ffffff",
        lineColor: "#000000",
        margin: 0
      });
    } catch (error) {
      console.error("Failed to generate barcode:", error);
      // Fallback to simple visual barcode
      generateFallbackBarcode(shortText, svg);
    }
  };

  // Fallback barcode for error cases
  const generateFallbackBarcode = (text: string, svg: SVGSVGElement) => {
    svg.innerHTML = '';
    
    // Create simple visual barcode pattern
    let barcodeData = '';
    for (const char of text) {
      const code = char.charCodeAt(0);
      const barCount = (code % 3) + 2;
      barcodeData += '1'.repeat(barCount) + '0';
    }
    
    barcodeData = '1010' + barcodeData + '1010';
    
    const barWidth = 2;
    const barHeight = 30;
    let x = 0;
    
    for (let i = 0; i < barcodeData.length; i++) {
      if (barcodeData[i] === '1') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x.toString());
        rect.setAttribute('y', '0');
        rect.setAttribute('width', barWidth.toString());
        rect.setAttribute('height', barHeight.toString());
        rect.setAttribute('fill', '#000000');
        svg.appendChild(rect);
      }
      x += barWidth;
    }
    
    svg.setAttribute('width', x.toString());
    svg.setAttribute('height', barHeight.toString());
  };

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
      console.error('Print error:', error);
      alert(t("cashier.printError", "Failed to print receipt"));
    } finally {
      setIsPrinting(false);
    }
  };

  const generateReceiptHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt</title>
          <style>
            @media print {
              body { 
                margin: 0; 
                padding: 10px; 
                font-family: 'Courier New', monospace; 
                font-size: 12px;
              }
              .receipt { 
                width: 80mm; 
                margin: 0 auto; 
                max-width: 100%;
              }
              .header { 
                text-align: center; 
                margin-bottom: 15px; 
              }
              .store-name { 
                font-size: 16px; 
                font-weight: bold; 
                margin-bottom: 8px; 
              }
              .store-info { 
                font-size: 11px; 
                margin-bottom: 5px; 
              }
              .receipt-info { 
                font-size: 11px; 
                margin-bottom: 10px; 
              }
              .divider { 
                border-top: 1px dashed #000; 
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
              }
              .item-qty { 
                text-align: center; 
                width: 20px; 
                margin-right: 12px;
                font-weight: bold;
              }
              .item-price { 
                text-align: right; 
                width: 35px; 
                margin-right: 8px;
              }
              .item-total { 
                text-align: right; 
                width: 45px; 
                font-weight: bold;
              }
              .items-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 11px;
                font-weight: bold;
                border-bottom: 1px solid #000;
                padding-bottom: 4px;
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
              }
              .total-row { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 4px; 
              }
              .payment-info { 
                margin-top: 10px; 
                font-size: 11px; 
              }
              .client-info { 
                margin-bottom: 10px; 
                font-size: 11px; 
              }
              .barcode { 
                text-align: center; 
                margin: 25px 0; 
                padding: 15px 0;
              }
              .barcode-text { 
                font-size: 10px; 
                margin-top: 8px; 
              }
              .welcome { 
                text-align: center; 
                margin-top: 15px; 
                font-size: 11px; 
                font-weight: bold; 
              }
              .barcode-svg {
                width: 80%;
                max-width: 180px;
                margin: 0 auto;
                display: block;
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
            ${clientName ? `<div class="client-info">Client: ${clientName}</div>` : ''}
            
            <div class="divider"></div>
            
            <!-- Items -->
            <div class="items">
              <div class="items-header">
                <div class="item-name">ITEM</div>
                <div class="header-qty">QTY</div>
                <div class="header-price">PRICE</div>
                <div class="header-total">TOTAL</div>
              </div>
              ${cart.map(item => `
                <div class="item">
                  <div class="item-name">${item.name.replace(/\n/g, ' ')}</div>
                  <div class="item-qty">${item.qty}</div>
                  <div class="item-price">${item.price.toLocaleString()}</div>
                  <div class="item-total">${(item.qty * item.price).toLocaleString()}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="divider"></div>
            
            <!-- Totals -->
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${total.toLocaleString()} DA</span>
              </div>
              ${discount > 0 ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>-${discount.toLocaleString()} DA</span>
                </div>
              ` : ''}
              <div class="total-row">
                <span>Total:</span>
                <span>${finalTotal.toLocaleString()} DA</span>
              </div>
            </div>
            
            <!-- Payment Info -->
            ${paymentType !== 'none' && paymentAmount > 0 ? `
              <div class="payment-info">
                <div class="divider"></div>
                <div>Payment Type: ${paymentType === 'credit' ? 'Credit' : 'Versement'}</div>
                <div>Amount Paid: ${paymentAmount.toLocaleString()} DA</div>
                <div>Due Date: ${paymentDate ? paymentDate.toLocaleDateString() : 'N/A'}</div>
                <div>Remaining: ${(finalTotal - paymentAmount).toLocaleString()} DA</div>
              </div>
            ` : ''}
            
                        <!-- Barcode -->
            <div class="barcode">
              <svg id="barcode-print" style="width: 80%; max-width: 200px; margin: 0 auto; display: block; height: 40px;"></svg>
              <div class="barcode-text">ID: ${receiptNumber.substring(0, 12)}</div>
            </div>
            
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <script>
              // Generate real barcode for print
              if (typeof JsBarcode !== 'undefined') {
                JsBarcode("#barcode-print", "${receiptNumber.substring(0, 12)}", {
                  format: "CODE128",
                  width: 1.5,
                  height: 30,
                  displayValue: false,
                  background: "#ffffff",
                  lineColor: "#000000",
                  margin: 0
                });
              }
            </script>
            
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {t("cashier.receipt", "Receipt")}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="font-mono text-sm bg-muted rounded-lg p-4 border border-border">
            {/* Store Header */}
            <div className="text-center mb-4">
              <div className="font-bold text-lg">{storeInfo.name}</div>
              <div className="text-xs text-muted-foreground">{storeInfo.address}</div>
              <div className="text-xs text-muted-foreground">{storeInfo.phone}</div>
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
                <span className="w-5 text-center text-xs font-bold mr-3">QTY</span>
                <span className="w-9 text-right text-xs font-bold mr-2">PRICE</span>
                <span className="w-12 text-right text-xs font-bold">TOTAL</span>
              </div>
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start mb-2 min-h-[16px]">
                  <span className="flex-1 mr-2 text-xs break-words leading-tight">{item.name}</span>
                  <span className="w-5 text-center font-bold text-xs mr-3 flex-shrink-0">{item.qty}</span>
                  <span className="w-9 text-right text-xs mr-2 flex-shrink-0">{item.price.toLocaleString()}</span>
                  <span className="w-12 text-right font-bold text-xs flex-shrink-0">{(item.qty * item.price).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-black dark:border-white my-2" />

            {/* Totals */}
            <div className="font-bold">
              <div className="flex justify-between mb-1">
                <span>Subtotal:</span>
                <span>{total.toLocaleString()} DA</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between mb-1">
                  <span>Discount:</span>
                  <span>-{discount.toLocaleString()} DA</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Total:</span>
                <span>{finalTotal.toLocaleString()} DA</span>
              </div>
            </div>

            {/* Payment Info */}
            {paymentType !== 'none' && paymentAmount > 0 && (
              <>
                <div className="border-t border-black dark:border-white my-2" />
                <div className="text-xs">
                  <div>Payment Type: {paymentType === 'credit' ? 'Credit' : 'Versement'}</div>
                  <div>Amount Paid: {paymentAmount.toLocaleString()} DA</div>
                  <div>Due Date: {paymentDate ? paymentDate.toLocaleDateString() : 'N/A'}</div>
                  <div>Remaining: {(finalTotal - paymentAmount).toLocaleString()} DA</div>
                </div>
              </>
            )}

                               {/* Barcode */}
                   <div className="border-t border-black dark:border-white my-4" />
                   <div className="text-center my-6 flex flex-col items-center py-4">
                     <svg 
                       ref={barcodeRef} 
                       className="barcode-svg"
                       style={{ height: '40px' }}
                     />
                     <div className="text-xs mt-2">ID: {receiptNumber.substring(0, 12)}</div>
                   </div>

            {/* Welcome Message */}
            <div className="border-t border-black dark:border-white my-2" />
            <div className="text-center text-xs font-bold">
              <div>Thank you for your purchase!</div>
              <div>Please come again</div>
              <div className="mt-1">We appreciate your business</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-border">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {isPrinting ? t("cashier.printing", "Printing...") : t("cashier.print", "Print")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-muted text-foreground rounded-md hover:bg-muted/80 transition"
          >
            {t("cashier.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
} 