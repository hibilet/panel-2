# Refunds API

Refund money via the provider that processed the original transaction.
Connect-aware (Stripe Connect: platform secret + `stripeAccount` header).

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/transactions/:id/refund` | merchant, admin | Refund a single transaction (full or partial) |
| GET | `/transactions/:id/refunds` | merchant, admin | List all refunds for a transaction |
| POST | `/sales/:id/refund` | merchant, admin | Bulk refund every successful transaction of a sale |

All endpoints accept JWT via `Authorization` header or `?token=` query.

---

## 1. Refund single transaction

```
POST /transactions/:id/refund
```

### Body

```json
{
  "reservationIds": ["69e...", "69f..."],
  "amount": 500,
  "reason": "requested_by_customer"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `reservationIds` | string[] | no | Refund only these reservations. Amount auto-computed from their prices (with coupon). Omit for whole-transaction refund |
| `amount` | int | no | Smallest currency unit (cents). Overrides reservation-derived amount. Omit + omit reservationIds = full refund |
| `reason` | enum | no | `duplicate`, `fraudulent`, or `requested_by_customer` |

### Partial refund semantics

- Only listed reservations flip to `status: 'refunded'`. Others remain `success`.
- `transaction.paid` decrements by `amount` (or sum of refunded reservations' prices).
- Transaction + basket flip to `refunded` ONLY when every reservation is refunded. Otherwise transaction stays `success` with reduced `paid`.
- Aggregations (dashboards, reports, sales totals) already filter reservations by `status: 'success'`, so refunded reservations drop out of revenue/ticket counts automatically.

### Repeated partial refunds

Call multiple times with different `reservationIds` until all reservations are refunded. Last call flips transaction + basket to `refunded`.

```bash
# refund 2 of 5 tickets
curl -X POST http://localhost:3000/transactions/$TX/refund \
  -H "Authorization: $JWT" -H "Content-Type: application/json" \
  -d '{"reservationIds": ["res1","res2"]}'

# later, refund the rest
curl -X POST http://localhost:3000/transactions/$TX/refund \
  -H "Authorization: $JWT" -H "Content-Type: application/json" \
  -d '{"reservationIds": ["res3","res4","res5"]}'
# transaction + basket now refunded
```

### Response

```json
{
  "data": {
    "refund": { "id": "re_...", "amount": 500, "status": "succeeded" },
    "refundedCount": 2,
    "refundAmount": 500,
    "remaining": 3,
    "transactionStatus": "success"
  },
  "message": "refunded"
}
```

`remaining` = reservations still in `success` status. When `0`, `transactionStatus` flips to `refunded`.

### Errors

| message | meaning |
|---|---|
| `transaction-not-found` | bad ID |
| `already-refunded` | transaction.status is `refunded` |
| `not-refundable` | transaction.status is not `success` |
| `provider-not-found` | sale has no provider |
| `refund-not-supported` | provider's processor lacks refund (e.g. `default`) |

### Example

```bash
curl -X POST http://localhost:3000/transactions/69eda12345/refund \
  -H "Authorization: $JWT" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Partial:

```bash
curl -X POST http://localhost:3000/transactions/69eda12345/refund \
  -H "Authorization: $JWT" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "requested_by_customer"}'
```

---

## 2. List refunds for a transaction

```
GET /transactions/:id/refunds
```

Returns every Stripe refund attached to that transaction's `payment_intent`. Includes partial + full refunds across multiple calls.

### Response

```json
{
  "data": {
    "refunds": [
      { "id": "re_1", "amount": 500, "status": "succeeded", "reason": "...", "created": 1700000000 },
      { "id": "re_2", "amount": 1500, "status": "succeeded", "..." }
    ],
    "total": 2000
  },
  "message": "list-refunds"
}
```

`total` = sum of `amount` across all refunds (in cents).

### Example

```bash
curl http://localhost:3000/transactions/69eda12345/refunds \
  -H "Authorization: $JWT"
```

Use cases:
- Show refund history in merchant dashboard
- Confirm partial refund completed before issuing another
- Reconciliation between Stripe and local DB

---

## 3. Bulk refund a sale

```
POST /sales/:id/refund
```

Refunds every transaction with `status: success` belonging to the sale's baskets. Stops on individual failures but keeps going through the list.

### Body

```json
{
  "dryRun": true,
  "reason": "requested_by_customer"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `dryRun` | bool | no | When true, returns the list of eligible transactions without refunding |
| `reason` | enum | no | Same values as single refund |

### Response (dry run)

```json
{
  "data": {
    "dryRun": true,
    "eligibleCount": 42,
    "eligibleIds": ["69eda...", "69edb...", "..."]
  },
  "message": "refund-all-dry-run"
}
```

### Response (real)

```json
{
  "data": {
    "total": 42,
    "refunded": 40,
    "failed": 2,
    "results": [
      { "transactionId": "69eda...", "status": "refunded" },
      { "transactionId": "69edb...", "status": "failed", "error": "charge_already_refunded" }
    ]
  },
  "message": "refund-all-complete"
}
```

### Auth scope

Sale must be owned by the calling merchant (`sale.owner == account._id`). Admin bypasses.

### Recommended workflow

1. Call with `dryRun: true` first - confirm count.
2. Show user `"Refund N tickets totaling X EUR? This cannot be undone."`
3. Call without `dryRun` to execute.
4. Show per-row results from `results[]`.

### Example

```bash
# dry run
curl -X POST http://localhost:3000/sales/69esale/refund \
  -H "Authorization: $JWT" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# execute
curl -X POST http://localhost:3000/sales/69esale/refund \
  -H "Authorization: $JWT" \
  -H "Content-Type: application/json" \
  -d '{"reason": "requested_by_customer"}'
```

### Notes

- Bulk endpoint refunds in series to avoid rate-limiting Stripe. Expect ~1 request/sec.
- Each refund is full-amount. Partial bulk refund not supported.
- Failed individual refunds do NOT roll back successful ones. Partial success possible.

---

## How refunds flow internally

```
POST /transactions/:id/refund
   |
   v
controller (controllers/transactions/common.js : post.refund)
   |
   +-- look up transaction, basket, sale, provider
   +-- pick processor by provider.type
   +-- processor.refund(provider, { paymentIntent, amount, reason })
   |       |
   |       v
   |   stripe.refunds.create({ payment_intent, ... })
   |       |
   |       v
   |   Stripe processes refund -> charge.refunded webhook fires later
   |
   +-- checkout.refund({ transactionId, dump }) sets local state
   |
   v
response
```

Webhook `charge.refunded` (handled by `controllers/callbacks/transactions/stripe.js`) is idempotent - if it fires for a refund our API just initiated, it's a no-op.

## Provider support matrix

| Provider | refund | listRefunds | Notes |
|---|---|---|---|
| `provider.stripe` | yes | yes | Connect + manual key both work |
| `provider.paywall` | no | no | Not implemented yet |
| `provider.default` | no | no | Test/free processor; nothing to refund |

To add to a processor: implement `refund(provider, params)` and `listRefunds(provider, params)` in `processors/<name>.js`. Controller picks them up automatically.

## Local testing

```bash
# 1. Forward webhooks
stripe listen --forward-connect-to localhost:3000/callbacks/transactions/stripe \
  --events charge.refunded

# 2. Issue refund via API
curl -X POST http://localhost:3000/transactions/<id>/refund -H "Authorization: $JWT" -d '{}'

# 3. Watch CLI: --> charge.refunded [evt_...] <-- [200]
# 4. Verify DB: transaction.status == 'refunded', basket.status == 'refunded'
```

## Accounting & dashboards

All revenue / ticket-count aggregations across dashboards, sales, and reports filter on `reservation.status`:
- `success` and `read` count toward sold tickets and revenue
- `refunded` is excluded
- `transaction.paid` reflects net amount (decremented by each partial refund)

So a partially-refunded transaction shows the right totals automatically. No extra reporting code needed.

## Operational warnings

- **Connect account must be reachable.** If merchant deauthorized your platform, `stripe.refunds.create` returns 403. Bulk endpoint marks those rows as `failed`.
- **Refund cap.** Partial refunds cannot exceed `charge.amount - charge.amount_refunded`. Stripe rejects with `charge_already_refunded` or `amount_too_large`.
- **No re-charging.** Refunded transaction stays refunded. To re-collect, create a new sale + transaction.
- **Email notifications.** Local code does NOT send a refund email today. Add to `mailing/index.js` if needed.
