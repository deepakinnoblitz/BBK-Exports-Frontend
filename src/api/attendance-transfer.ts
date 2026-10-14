import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

export interface EligibleTransferEmployee {
    employee: string;
    employee_name: string;
    department: string;
    designation: string;
    shift: string;
    source_attendance: string;
    source_in_time: string;
    source_out_time: string;
    source_working_hours: number;
    source_working_hours_display: string;
    target_attendance: string | null;
    previous_target_status: string;
    is_eligible: boolean;
}

export interface AttendanceTransferBatch {
    name: string;
    source_date: string;
    target_date: string;
    total_employees: number;
    status: 'Submitted' | 'Reverted';
    transferred_by: string;
    transferred_by_name: string;
    transfer_datetime: string;
    reason: string;
    reverted_by_name?: string;
    revert_datetime?: string;
    revert_reason?: string;
    items?: AttendanceTransferItem[];
}

export interface AttendanceTransferItem {
    name?: string;
    employee: string;
    employee_name: string;
    department: string;
    designation: string;
    source_attendance: string;
    source_in_time: string;
    source_out_time: string;
    source_working_hours: number;
    target_attendance: string;
    previous_target_status: string;
    new_target_status: string;
}

export async function checkSuperAdminStatus(): Promise<boolean> {
    try {
        const res = await frappeRequest('/api/method/company.company.attendance_transfer_api.check_super_admin_status');
        const json = await res.json();
        return !!json.message?.is_super_admin;
    } catch {
        return false;
    }
}

export async function getEligibleTransferEmployees(params: {
    sourceDate: string;
    targetDate: string;
    department?: string;
    search?: string;
}): Promise<{ employees: EligibleTransferEmployee[]; message?: string }> {
    const query = new URLSearchParams({
        source_date: params.sourceDate,
        target_date: params.targetDate,
        ...(params.department ? { department: params.department } : {}),
        ...(params.search ? { search: params.search } : {})
    });

    const res = await frappeRequest(`/api/method/company.company.attendance_transfer_api.get_eligible_transfer_employees?${query.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to fetch eligible employees'));
    return json.message;
}

export async function executeBulkAttendanceTransfer(payload: {
    sourceDate: string;
    targetDate: string;
    employeeData: EligibleTransferEmployee[];
    reason: string;
}) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest('/api/method/company.company.attendance_transfer_api.execute_bulk_attendance_transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            source_date: payload.sourceDate,
            target_date: payload.targetDate,
            employee_data: payload.employeeData,
            reason: payload.reason
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to execute attendance transfer'));
    return json.message;
}

export async function getAttendanceTransferHistory(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
}): Promise<{ data: AttendanceTransferBatch[]; total: number; page: number; page_size: number }> {
    const query = new URLSearchParams({
        page: String(params.page || 1),
        page_size: String(params.pageSize || 20),
        ...(params.search ? { search: params.search } : {}),
        ...(params.fromDate ? { from_date: params.fromDate } : {}),
        ...(params.toDate ? { to_date: params.toDate } : {}),
        ...(params.status ? { status: params.status } : {})
    });

    const res = await frappeRequest(`/api/method/company.company.attendance_transfer_api.get_attendance_transfer_history?${query.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to fetch transfer history'));
    return json.message;
}

export async function getAttendanceTransferDetails(transferId?: string | null, attendanceId?: string | null): Promise<AttendanceTransferBatch> {
    const query = new URLSearchParams({
        ...(transferId ? { transfer_id: transferId } : {}),
        ...(attendanceId ? { attendance_id: attendanceId } : {})
    });
    const res = await frappeRequest(`/api/method/company.company.attendance_transfer_api.get_attendance_transfer_details?${query.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to fetch transfer details'));
    return json.message;
}

export async function revertAttendanceTransfer(payload: {
    transferId: string;
    revertReason: string;
}) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest('/api/method/company.company.attendance_transfer_api.revert_attendance_transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            transfer_id: payload.transferId,
            revert_reason: payload.revertReason
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to revert attendance transfer'));
    return json.message;
}
