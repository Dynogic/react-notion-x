# Fork Changes

## 1. Proxy Support for API Requests

**File:** `packages/notion-client/src/notion-api.ts`

Added support for routing all Notion API requests through an HTTP proxy. The `NotionAPI` constructor accepts a proxy URL, which is used for API calls while leaving CDN/file downloads unaffected.

## 2. Retry with Exponential Backoff on 429

**File:** `packages/notion-client/src/notion-api.ts`

Added built-in retry logic for 429 (Too Many Requests) responses with exponential backoff. Previously, 429s were unhandled and resulted in failed/null pages.

---

## Summary

| Category | Count |
| -------- | ----- |
| Features | 2     |
