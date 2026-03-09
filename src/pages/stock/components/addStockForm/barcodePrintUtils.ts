import { generateRealBarcode, getRecommendedFormat } from '../../../../lib/utils/barcodeVisual';
import instrumentSerifWoff2 from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url';

export interface BarcodeLabelData {
  productName: string;
  price: number | string;
  barcode: string;
}

/**
 * Print barcode label with real, scannable barcode
 * Supports multiple labels per print, size = 40mm x 20mm (4cm x 2cm) per label
 */
export const printBarcodeLabel = async (
  data: BarcodeLabelData,
  quantity = 1,
  showBarcode = true,
  showStoreName = true,
  previousPrice?: number | string
): Promise<void> => {
  const { productName, price, barcode } = data;

  const shouldShowBarcode = showBarcode === true;
  const showPreviousPrice = previousPrice != null && previousPrice !== '' && String(previousPrice) !== String(price);

  if (!productName) {
    throw new Error('Product name is required for printing');
  }

  if (shouldShowBarcode && !barcode) {
    throw new Error('Barcode is required when showing barcode');
  }

  const storeName = showStoreName ? ((await window.api.database.options.get("storeName")) || "") : "";

  let fontFaceCss = "";
  let fontFamily = "Georgia, serif";
  try {
    const fontUrl = new URL(instrumentSerifWoff2, window.location.href).href;
    const res = await fetch(fontUrl);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    const base64 = btoa(binary);
    fontFaceCss = `@font-face {
          font-family: 'Instrument Serif';
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: url("data:font/woff2;base64,${base64}") format('woff2');
        }`;
    fontFamily = "'Instrument Serif', serif";
  } catch {
    fontFaceCss = "";
  }

  // Use iframe method for direct printing (like receipt printing)
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "180px";
  iframe.style.height = "400px";
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
    const spaceThousands = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (numPrice % 1 === 0) {
      return `${spaceThousands(String(Math.round(numPrice)))}<span class="price-currency">DA</span>`;
    }
    const [intPart, decPart] = numPrice.toFixed(2).split('.');
    return `${spaceThousands(intPart)}.${decPart}<span class="price-currency">DA</span>`;
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
  const noStoreNameClass = !storeName ? 'label-no-store-name' : '';
  const storeNameLine = storeName ? `<div class="label-store-name">${storeName}</div>` : '';
  const showPrev = showPreviousPrice && previousPrice != null && previousPrice !== '';
  const priceContent = showPrev
    ? `<span class="price-previous">${formatPrice(previousPrice)}</span><span class="price-current">${formatPrice(price)}</span>`
    : formatPrice(price);
  const priceWrapperClass = showPrev ? ' price-with-previous' : '';
  const noBarcodeBigPriceHTML = !shouldShowBarcode
    ? `<div class="label-no-barcode-big-price"><span class="big-price${priceWrapperClass}">${priceContent}</span></div>`
    : '';

  const labelHTML = `
      <div class="label ${noBarcodeClass} ${noStoreNameClass}">
        ${storeNameLine}
        <div class="product-name">${productName}</div>
        ${hasBarcode ? `<div class="price${priceWrapperClass}">${priceContent}</div>` : ''}
        ${hasBarcode ? barcodeHTML : noBarcodeBigPriceHTML}
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
        ${fontFaceCss}
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
          font-family: ${fontFamily};
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
          justify-content: space-between;
          gap: 0;
        }
        .label-no-barcode.label-no-store-name {
          padding-top: 3mm;
        }
        .label-no-barcode-big-price {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 0;
          width: 100%;
        }
        .label-no-barcode-big-price .big-price {
          font-size: 25px;
          font-weight: 600;
          color: #000;
          line-height: 1.1;
          text-align: center;
        }
        .label-no-barcode-big-price .price-currency {
          font-size: 0.7em;
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
          font-size: 11px;
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
          margin: -1mm 0 1mm 0;
          overflow: visible;
          line-height: 1.1;
        }
        .label:not(.label-no-barcode) .product-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .label-no-store-name .product-name {
          margin-top: 2mm;
          padding-bottom: 0;
          box-sizing: content-box;
        }
        .label-no-barcode .product-name {
          margin-top: 1mm;
        }
        .label-no-barcode .product-name.product-name-two-lines {
          margin-top: -1mm !important;
        }
        .label-no-barcode:not(.label-no-store-name) .product-name {
          font-size: 16px;
        }
        .label-no-barcode.label-no-store-name .product-name {
          font-size: 20px;
        }
        .price {
          font-size: 18px;
          font-weight: 600;
          padding: 0;
          margin: -1mm 0 -2mm 0;
          margin-top: 0.5mm;
          color: #000000;
        }
        .price-currency {
          font-size: 0.75em;
          font-weight: 600;
        }
        .price-with-previous {
          display: flex !important;
          align-items: baseline;
          justify-content: center;
          flex-wrap: wrap;
          gap: 2.5px;
        }
        .price-previous {
          position: relative;
          display: inline-block;
          font-size: 0.7em;
          font-weight: 600;
          color: #000000;
          align-self: flex-end;
          gap: 1.5px;
          margin-bottom: 3px;
        }
        .price-previous::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 100%;
          height: 0.5px;
          min-height: 0.5px;
          background: #000;
          transform: translate(-50%, -50%) rotate(9deg);
          transform-origin: center;
          pointer-events: none;
        }
        .price-current {
          font-size: 1em;
          font-weight: 600;
          color: #000000;
        }
        .label-no-barcode .price-previous {
          font-size: 0.70em;
          margin-bottom: 2px;
        }
        .label-no-barcode .price {
          font-size: 26px;
        }
        .label-no-store-name .price {
          font-size: 22px;
          margin-top: -1mm;
        }
        .label-no-store-name .barcode-container {
          margin-top: -12px;
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
            if (!hasBarcode) return;
            
            const hasStoreName = !!label.querySelector('.label-store-name');
            const labelHeight = labelRect.height;
            const paddingTop = 0.5;
            const priceHeight = priceRect ? (priceRect.bottom - priceRect.top) : 15;
            const barcodeHeight = hasBarcode && barcodeRect ? (barcodeRect.bottom - barcodeRect.top) : 0;
            const margins = hasBarcode ? 1 : 2;
            const productNamePaddingBottom = 2;
            
            const paddingTopPx = paddingTop * 3.78;
            let maxProductNameHeight = labelHeight - paddingTopPx - priceHeight - barcodeHeight - margins - productNamePaddingBottom;
            const getOneLineHeight = (fs) => fs * 1.1 + 2;
            if (hasBarcode) {
              maxProductNameHeight = Math.min(maxProductNameHeight, getOneLineHeight(14));
            }
            
            const baseFontSize = hasBarcode ? 14 : 18;
            const maxFontSize = hasBarcode ? 18 : 18;
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
            
            const extraBottom = (hasBarcode && !hasStoreName) ? 5 : 0;
            productName.style.maxHeight = (maxProductNameHeight + productNamePaddingBottom + extraBottom) + 'px';
            if (hasBarcode) {
              const labelWidthPx = labelRect.width - 4;
              while (productName.offsetWidth > labelWidthPx && fontSize > minFontSize) {
                fontSize -= 0.5;
                productName.style.fontSize = fontSize + 'px';
              }
            }
            const finalHeight = productName.offsetHeight;
            const finalOneLineHeight = getOneLineHeight(fontSize);
            if (finalHeight <= finalOneLineHeight) {
              productName.style.marginBottom = '-6px';
            } else {
              productName.style.marginBottom = '0';
            }
          });
          noBarcodeTwoLineNameUp();
        }
        
        function noBarcodeTwoLineNameUp() {
          document.querySelectorAll('.label-no-barcode .product-name').forEach(function(productName) {
            var style = window.getComputedStyle(productName);
            var fs = parseFloat(style.fontSize) || 16;
            var lh = style.lineHeight;
            var oneLineH = (lh && lh !== 'normal') ? parseFloat(lh) : fs * 1.1;
            var h = productName.offsetHeight;
            var rects = productName.getClientRects();
            var twoLines = (rects.length >= 2) || (h > oneLineH * 1.5);
            if (twoLines) {
              productName.classList.add('product-name-two-lines');
            } else {
              productName.classList.remove('product-name-two-lines');
            }
          });
        }
        
        function waitForImagesAndAdjust() {
          const images = document.querySelectorAll('img');
          let loadedCount = 0;
          const totalImages = images.length;
          
          if (totalImages === 0) {
            adjustProductNameSizes();
            setTimeout(noBarcodeTwoLineNameUp, 0);
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
        
        function runAdjustments() {
          waitForImagesAndAdjust();
          [50, 150].forEach(function(ms) {
            setTimeout(noBarcodeTwoLineNameUp, ms);
          });
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', runAdjustments);
        } else {
          setTimeout(runAdjustments, 100);
        }
        window.onload = runAdjustments;
        window.addEventListener('message', function(e) {
          if (e.data === 'runNoBarcodeTwoLineUp') noBarcodeTwoLineNameUp();
        });
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
        iframe.contentWindow?.postMessage('runNoBarcodeTwoLineUp', '*');
        await new Promise((r) => setTimeout(r, 80));
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
