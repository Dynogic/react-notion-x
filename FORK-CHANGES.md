# Fork Changes

## 1. Custom Request Function (`requestFn`)

**File:** `packages/notion-client/src/notion-api.ts`

Added `requestFn` option to the `NotionAPI` constructor. When provided, all HTTP requests route through it instead of `ofetch` — enables custom worker pools, proxy rotation, request queuing, and retry logic at the consumer level.

## 2. Optional Logger

**Files:** `packages/notion-client/src/notion-api.ts`, `packages/notion-utils/src/get-all-pages-in-space.ts`

Added optional `logger` to `NotionAPI` and `getAllPagesInSpace`. Replaces all `console.*` calls — diagnostics logged through the consumer's logger when provided, otherwise silent.

## 3. `onPageFetched` Callback

**File:** `packages/notion-utils/src/get-all-pages-in-space.ts`

Added `onPageFetched(pageId, pageCount)` callback to `getAllPagesInSpace`. Called after each successful page fetch, enabling real-time progress tracking.

## 4. Root Page Error Propagation

**File:** `packages/notion-utils/src/get-all-pages-in-space.ts`

Root page errors are re-thrown instead of swallowed. Sub-page errors still stored as `null`. Queue cleared on root page failure. Error thrown after `queue.onIdle()` for proper catch handling.

---

## Summary

| Category | Count |
| -------- | ----- |
| Features | 4     |
