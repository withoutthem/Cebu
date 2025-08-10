# 🧭 Frontend Coding Convention

> ✅ 적용 대상: 이 컨벤션은 React + TypeScript + Vite 기반의 프로젝트에 적용 <br/>
> ✅ 목표: 유지보수성과 확장성을 고려한 구조화된 프론트엔드 개발을 지향

---

## 🔤 Naming Convention

### 📁 폴더명: camelCase로 정의

- 예: userProfile, projectTask
- 도메인, 기능 단위 폴더에 둠

### 📄 컴포넌트 파일 (.tsx): PascalCase로 정의

- 예: UserCard.tsx, LoginPage.tsx
- React 컴포넌트 파일에 둠

### 📄 일반 파일 (.ts): camelCase로 정의

- 예: useLogin.ts, userService.ts
- 훅, 유틸, 서비스, 상태관리 파일에 둠

### 🧩 컴포넌트 이름: PascalCase로 정의

- 예: UserCard, LoginForm
- 파일명(.tsx)과 컴포넌트명은 반드시 동일하게 유지

### 🔧 함수, 핸들러, 훅, 유틸: camelCase로 정의

- 예: fetchData(), onClickSubmit(), useModal()
- 이벤트, 로직 함수, 커스텀 훅에 둠

### 🧾 타입, 인터페이스, enum: PascalCase로 정의 (단, enum 내부는 UPPER_SNAKE_CASE)

- 예: UserDto, LoginState, UserInfo
- types/ 또는 도메인 별 types/ 폴더에 둠

### 📌 상수 (const): UPPER_SNAKE_CASE로 정의

- 예 : const DEFAULT_MODAL_DETAIL
- constants 폴더에 둠

### 🎨 className (CSS 클래스명) → snake_case로 정의

- 예: UserCard의 Wrapper : user_card, header_wrapper, task_item selected
- styled-components 사용 시 className 기준으로 둠

### 📦 Handlers : on{Event} 형식으로 정의

### 📦 Props : {ComponentName}Props 형식으로 정의

### 📦 State : {특정상태}State 형식으로 정의

### 📦 BooleanState : is{특정상태} 형식으로 정의

### 📦 Dto : {도메인명}{Dto} 형식으로 정의

### 📦 Service : {도메인명}{Service} 형식으로 정의

#### 예시 : const projectService = ProjectService();

### 📦 Store : {도메인명}{Store} 형식으로 정의

### 📦 Page : {도메인명}{Page} 형식으로 정의

---

## 💅 Design Convention (스타일링 규칙)

> ✅ 모든 스타일링은 유지보수, 재사용성, 확장성 중심으로 구성함 <br/>
> ✅ 디자인 통일성과 컨트롤 유연성을 위해 아래 원칙을 따름

### 🎨 규칙

- 기본 스타일링은 @mui/material + styled-components 조합으로 정의
- MUI 컴포넌트는 styled() 함수로 커스터마이징
- 모든 커스텀 스타일은 styled() 기반으로 작성함 (단, Attribute가 2개 이하인 경우 sx 사용)
- styled component 정의는 가능한 컴포넌트 파일 최하단에 둠
- 스타일이 복잡한 경우 Nesting을 적극적으로 활용
- &:hover, & > div, &.active 등 계층 구조 중심으로 작성
- editor, chart, grid 등 복합 컴포넌트는 StyleProvider 패턴으로 구성
- 스타일 속성 값은 theme 객체를 기준으로 작성함
- 동일한 스타일 구조가 3회 이상 반복되면 컴포넌트 또는 스타일 추출 대상으로 판단
- className은 snake_case로 정의 (예시: editor_wrapper, task_card_selected)
- 구조와 상태를 표현할 수 있도록 명확한 이름을 사용

### 💡 예시: styled MUI 컴포넌트

```typescript jsx
import { styled } from '@mui/material';
import Button from '@mui/material/Button';

const StyledButton = styled(Button)(({ theme }) => ({
  padding: '10px',
  backgroundColor: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));
```

---

## 🧾 Type Convention

### 📌 타입 선언 방식

- 타입 선언은 interface와 enum 중심으로 정의
- type 키워드는 지양하며, 유니언 또는 리터럴 용도로 제한적으로만 사용
- any와 unknown은 전면 금지
- null과 undefined는 자유롭게 사용, 다만 의미를 명확히 구분해서 사용

### 📁 타입 위치 분리 기준

- 전역에서 재사용되는 타입은 shared/types/에 둠
- 도메인 전용 타입은 domains/\*/types/ 폴더에 둠
- 컴포넌트 전용 Props 타입은 해당 컴포넌트 파일 최상단에 정의함
- Props 타입에는 interface 사용을 기본으로 함

### 📦 Dto 정의 규칙

- API 요청/응답 타입은 반드시 Dto 접미사를 붙여 interface로 정의
- 서버 명세(Swagger 등)를 기준으로 정확하게 작성
- 요청/응답을 명확하게 나눠 RequestDto, ResponseDto로 명명

```typescript
export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
}
```

### 🧱 enum 사용 규칙

- enum 이름은 PascalCase로 정의
- enum 내부 키는 UPPER_SNAKE_CASE, 값은 camelCase 으로 작성함

```typescript
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  SUPER_ADMIN = 'superAdmin',
}
```

### 🔁 공통 제네릭 타입

- 자주 쓰이는 타입은 제네릭으로 정의해 재사용
- 예: ApiResponse<T>, Nullable<T>, WithId<T>

```typescript
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type Nullable<T> = T | null;
export type WithId<T> = T & { id: number };
```

---

## 🧩 함수형 컴포넌트

- Props 인터페이스는 컴포넌트 상단에 선언합니다
- React.FC는 사용하지 않습니다
- 화살표함수로 작성합니다
- export default 를 사용합니다
- 이벤트 핸들러는 반드시 on으로 시작합니다 (onClick, onSubmit 등)
- 최상단 마크업(Wrapper)에 className 권장

```typescript jsx
// UserCard.tsx

import { useEffect } from 'react'

interface UserCardProps {
  name: string
  age: number
}

const UserCard = (props: UserCardProps) => {
  useEffect(() => {
  }, [])

  return (
    <div className={'user_card'}>
      {props.name} ({props.age})
    </div>
  )
}

export default UserCard;
```

---

## 🧪 테스트 작성 규칙

- 유틸함수 단위테스트의 경우 평행하게 둘 것
- 복잡한 컴포넌트테스트나 Mocking이 필요한 경우 Domain별로 **tests**/ 폴더에 둘 것
- 파일명은 <컴포넌트명>.test.tsx 형식 사용
- 테스트 도구는 Jest 사용

---

## 📌 커밋 메시지 컨벤션

### 🏷️ 형식

- <타입>/<도메인명>: 작업 내용

### 📝 예시

- Feature/user: 로그인 기능 구현
- Bugfix/task: 날짜 포맷 오류 수정
- Refactor/shared: fetch 유틸 분리

### 🧩 타입 종류

- 🚀 Feature: 새로운 기능
- 🐞 Bugfix: 버그 수정
- 🧹 Refactor: 리팩토링 (기능 변화 없음)
- 🔥 Hotfix: 긴급 수정
- 🎨 Publish: 퍼블리싱
- 🏗️ Infra: 인프라 관련 작업

---

# 📦 Merge Request(Pull Request) Template

## ✅ MR 체크리스트

- [ ] 자체 코드리뷰를 완료했습니까?
- [ ] 중요 비즈니스 로직에 대해 테스트 케이스를 최소 **1개 suite** 이상 작성했습니까?
- [ ] 기존 기능에 영향을 줄 수 있는 변경사항을 검토했습니까?
- [ ] 변경된 화면/UX가 있다면 캡처 또는 설명을 포함했습니까?
- [ ] Issue 또는 Task와 연결되어 있습니까? (`#BALI-123` 등)
- [ ] 정리정돈된 주석이 적절히 포함되어 있습니까?

---

## 📝 주요 변경사항

> 아래 항목 중 해당되는 내용을 간결히 작성해주세요.

- ✨ **기능 추가**: (예: 사용자 초대 기능 추가)
- 🐛 **버그 수정**: (예: 날짜 포맷 오류 수정)
- 🔧 **리팩토링**: (예: 폼 유효성 분리)
- ♻️ **UI 변경**: (예: 모달 스타일 개선)
- 🧪 **테스트 추가**: (예: useAuth 훅 유닛 테스트 추가)

---

## 🔍 상세 설명

> 변경 이유, 구조, 고려사항, 주의사항 등 자유롭게 작성

---

## 📷 관련 화면

> 스크린샷, 캡처, Figma 링크

---

## 🔗 관련 이슈

> Portal, WBS, GitLab Issue 등

- #JIRA-123 사용자 관리 기능 개선
