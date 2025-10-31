import JsBarcode from 'jsbarcode';

export interface BarcodeVisualOptions {
  format?: 'EAN13' | 'CODE128' | 'UPC';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
}

/**
 * Generate a real, scannable barcode
 */
export const generateRealBarcode = (
  code: string, 
  options: BarcodeVisualOptions = { format: 'EAN13' }
): string => {
  try {
    // Validate input
    if (!code || code.trim() === '') {
      throw new Error('Barcode code cannot be empty');
    }

    // Auto-detect format if not specified
    const format = options.format || getRecommendedFormat(code);
    
    // Validate format compatibility
    if (!validateBarcode(code, format)) {
      // Fallback to CODE128 if validation fails
      const fallbackFormat = 'CODE128';
      options.format = fallbackFormat;
    }

    // Create a canvas element with higher resolution for better print quality
    const canvas = document.createElement('canvas');
    const scale = 4; // 4x resolution for crisp printing
    
    // Calculate dimensions based on code length and options
    const barWidth = options.width || 2;
    const barHeight = options.height || 100;
    const margin = options.margin || 10;
    
    // Estimate canvas size (rough estimate - JsBarcode will adjust)
    const estimatedWidth = (code.length * barWidth * 11) + (margin * 2); // Rough estimate
    const estimatedHeight = barHeight + (margin * 2) + (options.displayValue !== false ? 20 : 0);
    
    // Set canvas size with high DPI scaling
    canvas.width = estimatedWidth * scale;
    canvas.height = estimatedHeight * scale;
    
    // Get context and scale for high DPI rendering
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Scale context to maintain aspect ratio
      ctx.scale(scale, scale);
      // Set background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);
    }
    
    // Generate the barcode with anti-aliasing disabled for crisp lines
    JsBarcode(canvas, code, {
      format: options.format,
      width: barWidth,
      height: barHeight,
      displayValue: options.displayValue !== false,
      fontSize: options.fontSize || 12,
      margin: margin,
      background: '#ffffff',
      lineColor: '#000000',
      valid: function(valid) {
        if (!valid) {
          throw new Error('Invalid barcode data for format ' + options.format);
        }
      }
    });

    // Convert canvas to high-quality PNG with maximum quality
    const pngDataUrl = canvas.toDataURL('image/png', 1.0);
    return pngDataUrl;
  } catch (error) {
    console.error('Error generating barcode:', error);
    throw new Error(`Failed to generate barcode: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate barcode as SVG string (for better print quality)
 */
export const generateBarcodeSVG = (
  code: string, 
  options: BarcodeVisualOptions = { format: 'EAN13' }
): string => {
  try {
    // Create a temporary div to hold the barcode
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);

    // Create canvas
    const canvas = document.createElement('canvas');
    tempDiv.appendChild(canvas);

    // Generate barcode
    JsBarcode(canvas, code, {
      format: options.format,
      width: options.width || 2,
      height: options.height || 100,
      displayValue: options.displayValue !== false,
      fontSize: options.fontSize || 12,
      margin: options.margin || 10,
      background: '#ffffff',
      lineColor: '#000000',
    });

    // Get SVG data
    const svgData = canvas.toDataURL('image/svg+xml');
    
    // Clean up
    document.body.removeChild(tempDiv);

    return svgData;
  } catch (error) {
    console.error('Error generating barcode SVG:', error);
    throw new Error(`Failed to generate barcode SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate barcode specifically for receipts (8 characters max)
 */
export const generateReceiptBarcode = (
  code: string, 
  options?: BarcodeVisualOptions
): string => {
  // Truncate to 8 characters for receipts
  const receiptCode = truncateForReceipt(code);
  
  return generateRealBarcode(receiptCode, {
    ...options,
    format: 'CODE128', // Always use CODE128 for receipts
    width: options.width || 3, // Wider bars for better scanning and print quality
    height: options.height || 80, // Taller for better scanning
    fontSize: options.fontSize || 12, // Larger font for readability
    margin: options.margin || 10, // Optimized margin for better print quality
  });
};

/**
 * Validate barcode format
 */
export const validateBarcode = (code: string, format: BarcodeVisualOptions['format']): boolean => {
  try {
    switch (format) {
      case 'EAN13':
        // EAN13 must be exactly 13 digits
        return /^\d{13}$/.test(code);
      case 'CODE128':
        // CODE128 is very flexible - accepts most ASCII characters
        return code.length > 0 && code.length <= 80; // CODE128 max length is 80
      case 'UPC':
        return /^\d{12}$/.test(code);
      default:
        return false;
    }
  } catch {
    return false;
  }
};

/**
 * Truncate barcode code to 8 characters for receipts
 */
export const truncateForReceipt = (code: string): string => {
  if (!code) return '';
  // Take first 8 characters and pad with zeros if needed
  return code.substring(0, 8).padEnd(8, '0');
};

/**
 * Get recommended barcode format based on code length
 */
export const getRecommendedFormat = (code: string): BarcodeVisualOptions['format'] => {
  // For receipt barcodes, limit to 8 characters and use CODE128
  if (code.length <= 8) return 'CODE128';
  // Always use EAN13 for our barcodes (13 digits)
  if (/^\d{13}$/.test(code)) return 'EAN13';
  // Fallback to CODE128 for any other format
  return 'CODE128';
};
