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

export interface GenerateRotationPayload {
  rotation_name: string;
  employees?: string[];
  start_date?: string;
  end_date?: string;
  exclude_weekly_offs?: boolean | number;
  exclude_holidays?: boolean | number;
  override_conflicts?: boolean | number;
}

// Generate Roster Entries from Rotation
export async function generateRotationAssignments(params: string | GenerateRotationPayload) {
  const headers = await getAuthHeaders();
  const payload = typeof params === 'string' ? { rotation_name: params } : params;
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.generate_rotation_assignments', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to generate assignments from rotation');
  }

  const json = await res.json();
  return json.message;
}

export interface FilterEmployeesParams {
  department?: string;
  shift?: string;
  line_order?: string;
  search?: string;
  page?: number;
  page_size?: number;
  status?: string;
}

export interface SelectorEmployeeItem {
  name: string;
  employee_name: string;
  department?: string;
  shift?: string;
  line_order?: string;
  designation?: string;
  status?: string;
}

export interface FilterEmployeesResponse {
  employees: SelectorEmployeeItem[];
  total: number;
  page: number;
  page_size: number;
}

// Fetch paginated employees for High-Volume Selector
export async function fetchSelectorEmployees(params: FilterEmployeesParams): Promise<FilterEmployeesResponse> {
  const query = new URLSearchParams();
  if (params.department && params.department !== 'all') query.set('department', params.department);
  if (params.shift && params.shift !== 'all') query.set('shift', params.shift);
  if (params.line_order && params.line_order !== 'all') query.set('line_order', params.line_order);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.status) query.set('status', params.status);

  const res = await frappeRequest(`/api/method/company.company.shift_roster_api.get_filtered_employees?${query.toString()}`);
  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch employees');
  }
  const json = await res.json();
  return json.message || { employees: [], total: 0, page: 1, page_size: 25 };
}

// Fetch all matching employee IDs for 'Select All Filtered'
export async function fetchSelectorEmployeeIds(params: FilterEmployeesParams): Promise<string[]> {
  const query = new URLSearchParams();
  if (params.department && params.department !== 'all') query.set('department', params.department);
  if (params.shift && params.shift !== 'all') query.set('shift', params.shift);
  if (params.line_order && params.line_order !== 'all') query.set('line_order', params.line_order);
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);

  const res = await frappeRequest(`/api/method/company.company.shift_roster_api.get_filtered_employee_ids?${query.toString()}`);
  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch employee IDs');
  }
  const json = await res.json();
  return json.message || [];
}

