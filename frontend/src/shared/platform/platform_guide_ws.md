# WebSocket 모듈 사용 설명서 (React + TypeScript, Provider + 전역 싱글톤)

본 문서는 **ApplicationProvider → WsProvider → useWs 훅** 조합과
**전역 싱글톤 wsService**(connectOnce/publish/publishAck/subscribe/ws)를 기준으로,
React 애플리케이션에서 **최소 코드**로 **안정적** WebSocket을 사용하는 방법을
처음 보는 분도 바로 적용할 수 있도록 **정제해** 설명합니다.

---

## 0) 전체 아키텍처 한눈에 보기

- **ApplicationProvider**
  ```text
  QueryProvider → WsProvider → ThemeProvider(theme) → App
  ```
- **WsProvider**
  ```text
  마운트 시 connectOnce() 1회 호출(중복 연결 방지) → 전역 싱글톤 wsService 노출
  ```
- **useWs()**
  ```text
  어디서든 { ws, publish, publishAck, subscribe } 사용 가능
  ```
- **wsService (전역 싱글톤)**
  ```text
  안정성 핵심(지수 백오프+지터, 오프라인 감지, 하트비트, 자동 재구독, 정책 close code 대응)
  ```

핵심 원칙

- **연결 수명은 루트에서 통제(WsProvider)**, 화면 컴포넌트는 **구독/발행만** 관리
- 환경은 .env로 제어, 현장별로 유연 오버라이드

---

## 1) 빠르게 시작하기 (가장 적은 코드)

### 1.1 루트에 Provider가 이미 구성되어 있다면 (권장 레이아웃)

```tsx
// ApplicationProvider.tsx (이미 구성된 예시)
<QueryProvider>
  <WsProvider>
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </WsProvider>
</QueryProvider>
```

### 1.2 화면 컴포넌트: 구독 + 발행

```tsx
import { useEffect, useState } from 'react'
import { useWs } from '@/app/providers/wsProvider'

export default function ChatRoom() {
  const { publish, subscribe } = useWs()
  const [msgs, setMsgs] = useState<any[]>([])

  useEffect(() => {
    const off = subscribe('chat:general', (m) => setMsgs((xs) => [...xs, m]))
    return () => off() // 반드시 해제
  }, [subscribe])

  return (
    <div>
      <button onClick={() => publish('chat:general', { text: 'Hello' })}>Send</button>
      <ul>
        {msgs.map((m, i) => (
          <li key={i}>{JSON.stringify(m)}</li>
        ))}
      </ul>
    </div>
  )
}
```

끝. 루트에서 **connectOnce() 자동 연결**이 수행되므로,
화면에서는 **구독/발행만** 신경 쓰면 됩니다.

---

## 2) API 표면(외부 노출) 정리

- **publish(topic, data)**
  ```text
  단순 브로드캐스트/전송. 반환값으로 서버 처리 결과 보장은 하지 않음.
  ```
- **publishAck(topic, data, timeoutMs?)**
  ```text
  서버 ACK(응답)가 반드시 필요한 경우. { ok, id?, error? } 반환.
  ```
- **subscribe(topic, handler) → () => void**
  ```text
  구독 시작, cleanup에서 반환된 off() 호출로 해제.
  ```
- **ws.on(event, listener) → () => void**
  ```text
  상태 이벤트 구독. open / connecting / close / reconnecting / reconnected / heartbeat / error
  ```
- **ws.request(payload, timeoutMs?, signal?)**
  ```text
  커스텀 RPC 호출. AbortSignal로 취소 가능.
  ```
- **connectOnce()**
  ```text
  중복 방지된 1회 연결(Provider 내부에서 자동 호출).
  ```

---

## 3) 실전 레시피

### 3.1 서버 ACK이 필요한 경우

```tsx
import { useWs } from '@/app/providers/wsProvider'

export default function OrderButton() {
  const { publishAck } = useWs()

  const createOrder = async () => {
    try {
      const ack = await publishAck('orders:new', { id: crypto.randomUUID() }, 8000)
      if (ack.ok) console.log('ok', ack.id)
      else console.error('fail', ack.error)
    } catch (e) {
      console.error('timeout or network error', e)
    }
  }

  return <button onClick={createOrder}>Create Order</button>
}
```

### 3.2 긴 작업 취소(Abort)

```tsx
import { useRef } from 'react'
import { useWs } from '@/app/providers/wsProvider'

export default function HeavyTask() {
  const { ws } = useWs()
  const ctrl = useRef<AbortController | null>(null)

  const start = () => {
    ctrl.current?.abort() // 기존 작업 취소
    ctrl.current = new AbortController()
    ws.request({ type: 'heavy-task' }, 15000, ctrl.current.signal).catch(() => {
      /* 취소/타임아웃 처리 */
    })
  }

  const cancel = () => ctrl.current?.abort()

  return (
    <div>
      <button onClick={start}>Start long task</button>
      <button onClick={cancel}>Cancel</button>
    </div>
  )
}
```

### 3.3 전역 상태 배너(연결 상태 감시)

```tsx
import { useEffect, useState } from 'react'
import { useWs } from '@/app/providers/wsProvider'

export function WsStatusBanner() {
  const { ws } = useWs()
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    const off1 = ws.on('open', () => setStatus('open'))
    const off2 = ws.on('close', () => setStatus('closed'))
    const off3 = ws.on('reconnecting', (a) => setStatus(`reconnecting #${a}`))
    return () => {
      off1()
      off2()
      off3()
    }
  }, [ws])

  return <div aria-live="polite">WS: {status}</div>
}
```

### 3.4 깊은 하위 컴포넌트에서도 동일하게

```tsx
import { useEffect } from 'react'
import { useWs } from '@/app/providers/wsProvider'

export function DeepChild() {
  const { publish, subscribe } = useWs()

  useEffect(() => {
    const off = subscribe('chat:general', (m) => console.log('Deep msg', m))
    return () => off()
  }, [subscribe])

  return <button onClick={() => publish('chat:general', { text: 'Deep click' })}>Deep Send</button>
}
```

### 3.5 React Query와의 연동(옵션)

메시지 수신 시 캐시 무효화/업데이트를 결합할 수 있습니다.

```tsx
import { useEffect } from 'react'
import { useWs } from '@/app/providers/wsProvider'
import { queryClient } from '@/shared/platform/query' // 예: 배럴에서 export

export function UsersRealtime() {
  const { subscribe } = useWs()

  useEffect(() => {
    const off = subscribe('users:changed', () => {
      // 특정 키 무효화 → 서버 최신 반영
      queryClient.invalidateQueries({ queryKey: ['users'] })
    })
    return () => off()
  }, [subscribe])

  return null
}
```

---

## 4) 환경 변수(.env) 예시

아래 값들은 빌드 시 import.meta.env에서 읽혀 서비스 내부 설정으로 사용됩니다.

### .env.dev

```env
VITE_WS_BASE_URL=ws://localhost:3000
VITE_WS_PATH=/ws
VITE_WS_RETRY_MIN_MS=500
VITE_WS_RETRY_MAX_MS=10000
VITE_WS_HEARTBEAT_MS=5000
VITE_WS_REQUEST_TIMEOUT_MS=10000
```

### .env.local

```env
VITE_WS_BASE_URL=wss://api.myapp.com
VITE_WS_PATH=/realtime
VITE_WS_RETRY_MIN_MS=1000
VITE_WS_RETRY_MAX_MS=30000
VITE_WS_HEARTBEAT_MS=15000
VITE_WS_REQUEST_TIMEOUT_MS=20000
```

전략

- **개발 환경**: 재시도 짧게, 하트비트 짧게(디버깅 용이)
- **운영 환경**: 재시도 여유 있게, 하트비트 길게(과도한 핑 방지)

---

## 5) 운영 트러블슈팅(실무 대응표)

| 증상/코드     | 의미                       | 권장 조치                                  |
| ------------- | -------------------------- | ------------------------------------------ |
| 1006          | 네트워크 비정상 종료       | 자동 재연결, 사용자 배너 고지              |
| 1000          | 정상 종료                  | 의도 여부 확인, 필요 시 connectOnce 재호출 |
| 1008          | 정책 위반                  | 서버 정책/권한/프레임 검증                 |
| 1015          | TLS 문제                   | 인증서/프록시/브라우저 점검                |
| 4401/4403     | 인증 실패/금지             | 토큰 회전 후 재연결(자동), 세션 확인       |
| 4000/4001     | 서버 강제 종료/오프라인 등 | 네트워크 점검, 백오프 확대                 |
| 하트비트 누락 | 연결 유지되나 응답 없음    | 자동 강제 재연결 트리거, 서버 상태 확인    |

팁

- ws.on(error/close/reconnecting) 로깅 → 운영 지표 수집
- 대량 이벤트 → subscribe 핸들러에서 **스로틀/배치 처리**
- 빈번/대용량 페이로드 → **바이너리/압축 포맷** 고려

---

## 6) 보안/성능 베스트 프랙티스

보안

- **토큰 회전**: 4401/4403 수신 시 자동 회전 후 재연결 플로우 유지
- **최소 권한 토픽 구독**: 화면별 필요한 토픽만 구독

성능

- **송신 큐 상한**: 이미 상한+드롭 보호 적용(폭주 방지)
- **가시성/유휴 최적화**: 비가시성 시 하트비트/핸들러 최소화
- **메모리 관리**: 반드시 off()로 구독 해제

---

## 7) 패턴 & 안티패턴

패턴

- 연결은 **루트에서 한 번만**, 화면은 **구독/발행만**
- cleanup에서 **off()** 반드시 호출
- ACK 필요 시 **publishAck**, 긴 작업은 **AbortController**

안티패턴

- 컴포넌트에서 connect/disconnect 반복
- 동일 토픽에 동일 핸들러 중복 등록
- 상태관리 스토어에 **WebSocket 인스턴스 자체**를 저장

---

## 8) 테스트/디버깅 팁

컴포넌트 단위 테스트

- Provider를 **목킹**하거나, useWs를 목킹해 핸들러 동작만 검증
- 실서버 연결을 요구하지 않도록 관심사 분리

로컬 디버깅

- .env.dev에서 하트비트/재시도 값을 **짧게**
- 이벤트 리스너(ws.on)로 상태 로그를 콘솔에 노출

---

## 9) FAQ

Q. Provider 없이 wsService만 import해서 써도 되나요?  
A. 가능합니다. 다만 Provider를 사용하면 **가독성/테스트 용이성**이 좋아지고, 루트에서 **연결 수명 일원화**가 됩니다.

Q. StrictMode로 두 번 마운트될 때 괜찮나요?  
A. 네. WsProvider 내부에서 **connectOnce**로 중복 연결을 방지합니다.

Q. 로그아웃 시점에서는?  
A. 필요 시 `ws.disconnect(1000, 'logout')` 호출 후 토큰 갱신→ `connectOnce()` 재호출 패턴을 권장합니다.

---

## 10) 최종 체크리스트

- 루트: **ApplicationProvider**가 **WsProvider**를 감싸고 있는가
- 화면: **subscribe** 등록 후 **cleanup에서 off() 호출**하는가
- ACK 필요 흐름: **publishAck** 사용했는가
- 긴 작업: **AbortController**로 취소 가능한가
- 운영: **이벤트 로깅**과 **트러블슈팅 표**를 팀 공유했는가

---

## 11) 결론

이 설계는 **전역 싱글톤 + Provider 패턴**으로,

- **엔터프라이즈급 안정성**(백오프/하트비트/재구독/정책 코드 대응)
- **개발자 경험 최상**(컴포넌트에서 최소 표면: publish/subscribe/publishAck)
- **유지보수/확장 용이성**(연결 수명 일원화, 코드 가독성 상승)

을 동시에 충족합니다. 실제 화면에서는 **useWs()** 한 줄로 시작하세요.
