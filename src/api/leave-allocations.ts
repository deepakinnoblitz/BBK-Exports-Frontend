import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { fetchFrappeList } from './hr-management';

export interface WorkflowAction {
    action: string;
    next_state: string;
}

export interface LeaveAllocation {
    name: string;
    employee: string;
    employee_name: string;
    leave_type: string;
    from_date: string;
    to_date: string;
    total_leaves_allocated: number;
    total_leaves_taken: number;
    status: string;
    workflow_state?: string;
    allocation_source?: 'Auto' | 'Manual';
}

// Leave Allocation APIs
export const fetchLeaveAllocations = (params: any) => {
    const filters: any[] = [];
    const or_filters: any[] = [];

    if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
            if (value && value !== 'all') {
                if (Array.isArray(value)) {
                    filters.push(['Leave Allocation', key, value[0], value[1]]);
                } else {
                    filters.push(['Leave Allocation', key, "=", value]);
                }
            }
        });
    }

    if (params.search) {
        or_filters.push(['Leave Allocation', 'employee_name', 'like', `%${params.search}%`]);
        or_filters.push(['Leave Allocation', 'employee', 'like', `%${params.search}%`]);
        or_filters.push(['Leave Allocation', 'leave_type', 'like', `%${params.search}%`]);
    }

    return fetchFrappeList("Leave Allocation", {
        ...params,
        filters: filters.length > 0 ? filters : undefined,
        or_filters: or_filters.length > 0 ? or_filters : undefined
    });
};

export async function createLeaveAllocation(data: Partial<LeaveAllocation>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Leave Allocation", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create leave allocation"));
    return json.message;
}

export async function updateLeaveAllocation(name: string, data: Partial<LeaveAllocation>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Leave Allocation", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update leave allocation"));
    return json.message;
}

export async function deleteLeaveAllocation(name: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Leave Allocation", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete leave allocation"));
    return true;
}

export async function applyLeaveAllocationWorkflowAction(name: string, action: string, comment?: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/company.company.frontend_api.apply_workflow_action", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Leave Allocation",
            name,
            action,
            comment
        })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to apply workflow action"));
    return json.message;
}

export async function getLeaveAllocationWorkflowActions(currentState: string): Promise<WorkflowAction[]> {
    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_workflow_states?doctype=Leave Allocation&current_state=${encodeURIComponent(currentState)}`
    );

    if (!res.ok) {
        return [];
    }

    const data = (await res.json()).message || { actions: [] };
    return data.actions || [];
}

export interface AllocationPreviewItem {
    leave_type: string;
    leave_type_name: string;
    count: number;
    exists: boolean;
}

export interface EmployeeAllocationPreview {
    employee: string;
    employee_id: string;
    employee_name: string;
    date_of_joining: string;
    in_probation: boolean;
    allocations: AllocationPreviewItem[];
}

// ─── New Richer interfaces for frontend_api ────────────────────────────────

export interface MonthlyAllocationItem {
    leave_type: string;
    leave_type_name: string;
    allocation_basis?: string;
    criteria_met?: boolean;
    criteria_reason?: string;
    base_leaves: number;
    carry_forward_balance: number;
    total_leaves: number;
    exists: boolean;
    is_paid: number;
    carry_forward: number;
    reset_frequency: string;
}

export interface MonthlyEmployeeAllocationPreview {
    employee: string;
    employee_id: string;
    employee_name: string;
    date_of_joining: string;
    in_probation: boolean;
    working_days?: number;
    present_days?: number;
    attendance_pct?: number;
    is_full_month_present?: boolean;
    attendance_evaluated_month?: string;
    allocations: MonthlyAllocationItem[];
}

export interface MonthlyAutoAllocateResult {
    created_count: number;
    skipped_count: number;
    created_details: {
        employee_name: string;
        employee_id: string;
        leave_type: string;
        total_leaves: number;
    }[];
    errors: string[];
}

/** GET /api/method/company.company.frontend_api.get_leave_allocation_preview */
export async function getMonthlyLeaveAllocationPreview(
    year: number,
    month: number,
    attendance_month?: number,
    attendance_year?: number
): Promise<MonthlyEmployeeAllocationPreview[]> {
    let url = `/api/method/company.company.frontend_api.get_leave_allocation_preview?year=${year}&month=${month}`;
    if (attendance_month) url += `&attendance_month=${attendance_month}`;
    if (attendance_year) url += `&attendance_year=${attendance_year}`;
    const res = await frappeRequest(url);
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to get allocation preview'));
    return json.message || [];
}

/** GET /api/method/company.company.frontend_api.auto_allocate_monthly_leaves */
export async function autoAllocateMonthlyLeavesNew(
    year: number,
    month: number,
    only_conditional: boolean = false,
    attendance_month?: number,
    attendance_year?: number
): Promise<MonthlyAutoAllocateResult> {
    const headers = await getAuthHeaders();
    let url = `/api/method/company.company.frontend_api.auto_allocate_monthly_leaves?year=${year}&month=${month}&only_conditional=${only_conditional ? 1 : 0}`;
    if (attendance_month) url += `&attendance_month=${attendance_month}`;
    if (attendance_year) url += `&attendance_year=${attendance_year}`;
    const res = await frappeRequest(url, { method: 'GET', headers });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to auto-allocate monthly leaves'));
    return json.message;
}

// ─── Auto Leave Allocation Log Types & APIs ─────────────────────────────────

export interface AutoLeaveAllocationLog {
    name: string;
    execution_date: string;
    month: number;
    year: number;
    target_period: string;
    attendance_evaluated_month?: string;
    executed_by: string;
    execution_type: 'Manual Run' | 'Scheduled Cron';
    created_count: number;
    skipped_count: number;
    error_count: number;
    status: 'Success' | 'Partial' | 'Failed';
}

export interface AutoLeaveAllocationLogDetailItem {
    employee_id: string;
    employee_name: string;
    leave_type: string;
    allocated: number;
    carry_forward?: number;
    reason?: string;
}

export interface AutoLeaveAllocationLogDetails extends AutoLeaveAllocationLog {
    details: AutoLeaveAllocationLogDetailItem[];
    errors: string[];
}

export async function fetchAutoLeaveAllocationLogs(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    execution_type?: string;
    year?: number | string;
    month?: number | string;
    sort_by?: string;
}): Promise<{ data: AutoLeaveAllocationLog[]; total: number; page: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    if (params.search) queryParams.append('search', params.search);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.execution_type && params.execution_type !== 'all') queryParams.append('execution_type', params.execution_type);
    if (params.year && params.year !== 'all') queryParams.append('year', String(params.year));
    if (params.month && params.month !== 'all') queryParams.append('month', String(params.month));
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);

    const res = await frappeRequest(`/api/method/company.company.frontend_api.get_auto_leave_allocation_logs?${queryParams.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to fetch auto leave allocation logs'));
    return json.message || { data: [], total: 0, page: 1, limit: 10 };
}

export async function fetchAutoLeaveAllocationLogDetails(logId: string): Promise<AutoLeaveAllocationLogDetails> {
    const res = await frappeRequest(`/api/method/company.company.frontend_api.get_auto_leave_allocation_log_details?log_id=${encodeURIComponent(logId)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to fetch log details'));
    return json.message;
}

