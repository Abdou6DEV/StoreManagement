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
export const printBarcodeLabel = async (data: BarcodeLabelData, quantity = 1, showBarcode = true): Promise<void> => {
  const { productName, price, barcode } = data;

  // Explicit boolean check - ensure showBarcode is a boolean
  const shouldShowBarcode = showBarcode === true;

  if (!productName) {
    throw new Error('Product name is required for printing');
  }

  if (shouldShowBarcode && !barcode) {
    throw new Error('Barcode is required when showing barcode');
  }

  const storeName = (await window.api.database.options.get("storeName")) || "";

  // Use iframe method for direct printing (like receipt printing)
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  // Generate real barcode only if showBarcode is explicitly true
  let barcodeImage: string = '';
  if (shouldShowBarcode && barcode) {
    try {
      const barcodeFormat = getRecommendedFormat(barcode);
      barcodeImage = generateRealBarcode(barcode, {
        format: barcodeFormat,
        width: 4,
        height: 60,
        displayValue: false,
        fontSize: 14,
        margin: 5,
      });
    } catch (error) {
      console.error('Failed to generate barcode for printing:', error);
      throw new Error(`Failed to generate barcode for printing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
  // Only include barcode if shouldShowBarcode is true AND barcodeImage exists
  const barcodeHTML = (shouldShowBarcode && barcodeImage && barcodeImage.length > 0) ? `
        <div class="barcode-container">
          <img src="${barcodeImage}" alt="Barcode: ${barcode}" class="barcode-image" />
        </div>
  ` : '';
  
  const noBarcodeClass = (!shouldShowBarcode) ? 'label-no-barcode' : '';
  const hasBarcode = shouldShowBarcode && barcodeImage && barcodeImage.length > 0;
  const storeNameLine = (hasBarcode && storeName) ? `<div class="label-store-name">${storeName}</div>` : '';

  const labelHTML = `
      <div class="label ${noBarcodeClass}">
        ${storeNameLine}
        <div class="product-name">${productName}</div>
        <div class="price">${formatPrice(price)}</div>
        ${barcodeHTML}
      </div>
  `;

  // Repeat label for the specified quantity
  const labelsHTML = Array(quantity).fill(labelHTML).join('');

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Barcode Label</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
      <style>
        @page {
          size: 40mm auto; /* 4cm width, auto height - fixed height causes blank prints */
          margin: 0;
        }
        @media print {
          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 40mm !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .label {
            margin: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            width: 40mm !important;
            height: 20mm !important;
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
          }
        }
        body {
          font-family: 'Instrument Serif', serif;
          margin: 0;
          padding: 0;
          background: white;
          width: 40mm;
        }
        .label {
          text-align: center;
          width: 40mm;
          height: 20mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 0;
          margin: 0;
          page-break-after: always;
          page-break-inside: avoid;
          box-sizing: border-box;
        }
        .label:first-child {
          page-break-before: auto;
        }
        .label-no-barcode {
          justify-content: center;
          gap: 8px;
        }
        .label:last-child {
          page-break-after: auto;
        }
        .label-store-name {
          align-self: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5mm;
          text-align: center;
          width: fit-content;
          max-width: 100%;
          font-size: 12px;
          font-weight: 600;
          color: #333;
          margin: 1mm 0 0.5mm 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .label-store-name::before,
        .label-store-name::after {
          content: "";
          width: 0.7mm;
          height: 0.7mm;
          border-radius: 50%;
          background: #333;
          flex-shrink: 0;
        }
        .product-name {
          font-size: 14px;
          font-weight: 600;
          color: #000000;
          word-wrap: break-word;
          overflow-wrap: break-word;
          margin: -0.5mm 0 1mm 0;
          overflow: visible;
          line-height: 1.1;
        }
        .label-no-barcode .product-name {
          font-size: 22px;
        }
        .price {
          font-size: 18px;
          font-weight: 600;
          padding: 0;
          margin: -0.5mm 0 -2mm 0;
          color: #000000;
        }
        .label-no-barcode .price {
          font-size: 26px;
        }
        .barcode-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          margin-bottom: -5px;
          padding-top: 0;
          padding-bottom: 0;
        }
        .barcode-image {
          width: 100%;
          height: 32px;
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
      (function() {
        function adjustProductNameSizes() {
          const labels = document.querySelectorAll('.label');
          labels.forEach(function(label) {
            const productName = label.querySelector('.product-name');
            const price = label.querySelector('.price');
            
            if (!productName) return;
            
            const labelRect = label.getBoundingClientRect();
            const priceRect = price ? price.getBoundingClientRect() : null;
            const barcodeContainer = label.querySelector('.barcode-container');
            const barcodeRect = barcodeContainer ? barcodeContainer.getBoundingClientRect() : null;
            
            const hasBarcode = barcodeContainer && barcodeContainer.querySelector('.barcode-image');
            
            const labelHeight = labelRect.height;
            const paddingTop = 0.5;
            const priceHeight = priceRect ? (priceRect.bottom - priceRect.top) : 15;
            const barcodeHeight = hasBarcode && barcodeRect ? (barcodeRect.bottom - barcodeRect.top) : 0;
            const margins = hasBarcode ? 1 : 2;
            const productNamePaddingBottom = 2;
            
            const paddingTopPx = paddingTop * 3.78;
            const maxProductNameHeight = labelHeight - paddingTopPx - priceHeight - barcodeHeight - margins - productNamePaddingBottom;
            
            const getOneLineHeight = (fs) => fs * 1.1 + 2;
            
            const baseFontSize = hasBarcode ? 14 : 18;
            const maxFontSize = hasBarcode ? 22 : 28;
            const minFontSize = hasBarcode ? 9 : 12;
            
            const twoLinesHeight = baseFontSize * 1.1 * 2 + 2;
            
            let fontSize = baseFontSize;
            productName.style.fontSize = fontSize + 'px';
            productName.style.maxHeight = 'none';
            
            void productName.offsetHeight;
            
            let currentHeight = productName.offsetHeight;
            const oneLineHeightBase = getOneLineHeight(baseFontSize);
            
            if (currentHeight <= oneLineHeightBase) {
              let maxWorkingSize = baseFontSize;
              const startSize = baseFontSize + 2;
              for (let testSize = startSize; testSize <= maxFontSize; testSize += 1) {
                fontSize = testSize;
                productName.style.fontSize = fontSize + 'px';
                void productName.offsetHeight;
                currentHeight = productName.offsetHeight;
                
                if (currentHeight <= getOneLineHeight(fontSize) && currentHeight <= maxProductNameHeight) {
                  maxWorkingSize = testSize;
                } else {
                  fontSize = maxWorkingSize;
                  productName.style.fontSize = fontSize + 'px';
                  void productName.offsetHeight;
                  currentHeight = productName.offsetHeight;
                  break;
                }
              }
              
              while ((currentHeight > maxProductNameHeight || currentHeight > getOneLineHeight(fontSize)) && fontSize > baseFontSize) {
                fontSize -= 0.5;
                productName.style.fontSize = fontSize + 'px';
                void productName.offsetHeight;
                currentHeight = productName.offsetHeight;
              }
            }
            else if (currentHeight > twoLinesHeight && currentHeight > maxProductNameHeight) {
              while (currentHeight > maxProductNameHeight && fontSize > minFontSize) {
                fontSize -= 0.5;
                productName.style.fontSize = fontSize + 'px';
                void productName.offsetHeight;
                currentHeight = productName.offsetHeight;
              }
            }
            
            productName.style.maxHeight = (maxProductNameHeight + productNamePaddingBottom) + 'px';
            
            const finalHeight = productName.offsetHeight;
            const finalOneLineHeight = getOneLineHeight(fontSize);
            if (finalHeight <= finalOneLineHeight) {
              productName.style.marginBottom = '-6px';
            } else {
              productName.style.marginBottom = '0';
            }
          });
        }
        
        function waitForImagesAndAdjust() {
          const images = document.querySelectorAll('img');
          let loadedCount = 0;
          const totalImages = images.length;
          
          if (totalImages === 0) {
            adjustProductNameSizes();
            return;
          }
          
          images.forEach(function(img) {
            if (img.complete) {
              loadedCount++;
              if (loadedCount === totalImages) {
                adjustProductNameSizes();
              }
            } else {
              img.onload = function() {
                loadedCount++;
                if (loadedCount === totalImages) {
                  adjustProductNameSizes();
                }
              };
              img.onerror = function() {
                loadedCount++;
                if (loadedCount === totalImages) {
                  adjustProductNameSizes();
                }
              };
            }
          });
        }
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', waitForImagesAndAdjust);
        } else {
          setTimeout(waitForImagesAndAdjust, 100);
        }
        
        window.onload = waitForImagesAndAdjust;
      })();
    </script>
    </html>
  `;

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Failed to initialize print iframe');
  }

  iframeDoc.open();
  iframeDoc.write(printContent);
  iframeDoc.close();

  iframe.onload = () => {
    setTimeout(async () => {
      try {
        const bodyContent = iframeDoc.body?.innerHTML || '';
        if (!bodyContent || bodyContent.trim().length === 0) {
          throw new Error('Iframe body is empty - cannot print');
        }

        if (window.api?.app?.printSilently) {
          const iframeHTML = iframeDoc.documentElement.outerHTML;
          if (!iframeHTML || iframeHTML.length < 100) {
            throw new Error('Iframe HTML is invalid or too short');
          }
          const deviceName = (await window.api.database.options.get("labelPrinterName")) || "";
          window.api.app.printSilently(`<!DOCTYPE html>${iframeHTML}`, deviceName)
            .then(() => {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
            })
            .catch((error: Error) => {
              console.error("Silent print failed, falling back to regular print:", error);
              // Fallback to regular print
              iframe.contentWindow?.print();
              setTimeout(() => {
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
              }, 100);
            });
        } else {
          // Fallback to browser print
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }, 100);
        }
      } catch (error) {
        console.error("Print error:", error);
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
        throw error;
      }
    }, 200); // Delay to ensure CSS is loaded
  };
};
