// shared/src/platform/clients/env.ts

type RuntimeAppConf = {
  API_BASE_URL?: string;
  API_TIMEOUT?: number | string;
  API_WITH_CREDENTIALS?: boolean | string;
};

declare const __API_BASE_URL__: string | undefined;
declare const __API_TIMEOUT__: string | undefined;
declare const __API_WITH_CREDENTIALS__: string | undefined;

const r = (globalThis as any).__APP_CONF__ as RuntimeAppConf | undefined;

const fromDefine = {
  baseURL: typeof __API_BASE_URL__ === 'string' ? __API_BASE_URL__ : undefined,
  timeout: typeof __API_TIMEOUT__ === 'string' ? Number(__API_TIMEOUT__) : undefined,
  withCredentials:
    typeof __API_WITH_CREDENTIALS__ === 'string' ? __API_WITH_CREDENTIALS__ === 'true' : undefined,
};

const fromRuntime = {
  baseURL: r?.API_BASE_URL,
  timeout: typeof r?.API_TIMEOUT === 'string' ? Number(r?.API_TIMEOUT) : r?.API_TIMEOUT,
  withCredentials:
    typeof r?.API_WITH_CREDENTIALS === 'string'
      ? r?.API_WITH_CREDENTIALS === 'true'
      : r?.API_WITH_CREDENTIALS,
};

export const ENV = {
  API_BASE_URL: fromRuntime.baseURL ?? fromDefine.baseURL ?? '/api',
  API_TIMEOUT: fromRuntime.timeout ?? fromDefine.timeout ?? 10000,
  API_WITH_CREDENTIALS: fromRuntime.withCredentials ?? fromDefine.withCredentials ?? false,
} as const;
