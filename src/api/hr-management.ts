import { frappeRequest } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

// Generic fetch function for Frappe list
export async function fetchFrappeList(doctype: string, params: {
    page: number;
    page_size: number;
    search?: string;
    searchField?: string;
    filters?: any[];
    or_filters?: any[];
    fields?: string[];
    orderBy?: string;
    order?: 'asc' | 'desc';
    unread_messages?: boolean;
    unread_only?: boolean;
}) {
    const filters: any[] = params.filters || [];

    if (params.search && params.searchField) {
        filters.push([doctype, params.searchField, "like", `%${params.search}%`]);
    }

    let orderByParam = "creation desc";
    if (params.orderBy) {
        if (params.order) {
            orderByParam = `${params.orderBy} ${params.order}`;
        } else {
            // Handle combined string like "upload_date_desc" or "upload_date desc"
            const parts = params.orderBy.split(/[ _]/);
            const direction = parts[parts.length - 1].toLowerCase();
            if (direction === 'asc' || direction === 'desc') {
                parts.pop();
                orderByParam = `${parts.join('_')} ${direction}`;
            } else {
                orderByParam = `${params.orderBy} desc`;
            }
        }
    }

    const query = new URLSearchParams({
        doctype,
        fields: JSON.stringify(params.fields || ["*"]),
        filters: JSON.stringify(filters),
        or_filters: params.or_filters ? JSON.stringify(params.or_filters) : "[]",
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderByParam,
        _: String(Date.now())
    });

    if (params.unread_messages) {
        query.append('unread_messages', 'true');
    }
    if (params.unread_only) {
        query.append('unread_only', 'true');
    }


    const fullUrl = `/api/method/frappe.client.get_list?${query.toString()}`;
    console.log(`[API] Fetching ${doctype}: ${fullUrl}`);

    // Fetch data and count in parallel
    const [res, countRes] = await Promise.all([
        frappeRequest(fullUrl),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=${doctype}&filters=${encodeURIComponent(JSON.stringify(filters))}&or_filters=${params.or_filters ? encodeURIComponent(JSON.stringify(params.or_filters)) : "[]"}${params.unread_messages ? '&unread_messages=true' : ''}`)
    ]);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, `Failed to fetch ${doctype}`));
    }
    const data = await res.json();
    const countData = await countRes.json();

    return {
        data: data.message || [],
        total: countData.message || 0
    };
}

// Generic fetch for a single document
export async function getHRDoc(doctype: string, name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=${doctype}&name=${name}`);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, `Failed to fetch ${doctype} details`));
    }

    return (await res.json()).message;
}

// DocType Metadata API
export async function getDocTypeMetadata(doctype: string) {
    const res = await frappeRequest(`/api/method/frappe.desk.form.load.getdoctype?doctype=${doctype}`);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, `Failed to fetch metadata for ${doctype}`));
    }
    const json = await res.json();
    return json.docs?.[0] || json.message;
}

// Salary Component API
export async function fetchSalaryComponents() {
    const res = await frappeRequest(`/api/method/frappe.client.get_list?doctype=Salary Structure Component&fields=${JSON.stringify(["component_name", "type", "percentage", "static_amount", "is_default"])}&limit_page_length=100`);
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to fetch salary components"));
    return json.message || [];
}

export async function createSalaryComponent(data: {
    component_name: string;
    type: 'Earning' | 'Deduction';
    percentage?: number;
    static_amount?: number;
    is_default?: number;
}) {
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        body: JSON.stringify({
            doc: {
                doctype: "Salary Structure Component",
                ...data
            }
        })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create salary component"));
    return json.message;
}

// Generic Permission API
export async function getHRPermissions(doctype: string) {
    const res = await frappeRequest(`/api/method/company.company.frontend_api.get_doc_permissions?doctype=${doctype}`);
    if (!res.ok) return { read: false, write: false, delete: false };
    const json = await res.json();
    return json.message || { read: false, write: false, delete: false };
}

// Create Department API
interface CreateDepartmentParams {
    department_name: string;
    department_code?: string;
    department_head?: string;
    status?: string;
    description?: string;
}

export async function createDepartment(data: CreateDepartmentParams) {
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        body: JSON.stringify({
            doc: {
                doctype: "Department",
                ...data
            }
        })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create department"));
    return json.message;
}

// Create Designation API
export async function createDesignation(data: { designation_name: string; department: string; description?: string }) {
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        body: JSON.stringify({
            doc: {
                doctype: "Designation",
                designation_name: data.designation_name,
                department: data.department,
                description: data.description
            }
        })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create designation"));
    return json.message;
}

// Fetch HR Settings
export async function getHRSettings() {
    const res = await frappeRequest("/api/method/company.company.api.get_hrms_settings");
    if (!res.ok) {
        return {
            default_currency: "INR",
            currency_symbol: "₹",
            default_locale: "en-IN"
        };
    }
    const json = await res.json();
    return json.message || {
        default_currency: "INR",
        currency_symbol: "₹",
        default_locale: "en-IN"
    };
}
