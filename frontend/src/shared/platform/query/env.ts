// shared/src/platform/query/env.ts
// http 모듈의 env 로더 패턴을 그대로 씁니다.
interface RqEnv {
  RQ_STALE_TIME_MS: number
  RQ_CACHE_TIME_MS: number
  RQ_RETRY: number
  RQ_REFETCH_ON_WINDOW_FOCUS: boolean
}

const toSafeString = (v: unknown): string => {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') {
    return String(v)
  }
  if (typeof v === 'symbol') return v.description ?? 'Symbol'
  try {
    return JSON.stringify(v)
  } catch {
    return '[Unserializable]'
  }
}

const toBool = (v: unknown) => String(v).toLowerCase() === 'true'

// 안전한 전역 접근: globalThis.__APP_CONF__를 unknown으로 가져와 검사
const getRuntimeConf = (): Record<string, unknown> | undefined => {
  const g = globalThis as Record<string, unknown>
  const raw = g.__APP_CONF__
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : undefined
}

// 안전한 import.meta.env 접근: 인덱싱 가능한 형태로 좁힌 뒤 사용
const getImportMetaEnv = (): Record<string, unknown> | undefined => {
  const m = import.meta as unknown as { env?: unknown }
  return m && typeof m.env === 'object' && m.env !== null
    ? (m.env as Record<string, unknown>)
    : undefined
}

// 문자열 읽기 유틸: 우선순위 (import.meta.env → runtimeConf → fallback)
// 반환은 항상 string (숫자/불리언도 문자열로 치환하여 기존 동작 유지)
const read = (k: string, fallback?: string): string => {
  const env = getImportMetaEnv()
  const run = getRuntimeConf()

  let v: unknown = env?.[k]
  if (v === undefined) v = run?.[k]
  if (v === undefined) v = fallback

  return typeof v === 'string' ? v : v != null ? toSafeString(v) : ''
}

export const loadRqEnv = (): RqEnv => {
  const stale = Number(read('VITE_RQ_STALE_TIME_MS', '30000'))
  const cache = Number(read('VITE_RQ_CACHE_TIME_MS', '300000'))
  const retry = Number(read('VITE_RQ_RETRY', '1'))
  const focus = toBool(read('VITE_RQ_REFETCH_ON_WINDOW_FOCUS', 'false'))

  return {
    RQ_STALE_TIME_MS: Number.isFinite(stale) ? stale : 30000,
    RQ_CACHE_TIME_MS: Number.isFinite(cache) ? cache : 300000,
    RQ_RETRY: Number.isFinite(retry) ? retry : 1,
    RQ_REFETCH_ON_WINDOW_FOCUS: focus,
  }
}
