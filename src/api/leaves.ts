import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { fetchFrappeList } from './hr-management';

export interface LeaveApplication {
    name: string;
    employee: string;
    employee_name: string;
    leave_type: string;
    from_date: string;
    to_date: string;
    total_days: number;
    half_day?: number | boolean;
    half_day_date?: string;
    permission_hours?: number;
    attachment?: string;
    reson: string;
    workflow_state?: string;
    status?: string;
    hr_query?: string;
    employee_reply?: string;
    hr_query_2?: string;
    employee_reply_2?: string;
    hr_query_3?: string;
    employee_reply_3?: string;
    hr_query_4?: string;
    employee_reply_4?: string;
    hr_query_5?: string;
    employee_reply_5?: string;
}

export interface WorkflowAction {
    action: string;
    next_state: string;
}

// Leave Application APIs
export const fetchLeaveApplications = (params: any) => {
    const { search, ...restParams } = params;
    const cleanSearch = search?.trim();

    const filters: any[] = [];
    if (restParams.filters) {
        Object.entries(restParams.filters).forEach(([key, value]) => {
            if (value && value !== 'all') {
                if (key === 'start_date' || key === 'end_date' || key === 'unread_messages') {
                    // Handled below for range and extra flags
                } else {
                    filters.push(["Leave Application", key, "=", value]);
                }
            }
        });

        if (restParams.filters.start_date || restParams.filters.end_date) {
            const start = restParams.filters.start_date || '1970-01-01';
            const end = restParams.filters.end_date || '2099-12-31';
            filters.push(["Leave Application", "from_date", "between", [start, end]]);
        }
    }

    const or_filters = restParams.or_filters || [];
    
    if (cleanSearch) {
        or_filters.push(
            ["Leave Application", "employee_name", "like", `%${cleanSearch}%`],
            ["Leave Application", "employee", "like", `%${cleanSearch}%`]
        );
    }

    const unread_messages = restParams.filters?.unread_messages;
    // NOTE: unread_messages filtering is handled by the backend permission query condition
    // (get_leave_application_permission_query_conditions in api.py) via the unread_messages URL param.
    // Do NOT add a fake filter field here — unread_only is not a real Leave Application field.
    
    return fetchFrappeList("Leave Application", { 
        ...restParams, 
        filters, 
        or_filters,
        ...(unread_messages ? { unread_messages: true } : {})
    });
};

export async function createLeaveApplication(data: Partial<LeaveApplication>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Leave Application", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create leave application"));
    return json.message;
}

export async function updateLeaveApplication(name: string, data: Partial<LeaveApplication>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Leave Application", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update leave application"));
    return json.message;
}

export async function deleteLeaveApplication(name: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Leave Application", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete leave application"));
    return true;
}

// Leave Balance & Probation APIs
export async function checkLeaveBalance(params: {
    employee: string;
    leave_type: string;
    from_date: string;
    to_date: string;
    half_day?: number;
    permission_hours?: number;
}) {
    const query = new URLSearchParams({
        employee: params.employee,
        leave_type: params.leave_type,
        from_date: params.from_date,
        to_date: params.to_date,
        half_day: String(params.half_day || 0),
        permission_hours: String(params.permission_hours || "")
    });

    const res = await frappeRequest(`/api/method/company.company.api.check_leave_balance?${query.toString()}`);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to check leave balance"));
    }
    return (await res.json()).message;
}

export interface EmployeeProbationInfo {
    is_probation: boolean;
    restricted_types: string[];
    probation_end_date: string | null;
}

export async function getEmployeeProbationInfo(
    employee: string,
    date?: string
): Promise<EmployeeProbationInfo> {
    const query = new URLSearchParams({ employee });

    if (date) {
        query.append("date", date);
    }

    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_employee_probation_info?${query.toString()}`
    );

    if (!res.ok) {
        const error = await res.json();
        throw new Error(
            handleFrappeError(error, "Failed to fetch probation info")
        );
    }

    const data = await res.json();
    return data.message;
}

export async function getLeaveWorkflowActions(currentState: string): Promise<WorkflowAction[]> {
    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_workflow_states?doctype=Leave Application&current_state=${encodeURIComponent(currentState)}`
    );

    if (!res.ok) {
        return [];
    }

    const data = (await res.json()).message || { actions: [] };
    return data.actions || [];
}

export async function applyLeaveWorkflowAction(name: string, action: string, comment?: string, updateData?: any) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/company.company.frontend_api.apply_workflow_action", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Leave Application",
            name,
            action,
            comment,
            update_data: updateData
        })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to apply workflow action"));
    return json.message;
}

export async function updateLeaveStatus(name: string, workflowState: string, updateData?: any) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/company.company.frontend_api.update_doc_status", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Leave Application",
            name,
            workflow_state: workflowState,
            update_data: updateData
        })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to update leave status"));
    }

    return (await res.json()).message;
}

export async function checkLeaveOverlap(params: {
    employee: string;
    from_date: string;
    to_date: string;
    exclude_doc?: string;
}) {
    const query = new URLSearchParams({
        employee: params.employee,
        from_date: params.from_date,
        to_date: params.to_date,
    });
    if (params.exclude_doc) query.append("exclude_doc", params.exclude_doc);

    const res = await frappeRequest(`/api/method/company.company.frontend_api.check_leave_overlap?${query.toString()}`);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to check leave overlap"));
    }
    return (await res.json()).message;
}

export async function fetchEmployeeAppliedLeaveDates(employee: string): Promise<string[]> {
    if (!employee) return [];
    try {
        const res = await frappeRequest(`/api/method/company.company.frontend_api.get_employee_applied_leave_dates?employee=${encodeURIComponent(employee)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.message || [];
    } catch (e) {
        console.error("Failed to fetch employee applied leave dates:", e);
        return [];
    }
}
