import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { fetchFrappeList } from './hr-management';

export interface LineRotationSequenceItem {
  step_number: number;
  line_order: string;
  line_name?: string;
}

export interface LineRotationAssigneeItem {
  employee: string;
  employee_name?: string;
  department?: string;
  designation?: string;
}

export interface LineRotation {
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
  sequences?: LineRotationSequenceItem[];
  assignees?: LineRotationAssigneeItem[];
  creation?: string;
  modified?: string;
}

// Fetch list of rotations
export const fetchLineRotationList = (params: any) => {
  const { search, limit, page_size, order_by, orderBy, order, page, filters, fields, or_filters: customOrFilters } = params;
  const cleanSearch = search?.trim();

  const or_filters = customOrFilters ? [...customOrFilters] : [];

  if (cleanSearch) {
    or_filters.push(
      ['Line Rotation', 'rotation_name', 'like', `%${cleanSearch}%`],
      ['Line Rotation', 'frequency', 'like', `%${cleanSearch}%`],
      ['Line Rotation', 'name', 'like', `%${cleanSearch}%`]
    );
  }

  let finalOrderBy = orderBy;
  let finalOrder = order;
  if (!finalOrderBy && order_by) {
    const parts = order_by.split(' ');
    finalOrderBy = parts[0];
    finalOrder = parts[1] as any;
  }

  return fetchFrappeList('Line Rotation', {
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
export async function getLineRotationDoc(name: string): Promise<LineRotation> {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.get_line_rotation_doc', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch Line Rotation details');
  }

  const json = await res.json();
  return json.message;
}

// Create Line Rotation
export async function createLineRotation(data: Partial<LineRotation>) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.create_line_rotation_doc', {
    method: 'POST',
    headers,
    body: JSON.stringify({ doc: data }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to create Line Rotation');
  }

  const json = await res.json();
  return json.message;
}

// Update Line Rotation
export async function updateLineRotation(name: string, data: Partial<LineRotation>) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.update_line_rotation_doc', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, doc: data }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to update Line Rotation');
  }

  const json = await res.json();
  return json.message;
}

// Delete Line Rotation
export async function deleteLineRotation(name: string) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.delete_line_rotation_doc', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to delete Line Rotation');
  }

  return true;
}

export interface GenerateLineRotationPayload {
  rotation_name: string;
  employees?: string[];
  start_date?: string;
  end_date?: string;
  exclude_weekly_offs?: boolean | number;
  exclude_holidays?: boolean | number;
  override_conflicts?: boolean | number;
}

// Generate Roster Entries from Rotation
export async function generateLineRotationAssignments(params: string | GenerateLineRotationPayload) {
  const headers = await getAuthHeaders();
  const payload = typeof params === 'string' ? { rotation_name: params } : params;
  const res = await frappeRequest('/api/method/company.company.line_roster_api.generate_rotation_assignments', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to generate assignments from line rotation');
  }

  const json = await res.json();
  return json.message;
}

export interface FilterLineEmployeesParams {
  department?: string;
  shift?: string;
  line_order?: string;
  search?: string;
  page?: number;
  page_size?: number;
  status?: string;
}

export interface SelectorLineEmployeeItem {
  name: string;
  employee_name: string;
  department?: string;
  shift?: string;
  line_order?: string;
  designation?: string;
  status?: string;
}

export interface FilterLineEmployeesResponse {
  employees: SelectorLineEmployeeItem[];
  total: number;
  page: number;
  page_size: number;
}

// Fetch paginated employees for High-Volume Selector
export async function fetchSelectorLineEmployees(params: FilterLineEmployeesParams): Promise<FilterLineEmployeesResponse> {
  const query = new URLSearchParams();
  if (params.department && params.department !== 'all') query.set('department', params.department);
  if (params.shift && params.shift !== 'all') query.set('shift', params.shift);
  if (params.line_order && params.line_order !== 'all') query.set('line_order', params.line_order);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.status) query.set('status', params.status);

  const res = await frappeRequest(`/api/method/company.company.line_roster_api.get_filtered_employees?${query.toString()}`);
  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch employees');
  }
  const json = await res.json();
  return json.message || { employees: [], total: 0, page: 1, page_size: 25 };
}

// Fetch all matching employee IDs for 'Select All Filtered'
export async function fetchSelectorLineEmployeeIds(params: FilterLineEmployeesParams): Promise<string[]> {
  const query = new URLSearchParams();
  if (params.department && params.department !== 'all') query.set('department', params.department);
  if (params.shift && params.shift !== 'all') query.set('shift', params.shift);
  if (params.line_order && params.line_order !== 'all') query.set('line_order', params.line_order);
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);

  const res = await frappeRequest(`/api/method/company.company.line_roster_api.get_filtered_employee_ids?${query.toString()}`);
  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch employee IDs');
  }
  const json = await res.json();
  return json.message || [];
}
