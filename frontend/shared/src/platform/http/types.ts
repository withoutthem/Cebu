import type { AxiosResponse } from 'axios'; // Axios 응답 타입만 가져옵니다(트리셰이킹 도움).

// HTTP 응답을 우리 앱 표준 형태로 감싸는 타입입니다.
export interface HttpResponse<T> {
  data: T; // 응답 본문
  status: number; // HTTP 상태 코드
  statusText: string; // HTTP 상태 텍스트
  headers?: Record<string, string>; // 헤더(필요 시)
}

// HTTP 요청 시 추가로 넘길 수 있는 설정 값들입니다(요청 단위 오버라이드).
export interface HttpConfig {
  params?: Record<string, unknown>; // 쿼리 스트링 파라미터
  headers?: Record<string, string>; // 추가 헤더
  signal?: AbortSignal; // 취소 시그널(React Query 연동)
  timeout?: number; // 요청별 타임아웃
  baseURL?: string; // 요청별 베이스 URL
  withCredentials?: boolean; // 요청별 쿠키 전송 여부
  paramsSerializer?: (params: Record<string, unknown>) => string; // 사용자 정의 직렬화기
}

// 애플리케이션 공통 오류 객체입니다(표준화된 형태로 래핑).
export class HttpError extends Error {
  public readonly status?: number; // HTTP 상태 코드(없을 수 있음)
  public readonly code?: string; // 라이브러리/네트워크 오류 코드(예: ECONNABORTED)
  public readonly details?: unknown; // 서버가 보낸 자세한 오류 바디

  constructor(
    message: string, // 사용자/로그용 메시지
    opts?: { status?: number; code?: string; details?: unknown }, // 메타데이터(옵셔널)
    errorOptions?: ErrorOptions, // cause 등 추가 옵션
  ) {
    super(message, errorOptions); // Error 기본 생성자 호출
    this.name = 'HttpError'; // 오류 이름 고정

    if (opts?.status !== undefined) this.status = opts.status; // 정의된 값만 할당
    if (opts?.code !== undefined) this.code = opts.code; // 정의된 값만 할당
    if (opts && 'details' in opts) this.details = opts.details; // 존재하면 할당
  }
}

// AxiosResponse<T>를 우리 HttpResponse<T>로 변환합니다.
export const toHttpResponse = <T>(res: AxiosResponse<T>): HttpResponse<T> => {
  const out: HttpResponse<T> = {
    data: res.data, // 본문 그대로 전달
    status: res.status, // 상태 코드
    statusText: res.statusText, // 상태 텍스트
  };
  if (res.headers !== undefined) {
    out.headers = res.headers as unknown as Record<string, string>; // 헤더는 레코드로 캐스팅
  }
  return out; // 표준 응답 반환
};
