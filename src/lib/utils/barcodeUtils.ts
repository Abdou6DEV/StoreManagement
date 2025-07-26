// Generate unique EAN-13 barcode for stock items
export const generateUniqueBarcode = async (existingBarcodes: string[]): Promise<string> => {
  // Get all existing barcodes
  const filteredBarcodes = existingBarcodes.filter(codebar => codebar && codebar.length >= 8);

  // Generate EAN-13 barcode (13 digits)
  let newBarcode: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    // Start with country code (for Algeria: 613)
    const countryCode = "613";
    // Generate 9 random digits
    const randomDigits = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    // Combine to get 12 digits
    const barcode12 = countryCode + randomDigits;
    
    // Calculate EAN-13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(barcode12[i]);
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    
    // Complete EAN-13 barcode
    newBarcode = barcode12 + checkDigit;
    
    attempts++;
    if (attempts >= maxAttempts) {
      // Show error in console instead of alert
      console.error("Could not generate unique barcode after 100 attempts");
      throw new Error("Could not generate unique barcode after 100 attempts");
    }
  } while (filteredBarcodes.includes(newBarcode));

  return newBarcode;
};

// Print barcode label
export const printBarcodeLabel = (productName: string, productPrice: number | string, codebar: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Barcode Label</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          body { 
            margin: 0; 
            padding: 10px; 
            font-family: Arial, sans-serif;
          }
          .label { 
            width: 132px; 
            height: 98px; 
            border: 1px solid #000; 
            padding: 4px; 
            display: flex; 
            flex-direction: column; 
            justify-content: flex-start;
            background: white;
            margin: 0 auto;
          }
          .product-info { 
            text-align: center; 
            line-height: 1.2;
          }
          .product-name {
            font-size: 8px;
            line-height: 1.2;
            margin-bottom: 1px;
            font-weight: 500;
            color: black;
          }
          .product-price {
            font-size: 12px;
            font-weight: 900;
            color: black;
            margin-bottom: 2px;
          }
          .barcode-container { 
            text-align: center; 
            margin-top: 2px;
            overflow: hidden;
            max-width: 100%;
          }
          .barcode-text { 
            font-size: 24px; 
            margin-top: 0;
            text-align: center;
            font-family: monospace;
          }
          @media print {
            body { margin: 0; padding: 10px; }
            .label { 
              width: 132px; 
              height: 98px; 
              border: 1px solid #000; 
              padding: 4px; 
              display: flex; 
              flex-direction: column; 
              justify-content: flex-start;
              font-family: Arial, sans-serif;
              background: white;
              margin: 0 auto;
            }
            .product-info { 
              text-align: center; 
              line-height: 1.2;
            }
            .product-name {
              font-size: 8px;
              line-height: 1.2;
              margin-bottom: 1px;
              font-weight: 500;
              color: black;
            }
            .product-price {
              font-size: 12px;
              font-weight: 900;
              color: black;
              margin-bottom: 2px;
            }
            .barcode-container { 
              text-align: center; 
              margin-top: 2px;
              overflow: hidden;
              max-width: 100%;
            }
            .barcode-text { 
              font-size: 24px; 
              margin-top: 0;
              text-align: center;
              font-family: monospace;
            }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="product-info">
            <div class="product-name">${productName || 'Product Name'}</div>
            <div class="product-price">${productPrice ? Number(productPrice).toLocaleString() + ' DA' : 'Price'}</div>
          </div>
          <div class="barcode-container">
            <svg id="barcode-label" style="width: 100%; height: 30px;"></svg>
          </div>
        </div>
        <script>
          if (typeof JsBarcode !== 'undefined') {
            JsBarcode("#barcode-label", "${codebar}", {
              format: "EAN13",
              width: 1,
              height: 30,
              displayValue: true,
              background: "#ffffff",
              lineColor: "#000000",
              margin: 0,
              fontSize: 8,
              textMargin: 1
            });
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}; 