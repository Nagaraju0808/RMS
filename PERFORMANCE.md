# Performance check (Phase 12)

**Data:** a separate database seeded with 90 days of history – **12,434 orders, 27,508 order lines, 12,187 bills,
1,850 ratings** (`SEED_DAYS=90 SEED_ORDERS_PER_DAY=80 npm run db:seed` into `dineflow_perf`).
**Server:** production build (`npm run build && npm start`) on the 4-CPU development container, PostgreSQL 16 on the same machine.
**How:** `node scripts/perf.mjs http://localhost:3001` – logs in as the owner and calls each screen's API 5 times.

| Screen / API | Median | Worst of 5 |
|---|---:|---:|
| Dashboard | 47 ms | 117 ms |
| Active orders / Kitchen / Tables / Menu | 6–17 ms | 26 ms |
| Paid orders (200 newest) | 61 ms | 92 ms |
| Reports over 90 days (sales, items, categories, busy hours, payments, discounts, cancellations, staff, inventory, profit, branches) | 7–56 ms | 58 ms |
| GST report over 90 days (12k invoices) | 111 ms | 135 ms |
| Excel export / PDF export (90 days) | 33 / 45 ms | 71 / 63 ms |
| Smart insights (forecast, purchase, menu, reviews) | 9–37 ms | 46 ms |

**Result: every call is far under the 500 ms target.** No extra indexes were needed; the existing indexes on
`(restaurantId, branchId, createdAt)` for orders and bills carry the reports.

## Found and fixed during the check
- **Duplicate order numbers under load.** 30 orders sent at the same moment produced 13 repeated order numbers
  (the number was "today's count + 1"). Order and token numbers now come from one atomic database update,
  and the same offline order arriving twice at once returns the one order instead of an error.
  Re-test: 2 × 30 simultaneous orders → 0 duplicates. Covered by `tests/integration/concurrency.test.ts`.

## When to look again
- The GST report reads each bill's tax breakdown in the app; at 100k+ bills per period, move that sum into SQL.
- Reports run live on the main database. For many branches with years of data, add a read replica or nightly summary tables.
