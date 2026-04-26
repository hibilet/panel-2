# VAT + Invoicing - Frontend Guide

Local VAT computation. Realm = seller. Billing = buyer. Stripe pays. Hibilet renders printable HTML.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/realms/:id` | admin | Read realm + `seller` block |
| PUT | `/realms/:id` | admin | Update realm `seller` block |
| GET | `/billings/my` | merchant | Organizer billing (incl. address.country, corporate.tax) |
| PUT | `/billings/:id` | merchant | Update organizer billing |
| GET | `/invoices/my` | merchant | Own invoice list |
| GET | `/invoices` | admin/merchant | All invoices |
| GET | `/invoices/:id` | merchant/admin | Single invoice JSON |
| GET | `/invoices/:id/print` | merchant/admin | Printable HTML (server-rendered EJS) |
| POST | `/invoices/generate` | admin | Generate single or run sweep |

All JWT via `Authorization` header or `?token=` query.

---

## 1. Admin: configure realm seller

Required for any realm that bills merchants. Without `seller.country` + `seller.defaultRate` invoices are still issued but VAT mode = `no_seller_config` (0%).

### PUT /realms/:id body

```json
{
  "seller": {
    "legalName": "Hibilet B.V.",
    "tradeName": "Hibilet",
    "address": {
      "country": "NL",
      "city": "Amsterdam",
      "zip": "1011AA",
      "street": "Damrak 1"
    },
    "vatId": "NL999999B01",
    "registry": "KVK12345678",
    "iban": "NL00 INGB 0000 0000 00",
    "email": "billing@hibilet.com",
    "phone": "+31 20 000 0000",
    "country": "NL",
    "defaultRate": 0.21,
    "taxProfile": "eu",
    "invoiceNumberPrefix": "HIB",
    "invoiceFooter": "Thanks for using Hibilet."
  }
}
```

### UI fields (admin realm settings page)

- Country (ISO-2 select, required) - drives tax profile
- Default rate (number 0-1, required) - e.g. 0.21
- Tax profile (auto | eu | simple) - leave auto unless edge case
- Legal name, trade name, VAT id, registry, IBAN, email, phone
- Address (street, zip, city, country)
- Invoice number prefix (3-5 chars, e.g. "HIB")
- Footer text (textarea, optional)

### Validation hints (client side)

- `country` ISO-2 uppercase, 2 chars
- `defaultRate` 0..1, step 0.01
- `vatId` country-specific format (NL: `NL\d{9}B\d{2}`, DE: `DE\d{9}`, etc.) - warn only, don't block
- `taxProfile` empty = auto-derive from country

---

## 2. Merchant: billing form (existing, ensure country)

Critical: `billing.address.country` and `billing.corporate.tax` drive VAT mode for the organizer.

### Required for VAT correctness

- `address.country` ISO-2
- `corporate.tax` (VAT id) - optional value but field exists. Empty/null = treated as B2C in EU cross-border path.

### UX

- Show realm seller country as "we are based in {country}" hint near VAT id field.
- After save, optionally call `GET /invoices/preview` (not implemented; consider) or just compute client-side preview using the matrix below to show "VAT 21%" / "Reverse charge" / "Out of scope" before next invoice.

---

## 3. Invoice list

### GET /invoices/my response

```json
{
  "invoices": [
    {
      "_id": "...",
      "number": "HIB-2026-000123",
      "kind": "monthly",
      "status": "paid",
      "subtotal": 100.00,
      "vat": {
        "rate": 0.21,
        "amount": 21.00,
        "mode": "standard",
        "note": "VAT 21%"
      },
      "tax": 21.00,
      "total": 121.00,
      "currency": "eur",
      "period": { "start": "2026-03-01...", "end": "2026-03-31..." },
      "stripeHostedInvoiceUrl": "https://invoice.stripe.com/...",
      "paymentLink": "https://invoice.stripe.com/...",
      "paidAt": "2026-04-02...",
      "createdAt": "...",
      "sellerSnapshot": { ... },
      "buyerSnapshot": { ... }
    }
  ],
  "total": 12
}
```

### Table columns

| Number | Period | Subtotal | VAT | Total | Status | Actions |

- Render `vat.amount` with mode badge: `standard` plain, `reverse_charge` blue badge, `out_of_scope` gray badge, `standard_oss_risk` yellow warning.
- Status pill: `paid` green, `pending` yellow, `failed` red, `cancelled` gray.

### Row actions

- View detail (drawer or `/invoices/:id` page)
- Print -> open `/invoices/:id/print?token=$JWT` in new tab
- Pay (if `status=pending` && `paymentLink`) -> open `paymentLink` in new tab

---

## 4. Invoice detail page

Use snapshots, not live realm/billing. They are frozen at issue time.

```
Header:        number, status, period, paid date
From (seller): sellerSnapshot.legalName, address, vatId, registry
To (buyer):    buyerSnapshot.corporate.name, address, vatId
Lines:         derived from breakdown (installFee, baseFee, ticketFeeAmount, commissionAmount)
Subtotal:      invoice.subtotal
VAT row:       "VAT {rate*100}% ({mode})" + amount
Total:         invoice.total
VAT note:      vat.note (legal text - render as callout)
CTA:           "Pay invoice" -> stripeHostedInvoiceUrl (if pending)
               "Print / Save PDF" -> /invoices/:id/print
```

Print = browser print dialog (Ctrl/Cmd+P) on the rendered HTML page. No PDF generation server-side.

---

## 5. VAT mode reference (mirror server logic for previews)

```typescript
type VatMode =
  | 'standard'
  | 'reverse_charge'
  | 'out_of_scope'
  | 'standard_oss_risk'
  | 'standard_fallback'
  | 'no_seller_config';

const EU = new Set([
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI',
  'FR','GR','HR','HU','IE','IT','LT','LU','LV','MT',
  'NL','PL','PT','RO','SE','SI','SK',
]);

const profile = (seller) =>
  seller.taxProfile ?? (EU.has(seller.country) ? 'eu' : 'simple');

const previewVat = ({ seller, buyerCountry, buyerVatId, subtotal }) => {
  if (!seller?.country || seller.defaultRate == null)
    return { mode: 'no_seller_config', rate: 0, amount: 0 };

  const s = seller.country.toUpperCase();
  const b = (buyerCountry || '').toUpperCase();
  const r = seller.defaultRate;
  const prof = profile(seller);

  if (!b) return { mode: 'standard_fallback', rate: r, amount: round2(subtotal * r) };
  if (b === s) return { mode: 'standard', rate: r, amount: round2(subtotal * r) };

  if (prof === 'eu' && EU.has(b)) {
    if (buyerVatId?.trim())
      return { mode: 'reverse_charge', rate: 0, amount: 0 };
    return { mode: 'standard_oss_risk', rate: r, amount: round2(subtotal * r) };
  }
  return { mode: 'out_of_scope', rate: 0, amount: 0 };
};

const round2 = (n) => Math.round(n * 100) / 100;
```

Use this for live "next invoice will look like X" preview on settings save.

---

## 6. Mode badges (suggested UI)

| Mode | Label | Color | Tooltip |
|---|---|---|---|
| `standard` | "VAT {rate}%" | neutral | Domestic VAT applied |
| `reverse_charge` | "Reverse charge" | blue | EU B2B, Art. 196 Dir. 2006/112/EC |
| `out_of_scope` | "Out of scope" | gray | Export of services, no VAT |
| `standard_oss_risk` | "VAT {rate}%" + warn icon | yellow | Cross-border B2C - OSS may apply |
| `standard_fallback` | "VAT {rate}% (fallback)" | yellow | Buyer country missing |
| `no_seller_config` | "VAT not configured" | red | Realm needs seller block |

---

## 7. Print page

`GET /invoices/:id/print` returns full HTML. Open in new tab.

```ts
const printInvoice = (id) => {
  const url = `${API}/invoices/${id}/print?token=${encodeURIComponent(jwt)}`;
  window.open(url, '_blank', 'noopener');
};
```

The HTML uses `@media print` rules - browser print dialog produces clean A4 / Letter PDF. No server PDF dependency.

Empty / pending invoices still render. Hosted Stripe payment link shown when not paid (hidden in print via `.no-print`).

---

## 8. Common errors

| Symptom | Cause | Fix |
|---|---|---|
| Invoice has `vat.mode: 'no_seller_config'` | Realm seller block missing | Admin populates `seller.country` + `seller.defaultRate` |
| All organizers get domestic rate even from abroad | `billing.address.country` empty | Make country required at billing edit |
| EU organizer wrongly charged VAT | `corporate.tax` empty - treated as B2C | Make VAT id field prominent for cross-border B2B |
| VAT mismatch local vs Stripe | Stale customer on Stripe | Server already disables `automatic_tax`. Should not happen. If it does, void invoice and regenerate. |
| 403 on `/invoices/:id/print` | Caller is not owner or admin | Use merchant JWT for own invoice |

---

## 9. Migration notes (existing invoices)

Old invoices (pre-VAT-block) have `vat = { mode: 'no_seller_config', amount: 0 }` after schema upgrade (default). Their `tax` legacy field still mirrors pre-existing Stripe-reported tax. Render guard:

```ts
const vat = invoice.vat?.amount != null
  ? invoice.vat
  : { rate: 0, amount: invoice.tax || 0, mode: 'legacy', note: '' };
```

No backfill required - historical Stripe-hosted invoice URLs remain valid.

---

## 10. Suggested screens (dashboard)

1. **Settings -> Billing identity** (merchant) - edit billing, show "we are based in NL" hint
2. **Settings -> Invoices** (merchant) - list with print/pay actions
3. **Admin -> Realms -> :id -> Seller** (admin) - configure seller block
4. **Admin -> Invoices** (admin) - all invoices, filter by realm/merchant/status, "Generate now" button -> `POST /invoices/generate`

## Related

- Backend: [Invoicing](../wiki/Invoicing.md), [Invoice Model](../wiki/Invoice Model.md), [Realm Model](../wiki/Realm Model.md)
- Lib: [libs/vat.js](../libs/vat.js)
