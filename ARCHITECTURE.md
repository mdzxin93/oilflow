# Architecture

Browser (Vite / built static frontend) → same-origin /api proxy → Express → MongoDB replica set.

- frontend/src: responsive UI, forms, login, reports download, compatible backup encryption/decryption and optional push subscription.
- server/app.js: session authentication, CSRF checks, request validation, API and static serving.
- server/domain.js: whitelisted intent commands and server-generated financial records.
- shared/engine.js: integer currency/quantity, weighted-average stock, ledger balances, deletion and archive invariants. Shared for fast UI previews; backend is authoritative.
- server/database.js: consistent snapshots, optimistic revision lock, idempotency and multi-document transactions.
- server/reports.js: server PDF accounts and financial chart.
- server/reminders.js: report reminders, push queue/retries and dead-subscription cleanup.
- scripts/database.mjs: persistent local real mongod manager, without mocking MongoDB.

## Collections

metadata: business version/revision/settings and archive cutoff.
customers: contact information and opening balances.
entries: purchases/sales, quantities, price snapshots, advance usage and audited deletion flags.
payments: actual money movements and explicit linked settlements.
stockOpenings: opening quantity/cost without automatic payable.
funds / expenses: capital/loans/withdrawals and operating expenses.
reminders: scheduled pickup/report notices and statuses.
audit: retained event trail.
exports / archives / summaries: export history, closed periods and daily aggregate continuity.
commands: unique request keys and hashes for retry protection.
users / sessions: hashed admin credentials and expiring server sessions.
pushSubscriptions / deliveryJobs: optional web-push delivery state.

Business rows use stable string IDs, not a single giant MongoDB snapshot document. Lists retain their business ordering for backup compatibility. The ledger engine currently reads the active dataset to validate full chronological inventory/balance effects; archival reduces the active detail. At very large scale, add paginated UI/query projections and incremental costing without dropping the accounting invariants.

## Atomic command flow

Authenticate → verify CSRF → validate payload → start MongoDB transaction → check request key → read consistent state → compare expected revision → acquire metadata revision lock → apply domain operation and recalculate → validate all affected balances/stock → persist only changed documents → append audit / request marker → commit with majority write concern.

Stale tabs receive HTTP 409. Unknown network outcomes can be retried with the same request key. The client retains the key for uncertain failed requests and clears it after a confirmed result.

Restore uses a short-lived server-side token bound to the backup hash and database revision. Cleanup is allowed only with a verified matching backup revision. Server-issued audit history is retained across business restore.
