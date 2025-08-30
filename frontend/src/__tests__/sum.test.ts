// 예시: hpc/src/test/sum.test.ts (hwc도 동일 위치에 필요시 생성)
import { describe, expect, it } from '@jest/globals'

const sum = (a: number, b: number) => a + b

describe('sum', () => {
  it('adds two numbers', () => {
    expect(sum(1, 2)).toBe(3)
  })
})
