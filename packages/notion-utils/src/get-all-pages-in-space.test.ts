// Fork: rows reachable only through grouped views and boards
// (FORK-CHANGES.md #6).
import { expect, test } from 'vitest'

import {
  getAllPagesInSpace,
  getCollectionRowIds
} from './get-all-pages-in-space'

const SpaceId = 'space-1'
const Root = '11111111-1111-4111-8111-111111111111'
const rowId = (n: number) => `22222222-2222-4222-8222-22222222222${n}`

const block = (id: string, extra: Record<string, unknown> = {}) => ({
  value: {
    value: { id, space_id: SpaceId, alive: true, ...extra },
    role: 'reader'
  }
})

// A page whose one collection view answered with `reducerResults`.
const pageWithView = (reducerResults: unknown) => ({
  block: { [Root]: block(Root, { type: 'page' }) },
  collection_query: { 'collection-1': { 'view-1': reducerResults } }
})

async function crawl(reducerResults: unknown) {
  const fetched: string[] = []
  const pages = await getAllPagesInSpace(Root, undefined, async (pageId) => {
    fetched.push(pageId)
    if (pageId === Root) return pageWithView(reducerResults) as any
    return {
      block: { [pageId]: block(pageId, { type: 'page' }) },
      collection_query: {}
    } as any
  })
  return { fetched, pages }
}

test('an ungrouped view: its rows are crawled (unchanged)', async () => {
  const { fetched } = await crawl({
    collection_group_results: {
      type: 'results',
      blockIds: [rowId(1), rowId(2)],
      hasMore: false
    }
  })
  expect(fetched.sort()).toEqual([Root, rowId(1), rowId(2)].sort())
})

test('a GROUPED view: rows only in its `results:<type>:<value>` reducers are crawled', async () => {
  const { fetched } = await crawl({
    select_groups: {
      type: 'groups',
      version: 'v2',
      results: [{ value: { type: 'select', value: 'A' } }]
    },
    'group_aggregation:select:A': {
      type: 'aggregation',
      aggregationResult: { type: 'number', value: 1 }
    },
    'results:select:A': {
      type: 'results',
      blockIds: [rowId(1)],
      hasMore: false
    },
    'results:select:uncategorized': {
      type: 'results',
      blockIds: [rowId(2)],
      hasMore: false
    }
  })
  expect(fetched.sort()).toEqual([Root, rowId(1), rowId(2)].sort())
})

test("a BOARD: rows in its columns' results are crawled, including a column list that names them", async () => {
  const { fetched } = await crawl({
    board_columns: {
      type: 'groups',
      version: 'v2',
      results: [
        { value: { type: 'select', value: 'Doing' }, blockIds: [rowId(3)] }
      ]
    },
    'results:select:Doing': {
      type: 'results',
      blockIds: [rowId(4)],
      hasMore: false
    }
  })
  expect(fetched.sort()).toEqual([Root, rowId(3), rowId(4)].sort())
})

test('a row named by several reducers is crawled once', async () => {
  const { fetched } = await crawl({
    collection_group_results: { blockIds: [rowId(1)] },
    'results:select:A': { blockIds: [rowId(1)] }
  })
  expect(fetched.filter((id) => id === rowId(1))).toHaveLength(1)
})

test('getCollectionRowIds: ignores what is not a row id, and an empty or missing view', () => {
  expect(getCollectionRowIds(undefined)).toEqual([])
  expect(getCollectionRowIds({})).toEqual([])
  expect(
    getCollectionRowIds({ 'results:x': { blockIds: ['a', 7, null, '', 'b'] } })
  ).toEqual(['a', 'b'])
})
