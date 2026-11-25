// Called when items are sent to the kitchen (sold) or cancelled. Filled in by Phase 7 (inventory).
import type { Prisma } from "@prisma/client";
export async function onItemsSold(_tx: Prisma.TransactionClient, _branchId: string, _itemIds: string[]) {}
export async function onItemsCancelled(_tx: Prisma.TransactionClient, _branchId: string, _itemIds: string[]) {}
