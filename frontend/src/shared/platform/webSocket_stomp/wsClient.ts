// // shared/src/platform/webSocket/wsClient.ts
// // noinspection ES6MissingAwait
//
// /**
//  * SockJS + STOMP 고신뢰 클라이언트 (최적화 + exactOptionalPropertyTypes 대응)
//  * - 전역 리스너 1회 설치, 자동 재구독, 오프라인 송신 큐, 조건부 스프레드로 undefined 차단
//  */
// import SockJS from 'sockjs-client'
// import { Client, type IMessage, type IPublishParams, type StompHeaders } from '@stomp/stompjs'
// import { loadWsEnv, resolveSockJsUrl } from './env'
// import type {
//   CreateWsClientOptions,
//   PublishHeaders,
//   SubscriptionHandle,
//   WsClient,
//   WsStatus,
// } from './types'
//
// /** ===== 전역 최적화: 리스너 1회 설치 + 클라이언트 레지스트리 ===== */
// const CLIENTS = new Set<InternalWsClient>()
// let LISTENERS_INSTALLED = false
//
// function installGlobalListeners() {
//   if (LISTENERS_INSTALLED || typeof window === 'undefined') return
//   LISTENERS_INSTALLED = true
//
//   window.addEventListener('offline', () => {
//     for (const c of CLIENTS) c.__onOffline()
//   })
//   window.addEventListener('online', () => {
//     for (const c of CLIENTS) c.__onOnline()
//   })
//   document.addEventListener('visibilitychange', () => {
//     if (document.visibilityState === 'visible') {
//       for (const c of CLIENTS) c.__onVisible()
//     }
//   })
// }
//
// /** 지터가 섞인 지수형 백오프 */
// function computeBackoff(attempt: number, minMs: number, maxMs: number): number {
//   const exp = Math.min(maxMs, Math.pow(2, attempt) * minMs)
//   const jitter = Math.floor(Math.random() * Math.min(1000, exp / 4))
//   return Math.min(maxMs, exp + jitter)
// }
//
// /** 안전 JSON 파싱 (실패 시 원문 문자열을 T로 캐스팅) */
// function safeParse<T>(s: string): T {
//   try {
//     return JSON.parse(s) as T
//   } catch {
//     return s as unknown as T
//   }
// }
//
// /** 문자열화 (객체면 JSON) */
// function toBody(body: unknown): string {
//   if (body == null) return ''
//   if (typeof body === 'string') return body
//   return JSON.stringify(body)
// }
//
// /** 디폴트 로거 */
// const defaultDebug = (enabled?: boolean | ((m: string) => void)) => (msg: string) => {
//   if (typeof enabled === 'function') enabled(msg)
//   else if (enabled) console.debug(`[WS] ${msg}`)
// }
//
// /** 내부 저장용: 재구독 스펙 (headers는 존재할 때만 키 포함) */
// type StoredSub<T = unknown> = {
//   destination: string
//   handler: (payload: T, raw: IMessage) => void
// } & ({} | { headers: StompHeaders })
//
// /** 송신 큐 최대 크기 (메모리 보호) */
// const MAX_QUEUE = 1000
//
// /** 실제 클라이언트 구현 */
// class InternalWsClient implements WsClient {
//   public status: WsStatus = 'idle'
//   public readonly stomp: Client
//   public readonly url: string
//
//   private readonly debug: (m: string) => void
//   private connectOnce: Promise<void> | null = null
//   private connectAttempt = 0
//   private stopped = false
//   private readonly timeoutMs: number
//   private readonly minMs: number
//   private readonly maxMs: number
//
//   /** 논리 구독 레지스트리(재연결 시 재구독/핸들 유지) */
//   private nextLogicalId = 0
//   private readonly subSpecs = new Map<string, StoredSub<any>>()
//   private readonly subUnsubs = new Map<string, () => void>()
//
//   /** 오프라인/연결중 송신 큐 */
//   private readonly sendQueue: IPublishParams[] = []
//
//   /** 상태 변경 콜백 (옵션) */
//   private readonly onStatusChange?: (status: WsStatus) => void
//
//   constructor(opts?: CreateWsClientOptions) {
//     const env = loadWsEnv()
//     this.url = opts?.url ?? resolveSockJsUrl(env)
//
//     this.minMs = opts?.reconnectMinMs ?? env.RECONNECT_MIN_MS
//     this.maxMs = opts?.reconnectMaxMs ?? env.RECONNECT_MAX_MS
//     this.timeoutMs = opts?.timeoutMs ?? env.TIMEOUT_MS
//     this.debug = defaultDebug(opts?.debug)
//
//     // 상태 변경 콜백 (옵션)
//     if (opts?.onStatusChange) {
//       this.onStatusChange = opts.onStatusChange
//     }
//
//     this.stomp = new Client({
//       webSocketFactory: () => new SockJS(this.url),
//       reconnectDelay: this.minMs,
//       heartbeatIncoming: opts?.heartbeatIncomingMs ?? env.HEARTBEAT_IN_MS,
//       heartbeatOutgoing: opts?.heartbeatOutgoingMs ?? env.HEARTBEAT_OUT_MS,
//       debug: (s: string) => this.debug(s),
//       onConnect: () => {
//         this.status = 'open'
//         this.onStatusChange?.('open') // 상태 변경 콜백 호출
//         this.connectAttempt = 0
//         this.debug('connected')
//
//         // (1) 재연결 시 기존 구독 복원
//         for (const [lid, spec] of this.subSpecs.entries()) {
//           const headers: StompHeaders = 'headers' in spec ? spec.headers : {}
//           const sub = this.stomp.subscribe(
//             spec.destination,
//             (msg: IMessage) => {
//               const hasBody = msg.body != null && msg.body !== ''
//               const payload = hasBody ? safeParse(msg.body) : (undefined as unknown)
//               ;(spec.handler as any)(payload, msg)
//             },
//             headers
//           )
//           this.subUnsubs.set(lid, () => sub.unsubscribe())
//         }
//
//         // (2) 큐 플러시 (undefined 불가)
//         if (this.sendQueue.length) {
//           const batch = this.sendQueue.splice(0, this.sendQueue.length)
//           for (const p of batch) this.stomp.publish(p)
//           this.debug(`flushed queued publishes: ${batch.length}`)
//         }
//       },
//       onStompError: (frame) => {
//         this.debug(`stomp error: ${frame.headers.message ?? ''}`)
//       },
//       onWebSocketClose: (evt) => {
//         this.status = 'closed'
//         this.onStatusChange?.('closed') // 상태 변경 콜백 호출
//         this.debug(`ws closed (code=${(evt as CloseEvent).code})`)
//         if (!this.stopped) {
//           this.connectAttempt += 1
//           const nextDelay = computeBackoff(this.connectAttempt, this.minMs, this.maxMs)
//           this.stomp.reconnectDelay = nextDelay
//           this.debug(`schedule reconnect in ~${nextDelay}ms`)
//         }
//       },
//       onWebSocketError: () => {
//         this.debug('ws error')
//       },
//       // exactOptionalPropertyTypes 대응: connectHeaders는 undefined 전달 금지
//       ...(opts?.connectHeaders ? { connectHeaders: opts.connectHeaders } : {}),
//     })
//
//     CLIENTS.add(this)
//     installGlobalListeners()
//   }
//
//   /** 연결 (중복 호출 시 동일 Promise 반환) */
//   public connect = async (): Promise<void> => {
//     if (this.stopped) this.stopped = false
//     if (this.status === 'open') return
//
//     if (!this.connectOnce) {
//       this.status = 'connecting'
//       this.onStatusChange?.('connecting') // 상태 변경 콜백 호출
//       this.connectOnce = new Promise<void>((resolve, reject) => {
//         let done = false
//
//         const timer = setTimeout(() => {
//           if (!done) {
//             done = true
//             this.debug(`connect timeout (${this.timeoutMs}ms)`)
//             reject(new Error('WS_CONNECT_TIMEOUT'))
//           }
//         }, this.timeoutMs)
//
//         const onConnect = () => {
//           if (done) return
//           clearTimeout(timer)
//           done = true
//           resolve()
//         }
//
//         const origOnConnect = this.stomp.onConnect
//         this.stomp.onConnect = (f) => {
//           origOnConnect?.(f)
//           onConnect()
//         }
//
//         this.stomp.activate()
//       }).finally(() => {
//         this.connectOnce = null
//       })
//     }
//     return this.connectOnce ?? Promise.resolve()
//   }
//
//   /** 종료 (재연결 멈춤, 전역 레지스트리 해제) */
//   public disconnect = async (): Promise<void> => {
//     this.stopped = true
//     this.status = 'closing'
//     this.onStatusChange?.('closing') // 상태 변경 콜백 호출
//     try {
//       await this.stomp.deactivate()
//     } finally {
//       this.status = 'closed'
//       this.onStatusChange?.('closed') // 상태 변경 콜백 호출
//       CLIENTS.delete(this)
//       this.debug('deactivated')
//     }
//   }
//
//   /** 구독 (논리 id 기반: 재연결 후에도 동일 id 유지) */
//   public subscribe = <T = unknown>(
//     destination: string,
//     onMessage: (payload: T, raw: IMessage) => void,
//     headers?: StompHeaders
//   ): SubscriptionHandle => {
//     if (this.status !== 'open') {
//       this.debug(
//         `subscribe called while status=${this.status}. It will still register; ensure connect() awaited.`
//       )
//     }
//
//     const logicalId = `s${++this.nextLogicalId}`
//
//     // exactOptionalPropertyTypes: headers가 undefined면 키 자체 생략
//     const spec: StoredSub<T> = headers
//       ? { destination, handler: onMessage as any, headers }
//       : { destination, handler: onMessage as any }
//     this.subSpecs.set(logicalId, spec)
//
//     const effectiveHeaders: StompHeaders = headers ?? {}
//     const sub = this.stomp.subscribe(
//       destination,
//       (msg: IMessage) => {
//         const hasBody = msg.body != null && msg.body !== ''
//         const payload = hasBody ? (safeParse<T>(msg.body)) : (undefined as unknown as T)
//         onMessage(payload, msg)
//       },
//       effectiveHeaders
//     )
//     this.subUnsubs.set(logicalId, () => sub.unsubscribe())
//
//     return {
//       id: logicalId,
//       unsubscribe: () => {
//         const unsub = this.subUnsubs.get(logicalId)
//         if (unsub) {
//           try {
//             unsub()
//           } finally {
//             this.subUnsubs.delete(logicalId)
//             this.subSpecs.delete(logicalId)
//           }
//         } else {
//           this.subSpecs.delete(logicalId)
//         }
//       },
//     }
//   }
//
//   /** 발행 (연결 전/오프라인 시 큐잉 → 연결 시 플러시) */
//   public publish = (destination: string, body?: unknown, headers?: PublishHeaders): void => {
//     const params: IPublishParams = headers
//       ? { destination, body: toBody(body), headers }
//       : { destination, body: toBody(body) }
//
//     if (this.status !== 'open') {
//       if (this.sendQueue.length >= MAX_QUEUE) this.sendQueue.shift() // drop-older
//       this.sendQueue.push(params)
//       this.debug(`queued publish (status=${this.status}, size=${this.sendQueue.length})`)
//       return
//     }
//     this.stomp.publish(params)
//   }
//
//   /** 요청-응답(특정 reply destination으로 서버가 응답해주는 패턴) */
//   public requestResponse = async <Req extends object, Res = unknown>(
//     requestDest: string,
//     replyDest: string,
//     reqBody: Req,
//     opts?: { timeoutMs?: number; headers?: PublishHeaders }
//   ): Promise<Res> => {
//     const timeoutMs = opts?.timeoutMs ?? this.timeoutMs
//
//     await this.connect()
//
//     return new Promise<Res>((resolve, reject) => {
//       let settled = false
//
//       const t = setTimeout(() => {
//         if (!settled) {
//           settled = true
//           handle.unsubscribe()
//           reject(new Error('WS_REQUEST_TIMEOUT'))
//         }
//       }, timeoutMs)
//
//       const handle = this.subscribe<Res>(replyDest, (payload) => {
//         if (!settled) {
//           settled = true
//           clearTimeout(t)
//           handle.unsubscribe()
//           resolve(payload)
//         }
//       })
//
//       this.publish(requestDest, reqBody, opts?.headers)
//     })
//   }
//
//   /** ===== 전역 리스너에서 호출되는 최적화 훅 ===== */
//   public __onOffline() {
//     this.debug('offline detected')
//     this.stomp.reconnectDelay = this.minMs
//     this.stomp.deactivate().catch(() => undefined)
//   }
//   public __onOnline() {
//     this.debug('online detected → maybe reconnect')
//     if (!this.stopped && this.status !== 'open') this.stomp.activate()
//   }
//   public __onVisible() {
//     this.debug('tab visible → ensure active')
//     if (!this.stopped && this.status !== 'open') this.stomp.activate()
//   }
// }
//
// /** 퍼블릭 팩토리 */
// export function createWsClient(opts?: CreateWsClientOptions): WsClient {
//   return new InternalWsClient(opts)
// }
