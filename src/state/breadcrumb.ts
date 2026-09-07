import type { Selection } from './selection';

export interface BreadcrumbItem {
  label: string;
  selection: Selection;
}

export interface BreadcrumbNames {
  governorate?: string;
  district?: string;
  subdistrict?: string;
}

export function buildBreadcrumb(selection: Selection, names: BreadcrumbNames): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];

  if (selection.governorateId && names.governorate) {
    items.push({ label: names.governorate, selection: { governorateId: selection.governorateId } });
  }
  if (selection.governorateId && selection.districtId && names.district) {
    items.push({
      label: names.district,
      selection: { governorateId: selection.governorateId, districtId: selection.districtId },
    });
  }
  if (selection.governorateId && selection.districtId && selection.subdistrictId && names.subdistrict) {
    items.push({ label: names.subdistrict, selection: { ...selection } });
  }

  return items;
}
