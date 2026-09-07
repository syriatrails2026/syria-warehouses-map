export interface Selection {
  governorateId?: string;
  districtId?: string;
  subdistrictId?: string;
}

export function parseSelectionFromSearch(search: string): Selection {
  const params = new URLSearchParams(search);
  const selection: Selection = {};
  const gov = params.get('gov');
  const district = params.get('district');
  const sub = params.get('sub');
  if (gov) selection.governorateId = gov;
  if (gov && district) selection.districtId = district;
  if (gov && district && sub) selection.subdistrictId = sub;
  return selection;
}

export function selectionToSearch(selection: Selection): string {
  const params = new URLSearchParams();
  if (selection.governorateId) params.set('gov', selection.governorateId);
  if (selection.governorateId && selection.districtId) params.set('district', selection.districtId);
  if (selection.governorateId && selection.districtId && selection.subdistrictId) {
    params.set('sub', selection.subdistrictId);
  }
  return params.toString();
}
