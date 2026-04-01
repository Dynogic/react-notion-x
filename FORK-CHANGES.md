# Fork Changes

## 1. Custom Request Function (`requestFn`)

**File:** `packages/notion-client/src/notion-api.ts`

Added `requestFn` option to the `NotionAPI` constructor. When provided, all HTTP requests route through it instead of `ofetch` — enables custom worker pools, proxy rotation, request queuing, and retry logic at the consumer level.

## 2. Zero-Retry Fetch

**File:** `packages/notion-client/src/notion-api.ts`

Removed built-in retry/backoff. The `fetch()` method makes a single call. Consumers handle all retry logic via `requestFn` or external wrapping.

## 3. Optional Logger

**File:** `packages/notion-client/src/notion-api.ts`

Added `logger` option (`NotionAPILogger` interface) to `NotionAPI` constructor. Replaces all `console.*` calls — diagnostics logged through the consumer's logger when provided, otherwise silent.

## 4. `onPageFetched` Callback

**File:** `packages/notion-utils/src/get-all-pages-in-space.ts`

Added `onPageFetched(pageId, pageCount)` callback to `getAllPagesInSpace`. Called after each successful page fetch, enabling real-time progress tracking.

## 5. Root Page Error Propagation

**File:** `packages/notion-utils/src/get-all-pages-in-space.ts`

Root page errors are re-thrown instead of swallowed. Sub-page errors still stored as `null`. Queue cleared on root page failure. Error thrown after `queue.onIdle()` for proper catch handling.

## 6. Logger in `getAllPagesInSpace`

**File:** `packages/notion-utils/src/get-all-pages-in-space.ts`

Added optional `logger` with `warn` and `debug` methods. Page load errors and successful fetches are logged through it instead of `console.warn`.

---

## Summary

| Category | Count |
| -------- | ----- |
| Features | 6     |
