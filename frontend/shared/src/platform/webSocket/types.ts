// shared/src/platform/webSocket/types.ts
/**
 * 웹소켓 타입 선언 모음
 * - 엔터프라이즈 환경에서 엄격한 타입 보장을 위해 모든 퍼블릭 API에 제네릭/명시 타입 제공
 */
import type { Client, IMessage, StompHeaders } from '@stomp/stompjs';

/** 연결 상태 */
export type WsStatus = 'idle' | 'connecting' | 'open' | 'closing' | 'closed';

/** .env 및 런타임에서 구성되는 기본 환경 값 */
export interface WsEnv {
  /** 예: https://api.example.com */
  API_BASE_URL: string;
  /** 예: /ws (상대 경로 가능) */
  WS_BASE_PATH: string;
  /** 예: 추가 경로가 있으면 붙이며, 없으면 빈 문자열. */
  WS_STOMP_PATH: string;
  /** 연결/응답 관련 타임아웃(ms) */
  TIMEOUT_MS: number;
  /** STOMP 하트비트 (서버→클라이언트) */
  HEARTBEAT_IN_MS: number;
  /** STOMP 하트비트 (클라이언트→서버) */
  HEARTBEAT_OUT_MS: number;
  /** 재연결 최소 지연(ms) */
  RECONNECT_MIN_MS: number;
  /** 재연결 최대 지연(ms) */
  RECONNECT_MAX_MS: number;
}

/** 클라이언트 생성 시점에서 오버라이드 가능한 옵션 */
export interface CreateWsClientOptions {
  /** 절대 URL 또는 상대 경로. 미지정 시 env 기반으로 자동 계산 */
  url?: string;
  /** STOMP connect 시 전송할 헤더 */
  connectHeaders?: StompHeaders;
  /** 디버그 로그 (true: 콘솔, 함수: 커스텀) */
  debug?: boolean | ((msg: string) => void);
  /** 하트비트 오버라이드 */
  heartbeatIncomingMs?: number;
  heartbeatOutgoingMs?: number;
  /** 재연결 딜레이 범위 오버라이드 */
  reconnectMinMs?: number;
  reconnectMaxMs?: number;
  /** 연결/응답 상한선 오버라이드 */
  timeoutMs?: number;
  /** Client 상태 변경 시 호출될 콜백 */
  onStatusChange?: (status: WsStatus) => void;
}

/** 구독 핸들 */
export interface SubscriptionHandle {
  /** 구독 취소 함수 (재연결로 바뀐 실제 STOMP 구독도 취소) */
  unsubscribe: () => void;
  /** 논리 구독 id (재연결 후에도 유지되는 안정적 id) */
  id: string;
}

/** 발행 시 헤더 */
export type PublishHeaders = StompHeaders & {};

/** 메시지 콜백: 바디를 T로 JSON 파싱하여 넘김 */
export type MessageHandler<T = unknown> = (payload: T, raw: IMessage) => void;

/** 모듈 퍼블릭 API */
export interface WsClient {
  readonly status: WsStatus;
  readonly stomp: Client;
  readonly url: string;

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  subscribe: <T = unknown>(
    destination: string,
    onMessage: MessageHandler<T>,
    headers?: StompHeaders,
  ) => SubscriptionHandle;

  publish: (destination: string, body?: unknown, headers?: PublishHeaders) => void;

  requestResponse: <Req extends object, Res = unknown>(
    requestDest: string,
    replyDest: string,
    reqBody: Req,
    opts?: { timeoutMs?: number; headers?: PublishHeaders },
  ) => Promise<Res>;
}
