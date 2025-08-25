// // shared/src/platform/webSocket/index.ts
// /**
//  * 퍼블릭 엔트리포인트
//  * - "한두 줄" 사용 예:
//  *    const client = createWsClient(); await client.connect();
//  *    const sub = client.subscribe('/topic/notice', (msg) => console.log(msg));
//  *
//  * 주의: 미사용 경고(Unused export specifier) 방지를 위해 별칭 export(ws) 제거.
//  */
// export { createWsClient } from './wsClient'
// export type {
//   WsClient,
//   WsStatus,
//   CreateWsClientOptions,
//   PublishHeaders,
//   SubscriptionHandle,
//   MessageHandler,
// } from './types'
// export { loadWsEnv, resolveSockJsUrl } from './env'
