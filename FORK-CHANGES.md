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

---

## Upstream sync log

| Fork release | Upstream base | Notes |
| ------------ | ------------- | ----- |
| v7.10.0.1–.11 | 7.10.0 | Initial fork |
| v8.0.8.1 | 8.0.8 (`03c5e88`) | Merged upstream/master. Picks up the `app.notion.com` API host + default `User-Agent` (fixes Cloudflare 403s on `loadPageChunk`), image-URL hardening, rate-limit retry (bypassed under `requestFn`, see §1). Conflicts: `notion-api.ts` (retry vs `requestFn`, logger vs `console.warn`, options resolver), `tsdown.config.ts`, `.gitignore`. |

---

## Summary

| Category | Count |
| -------- | ----- |
| Features | 4     |
