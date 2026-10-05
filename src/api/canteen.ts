import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { fetchFrappeList } from './hr-management';

export interface CanteenEntry {
  name: string;
  employee: string;
  employee_name: string;
  department?: string;
  designation?: string;
  canteen_date: string;
  meal_type: string;
  meal_count: number;
  status: 'Availed' | 'Cancelled';
  source: string;
  remarks?: string;
  owner?: string;
  creation?: string;
  modified?: string;
}

export interface MonthlyCanteenDay {
  date: string;
  day: number;
  day_name: string;
  is_weekend: boolean;
  is_holiday: boolean;
  holiday_name: string;
}

export interface MonthlyCanteenCell {
  availed: boolean;
  meal_count: number;
  meal_type?: string;
  entry_id?: string;
  source?: string;
  is_holiday?: boolean;
  is_weekend?: boolean;
  holiday_name?: string;
}

export interface MonthlyCanteenEmployee {
  employee: string;
  employee_name: string;
  department: string;
  designation: string;
  entries: Record<string, MonthlyCanteenCell>;
  total_meals: number;
}

export interface MonthlyCanteenResponse {
  month: number;
  year: number;
  month_name: string;
  days: MonthlyCanteenDay[];
  employees: MonthlyCanteenEmployee[];
  daily_totals: Record<string, number>;
  grand_total: number;
  total_count: number;
  has_more: boolean;
}

// Fetch list of Canteen entries
export const fetchCanteenList = (params: any) => {
  const { search, ...rest } = params;
  const cleanSearch = search?.trim();

  const or_filters = rest.or_filters || [];

  if (cleanSearch) {
    or_filters.push(
      ['Canteen Entry', 'employee_name', 'like', `%${cleanSearch}%`],
      ['Canteen Entry', 'employee', 'like', `%${cleanSearch}%`],
      ['Canteen Entry', 'department', 'like', `%${cleanSearch}%`],
      ['Canteen Entry', 'meal_type', 'like', `%${cleanSearch}%`]
    );
  }

  return fetchFrappeList('Canteen Entry', { ...rest, or_filters });
};

// Create Canteen Entry
export async function createCanteenEntry(data: Partial<CanteenEntry>) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.canteen_api.create_canteen_entry', {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to create Canteen entry');
  }

  const json = await res.json();
  return json.message;
}

// Update Canteen Entry
export async function updateCanteenEntry(name: string, data: Partial<CanteenEntry>) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.canteen_api.update_canteen_entry', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, data }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to update Canteen entry');
  }

  const json = await res.json();
  return json.message;
}

// Delete Canteen Entry
export async function deleteCanteenEntry(name: string) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.canteen_api.delete_canteen_entry', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to delete Canteen entry');
  }

  const json = await res.json();
  return json.message;
}

// Bulk Delete Canteen Entries
export async function bulkDeleteCanteenEntries(names: string[]) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.canteen_api.bulk_delete_canteen_entries', {
    method: 'POST',
    headers,
    body: JSON.stringify({ names }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to bulk delete Canteen entries');
  }

  const json = await res.json();
  return json.message;
}

// Fetch Monthly Canteen Roster
export async function fetchMonthlyCanteen(params: {
  month?: number;
  year?: number;
  department?: string;
  employee?: string | string[];
  meal_type?: string;
  start?: number;
  limit?: number;
}): Promise<MonthlyCanteenResponse> {
  const headers = await getAuthHeaders();
  const query = new URLSearchParams();

  if (params.month) query.set('month', String(params.month));
  if (params.year) query.set('year', String(params.year));
  if (params.department && params.department !== 'all') query.set('department', params.department);
  if (params.meal_type && params.meal_type !== 'all') query.set('meal_type', params.meal_type);
  if (params.employee) {
    if (Array.isArray(params.employee)) {
      query.set('employee', JSON.stringify(params.employee));
    } else if (params.employee !== 'all') {
      query.set('employee', params.employee);
    }
  }
  if (params.start !== undefined) query.set('start', String(params.start));
  if (params.limit !== undefined) query.set('limit', String(params.limit));

  const res = await frappeRequest(`/api/method/company.company.canteen_api.get_monthly_canteen?${query.toString()}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch Monthly Canteen data');
  }

  const json = await res.json();
  return json.message;
}

// Fetch Calendar Canteen
export async function fetchCalendarCanteen(params: {
  start_date: string;
  end_date: string;
  employee?: string | string[];
  department?: string;
  meal_type?: string;
}) {
  const headers = await getAuthHeaders();
  const query = new URLSearchParams();
  query.set('start_date', params.start_date);
  query.set('end_date', params.end_date);
  if (params.department && params.department !== 'all') query.set('department', params.department);
  if (params.meal_type && params.meal_type !== 'all') query.set('meal_type', params.meal_type);
  if (params.employee) {
    if (Array.isArray(params.employee)) {
      query.set('employee', JSON.stringify(params.employee));
    } else if (params.employee !== 'all') {
      query.set('employee', params.employee);
    }
  }

  const res = await frappeRequest(`/api/method/company.company.canteen_api.get_calendar_canteen?${query.toString()}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch Canteen calendar data');
  }

  const json = await res.json();
  return json.message || [];
}

// Bulk Import Canteen Entries from Excel
export async function bulkImportCanteenEntries(params: {
  month: number;
  year: number;
  rows: Array<{
    emp_number?: string;
    employee_name?: string;
    days: Record<string, number>;
  }>;
  meal_type?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.canteen_api.bulk_import_canteen_entries', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to import Canteen data');
  }

  const json = await res.json();
  return json.message;
}
