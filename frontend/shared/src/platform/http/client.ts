import axios, { AxiosHeaders } from 'axios'; // axios 인스턴스와 헤더 유틸
import { ENV } from './env'; // 환경 설정

// axios.create가 반환하는 타입을 추출합니다.
type AxiosLike = ReturnType<typeof axios.create>; // 런타임 인스턴스 타입

// 싱글톤 인스턴스를 보관할 레퍼런스입니다.
let clientRef: AxiosLike | null = null; // 아직 생성되지 않았을 수 있으므로 null

// 값 직렬화 시 '[object Object]'가 나오지 않도록 안전하게 문자열로 변환합니다.
const serializeParamValue = (v: unknown): string => {
  // null/undefined는 빈 문자열
  if (v == null) return '';

  // 날짜 → ISO8601
  if (v instanceof Date) return v.toISOString();

  // 원시 타입 처리
  const t = typeof v;
  if (t === 'string') return v as string;
  if (t === 'number') return Number.isFinite(v as number) ? String(v) : '';
  if (t === 'bigint') return String(v);
  if (t === 'boolean') return (v as boolean) ? 'true' : 'false';
  if (t === 'symbol') return (v as symbol).description ?? 'Symbol';

  // 함수는 이름으로 식별(선호에 따라 고정 문자열 사용 가능)
  if (t === 'function') return (v as Function).name || 'anonymous';

  // 객체/배열 처리: JSON.stringify (순환 참조 안전)
  try {
    const seen = new WeakSet<object>();
    const circularReplacer = (_key: string, value: unknown) => {
      if (typeof value === 'bigint') return String(value); // JSON이 BigInt를 못 다룸
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value as object)) return '[Circular]';
        seen.add(value as object);
      }
      return value;
    };
    const json = JSON.stringify(v, circularReplacer);
    // stringify 결과가 undefined면 안전한 고정 문자열
    return json ?? '[Unserializable]';
  } catch {
    // JSON 직렬화 실패 시에도 객체를 String(v)로 보내지 않고 고정 문자열로 처리
    return '[Unserializable]';
  }
};

// URLSearchParams를 이용해 쿼리를 안전하게 직렬화합니다.
const defaultParamsSerializer = (params: Record<string, unknown>) => {
  const usp = new URLSearchParams(); // 표준 URLSearchParams 사용
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v == null) return; // null/undefined는 무시
    if (Array.isArray(v)) {
      // 배열이면 다중 append
      v.forEach((item) => usp.append(k, serializeParamValue(item)));
    } else {
      usp.append(k, serializeParamValue(v)); // 단일 값은 1회 append
    }
  });
  return usp.toString(); // 직렬화 결과 문자열 반환
};

// 실제 axios 인스턴스를 생성합니다.
const createClient = (): AxiosLike => {
  const instance = axios.create({
    baseURL: ENV.API_BASE_URL,
    timeout: ENV.API_TIMEOUT,
    withCredentials: ENV.API_WITH_CREDENTIALS,
    headers: { 'Content-Type': 'application/json' },
    paramsSerializer: { serialize: defaultParamsSerializer },
  });

  // 요청 인터셉터: 공통 헤더/토큰 등을 주입합니다.
  instance.interceptors.request.use((config) => {
    config.headers = AxiosHeaders.from(config.headers ?? {}); // 헤더 객체를 안전하게 래핑
    const token = (globalThis as any).__ACCESS_TOKEN__ as string | undefined; // 전역 토큰 주입(있을 때만)
    if (token) (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`); // Bearer 토큰
    return config; // 변경된 설정 반환
  });

  // 필요하다면 응답 인터셉터에서 공통 로깅/추적ID 등을 처리할 수 있습니다.
  return instance; // 준비된 인스턴스 반환
};

// 외부에서 사용할 싱글톤 클라이언트를 제공합니다(지연 생성).
export const httpClient = (): AxiosLike => {
  clientRef ??= createClient(); // 없으면 생성
  return clientRef; // 있으면 재사용
};

// 테스트/리로드를 위해 싱글톤을 초기화합니다.
export const resetHttpClient = () => {
  clientRef = null;
}; // 다음 호출 시 새로 생성
