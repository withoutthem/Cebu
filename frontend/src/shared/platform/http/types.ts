import type { AxiosResponse } from 'axios'

// 표준 응답 타입
export interface HttpResponse<T> {
  data: T
  status: number
  statusText: string
  headers?: Record<string, string>
}

// 요청별 설정
export interface HttpConfig {
  params?: Record<string, unknown>
  headers?: Record<string, string>
  signal?: AbortSignal
  timeout?: number
  baseURL?: string
  withCredentials?: boolean
  paramsSerializer?: (params: Record<string, unknown>) => string
}

// 표준 오류
export class HttpError extends Error {
  public readonly status?: number
  public readonly code?: string
  public readonly details?: unknown

  constructor(
    message: string,
    opts?: { status?: number; code?: string; details?: unknown },
    errorOptions?: ErrorOptions
  ) {
    super(message, errorOptions)
    this.name = 'HttpError'
    if (opts?.status !== undefined) this.status = opts.status
    if (opts?.code !== undefined) this.code = opts.code
    if (opts && 'details' in opts) this.details = opts.details
  }
}

// Axios → 표준 응답 변환
export const toHttpResponse = <T>(res: AxiosResponse<T>): HttpResponse<T> => {
  const out: HttpResponse<T> = {
    data: res.data,
    status: res.status,
    statusText: res.statusText,
  }
  if (res.headers !== undefined) {
    out.headers = res.headers as unknown as Record<string, string>
  }
  return out
}
