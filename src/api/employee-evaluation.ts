import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

export interface EmployeeEvaluationTrait {
    name: string;
    trait_name: string;
    category?: string;
    description?: string;
    how_to_improve?: string;
    evaluation_scores?: {
        evaluation_point: string;
        score: number;
    }[];
    modified_by: string;
}

export interface EmployeeEvaluationEvent {
    name: string;
    employee: string;
    employee_name?: string;
    trait: string;
    evaluation_type: string;
    evaluation_date: string;
    score_change: number;
    hr_user: string;
    remarks?: string;
    how_to_improve?: string;
    docstatus: number;
    auto_submit?: number;
    modified_by: string;
    modified: string;
}

export interface EmployeeEvaluationScoreLog {
    name: string;
    employee: string;
    employee_name?: string;
    previous_score: number;
    change: number;
    new_score: number;
    reason: string;
    date: string;
    modified_by: string;
}

// APIs for Evaluation Trait
export async function fetchEmployeeEvaluationTraits(params: {
    page: number;
    page_size: number;
    search?: string;
    sort_by?: string;
    category?: string;
}) {
    const filters: any[] = [];
    if (params.category) {
        filters.push(["Evaluation Trait", "category", "like", `%${params.category}%`]);
    }
    const or_filters: any[] = [];

    if (params.search) {
        or_filters.push(["Evaluation Trait", "trait_name", "like", `%${params.search}%`]);
        or_filters.push(["Evaluation Trait", "category", "like", `%${params.search}%`]);
    }

    let orderBy = "modified_by desc";
    if (params.sort_by) {
        const parts = params.sort_by.split('_');
        const direction = parts.pop();
        const field = parts.join('_');
        orderBy = `${field} ${direction}, name ${direction}`;
    }

    const query = new URLSearchParams({
        doctype: "Evaluation Trait",
        fields: JSON.stringify(["name", "trait_name", "category", "description", "modified_by"]),
        filters: JSON.stringify(filters),
        or_filters: JSON.stringify(or_filters),
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderBy
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Evaluation Trait&filters=${encodeURIComponent(JSON.stringify(filters))}&or_filters=${encodeURIComponent(JSON.stringify(or_filters))}`)
    ]);

    if (!res.ok) throw new Error("Failed to fetch evaluation traits");

    return {
        data: (await res.json()).message || [],
        total: (await countRes.json()).message || 0
    };
}

export async function fetchEmployeeEvaluationTrait(name: string): Promise<EmployeeEvaluationTrait> {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Evaluation Trait&name=${name}`);
    if (!res.ok) throw new Error("Failed to fetch evaluation trait details");
    return (await res.json()).message;
}

export async function createEmployeeEvaluationTrait(data: Partial<EmployeeEvaluationTrait>) {
    const res = await frappeRequest('/api/method/frappe.client.insert', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doc: {
                doctype: 'Evaluation Trait',
                ...data
            }
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to create evaluation trait"));
    }
    return (await res.json()).message;
}

export async function updateEmployeeEvaluationTrait(name: string, data: Partial<EmployeeEvaluationTrait>) {
    const res = await frappeRequest('/api/method/frappe.client.set_value', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doctype: 'Evaluation Trait',
            name,
            fieldname: data
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to update evaluation trait"));
    }
    return (await res.json()).message;
}

export async function deleteEmployeeEvaluationTrait(name: string) {
    const res = await frappeRequest('/api/method/frappe.client.delete', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doctype: 'Evaluation Trait',
            name
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to delete evaluation trait"));
    }
    return (await res.json()).message;
}

export interface EvaluationTraitCategory {
    name: string;
    category_name: string;
}

export async function fetchEmployeeEvaluationTraitCategories() {
    const query = new URLSearchParams({
        doctype: "Evaluation Trait Category",
        fields: JSON.stringify(["name", "category_name"]),
        limit_page_length: "None"
    });

    const res = await frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch evaluation trait categories");

    return (await res.json()).message || [];
}

export async function createEmployeeEvaluationTraitCategory(data: Partial<EvaluationTraitCategory>) {
    const res = await frappeRequest('/api/method/frappe.client.insert', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doc: {
                doctype: 'Evaluation Trait Category',
                ...data
            }
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to create evaluation trait category"));
    }
    return (await res.json()).message;
}

export async function updateEmployeeEvaluationTraitCategory(name: string, data: Partial<EvaluationTraitCategory>) {
    const res = await frappeRequest('/api/method/frappe.client.set_value', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doctype: 'Evaluation Trait Category',
            name,
            fieldname: data
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to update evaluation trait category"));
    }
    return (await res.json()).message;
}

export async function deleteEmployeeEvaluationTraitCategory(name: string) {
    const res = await frappeRequest('/api/method/frappe.client.delete', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doctype: 'Evaluation Trait Category',
            name
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to delete evaluation trait category"));
    }
    return (await res.json()).message;
}

// APIs for Evaluation Point
export interface EmployeeEvaluationPoint {
    name: string;
    point_name: string;
    default_score: number;
}

export async function fetchEmployeeEvaluationPoints() {
    const query = new URLSearchParams({
        doctype: "Evaluation Point",
        fields: JSON.stringify(["name", "point_name", "default_score"]),
        limit_page_length: "None"
    });

    const res = await frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch evaluation points");

    return (await res.json()).message || [];
}

// APIs for Employee Evaluation
export async function fetchEmployeeEvaluationEvents(params: {
    page: number;
    page_size: number;
    search?: string;
    sort_by?: string;
    employee?: string;
    trait?: string;
    evaluation_type?: string;
    docstatus?: number;
    startDate?: string;
    endDate?: string;
}) {
    const filters: any[] = [];
    if (params.employee) filters.push(["Employee Evaluation", "employee", "=", params.employee]);
    if (params.trait) filters.push(["Employee Evaluation", "trait", "=", params.trait]);
    if (params.evaluation_type && params.evaluation_type !== 'all') {
        filters.push(["Employee Evaluation", "evaluation_type", "=", params.evaluation_type]);
    }
    if (params.docstatus !== undefined && params.docstatus !== null) {
        filters.push(["Employee Evaluation", "docstatus", "=", params.docstatus]);
    }
    if (params.startDate) {
        filters.push(["Employee Evaluation", "evaluation_date", ">=", params.startDate]);
    }
    if (params.endDate) {
        filters.push(["Employee Evaluation", "evaluation_date", "<=", params.endDate]);
    }

    const or_filters: any[] = [];

    if (params.search) {
        or_filters.push(["Employee Evaluation", "employee", "like", `%${params.search}%`]);
        or_filters.push(["Employee Evaluation", "employee_name", "like", `%${params.search}%`]);
        or_filters.push(["Employee Evaluation", "trait", "like", `%${params.search}%`]);
    }

    let orderBy = "modified_by desc";
    if (params.sort_by) {
        const parts = params.sort_by.split('_');
        const direction = parts.pop();
        const field = parts.join('_');
        orderBy = `${field} ${direction}, name ${direction}`;
    }

    const query = new URLSearchParams({
        doctype: "Employee Evaluation",
        fields: JSON.stringify(["name", "employee", "employee_name", "trait", "evaluation_type", "evaluation_date", "score_change", "hr_user", "remarks", "how_to_improve", "docstatus", "modified_by", "modified"]),
        filters: JSON.stringify(filters),
        or_filters: JSON.stringify(or_filters),
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderBy
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Employee Evaluation&filters=${encodeURIComponent(JSON.stringify(filters))}&or_filters=${encodeURIComponent(JSON.stringify(or_filters))}`)
    ]);

    if (!res.ok) throw new Error("Failed to fetch employee evaluations");

    return {
        data: (await res.json()).message || [],
        total: (await countRes.json()).message || 0
    };
}

// APIs for Employee Evaluation Score Log
export async function fetchEmployeeEvaluationScoreLogs(params: {
    page: number;
    page_size: number;
    search?: string;
    sort_by?: string;
    employee?: string;
    startDate?: string;
    endDate?: string;
}) {
    const filters: any[] = [];
    if (params.employee) {
        filters.push(["Employee Evaluation Score Log", "employee", "=", params.employee]);
    }
    if (params.startDate) {
        filters.push(["Employee Evaluation Score Log", "date", ">=", params.startDate]);
    }
    if (params.endDate) {
        filters.push(["Employee Evaluation Score Log", "date", "<=", `${params.endDate} 23:59:59`]);
    }
    const or_filters: any[] = [];

    if (params.search) {
        or_filters.push(["Employee Evaluation Score Log", "employee", "like", `%${params.search}%`]);
        or_filters.push(["Employee Evaluation Score Log", "employee_name", "like", `%${params.search}%`]);
        or_filters.push(["Employee Evaluation Score Log", "reason", "like", `%${params.search}%`]);
    }

    let orderBy = "modified_by desc";
    if (params.sort_by) {
        const parts = params.sort_by.split('_');
        const direction = parts.pop();
        const field = parts.join('_');
        orderBy = `${field} ${direction}, name ${direction}`;
    }

    const query = new URLSearchParams({
        doctype: "Employee Evaluation Score Log",
        fields: JSON.stringify(["name", "employee", "employee_name", "previous_score", "change", "new_score", "reason", "date", "modified_by"]),
        filters: JSON.stringify(filters),
        or_filters: JSON.stringify(or_filters),
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderBy
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Employee Evaluation Score Log&filters=${encodeURIComponent(JSON.stringify(filters))}&or_filters=${encodeURIComponent(JSON.stringify(or_filters))}`)
    ]);

    if (!res.ok) throw new Error("Failed to fetch employee evaluation score logs");

    return {
        data: (await res.json()).message || [],
        total: (await countRes.json()).message || 0
    };
}

export async function createEmployeeEvaluationEvent(data: Partial<EmployeeEvaluationEvent>) {
    const res = await frappeRequest('/api/method/frappe.client.insert', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doc: {
                doctype: 'Employee Evaluation',
                ...data
            }
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to create employee evaluation"));
    }
    return (await res.json()).message;
}

export async function submitEmployeeEvaluationEvent(doc: Partial<EmployeeEvaluationEvent> & { doctype: string }) {
    const res = await frappeRequest('/api/method/frappe.client.submit', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doc
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to submit employee evaluation"));
    }
    return (await res.json()).message;
}

export async function cancelEmployeeEvaluationEvent(name: string) {
    const res = await frappeRequest('/api/method/frappe.client.cancel', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doctype: 'Employee Evaluation',
            name
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to cancel employee evaluation"));
    }
    return (await res.json()).message;
}

export async function deleteEmployeeEvaluationEvent(name: string) {
    const res = await frappeRequest('/api/method/company.company.doctype.employee_evaluation.employee_evaluation.hard_delete_evaluation', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            name
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to delete employee evaluation"));
    }
    return (await res.json()).message;
}

export async function updateEmployeeEvaluationEvent(name: string, data: Partial<EmployeeEvaluationEvent>) {
    const res = await frappeRequest('/api/method/frappe.client.set_value', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            doctype: 'Employee Evaluation',
            name,
            fieldname: data
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to update employee evaluation"));
    }
    return (await res.json()).message;
}

export async function resetEmployeeScores(password: string, employees?: string[]) {
    const res = await frappeRequest('/api/method/company.company.doctype.employee_evaluation.employee_evaluation.reset_employee_scores', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
            password,
            employees: employees ? JSON.stringify(employees) : undefined
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to reset scores"));
    }
    return (await res.json()).message;
}

// ─── Evaluation Automation Rules ─────────────────────────────────────────────

export interface EvaluationAutomationRule {
    name: string;
    rule_name: string;
    event_type: 'Late Login' | 'Early Exit' | 'Task Delayed' | 'Milestone Achieved' | 'Continuous Presence' | 'Daily Log Submission' | 'Specific Day Leave' | 'Specific Date Leave';
    enabled: number;
    auto_submit: number;
    trait: string;
    evaluation_point: string;
    late_login_after?: string;
    early_exit_before?: string;
    break_duration_after?: number;
    specific_day?: string;
    specific_date?: string;
    description?: string;
    how_to_improve?: string;
}

export async function fetchEvaluationAutomationRules(params: {
    page: number;
    page_size: number;
    search?: string;
    sort_by?: string;
    event_type?: string;
    enabled?: number;
}) {
    const filters: any[] = [];
    if (params.event_type && params.event_type !== 'all') {
        filters.push(["Evaluation Automation Rule", "event_type", "=", params.event_type]);
    }
    if (params.enabled !== undefined && params.enabled !== null) {
        filters.push(["Evaluation Automation Rule", "enabled", "=", params.enabled]);
    }

    const or_filters: any[] = [];

    if (params.search) {
        or_filters.push(["Evaluation Automation Rule", "rule_name", "like", `%${params.search}%`]);
        or_filters.push(["Evaluation Automation Rule", "event_type", "like", `%${params.search}%`]);
        or_filters.push(["Evaluation Automation Rule", "trait", "like", `%${params.search}%`]);
    }

    let orderBy = "modified desc";
    if (params.sort_by) {
        const parts = params.sort_by.split('_');
        const direction = parts.pop();
        const field = parts.join('_');
        orderBy = `${field} ${direction}, name ${direction}`;
    }

    const query = new URLSearchParams({
        doctype: "Evaluation Automation Rule",
        fields: JSON.stringify(["name", "rule_name", "event_type", "enabled", "auto_submit", "trait", "evaluation_point", "late_login_after", "early_exit_before", "break_duration_after", "specific_day", "specific_date", "description", "how_to_improve"]),
        filters: JSON.stringify(filters),
        or_filters: JSON.stringify(or_filters),
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderBy
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Evaluation Automation Rule&filters=${encodeURIComponent(JSON.stringify(filters))}&or_filters=${encodeURIComponent(JSON.stringify(or_filters))}`)
    ]);

    if (!res.ok) throw new Error("Failed to fetch automation rules");

    return {
        data: (await res.json()).message || [],
        total: (await countRes.json()).message || 0
    };
}

export async function createEvaluationAutomationRule(data: Partial<EvaluationAutomationRule>) {
    const res = await frappeRequest('/api/method/frappe.client.insert', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ doc: { doctype: 'Evaluation Automation Rule', ...data } })
    });
    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to create automation rule"));
    }
    return (await res.json()).message;
}

export async function updateEvaluationAutomationRule(name: string, data: Partial<EvaluationAutomationRule>) {
    const res = await frappeRequest('/api/method/frappe.client.set_value', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ doctype: 'Evaluation Automation Rule', name, fieldname: data })
    });
    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to update automation rule"));
    }
    return (await res.json()).message;
}

export async function deleteEvaluationAutomationRule(name: string) {
    const res = await frappeRequest('/api/method/frappe.client.delete', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ doctype: 'Evaluation Automation Rule', name })
    });
    if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        throw new Error(handleFrappeError(errorData, "Failed to delete automation rule"));
    }
    return (await res.json()).message;
}
