import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { fetchFrappeList } from './hr-management';

export interface Employee {
    name: string;
    employee_id: string;
    employee_name: string;
    father_husband_name?: string;
    email: string;
    phone?: string;
    department?: string;
    designation?: string;
    status: 'Active' | 'Inactive';
    date_of_joining?: string;
    date_of_leaving?: string;
    personal_email?: string;
    dob?: string;
    blood_group?: string;
    sex?: string;
    employee_type?: string;
    production_type?: string;
    uan_number?: string;
    marital_status?: string;
    qualification?: string;
    aadhar_number?: string;
    pan_number?: string;
    pf_number?: string;
    esi_no?: string;
    skill?: string;
    line_order?: string;
    shift?: string;
    weekly_off?: string;
    full_address?: string;
    bank_account?: string;
    bus_travel_route?: string;
    bus_route_point?: string;
}

// Employee APIs
export const fetchEmployees = (params: any) => {
    const { search, ...restParams } = params;

    // If there's a search query, create or_filters to search across multiple fields
    const or_filters = search ? [
        ["Employee", "employee_name", "like", `%${search}%`],
        ["Employee", "name", "like", `%${search}%`],
    ] : undefined;

    // Merge search-based or_filters with any existing or_filters from params
    const combined_or_filters = [
        ...(params.or_filters || []),
        ...(or_filters || [])
    ];

    return fetchFrappeList("Employee", {
        ...restParams,
        search: undefined,
        or_filters: combined_or_filters.length > 0 ? combined_or_filters : undefined
    });
};

function sanitizeEmployeeDoc<T extends Record<string, any>>(data: T): T {
    const doc: any = { ...data };
    if (doc.face_descriptor && typeof doc.face_descriptor === 'object') {
        doc.face_descriptor = JSON.stringify(doc.face_descriptor);
    }
    if (doc.face_3d_landmarks && typeof doc.face_3d_landmarks === 'object') {
        doc.face_3d_landmarks = JSON.stringify(doc.face_3d_landmarks);
    }
    return doc;
}

export async function createEmployee(data: Partial<Employee>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: sanitizeEmployeeDoc({ doctype: "Employee", ...data }) })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create employee"));
    return json.message;
}

export async function updateEmployee(name: string, data: Partial<Employee>) {
    const headers = await getAuthHeaders();

    const payloadDoc = sanitizeEmployeeDoc({
        doctype: "Employee",
        ...data,
        name
    });

    let res = await frappeRequest("/api/method/frappe.client.save", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: payloadDoc })
    });
    let json = await res.json();
    if (!res.ok) {
        // If a timestamp mismatch occurs (e.g. background save touched the document), fetch latest modified and retry once
        const errMsg = JSON.stringify(json);
        if (json.exc_type === "TimestampMismatchError" || errMsg.includes("modified after you have opened it")) {
            const latest = await getEmployee(name);
            if (latest?.modified) {
                res = await frappeRequest("/api/method/frappe.client.save", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        doc: sanitizeEmployeeDoc({
                            doctype: "Employee",
                            ...data,
                            modified: latest.modified,
                            name
                        })
                    })
                });
                json = await res.json();
                if (res.ok) return json.message;
            }
        }
        throw new Error(handleFrappeError(json, "Failed to update employee"));
    }
    return json.message;
}

export async function deleteEmployee(name: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Employee", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete employee"));
    return true;
}

export async function getEmployee(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Employee&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch employee details");
    return (await res.json()).message;
}

export async function getNextEmployeeId(): Promise<string> {
    try {
        const res = await frappeRequest('/api/method/company.company.api.get_next_employee_id');
        if (!res.ok) return '';
        const json = await res.json();
        return json.message || '';
    } catch {
        return '';
    }
}

export async function renameEmployee(oldName: string, newName: string): Promise<string> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest('/api/method/frappe.client.rename_doc', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doctype: 'Employee',
            old_name: oldName.trim(),
            new_name: newName.trim(),
            merge: 0,
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, `Failed to rename Employee from ${oldName} to ${newName}`));
    return json.message || newName.trim();
}

export async function bulkImportEmployees(rows: any[], updateExisting: boolean = false, bankAccounts: any[] = []) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/company.company.api.bulk_import_employees", {
        method: "POST",
        headers,
        body: JSON.stringify({
            rows: JSON.stringify(rows),
            update_existing: updateExisting ? 1 : 0,
            bank_accounts: JSON.stringify(bankAccounts)
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Bulk import failed"));
    return json.message;
}
