import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { fetchFrappeList } from './hr-management';

export interface Attendance {
    name: string;
    employee: string;
    employee_name: string;
    attendance_date: string;
    status: 'Present' | 'Absent' | 'On Leave' | 'Holiday' | 'Half Day' | 'Missing' | 'Compensatory Off';
    in_time?: string;
    out_time?: string;
    leave_type?: string;
    shift?: string;
    working_hours_display?: string;
    official_overtime?: string;
    unofficial_overtime?: string;
}

// Attendance APIs
export const fetchAttendance = (params: any) => {
    const { search, ...rest } = params;
    const cleanSearch = search?.trim();

    const or_filters = rest.or_filters || [];

    if (cleanSearch) {
        or_filters.push(
            ["Attendance", "employee_name", "like", `%${cleanSearch}%`],
            ["Attendance", "employee", "like", `%${cleanSearch}%`]
        );
    }

    return fetchFrappeList("Attendance", { ...rest, or_filters });
};

export async function createAttendance(data: Partial<Attendance>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/company.company.doctype.attendance.attendance.save_attendance_record", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create attendance record"));
    return json.message;
}

export async function updateAttendance(name: string, data: Partial<Attendance>) {
    const headers = await getAuthHeaders();

    const payloadDoc = {
        ...data,
        name,
    };

    const res = await frappeRequest('/api/method/company.company.doctype.attendance.attendance.save_attendance_record', {
        method: 'POST',
        headers,
        body: JSON.stringify({ doc: payloadDoc }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to update attendance record'));
    return json.message;
}

export async function deleteAttendance(name: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Attendance", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete attendance record"));
    return true;
}

export async function getAttendance(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Attendance&name=${name}`);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, `Failed to fetch Attendance details`));
    }

    const data = await res.json();
    return data.message;
}
