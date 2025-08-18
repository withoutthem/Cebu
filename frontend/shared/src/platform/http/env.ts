// 런타임에서 주입 가능한 설정 값의 형태를 정의합니다.
type RuntimeAppConf = {
  API_BASE_URL?: string;
  API_TIMEOUT?: number | string;
  API_WITH_CREDENTIALS?: boolean | string;
};

// 빌드 타임(define) 주입 상수(존재하지 않을 수 있음)
declare const __API_BASE_URL__: string | undefined;
declare const __API_TIMEOUT__: string | undefined;
declare const __API_WITH_CREDENTIALS__: string | undefined;

// 글로벌 런타임 컨피그(선택)
const r = (globalThis as any).__APP_CONF__ as RuntimeAppConf | undefined;

// define 값 우선 읽기
const fromDefine = {
  baseURL: typeof __API_BASE_URL__ === 'string' ? __API_BASE_URL__ : undefined,
  timeout: typeof __API_TIMEOUT__ === 'string' ? Number(__API_TIMEOUT__) : undefined,
  withCredentials:
    typeof __API_WITH_CREDENTIALS__ === 'string' ? __API_WITH_CREDENTIALS__ === 'true' : undefined,
};

// 런타임 컨피그 보강
const fromRuntime = {
  baseURL: r?.API_BASE_URL,
  timeout: typeof r?.API_TIMEOUT === 'string' ? Number(r?.API_TIMEOUT) : r?.API_TIMEOUT,
  withCredentials:
    typeof r?.API_WITH_CREDENTIALS === 'string'
      ? r?.API_WITH_CREDENTIALS === 'true'
      : r?.API_WITH_CREDENTIALS,
};

// 최종 ENV (런타임 > define > 기본값)
export const ENV = {
  API_BASE_URL: fromRuntime.baseURL ?? fromDefine.baseURL ?? '/api',
  API_TIMEOUT: fromRuntime.timeout ?? fromDefine.timeout ?? 10000,
  API_WITH_CREDENTIALS: fromRuntime.withCredentials ?? fromDefine.withCredentials ?? false,
} as const;
