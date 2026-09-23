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
    uan_number?: string;
    marital_status?: string;
    qualification?: string;
    aadhar_number?: string;
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

export async function createEmployee(data: Partial<Employee>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Employee", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create employee"));
    return json.message;
}

export async function updateEmployee(name: string, data: Partial<Employee>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.save", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doc: {
                doctype: "Employee",
                ...data,
                name
            }
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update employee"));
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
