# Jobs & Notifications API

Persistent job scheduler (cron + one-shot) and in-app notification feed.
Admins and merchants (organizers) can create scheduled jobs; the runner ticks every 30 seconds and dispatches due jobs through a per-key in-process queue.
Job results emit notifications into a polled feed; selected types also email the recipient.

## Endpoints

### Jobs

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET    | `/jobs`                  | admin, merchant | List jobs the caller owns (admins see realm-wide) |
| GET    | `/jobs/definitions`      | admin, merchant | Catalog of job types available to the caller's role |
| GET    | `/jobs/search`           | admin, merchant | Search jobs |
| GET    | `/jobs/:id`              | admin, merchant | Get a single job |
| GET    | `/jobs/:id/runs`         | admin, merchant | Run history for a job |
| POST   | `/jobs`                  | admin, merchant | Create a scheduled or one-shot job |
| POST   | `/jobs/:id/run`          | admin, merchant | Trigger a job immediately |
| PUT    | `/jobs/:id`              | admin, merchant | Update schedule, params, enabled, name |
| DELETE | `/jobs/:id`              | admin, merchant | Soft-delete a job |

### Notifications

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/notifications`            | any signed-in account | Polled feed (`?since`, `?unread=true`, `?type`, `?limit`) |
| POST | `/notifications/:id/read`   | any signed-in account | Mark one notification as read |
| POST | `/notifications/read-all`   | any signed-in account | Mark every unread notification as read |

All endpoints accept JWT via the `Authorization` header or `?token=` query.

---

## 1. List job definitions

```
GET /jobs/definitions
```

Returns the catalog filtered by the caller's role. Use this to render the "create job" form.

```json
{
  "data": [
    {
      "type": "report.sales.weekly",
      "label": "Weekly sales report",
      "description": "Generate a sales report covering the previous 7 days.",
      "paramsShape": { "sale": "string?", "countType": "\"single\"|\"cumulative\"?" },
      "defaultSchedule": "0 6 * * 1",
      "eventOnly": false,
      "system": false
    }
  ],
  "message": "find-job-definitions"
}
```

`eventOnly: true` means the job type is fired internally (e.g. `notify.firstSale`) and cannot be scheduled by a user.

---

## 2. Create a job

```
POST /jobs
```

### Body

```json
{
  "name": "Weekly sales report",
  "type": "report.sales.weekly",
  "schedule": "0 6 * * 1",
  "params": { "sale": "69esale..." },
  "enabled": true
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | no | Defaults to definition label |
| `type` | string | yes | Must exist in `/jobs/definitions` for the caller's role |
| `schedule` | string | one of schedule/runAt | Standard 5- or 6-field cron expression (timezone = `APP_TZ`) |
| `runAt` | ISO date | one of schedule/runAt | One-shot trigger time |
| `params` | object | no | Handler input. Shape depends on `type` |
| `enabled` | bool | no | Default `true` |

### Errors

| message | meaning |
|---|---|
| `type-required` | `type` missing |
| `unknown-job-type` | `type` not in registry |
| `forbidden-job-type` | role not in `definition.roles` |
| `event-only-job-not-schedulable` | tried to schedule an event-only type |
| `schedule-or-runAt-required` | both missing |
| `cron-invalid` | cron expression rejected by parser |

---

## 3. Trigger a job manually

```
POST /jobs/:id/run
```

Bypasses the cron tick - runs the job through the same lock + queue immediately. Returns the JobRun record.

```json
{
  "data": {
    "run": { "id": "...", "status": "ok", "output": { "reportId": "..." }, "..." },
    "ok": true
  },
  "message": "job-triggered"
}
```

`null` result + `job-already-running` error means another instance currently holds the lock.

---

## 4. Run history

```
GET /jobs/:id/runs?limit=50&skip=0
```

```json
{
  "data": [
    {
      "id": "...",
      "job": "...",
      "startedAt": "2026-04-25T06:00:00.000Z",
      "finishedAt": "2026-04-25T06:00:03.117Z",
      "status": "ok",
      "output": { "reportId": "...", "rows": 84 },
      "triggeredBy": "cron"
    }
  ],
  "total": 12,
  "message": "find-job-runs"
}
```

---

## 5. Notification feed (polling)

```
GET /notifications?since=2026-04-25T10:00:00Z&unread=true&limit=50
```

Frontend pattern: poll every 10 seconds. Keep the most recent `createdAt` from the last response and pass it as `since` next time to fetch only new entries.

```json
{
  "data": {
    "items": [
      {
        "id": "...",
        "owner": "...",
        "type": "report.ready",
        "title": "Weekly sales report ready",
        "body": "Report covers 2026-04-18 to 2026-04-25.",
        "link": "/reports/...",
        "severity": "info",
        "readAt": null,
        "createdAt": "2026-04-25T06:00:03.200Z"
      }
    ],
    "unreadCount": 4
  },
  "message": "find-notifications"
}
```

### Mark read

```
POST /notifications/:id/read
POST /notifications/read-all
```

Returns `{ updated: <count> }`.

---

## Job catalog (current)

| Type | Roles | Default schedule | What it does |
|---|---|---|---|
| `invoice.monthly` | admin (system) | `0 2 1 * *` | Monthly invoicing run; emits `invoice.ready` per merchant |
| `report.sales.daily` | admin, merchant | `0 5 * * *` | Generate sales report for previous day |
| `report.sales.weekly` | admin, merchant | `0 6 * * 1` | Sales report for previous 7 days |
| `report.sales.monthly` | admin, merchant | `0 7 1 * *` | Sales report for previous month |
| `report.churn.daily` | admin, merchant | `15 5 * * *` | Churn report for previous day (per sale or all owner sales) |
| `report.churn.weekly` | admin, merchant | `15 6 * * 1` | Churn report for previous 7 days |
| `report.churn.monthly` | admin, merchant | `15 7 1 * *` | Churn report for previous month |
| `notify.firstSale` | event-only | - | Fired by checkout when the merchant's first ever success transaction lands |
| `notify.firstEvent` | event-only | - | Fired by checkout when a brand-new event sees its first sale |
| `cleanup.expiredNotifications` | admin (system) | `0 3 * * *` | Purges expired + read-older-than-60-days notifications |

### Auto-seeded merchant jobs

When a merchant account is created via Stripe Connect onboarding, the API auto-seeds:

- `report.sales.weekly` with default schedule `0 6 * * 1`

To disable, `PUT /jobs/:id` with `{ "enabled": false }` or soft-delete.

---

## Notification types

| `type` | Severity | Email side-effect | Source |
|---|---|---|---|
| `report.ready`            | info    | -    | report jobs |
| `invoice.ready`           | info    | yes  | `invoice.monthly` per merchant |
| `job.failed`              | error   | yes  | runner on handler exception |
| `job.invoice.errors`      | warning | -    | invoice run summary to admins |
| `sale.first`              | success | -    | first ever success tx for merchant |
| `sale.firstEvent`         | success | -    | first success tx for a particular sale |

Email is automatic when `type === 'invoice.ready'` or `severity === 'error'`. Templates live in [mailing/index.js](../mailing/index.js) (`mailer.invoiceReady`, `mailer.systemAlert`).

---

## Cron expression reference

Uses [node-cron](https://github.com/node-cron/node-cron) syntax, validated through `cron-parser`.

```
 ┌─ second (optional, 0-59)
 │ ┌─ minute (0-59)
 │ │ ┌─ hour (0-23)
 │ │ │ ┌─ day of month (1-31)
 │ │ │ │ ┌─ month (1-12)
 │ │ │ │ │ ┌─ day of week (0-7, 0 or 7 = Sun)
 │ │ │ │ │ │
 * * * * * *
```

All schedules are evaluated in `APP_TZ` (defaults to `Europe/Amsterdam`).

---

## Internal flow

```
POST /jobs            ─┐
                       ├─►  Job document      (enabled, nextRunAt computed)
                       │
   ───────── runner tick (30s) ─────────
                       │
                       ▼
   findOneAndUpdate (atomic claim with lockedUntil TTL)
                       │
                       ▼
   queue.run(`job:<id>`, execute)         (libs/queue.js, in-process FIFO)
                       │
                       ▼
   JobRun (running) ──►  handler({ job, run, params })
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
   ok: write output            error: write error message
       │                               │
       ▼                               ▼
   Job.lastStatus=ok          Job.lastStatus=error
   Job.nextRunAt = next       notify(owner, 'job.failed', severity:error) → email
                       │
                       ▼
                   Notifications produced inline by handler
                   (e.g. report.ready, invoice.ready)
                       │
                       ▼
              GET /notifications  (frontend polls every 10s)
```

---

## Operational notes

- **Multi-instance safe.** Job documents carry a `lockedBy`/`lockedUntil` claim. If two API replicas tick at the same second only one wins; the lock auto-expires after 15 minutes if a worker dies mid-run.
- **No automatic retry.** A failed run advances `nextRunAt` to the next cron occurrence; one-shot runs do not retry. Re-run manually via `POST /jobs/:id/run`.
- **System jobs.** `invoice.monthly` and `cleanup.expiredNotifications` are seeded on every boot with `owner: null, realm: null`. They are visible only to admins.
- **Event-only jobs.** `notify.firstSale` / `notify.firstEvent` exist in the registry as documentation; they are dispatched directly from [services/checkout.js](../services/checkout.js) confirm path, not via the job table.
- **Email.** Only `invoice.ready` and `severity:error` notifications email the recipient. Everything else is in-app feed only.

---

## Local testing

```bash
# 1. List definitions (admin)
curl -H "Authorization: $JWT_ADMIN" http://localhost:3000/jobs/definitions

# 2. One-shot test job
curl -X POST http://localhost:3000/jobs \
  -H "Authorization: $JWT_ADMIN" -H "Content-Type: application/json" \
  -d '{"name":"test","type":"report.sales.daily","runAt":"2026-04-25T12:00:00Z"}'

# 3. Wait <30s, check it ran
curl http://localhost:3000/jobs/<id>/runs -H "Authorization: $JWT_ADMIN"

# 4. Manual trigger
curl -X POST http://localhost:3000/jobs/<id>/run -H "Authorization: $JWT_ADMIN"

# 5. Recurring report (every 5 min for testing)
curl -X POST http://localhost:3000/jobs \
  -H "Authorization: $JWT_MERCHANT" -H "Content-Type: application/json" \
  -d '{"name":"my sales","type":"report.sales.daily","schedule":"*/5 * * * *"}'

# 6. Poll feed
curl 'http://localhost:3000/notifications?unread=true' -H "Authorization: $JWT_MERCHANT"

# 7. Mark all read
curl -X POST http://localhost:3000/notifications/read-all -H "Authorization: $JWT_MERCHANT"
```
