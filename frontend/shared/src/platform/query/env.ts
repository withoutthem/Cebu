// shared/src/platform/query/env.ts
// http 모듈의 env 로더 패턴을 그대로 씁니다.
interface RqEnv {
  RQ_STALE_TIME_MS: number;
  RQ_CACHE_TIME_MS: number;
  RQ_RETRY: number;
  RQ_REFETCH_ON_WINDOW_FOCUS: boolean;
}

const toBool = (v: unknown) => String(v).toLowerCase() === 'true';

export const loadRqEnv = (): RqEnv => {
  const g = (globalThis as any).__APP_CONF__ ?? {};
  const read = (k: string, fallback?: string) =>
    (import.meta as any).env?.[k] ?? g?.[k] ?? fallback;

  const stale = Number(read('VITE_RQ_STALE_TIME_MS', '30000'));
  const cache = Number(read('VITE_RQ_CACHE_TIME_MS', '300000'));
  const retry = Number(read('VITE_RQ_RETRY', '1'));
  const focus = toBool(read('VITE_RQ_REFETCH_ON_WINDOW_FOCUS', 'false'));

  return {
    RQ_STALE_TIME_MS: Number.isFinite(stale) ? stale : 30000,
    RQ_CACHE_TIME_MS: Number.isFinite(cache) ? cache : 300000,
    RQ_RETRY: Number.isFinite(retry) ? retry : 1,
    RQ_REFETCH_ON_WINDOW_FOCUS: focus,
  };
};
