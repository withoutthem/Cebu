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
