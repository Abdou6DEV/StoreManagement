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
  
  // Use explicit boolean check for class
  const noBarcodeClass = (!shouldShowBarcode) ? 'label-no-barcode' : '';
  
  const labelHTML = `
      <div class="label ${noBarcodeClass}">
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
          font-family: Arial, sans-serif;
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
          padding-top: 0.5mm;
          padding-bottom: 0;
          padding-left: 0;
          padding-right: 0;
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
        .product-name {
          font-size: 12px;
          font-weight: 600;
          color: #000000;
          word-wrap: break-word;
          overflow-wrap: break-word;
          margin-top: 0;
          margin-bottom: 0;
          padding-top: 0;
          padding-bottom: 2px;
          overflow: visible;
          line-height: 1.1;
        }
        .label-no-barcode .product-name {
          font-size: 18px;
        }
        .price {
          font-size: 15px;
          font-weight: 600;
          padding: 0;
          margin: 0;
          margin-top: -4px;
          color: #000000;
        }
        .label-no-barcode .price {
          font-size: 22px;
        }
        .barcode-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0px;
          margin-top: -6px;
          margin-bottom: 0;
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
            
            const baseFontSize = hasBarcode ? 12 : 18;
            const maxFontSize = hasBarcode ? 20 : 28;
            const minFontSize = hasBarcode ? 8 : 12;
            
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

  // Use iframe method exactly like receipt printing - wait for content to load, then get HTML and print
  iframe.onload = () => {
    setTimeout(() => {
      try {
        // Verify iframe has content
        const bodyContent = iframeDoc.body?.innerHTML || '';
        if (!bodyContent || bodyContent.trim().length === 0) {
          throw new Error('Iframe body is empty - cannot print');
        }

        // Use Electron's silent print if available, otherwise regular print
        if (window.api?.app?.printSilently) {
          // Get the iframe's HTML content and print it silently
          const iframeHTML = iframeDoc.documentElement.outerHTML;
          
          // Verify we have valid HTML
          if (!iframeHTML || iframeHTML.length < 100) {
            throw new Error('Iframe HTML is invalid or too short');
          }
          
          window.api.app.printSilently(`<!DOCTYPE html>${iframeHTML}`)
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
