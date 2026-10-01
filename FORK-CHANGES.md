# Fork Changes

## 1. Custom Request Function (`requestFn`)

**File:** `packages/notion-client/src/notion-api.ts`

Added `requestFn` option to the `NotionAPI` constructor. When provided, all HTTP requests route through it instead of `ofetch` — enables custom worker pools, proxy rotation, request queuing, and retry logic at the consumer level.

**`requestFn` owns retry.** Upstream added rate-limit retry/backoff to the `ofetch` path in 7.10.1 (`retry.ts`). A `requestFn` call bypasses it entirely — one pass-through call, zero retries — because the consumer's pool already retries (with proxy rotation) and stacking both would multiply attempts. Without `requestFn`, upstream's retry applies unchanged. The request still carries upstream's default `User-Agent` header (7.10.1): the consumer must forward `options.headers`, since Cloudflare in front of `www.notion.so` 403s generic HTTP-library user agents (e.g. got's default).

Also `getOfetchOptions` — a per-request callback merged over `ofetchOptions` (resolved once per request), for per-request proxy configuration.

## 2. Optional Logger

**Files:** `packages/notion-client/src/notion-api.ts`, `packages/notion-utils/src/get-all-pages-in-space.ts`

Added optional `logger` to `NotionAPI` and `getAllPagesInSpace`. Replaces all `console.*` calls — diagnostics logged through the consumer's logger when provided, otherwise silent.

## 3. `onPageFetched` Callback

**File:** `packages/notion-utils/src/get-all-pages-in-space.ts`

Added `onPageFetched(pageId, pageCount)` callback to `getAllPagesInSpace`. Called after each successful page fetch, enabling real-time progress tracking.

## 4. Root Page Error Propagation

**File:** `packages/notion-utils/src/get-all-pages-in-space.ts`

Root page errors are re-thrown instead of silently stored as `null`. Sub-page errors are still swallowed gracefully. This lets the consumer distinguish "page not found" from "network error".

## 5. Collection queries that come back empty

**File:** `packages/notion-client/src/notion-api.ts`

Upstream 7.10.1 (`833ef86`) started reading collection views correctly through `getBlockValue`. Before it, the view was read as the wrapper, so every query went out unfiltered and ungrouped. Reading the real view exposed two query shapes Notion rejects or answers with nothing:

- **Valueless filters are dropped.** A filter the user added in Notion but never filled in is ignored by Notion's UI, but sent as-is it matches no rows (a filtered gallery came back with 0 of its 4 rows). `getCollectionData` now drops leaf filters with no `value`, except `is_empty` / `is_not_empty`, which take none by design.
- **A rejected grouped query is retried ungrouped.** Notion answers some grouped queries with 400 "Invalid input" (a list grouped by a date by month). `getPage` retries such a view without its grouping (filters and sorts kept) and deletes `collection_group_by` from the view in the record map, so the renderer lists every row flat instead of drawing nothing. Boards are never flattened: a board is its grouping.

Pinned in `src/fork-collection-query.test.ts`.

---

## Upstream sync log

| Fork release | Upstream base | Notes |
| ------------ | ------------- | ----- |
| v7.10.0.1–.11 | 7.10.0 | Initial fork |
| v8.0.8.2 | 8.0.8 (`03c5e88`) | §5: valueless filters dropped, rejected grouped queries retried ungrouped. |
| v8.0.8.1 | 8.0.8 (`03c5e88`) | Merged upstream/master. Picks up the `app.notion.com` API host + default `User-Agent` (fixes Cloudflare 403s on `loadPageChunk`), image-URL hardening, rate-limit retry (bypassed under `requestFn`, see §1). Conflicts: `notion-api.ts` (retry vs `requestFn`, logger vs `console.warn`, options resolver), `tsdown.config.ts`, `.gitignore`. |

---

## Summary

| Category | Count |
| -------- | ----- |
| Features | 5     |
