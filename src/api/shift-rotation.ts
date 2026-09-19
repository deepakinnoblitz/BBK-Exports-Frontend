import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { fetchFrappeList } from './hr-management';

export interface ShiftRotationSequenceItem {
  step_number: number;
  shift: string;
  shift_name?: string;
}

export interface ShiftRotationAssigneeItem {
  employee: string;
  employee_name?: string;
  department?: string;
  designation?: string;
}

export interface ShiftRotation {
  name: string;
  rotation_name: string;
  frequency: 'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly';
  status: 'Active' | 'Inactive';
  department?: string;
  start_date: string;
  end_date: string;
  exclude_holidays: number | boolean;
  exclude_weekly_offs: number | boolean;
  description?: string;
  sequences?: ShiftRotationSequenceItem[];
  assignees?: ShiftRotationAssigneeItem[];
  creation?: string;
  modified?: string;
}

// Fetch list of rotations
export const fetchShiftRotationList = (params: any) => {
  const { search, limit, page_size, order_by, orderBy, order, page, filters, fields, or_filters: customOrFilters } = params;
  const cleanSearch = search?.trim();

  const or_filters = customOrFilters ? [...customOrFilters] : [];

  if (cleanSearch) {
    or_filters.push(
      ['Shift Rotation', 'rotation_name', 'like', `%${cleanSearch}%`],
      ['Shift Rotation', 'frequency', 'like', `%${cleanSearch}%`],
      ['Shift Rotation', 'name', 'like', `%${cleanSearch}%`]
    );
  }

  let finalOrderBy = orderBy;
  let finalOrder = order;
  if (!finalOrderBy && order_by) {
    const parts = order_by.split(' ');
    finalOrderBy = parts[0];
    finalOrder = parts[1] as any;
  }

  return fetchFrappeList('Shift Rotation', {
    page: page || 1,
    page_size: page_size || limit || 10,
    orderBy: finalOrderBy || 'modified',
    order: finalOrder || 'desc',
    fields,
    filters,
    or_filters,
  });
};

// Fetch single rotation with child tables
export async function getShiftRotationDoc(name: string): Promise<ShiftRotation> {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.get_shift_rotation_doc', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch Shift Rotation details');
  }

  const json = await res.json();
  return json.message;
}

// Create Shift Rotation
export async function createShiftRotation(data: Partial<ShiftRotation>) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.create_shift_rotation_doc', {
    method: 'POST',
    headers,
    body: JSON.stringify({ doc: data }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to create Shift Rotation');
  }

  const json = await res.json();
  return json.message;
}

// Update Shift Rotation
export async function updateShiftRotation(name: string, data: Partial<ShiftRotation>) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.update_shift_rotation_doc', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, doc: data }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to update Shift Rotation');
  }

  const json = await res.json();
  return json.message;
}

// Delete Shift Rotation
export async function deleteShiftRotation(name: string) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.delete_shift_rotation_doc', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to delete Shift Rotation');
  }

  return true;
}

// Generate Roster Entries from Rotation
export async function generateRotationAssignments(rotation_name: string) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.generate_rotation_assignments', {
    method: 'POST',
    headers,
    body: JSON.stringify({ rotation_name }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to generate assignments from rotation');
  }

  const json = await res.json();
  return json.message;
}
