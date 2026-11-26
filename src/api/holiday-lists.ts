import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

export interface HolidayList {
    name: string;
    holiday_list_name: string;
    year: number;
    month_year: string;
    working_days: number;
    creation?: string;
    modified?: string;
}

async function fetchFrappeList(params: {
    page: number;
    page_size: number;
    search?: string;
    orderBy?: string;
    order?: 'asc' | 'desc';
}) {
    const filters: any[] = [];
    const or_filters: any[] = [];

    if (params.search) {
        or_filters.push(
            ['Holiday List', 'holiday_list_name', 'like', `%${params.search}%`],
            ['Holiday List', 'year', 'like', `%${params.search}%`],
            ['Holiday List', 'month_year', 'like', `%${params.search}%`]
        );
    }

    const orderByParam = params.orderBy && params.order ? `${params.orderBy} ${params.order}` : "year desc, month desc";

    const query = new URLSearchParams({
        doctype: 'Holiday List',
        fields: JSON.stringify(["*"]),
        filters: JSON.stringify(filters),
        or_filters: JSON.stringify(or_filters),
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderByParam
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Holiday List&filters=${encodeURIComponent(JSON.stringify(filters))}&or_filters=${encodeURIComponent(JSON.stringify(or_filters))}`)
    ]);

    if (!res.ok) throw new Error("Failed to fetch holiday lists");

    const data = await res.json();
    const countData = await countRes.json();

    return {
        data: data.message || [],
        total: countData.message || 0
    };
}

export const fetchHolidayLists = (params: any) => fetchFrappeList(params);

export async function createHolidayList(data: Partial<HolidayList>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Holiday List", ...data } })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to create holiday list"));
    }

    return (await res.json()).message;
}

export async function updateHolidayList(name: string, data: Partial<HolidayList>) {
    const headers = await getAuthHeaders();
    let targetName = name;
    const requestedName = data.holiday_list_name?.trim();

    if (requestedName && requestedName !== name) {
        const renameRes = await frappeRequest("/api/method/frappe.client.rename_doc", {
            method: "POST",
            headers,
            body: JSON.stringify({
                doctype: "Holiday List",
                old_name: name,
                new_name: requestedName,
                merge: false
            })
        });

        if (!renameRes.ok) {
            const error = await renameRes.json();
            throw new Error(handleFrappeError(error, "Failed to rename holiday list"));
        }

        const renameJson = await renameRes.json();
        targetName = renameJson.message || requestedName;
    }

    const { holiday_list_name, ...restData } = data;
    const payload = targetName !== name ? restData : data;

    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Holiday List",
            name: targetName,
            fieldname: payload
        })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to update holiday list"));
    }

    return (await res.json()).message;
}

export async function deleteHolidayList(name: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Holiday List", name })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to delete holiday list"));
    }

    return true;
}

export async function getHolidayList(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Holiday List&name=${encodeURIComponent(name)}`);

    if (!res.ok) {
        throw new Error("Failed to fetch holiday list details");
    }

    return (await res.json()).message;
}

export async function getHolidayListPermissions() {
    const res = await frappeRequest("/api/method/company.company.frontend_api.get_doc_permissions?doctype=Holiday List");

    if (!res.ok) {
        return { read: false, write: false, delete: false };
    }

    return (await res.json()).message || { read: false, write: false, delete: false };
}

export async function populateHolidays(month: string, year: string) {
    const res = await frappeRequest(`/api/method/company.company.api.populate_holidays_for_ui?month=${month}&year=${year}`);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to populate holidays"));
    }

    return (await res.json()).message;
}
