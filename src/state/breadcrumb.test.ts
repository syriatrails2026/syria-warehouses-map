import { describe, expect, it } from 'vitest';
import { buildBreadcrumb } from './breadcrumb';

describe('buildBreadcrumb', () => {
  it('returns an empty list for an empty selection', () => {
    expect(buildBreadcrumb({}, {})).toEqual([]);
  });

  it('builds one item for a governorate-only selection', () => {
    const items = buildBreadcrumb({ governorateId: 'gov-a' }, { governorate: 'محافظة تجريبية أ' });
    expect(items).toEqual([{ label: 'محافظة تجريبية أ', selection: { governorateId: 'gov-a' } }]);
  });

  it('builds a full 3-level trail with correct partial selections at each step', () => {
    const selection = { governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' };
    const items = buildBreadcrumb(selection, {
      governorate: 'محافظة تجريبية أ',
      district: 'منطقة أ1',
      subdistrict: 'ناحية أ1أ',
    });
    expect(items).toEqual([
      { label: 'محافظة تجريبية أ', selection: { governorateId: 'gov-a' } },
      { label: 'منطقة أ1', selection: { governorateId: 'gov-a', districtId: 'dist-a1' } },
      { label: 'ناحية أ1أ', selection: { governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' } },
    ]);
  });
});
