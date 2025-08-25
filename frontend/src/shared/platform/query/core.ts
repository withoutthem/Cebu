// shared/src/platform/query/core.ts
import { useMutation, useQuery, useQueryClient, type QueryFunction } from '@tanstack/react-query'

export interface UseQArgs<
  TQueryFnData,
  TSelected = TQueryFnData,
  TKey extends readonly unknown[] = readonly unknown[],
> {
  key: TKey // qk.xxx()
  queryFn: QueryFunction<TQueryFnData, TKey> | (() => Promise<TQueryFnData>)
  enabled?: boolean
  staleTimeMs?: number // per-query override
  select?: (data: TQueryFnData) => TSelected
}

export const useQ = <
  TQueryFnData,
  TSelected = TQueryFnData,
  TKey extends readonly unknown[] = readonly unknown[],
>(
  args: UseQArgs<TQueryFnData, TSelected, TKey>
) =>
  useQuery<TQueryFnData, Error, TSelected, TKey>({
    queryKey: args.key,
    // react-query가 기대하는 시그니처에 맞춰 캐스트 (런타임 영향 없음, 타입 정합을 위해)
    queryFn: args.queryFn as QueryFunction<TQueryFnData, TKey>,
    enabled: args.enabled ?? true,
    ...(args.staleTimeMs !== undefined && { staleTime: args.staleTimeMs }),
    ...(args.select && { select: args.select as (d: TQueryFnData) => TSelected }),
  })

export interface UseMArgs<TVars, TRes> {
  mutationFn: (vars: TVars) => Promise<TRes>
  invalidateKeys?: readonly (readonly unknown[])[]
  onSuccess?: (data: TRes) => void | Promise<void>
}

export const useM = <TVars, TRes>(args: UseMArgs<TVars, TRes>) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: args.mutationFn,
    onSuccess: async (data) => {
      if (args.invalidateKeys?.length) {
        await Promise.all(args.invalidateKeys.map((k) => qc.invalidateQueries({ queryKey: k })))
      }
      if (args.onSuccess) await args.onSuccess(data)
    },
  })
}
