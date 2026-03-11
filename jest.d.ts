/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toEqual(expected: any): R;
      toBe(expected: any): R;
      toHaveLength(expected: number): R;
      toContain(expected: any): R;
      toMatchObject(expected: any): R;
      toBeGreaterThanOrEqual(expected: number): R;
      toBeGreaterThan(expected: number): R;
      toBeLessThan(expected: number): R;
    }
  }
}

export {};
