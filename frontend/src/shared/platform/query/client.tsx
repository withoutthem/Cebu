// shared/src/platform/query/client.tsx
import { type FC, type ReactNode, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { loadRqEnv } from './env'

export interface QueryProviderProps {
  children: ReactNode
}

export const createQueryClient = () => {
  const env = loadRqEnv()
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: env.RQ_STALE_TIME_MS,
        gcTime: env.RQ_CACHE_TIME_MS, // react-query v5
        retry: env.RQ_RETRY,
        refetchOnWindowFocus: env.RQ_REFETCH_ON_WINDOW_FOCUS,
      },
      mutations: { retry: 0 },
    },
  })
}

export const QueryProvider: FC<QueryProviderProps> = ({ children }) => {
  const ref = useRef<QueryClient | null>(null)
  ref.current ??= createQueryClient()
  return <QueryClientProvider client={ref.current}>{children}</QueryClientProvider>
}
