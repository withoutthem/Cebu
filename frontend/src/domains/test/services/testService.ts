// /src/services/testService.ts

// API 응답 데이터의 타입 정의

import { GET, type HttpResponse } from '@shared/platform/http'

export interface TestData {
  id: string
  name: string
  timestamp: string
}

/**
 * 테스트 관련 API 호출을 담당하는 서비스 객체
 */
const testService = {
  /**
   * ID를 기반으로 테스트 데이터를 가져옵니다.
   * @param id 데이터 ID
   */
  async fetchTestData(id: string): Promise<HttpResponse<TestData>> {
    // GET 유틸을 사용하여 특정 엔드포인트에서 데이터를 가져옵니다.
    return GET<TestData>(`https://jsonplaceholder.typicode.com/todos/${id}`)
  },
}

// 클래스 인스턴스가 아닌, 단일 객체(싱글턴)로 export합니다.
export default testService
