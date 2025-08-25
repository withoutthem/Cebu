// shared/src/platform/query/helpers.ts
import { QueryClient, type QueryFunction } from '@tanstack/react-query'
import type { Query } from '@tanstack/query-core'

export type StaleTimeFn<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TKey extends readonly unknown[] = readonly unknown[],
> = (query: Query<TQueryFnData, TError, TData, TKey>) => number

export type StaleTimeOption<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TKey extends readonly unknown[] = readonly unknown[],
> = number | StaleTimeFn<TQueryFnData, TError, TData, TKey>

// 그대로 유지
export const invalidate = async (qc: QueryClient, ...keys: (readonly unknown[])[]) =>
  Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })))

// 객체 인자 형태 유지
export interface PrefetchArgs<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TKey extends readonly unknown[] = readonly unknown[],
> {
  key: TKey
  queryFn: QueryFunction<TQueryFnData, TKey>
  staleTime?: StaleTimeOption<TQueryFnData, TError, TData, TKey>
}

export const prefetch = async <
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TKey extends readonly unknown[] = readonly unknown[],
>(
  qc: QueryClient,
  args: PrefetchArgs<TQueryFnData, TError, TData, TKey>
) =>
  qc.prefetchQuery({
    queryKey: args.key,
    queryFn: args.queryFn,
    ...(args.staleTime !== undefined && { staleTime: args.staleTime }),
  })
