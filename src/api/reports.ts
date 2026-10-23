import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

export async function runReport(reportName: string, filters: any = {}) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest('/api/method/frappe.desk.query_report.run', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            report_name: reportName,
            filters: JSON.stringify(filters),
        }),
    });

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, 'Failed to run report'));
    }

    const data = await res.json();
    return data.message;
}

export async function getReportFilters(reportName: string) {
    const res = await frappeRequest(`/api/method/frappe.desk.query_report.get_script?report_name=${reportName}`);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch report filters'));
    }

    const data = await res.json();
    return data.message;
}

export async function getDailyAttendanceSummary(date: string, loadAll: boolean = false) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest(
        '/api/method/company.company.report.attendance_report.attendance_report.get_daily_attendance_summary',
        {
            method: 'POST',
            headers,
            body: JSON.stringify({ date, load_all: loadAll ? 1 : 0 }),
        }
    );

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, 'Failed to fetch daily attendance summary'));
    }

    const data = await res.json();
    return data.message;
}

export async function getDailyAttendanceByDepartment(date: string, department: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest(
        '/api/method/company.company.report.attendance_report.attendance_report.get_daily_attendance_by_department',
        {
            method: 'POST',
            headers,
            body: JSON.stringify({ date, department }),
        }
    );

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, `Failed to fetch attendance for ${department}`));
    }

    const data = await res.json();
    return data.message;
}


