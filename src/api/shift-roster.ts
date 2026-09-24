import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { fetchFrappeList } from './hr-management';

export interface ShiftRoster {
  name: string;
  employee: string;
  employee_name: string;
  department?: string;
  designation?: string;
  shift: string;
  shift_name: string;
  effective_from: string;
  effective_to?: string;
  assignment_type: 'Manual' | 'Bulk' | 'Rotation' | 'Override' | 'Shift Change';
  status: 'Active' | 'Cancelled';
  reason?: string;
  owner?: string;
  creation?: string;
  modified?: string;
}

export interface MonthlyRosterDay {
  date: string;
  day: number;
  day_name: string;
  is_weekend: boolean;
  is_holiday: boolean;
  holiday_name: string;
}

export interface MonthlyRosterShiftCell {
  shift: string | null;
  shift_name: string;
  source: 'ROSTER' | 'ROTATION' | 'DEFAULT' | 'NONE';
  roster_id?: string;
  assignment_type?: string;
  start_time?: string;
  end_time?: string;
  is_weekly_off?: boolean;
  is_holiday?: boolean;
}

export interface MonthlyRosterEmployee {
  employee: string;
  employee_name: string;
  department: string;
  designation: string;
  default_shift: string;
  shifts: Record<string, MonthlyRosterShiftCell>;
}

export interface MonthlyRosterResponse {
  month: number;
  year: number;
  month_name: string;
  days: MonthlyRosterDay[];
  employees: MonthlyRosterEmployee[];
  shifts: any[];
  total_count?: number;
  has_more?: boolean;
}

// Fetch list of shift roster records
export const fetchShiftRosterList = (params: any) => {
  const { search, ...rest } = params;
  const cleanSearch = search?.trim();

  const or_filters = rest.or_filters || [];

  if (cleanSearch) {
    or_filters.push(
      ['Employee Shift Roster', 'employee_name', 'like', `%${cleanSearch}%`],
      ['Employee Shift Roster', 'employee', 'like', `%${cleanSearch}%`],
      ['Employee Shift Roster', 'shift', 'like', `%${cleanSearch}%`]
    );
  }

  return fetchFrappeList('Employee Shift Roster', { ...rest, or_filters });
};

// Create Roster Assignment
export async function createRosterAssignment(data: Partial<ShiftRoster>) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.create_roster_assignment', {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to create Shift Roster assignment');
  }

  const json = await res.json();
  return json.message;
}

// Update Roster Assignment
export async function updateRosterAssignment(name: string, data: Partial<ShiftRoster>) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.update_roster_assignment', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, data }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to update Shift Roster assignment');
  }

  const json = await res.json();
  return json.message;
}

// Delete or Cancel Assignment
export async function deleteOrCancelRosterAssignment(name: string, reason?: string, deletePermanently = false) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.delete_or_cancel_roster_assignment', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, reason, delete_permanently: deletePermanently }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to delete Shift Roster assignment');
  }

  const json = await res.json();
  return json.message;
}

// Check Conflict
export async function checkRosterConflict(employee: string, effective_from: string, effective_to?: string, exclude_name?: string) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.check_roster_conflict', {
    method: 'POST',
    headers,
    body: JSON.stringify({ employee, effective_from, effective_to, exclude_name }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to check conflicts');
  }

  const json = await res.json();
  return json.message || [];
}

// Preview Bulk Assign
export async function previewBulkAssignShifts(params: {
  employees: string[];
  shift: string;
  effective_from: string;
  effective_to?: string;
  exclude_weekly_offs?: boolean;
  exclude_holidays?: boolean;
}) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.preview_bulk_assign_shifts', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to preview bulk assignments');
  }

  const json = await res.json();
  return json.message;
}

// Execute Bulk Assign
export async function bulkAssignShifts(params: {
  employees: string[];
  shift: string;
  effective_from: string;
  effective_to?: string;
  assignment_type?: string;
  reason?: string;
  exclude_weekly_offs?: boolean;
  exclude_holidays?: boolean;
  override_conflicts?: boolean;
}) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.bulk_assign_shifts', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to execute bulk shift assignment');
  }

  const json = await res.json();
  return json.message;
}

// Fetch Monthly Roster Matrix
export async function fetchMonthlyRoster(params: {
  month: number;
  year: number;
  department?: string;
  employee?: string | string[];
  start?: number;
  limit?: number;
}): Promise<MonthlyRosterResponse> {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.get_monthly_roster', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch Monthly Roster');
  }

  const json = await res.json();
  return json.message;
}

// Fetch Calendar Roster Events
export async function fetchCalendarRoster(params: {
  start_date: string;
  end_date: string;
  employee?: string | string[];
  department?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.get_calendar_roster', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch Calendar Roster');
  }

  const json = await res.json();
  return json.message || [];
}

// Fetch Roster Audit History
export async function fetchRosterHistory(params: {
  roster_id?: string;
  employee?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.shift_roster_api.get_roster_history', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch Roster History');
  }

  const json = await res.json();
  return json.message || [];
}
