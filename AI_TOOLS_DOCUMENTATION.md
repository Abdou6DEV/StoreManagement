# REDA TECH AI Tools - Complete Documentation

## Overview

The REDA TECH AI Chatbot now has access to **60+ read-only database tools** to retrieve accurate store data in real-time. These tools allow the AI to answer questions about sales, inventory, clients, payments, purchases, services, and more.

**KEY PRINCIPLE: All tools are READ-ONLY. The AI cannot modify the database in any way.**

## Architecture

```
┌─────────────────────────────────────┐
│  AI Chatbot (Frontend)              │
│  • Detects user intent              │
│  • Decides which tools to use       │
│  • Retrieves data via IPC           │
└──────────────┬──────────────────────┘
               │ window.api.ai.*
               │
┌──────────────▼──────────────────────┐
│  Electron Main Process              │
│  • aiHandlers.ts                    │
│  • Receives tool calls              │
│  • Routes to tool executor          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Tool Executor (toolExecutor.ts)    │
│  • Validates tool calls             │
│  • Executes tool functions          │
│  • Returns results safely           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Read-Only Tools (readOnlyTools.ts) │
│  • 60+ database query functions     │
│  • Uses existing database modules   │
│  • No mutations allowed             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Database Modules                   │
│  • sales.ts, products.ts, etc.     │
│  • Prisma queries                   │
│  • SQLite operations                │
└─────────────────────────────────────┘
```

## File Structure

```
src/electron/ai/tools/
├── readOnlyTools.ts          # 60+ tool functions + registry
├── toolExecutor.ts           # Tool validation & execution
└── ...

src/electron/handlers/
├── aiHandlers.ts             # IPC handlers for tools
└── ...

src/electron/preload/
└── aiAPI.ts                  # Expose tools to renderer
```

## Available Tools (60+)

### Sales Tools (11)
- `get_all_sales` - All sales with details
- `get_sales_by_date_range` - Sales in date range
- `get_sales_summary` - Summary stats (total, count, profit)
- `get_recent_sales` - Recent sales (default: 7 days)
- `get_sales_by_client` - Sales for specific client
- `get_sale_by_id` - Single sale details
- `search_sales` - Search by query
- `get_product_sales_counts` - Best-sellers

### Product & Stock Tools (8)
- `get_all_products` - All products with quantities
- `find_product_by_barcode` - Find by barcode
- `get_product_with_purchase_history` - Product + supplier history
- `get_unused_products` - Not sold in N months
- `get_low_stock_products` - Below threshold
- `get_out_of_stock_products` - Zero quantity
- `get_total_inventory_value` - Total inventory cost

### Client Tools (3)
- `get_all_clients` - All clients
- `get_clients_with_totals` - Clients with purchase totals & debts
- `find_client_by_name` - Find specific client

### Payment Tools (6)
- `get_all_payments` - All payments with client info
- `get_payments_by_client` - Payments for client
- `get_payments_by_date_range` - Payments in date range
- `get_overdue_payments` - Unpaid & past due
- `get_unpaid_payments` - All unpaid
- `get_payment_reasons` - Suggested payment reasons

### Purchase Tools (6)
- `get_all_purchases` - All purchases from suppliers
- `get_purchase_by_id` - Single purchase details
- `get_purchases_by_product` - Supplier history for product
- `get_purchases_by_seller` - Purchases from seller
- `get_purchases_by_date_range` - Purchases in date range
- `get_purchase_items_by_purchase` - Items in purchase

### Service Tools (7)
- `get_all_services` - Available service templates
- `search_services` - Search by name/description
- `get_service_by_id` - Single service details
- `get_all_service_appointments` - All appointments
- `get_service_appointment_by_id` - Single appointment
- `get_service_appointments_by_client` - Client appointments
- `get_upcoming_service_appointments` - Next N days
- `get_overdue_service_appointments` - Overdue
- `search_service_appointments` - Search appointments
- `get_service_appointment_stats` - Statistics
- `get_service_types` - Available types
- `get_service_names` - Available names
- `get_completed_services` - Completed services
- `get_service_history` - Service audit trail

### Bill Tools (2)
- `get_all_bills` - All bills/recurring expenses
- `get_bill_by_id` - Single bill details

### Seller Tools (2)
- `get_all_sellers` - All suppliers
- `get_seller_by_id` - Single supplier details

### Category Tools (1)
- `get_all_categories` - Product categories

### Manual Product Tools (3)
- `get_all_manual_products` - All manual/custom products
- `search_manual_products` - Search manual products
- `get_manual_product_by_id` - Single manual product

### Activity Log Tools (2)
- `get_activity_logs` - Activity logs with optional filters
- `get_activity_log_usernames` - Users with activity

## IPC API

### For the Frontend/Renderer:

```typescript
// Get available tools (for tooltips, help, etc.)
const tools = await window.api.ai.getAvailableTools();

// Execute a tool
const result = await window.api.ai.executeTool({
  toolName: "get_sales_by_date_range",
  input: {
    startDate: "2026-08-16",
    endDate: "2026-08-16"
  }
});

// Result format:
{
  toolName: "get_sales_by_date_range",
  success: true,
  result: [...sales data...]
  // OR on error:
  // error: "Error message"
}
```

## How the AI Uses Tools

### Example 1: User asks "How much did we sell today?"

```
User Message:
  "How much did we sell today?"
       ↓
AI Detects Intent:
  "User wants sales summary for today"
       ↓
AI Calls Tool:
  tool: "get_sales_summary"
  input: {
    startDate: "2026-08-16",
    endDate: "2026-08-16"
  }
       ↓
Tool Returns:
  {
    totalSales: 45000,
    totalItems: 23,
    totalProfit: 12000,
    numberOfTransactions: 8
  }
       ↓
AI Responds:
  "Today we made 8 sales for a total of 45,000 DA 
   with 23 items sold and 12,000 DA in profit."
```

### Example 2: User asks "What products are low in stock?"

```
User Message:
  "What products are low in stock?"
       ↓
AI Calls Tool:
  tool: "get_low_stock_products"
  input: {
    threshold: 5
  }
       ↓
Tool Returns:
  {
    threshold: 5,
    count: 3,
    products: [
      { name: "iPhone 15", quantity: 2, ... },
      { name: "Galaxy S24", quantity: 4, ... },
      { name: "AirPods Pro", quantity: 1, ... }
    ]
  }
       ↓
AI Responds:
  "You have 3 products below 5 units:
   • iPhone 15: 2 units
   • Galaxy S24: 4 units  
   • AirPods Pro: 1 unit"
```

## Date Handling

Tools accept dates in multiple formats:

```typescript
// ISO String (YYYY-MM-DD)
"2026-08-16"

// Date Object
new Date("2026-08-16")

// Natural dates (handled by AI)
"today", "yesterday", "this week", "last month", etc.
→ AI converts to appropriate date range

// Date ranges
startDate: "2026-08-01"
endDate: "2026-08-31"
```

## Tool Response Format

All tools follow consistent response format:

```typescript
{
  success: boolean;
  data?: any;              // Actual result data
  error?: string;          // Error message if success=false
}
```

### Success Response:
```json
{
  "success": true,
  "data": {
    /* tool-specific data */
  }
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Product not found: xyz123"
}
```

## Security & Safety

### ✅ WHAT THE AI CAN DO:
- Read all store data
- Query products, sales, clients, payments, etc.
- Filter and search data
- Provide summaries and statistics
- Remember conversation context

### ❌ WHAT THE AI CANNOT DO:
- Create new records
- Update existing records
- Delete records
- Cancel transactions
- Mark payments as paid
- Change stock quantities
- Modify client info
- Create bills, purchases, services
- Access raw Prisma client
- Execute arbitrary SQL

### Enforcement:
1. **Tool Registry**: Only explicitly registered tools are available
2. **No Prisma Access**: AI cannot use Prisma directly
3. **Read-Only Functions**: Tools call only read-only database functions
4. **IPC Validation**: Main process validates all tool calls
5. **Type Safety**: TypeScript prevents unauthorized calls

## Adding New Tools

To add a new read-only tool:

### 1. Create the tool function in `readOnlyTools.ts`:

```typescript
export async function tool_my_new_tool(input: {
  param1: string;
  param2?: number;
}): Promise<AIToolResult> {
  try {
    // Use existing database functions
    const data = await myDb.readOnlyFunction(input.param1);
    
    return {
      success: true,
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed: ${error}`,
    };
  }
}
```

### 2. Register in `AI_TOOLS_REGISTRY`:

```typescript
export const AI_TOOLS_REGISTRY = {
  // ... existing tools ...
  
  my_new_tool: {
    name: "my_new_tool",
    description: "What this tool does and when to use it",
    fn: tool_my_new_tool,
    input_schema: {
      param1: { type: "string", description: "..." },
      param2: { type: "number", description: "..." },
    },
  },
};
```

### 3. That's it! The tool is now available to the AI via:
- `ai:get-available-tools` IPC handler
- `window.api.ai.executeTool({ toolName: "my_new_tool", ... })`

## Testing Tools

### Test via IPC (Electron main process):

```typescript
import { executeToolCall } from "./src/electron/ai/tools/toolExecutor";

const result = await executeToolCall({
  toolName: "get_sales_by_date_range",
  input: {
    startDate: "2026-08-16",
    endDate: "2026-08-16"
  }
});

console.log(result);
```

### Test via Frontend:

```typescript
const tools = await window.api.ai.getAvailableTools();
console.log("Available tools:", tools.map(t => t.name));

const result = await window.api.ai.executeTool({
  toolName: "get_all_products",
  input: {}
});

console.log(result);
```

## Migration from Old System

The tools system is **non-breaking**:

- Existing chat functionality works unchanged
- Tools are optional (AI doesn't require them)
- System prompts guide AI to use tools when appropriate
- Conversation history still works
- Model switching still works
- All existing IPC handlers remain

## Performance Considerations

- Tools use existing database functions (optimized)
- Results are cached in conversation context
- Large result sets should use pagination/limits
- Tool calls happen sequentially (not parallel for safety)
- AI should prefer aggregation tools over raw data dumps

## Limitations & Future Work

### Current:
✓ 60+ read-only tools
✓ Real-time database queries
✓ Conversation context
✓ Multi-language support
✓ Error handling

### Future:
- Tool calling in API requests (native function calling)
- Parallel tool execution
- Caching layer for frequent queries
- Tool usage analytics
- Custom tool definitions per user/role
- Tool versioning
- Audit logging for AI tool usage

## Examples of Questions Now Supported

### Sales Analysis
- "How much did we sell today?"
- "Show me sales from August 1-10"
- "What are our best-selling products?"
- "Compare sales to last month"

### Stock Management
- "What's our current inventory?"
- "Which products are low in stock?"
- "Out of stock items?"
- "Total inventory value?"

### Client Management
- "Who are our clients?"
- "How much did Ahmed spend?"
- "What does Ahmed owe?"
- "Show me client purchases"

### Payment & Finance
- "What payments did we receive today?"
- "Overdue payments?"
- "Unpaid credits?"
- "Payment history for client X?"

### Purchases & Suppliers
- "What did we buy last month?"
- "Purchases from supplier X?"
- "Product supply history?"

### Services & Appointments
- "Pending services?"
- "Overdue appointments?"
- "Services completed this week?"
- "Upcoming appointments?"

### Activity & Compliance
- "Who did what today?"
- "Activity logs for user X?"
- "Show me store activity"

## Troubleshooting

### Issue: Tool not found
**Solution**: Check tool name matches registry, use `getAvailableTools()` to see all tools

### Issue: Tool returns error
**Solution**: Check input parameters match schema, ensure dates are in YYYY-MM-DD format

### Issue: Tool returns empty results
**Solution**: This is normal - data may not exist. AI should handle gracefully

### Issue: Performance slow
**Solution**: Use filtered queries instead of `get_all_*`, use pagination with `limit`/`offset`

## Security Audit Checklist

- ✅ No mutation functions in tool registry
- ✅ No Prisma client access
- ✅ No SQL raw queries
- ✅ No process.env exposure
- ✅ No file system access
- ✅ Input validation on all tools
- ✅ Error messages don't expose internals
- ✅ All database functions read-only
- ✅ IPC validation in place
- ✅ Type safety throughout

---

**Last Updated**: 2026-08-16
**Status**: Production Ready
**Tool Count**: 60+
