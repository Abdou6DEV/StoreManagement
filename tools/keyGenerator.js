// Key Generator Tool for Store Management App
// Run with: node keyGenerator.js

// Same hash function as in the app
const _hash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

// Same dictionary as in the app
const _chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Function to generate validation key from Machine GUID (must match app: first 16 non-hyphen chars, lowercase)
function generateValidationKey(machineId) {
  const withoutHyphens = (machineId || '').replace(/-/g, '').toLowerCase();
  if (withoutHyphens.length < 16) {
    throw new Error("Invalid machine ID. Must have at least 16 characters (after removing hyphens).");
  }
  const idPart = withoutHyphens.substring(0, 16);

  const validationKey = idPart.split('').map((char, i) => {
    const hash = _hash(char + i.toString());
    const index = hash % _chars.length;
    return _chars[index];
  }).join('');

  return validationKey;
}

// Example usage
console.log("🔑 Store Management - Key Generator Tool");
console.log("=====================================");
console.log("");

// Example Machine GUID (you'll get this from customers)
const exampleMachineId = "12345678-1234-1234-1234-123456789ABC";
const exampleKey = generateValidationKey(exampleMachineId);

console.log("Example:");
console.log(`Machine ID: ${exampleMachineId}`);
console.log(`Validation Key: ${exampleKey}`);
console.log("");

// Interactive mode
console.log("To generate a key for a customer:");
console.log("1. Get their Machine ID from the app");
console.log("2. Run: node keyGenerator.js <MACHINE_ID>");
console.log("3. Give them the generated key");
console.log("");

// If command line argument provided
if (process.argv[2]) {
  const customerMachineId = process.argv[2];
  try {
    const customerKey = generateValidationKey(customerMachineId);
    console.log("Customer Key Generation:");
    console.log(`Machine ID: ${customerMachineId}`);
    console.log(`Validation Key: ${customerKey}`);
    console.log("");
    console.log("✅ Give this key to your customer!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}
