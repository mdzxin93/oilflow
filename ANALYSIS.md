# APK analysis and migration decisions

Source analysed: latest OilFlow-Offline-Install-Kit.zip, version 3, containing OilFlow APK 1.0.3 and its matching source. The APK's bundled UI and source were treated as the feature reference. The APK uses a Capacitor native shell, native SQLite storage, local phone notifications and browser-rendered screens; it has no MongoDB backend to deploy as-is.

| APK capability | Website implementation |
| --- | --- |
| Mint/green responsive interface | Existing CSS/layout reused and adapted for browser admin login |
| SQLite on device | Normalised MongoDB collections behind Express API |
| Device PIN | Password-hashed admin account and MongoDB-backed session cookie |
| INR 40/L, INR 50/L, custom rate | Same integer-paise/millilitre engine; server recalculates totals |
| Historical manual total | Preserved as a legacy agreed total; never multiplied again |
| Customer pending / advance ledger | Separate collections with transactional ledger validation |
| Entry deletion | Same audited delete and settlement/stock protection, enforced server-side |
| Phone-local reminder | Persistent backend scheduler, in-app popup and optional web push |
| Phone Call action | tel: link in the reminder/customer views |
| Inventory / profit / investment | Same costing rules, calculations checked server-side |
| Local PDF generation | Server PDFKit report generated from MongoDB snapshot |
| Encrypted backup | Compatible .oilflow codec; server-verified restore workflow |
| Archive and cleanup | Revision-bound backup verification and backend dependency checks |
| Offline preset accountant | Verified backend reporting functions; no external LLM/API key |

All business writes now go through named, validated commands. The client does not post a trusted replacement ledger for routine editing. Restore is a separate authenticated, verified, explicitly confirmed operation. Users/sessions are not overwritten by business backup restoration.

APK behaviour intentionally not promised by a website: native alarms while the laptop/backend is off; silent writes into arbitrary phone folders; automatic cross-device APK/database synchronisation. These differences are explained in the user guide rather than simulated.
