// env.ts — WebSocket ENV 로딩/정규화
// - 우선순위(높→낮): 런타임(__APP_CONF__) > Vite(.env: import.meta.env) > 빌드타임 define(__WS_*__) > 유도값/기본값
// - 타입/ESLint 안정: 모든 외부 입력은 string|number|boolean|undefined로 받아 안전 파싱(num/bool)

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

// (옵션) 빌드타임 define — 없으면 undefined로 처리됨
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

/* ---------------- 유틸 ---------------- */

function num(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return fallback
}
function bool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'true' || s === '1') return true
    if (s === 'false' || s === '0') return false
  }
  return fallback
}

function readRuntimeConf(): Partial<RuntimeAppConfWS> {
  const g = globalThis as unknown as { __APP_CONF__?: RuntimeAppConfWS }
  return g.__APP_CONF__ ?? {}
}

// Vite(.env) 안전 참조 (SSR/테스트에서 import.meta.env가 없을 수 있음)
function readViteEnv() {
  try {
    if (typeof import.meta !== 'undefined') {
      const meta = import.meta as ImportMeta

      return meta.env as {
        VITE_WS_BASE_URL?: string
        VITE_WS_PATH?: string
        VITE_WS_RETRY_MIN_MS?: string
        VITE_WS_RETRY_MAX_MS?: string
        VITE_WS_HEARTBEAT_MS?: string
        VITE_WS_REQUEST_TIMEOUT_MS?: string
        VITE_WS_WITH_TOKEN_QUERY?: string
        VITE_API_BASE_URL?: string
        VITE_ACCESS_TOKEN?: string
      }
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * REST API Base URL로부터 WebSocket Base URL 유도
 * - https -> wss, http -> ws
 * - 기본 경로는 '/ws' (필요시 수정 가능)
 */
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

/* ---------------- ENV 정규화 ---------------- */

export const WS_ENV: WsEnv = (() => {
  const rt = readRuntimeConf()
  const ve = readViteEnv()

  // 1) WS_BASE_URL
  //    런타임 → Vite(.env: VITE_WS_BASE_URL) → 빌드 define → VITE_API_BASE_URL로 유도 → __API_BASE_URL__로 유도 → 기본 '/ws'
  const wsBase =
    rt.WS_BASE_URL ??
    ve?.VITE_WS_BASE_URL ??
    __WS_BASE_URL__ ??
    deriveWsBaseFromApi(ve?.VITE_API_BASE_URL) ??
    deriveWsBaseFromApi(__API_BASE_URL__) ??
    '/ws'

  // 2) WS_PATH
  const wsPath = rt.WS_PATH ?? ve?.VITE_WS_PATH ?? __WS_PATH__ ?? ''

  // 3) 숫자/불리언 값 파싱 (런타임 → Vite → 빌드 define → 기본값)
  const retryMin = num(rt.WS_RETRY_MIN_MS ?? ve?.VITE_WS_RETRY_MIN_MS ?? __WS_RETRY_MIN_MS__, 300)
  const retryMax = num(
    rt.WS_RETRY_MAX_MS ?? ve?.VITE_WS_RETRY_MAX_MS ?? __WS_RETRY_MAX_MS__,
    10_000
  )
  const hbMs = num(rt.WS_HEARTBEAT_MS ?? ve?.VITE_WS_HEARTBEAT_MS ?? __WS_HEARTBEAT_MS__, 25_000)
  const reqTo = num(
    rt.WS_REQUEST_TIMEOUT_MS ?? ve?.VITE_WS_REQUEST_TIMEOUT_MS ?? __WS_REQUEST_TIMEOUT_MS__,
    15_000
  )
  const withToken = bool(
    rt.WS_WITH_TOKEN_QUERY ?? ve?.VITE_WS_WITH_TOKEN_QUERY ?? __WS_WITH_TOKEN_QUERY__,
    true
  )

  return {
    WS_BASE_URL: wsBase,
    WS_PATH: wsPath,
    WS_RETRY_MIN_MS: retryMin,
    WS_RETRY_MAX_MS: retryMax,
    WS_HEARTBEAT_MS: hbMs,
    WS_REQUEST_TIMEOUT_MS: reqTo,
    WS_WITH_TOKEN_QUERY: withToken,
    // 런타임 우선, 없으면 Vite(옵션). 운영에서 토큰은 보통 런타임 주입을 권장.
    RUNTIME_ACCESS_TOKEN: rt.ACCESS_TOKEN ?? ve?.VITE_ACCESS_TOKEN,
  }
})()

/** 런타임 토큰 조회 — __APP_CONF__ 우선, 없으면 WS_ENV.RUNTIME_ACCESS_TOKEN */
export function getRuntimeAccessToken(): string | undefined {
  const g = globalThis as unknown as { __APP_CONF__?: RuntimeAppConfWS }
  return g.__APP_CONF__?.ACCESS_TOKEN ?? WS_ENV.RUNTIME_ACCESS_TOKEN
}
