import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSelection } from './useSelection';

describe('useSelection', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('starts from the current URL search params', () => {
    window.history.pushState({}, '', '/?gov=gov-a');
    const { result } = renderHook(() => useSelection());
    expect(result.current[0]).toEqual({ governorateId: 'gov-a' });
  });

  it('updates the URL and state when setSelection is called', () => {
    const { result } = renderHook(() => useSelection());
    act(() => {
      result.current[1]({ governorateId: 'gov-a', districtId: 'dist-a1' });
    });
    expect(result.current[0]).toEqual({ governorateId: 'gov-a', districtId: 'dist-a1' });
    expect(window.location.search).toBe('?gov=gov-a&district=dist-a1');
  });

  it('responds to browser back/forward (popstate)', () => {
    const { result } = renderHook(() => useSelection());
    act(() => {
      result.current[1]({ governorateId: 'gov-a' });
    });
    act(() => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toEqual({});
  });
});
