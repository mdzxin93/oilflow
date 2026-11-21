# OilFlow Web — full-stack MongoDB edition

Admin-only oil collection and trading website based on OilFlow APK 1.0.3. Frontend: responsive HTML/CSS/JavaScript with Vite. Backend: Node.js/Express. Database: real MongoDB with separate business collections and atomic transactions.

## Quick start in VS Code (Windows)

Install **Node.js LTS 22 or newer** from https://nodejs.org, then reopen VS Code. Extract this ZIP and open the **oilflow-web** folder containing package.json.

In Terminal → New Terminal:

```powershell
npm install
npm run setup
npm run dev
```

Setup asks for your admin email and a password of at least 10 characters. Password input in the setup terminal is visible, so do it privately. There is no default demo password and no customer registration.

Open **http://localhost:5173** and sign in with those details.

**Or double-click Start-Windows.cmd** after Node.js is installed. It performs the same dependency/setup/start steps. Mac/Linux users can run `sh Start-Mac-Linux.sh`.

### MongoDB starts with the website

The default development runner starts a real local MongoDB 8.0 process automatically. You do not need to install MongoDB Compass or manually start a MongoDB service for this mode.

- First start downloads the official MongoDB binary (roughly 100 MB, platform-dependent). Initial internet access is required for npm packages and this download.
- MongoDB uses the WiredTiger storage engine and a one-node replica set, not a mocked database.
- Business records persist in **data/mongo/**, not browser localStorage.
- Cached MongoDB binaries are in **.cache/mongodb/**.
- Database port: **27018**. API port: **3001**. Website port: **5173**.
- Keep the VS Code terminal running. Use Ctrl+C for a graceful stop. Run `npm run dev` again later; it reopens the same database folder.
- Do not delete `data/` to troubleshoot. Export encrypted backups first.

MongoDB Compass is optional. Connect with:

```text
mongodb://127.0.0.1:27018/oilflow?replicaSet=oilflow-rs&directConnection=true
```

Database name: **oilflow**. You can see customers, entries, payments, reminders and other collections after creating records.

## Existing MongoDB / Atlas / Docker

If you already have a MongoDB **replica set**, change MONGODB_URI in your private .env and set DB_NAME if necessary. The app uses that server instead of starting its managed database. A standalone mongod is deliberately rejected because multi-document ledger transactions require a replica set.

For a Docker alternative:

```powershell
docker compose up -d --wait
npm run dev
```

The provided compose.yaml starts a persistent single-node replica set on localhost:27018. Its Docker volume is separate from managed `data/mongo`. Choose one database mode at a time. Do not remove Docker volumes unless you intend to erase that database.

For Atlas, use your private SRV URI, configure network access, and keep credentials in .env. Do not put database credentials in frontend code or public repositories. Atlas/local databases do not automatically share data; use a verified backup to move records.

## Main features

- Admin login, MongoDB-backed sessions, password change and sign out.
- Customer directory, opening pending balances, opening advances and customer ledger.
- Collection/purchase and sales entries.
- Three price choices: preset INR 40/L, preset INR 50/L, Manual /L. Presets are editable.
- **65 litres × INR 52/L = INR 3,380**. Rates and quantities are checked again on the server.
- Partial payments, receivables, payables and a separate pending page.
- Advance paid/received, explicit application and refunds.
- Delete with confirmation, audit history and stock/payment safeguards. Linked cash can be removed as a mistaken record or retained as an advance.
- Inventory with opening stock and weighted-average costing.
- Expenses, investment, loans and withdrawals.
- Daily/weekly/monthly/yearly analytics, revenue charts and profit/loss.
- Pickup reminders, snooze/reschedule/complete and Call links.
- Server-generated monthly/yearly PDF accounts.
- Password-encrypted full backups, APK-backup import, verified restore and guarded cleanup.
- Verified accountant summaries calculated by the backend; no external AI key required.

The website starts with empty business records. The tests use their own isolated databases; they do not seed your business data.

## Existing APK data → website

1. In OilFlow APK, export a full encrypted `.oilflow` backup and remember its password.
2. Start this website and sign in as admin.
3. Reports & backup → enter the backup password → Restore backup → choose that file.
4. Review the verification result. To import, explicitly confirm replacing the website's business records.
5. Customer records, transactions, payments, advances, reminders and audit history are imported into MongoDB. The APK PIN is discarded; website login remains your chosen admin email/password.

Restore replaces the website business dataset rather than merging duplicates. Export the website's current backup before replacing it. The APK and website do not automatically synchronise; they are separate databases.

Existing APK manual-total records retain their original values. New Manual /L entries store the entered rate and multiplied total.

## Reports, backup and deletion

PDFs are generated on the server from a consistent MongoDB snapshot. Normal browser downloads go to the browser's chosen Downloads folder; a website cannot silently create arbitrary folders on your phone. Reports are management accounts, not CA-certified filings.

Full `.oilflow` backups use AES-256-GCM encryption with a PBKDF2-derived key and a checksum manifest. Passwords are not recoverable. Website users/sessions and .env secrets are not included in business backups.

Re-select a downloaded backup to verify it. Cleanup requires a matching server-side verification revision; any later data mutation invalidates that verification. Restoring also requires a short-lived verified token and explicit replacement confirmation.

Delete hides an oil entry from active totals while retaining a marked audit record. It reverses explicit linked settlements or reclassifies them as advances according to your confirmation. It cannot silently delete independent settlements or invalidate later stock movements.

Archive month only labels a period. Remove closed history physically removes eligible past source records only when the saved backup is verified, affected monthly PDFs were generated, all cutoff balances are settled and no stock is carried forward. Daily summaries remain for charts. Detailed old ledgers then require the saved PDF or backup restore. Follow your business retention requirements before permanently removing records.

## Reminder behaviour

- Website popups show due reminders while the app is open. Call opens a tel: link; a phone needs cellular/VoIP service to place the call.
- Settings → Enable notifications configures browser web push.
- Push requires notification permission, a supported browser on HTTPS or localhost, internet connectivity to the push service, and a running backend. No paid push API key is required; setup generates VAPID keys locally.
- With the browser closed, push delivery remains OS/browser-dependent. There is no native Android alarm in this website.
- If the laptop/server is off, it cannot send reminders. Pending reminders appear when you reopen the app.
- Monthly/yearly report reminders are checked by the backend scheduler. Yearly reports use a calendar year.
- Do not regenerate VAPID keys while retaining old subscriptions without subscribing again.

## VS Code tasks and commands

Terminal → Run Task includes setup, start and test tasks.

| Command | Purpose |
| --- | --- |
| npm run setup | Create your private .env and admin bootstrap credentials |
| npm run dev | Start/reuse MongoDB, start API and Vite website |
| npm run db:start | Start MongoDB alone; useful while debugging the backend |
| npm run server | Start API alone when the database is already running |
| npm run build | Build frontend into dist/ |
| npm start | Start MongoDB and serve the built site/API on http://localhost:3001 |
| npm test | Engine, crypto, real MongoDB, API, DOM and persistence tests |
| npm run check | JavaScript syntax checks |

A prebuilt dist/ is included, but rebuild after editing frontend/shared code. The source is fully editable; no Android SDK, Java, APK tool or mobile build is required.

## Troubleshooting

- **node/npm not found:** install Node LTS and reopen VS Code. If PowerShell blocks npm.ps1, run `npm.cmd install` / `npm.cmd run dev` or use Command Prompt. No execution-policy change is required.
- **First start slow:** wait for the MongoDB binary download/election. A corporate proxy may block fastdl.mongodb.org; use the Docker alternative or set MONGODB_SYSTEM_BINARY to an existing compatible mongod executable.
- **Windows missing DLL / mongod cannot start:** install Microsoft's supported Visual C++ 2015–2022 x64 runtime, or use Docker/existing MongoDB. Official installer: https://aka.ms/vs/17/release/vc_redist.x64.exe.
- **MongoDB standalone error:** use the provided managed runner/Docker replica set or configure your own replica set. MongoDB Compass by itself is not a database server.
- **Port in use:** close the other OilFlow runner. Keep MongoDB on 27018 or configure your own replica-set URI. API_PORT can be changed in .env.
- **Login failed:** use the email/password chosen during setup, not the APK PIN. Existing users are not overwritten by changing bootstrap values in .env.
- **Concurrent change:** refresh/retry. The backend rejects stale revisions rather than losing another tab's update.
- **No notifications:** test on localhost/HTTPS, allow notifications and keep the backend running. In-app reminders remain available even without push.
- **Cannot delete:** later sales or separate settlements depend on the entry. Review the ledger instead of forcing deletion.
- **Cannot download old detail:** that period may have been physically archived. Open its saved report or restore the corresponding backup.

## Security and deployment scope

This ZIP is ready for local development/use, not a claim that public production hosting has been configured. For internet deployment use HTTPS, NODE_ENV=production, your APP_ORIGIN, COOKIE_SECURE=true, a private authenticated MongoDB replica set, secure environment secrets, monitored backups and a continuously running backend. The included Docker database port is bound only to localhost.

The browser sends intent commands, not arbitrary state replacements. The backend validates amounts and ledger rules, generates IDs, uses request keys for duplicate protection, checks revisions for concurrency and commits related MongoDB documents atomically. Credentials and sessions are server-only. Audit history is retained.

The managed local database is intentionally unauthenticated on loopback for a single local installation. Do not expose its port on your network or internet. Restrict access to your computer and protect .env, data/ and backups.

See ANALYSIS.md, ARCHITECTURE.md, API.md and VALIDATION.md for the APK mapping and checks. No production credentials, private APK signing key, database files, node_modules, or downloaded MongoDB binary are included in this ZIP.
