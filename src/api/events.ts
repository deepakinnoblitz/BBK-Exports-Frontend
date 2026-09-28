import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';

import { handleResponse } from './utils';

export interface CalendarEvent {
    name: string;
    id?: string;
    realDocName?: string;
    originalEventName?: string;
    subject: string;
    starts_on: string;
    ends_on?: string;
    event_category?: string;
    event_type?: string;
    status?: string;
    description?: string;
    color?: string;
    all_day?: number;
    reference_doctype?: string;
    reference_docname?: string;
}

export async function fetchEvents(start?: string, end?: string): Promise<CalendarEvent[]> {
    const filters: any[] = [];
    if (start && end) {
        filters.push(["Event", "starts_on", "between", [start, end]]);
    }

    const query = new URLSearchParams({
        doctype: "Event",
        fields: JSON.stringify([
            "name",
            "subject",
            "starts_on",
            "ends_on",
            "event_category",
            "event_type",
            "status",
            "description",
            "color",
            "all_day",
            "reference_doctype",
            "reference_docname"
        ]),
        filters: JSON.stringify(filters),
        limit_page_length: "1000",
        order_by: "starts_on asc"
    });

    const res = await frappeRequest(
        `/api/method/frappe.client.get_list?${query.toString()}`
    );

    const data = await handleResponse(res);
    return data.message;
}

export async function createEvent(data: Partial<CalendarEvent>): Promise<any> {
    const headers = await getAuthHeaders();

    const res = await frappeRequest(`/api/method/frappe.client.insert`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doc: {
                doctype: "Event",
                ...data
            }
        })
    });

    const parsed = await handleResponse(res);
    return parsed.message;
}

export async function updateEvent(name: string, data: Partial<CalendarEvent>): Promise<any> {
    const headers = await getAuthHeaders();

    const res = await frappeRequest(`/api/method/frappe.client.set_value`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doctype: "Event",
            name,
            fieldname: data
        })
    });

    const parsed = await handleResponse(res);
    return parsed.message;
}

export async function deleteEvent(name: string): Promise<any> {
    const headers = await getAuthHeaders();

    const res = await frappeRequest(`/api/method/frappe.client.delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doctype: "Event",
            name
        })
    });

    const parsed = await handleResponse(res);
    return parsed.message;
}

export async function getEventPermissions() {
    const res = await frappeRequest("/api/method/company.company.frontend_api.get_doc_permissions?doctype=Event");

    if (!res.ok) {
        return { read: false, write: false, delete: false };
    }

    const data = await res.json();
    return data.message || { read: false, write: false, delete: false };
}

export async function getEvent(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Event&name=${name}`);

    if (!res.ok) {
        throw new Error("Failed to fetch event details");
    }

    return (await res.json()).message;
}

