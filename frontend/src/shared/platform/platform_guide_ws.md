# WebSocket 모듈 사용 설명서 (React + TypeScript, 싱글톤 서비스 버전)

이 문서는 전역 싱글톤 WebSocket 서비스(wsService)를 기준으로 React 애플리케이션에서 안정적이고 간단하게 WebSocket을 사용하는 방법을 설명합니다. 실제 화면에서 어떻게 쓰는지에 집중합니다.

---

## 1. 핵심 설계 요약

- 엔터프라이즈급 안정성
  - 지수 백오프(+지터), 오프라인 감지, 하트비트, 자동 재구독
  - 정책 close code(4401, 4403, 1008 등) 발생 시 토큰 회전 후 재연결
- 전역 싱글톤 서비스
  - 애플리케이션 최초 진입에서 한 번 연결 후 종료까지 유지
  - 모든 컴포넌트는 동일 인스턴스를 가져다 사용
- 최소 사용 표면
  - publish(topic, data)
  - publishAck(topic, data, timeoutMs)
  - subscribe(topic, handler) → off 함수 반환
  - 필요 시 ws.on(event, listener)로 상태 이벤트 구독
- 환경별 동작
  - .env.dev, .env.local 등으로 재시도, 하트비트, 경로 등을 제어

---

## 2. 언제 무엇을 쓰면 되는가

- 앱 전역에서 연결 유지하고 싶다
  - App.tsx에서 connectOnce 한 번 호출
- 특정 이벤트를 받아 화면에 뿌리고 싶다
  - 컴포넌트에서 subscribe 호출, cleanup에서 off 호출
- 메시지를 브로드캐스트하고 싶다
  - publish 호출
- 서버의 수신 확인이 꼭 필요하다
  - publishAck 호출로 응답(ACK) 확인
- 긴 작업을 취소하고 싶다
  - request(…, AbortSignal) 조합 사용
- 연결 상태를 UI에 보여주고 싶다
  - ws.on(open, close, reconnecting 등) 이벤트 리스너로 동기화

---

## 3. 환경 변수 예시

다음 값들은 빌드 시 import.meta.env에서 읽혀 싱글톤 서비스 내부 설정으로 사용됩니다.

### .env.dev 예시

```env
VITE_WS_BASE_URL=ws://localhost:3000
VITE_WS_PATH=/ws
VITE_WS_RETRY_MIN_MS=500
VITE_WS_RETRY_MAX_MS=10000
VITE_WS_HEARTBEAT_MS=5000
VITE_WS_REQUEST_TIMEOUT_MS=10000
```

### .env.local 예시

```env
VITE_WS_BASE_URL=wss://api.myapp.com
VITE_WS_PATH=/realtime
VITE_WS_RETRY_MIN_MS=1000
VITE_WS_RETRY_MAX_MS=30000
VITE_WS_HEARTBEAT_MS=15000
VITE_WS_REQUEST_TIMEOUT_MS=20000
```

---

## 4. React에서 직접 사용하는 방법

이 문서는 다음 네 가지를 가정합니다.

- wsService 모듈이 전역 싱글톤으로 제공된다
- wsService는 다음 헬퍼를 노출한다
  - connectOnce, publish, publishAck, subscribe
  - 필요 시 ws.on으로 이벤트 리스너 구독 가능
- 최초 연결은 App.tsx 같은 루트에서 한 번만 이뤄진다
- 각 화면 컴포넌트는 구독만 관리하고 연결은 끊지 않는다

### 4.1 App.tsx에서 최초 한 번 연결

루트 진입 시점에서 connectOnce를 호출하여 전역 연결을 수립합니다. 개발 모드 StrictMode로 인한 중복 호출을 wsService 내부에서 방지한다고 가정합니다.

```tsx
import { useEffect } from 'react'
import { connectOnce } from '@/shared/platform/ws/wsService'
import Router from './Router' // 예시

export default function App() {
  useEffect(() => {
    void connectOnce()
  }, [])

  return <Router />
}
```

연결 상태를 최상단에서 모니터링하고 싶다면 ws.on을 이용해 전역 토스트나 전역 배너를 띄울 수 있습니다.

```tsx
import { useEffect, useState } from 'react'
import { connectOnce, ws } from '@/shared/platform/ws/wsService'

export default function App() {
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    void connectOnce()

    const offOpen = ws.on('open', () => setStatus('open'))
    const offConn = ws.on('connecting', () => setStatus('connecting'))
    const offClose = ws.on('close', () => setStatus('closed'))
    const offRe = ws.on('reconnecting', (attempt: number) => setStatus(`reconnecting #${attempt}`))

    return () => {
      offOpen()
      offConn()
      offClose()
      offRe()
    }
  }, [])

  return (
    <div>
      <div aria-live="polite">WS: {status}</div>
      {/* 아래에 라우터나 레이아웃 */}
    </div>
  )
}
```

선택 사항으로, 창 닫힘 시 정리를 원한다면 beforeunload에서 disconnect를 호출할 수 있습니다. 일반적으로는 자동 재연결과 서버 측 세션 정리로 충분하므로 생략 가능하며, 로그아웃 시점에서 명시적으로 disconnect를 호출하는 것이 보편적입니다.

```tsx
useEffect(() => {
  const onUnload = () => {
    // 필요시: ws.disconnect(1000, 'unload').catch(() => {})
  }
  window.addEventListener('beforeunload', onUnload)
  return () => window.removeEventListener('beforeunload', onUnload)
}, [])
```

### 4.2 일반 화면 컴포넌트에서 이벤트 구독과 발행

구독은 반드시 cleanup에서 off를 호출하여 해제합니다. 싱글톤 연결은 끊지 않습니다.

```tsx
import { useEffect, useState } from 'react'
import { subscribe, publish } from '@/shared/platform/ws/wsService'

export default function ChatRoom() {
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    const off = subscribe('chat:general', (msg) => {
      setMessages((xs) => [...xs, msg])
    })
    return () => off()
  }, [])

  const send = () => {
    publish('chat:general', { text: 'Hello from ChatRoom' })
  }

  return (
    <div>
      <button onClick={send}>Send</button>
      <ul>
        {messages.map((m, i) => (
          <li key={i}>{JSON.stringify(m)}</li>
        ))}
      </ul>
    </div>
  )
}
```

### 4.3 서버 ACK이 필요한 요청 흐름

서버에서 처리 성공 여부와 식별자 등을 받아야 하는 경우 publishAck를 사용합니다. 내부적으로는 RPC 요청과 타임아웃 관리가 수행됩니다.

```tsx
import { useState } from 'react'
import { publishAck } from '@/shared/platform/ws/wsService'

export default function OrderButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    try {
      const ack = await publishAck('orders:new', { id: crypto.randomUUID() }, 8000)
      setResult(ack.ok ? `ok: ${ack.id ?? ''}` : `fail: ${ack.error ?? 'unknown'}`)
    } catch (e) {
      setResult('timeout or network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button disabled={loading} onClick={submit}>
        Create Order
      </button>
      {result && <p>{result}</p>}
    </div>
  )
}
```

### 4.4 긴 작업 취소가 필요한 경우

AbortController로 긴 요청을 취소할 수 있습니다. publishAck 대신 ws.request를 직접 호출하는 패턴입니다.

```tsx
import { useRef } from 'react'
import { ws } from '@/shared/platform/ws/wsService'

export default function HeavyTask() {
  const ctrl = useRef<AbortController | null>(null)

  const start = () => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    ws.request({ type: 'heavy-task' }, 15000, ctrl.current.signal).catch(() => {
      // 취소 또는 타임아웃
    })
  }

  const cancel = () => {
    ctrl.current?.abort()
  }

  return (
    <div>
      <button onClick={start}>Start long task</button>
      <button onClick={cancel}>Cancel</button>
    </div>
  )
}
```

### 4.5 매우 깊은 하위 컴포넌트에서 사용하는 경우

경로 어디에서든 wsService의 헬퍼를 import하여 동일하게 사용합니다. Context가 없어도 됩니다.

```tsx
import { useEffect } from 'react'
import { subscribe, publish } from '@/shared/platform/ws/wsService'

export function DeepChild() {
  useEffect(() => {
    const off = subscribe('chat:general', (m) => console.log('Deep msg', m))
    return () => off()
  }, [])

  return <button onClick={() => publish('chat:general', { text: 'Deep click' })}>Deep Send</button>
}
```

---

## 5. 공통 패턴과 안티패턴

- 패턴
  - 연결 수명은 전역에서 일원화, 화면에서는 구독만 관리
  - 구독은 useEffect에서 등록하고 cleanup에서 반환된 off를 호출
  - ACK이 필요한 요청에는 publishAck로 성공 여부를 확인
  - 긴 작업은 AbortController로 취소 가능
- 안티패턴
  - 화면 컴포넌트에서 disconnect를 남발
  - 구독 해제 없이 라우팅 이동
  - 동일 토픽에 동일 핸들러를 중복 등록
  - 상태관리 스토어에 WebSocket 인스턴스 자체를 넣기

---

## 6. 운영 트러블슈팅 표

| 증상 또는 코드 | 의미                        | 권장 조치                                           |
| -------------- | --------------------------- | --------------------------------------------------- |
| 1006           | 네트워크 오류(비정상 종료)  | 자동 재연결에 맡기고 사용자에게 안내 배너 표시 고려 |
| 1000           | 정상 종료                   | 의도된 종료인지 확인, 필요 시 connectOnce 재호출    |
| 1008           | 정책 위반                   | 서버 정책 확인, 권한 또는 요청 형식 점검            |
| 1015           | TLS 관련 문제               | 인증서, 프록시, 브라우저 버전 확인                  |
| 4401, 4403     | 인증 실패 또는 금지         | 토큰 회전, 재인증 후 connectOnce 다시 시도          |
| 4000, 4001     | 서버 강제 종료, 오프라인 등 | 네트워크 상태 점검, 재연결 대기 또는 백오프 증가    |
| 하트비트 누락  | 연결은 살아있으나 응답 없음 | 자동 재연결 트리거, 서버 상태 모니터링              |

추가 팁

- 로깅을 ws.on(error, close, reconnecting)에 연결해 운영 지표를 수집합니다.
- 대량 이벤트는 subscribe에서 배치 처리나 스로틀링을 고려합니다.
- 바이너리 프로토콜을 쓰면 네트워크 비용과 파싱 비용을 줄일 수 있습니다.

---

## 7. 외부에 노출되는 API 요약

- publish(topic, data)
  - 브로드캐스트 또는 단순 전송, 성공 여부는 전송 시점 기준
- publishAck(topic, data, timeoutMs)
  - 서버 응답 필수 시 사용, 성공 시 ok가 true
- subscribe(topic, handler)
  - 오프 함수 반환, cleanup에서 반드시 호출
- ws.on(event, listener)
  - 연결 상태 이벤트를 구독하여 UI 반영 가능
  - 주요 이벤트명 예시: open, connecting, close, reconnecting, reconnected, heartbeat, error
- ws.request(payload, timeoutMs, signal)
  - 커스텀 RPC가 필요할 때 직접 사용, AbortSignal로 취소 가능

---

## 8. 보안과 성능 팁

- 토큰 회전
  - 4401, 4403 수신 시 토큰 재발급 후 자동 재연결 흐름을 유지
- 최소 직렬화 비용
  - 빈번한 메시지는 압축 또는 바이너리 포맷 고려
- 구독 스코프 최소화
  - 컴포넌트가 필요로 하는 토픽만 구독
- 메모리 보호
  - 송신 큐 상한 설정이 이미 적용되어 있어 폭주를 방지

---

## 9. 최종 요약

- App.tsx에서 connectOnce 한 번으로 전역 연결 수립
- 각 화면 컴포넌트는 subscribe와 publish만 알면 된다
- 응답이 필요한 요청은 publishAck로 완료를 확인한다
- 구독 해제를 철저히 하고, 연결은 전역에서만 끊는다
- 환경 변수로 환경별 동작을 쉽게 튜닝할 수 있다
