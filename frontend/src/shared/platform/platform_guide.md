# HTTP 모듈 사용 설명서

이 문서는 `GET<T>()`, `POST<T>()`, `PUT<T>()`, `PATCH<T>()`, `DELETE<T>()` 유틸만으로 간단하게 쓰는 방법에 집중합니다.  
베이스 URL, 토큰 헤더 주입, 파라미터 직렬화는 모듈 내부에서 자동 처리됩니다.

---

## 1) 준비: 앱별 환경변수(.env)

각 앱에서 아래 값만 설정하면 됩니다. 코드 수정은 없습니다.

```
.env.dev (예시)
VITE_API_BASE_URL=https://api.hpc.example.com
VITE_API_TIMEOUT=10000
VITE_API_WITH_CREDENTIALS=false

```

---

## 2) 토큰 주입 방식

로그인 성공 시, 발급받은 Access Token을 전역(globalThis)에 넣어두면  
요청 인터셉터가 자동으로 Authorization 헤더(`Bearer ...`)를 추가합니다.

```ts
// 로그인 성공 시
globalThis.__ACCESS_TOKEN__ = loginResponse.token
```

- 앱 어디서든 한 번만 설정하면 이후 모든 요청에 자동으로 헤더가 붙습니다.
- 갱신(refresh) 시에도 동일하게 전역값만 업데이트하면 됩니다.

---

## 3) 빠른 시작

공통 모듈에서 유틸을 가져와 바로 호출합니다. 응답은 제네릭 타입으로 안전하게 받습니다.

```ts
import { GET, POST, PUT, PATCH, DELETE } from '@/platform/http'

// GET: 쿼리만 있는 단순 조회
const users = await GET<User[]>('/users')

// POST: 바디를 함께 전송
const created = await POST<User, { name: string; email: string }>('/users', {
  name: 'Victor',
  email: 'test@example.com',
})

// PUT
await PUT<void, { name: string }>('/users/123', { name: 'New Name' })

// PATCH
await PATCH<void, { nickname?: string }>('/users/123', { nickname: 'Vic' })

// DELETE
await DELETE<void>('/users/123')
```

---

## 4) 요청 옵션(HttpConfig) 사용

특정 요청에서만 파라미터, 헤더, 타임아웃 등을 바꾸고 싶을 때 씁니다.

```ts
// 쿼리 파라미터
await GET<Item[]>('/items', {
  params: { page: 1, size: 20, keyword: 'phone' },
})

// 헤더 추가
await GET<Item[]>('/items', {
  headers: { 'X-Trace-Id': 'abcd-1234' },
})

// 요청별 타임아웃
await POST<Result, Payload>('/heavy', payload, { timeout: 30000 })

// 요청별 베이스 URL(드물게 다른 도메인 호출 시)
await GET<Health>('/health', { baseURL: 'https://status.example.com' })
```

`HttpConfig` 필드 목록  
params, headers, signal, timeout, baseURL, withCredentials, paramsSerializer

---

## 5) 에러 처리

모듈은 실패 시 표준화된 HttpError를 던집니다. 메시지, 상태코드, 상세바디를 확인할 수 있습니다.

```ts
try {
  const me = await GET<User>('/me')
} catch (e) {
  const err = e as import('@/platform/http').HttpError
  console.error(err.message) // 사람이 읽을 메시지
  console.error(err.status) // 401, 404 등
  console.error(err.details) // 서버가 내려준 에러 바디(있다면)
}
```

---

## 6) 요청 취소(Abort)

React Query 등과 함께 쓸 때 유용합니다.

```ts
const ac = new AbortController()
const p = GET<Data>('/slow', { signal: ac.signal })

// 필요 시 취소
ac.abort()
```

---

## 7) 파일 업로드

FormData를 그대로 바디에 넣으면 됩니다. Content-Type은 브라우저가 자동 설정합니다.

```ts
const fd = new FormData()
fd.append('file', file)
fd.append('note', 'profile image')

const res = await POST<UploadResult, FormData>('/files', fd)
```

---

## 8) 앱이 여러 개인 경우(hpc, hwc)

각 앱은 자신의 `.env`만 다르게 설정하면 됩니다. 공통 모듈 코드는 그대로 공유합니다.

```
hpc  -> hpc/.env.* 에 VITE_API_BASE_URL 등 설정
hwc  -> hwc/.env.* 에 VITE_API_BASE_URL 등 설정
```

코드 사용은 두 앱에서 동일합니다.

```ts
const data = await GET<Something>('/path')
```

---

## 9) 참고: 캐시나 재시도는 라이브러리로

요청 자체는 최소 래핑으로 빠르게 동작합니다.  
요청 캐시, 중복 제거, 자동 재시도, 스켈레톤 등 UI 레벨 기능이 필요하면 React Query 같은 라이브러리와 조합하세요.

```ts
import { useQuery } from '@tanstack/react-query'
import { GET } from '@/platform/http'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => GET<User[]>('/users'),
    staleTime: 1000 * 30,
    retry: 1,
  })
}
```

---

# WebSocket 모듈 간단 사용법 (SockJS + STOMP)

> 목표: **한두 줄로 연결/구독/발행**, 환경값 자동, 재연결/자동 재구독/송신 큐 내장.

---

## 1) 환경변수(.env)

앱별 `.env.*`에 아래만 추가하면 됩니다.

```bash
# 공통
VITE_API_BASE_URL=https://api.example.com
VITE_API_TIMEOUT=10000

# WebSocket
VITE_WS_BASE_URL=/ws
VITE_WS_STOMP_PATH=
```

> 상대경로(`/ws`)면 `API_BASE_URL` 기준으로 절대 URL 자동 계산됩니다.

---

## 2) 빠른 시작 (2줄)

```ts
import { createWsClient } from '@/platform/webSocket'

const ws = createWsClient()
await ws.connect()
```

- 내부에서 **하트비트**, **지수백오프+지터 재연결**, **전역 online/offline/visibility 이벤트 대응**이 자동 동작합니다.

---

## 3) 구독 & 발행

```ts
// 구독 (JSON 자동 파싱)
const sub = ws.subscribe<MyMsg>('/topic/notice', (msg) => {
  console.log('notice:', msg)
})

// 발행 (객체면 JSON으로 직렬화)
ws.publish('/app/echo', { hello: 'world' })

// 구독 해제
sub.unsubscribe()
```

> 재연결되면 구독은 **자동 복원**됩니다(논리 ID 유지).

---

## 4) 요청-응답 패턴 (reply destination 사용)

```ts
type Req = { ping: true }
type Res = { pong: true }

const res = await ws.requestResponse<Req, Res>(
  '/app/ping', // 요청 보내는 곳
  '/user/queue/pong', // 서버가 응답 주는 곳
  { ping: true },
  { timeoutMs: 5000 } // 선택
)
// res => { pong: true }
```

---

## 5) 옵션 (특수 사용처 커스터마이징)

```ts
import { createWsClient } from '@/platform/webSocket'

const ws = createWsClient({
  url: 'https://gw.example.com/ws/stomp', // 기본 env 계산 대신 직접 지정
  connectHeaders: { Authorization: `Bearer ${token}` }, // 인증 헤더
  heartbeatIncomingMs: 5000,
  heartbeatOutgoingMs: 5000,
  reconnectMinMs: 1000,
  reconnectMaxMs: 60000,
  timeoutMs: 12000,
  debug: true, // 또는 (m) => myLogger.info(m)
})
await ws.connect()
```

---

## 6) 토큰/인증 헤더 주입

- **권장**: `createWsClient({ connectHeaders: { Authorization: 'Bearer ...' } })`
- 토큰이 바뀌면 **새 클라이언트**를 만들거나, 연결 해제 후 다시 생성/연결하시면 안전합니다.

---

## 7) 종료/정리

```ts
// 페이지 전환/언마운트 시
await ws.disconnect()
```

---

## 8) 특징 요약

- **자동 재연결 & 자동 재구독**
- **오프라인/연결중 송신 큐** (최대 1000건, 연결 후 일괄 전송)
- **하트비트 기본값** 및 커스터마이징
- **exactOptionalPropertyTypes** 호환 (타입스크립트 에러 방지)

---

## 9) 자주 묻는 질문(FAQ)

**Q. 서버가 텍스트만 보내요. JSON 파싱 에러 나나요?**  
A. 내부 파서는 실패 시 원문 문자열을 그대로 전달하므로 안전합니다. 필요 시 핸들러에서 타입 가드로 분기하세요.

**Q. 초기 로딩 중 publish 하면 유실되나요?**  
A. 아닙니다. 연결될 때까지 **큐잉** 후 자동 전송됩니다.

**Q. 구독은 언제 복원되나요?**  
A. STOMP 연결이 다시 `open` 상태가 되면 등록된 구독을 **즉시 복원**합니다.

---

# Query 모듈 전체 사용 설명서

- 공통 모듈(query/)은 shared에 존재 → 두 앱에서 동일하게 import
- keys.ts는 앱별로 분리 관리 (자동완성 지원)

## 1) 앱별 키 관리 예시

("apps/hpc/src/shared/query/keys.ts")

```ts
export const queryKeys = {
  users: () => ['users'] as const,
  user: (id: string) => ['users', id] as const,
  items: (params: { page: number; size: number }) => ['items', params] as const,
}
```

---

## 2) 서비스 레이어 구성

("apps/hpc/src/services/userService.ts")

```ts
import { GET } from '@/shared/platform/http'

export const userService = {
  getUsers: () => GET<User[]>('/users'),
  getUser: (id: string) => GET<User>(`/users/${id}`),
}
```

- 서비스 레이어는 API만 관리.
- React Query 호출 로직은 core.ts를 통해 감쌈.

---

## 3) 컴포넌트에서 사용하는 방식

("apps/hpc/src/pages/UserList.tsx")

```tsx
import { useAppQuery } from '@/shared/platform/query'
import { queryKeys } from '@/shared/query/keys'
import { userService } from '@/services/userService'

export function UserList() {
  const { data, isLoading } = useAppQuery({
    key: queryKeys.users(),
    fn: userService.getUsers,
  })

  if (isLoading) return <p>Loading...</p>
  return (
    <ul>
      {data?.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  )
}
```

- **최소한의 코드**: key + fn만 주면 된다.
- staleTime 등은 기본 env에서 가져옴.
- 필요시 인자로 override 가능.

---

## 4) 헬퍼 함수 사용법

("apps/hpc/src/main.tsx")

```ts
import { prefetch, invalidate } from '@/shared/platform/query'
import { queryKeys } from '@/shared/query/keys'
import { userService } from '@/services/userService'

await prefetch({
  key: queryKeys.users(),
  fn: userService.getUsers,
})

await invalidate(queryKeys.users())
```

- **prefetch**: 서버사이드나 라우팅 직전 데이터 미리 불러오기
- **invalidate**: 특정 key 데이터 강제 갱신

---

## 5) env 설정 활용

**파일:** "shared/src/platform/query/env.ts"

```ts
export const queryEnv = {
  defaultStaleTime: 1000 * 60 * 5, // 기본 staleTime: 5분
  defaultRetry: 2, // 기본 재시도 횟수: 2회
}
```

이 설정은 "core.ts" 내부에서 `QueryClient` 생성 시 자동으로 적용됩니다.  
따라서 각 컴포넌트에서 별도의 `staleTime`, `retry`를 지정하지 않아도 전역 기본값이 들어갑니다.

---

### .env.dev 예시

개발 환경에서 캐시를 짧게 두고, 재시도를 많이 해서 디버깅에 유리하게 합니다.

```env
VITE_RQ_STALE_TIME_MS=10000
VITE_RQ_CACHE_TIME_MS=60000
VITE_RQ_RETRY=3
VITE_RQ_REFETCH_ON_WINDOW_FOCUS=true
```

---

### .env.local 예시

로컬 환경에서 불필요한 네트워크 호출을 줄이고, 재시도 횟수도 최소화합니다.

```env
VITE_RQ_STALE_TIME_MS=30000
VITE_RQ_CACHE_TIME_MS=300000
VITE_RQ_RETRY=0
VITE_RQ_REFETCH_ON_WINDOW_FOCUS=false
```

---

### core.ts 내부 적용 예시

```ts
import { QueryClient } from '@tanstack/react-query'
import { loadRqEnv } from './env'

const env = loadRqEnv()

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: env.RQ_STALE_TIME_MS ?? queryEnv.defaultStaleTime,
      cacheTime: env.RQ_CACHE_TIME_MS,
      retry: env.RQ_RETRY ?? queryEnv.defaultRetry,
      refetchOnWindowFocus: env.RQ_REFETCH_ON_WINDOW_FOCUS,
    },
  },
})
```

---

✅ 정리

- `.env` → `import.meta.env`에서 읽음
- `env.ts` → 안전하게 파싱 (fallback 포함)
- `core.ts` → `QueryClient`에 자동 적용
- 개발자는 각 앱별 `.env.*`만 잘 세팅하면 공통 모듈을 그대로 재사용 가능
