# Fork Changes

## 1. Proxy Support for API Requests

**File:** `packages/notion-client/src/notion-api.ts`

Added a `proxyUrl` option to the `NotionAPI` constructor. When provided, all API requests are routed through the proxy via undici's `ProxyAgent`. CDN/file downloads are unaffected.

## 2. Retry with Exponential Backoff on 429

**File:** `packages/notion-client/src/notion-api.ts`

The `fetch()` method now retries up to 3 times on 429 responses with exponential backoff (2s, 4s, 8s). Previously, 429s were unhandled and resulted in failed/null pages.

## 3. Optional Logger

**File:** `packages/notion-client/src/notion-api.ts`

Added an optional `logger` option (`NotionAPILogger` interface) to the constructor. Retry events and diagnostics are logged through it when provided, otherwise silent. No `console.*` calls added.

---

## Summary

| Category | Count |
| -------- | ----- |
| Features | 3     |
