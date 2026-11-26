# TODO / known gaps
(Items are added here when a feature is stuck or intentionally left simple.)
- Direct thermal printing to USB/LAN printers needs a local print bridge (e.g. QZ Tray or a tiny Node service); the app
  already produces ESC/POS bytes at `/api/bills/<id>/escpos?width=80`.
- Real SMS/WhatsApp/email providers (MSG91 / Gupshup / SES) – interface ready in `src/lib/services/messaging.ts`.
- Dependency upgrades flagged by `npm audit` (need major versions): Next 16, Prisma 7, Zod 4, exceljs. See SECURITY.md.
- Move the in-memory rate limiter to Redis when running more than one app server.
- Offline: adding items to an existing order, billing and payment still need internet (needs idempotency keys on those APIs).
- Switch from `prisma db push` to `prisma migrate` (versioned migration files) before several developers work on the schema.
- Before taking real payments: Razorpay live keys + webhook for payment confirmation, and a legal GST invoice review by an accountant.
