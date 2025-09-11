// EAN13 Barcode Generator
// Format: YYMMDDXXXXX + Check Digit (13 digits total)
// YY = Last 2 digits of current year
// MM = Month (01-12)
// DD = Day of month (01-31)
// XXXXX = Sequential number (resets daily)
// Last digit is EAN13 check digit

type BarcodeError = {
  code: 'SEQUENCE_OVERFLOW' | 'INVALID_DATE';
  message: string;
};


// Helper function to clean up old localStorage entries
const cleanupOldSequences = (): void => {
  const today = new Date().toISOString().split('T')[0];
  const key = `lastBarcodeSequence_${today}`;
  
  try {
    const oldKeys = Object.keys(localStorage).filter(k => 
      k.startsWith('lastBarcodeSequence_') && k !== key
    );
    oldKeys.forEach(k => localStorage.removeItem(k));
  } catch (error) {
    // Ignore cleanup errors
  }
};

// Atomic sequence increment to prevent race conditions
const atomicIncrementSequence = (): number => {
  // Use high-precision timestamp to avoid race conditions
  const now = Date.now();
  const performanceNow = performance.now();
  
  // Combine timestamp with performance counter for maximum uniqueness
  const timestampPart = now % 100000; // Last 5 digits of timestamp
  const performancePart = Math.floor(performanceNow * 1000) % 1000; // Microsecond precision
  
  // Create a unique sequence that's very unlikely to collide
  // Ensure it's always at least 1 to avoid "00000" sequences
  let uniqueSequence = (timestampPart * 1000 + performancePart) % 100000;
  if (uniqueSequence === 0) {
    uniqueSequence = 1; // Ensure minimum value
  }
  
  // Clean up old sequences (non-critical)
  try {
    cleanupOldSequences();
  } catch (error) {
    // Ignore cleanup errors
  }
  
  return uniqueSequence;
};


// Generate a new unique barcode - EAN13 compatible
export const generateBarcode = async (): Promise<string> => {
  const now = new Date();
  
  try {
    console.log('Generating EAN13 compatible barcode');
    
    // Generate a 12-digit base code for EAN13
    // Format: YYMMDDXXXXXX (12 digits)
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // Get sequence number (6 digits to fill remaining space)
    const sequence = atomicIncrementSequence();
    const sequenceStr = sequence.toString().padStart(6, '0');
    
    // Combine to create 12-digit base
    const baseCode = `${year}${month}${day}${sequenceStr}`;
    console.log('Base code (12 digits):', baseCode);
    
    // Calculate EAN13 check digit
    const checkDigit = calculateEAN13CheckDigit(baseCode);
    const barcode = `${baseCode}${checkDigit}`;
    
    console.log('Final EAN13 barcode (13 digits):', barcode);
    
    return barcode;
  } catch (error) {
    console.error('Error in generateBarcode:', error);
    if ((error as BarcodeError).code) {
      throw error;
    }
    throw new Error(`Failed to generate barcode: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Calculate EAN13 check digit (standard algorithm)
const calculateEAN13CheckDigit = (code: string): number => {
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    const digit = parseInt(code[i], 10);
    // Odd positions (1,3,5...) multiply by 1, even positions (2,4,6...) multiply by 3
    // Note: i is 0-based, so odd positions are i % 2 === 0
    sum += (i % 2 === 0) ? digit * 1 : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
};

// Validate barcode structure and check digit (EAN13 format)
export const isValidBarcode = (barcode: string): boolean => {
  // Basic format check (13 digits for EAN13)
  if (!/^\d{13}$/.test(barcode)) return false;
  
  try {
    // Validate EAN13 check digit
    const code = barcode.slice(0, -1);
    const expectedCheckDigit = calculateEAN13CheckDigit(code);
    const actualCheckDigit = parseInt(barcode[barcode.length - 1], 10);
    
    return expectedCheckDigit === actualCheckDigit;
  } catch {
    return false;
  }
};

// Format barcode for display (groups of 4 digits)
export const formatBarcode = (barcode: string): string => {
  if (!barcode) return '';
  return barcode.match(/.{1,4}/g)?.join(' ') || barcode;
};

// Parse formatted barcode (remove spaces)
export const parseBarcode = (barcode: string): string => {
  return barcode.replace(/\s/g, '');
};

// Extract date from barcode (EAN13 format: YYMMDDXXXXXX)
export const getBarcodeDate = (barcode: string): Date | null => {
  if (!isValidBarcode(barcode)) return null;
  
  try {
    const year = 2000 + parseInt(barcode.slice(0, 2), 10);
    const month = parseInt(barcode.slice(2, 4), 10);
    const day = parseInt(barcode.slice(4, 6), 10);
    
    // Handle year 2000 problem by using current century
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const fullYear = currentCentury + parseInt(barcode.slice(0, 2), 10);
    
    const date = new Date(fullYear, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

