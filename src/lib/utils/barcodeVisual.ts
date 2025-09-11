import JsBarcode from 'jsbarcode';

export interface BarcodeVisualOptions {
  format: 'EAN13' | 'CODE128' | 'UPC';
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
    console.log(`Attempting to generate barcode "${code}" with format: ${format}`);
    
    // Validate format compatibility
    if (!validateBarcode(code, format)) {
      // Fallback to CODE128 if validation fails
      const fallbackFormat = 'CODE128';
      console.warn(`Barcode "${code}" is not valid for ${format}, falling back to ${fallbackFormat}`);
      options.format = fallbackFormat;
    }

    // Create a canvas element
    const canvas = document.createElement('canvas');
    
    // Generate the barcode
    console.log(`Generating barcode with JsBarcode:`, {
      code,
      format: options.format,
      width: options.width || 2,
      height: options.height || 100
    });
    
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

    // Convert canvas to SVG
    const svgString = canvas.toDataURL('image/svg+xml');
    return svgString;
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
 * Get recommended barcode format based on code length
 */
export const getRecommendedFormat = (code: string): BarcodeVisualOptions['format'] => {
  // Always use EAN13 for our barcodes (13 digits)
  if (/^\d{13}$/.test(code)) return 'EAN13';
  // Fallback to CODE128 for any other format
  return 'CODE128';
};
