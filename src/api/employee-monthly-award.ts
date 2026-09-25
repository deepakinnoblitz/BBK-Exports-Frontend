import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

export async function fetchEmployeeMonthlyAwards(params: {
    page: number;
    page_size: number;
    search?: string;
    sort_by?: string;
    month?: string;
    employee?: string;
    rank?: string;
    type?: string;
    status?: string;
}) {
    const filters: any[] = [];
    if (params.month) {
        filters.push(["Employee Monthly Award", "month", "=", params.month]);
    }
    if (params.employee) {
        filters.push(["Employee Monthly Award", "employee", "=", params.employee]);
    }
    if (params.rank) {
        filters.push(["Employee Monthly Award", "rank", "=", params.rank]);
    }
    if (params.type && params.type !== 'all') {
        if (params.type === 'Auto') {
            filters.push(["Employee Monthly Award", "is_auto_generated", "=", 1]);
        } else if (params.type === 'Manual') {
            filters.push(["Employee Monthly Award", "manually_selected", "=", 1]);
        }
    }
    if (params.status && params.status !== 'all') {
        filters.push(["Employee Monthly Award", "published", "=", params.status === 'Published' ? 1 : 0]);
    }

    const or_filters: any[] = [];
    if (params.search) {
        or_filters.push(["Employee Monthly Award", "employee", "like", `%${params.search}%`]);
        or_filters.push(["Employee Monthly Award", "employee_name", "like", `%${params.search}%`]);
    }

    let orderBy = "modified desc";
    if (params.sort_by) {
        const parts = params.sort_by.split('_');
        const direction = parts.pop();
        const field = parts.join('_');
        orderBy = `${field} ${direction}, name ${direction}`;
    }

    const query = new URLSearchParams({
        doctype: "Employee Monthly Award",
        fields: JSON.stringify([
            "name", "employee", "employee_name", "month", 
            "attendance_score", "personality_score", "login_score", 
            "overtime_score", "leave_penalty", "total_score", 
            "rank", "published", "is_auto_generated", "manually_selected",
            "calculation_log", "modified"
        ]),
        filters: JSON.stringify(filters),
        or_filters: JSON.stringify(or_filters),
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderBy
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Employee Monthly Award&filters=${encodeURIComponent(JSON.stringify(filters))}&or_filters=${encodeURIComponent(JSON.stringify(or_filters))}`)
    ]);

    if (!res.ok) throw new Error("Failed to fetch employee monthly awards");

    return {
        data: (await res.json()).message || [],
        total: (await countRes.json()).message || 0
    };
}

export interface EmployeeAwardSettings {
    name: string;
    attendance_weight: number;
    personality_weight: number;
    login_time_weight: number;
    overtime_weight: number;
    leave_penalty_weight: number;
    daily_working_hours: number;
    leave_penalty_per_day: number;
    auto_publish: number;
    display_days: number;
}

export async function fetchEmployeeAwardSettings() {
    const res = await frappeRequest('/api/resource/Employee Award Settings/Employee Award Settings');
    if (!res.ok) throw new Error("Failed to fetch employee award settings");
    const json = await res.json();
    return json.data as EmployeeAwardSettings;
}

export async function updateEmployeeAwardSettings(data: Partial<EmployeeAwardSettings>) {
    const res = await frappeRequest('/api/method/frappe.client.set_value', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doctype: 'Employee Award Settings',
            name: 'Employee Award Settings',
            fieldname: data
        })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to update employee award settings"));
    }
    return (await res.json()).message;
}

export async function generateMonthlyAwards(month?: string) {
    const url = month 
        ? `/api/method/company.company.doctype.employee_monthly_award.employee_monthly_award.calculate_monthly_awards?month=${month}`
        : `/api/method/company.company.doctype.employee_monthly_award.employee_monthly_award.calculate_monthly_awards`;
    
    const res = await frappeRequest(url, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to generate monthly awards"));
    }
    return (await res.json()).message;
}

export async function publishMonthlyAward(name: string, publish: number) {
    const res = await frappeRequest('/api/method/frappe.client.set_value', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doctype: 'Employee Monthly Award',
            name,
            fieldname: { published: publish }
        })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to publish award"));
    }
    return (await res.json()).message;
}
export async function deleteEmployeeMonthlyAward(name: string) {
    const res = await frappeRequest(`/api/resource/Employee Monthly Award/${name}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to delete award"));
    }
    return true;
}

export async function updateEmployeeMonthlyAward(name: string, data: any) {
    const res = await frappeRequest(`/api/resource/Employee Monthly Award/${name}`, {
        method: 'PUT',
        headers: await getAuthHeaders(),
        body: JSON.stringify(data)
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to update award"));
    }
    return (await res.json()).data;
}
