// 런타임에서 주입 가능한 설정 값의 형태를 정의합니다.
type RuntimeAppConf = {
  API_BASE_URL?: string; // API 서버 베이스 URL
  API_TIMEOUT?: number | string; // 요청 타임아웃(ms), 문자열로 들어올 수 있어 number로 변환 필요
  API_WITH_CREDENTIALS?: boolean | string; // 쿠키 전송 여부, 문자열일 수 있음
};

// 빌드 타임(define)으로 주입될 수 있는 상수들을 선언합니다(존재하지 않을 수 있으므로 undefined 허용).
declare const __API_BASE_URL__: string | undefined; // Vite define 등으로 치환될 값
declare const __API_TIMEOUT__: string | undefined; // 문자열로 들어오므로 숫자 변환 필요
declare const __API_WITH_CREDENTIALS__: string | undefined; // 'true'/'false' 형태일 수 있음

// 글로벌 공간에 런타임 컨피그를 실어두는 경우를 대비해 안전하게 가져옵니다.
const r = (globalThis as any).__APP_CONF__ as RuntimeAppConf | undefined; // 존재하지 않을 수 있어 undefined

// 빌드 타임 값에서 읽을 수 있는 값을 1차 구성합니다.
const fromDefine = {
  baseURL: typeof __API_BASE_URL__ === 'string' ? __API_BASE_URL__ : undefined, // 문자열이면 사용
  timeout: typeof __API_TIMEOUT__ === 'string' ? Number(__API_TIMEOUT__) : undefined, // 숫자로 변환
  withCredentials:
    typeof __API_WITH_CREDENTIALS__ === 'string' ? __API_WITH_CREDENTIALS__ === 'true' : undefined, // 불리언으로 변환
};

// 런타임 컨피그에서 읽을 수 있는 값을 2차 구성합니다.
const fromRuntime = {
  baseURL: r?.API_BASE_URL, // 런타임 베이스 URL
  timeout: typeof r?.API_TIMEOUT === 'string' ? Number(r?.API_TIMEOUT) : r?.API_TIMEOUT, // 문자열이면 숫자 변환
  withCredentials:
    typeof r?.API_WITH_CREDENTIALS === 'string'
      ? r?.API_WITH_CREDENTIALS === 'true' // 문자열이면 불리언 변환
      : r?.API_WITH_CREDENTIALS, // 원래 불리언이면 그대로
};

// 최종 ENV: 런타임 > 빌드타임 > 기본값 순으로 폴백합니다.
export const ENV = {
  API_BASE_URL: fromRuntime.baseURL ?? fromDefine.baseURL ?? '/api', // 기본은 '/api'
  API_TIMEOUT: fromRuntime.timeout ?? fromDefine.timeout ?? 10000, // 기본 10초
  API_WITH_CREDENTIALS: fromRuntime.withCredentials ?? fromDefine.withCredentials ?? false, // 기본 false
} as const; // 읽기 전용으로 고정
