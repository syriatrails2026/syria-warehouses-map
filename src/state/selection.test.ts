import { describe, expect, it } from 'vitest';
import { parseSelectionFromSearch, selectionToSearch } from './selection';

describe('parseSelectionFromSearch', () => {
  it('parses an empty search into an empty selection', () => {
    expect(parseSelectionFromSearch('')).toEqual({});
  });

  it('parses a full gov/district/sub path', () => {
    expect(parseSelectionFromSearch('?gov=gov-a&district=dist-a1&sub=sub-a1a')).toEqual({
      governorateId: 'gov-a',
      districtId: 'dist-a1',
      subdistrictId: 'sub-a1a',
    });
  });

  it('ignores a sub param if district is missing (malformed URL)', () => {
    expect(parseSelectionFromSearch('?gov=gov-a&sub=sub-a1a')).toEqual({ governorateId: 'gov-a' });
  });
});

describe('selectionToSearch', () => {
  it('produces an empty string for an empty selection', () => {
    expect(selectionToSearch({})).toBe('');
  });

  it('round-trips a full selection through parse/serialize', () => {
    const selection = { governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' };
    const search = selectionToSearch(selection);
    expect(parseSelectionFromSearch(`?${search}`)).toEqual(selection);
  });
});
