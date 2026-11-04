import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { fetchFrappeList } from './hr-management';

export interface LineRoster {
  name: string;
  employee: string;
  employee_name: string;
  department?: string;
  designation?: string;
  line_order: string;
  line_name: string;
  effective_from: string;
  effective_to?: string;
  assignment_type: 'Manual' | 'Bulk' | 'Rotation' | 'Override' | 'Line Change' | 'Face Recognition';
  status: 'Active' | 'Cancelled';
  reason?: string;
  owner?: string;
  creation?: string;
  modified?: string;
}

export interface FaceCatalogItem {
  name: string;
  employee_id: string;
  employee_name: string;
  department?: string;
  designation?: string;
  default_line?: string;
  current_line?: string;
  current_line_name?: string;
  source?: string;
  profile_picture?: string;
  face_enrolled: number;
  face_enrolled_at?: string;
  face_enrolled_image?: string;
  face_descriptor?: number[] | null;
  face_3d_landmarks?: any;
}

export interface LiveLineOccupancy {
  name: string;
  line_name: string;
  description?: string;
  assigned_count: number;
  capacity: number;
}

export interface MonthlyLineRosterDay {
  date: string;
  day: number;
  day_name: string;
  is_weekend: boolean;
  is_holiday: boolean;
  holiday_name: string;
}

export interface MonthlyLineRosterCell {
  line_order: string | null;
  line_name: string;
  source: 'ROSTER' | 'ROTATION' | 'DEFAULT' | 'NONE';
  roster_id?: string;
  assignment_type?: string;
  is_weekly_off?: boolean;
  is_holiday?: boolean;
}

export interface MonthlyLineRosterEmployee {
  employee: string;
  employee_name: string;
  department: string;
  designation: string;
  default_line: string;
  lines: Record<string, MonthlyLineRosterCell>;
}

export interface MonthlyLineRosterResponse {
  month: number;
  year: number;
  month_name: string;
  days: MonthlyLineRosterDay[];
  employees: MonthlyLineRosterEmployee[];
  lines: any[];
  total_count?: number;
  has_more?: boolean;
}

// Fetch list of line roster records
export const fetchLineRosterList = (params: any) => {
  const { search, ...rest } = params;
  const cleanSearch = search?.trim();

  const or_filters = rest.or_filters || [];

  if (cleanSearch) {
    or_filters.push(
      ['Employee Line Roster', 'employee_name', 'like', `%${cleanSearch}%`],
      ['Employee Line Roster', 'employee', 'like', `%${cleanSearch}%`],
      ['Employee Line Roster', 'line_order', 'like', `%${cleanSearch}%`],
      ['Employee Line Roster', 'line_name', 'like', `%${cleanSearch}%`]
    );
  }

  return fetchFrappeList('Employee Line Roster', { ...rest, or_filters });
};

// Create Roster Assignment
export async function createLineRosterAssignment(data: Partial<LineRoster>) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.create_roster_assignment', {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to create Line Roster assignment');
  }

  const json = await res.json();
  return json.message;
}

// Update Roster Assignment
export async function updateLineRosterAssignment(name: string, data: Partial<LineRoster>) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.update_roster_assignment', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, data }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to update Line Roster assignment');
  }

  const json = await res.json();
  return json.message;
}

// Delete or Cancel Assignment
export async function deleteOrCancelLineRosterAssignment(name: string, reason?: string, deletePermanently = false) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.delete_or_cancel_roster_assignment', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, reason, delete_permanently: deletePermanently }),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to delete Line Roster assignment');
  }

  const json = await res.json();
  return json.message;
}

// Check Conflict
export async function checkLineRosterConflict(employee: string, effective_from: string, effective_to?: string, exclude_name?: string) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.check_roster_conflict', {
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
export async function previewBulkAssignLines(params: {
  employees: string[];
  line_order: string;
  effective_from: string;
  effective_to?: string;
  exclude_weekly_offs?: boolean;
  exclude_holidays?: boolean;
}) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.preview_bulk_assign_lines', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to preview bulk line assignments');
  }

  const json = await res.json();
  return json.message;
}

// Execute Bulk Assign
export async function bulkAssignLines(params: {
  employees: string[];
  line_order: string;
  effective_from: string;
  effective_to?: string;
  assignment_type?: string;
  reason?: string;
  exclude_weekly_offs?: boolean;
  exclude_holidays?: boolean;
  override_conflicts?: boolean;
}) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.bulk_assign_lines', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to execute bulk line assignment');
  }

  const json = await res.json();
  return json.message;
}

// Fetch Monthly Roster Matrix
export async function fetchMonthlyLineRoster(params: {
  month: number;
  year: number;
  department?: string;
  employee?: string | string[];
  start?: number;
  limit?: number;
}): Promise<MonthlyLineRosterResponse> {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.get_monthly_roster', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch Monthly Line Roster');
  }

  const json = await res.json();
  return json.message;
}

// Fetch Calendar Roster Events
export async function fetchCalendarLineRoster(params: {
  start_date: string;
  end_date: string;
  employee?: string | string[];
  department?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.get_calendar_roster', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch Calendar Line Roster');
  }

  const json = await res.json();
  return json.message || [];
}

// Fetch the currently effective line order for an employee
// Returns the active assignment's line_order for today, or null if none
export async function fetchEffectiveLineForEmployee(employeeId: string): Promise<string | null> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  try {
    const res: any = await fetchFrappeList('Employee Line Roster', {
      page: 1,
      page_size: 1,
      filters: [
        ['employee', '=', employeeId],
        ['status', '=', 'Active'],
        ['effective_from', '<=', today],
      ],
      fields: ['name', 'line_order', 'line_name', 'effective_from', 'effective_to'],
      orderBy: 'effective_from',
      order: 'desc',
    });
    const records: any[] = res?.data || [];
    // Filter out records whose effective_to has already passed
    const valid = records.filter((r: any) => !r.effective_to || r.effective_to >= today);
    if (valid.length > 0) {
      return valid[0].line_order || null;
    }
    return null;
  } catch {
    return null;
  }
}

// Fetch Roster Audit History
export async function fetchLineRosterHistory(params: {
  roster_id?: string;
  employee?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.get_roster_history', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await handleFrappeError(res, 'Failed to fetch Line Roster History');
  }

  const json = await res.json();
  return json.message || [];
}

// ----------------------------------------------------------------------
// Face Recognition Line Change APIs
// ----------------------------------------------------------------------

export async function fetchFaceCatalog(): Promise<FaceCatalogItem[]> {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.get_face_catalog', {
    method: 'GET',
    headers,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(handleFrappeError(json, 'Failed to fetch Face Catalog'));
  }

  return json.message || [];
}

export async function fetchLiveLineOccupancy(date?: string): Promise<LiveLineOccupancy[]> {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.get_live_line_occupancy', {
    method: 'POST',
    headers,
    body: JSON.stringify({ attendance_date: date }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(handleFrappeError(json, 'Failed to fetch Line Occupancy'));
  }

  return json.message || [];
}

export async function executeFaceRecognitionLineChange(params: {
  employee: string;
  target_line: string;
  effective_from?: string;
  effective_to?: string;
  source_line?: string;
  reason?: string;
  mode?: 'Pre-Fixed' | 'Post-Fixed';
}) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.face_recognition_line_change', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(handleFrappeError(json, 'Failed to execute Face Recognition Line Change'));
  }

  return json.message;
}

export async function executeUndoFaceLineChange(params: {
  roster_id: string;
  employee?: string;
  previous_line?: string;
  effective_from?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.undo_face_line_change', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(handleFrappeError(json, 'Failed to undo Face Line Change'));
  }

  return json.message;
}

export async function saveEmployeeFaceEmbedding(params: {
  employee: string;
  face_descriptor?: number[] | string | null;
  face_3d_landmarks?: any;
  face_image?: string;
}): Promise<{ success: boolean; message: string; face_enrolled_image?: string; face_enrolled_at?: string; modified?: string }> {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.save_employee_face_embedding', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(handleFrappeError(json, 'Failed to save Employee Face Embedding'));
  }

  return json.message;
}

export async function clearEmployeeFaceEmbedding(employee: string): Promise<{ success: boolean; message: string; modified?: string }> {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.line_roster_api.clear_employee_face_embedding', {
    method: 'POST',
    headers,
    body: JSON.stringify({ employee }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(handleFrappeError(json, 'Failed to clear Employee Face Biometrics'));
  }

  return json.message;
}
