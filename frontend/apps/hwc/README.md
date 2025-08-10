# HWC(HMM Workplace Chatbot) Frontend

# 📂 FE 디렉토리 구조 (DDD)

📂 src  
├── 📂 app # 전역 앱 설정 및 Provider 관리  
│ ├── 📂 providers # QueryClient, Theme, I18n, Router 등 전역 Provider  
│ ├── 📂 error-boundary# 전역 에러 경계 컴포넌트  
│ └── 📂 config # 환경변수 로딩 및 config 객체화  
│  
├── 📂 assets # 정적 리소스 (이미지, 폰트, 아이콘 등)  
│  
├── 📂 domains # 도메인 계층 (비즈니스 규칙, API, 모델, 타입)  
│ ├── 📂 auth # 인증 도메인  
│ ├── 📂 conversation # 대화방 도메인  
│ ├── 📂 message # 메시지 도메인  
│ ├── 📂 user # 사용자 도메인  
│ └── 📂 common # 도메인 공통 로직/타입/유틸  
│  
├── 📂 features # 사용자 액션 단위(UI + 얕은 상태/로직)  
│  
├── 📂 pages # 라우트 단위 화면 컨테이너  
│  
├── 📂 shared # 전역 공통 모듈 (UI, 유틸, 훅, 테마 등)  
│ ├── 📂 components # Button, Modal, Form 등  
│ ├── 📂 hooks # useDebounce, useIntersectionObserver 등  
│ ├── 📂 utils # 포맷터, 파서, 날짜 유틸 등  
│ ├── 📂 styles # 테마, 글로벌 스타일  
│ ├── 📂 layouts # 페이지 레이아웃  
│ └── 📂 i18n # 국제화 리소스  
│  
└── 📂 tests # 테스트 코드 전용 디렉토리

---

## 📌 역할 및 규칙

1. **app**
   - 앱 전역 설정과 Provider 관리
   - 환경변수 로딩 및 config 제공
   - 전역 에러 경계

2. **domains**
   - 비즈니스 로직, API, 타입, 모델 정의
   - common 폴더: 모든 도메인에서 재사용 가능한 타입/유틸
   - 규칙: features나 pages에서 domains 내부 파일 직접 import 금지 → index.ts를 통해서만 접근

3. **features**
   - 특정 사용자 액션 단위의 UI + 상태/로직
   - 도메인 훅/함수 사용, 직접 비즈니스 로직 구현 금지

4. **pages**
   - 라우트별 컨테이너 컴포넌트
   - features와 UI를 조립하고 데이터 로딩 시작점 역할

5. **shared**
   - 전역적으로 사용하는 UI, 훅, 유틸, 스타일, 레이아웃, i18n

---

## 🔄 의존성 방향

pages → features → domains → shared

- 상향 참조만 허용
- domains/common ↔ 다른 도메인 사용 가능
- shared는 어디서든 접근 가능

---

## ⚙️ 트리 셰이킹 & 모듈 규칙

- named export만 사용
- 배럴 파일(index.ts)은 명시적 re-export만
- 모듈 최상위 부작용(side effect) 금지
- 경로 Alias : @/shared
