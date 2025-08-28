// env.ts — WebSocket ENV 로딩/정규화 (Vite 환경에 최적화)
// - 우선순위(높→낮): 런타임(__APP_CONF__) > Vite(.env: import.meta.env) > 유도값/기본값
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

// ⬇️ [수정] Vite에서는 사용하지 않는 빌드타임 define 선언을 모두 제거합니다.
// declare const __WS_BASE_URL__: string | undefined
// ... (이하 모두 제거)

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
    if (import.meta?.env) {
      return import.meta.env as {
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
    u.protocol = u.protocol.startsWith('https') ? 'wss:' : 'ws:'
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
  // ⬇️ [수정] __WS_BASE_URL__ 및 관련 define을 참조하는 로직을 제거합니다.
  //    런타임 → Vite(.env: VITE_WS_BASE_URL) → VITE_API_BASE_URL로 유도 → 기본 '/ws'
  const wsBase =
    rt.WS_BASE_URL ?? ve?.VITE_WS_BASE_URL ?? deriveWsBaseFromApi(ve?.VITE_API_BASE_URL) ?? '/ws'

  // 2) WS_PATH
  // ⬇️ [수정] __WS_PATH__ 참조 제거
  const wsPath = rt.WS_PATH ?? ve?.VITE_WS_PATH ?? ''

  // 3) 숫자/불리언 값 파싱 (런타임 → Vite → 기본값)
  // ⬇️ [수정] 모든 __...__ 참조 제거
  const retryMin = num(rt.WS_RETRY_MIN_MS ?? ve?.VITE_WS_RETRY_MIN_MS, 300)
  const retryMax = num(rt.WS_RETRY_MAX_MS ?? ve?.VITE_WS_RETRY_MAX_MS, 10_000)
  const hbMs = num(rt.WS_HEARTBEAT_MS ?? ve?.VITE_WS_HEARTBEAT_MS, 25_000)
  const reqTo = num(rt.WS_REQUEST_TIMEOUT_MS ?? ve?.VITE_WS_REQUEST_TIMEOUT_MS, 15_000)
  const withToken = bool(rt.WS_WITH_TOKEN_QUERY ?? ve?.VITE_WS_WITH_TOKEN_QUERY, true)

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
