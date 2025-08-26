// env.ts — WebSocket ENV 로딩/정규화(런타임 → 빌드타임 → 기본값)

export type RuntimeAppConfWS = {
  WS_BASE_URL?: string
  WS_PATH?: string
  WS_RETRY_MIN_MS?: number | string
  WS_RETRY_MAX_MS?: number | string
  WS_HEARTBEAT_MS?: number | string
  WS_REQUEST_TIMEOUT_MS?: number | string
  WS_WITH_TOKEN_QUERY?: boolean | string
  ACCESS_TOKEN?: string
}

// 빌드타임 define (없어도 됨)
declare const __WS_BASE_URL__: string | undefined
declare const __WS_PATH__: string | undefined
declare const __WS_RETRY_MIN_MS__: string | undefined
declare const __WS_RETRY_MAX_MS__: string | undefined
declare const __WS_HEARTBEAT_MS__: string | undefined
declare const __WS_REQUEST_TIMEOUT_MS__: string | undefined
declare const __WS_WITH_TOKEN_QUERY__: string | undefined
declare const __API_BASE_URL__: string | undefined

type WsEnv = {
  WS_BASE_URL: string
  WS_PATH: string
  WS_RETRY_MIN_MS: number
  WS_RETRY_MAX_MS: number
  WS_HEARTBEAT_MS: number
  WS_REQUEST_TIMEOUT_MS: number
  WS_WITH_TOKEN_QUERY: boolean
  RUNTIME_ACCESS_TOKEN?: string | undefined
}

function num(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  return fallback
}
function bool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v === 'true' || v === '1'
  return fallback
}

function readRuntimeConf(): Partial<RuntimeAppConfWS> {
  const g = globalThis as unknown as { __APP_CONF__?: RuntimeAppConfWS }
  return g.__APP_CONF__ ?? {}
}

function deriveWsBaseFromApi(apiBase?: string): string | undefined {
  if (!apiBase) return undefined
  try {
    const origin = (globalThis as unknown as { location?: Location }).location?.origin
    const u = new URL(apiBase, origin)
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
    u.pathname = '/ws'
    u.search = ''
    u.hash = ''
    return u.toString()
  } catch {
    return undefined
  }
}

export const WS_ENV: WsEnv = (() => {
  const rt = readRuntimeConf()
  const baseURL =
    rt.WS_BASE_URL ?? __WS_BASE_URL__ ?? deriveWsBaseFromApi(__API_BASE_URL__) ?? '/ws'
  const path = rt.WS_PATH ?? __WS_PATH__ ?? ''

  return {
    WS_BASE_URL: baseURL,
    WS_PATH: path,
    WS_RETRY_MIN_MS: num(rt.WS_RETRY_MIN_MS ?? __WS_RETRY_MIN_MS__, 300),
    WS_RETRY_MAX_MS: num(rt.WS_RETRY_MAX_MS ?? __WS_RETRY_MAX_MS__, 10_000),
    WS_HEARTBEAT_MS: num(rt.WS_HEARTBEAT_MS ?? __WS_HEARTBEAT_MS__, 25_000),
    WS_REQUEST_TIMEOUT_MS: num(rt.WS_REQUEST_TIMEOUT_MS ?? __WS_REQUEST_TIMEOUT_MS__, 15_000),
    WS_WITH_TOKEN_QUERY: bool(rt.WS_WITH_TOKEN_QUERY ?? __WS_WITH_TOKEN_QUERY__, true),
    RUNTIME_ACCESS_TOKEN: rt.ACCESS_TOKEN,
  }
})()

export function getRuntimeAccessToken(): string | undefined {
  const g = globalThis as unknown as { __APP_CONF__?: RuntimeAppConfWS }
  return g.__APP_CONF__?.ACCESS_TOKEN ?? WS_ENV.RUNTIME_ACCESS_TOKEN
}
