// shared/src/platform/ws/wsService.ts
import { WsClient } from './client'

export const ws = new WsClient({
  subscribe: {
    buildSubscribeFrame: (t) => ({ type: 'subscribe', topic: t }),
    buildUnsubscribeFrame: (t) => ({ type: 'unsubscribe', topic: t }),
    autoResubscribe: true,
  },
})

// 헬퍼(퍼사드) 제공
export const publish = (topic: string, data: unknown) => ws.send({ type: 'publish', topic, data })

export const publishAck = <T = unknown>(topic: string, data: unknown, timeoutMs?: number) =>
  ws.request<T>({ type: 'publish', topic, data }, timeoutMs)

export const subscribe = (topic: string, handler: (msg: unknown) => void) =>
  ws.subscribe(topic, handler, true)

// 중복 connect 방지용
let connected = false
export const connectOnce = async () => {
  if (connected) return
  connected = true
  await ws.connect()
}
