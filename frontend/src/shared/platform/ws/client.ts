// client.ts — 안정/성능 최우선 WebSocket 래퍼 (env.ts 설정 사용)
// - 지수백오프(+지터), 오프라인 감지, 하트비트(유휴 시만 ping), 대기큐(상한/드롭), RPC(id 매칭/Abort), 자동 재구독
// - 인증/정책 close code 대응(토큰 재발급 트리거), 선택적 subprotocols 지원
// - ESLint: no-unsafe-return/assignment 대응(unknown 내로잉), exactOptionalPropertyTypes 대응

import { getRuntimeAccessToken, WS_ENV } from './env'
import type {
  BackoffPolicy,
  HeartbeatPolicy,
  Parser,
  WsConfig,
  WsEventMap,
  WsEventName,
  WsListener,
  WsState,
} from './types'

/* ---------- 유틸 ---------- */

function nextBackoff(attempt: number, p: Required<Omit<BackoffPolicy, 'maxRetries'>>): number {
  const base = Math.min(p.maxMs, p.minMs * Math.pow(p.factor, attempt))
  const delta = base * p.jitter
  return Math.floor(base - delta + Math.random() * (2 * delta))
}
function toParam(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString()
  const t = typeof v
  if (t === 'string' || t === 'number' || t === 'boolean') return String(v)
  return JSON.stringify(v)
}
function buildWsUrl(input: {
  url?: string
  baseURL?: string
  path?: string
  params?: Record<string, unknown>
}): string {
  const origin = (globalThis as unknown as { location?: Location }).location?.origin
  const u = new URL(input.url ?? input.baseURL ?? WS_ENV.WS_BASE_URL, origin)

  if (input.path) {
    const left = u.pathname.endsWith('/') ? u.pathname.slice(0, -1) : u.pathname
    const right = input.path.startsWith('/') ? input.path : `/${input.path}`
    u.pathname = `${left}${right}`
  }

  // ⬇️ [수정] 오타 수정 ('https:) → ('https:') 및 가독성을 위한 중괄호 추가
  if (u.protocol === 'http:') {
    u.protocol = 'ws:'
  } else if (u.protocol === 'https:') {
    u.protocol = 'wss:'
  }

  if (input.params) {
    const usp = new URLSearchParams(u.search)
    for (const [k, v] of Object.entries(input.params)) {
      if (Array.isArray(v)) {
        v.forEach((x) => usp.append(k, toParam(x)))
      } else if (v != null) {
        usp.set(k, toParam(v))
      }
    }
    u.search = usp.toString()
  }
  return u.toString()
}
function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
function coerceMessageData(x: unknown): string | ArrayBuffer | Blob {
  if (typeof x === 'string') return x
  if (x instanceof ArrayBuffer) return x
  if (x instanceof Blob) return x
  try {
    return JSON.stringify(x)
  } catch {
    return String(x)
  }
}
function genId(): string {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto
  if (c?.getRandomValues) {
    const arr = new Uint32Array(2)
    c.getRandomValues(arr)
    const n0 = arr.at(0) ?? 0
    const n1 = arr.at(1) ?? 0
    return `${Date.now().toString(36)}-${n0.toString(36)}${n1.toString(36)}`
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
const DefaultParser: Parser = {
  encode: (d) =>
    typeof d === 'string' || d instanceof Blob || d instanceof ArrayBuffer ? d : JSON.stringify(d),
  decode: (d) => {
    if (typeof d === 'string') return safeParseJson(d)
    if (d instanceof ArrayBuffer) return safeParseJson(new TextDecoder().decode(d))
    return d
  },
}

/* ---------- 이벤트 맵(명시) ---------- */

type ListenerMap = {
  open: Set<WsListener<'open'>>
  connecting: Set<WsListener<'connecting'>>
  close: Set<WsListener<'close'>>
  error: Set<WsListener<'error'>>
  message: Set<WsListener<'message'>>
  reconnecting: Set<WsListener<'reconnecting'>>
  reconnected: Set<WsListener<'reconnected'>>
  heartbeat: Set<WsListener<'heartbeat'>>
}

/* ---------- 클라이언트 ---------- */

export class WsClient {
  private ws: WebSocket | null = null
  private state: WsState = 'idle'

  private readonly listeners: ListenerMap = {
    open: new Set(),
    connecting: new Set(),
    close: new Set(),
    error: new Set(),
    message: new Set(),
    reconnecting: new Set(),
    reconnected: new Set(),
    heartbeat: new Set(),
  }

  private readonly subs = new Map<string, Set<(data: unknown) => void>>()
  private readonly pending = new Map<
    string,
    {
      resolve: (v: unknown) => void
      reject: (e: unknown) => void
      timer: ReturnType<typeof setTimeout>
    }
  >()
  private readonly queue: (string | ArrayBufferLike | Blob)[] = []
  private readonly maxQueue = 5_000

  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  private hbTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatMiss = 0
  private readonly hbBaseInterval: number = WS_ENV.WS_HEARTBEAT_MS
  private hbIdleFactor = 1

  private lastActivity = Date.now()
  private online = typeof navigator !== 'undefined' ? navigator.onLine : true
  private shouldReconnect = true

  private readonly handleOnline = (): void => {
    this.online = true
    if (this.state !== 'open') void this.scheduleReconnect(0)
  }
  private readonly handleOffline = (): void => {
    this.online = false
    this.safeClose(4001, 'offline')
  }

  private readonly cfg: {
    withTokenQuery: boolean
    tokenProvider: () => string | undefined | Promise<string | undefined>
    backoff: Required<Omit<BackoffPolicy, 'maxRetries'>> & { maxRetries: number }
    heartbeat: Required<Pick<HeartbeatPolicy, 'enabled' | 'intervalMs'>> &
      Omit<HeartbeatPolicy, 'enabled' | 'intervalMs'>
    requestTimeoutMs: number
    idKey: string
    subscribe: {
      buildSubscribeFrame?: ((topic: string) => unknown) | undefined
      buildUnsubscribeFrame?: ((topic: string) => unknown) | undefined
      autoResubscribe: boolean
    }
    parser: Parser
    log: (level: 'debug' | 'warn' | 'error', ...args: unknown[]) => void
    params: Record<string, unknown>
    path: string
    baseURL: string
    url?: string | undefined
    protocols?: string[] | undefined
  }

  constructor(cfg: WsConfig = {}) {
    const backoff: BackoffPolicy = {
      minMs: cfg.backoff?.minMs ?? WS_ENV.WS_RETRY_MIN_MS,
      maxMs: cfg.backoff?.maxMs ?? WS_ENV.WS_RETRY_MAX_MS,
      factor: cfg.backoff?.factor ?? 2,
      jitter: cfg.backoff?.jitter ?? 0.2,
      maxRetries: cfg.backoff?.maxRetries ?? Number.POSITIVE_INFINITY,
    }
    const heartbeat: HeartbeatPolicy = {
      enabled: cfg.heartbeat?.enabled ?? true,
      intervalMs: cfg.heartbeat?.intervalMs ?? WS_ENV.WS_HEARTBEAT_MS,
      pingPayload: cfg.heartbeat?.pingPayload ?? { type: 'ping' },
      isPong: cfg.heartbeat?.isPong,
      maxMiss: cfg.heartbeat?.maxMiss ?? 1,
    }

    this.cfg = {
      withTokenQuery: cfg.withTokenQuery ?? WS_ENV.WS_WITH_TOKEN_QUERY,
      tokenProvider: cfg.tokenProvider ?? getRuntimeAccessToken,
      backoff: {
        minMs: backoff.minMs,
        maxMs: backoff.maxMs,
        factor: backoff.factor ?? 2,
        jitter: backoff.jitter ?? 0.2,
        maxRetries: backoff.maxRetries ?? Number.POSITIVE_INFINITY,
      },
      heartbeat: {
        enabled: heartbeat.enabled ?? true,
        intervalMs: heartbeat.intervalMs ?? WS_ENV.WS_HEARTBEAT_MS,
        pingPayload: heartbeat.pingPayload,
        isPong: heartbeat.isPong,
        maxMiss: heartbeat.maxMiss ?? 1,
      },
      requestTimeoutMs: cfg.requestTimeoutMs ?? WS_ENV.WS_REQUEST_TIMEOUT_MS,
      idKey: cfg.idKey ?? 'id',
      subscribe: {
        buildSubscribeFrame: cfg.subscribe?.buildSubscribeFrame,
        buildUnsubscribeFrame: cfg.subscribe?.buildUnsubscribeFrame,
        autoResubscribe: cfg.subscribe?.autoResubscribe ?? true,
      },
      parser: cfg.parser ?? DefaultParser,
      log: cfg.log ?? (() => {}),
      params: cfg.params ?? {},
      path: cfg.path ?? WS_ENV.WS_PATH,
      baseURL: cfg.baseURL ?? WS_ENV.WS_BASE_URL,
      url: cfg.url,
      protocols: cfg.protocols,
    }

    this.hbBaseInterval = this.cfg.heartbeat.intervalMs ?? WS_ENV.WS_HEARTBEAT_MS

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
      window.addEventListener('visibilitychange', () => {
        const d = (globalThis as unknown as { document?: Document }).document
        if (!d) return
        this.hbIdleFactor = d.hidden ? 2 : 1
        this.restartHeartbeat()
      })
    }
  }

  /* ---------- 이벤트 on/off ---------- */
  on<K extends WsEventName>(k: K, fn: WsListener<K>): () => void {
    ;(this.listeners[k] as Set<WsListener<K>>).add(fn)
    return () => this.off(k, fn)
  }
  off<K extends WsEventName>(k: K, fn: WsListener<K>): void {
    ;(this.listeners[k] as Set<WsListener<K>>).delete(fn)
  }
  private emit<K extends WsEventName>(k: K, ...args: WsEventMap[K]): void {
    const set = this.listeners[k] as Set<WsListener<K>>
    for (const fn of set) {
      try {
        fn(...args)
      } catch (e) {
        this.cfg.log('error', 'listener error', e)
      }
    }
  }

  /* ---------- 상태 ---------- */
  getState(): WsState {
    return this.state
  }

  /* ---------- 연결/해제 ---------- */
  async connect(): Promise<void> {
    if (this.state === 'open' || this.state === 'connecting') return
    this.shouldReconnect = true
    this.reconnectAttempt = 0
    await this.openOnce()
  }
  async disconnect(code = 1000, reason = 'manual-close'): Promise<void> {
    this.shouldReconnect = false
    this.clearHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.state = 'closing'
    try {
      this.ws?.close(code, reason)
    } catch {
      /* noop */
    }
    this.state = 'closed'
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer)
      p.reject(new Error('disconnected'))
      this.pending.delete(id)
    }
  }

  /* ---------- 전송 / RPC / 구독 ---------- */
  private enqueue(payload: string | ArrayBufferLike | Blob) {
    if (this.queue.length >= this.maxQueue) this.queue.shift()
    this.queue.push(payload)
  }

  send(data: unknown): boolean {
    const payload = this.cfg.parser.encode(data)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(payload)
        return true
      } catch (e) {
        this.cfg.log('error', 'send failed', e)
        this.enqueue(payload)
        return false
      }
    }
    this.enqueue(payload)
    return false
  }

  request<T = unknown>(
    data: Record<string, unknown>,
    timeoutMs?: number,
    signal?: AbortSignal
  ): Promise<T> {
    const idKey = this.cfg.idKey
    const id = genId()
    const body: Record<string, unknown> = { ...data, [idKey]: id }
    const to = timeoutMs ?? this.cfg.requestTimeoutMs
    const timer = setTimeout(() => {
      const p = this.pending.get(id)
      if (p) {
        p.reject(new Error('request timeout'))
        this.pending.delete(id)
      }
    }, to)

    const prom = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer })
      this.send(body)
    })

    if (signal) {
      const onAbort = () => {
        const p = this.pending.get(id)
        if (p) {
          clearTimeout(p.timer)
          p.reject(new DOMException('aborted', 'AbortError'))
          this.pending.delete(id)
        }
      }
      if (signal.aborted) onAbort()
      else signal.addEventListener('abort', onAbort, { once: true })
    }

    return prom
  }

  subscribe(topic: string, handler: (data: unknown) => void, sendFrame = false): () => void {
    let set = this.subs.get(topic)
    if (!set) {
      set = new Set<(data: unknown) => void>()
      this.subs.set(topic, set)
    }
    set.add(handler)
    if (sendFrame && this.cfg.subscribe.buildSubscribeFrame) {
      const frame = this.cfg.subscribe.buildSubscribeFrame(topic)
      if (frame !== undefined) this.send(frame)
    }
    return () => {
      const s = this.subs.get(topic)
      if (!s) return
      s.delete(handler)
      if (s.size === 0) {
        this.subs.delete(topic)
        if (sendFrame && this.cfg.subscribe.buildUnsubscribeFrame) {
          const frame = this.cfg.subscribe.buildUnsubscribeFrame(topic)
          if (frame !== undefined) this.send(frame)
        }
      }
    }
  }

  /* ---------- 내부: URL/하트비트/큐/재연결 ---------- */
  private async buildUrl(): Promise<string> {
    const params: Record<string, unknown> = { ...this.cfg.params }
    if (this.cfg.withTokenQuery) {
      try {
        const t = await this.cfg.tokenProvider()
        if (t) params['access_token'] = t
      } catch {
        /* noop */
      }
    }
    const arg: { url?: string; baseURL?: string; path?: string; params?: Record<string, unknown> } =
      {
        baseURL: this.cfg.baseURL,
        path: this.cfg.path,
        params,
      }
    if (this.cfg.url) arg.url = this.cfg.url
    return buildWsUrl(arg)
  }

  private startHeartbeat(): void {
    if (!this.cfg.heartbeat.enabled) return
    this.clearHeartbeat()
    const tick = () => {
      const idle = Date.now() - this.lastActivity
      const threshold = this.hbBaseInterval * this.hbIdleFactor
      if (idle >= threshold) {
        try {
          this.send(this.cfg.heartbeat.pingPayload ?? { type: 'ping' })
        } catch {
          /* noop */
        }
        this.heartbeatMiss++
        this.emit('heartbeat', this.heartbeatMiss)
        if ((this.cfg.heartbeat.maxMiss ?? 1) < this.heartbeatMiss) {
          this.cfg.log('warn', 'heartbeat missed; force reconnect')
          this.safeClose(4000, 'heartbeat-missed')
        }
      } else {
        this.heartbeatMiss = 0
      }
    }
    this.hbTimer = setInterval(tick, this.hbBaseInterval * this.hbIdleFactor)
  }
  private restartHeartbeat(): void {
    if (this.state !== 'open') return
    this.startHeartbeat()
  }
  private clearHeartbeat(): void {
    if (this.hbTimer) clearInterval(this.hbTimer)
    this.hbTimer = null
    this.heartbeatMiss = 0
  }

  private flushQueue(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    while (this.queue.length) {
      const m = this.queue.shift()
      if (!m) break
      try {
        this.ws.send(m)
      } catch (e) {
        this.cfg.log('error', 'flush failed', e)
        this.queue.unshift(m)
        break
      }
    }
  }

  private safeClose(code?: number, reason?: string): void {
    try {
      this.ws?.close(code, reason)
    } catch {
      /* noop */
    }
  }

  private async openOnce(): Promise<void> {
    if (!this.shouldReconnect) return
    if (!this.online) {
      this.cfg.log('warn', 'offline; waiting')
      return
    }
    this.state = 'connecting'
    this.emit('connecting', this.reconnectAttempt)
    const url = await this.buildUrl()

    await new Promise<void>((resolve) => {
      const ws = this.cfg.protocols ? new WebSocket(url, this.cfg.protocols) : new WebSocket(url)
      this.ws = ws

      ws.onopen = () => {
        this.state = 'open'
        this.lastActivity = Date.now()
        this.clearHeartbeat()
        this.startHeartbeat()
        this.flushQueue()
        const prev = this.reconnectAttempt
        this.reconnectAttempt = 0
        if (prev > 0) this.emit('reconnected', prev)
        this.emit('open')

        if (this.cfg.subscribe.autoResubscribe && this.subs.size > 0) {
          for (const topic of this.subs.keys()) {
            const f = this.cfg.subscribe.buildSubscribeFrame?.(topic)
            if (f !== undefined) this.send(f)
          }
        }
        resolve()
      }

      ws.onerror = (ev: Event) => {
        this.emit('error', ev)
      }

      ws.onclose = async (ev: CloseEvent) => {
        this.state = 'closed'
        this.clearHeartbeat()
        this.emit('close', ev)
        if (!this.shouldReconnect) return

        const authCodes = new Set([4401, 4403, 1008])
        if (authCodes.has(ev.code)) {
          try {
            await this.cfg.tokenProvider()
          } catch {
            /* noop */
          }
        }
        void this.scheduleReconnect(this.reconnectAttempt + 1)
      }

      ws.onmessage = (ev: MessageEvent) => {
        this.lastActivity = Date.now()
        const raw = coerceMessageData(ev.data as unknown)
        const decoded = this.cfg.parser.decode(raw)

        if (decoded && typeof decoded === 'object') {
          const obj = decoded as Record<string, unknown>
          const idVal = obj[this.cfg.idKey]
          if (typeof idVal === 'string') {
            const p = this.pending.get(idVal)
            if (p) {
              clearTimeout(p.timer)
              this.pending.delete(idVal)
              p.resolve(decoded)
              return
            }
          }
          const topicVal = obj['topic'] ?? obj['channel']
          if (typeof topicVal === 'string') {
            const set = this.subs.get(topicVal)
            if (set?.size) {
              for (const fn of set) fn(decoded)
              return
            }
          }
        }

        this.emit('message', decoded, ev)
      }
    })
  }

  private async scheduleReconnect(nextAttempt: number): Promise<void> {
    if (!this.shouldReconnect) return
    if (!this.online) return
    const { minMs, maxMs, factor, jitter, maxRetries } = this.cfg.backoff
    if (nextAttempt > maxRetries) {
      this.cfg.log('error', 'max retries reached; stop reconnect')
      return
    }
    this.reconnectAttempt = nextAttempt
    const delay = nextBackoff(nextAttempt, { minMs, maxMs, factor, jitter })
    this.emit('reconnecting', nextAttempt, delay)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      void this.openOnce()
    }, delay)
  }
}
