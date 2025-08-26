import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react'
import { connectOnce, publish, publishAck, subscribe, ws } from '@/shared/platform/ws/wsService'

// 컨텍스트에 필요한 퍼사드 최소 노출
type WsContextValue = {
  ws: typeof ws
  publish: typeof publish
  publishAck: typeof publishAck
  subscribe: typeof subscribe
}

// SSR 안전 기본값
const WsContext = createContext<WsContextValue | null>(null)

export function WsProvider({ children }: Readonly<{ children: ReactNode }>) {
  // 값은 싱글톤이므로 매 렌더마다 동일, 메모이징으로 레퍼런스 안정화
  const value = useMemo<WsContextValue>(() => ({ ws, publish, publishAck, subscribe }), [])

  useEffect(() => {
    // 앱 마운트에 맞춰 단 1회 연결
    void connectOnce()

    // 일반적으로 전역 연결은 끊지 않습니다.
    // 필요 시 beforeunload or 로그아웃 시점에서 명시적 disconnect 수행
  }, [])

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>
}

// 앱 어디서든 호출해 쓰는 훅
export function useWs() {
  const ctx = useContext(WsContext)
  if (!ctx) throw new Error('useWs must be used within <WsProvider>')
  return ctx
}
