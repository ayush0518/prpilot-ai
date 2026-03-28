/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toEqual(expected: unknown): R;
      toBe(expected: unknown): R;
      toHaveLength(expected: number): R;
      toContain(expected: unknown): R;
      toMatchObject(expected: unknown): R;
      toBeGreaterThanOrEqual(expected: number): R;
      toBeGreaterThan(expected: number): R;
      toBeLessThan(expected: number): R;
    }
  }
}

export {};
