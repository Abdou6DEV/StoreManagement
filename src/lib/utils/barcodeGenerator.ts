// Simple internal barcode generator
// Format: YYMDDXXXXX + Check Digit
// YY = Last 2 digits of current year
// M = Last digit of month (1-9, A-C for Oct-Dec)
// DD = Day of month
// XXXXX = Sequential number (resets daily)
// Last digit is a check digit

type BarcodeError = {
  code: 'SEQUENCE_OVERFLOW' | 'INVALID_DATE';
  message: string;
};

// Calculate check digit using modulo 10
const calculateCheckDigit = (code: string): number => {
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit;
};

// Get the last used sequence for today from storage
const getLastSequence = (): number => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `lastBarcodeSequence_${today}`;
  const lastSeq = localStorage.getItem(key);
  const sequence = lastSeq ? parseInt(lastSeq, 10) : 0;
  
  // Clear old sequences (keep storage clean)
  const oldKeys = Object.keys(localStorage).filter(k => 
    k.startsWith('lastBarcodeSequence_') && k !== key
  );
  oldKeys.forEach(k => localStorage.removeItem(k));
  
  return sequence;
};

// Save the last used sequence
const saveLastSequence = (seq: number): void => {
  const today = new Date().toISOString().split('T')[0];
  const key = `lastBarcodeSequence_${today}`;
  localStorage.setItem(key, seq.toString());
};

// Convert month number to code (1-9, A-C)
const getMonthCode = (month: number): string => {
  if (month < 1 || month > 12) throw new Error('Invalid month');
  return month > 9 ? String.fromCharCode(65 + (month - 10)) : month.toString();
};

// Parse month code back to number
const parseMonthCode = (code: string): number => {
  if (/[A-C]/.test(code)) {
    return 10 + (code.charCodeAt(0) - 65);
  }
  return parseInt(code, 10);
};

// Generate a new unique barcode
export const generateBarcode = async (): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = now.getMonth() + 1;
  
  try {
    const monthCode = getMonthCode(month);
    const day = now.getDate().toString().padStart(2, '0');
    
    // Get the next sequence number (5 digits, resets daily)
    let sequence = getLastSequence() + 1;
    if (sequence > 99999) {
      throw { code: 'SEQUENCE_OVERFLOW' as const, message: 'Daily sequence limit reached' };
    }
    
    const sequenceStr = sequence.toString().padStart(5, '0');
    
    // Combine parts
    const code = `${year}${monthCode}${day}${sequenceStr}`;
    const checkDigit = calculateCheckDigit(code);
    const barcode = `${code}${checkDigit}`;
    
    // Save the used sequence
    saveLastSequence(sequence);
    
    return barcode;
  } catch (error) {
    if ((error as BarcodeError).code) {
      throw error;
    }
    throw { code: 'INVALID_DATE' as const, message: 'Failed to generate barcode' };
  }
};

// Validate barcode structure and check digit
export const isValidBarcode = (barcode: string): boolean => {
  // Basic format check (11 digits including check digit)
  if (!/^[0-9A-C]\d{10}$/.test(barcode)) return false;
  
  try {
    const year = parseInt(barcode.slice(0, 2), 10);
    const monthCode = barcode[2];
    const day = parseInt(barcode.slice(3, 5), 10);
    
    // Validate month code
    const month = parseMonthCode(monthCode);
    if (month < 1 || month > 12) return false;
    
    // Validate day
    const maxDays = new Date(2000 + year, month, 0).getDate();
    if (day < 1 || day > maxDays) return false;
    
    // Validate check digit
    const code = barcode.slice(0, -1);
    const expectedCheckDigit = calculateCheckDigit(code);
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

// Extract date from barcode
export const getBarcodeDate = (barcode: string): Date | null => {
  if (!isValidBarcode(barcode)) return null;
  
  try {
    const year = 2000 + parseInt(barcode.slice(0, 2), 10);
    const month = parseMonthCode(barcode[2]);
    const day = parseInt(barcode.slice(3, 5), 10);
    
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};
