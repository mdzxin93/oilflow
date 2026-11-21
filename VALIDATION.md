# Validation — OilFlow MongoDB Web 2.0

## Passed

- 25 automated tests: 22 accounting/backup tests, a real MongoDB/API workflow, a DOM interface workflow connected to the real API/database, and a real MongoDB process restart test.
- MongoDB 8.0.16 with WiredTiger and replica-set transactions, not a MongoDB mock.
- Auth guards, invalid credentials/client headers, CSRF protection, admin session persistence and session logout.
- Customer creation, INR 52/L × 65 L = INR 3,380, persisted rate snapshot, opening advance usage and partial payment settlement.
- Rejection of client-supplied totals, overpayment, negative stock and incompatible deletion.
- Duplicate request-key retry protection and concurrent-revision conflict handling.
- Delete confirmation via DOM, linked settlement reversal and database persistence.
- Real server PDF generation from MongoDB; verified accountant response.
- Backup verification, restore, mobile PIN removal and server-side cleanup gate.
- Separate MongoDB business collections and retained audit records.
- Closing/reopening the API while retaining database data and sessions.
- Stopping/restarting the real MongoDB process using the same WiredTiger data folder preserves the saved document.
- Managed local database helper startup on port 27018, replica-set detection and graceful stop without deleting its data folder.
- All core screens rendered in the DOM workflow: overview, customers, entry, transactions, pending, advances, reminders, inventory, funds, expenses, profit, reports, accountant and settings.
- JavaScript syntax checks and Vite production build.
- Production dependency audit reported zero advisories at the time checked; this is not a full security audit.

## Verification limits

The supported managed visual-preview runner could not execute the MongoDB binary in its isolated environment. No alternative browser-control path was used. Full rendered browser screenshots/layout/keyboard QA of this new website is therefore unverified here. The responsive CSS is retained from the mobile/desktop-tested APK design, and interface actions were exercised through JSDOM with the real API and database.

Windows/macOS launcher scripts were prepared but not run on those operating systems. The managed database and API were exercised on Linux. Actual browser push delivery, phone tel: handling, HTTPS deployment and external Atlas connectivity require the chosen user's browser/environment/provider setup. Push is not represented as physically phone-tested.

## Reproduce

```text
npm install
npm test
npm run check
npm run build
```

First MongoDB test run may download the official server binary. Tests use isolated temporary databases and do not use your business database. TEST_MONGODB_BINARY can point to an existing compatible mongod for offline test execution.

For manual acceptance, run setup/dev, sign in, add a test contact and entry, reload, settle a payment, test Delete, download a PDF and encrypted backup, re-select that backup for verification and inspect the oilflow database in Compass. Remove test records through supported actions before entering real opening accounts.
