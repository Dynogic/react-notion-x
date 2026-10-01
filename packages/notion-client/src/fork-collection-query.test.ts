// Fork: the collection-query fixes (FORK-CHANGES.md #5). Driven through
// `requestFn`, so every request body Notion would receive is visible.
import { expect, test } from 'vitest'

import { NotionAPI } from './notion-api'

const CollectionId = 'collection-1'
const ViewId = 'view-1'
const PageId = '11111111-1111-4111-8111-111111111111'

function makeApi(answer: (body: any) => any) {
  const bodies: any[] = []
  const api = new NotionAPI({
    requestFn: async (url: string, options: any) => {
      if (!url.endsWith('/queryCollection'))
        throw new Error(`unexpected ${url}`)
      bodies.push(options.body)
      return answer(options.body)
    }
  })
  return { api, bodies }
}

const ok = { result: { reducerResults: {} }, recordMap: { block: {} } }
const filtersOf = (body: any) => body.loader.filter.filters

test('a filter with no value is dropped — Notion ignores it, sent as-is it empties the view', async () => {
  const { api, bodies } = makeApi(() => ok)
  await api.getCollectionData(CollectionId, ViewId, {
    type: 'table',
    format: {
      property_filters: [
        {
          filter: {
            property: 'cat',
            filter: { operator: 'enum_contains', value: { type: 'exact' } }
          }
        },
        {
          filter: {
            property: 'done',
            filter: {
              operator: 'checkbox_is',
              value: { type: 'exact', value: true }
            }
          }
        },
        { filter: { property: 'due', filter: { operator: 'is_empty' } } },
        {
          filter: {
            property: 'note',
            filter: { operator: 'is_not_empty', value: { type: 'exact' } }
          }
        }
      ]
    }
  })

  expect(filtersOf(bodies[0]).map((f: any) => f.property)).toEqual([
    'done',
    'due',
    'note'
  ])
})

test('query2 filters with no value are dropped the same way', async () => {
  const { api, bodies } = makeApi(() => ok)
  await api.getCollectionData(CollectionId, ViewId, {
    type: 'gallery',
    query2: {
      filter: {
        operator: 'and',
        filters: [
          {
            property: 'status',
            filter: { operator: 'enum_is', value: { type: 'exact' } }
          },
          {
            property: 'read',
            filter: {
              operator: 'checkbox_is',
              value: { type: 'exact', value: true }
            }
          }
        ]
      }
    }
  })

  expect(filtersOf(bodies[0]).map((f: any) => f.property)).toEqual(['read'])
})

function pageWithGroupedList(
  viewType = 'list',
  groupKey = 'collection_group_by'
) {
  const view = {
    id: ViewId,
    type: viewType,
    format: {
      [groupKey]: { type: 'date', groupBy: 'month', property: 'due' },
      collection_pointer: { id: CollectionId }
    }
  }
  return {
    block: {
      [PageId]: {
        role: 'reader',
        value: {
          id: PageId,
          type: 'page',
          content: ['cv'],
          parent_table: 'space'
        }
      },
      cv: {
        role: 'reader',
        value: {
          id: 'cv',
          type: 'collection_view',
          parent_id: PageId,
          parent_table: 'block',
          collection_id: CollectionId,
          view_ids: [ViewId]
        }
      }
    },
    collection: {
      [CollectionId]: {
        role: 'reader',
        value: { id: CollectionId, schema: {} }
      }
    },
    collection_view: { [ViewId]: { role: 'reader', value: view } },
    view
  }
}

function getPageAgainst(page: any, answer: (body: any) => any) {
  const bodies: any[] = []
  const api = new NotionAPI({
    requestFn: async (url: string, options: any) => {
      if (url.endsWith('/loadPageChunk')) {
        return {
          recordMap: {
            block: page.block,
            collection: page.collection,
            collection_view: page.collection_view
          }
        }
      }
      if (url.endsWith('/queryCollection')) {
        bodies.push(options.body)
        return answer(options.body)
      }
      if (
        url.endsWith('/syncRecordValues') ||
        url.endsWith('/syncRecordValuesMain')
      )
        return { recordMap: {} }
      throw new Error(`unexpected ${url}`)
    }
  })
  return { api, bodies }
}

const isGrouped = (body: any) =>
  Object.keys(body.loader.reducers).some(
    (k) => k.endsWith('_groups') || k === 'board_columns'
  )
const rejectGrouped = (body: any) => {
  if (isGrouped(body))
    throw Object.assign(new Error('400 Invalid input'), { status: 400 })
  return {
    result: {
      reducerResults: {
        collection_group_results: { blockIds: ['row-1', 'row-2'] }
      }
    },
    recordMap: { block: {} }
  }
}

test('a rejected grouped query is retried ungrouped, and the view renders ungrouped', async () => {
  const page = pageWithGroupedList()
  const { api, bodies } = getPageAgainst(page, rejectGrouped)
  const recordMap = await api.getPage(PageId, {
    signFileUrls: false,
    fetchMissingBlocks: false,
    fetchRelationPages: false
  })

  expect(bodies.map(isGrouped)).toEqual([true, false])
  expect(recordMap.collection_query[CollectionId]?.[ViewId]).toEqual({
    collection_group_results: { blockIds: ['row-1', 'row-2'] }
  })
  const view: any = (recordMap.collection_view[ViewId] as any).value
  expect(view.format.collection_group_by).toBeUndefined()
})

test('a grouped query Notion accepts stays grouped — no retry', async () => {
  const page = pageWithGroupedList()
  const { api, bodies } = getPageAgainst(page, () => ({
    result: { reducerResults: {} },
    recordMap: { block: {} }
  }))
  const recordMap = await api.getPage(PageId, {
    signFileUrls: false,
    fetchMissingBlocks: false,
    fetchRelationPages: false
  })

  expect(bodies).toHaveLength(1)
  expect(
    (recordMap.collection_view[ViewId] as any).value.format.collection_group_by
  ).toBeDefined()
})

test('a board is never flattened: a rejected board query is not retried', async () => {
  const page = pageWithGroupedList('board', 'board_columns_by')
  const { api, bodies } = getPageAgainst(page, rejectGrouped)
  const recordMap = await api.getPage(PageId, {
    signFileUrls: false,
    fetchMissingBlocks: false,
    fetchRelationPages: false
  })

  expect(bodies).toHaveLength(1)
  expect(recordMap.collection_query[CollectionId]?.[ViewId]).toBeUndefined()
})
