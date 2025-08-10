// shared/src/platform/clients/types.ts

export interface HttpResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers?: Record<string, string>;
}

export interface HttpConfig {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export class HttpError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(message: string, opts?: { status?: number; code?: string; details?: unknown }) {
    super(message);
    this.name = 'HttpError';

    if (opts?.status !== undefined) this.status = opts.status;
    if (opts?.code !== undefined) this.code = opts.code;
    if (opts && 'details' in opts) this.details = opts.details;
  }
}

export const toHttpResponse = <T>(res: {
  data: T;
  status?: number;
  statusText?: string;
  headers?: unknown;
}): HttpResponse<T> => {
  if (typeof res.status !== 'number' || typeof res.statusText !== 'string') {
    throw new Error('Invalid response: missing status or statusText');
  }

  const out: HttpResponse<T> = {
    data: res.data,
    status: res.status,
    statusText: res.statusText,
  };

  if (res.headers !== undefined) {
    out.headers = res.headers as Record<string, string>;
  }

  return out;
};
