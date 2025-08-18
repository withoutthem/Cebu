// shared/src/platform/webSocket/env.ts
/**
 * 환경값 로더 (경량 캐싱 포함)
 * - Vite(.env.* 의 VITE_*) → 런타임 윈도우 글로벌(__APP_CONF__) → 기본값 순으로 병합
 * - URL 자동 계산: 상대 경로(/ws)라면 API_BASE_URL 기준으로 절대화
 */
import type { WsEnv } from './types';

type RuntimeAppConf = {
  VITE_API_BASE_URL?: string;
  VITE_WS_BASE_URL?: string;
  VITE_WS_STOMP_PATH?: string;
  VITE_API_TIMEOUT?: number | string;
  VITE_WS_HEARTBEAT_IN_MS?: number | string;
  VITE_WS_HEARTBEAT_OUT_MS?: number | string;
  VITE_WS_RECONNECT_MIN_MS?: number | string;
  VITE_WS_RECONNECT_MAX_MS?: number | string;
};

const R = (globalThis as any).__APP_CONF__ as RuntimeAppConf | undefined;

/** 문자열 → 숫자 안전 캐스팅 */
const toNumber = (v: string | number | undefined, fallback: number): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return fallback;
};

/** 안전한 문자열 트림 */
const toString = (v: unknown, fallback: string): string => {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : fallback;
};

let cachedEnv: WsEnv | null = null;

/** Vite + 런타임 전역 + 기본값 병합 (기본 캐시 사용) */
export function loadWsEnv(forceReload = false): WsEnv {
  if (!forceReload && cachedEnv) return cachedEnv;

  const V = (import.meta as any)?.env ?? {};

  const API_BASE_URL = toString(
    R?.VITE_API_BASE_URL ?? V.VITE_API_BASE_URL,
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  );

  const WS_BASE_PATH = toString(R?.VITE_WS_BASE_URL ?? V.VITE_WS_BASE_URL, '/ws');

  const WS_STOMP_PATH = toString(
    R?.VITE_WS_STOMP_PATH ?? V.VITE_WS_STOMP_PATH,
    '', // 비워두면 BASE_PATH만 사용
  );

  const TIMEOUT_MS = toNumber(R?.VITE_API_TIMEOUT ?? V.VITE_API_TIMEOUT, 10_000);

  const HEARTBEAT_IN_MS = toNumber(R?.VITE_WS_HEARTBEAT_IN_MS ?? V.VITE_WS_HEARTBEAT_IN_MS, 10_000);

  const HEARTBEAT_OUT_MS = toNumber(
    R?.VITE_WS_HEARTBEAT_OUT_MS ?? V.VITE_WS_HEARTBEAT_OUT_MS,
    10_000,
  );

  const RECONNECT_MIN_MS = toNumber(
    R?.VITE_WS_RECONNECT_MIN_MS ?? V.VITE_WS_RECONNECT_MIN_MS,
    1_000,
  );

  const RECONNECT_MAX_MS = toNumber(
    R?.VITE_WS_RECONNECT_MAX_MS ?? V.VITE_WS_RECONNECT_MAX_MS,
    30_000,
  );

  cachedEnv = Object.freeze({
    API_BASE_URL,
    WS_BASE_PATH,
    WS_STOMP_PATH,
    TIMEOUT_MS,
    HEARTBEAT_IN_MS,
    HEARTBEAT_OUT_MS,
    RECONNECT_MIN_MS,
    RECONNECT_MAX_MS,
  });

  return cachedEnv;
}

/** env 기반으로 SockJS 절대 URL 계산 */
export function resolveSockJsUrl(env = loadWsEnv()): string {
  // 상대 경로(/ws …)면 API_BASE_URL을 베이스로 절대화
  const base = env.WS_BASE_PATH.startsWith('http')
    ? env.WS_BASE_PATH
    : new URL(env.WS_BASE_PATH, env.API_BASE_URL).toString();

  return env.WS_STOMP_PATH
    ? `${base.replace(/\/+$/, '')}/${env.WS_STOMP_PATH.replace(/^\/+/, '')}`
    : base;
}
