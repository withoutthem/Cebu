import axios, { AxiosHeaders } from 'axios'
import { ENV } from './env'

// axios.create 반환 타입
type AxiosLike = ReturnType<typeof axios.create>

// 싱글톤 보관
let clientRef: AxiosLike | null = null

// 값 직렬화
const serializeParamValue = (v: unknown): string => {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString()

  switch (typeof v) {
    case 'string':
      return v
    case 'number':
      return Number.isFinite(v) ? String(v) : ''
    case 'bigint':
      return String(v)
    case 'boolean':
      return v ? 'true' : 'false'
    case 'symbol':
      return v.description ?? 'Symbol'
    case 'function': {
      // Function → 안전한 타입 정의
      const fn = v as (...args: unknown[]) => unknown
      return fn.name || 'anonymous'
    }
    case 'object': {
      try {
        const seen = new WeakSet<object>()
        const circularReplacer = (_k: string, value: unknown) => {
          if (typeof value === 'bigint') return String(value)
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]'
            seen.add(value)
          }
          return value
        }
        const json = JSON.stringify(v, circularReplacer)
        return json ?? '[Unserializable]'
      } catch {
        return '[Unserializable]'
      }
    }
    default:
      return ''
  }
}

// 쿼리 직렬화
const defaultParamsSerializer = (params: Record<string, unknown>) => {
  const usp = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v == null) return
    if (Array.isArray(v)) {
      v.forEach((item) => usp.append(k, serializeParamValue(item)))
    } else {
      usp.append(k, serializeParamValue(v))
    }
  })
  return usp.toString()
}

// 인스턴스 생성
const createClient = (): AxiosLike => {
  const instance = axios.create({
    baseURL: ENV.API_BASE_URL,
    timeout: ENV.API_TIMEOUT,
    withCredentials: ENV.API_WITH_CREDENTIALS,
    headers: AxiosHeaders.from({ 'Content-Type': 'application/json' }),
    paramsSerializer: { serialize: defaultParamsSerializer },
  })

  // 요청 인터셉터 (예: 토큰)
  instance.interceptors.request.use((config) => {
    // 헤더는 객체화
    config.headers = AxiosHeaders.from(config.headers)

    // 1) 토큰
    const token = (globalThis as Record<string, unknown>).__ACCESS_TOKEN__
    if (typeof token === 'string' && token) {
      ;(config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`)
    }

    // 2) Content-Type: "본문이 있을 때만" 설정
    const hasBody =
      typeof config.data !== 'undefined' &&
      config.method &&
      ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())
    if (hasBody && !(config.headers as AxiosHeaders).has('Content-Type')) {
      ;(config.headers as AxiosHeaders).set('Content-Type', 'application/json')
    } else if (!hasBody) {
      ;(config.headers as AxiosHeaders).delete('Content-Type')
    }

    return config
  })

  return instance
}

// 싱글톤 접근자
export const httpClient = (): AxiosLike => {
  clientRef ??= createClient()
  return clientRef
}

// 재생성용
export const resetHttpClient = () => {
  clientRef = null
}
