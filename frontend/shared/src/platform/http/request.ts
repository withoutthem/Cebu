import type { AxiosRequestConfig, Method } from 'axios';
import { httpClient } from './client';
import { HttpError, toHttpResponse, type HttpResponse, type HttpConfig } from './types';

// 에러 메시지 안전 생성
function safeMessage(input: unknown, fallback: string): string {
  if (typeof input === 'string') return input;
  if (input && typeof (input as any).message === 'string') return (input as any).message;
  try {
    if (typeof input === 'object') return JSON.stringify(input);
  } catch {}
  return fallback;
}

// 요청 설정 빌드
function buildRequestConfig<T>(
  method: Method,
  url: string,
  config?: HttpConfig & { data?: unknown },
): AxiosRequestConfig<T> {
  const req: AxiosRequestConfig<T> = { method, url };
  if (config?.params) req.params = config.params;
  if (config?.headers) req.headers = config.headers;
  if ('data' in (config ?? {})) req.data = config?.data as T;
  if (config?.signal) req.signal = config.signal;
  if (typeof config?.timeout === 'number') req.timeout = config.timeout;
  if (typeof config?.baseURL === 'string') req.baseURL = config.baseURL;
  if (typeof config?.withCredentials === 'boolean') req.withCredentials = config.withCredentials;
  if (config?.paramsSerializer) req.paramsSerializer = { serialize: config.paramsSerializer };
  return req;
}

// HttpError 생성
function buildHttpError(method: Method, url: string, err: unknown): HttpError {
  const anyErr = err as any;
  const status = typeof anyErr?.response?.status === 'number' ? anyErr.response.status : undefined;
  const code = typeof anyErr?.code === 'string' ? anyErr.code : undefined;
  const details = anyErr?.response?.data as unknown;
  const requestId =
    (anyErr?.response?.headers?.['x-request-id'] as string | undefined) ??
    (anyErr?.response?.headers?.['x-requestid'] as string | undefined);

  let fallback = 'HTTP ' + String(method).toUpperCase() + ' ' + url + ' failed';
  if (status !== undefined) fallback += ' (' + String(status) + ')';

  const message = safeMessage(details, safeMessage(anyErr?.message, fallback));

  const meta: { status?: number; code?: string; details?: unknown } = {};
  if (status !== undefined) meta.status = status;
  if (code !== undefined) meta.code = code;
  if (details !== undefined) meta.details = details;

  const e = new HttpError(message, meta, { cause: err });
  (e as any).requestId = requestId;
  return e;
}

// 범용 요청
export const request = async <T>(
  method: Method,
  url: string,
  config?: HttpConfig & { data?: unknown },
): Promise<HttpResponse<T>> => {
  const c = httpClient();
  const req = buildRequestConfig<T>(method, url, config);
  try {
    const res = await c.request<T>(req);
    return toHttpResponse<T>(res);
  } catch (err) {
    throw buildHttpError(method, url, err);
  }
};

// 간편 메서드
export const GET = <T>(url: string, config?: HttpConfig) => request<T>('get', url, config);

export const POST = <T, B = unknown>(url: string, body?: B, config?: HttpConfig) =>
  request<T>('post', url, { ...(config ?? {}), data: body });

export const PUT = <T, B = unknown>(url: string, body?: B, config?: HttpConfig) =>
  request<T>('put', url, { ...(config ?? {}), data: body });

export const PATCH = <T, B = unknown>(url: string, body?: B, config?: HttpConfig) =>
  request<T>('patch', url, { ...(config ?? {}), data: body });

export const DELETE = <T = unknown>(url: string, config?: HttpConfig) =>
  request<T>('delete', url, config);
