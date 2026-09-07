import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useElementSize } from './useElementSize';

describe('useElementSize', () => {
  it('returns a ref and a default size before any element is measured', () => {
    const { result } = renderHook(() => useElementSize());
    expect(result.current.ref.current).toBeNull();
    expect(result.current.size).toEqual({ width: 600, height: 400 });
  });
});
