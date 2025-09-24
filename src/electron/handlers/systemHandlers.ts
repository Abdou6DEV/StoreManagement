import { ipcMain } from "electron";
import { execSync } from "child_process";

// Hash function for generating validation keys
const _hash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

// Generate validation key from machine GUID
const generateValidationKey = (machineGuid: string): string => {
  const id = machineGuid.substring(0, 16).replace(/-/g, ''); // First 16 chars, remove hyphens
  const _chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // 36 chars
  
  return id.split('').map((char, i) => {
    const hash = _hash(char + i.toString());
    const index = hash % 36;
    return _chars[index];
  }).join('');
};

// Get Windows Machine GUID
const getMachineGuid = (): string => {
  try {
    // Read from Windows registry
    const command = 'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid';
    const output = execSync(command, { encoding: 'utf8' });
    
    // Extract GUID from output
    const match = output.match(/MachineGuid\s+REG_SZ\s+(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    throw new Error('Could not read Machine GUID');
  } catch (error) {
    console.error('Error reading Machine GUID:', error);
    throw new Error('Failed to read machine identifier');
  }
};

export function setupSystemHandlers() {
  // Get machine identifier
  ipcMain.handle("system:getMachineId", async () => {
    try {
      const machineGuid = getMachineGuid();
      return { success: true, machineId: machineGuid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Generate validation key
  ipcMain.handle("system:generateValidationKey", async (_event, machineId: string) => {
    try {
      const validationKey = generateValidationKey(machineId);
      return { success: true, validationKey };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Validate entered key
  ipcMain.handle("system:validateKey", async (_event, machineId: string, enteredKey: string) => {
    try {
      const expectedKey = generateValidationKey(machineId);
      const isValid = expectedKey === enteredKey;
      return { success: true, isValid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
