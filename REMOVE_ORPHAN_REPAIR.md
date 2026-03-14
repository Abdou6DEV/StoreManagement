# Remove orphan repair when rollout is done

The app currently runs **orphan repair** at startup (in `src/lib/database/prismaClient.ts`). It cleans up records whose parent was deleted without cascade (e.g. payments whose client no longer exists).

**Why it was added:** A client had corrupt data (orphan payments) that broke the app. The repair fixes existing DBs when they update. Safe deletes were also added (clients, bills, products, purchases, users now delete or unlink children before deleting the parent), so **new orphans are no longer created**.

**When everything is done** (all users have the update and you’re confident no old builds are in use):

1. Open `src/lib/database/prismaClient.ts`.
2. Remove the four repair functions:
   - `repairOrphanPayments`
   - `repairOrphanBillPayments`
   - `repairOrphanPurchaseItems`
   - `repairOrphanUserPermissions`
3. In `initializeDatabase()`, remove the four calls to these functions (they run right after `ensureActivityLogTable`).
4. Delete this file (`REMOVE_ORPHAN_REPAIR.md`) if you like.

After that, startup will no longer run those extra reads. Safe deletes alone are enough to keep the DB consistent.
