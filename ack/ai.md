# AI API

OpenRouter-backed Gemini features. Three endpoints today: insights summary, dashboard tips, event drafting from text/CSV/poster.

All endpoints accept JWT via `Authorization: Bearer <jwt>` header or `?token=` query.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/reports/insights?ai-summary=true` | merchant, admin | Markdown summary of last-30-day analytics |
| GET | `/dashboards/ai/tips` | merchant, admin | 3-5 actionable tips for today |
| POST | `/sales/ai/draft` | merchant, admin | Draft 1+ events from text, CSV, or poster image |

Cached results (`scope: 'insights'`, `scope: 'dashboard-tips'`) live in the `analyses` collection with a 3-hour TTL. Pass `refresh=true` to bust cache.

Cache hit/miss exposed via response header `X-AI-Cache: hit` or `miss`.

---

## 1. Insights summary

```
GET /reports/insights?ai-summary=true
```

### Query params

| Param | Type | Default | Notes |
|---|---|---|---|
| `ai-summary` | bool | false | Returns Markdown summary instead of JSON |
| `language` | string | `en` | Locale code. Summary written in this language. |
| `refresh` | bool | false | Bypass cache, regenerate |
| `format` | string | - | `encoded` (legacy compact) or `encoded-ai` (name-first text) returns raw payload, no AI call |

### Response (ai-summary mode)

`Content-Type: text/plain` — Markdown body. First paragraph is the headline; rest is under "Detailed Analysis" with sections for sales, conversion, channels, customers, churn, next steps.

```
Sales last 30 days hit 1,240 tickets (€38,400) with the Saturday Camden show leading at 320 sold...

## Detailed Analysis
### Sales performance
...
### Conversion funnel
- Camden show: views→basket 18%, basket→sale 62%, view→sale 11%
...
### Next steps
1. ...
```

### Errors

If the AI call fails, the response falls back to the raw encoded payload with header `X-AI-Summary-Error: <reason>`. Status stays 200.

If no event data exists, body is the literal string `No event data available to summarize.`

### Frontend usage

```ts
const res = await fetch(`/reports/insights?ai-summary=true&language=${locale}`, {
  headers: { Authorization: `Bearer ${jwt}` },
});
const cache = res.headers.get('X-AI-Cache'); // 'hit' | 'miss'
const markdown = await res.text();
render(markdown);
```

To regenerate (e.g. after the merchant created new events):

```
GET /reports/insights?ai-summary=true&refresh=true
```

---

## 2. Dashboard tips

```
GET /dashboards/ai/tips
```

3-5 short, actionable tips based on the merchant's last-30-day data.

### Query params

| Param | Type | Default | Notes |
|---|---|---|---|
| `language` | string | `en` | Locale code |
| `refresh` | bool | false | Bypass cache |

### Response

```json
{
  "data": {
    "tips": [
      {
        "title": "Camden Saturday show conversion is dropping",
        "severity": "warn",
        "action": "Add an Early Bird coupon at 10% off until Friday",
        "metric": "view2sale 0.8% vs 2.4% baseline",
        "subject": "Camden Saturday Live"
      },
      {
        "title": "Repeat-customer share is healthy",
        "severity": "info",
        "action": "Email past attendees about upcoming Manchester show",
        "metric": "repeat rate 31%",
        "subject": "Repeat customers"
      }
    ],
    "generatedAt": "2026-04-25T08:00:00.000Z",
    "expiresAt": "2026-04-25T11:00:00.000Z",
    "cached": false
  },
  "message": "dashboard-tips"
}
```

### Tip schema

| Field | Type | Notes |
|---|---|---|
| `title` | string | One-line headline |
| `severity` | enum | `info` (positive), `warn` (attention), `critical` (act now) |
| `action` | string | Imperative sentence — the thing to do |
| `metric` | string | Figure that triggered the tip (e.g. `view2sale 0.8%`) |
| `subject` | string | Event/channel/product name the tip refers to |

### Empty data

```json
{
  "data": { "tips": [], "generatedAt": "...", "cached": false },
  "message": "dashboard-tips-empty"
}
```

### Frontend usage

Render as a top-of-dashboard nudge bar. Color severity:
- `info` — blue
- `warn` — amber
- `critical` — red

Each tip's `subject` should deep-link to the corresponding sale or channel page. Resolve the subject string to an ID via your existing search endpoint if needed, or display name only.

```ts
const r = await fetch('/dashboards/ai/tips', {
  headers: { Authorization: `Bearer ${jwt}` },
});
const { data } = await r.json();
data.tips.forEach(renderTip);
```

`refresh` button on the UI:

```ts
fetch('/dashboards/ai/tips?refresh=true', { headers });
```

---

## 3. Event draft

```
POST /sales/ai/draft
```

Pass any combination of text description, CSV, and/or a poster image. Returns a structured draft of one or more events with ticket tiers — does NOT write to the database. Frontend reviews the draft and submits accepted entries through normal `POST /sales` and `POST /products` calls.

### Body (JSON)

```json
{
  "text": "Rock at Camden June 12 8pm doors. GA 200 tickets at £25. VIP 50 at £60. 18+",
  "csv": "name,date,city,venue,ga_qty,ga_price\\nCamden Live,2026-06-12,London,Camden Roundhouse,200,25",
  "image": "data:image/jpeg;base64,...",
  "language": "en"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | one of | Free-form description (one event or many) |
| `csv` | string | one of | CSV content — first row treated as headers |
| `image` | string | one of | Poster: `data:` URI, http URL, or raw base64 |
| `language` | string | no | Locale for output names/notes |

At least one of `text` / `csv` / `image` (or multipart `file`) is required.

### Body (multipart/form-data)

Use this when uploading the poster directly:

```
POST /sales/ai/draft
Content-Type: multipart/form-data

file: <poster.jpg>
text: "Optional companion text"
language: en
```

`file` field is a single image, max 8 MB.

### Response

```json
{
  "data": {
    "events": [
      {
        "name": "Camden Live",
        "category": "concert",
        "currency": "gbp",
        "start": "2026-06-12T20:00:00+01:00",
        "end": "2026-06-12T23:00:00+01:00",
        "stopSaleAt": "2026-06-12T19:00:00+01:00",
        "rules": "18+ ID required at door",
        "minAge": 18,
        "seated": false,
        "venue": {
          "name": "Camden Roundhouse",
          "city": "London",
          "address": ""
        },
        "products": [
          { "name": "General Admission", "price": 25, "stock": 200, "category": "ga" },
          { "name": "VIP", "price": 60, "stock": 50, "category": "vip" }
        ]
      }
    ],
    "warnings": ["End time inferred — input did not specify"],
    "notes": "Currency inferred as GBP from £ symbol",
    "model": "google/gemini-3.1-flash-lite-preview",
    "usage": { "prompt_tokens": 320, "completion_tokens": 180, "total_tokens": 500 }
  },
  "message": "sale-ai-draft"
}
```

### Errors

| message | meaning |
|---|---|
| `sale-ai-draft` (with `no-input`) | None of `text`, `csv`, `image`, `file` provided |
| `sale-ai-draft-parse-failed` | Model returned malformed JSON. Retry. |
| `sale-ai-draft-failed` | OpenRouter error or quota issue. Check `OPEN_ROUTER_API_KEY` |

### Frontend workflow

1. Show three input modes — text box, CSV paste, file picker — and let user combine.
2. POST to `/sales/ai/draft` with whatever the user provided.
3. Render `events[]` as an editable form. Show `warnings[]` as info banners on the relevant fields.
4. For each event the user accepts:
   - Resolve `venue` — search existing venues by `venue.name + venue.city`. If none, prompt user to create.
   - Pick `agreement` and `provider` — let user choose from their existing list (these are NOT inferred by the model).
   - `POST /sales` with the event payload (Sale + SaleEvent fields).
   - `POST /products` for each ticket tier (set `sale` to the new sale ID, `type: 'product.event'`).
5. Skip rejected drafts.

### Example: paste-text flow

```ts
const draftRes = await fetch('/sales/ai/draft', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: textareaValue,
    language: 'en',
  }),
});
const { data } = await draftRes.json();

for (const draft of data.events) {
  // user reviewed + edited inline
  const sale = await postSale(draft);
  for (const p of draft.products) await postProduct(sale._id, p);
}
```

### Example: poster upload

```ts
const fd = new FormData();
fd.append('file', posterFile);
fd.append('language', 'en');

const r = await fetch('/sales/ai/draft', {
  method: 'POST',
  headers: { Authorization: `Bearer ${jwt}` }, // do NOT set Content-Type
  body: fd,
});
const { data } = await r.json();
```

### Limits

- 8 MB max image size.
- ~4096 output tokens per call. A single response usually carries up to ~10 events comfortably; for big tour CSVs split into chunks.
- No per-realm quota today. Add server-side throttle if abuse becomes an issue.

---

## How AI calls flow internally

```
client request
   |
   v
controller (controllers/<area>/ai.js)
   |
   +-- (optional) check analyses cache by owner+scope+language
   +-- gather data via existing aggregation helpers
   +-- libs/ai.js chat({ system, user, schema })
   |       |
   |       v
   |   POST openrouter.ai/api/v1/chat/completions
   |       (Gemini, json_schema response_format)
   |
   +-- persist to analyses { rawData, response, expiresAt }
   |
   v
response
```

System prompts live in [`prompts/`](../prompts/). One JSON file per feature — `event-create.json`, `dashboard-tips.json`. Insights prompt is inline in [`controllers/reports/insights.js`](../controllers/reports/insights.js).

## Caching model: `analyses` collection

Schema: `{ owner, realm, scope, scopeId?, language, model, prompt, rawData, response, usage, expiresAt }`. TTL index on `expiresAt` auto-purges old runs.

Indexed for `(owner, scope, scopeId, language)` lookup on cache hits.

## Configuration

Required env:
- `OPEN_ROUTER_API_KEY`

Optional model overrides (default: `google/gemini-3.1-flash-lite-preview`):
- `AI_MODEL_FAST` — used for tips, insights summary, event draft (current default)
- `AI_MODEL_SMART` — bigger model for structured creation
- `AI_MODEL_PRO` — large-context model for bulk inputs

## Operational notes

- **No streaming.** All endpoints respond when the AI call completes (1-3s typical, 5-10s for image input).
- **Retries.** `libs/ai.js` retries once on 429 / 5xx with the same model.
- **Cache invalidation.** No write hooks today — cache simply expires after 3h. If the merchant wants fresh tips immediately, pass `refresh=true`.
- **Multi-realm.** Cache key includes `owner` (merchant account) so tenants are isolated.
- **PII.** Encoded payloads contain event names, ticket counts, revenue. They are persisted in `analyses.rawData` for 3h. Treat the collection as PII-bearing.
