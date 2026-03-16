import instrumentSerifWoff2 from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url';

export interface ServiceLabelData {
  serviceName: string;
  clientName: string;
  deviceName: string;
  price: number | string;
  isPaid?: boolean;
}

export interface ServiceLabelLabels {
  service: string;
  client: string;
  device: string;
  price: string;
  payed: string;
  notPayed: string;
}

/**
 * Print service label (40mm x 20mm) with service name, client, device, price.
 * Uses the same label printer as barcode labels.
 */
export const printServiceLabel = async (
  data: ServiceLabelData,
  quantity = 1,
  labels: ServiceLabelLabels = {
    service: 'Service:',
    client: 'Client:',
    device: 'Device:',
    price: 'Price:',
    payed: 'Payed',
    notPayed: 'Not payed',
  }
): Promise<void> => {
  const { serviceName, clientName, deviceName, price, isPaid = false } = data;

  if (!serviceName || !serviceName.trim()) {
    throw new Error('Service name is required for printing');
  }

  let fontFaceCss = '';
  let fontFamily = 'Georgia, serif';
  try {
    const fontUrl = new URL(instrumentSerifWoff2, window.location.href).href;
    const res = await fetch(fontUrl);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const chunkSize = 8192;
    let binary = '';
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
    fontFaceCss = '';
  }

  const formatPrice = (p: number | string): string => {
    if (p === '' || p == null) return '\u200E—';
    const numPrice = Number(p);
    const spaceThousands = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const lrm = '\u200E'; // Left-to-Right Mark - prevents digit reversal in RTL
    if (numPrice % 1 === 0) {
      return `${lrm}${spaceThousands(String(Math.round(numPrice)))}<span class="price-currency">DA</span>`;
    }
    const [intPart, decPart] = numPrice.toFixed(2).split('.');
    return `${lrm}${spaceThousands(intPart)}.${decPart}<span class="price-currency">DA</span>`;
  };

  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const paymentSuffix = ` (${isPaid ? labels.payed : labels.notPayed})`;
  const serviceLine = escape(labels.service) + ' ' + escape(serviceName.trim() || '—');
  const clientLine = escape(labels.client) + ' ' + escape(clientName.trim() || '—');
  const deviceLine = escape(labels.device) + ' ' + escape(deviceName.trim() || '—');
  const priceLine = escape(labels.price) + ' ' + formatPrice(price) + escape(paymentSuffix);

  // If service name is too long, allow it to wrap to 2 lines and omit price to make space
  const SERVICE_NAME_LONG_THRESHOLD = 20;
  const isLongServiceName = serviceName.trim().length > SERVICE_NAME_LONG_THRESHOLD;
  const serviceNameClass = isLongServiceName ? 'service-name service-name-long' : 'service-name';

  const labelHTML = isLongServiceName
    ? `
    <div class="service-label service-label-no-price">
      <div class="service-label-line ${serviceNameClass}">${serviceLine}</div>
      <div class="service-label-line client-name">${clientLine}</div>
      <div class="service-label-line device-name">${deviceLine}</div>
      <div class="service-label-line price" dir="ltr">${priceLine}</div>
    </div>
  `
    : `
    <div class="service-label">
      <div class="service-label-line service-name">${serviceLine}</div>
      <div class="service-label-line client-name">${clientLine}</div>
      <div class="service-label-line device-name">${deviceLine}</div>
      <div class="service-label-line price" dir="ltr">${priceLine}</div>
    </div>
  `;
  const labelsHTML = Array(quantity).fill(labelHTML).join('');

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Service Label</title>
      <style>
        ${fontFaceCss}
        @page { size: 40mm auto; margin: 0; }
        @media print {
          * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          body { margin: 0 !important; padding: 0 !important; background: white !important; width: 40mm !important; }
          .service-label {
            width: 40mm !important;
            height: 20mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .service-label.service-label-no-price {
            padding: 0 !important;
            padding-top: 1.5mm !important;
          }
        }
        body {
          font-family: ${fontFamily};
          margin: 0;
          padding: 0;
          background: white;
          width: 40mm;
        }
        .service-label {
          width: 40mm;
          height: 20mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1mm 1mm;
          padding-top: 0.5mm;
          margin: 0;
          page-break-after: always;
          page-break-inside: avoid;
          box-sizing: border-box;
        }
        .service-label:last-child { page-break-after: auto; }
        .service-label.service-label-no-price {
          padding-top: 1.5mm;
        }
        .service-label-line {
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 96%;
          line-height: 1.1;
          color: #000;
          font-weight: 700;
        }
        .service-name { font-size: 14px; }
        .service-name-long {
          white-space: normal;
          word-wrap: break-word;
          word-break: break-word;
          line-height: 1.15;
          font-size: 13px;
        }
        .client-name { font-size: 14px; }
        .device-name { font-size: 13px; }
        .price { font-size: 15px; direction: ltr; unicode-bidi: embed; }
        .price-currency { font-size: 0.8em; font-weight: 700; }
      </style>
    </head>
    <body>${labelsHTML}</body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '180px';
  iframe.style.height = '400px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Failed to initialize print iframe');
  }

  iframeDoc.open();
  iframeDoc.write(printContent);
  iframeDoc.close();

  return new Promise<void>((resolve, reject) => {
    iframe.onload = () => {
      setTimeout(async () => {
        try {
          const bodyContent = iframeDoc.body?.innerHTML || '';
          if (!bodyContent || bodyContent.trim().length === 0) {
            throw new Error('Iframe body is empty - cannot print');
          }
          if (window.api?.app?.printSilently) {
            const iframeHTML = iframeDoc.documentElement.outerHTML;
            const deviceName = (await window.api.database.options.get('labelPrinterName_20x40')) || (await window.api.database.options.get('labelPrinterName')) || '';
            await window.api.app.printSilently(`<!DOCTYPE html>${iframeHTML}`, deviceName);
          } else {
            iframe.contentWindow?.print();
          }
          resolve();
        } catch (error) {
          if (window.api?.app?.printSilently) {
            try {
              iframe.contentWindow?.print();
              resolve();
            } catch {
              reject(error);
            }
          } else {
            reject(error);
          }
        } finally {
          setTimeout(() => {
            if (iframe.parentNode) document.body.removeChild(iframe);
          }, 100);
        }
      }, 200);
    };
  });
};
