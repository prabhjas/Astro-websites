# Lead Ops File Store

This project now uses a file-backed, store-first lead intake flow.

## Flow

```text
Browser form
-> /api/contact
-> validate + sanitize + rate-limit + honeypot
-> write lead submission to local file store
-> return success once safely stored
-> attempt Pipedrive delivery
-> write delivery attempt result
-> mark delivered / retry_scheduled / failed / dead_letter
```

Pipedrive is treated as a downstream delivery target, not the system of record.

## Storage layout

Default root:

```text
.data/leads/
```

Under that directory the application writes:

```text
.data/leads/
  submissions/
    YYYY-MM/
      submissions-YYYY-MM-DD-001.ndjson
      submissions-YYYY-MM-DD-002.ndjson
  attempts/
    YYYY-MM/
      attempts-YYYY-MM-DD-001.ndjson
  state/
    <submissionId>.json
```

## Rotation

- Submission and attempt logs are append-only NDJSON
- Files rotate at `LEAD_STORE_MAX_FILE_BYTES`
- Default size is `10MB`

This avoids one large monolithic file while keeping the store easy to back up and inspect.

## Why there is also a `state/` directory

The NDJSON files are the append-only history.

The `state/` directory stores the latest materialized state for each lead so the application can:

- check idempotency by `submission_id`
- determine current delivery status quickly
- avoid replaying the full event history on every request

## Important operational assumptions

This file-backed approach is appropriate only when production has:

- a long-lived server runtime
- persistent disk
- a single writable instance, or tightly controlled write concurrency

It is **not** appropriate for ephemeral serverless filesystems.

## Required form client behavior

The form now sends:

- `submission_id`
- first-touch attribution payload
- last-touch attribution payload
- tracking IDs such as `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`
- UTM values
- campaign/adgroup/creative and related ad metadata

The browser also pushes a GTM/GA-style event on successful submission:

```js
window.dataLayer.push({
  event: 'form_submission_lead',
  email,
  phone_number,
  submission_id
});
```

## Retry behavior

The code now classifies Pipedrive failures as:

- retryable
- permanent

Retry metadata is written to the lead state using:

- `deliveryStatus`
- `deliveryAttemptCount`
- `nextRetryAt`
- `lastErrorCode`
- `lastErrorMessage`

Automatic retry workers and the internal dashboard can be added later without changing the core file format.

## Migration path to a database later

The implementation is intentionally structured so we can later replace the file-backed repository with:

- PostgreSQL
- another relational DB
- or a managed queue + DB combination

The API, validation layer, attribution capture, and Pipedrive service can remain mostly unchanged.
