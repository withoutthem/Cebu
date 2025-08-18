import type { AxiosRequestConfig, Method } from 'axios'; // 요청 설정 타입
import { httpClient } from './client'; // 싱글톤 axios 클라이언트
import { HttpError, toHttpResponse, type HttpResponse, type HttpConfig } from './types'; // 표준 타입/오류/변환

// 메시지를 안전하게 문자열로 변환합니다(객체는 JSON, 그 외 폴백).
function safeMessage(input: unknown, fallback: string): string {
  if (typeof input === 'string') return input; // 문자열 그대로
  if (input && typeof (input as any).message === 'string') return (input as any).message; // Error.message 지원
  try {
    if (typeof input === 'object') return JSON.stringify(input); // 객체는 JSON 직렬화
  } catch {} // 직렬화 실패는 무시
  return fallback; // 폴백 메시지
}

// 요청 설정을 분리하여 구성(복잡도 감소, exactOptionalPropertyTypes 대응).
function buildRequestConfig<T>(
  method: Method, // HTTP 메서드
  url: string, // 요청 URL
  config?: HttpConfig & { data?: unknown }, // 추가 설정 및 바디
): AxiosRequestConfig<T> {
  const req: AxiosRequestConfig<T> = { method, url }; // 최소 설정

  if (config?.params) req.params = config.params; // 쿼리 파라미터
  if (config?.headers) req.headers = config.headers; // 헤더
  if ('data' in (config ?? {})) req.data = config?.data as T; // 바디(정의된 경우만)
  if (config?.signal) req.signal = config.signal; // 취소 시그널
  if (typeof config?.timeout === 'number') req.timeout = config.timeout; // 요청별 타임아웃
  if (typeof config?.baseURL === 'string') req.baseURL = config.baseURL; // 요청별 베이스 URL
  if (typeof config?.withCredentials === 'boolean') req.withCredentials = config.withCredentials; // 쿠키 전송 여부
  if (config?.paramsSerializer) req.paramsSerializer = { serialize: config.paramsSerializer }; // 커스텀 직렬화

  return req; // 완성된 설정 반환
}

// 오류 객체를 표준 HttpError로 변환(메시지/메타/추적ID 포함).
function buildHttpError(
  method: Method, // 메서드(로그용)
  url: string, // URL(로그용)
  err: unknown, // 원본 오류
): HttpError {
  const anyErr = err as any; // 런타임 오류 객체
  const status = typeof anyErr?.response?.status === 'number' ? anyErr.response.status : undefined; // 상태 코드
  const code = typeof anyErr?.code === 'string' ? anyErr.code : undefined; // 네트워크 코드 등
  const details = anyErr?.response?.data as unknown; // 서버가 보낸 상세 바디
  const requestId =
    (anyErr?.response?.headers?.['x-request-id'] as string | undefined) ?? // 추적용 헤더 1
    (anyErr?.response?.headers?.['x-requestid'] as string | undefined); // 추적용 헤더 2(대안)

  let fallback = 'HTTP ' + method.toUpperCase() + ' ' + url + ' failed'; // 기본 폴백 메시지
  if (status !== undefined) fallback += ' (' + String(status) + ')'; // 상태 코드가 있으면 붙임

  const message = safeMessage(details, safeMessage(anyErr?.message, fallback)); // 사람이 읽을 메시지 선택

  // exactOptionalPropertyTypes 대응: 정의된 값만 주입합니다.
  const meta: { status?: number; code?: string; details?: unknown } = {}; // 메타 객체
  if (status !== undefined) meta.status = status; // 상태 코드를 담습니다.
  if (code !== undefined) meta.code = code; // 오류 코드를 담습니다.
  if (details !== undefined) meta.details = details; // 상세 바디를 담습니다.

  const e = new HttpError(message, meta, { cause: err }); // 표준 오류로 래핑
  (e as any).requestId = requestId; // 운영 추적을 위해 requestId 부가(선택)
  return e; // 완성된 오류 반환
}

export const request = async <T>(
  method: Method, // HTTP 메서드
  url: string, // URL
  config?: HttpConfig & { data?: unknown }, // 추가 설정
): Promise<HttpResponse<T>> => {
  const c = httpClient(); // 싱글톤 axios 클라이언트
  const req = buildRequestConfig<T>(method, url, config); // 요청 설정 구성

  try {
    const res = await c.request<T>(req); // 실제 HTTP 요청 수행
    return toHttpResponse<T>(res); // Axios → 표준 응답으로 변환
  } catch (err) {
    throw buildHttpError(method, url, err); // 표준 오류로 변환해 throw
  }
};

export const GET = <T>(url: string, config?: HttpConfig) => request<T>('get', url, config); // GET 요청

export const POST = <T, B = unknown>(url: string, body?: B, config?: HttpConfig) =>
  request<T>('post', url, { ...(config ?? {}), data: body }); // POST 요청(바디 포함)

export const PUT = <T, B = unknown>(url: string, body?: B, config?: HttpConfig) =>
  request<T>('put', url, { ...(config ?? {}), data: body }); // PUT 요청(바디 포함)

export const PATCH = <T, B = unknown>(url: string, body?: B, config?: HttpConfig) =>
  request<T>('patch', url, { ...(config ?? {}), data: body }); // PATCH 요청(바디 포함)

export const DELETE = <T = unknown>(url: string, config?: HttpConfig) =>
  request<T>('delete', url, config); // DELETE 요청
