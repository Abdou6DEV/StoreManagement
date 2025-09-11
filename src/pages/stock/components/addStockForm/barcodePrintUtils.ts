import { generateRealBarcode, getRecommendedFormat } from '../../../../lib/utils/barcodeVisual';

export interface BarcodeLabelData {
  productName: string;
  price: number | string;
  barcode: string;
}

/**
 * Print barcode label with real, scannable barcode
 */
export const printBarcodeLabel = async (data: BarcodeLabelData, quantity: number = 1): Promise<void> => {
  const { productName, price, barcode } = data;

  if (!barcode || !productName) {
    throw new Error('Product name and barcode are required for printing');
  }

  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=400,height=300');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups for this site.');
  }

  // Generate real barcode with fallback
  let barcodeImage: string;
  try {
    const barcodeFormat = getRecommendedFormat(barcode);
    barcodeImage = generateRealBarcode(barcode, {
      format: barcodeFormat,
      width: 2,
      height: 100,
      displayValue: false, // Don't show barcode number in the barcode itself
      fontSize: 14,
      margin: 5,
    });
  } catch (error) {
    console.error('Failed to generate barcode for printing:', error);
    throw new Error(`Failed to generate barcode for printing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const formatPrice = (price: number | string): string => {
    if (!price || price === '') return 'No price';
    const numPrice = Number(price);
    // Remove unnecessary decimal places and format with spaces
    if (numPrice % 1 === 0) {
      return `${Math.round(numPrice).toLocaleString('fr-FR')} DA`;
    } else {
      return `${numPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} DA`;
    }
  };

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Barcode Label</title>
      <style>
        @page {
          size: 58mm auto;
          margin: 2mm;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: white;
        }
        .label {
          text-align: center;
          width: 100%;
          max-width: 54mm;
        }
        .label-copy {
          margin-bottom: 5mm;
          border-bottom: 1px dashed #ccc;
          padding-bottom: 3mm;
        }
        .label-copy:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .product-name {
          font-size: 16px;
          font-weight: 900;
          margin-bottom: 2px;
          word-wrap: break-word;
          line-height: 1.1;
          color: #000000;
        }
        .price {
          font-size: 18px;
          font-weight: bold;
          color: #000000;
          margin-bottom: 2px;
        }
        .barcode-container {
          margin: 2px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0px;
        }
        .barcode-image {
          max-width: 100%;
          height: auto;
          border: none;
          padding: 0px;
          background: white;
        }
        .barcode-text {
          font-size: 12px;
          margin-top: 0px;
          font-family: monospace;
          letter-spacing: 1px;
          color: #000000;
          font-weight: bold;
        }
        @media print {
          body { 
            margin: 0; 
            padding: 0;
          }
          .label { 
            max-width: none; 
            width: 100%;
          }
          .product-name {
            font-size: 18px;
            font-weight: 900;
            margin-bottom: 1px;
            line-height: 1.0;
          }
          .price {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 1px;
          }
          .barcode-image {
            max-width: 100%;
            height: 50px;
          }
          .barcode-text {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 2px;
          }
        }
      </style>
    </head>
    <body>
      ${Array.from({ length: quantity }, (_, index) => `
        <div class="label-copy">
          <div class="label">
            <div class="product-name">${productName}</div>
            <div class="price">${formatPrice(price)}</div>
            <div class="barcode-container">
              <img src="${barcodeImage}" alt="Barcode: ${barcode}" class="barcode-image" />
              <div class="barcode-text">${barcode}</div>
            </div>
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();

  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
};
