import { generateRealBarcode, getRecommendedFormat } from '../../../../lib/utils/barcodeVisual';

export interface BarcodeLabelData {
  productName: string;
  price: number | string;
  barcode: string;
}

/**
 * Print barcode label with real, scannable barcode
 * Supports multiple labels per print, size = 40mm x 20mm (4cm x 2cm) per label
 */
export const printBarcodeLabel = async (data: BarcodeLabelData, quantity = 1): Promise<void> => {
  const { productName, price, barcode } = data;

  if (!barcode || !productName) {
    throw new Error('Product name and barcode are required for printing');
  }

  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=300,height=200');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups for this site.');
  }

  // Generate real barcode
  let barcodeImage: string;
  try {
    const barcodeFormat = getRecommendedFormat(barcode);
    barcodeImage = generateRealBarcode(barcode, {
      format: barcodeFormat,
      width: 3,
      height: 60,
      displayValue: false,
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
    if (numPrice % 1 === 0) {
      return `${Math.round(numPrice).toLocaleString('fr-FR')} DA`;
    } else {
      return `${numPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} DA`;
    }
  };

  // Generate label HTML (repeated for quantity)
  const labelHTML = `
      <div class="label">
        <div class="product-name">${productName}</div>
        <div class="price">${formatPrice(price)}</div>
        <div class="barcode-container">
          <img src="${barcodeImage}" alt="Barcode: ${barcode}" class="barcode-image" />
        </div>
      </div>
  `;

  // Repeat label for the specified quantity
  const labelsHTML = Array(quantity).fill(labelHTML).join('');

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Barcode Label</title>
      <style>
        @page {
          size: 40mm 20mm; /* 4cm x 2cm label size */
          margin: 0;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background: white;
        }
        .label {
          text-align: center;
          width: 40mm;
          height: 19mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          page-break-after: always;
        }
        .label:last-child {
          page-break-after: auto;
        }
        .product-name {
          font-size: 12px;
          font-weight: 600;
          color: #000000;
          word-wrap: break-word;
        }
        .price {
          font-size: 15px;
          font-weight: 450;
          color: #000000;
        }
        .barcode-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0px;
        }
        .barcode-image {
          width: 100%;
          height: 28px;
          border: none;
          padding: 0;
          background: white;
        }
      </style>
    </head>
    <body>
      ${labelsHTML}
    </body>
    <script>
      window.onload = function(){
        setTimeout(() => {
          window.print();
          window.close();
        }, 500);
      }
    </script>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
};
