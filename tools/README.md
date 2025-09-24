# Store Management - Tools

This folder contains tools for managing the Store Management application.

## Key Generator Tool

### Purpose
Generate validation keys for customers who purchase the Store Management app.

### Usage
1. Customer runs the app and gets their Machine ID
2. Customer sends you their Machine ID
3. Run the key generator:
   ```bash
   node keyGenerator.js "CUSTOMER_MACHINE_ID"
   ```
4. Send the generated validation key to your customer

### Example
```bash
node keyGenerator.js "12345678-1234-1234-1234-123456789ABC"
# Output: TPLHD9511X8YWM
```

### Security
- Uses the same hash function and dictionary as the app
- Impossible to reverse engineer
- Each PC gets a unique key based on its Machine GUID

### Files
- `keyGenerator.js` - Main key generation tool
- `README.md` - This documentation
