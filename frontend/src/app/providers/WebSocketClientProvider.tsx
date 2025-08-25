// // /src/providers/WebSocketClientProvider.tsx
//
// import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
// import { createWsClient, type WsClient, type WsStatus } from '@shared/platform/webSocket_stomp'
//
// interface WsContextType {
//   client: WsClient | null
//   status: WsStatus
// }
//
// const WsClientContext = createContext<WsContextType | null>(null)
//
// /**
//  * WebSocket 클라이언트 인스턴스와 연결 상태를 제공하는 React Provider입니다.
//  * 앱의 최상단에서 한 번만 사용해야 합니다.
//  */
// export const WebSocketClientProvider = ({ children }: { children: ReactNode }) => {
//   const [status, setStatus] = useState<WsStatus>('idle')
//   const [client, setClient] = useState<WsClient | null>(null)
//
//   useEffect(() => {
//     // ✅ createWsClient에 상태 변경 콜백(setStatus)을 주입합니다.
//     // 이렇게 하면 Provider는 client의 내부 동작을 알 필요가 없어집니다.
//     const wsClient = createWsClient({
//       url: import.meta.env.VITE_WEBSOCKET_URL, // 환경 변수에서 URL 주입
//       debug: import.meta.env.DEV,
//       onStatusChange: setStatus,
//     })
//
//     setClient(wsClient)
//
//     // 컴포넌트 마운트 시 자동으로 연결 시작
//     wsClient.connect().then()
//
//     // 컴포넌트 언마운트 시 연결 종료 (Clean-up)
//     return () => {
//       wsClient.disconnect().then()
//     }
//   }, []) // [] 의존성 배열로 마운트 시 한 번만 실행되도록 보장
//
//   // ✅ client와 status가 변경될 때만 value 객체를 재생성하여 성능 최적화
//   const value = useMemo(() => ({ client, status }), [client, status])
//
//   return <WsClientContext.Provider value={value}>{children}</WsClientContext.Provider>
// }
//
// /**
//  * WebSocket 클라이언트와 상태를 사용하기 위한 custom hook입니다.
//  */
// export const useWebSocket = (): WsContextType => {
//   const context = useContext(WsClientContext)
//   if (!context) {
//     throw new Error('useWebSocket must be used within a WebSocketClientProvider')
//   }
//   return context
// }
