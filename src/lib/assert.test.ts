import { describe, it, expect } from 'vitest';
import { assert } from './assert';

describe('assert', () => {
  it('should not throw if condition is true', () => {
    expect(() => assert(true)).not.toThrow();
    const getOne = () => 1;
    expect(() => assert(getOne() === 1)).not.toThrow();
    expect(() => assert({})).not.toThrow();
  });

  it('should throw if condition is false', () => {
    expect(() => assert(false)).toThrow('Assertion failed');
    expect(() => assert(false, 'Custom error')).toThrow('Custom error');
    expect(() => assert(0)).toThrow('Assertion failed');
    expect(() => assert(null)).toThrow('Assertion failed');
    expect(() => assert(undefined)).toThrow('Assertion failed');
  });

  it('should narrow types in typescript (compile-time check)', () => {
    const getVal = (): string | null => 'hello';
    const val = getVal();
    assert(val !== null);
    // This line would fail to compile if assert didn't use `asserts condition`
    const len: number = val.length;
    expect(len).toBe(5);
  });
});
