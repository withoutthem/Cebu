# Query 모듈 전체 사용 설명서

- 공통 모듈(query/)은 shared에 존재 → 두 앱에서 동일하게 import
- keys.ts는 앱별로 분리 관리 (자동완성 지원)

## 1) 앱별 키 관리 예시

("src/shared/query/keys.ts")

```ts
export const queryKeys = {
  users: () => ['users'] as const,
  user: (id: string) => ['users', id] as const,
  items: (params: { page: number; size: number }) => ['items', params] as const,
}
```

---

## 2) 서비스 레이어 구성

("src/services/userService.ts")

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

("src/pages/UserList.tsx")

```typescript jsx
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
