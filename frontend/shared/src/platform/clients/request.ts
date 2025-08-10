//shared/src/platform/clients/request.ts

import { httpClient } from './client';
import { HttpError, toHttpResponse, type HttpResponse, type HttpConfig } from './types';

type Method = 'get' | 'post' | 'put' | 'delete';

export const request = async <T>(
  method: Method,
  url: string,
  config?: HttpConfig & { data?: unknown },
): Promise<HttpResponse<T>> => {
  try {
    const c = httpClient();
    const res = await c.request<T>({ method, url, ...config });
    return toHttpResponse<T>(res);
  } catch (err: any) {
    const status = err?.response?.status as number | undefined;
    const code = err?.code as string | undefined;
    const details = err?.response?.data;

    const meta: { status?: number; code?: string; details?: unknown } = {};
    if (status !== undefined) meta.status = status;
    if (code !== undefined) meta.code = code;
    if (details !== undefined) meta.details = details;

    const message =
      details?.message ?? err?.message ?? `HTTP ${method.toUpperCase()} ${url} failed`;

    throw new HttpError(message, meta);
  }
};

export const GET = async <T>(url: string, config?: HttpConfig) => request<T>('get', url, config);

export const POST = async <T, B = unknown>(url: string, body?: B, config?: HttpConfig) =>
  request<T>('post', url, { data: body, ...(config ?? {}) });

export const PUT = async <T, B = unknown>(url: string, body?: B, config?: HttpConfig) =>
  request<T>('put', url, { data: body, ...(config ?? {}) });

export const DELETE = async <T = unknown>(url: string, config?: HttpConfig) =>
  request<T>('delete', url, config);
