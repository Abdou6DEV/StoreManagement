import { execSync } from "child_process";

const _hash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

/** Generate the 16-char activation key from machine GUID (same as keyGenerator.js: first 16 non-hyphen chars, normalized to lowercase). */
export function generateValidationKey(machineGuid: string): string {
  const withoutHyphens = machineGuid.replace(/-/g, "").toLowerCase();
  const id = withoutHyphens.substring(0, 16);
  const _chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return id
    .split("")
    .map((char, i) => {
      const index = _hash(char + i.toString()) % 36;
      return _chars[index];
    })
    .join("");
}

/** Get Windows Machine GUID from registry. */
export function getMachineGuid(): string {
  try {
    const command =
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid';
    const output = execSync(command, { encoding: "utf8" });
    const match = output.match(/MachineGuid\s+REG_SZ\s+(.+)/);
    if (match && match[1]) return match[1].trim();
    throw new Error("Could not read Machine GUID");
  } catch (error) {
    console.error("Error reading Machine GUID:", error);
    throw new Error("Failed to read machine identifier");
  }
}

/** Validate an entered key against the current machine's expected key. */
export function validateKey(machineId: string, enteredKey: string): boolean {
  const expectedKey = generateValidationKey(machineId);
  return expectedKey === enteredKey.trim().toUpperCase();
}
