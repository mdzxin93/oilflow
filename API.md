# API summary

All routes except health/login require the admin session. POST requests require JSON, X-OilFlow-Client: web and X-CSRF-Token from /api/auth/me (login does not yet have a CSRF token). No permissive cross-origin CORS is enabled.

| Route | Purpose |
| --- | --- |
| GET /api/health | MongoDB health status |
| POST /api/auth/login | email, password → session and CSRF token |
| GET /api/auth/me | Current admin and CSRF token |
| POST /api/auth/logout | Destroy session |
| POST /api/auth/password | Change password with current password |
| GET /api/state | Consistent business snapshot for UI |
| POST /api/commands | Validated business command |
| GET /api/reports/pdf?month=2026-11&year=false | Download server-generated accounts |
| POST /api/backup/verify | Validate backup and compare current records |
| POST /api/backup/restore | Token + state + explicit replacement confirmation |
| POST /api/accountant | period + question index 0–4; verified answer |
| GET /api/push/key | Public VAPID key |
| POST /api/push/subscribe | Browser push subscription |

Command envelope:

```json
{"type":"entry.create","revision":4,"key":"a-new-uuid-per-intent","payload":{"customer":"customer-id","kind":"purchase","category":"a","litres":"65","mode":"custom","manualRate":"52","advance":"0","paid":"0","method":"cash","at":"2026-11-02T08:00:00.000Z","note":"","reminder":"none"}}
```

Whitelisted commands: customer.create, customer.update, entry.create, entry.delete, payment.create, reminder.save, reminder.change, record.create, stock.opening, settings.update, export.record (backup history only), archive.month, archive.prune, cleanup.temporary.

Internal report/restore/scheduler commands cannot be invoked through the public command endpoint. A caller cannot submit its own computed total in entry.create; unknown fields are rejected.

Amounts are input as decimal strings in rupees; server storage uses paise integers. Quantities are decimal litre strings and stored as millilitres. Returned revision must be used for the next command. Request key reuse with a different payload is rejected.
