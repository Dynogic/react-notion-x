import { type ExtendedRecordMap, type PageMap } from 'notion-types'
import PQueue from 'p-queue'

import { getBlockValue } from './get-block-value'
import { parsePageId } from './parse-page-id'

/**
 * Performs a traversal over a given Notion workspace starting from a seed page.
 *
 * Returns a map containing all of the pages that are reachable from the seed
 * page in the space.
 *
 * If `rootSpaceId` is not defined, the space ID of the root page will be used
 * to scope traversal.
 *
 * @param rootPageId - Page ID to start from.
 * @param rootSpaceId - Space ID to scope traversal.
 * @param getPage - Function used to fetch a single page.
 * @param opts - Optional config
 */
// Fork: how deep `getCollectionRowIds` looks into a view's reducer results.
// The results object (1), a reducer (2), an entry of a reducer's list (3).
const MaxReducerDepth = 3

/**
 * Fork: every row id a collection view's reducer results name. Upstream read
 * only `collection_group_results.blockIds` (an ungrouped view) and a bare
 * `blockIds`, so a row reachable only through a GROUPED view (its
 * `results:<type>:<value>` reducers) or a BOARD (its columns' results) was
 * never fetched, and neither were the pages under it. Any reducer value — or
 * an entry of a reducer's list — that carries `blockIds` names rows.
 */
export function getCollectionRowIds(collectionData: unknown): string[] {
  const ids = new Set<string>()
  const visit = (value: unknown, depth: number) => {
    if (!value || typeof value !== 'object' || depth > MaxReducerDepth) return
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, depth)
      return
    }
    const blockIds = (value as { blockIds?: unknown }).blockIds
    if (Array.isArray(blockIds)) {
      for (const id of blockIds) {
        if (typeof id === 'string' && id) ids.add(id)
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (key !== 'blockIds') visit(child, depth + 1)
    }
  }
  visit(collectionData, 1)
  return Array.from(ids)
}

export interface PageSpaceLogger {
  warn: (message: string, extra?: Record<string, unknown>) => void
  debug?: (message: string, extra?: Record<string, unknown>) => void
}

export async function getAllPagesInSpace(
  rootPageId: string,
  rootSpaceId: string | undefined,
  getPage: (pageId: string) => Promise<ExtendedRecordMap>,
  {
    concurrency = 4,
    traverseCollections = true,
    targetPageId,
    maxDepth = Number.POSITIVE_INFINITY,
    logger,
    onPageFetched
  }: {
    concurrency?: number
    traverseCollections?: boolean
    targetPageId?: string
    maxDepth?: number
    logger?: PageSpaceLogger
    onPageFetched?: (pageId: string, pageCount: number) => void
  } = {}
): Promise<PageMap> {
  const pages: PageMap = {}
  const pendingPageIds = new Set<string>()
  const queue = new PQueue({ concurrency })
  let rootPageError: Error | null = null

  async function processPage(pageId: string, depth = 0) {
    if (depth > maxDepth) {
      return
    }

    if (targetPageId && pendingPageIds.has(targetPageId)) {
      return
    }

    pageId = parsePageId(pageId) as string

    if (pageId && !pages[pageId] && !pendingPageIds.has(pageId)) {
      pendingPageIds.add(pageId)

      void queue.add(async () => {
        try {
          if (
            targetPageId &&
            pendingPageIds.has(targetPageId) &&
            pageId !== targetPageId
          ) {
            return
          }

          const page = await getPage(pageId)
          if (!page) {
            return
          }

          const spaceId = getBlockValue(page.block[pageId])?.space_id

          if (spaceId) {
            if (!rootSpaceId) {
              rootSpaceId = spaceId
            } else if (rootSpaceId !== spaceId) {
              return
            }
          }

          for (const subPageId of Object.keys(page.block).filter((key) => {
            const block = getBlockValue(page.block[key])
            if (!block || block.alive === false) return false

            if (
              block.type !== 'page' &&
              block.type !== 'collection_view_page'
            ) {
              return false
            }

            // the space id check is important to limit traversal because pages
            // can reference pages in other spaces
            if (
              rootSpaceId &&
              block.space_id &&
              block.space_id !== rootSpaceId
            ) {
              return false
            }

            return true
          })) {
            void processPage(subPageId, depth + 1)
          }

          // traverse collection item pages as they may contain subpages as well
          if (traverseCollections) {
            for (const collectionViews of Object.values(
              page.collection_query
            )) {
              for (const collectionData of Object.values(collectionViews)) {
                for (const collectionItemId of getCollectionRowIds(
                  collectionData
                )) {
                  void processPage(collectionItemId, depth + 1)
                }
              }
            }
          }

          pages[pageId] = page
          const pageCount = Object.keys(pages).length
          logger?.debug?.(`Fetched page ${pageCount}`, { pageId })
          onPageFetched?.(pageId, pageCount)
        } catch (err: any) {
          logger?.warn('page load error', {
            pageId,
            spaceId: rootSpaceId,
            statusCode: err.statusCode,
            error: err.message
          })
          if (pageId === rootPageId) {
            rootPageError = err
            queue.clear()
          }
          pages[pageId] = null
        }

        pendingPageIds.delete(pageId)
      })
    }
  }

  await processPage(rootPageId)
  await queue.onIdle()

  if (rootPageError) {
    throw rootPageError
  }

  return pages
}
