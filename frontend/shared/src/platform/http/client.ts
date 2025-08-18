import axios, { AxiosHeaders } from 'axios';
import { ENV } from './env';

// axios.create 반환 타입
type AxiosLike = ReturnType<typeof axios.create>;

// 싱글톤 보관
let clientRef: AxiosLike | null = null;

// 값 직렬화
const serializeParamValue = (v: unknown): string => {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();

  const t = typeof v;
  if (t === 'string') return v as string;
  if (t === 'number') return Number.isFinite(v as number) ? String(v) : '';
  if (t === 'bigint') return String(v);
  if (t === 'boolean') return (v as boolean) ? 'true' : 'false';
  if (t === 'symbol') return (v as symbol).description ?? 'Symbol';
  if (t === 'function') return (v as Function).name || 'anonymous';

  try {
    const seen = new WeakSet<object>();
    const circularReplacer = (_k: string, value: unknown) => {
      if (typeof value === 'bigint') return String(value);
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value as object)) return '[Circular]';
        seen.add(value as object);
      }
      return value;
    };
    const json = JSON.stringify(v, circularReplacer);
    return json ?? '[Unserializable]';
  } catch {
    return '[Unserializable]';
  }
};

// 쿼리 직렬화
const defaultParamsSerializer = (params: Record<string, unknown>) => {
  const usp = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      v.forEach((item) => usp.append(k, serializeParamValue(item)));
    } else {
      usp.append(k, serializeParamValue(v));
    }
  });
  return usp.toString();
};

// 인스턴스 생성
const createClient = (): AxiosLike => {
  const instance = axios.create({
    baseURL: ENV.API_BASE_URL,
    timeout: ENV.API_TIMEOUT,
    withCredentials: ENV.API_WITH_CREDENTIALS,
    headers: AxiosHeaders.from({ 'Content-Type': 'application/json' }),
    paramsSerializer: { serialize: defaultParamsSerializer },
  });

  // 요청 인터셉터 (예: 토큰)
  instance.interceptors.request.use((config) => {
    config.headers = AxiosHeaders.from(config.headers);
    const token = (globalThis as any).__ACCESS_TOKEN__ as string | undefined;
    if (token) (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
    return config;
  });

  return instance;
};

// 싱글톤 접근자
export const httpClient = (): AxiosLike => {
  clientRef ??= createClient();
  return clientRef;
};

// 재생성용
export const resetHttpClient = () => {
  clientRef = null;
};
