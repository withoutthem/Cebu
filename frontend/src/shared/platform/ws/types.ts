// types.ts — 공용 타입

export type WsState = 'idle' | 'connecting' | 'open' | 'closing' | 'closed'

export type TokenProvider = () => string | undefined | Promise<string | undefined>

export type Parser = {
  encode: (data: unknown) => string | ArrayBufferLike | Blob
  decode: (data: string | ArrayBuffer | Blob) => unknown
}

export type BackoffPolicy = {
  minMs: number
  maxMs: number
  factor?: number
  jitter?: number
  maxRetries?: number
}

export type HeartbeatPolicy = {
  enabled?: boolean | undefined
  intervalMs?: number | undefined
  pingPayload?: unknown
  isPong?: ((data: unknown) => boolean) | undefined
  maxMiss?: number | undefined
}

export type SubscribePolicy = {
  buildSubscribeFrame?: (topic: string) => unknown
  buildUnsubscribeFrame?: (topic: string) => unknown
  autoResubscribe?: boolean
}

export type WsConfig = {
  url?: string
  baseURL?: string
  path?: string
  params?: Record<string, unknown>
  withTokenQuery?: boolean
  tokenProvider?: TokenProvider
  backoff?: BackoffPolicy
  heartbeat?: HeartbeatPolicy
  requestTimeoutMs?: number
  idKey?: string
  subscribe?: SubscribePolicy
  parser?: Parser
  protocols?: string[] // 선택: Sec-WebSocket-Protocol
  log?: (level: 'debug' | 'warn' | 'error', ...args: unknown[]) => void
}

export type WsEventMap = {
  open: []
  connecting: [attempt: number]
  close: [ev: CloseEvent]
  error: [ev: Event]
  message: [data: unknown, raw: MessageEvent]
  reconnecting: [attempt: number, delayMs: number]
  reconnected: [attempt: number]
  heartbeat: [missed: number]
}

export type WsEventName = keyof WsEventMap
export type WsListener<K extends WsEventName> = (...args: WsEventMap[K]) => void
