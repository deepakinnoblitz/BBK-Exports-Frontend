import { frappeRequest } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

export interface DashboardStats {
    leads: number;
    contacts: number;
    deals: number;
    accounts: number;
    proposals: number;
    estimations: number;
    invoices: number;
    leads_by_status: Array<{ status: string; count: number }>;
    deals_by_stage: Array<{ stage: string; count: number }>;
    charts: {
        categories: string[];
        leads: number[];
        contacts: number[];
        accounts: number[];
        deals: number[];
        proposals: number[];
        estimations: number[];
        invoices: number[];
    };
}

export interface PersonalityDashboardData {
    totalScore: number;
    status: string;
    howToImprove?: string | string[] | null;
    lastUpdated?: string | null;
    traits: Array<{ trait: string; score: number }>;
    performance_breakdown?: Array<{ trait: string; score: number; impact: number }>;
    recent_evaluations?: Array<{ name: string; trait: string; score_change: number; creation: string; remarks: string }>;
}


export interface Call {
    name: string;
    title: string;
    call_for: string;
    lead_name?: string;
    call_start_time: string;
    call_end_time?: string;
    outgoing_call_status: string;
    call_purpose?: string;
}

export interface Meeting {
    name: string;
    title: string;
    meet_for: string;
    lead_name?: string;
    from: string;
    to?: string;
    outgoing_call_status: string;
    meeting_venue?: string;
    location?: string;
}

export interface TodayActivities {
    calls: Call[];
    meetings: Meeting[];
}

export async function fetchDashboardStats(start_date?: string, end_date?: string): Promise<DashboardStats> {
    try {
        let url = '/api/method/company.company.frontend_api.get_dashboard_stats';
        const params = new URLSearchParams();
        if (start_date) params.append('start_date', start_date);
        if (end_date) params.append('end_date', end_date);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await frappeRequest(url);

        if (!res.ok) {
            const error = await res.json();
            throw new Error(handleFrappeError(error, 'Failed to fetch dashboard stats'));
        }

        const data = await res.json();

        // Normalize backend keys (some endpoints return singular keys: proposal, estimation, invoice)
        const m = data.message || {};

        const charts = m.charts || {};

        return {
            leads: m.leads || 0,
            contacts: m.contacts || 0,
            deals: m.deals || 0,
            accounts: m.accounts || 0,
            proposals: m.proposals ?? m.proposal ?? 0,
            estimations: m.estimations ?? m.estimation ?? 0,
            invoices: m.invoices ?? m.invoice ?? 0,
            leads_by_status: m.leads_by_status || [],
            deals_by_stage: m.deals_by_stage || [],
            charts: {
                categories: charts.categories || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                leads: charts.leads || charts.lead || [0, 0, 0, 0, 0, 0, 0],
                contacts: charts.contacts || [0, 0, 0, 0, 0, 0, 0],
                accounts: charts.accounts || [0, 0, 0, 0, 0, 0, 0],
                deals: charts.deals || [0, 0, 0, 0, 0, 0, 0],
                proposals: charts.proposals ?? charts.proposal ?? [0, 0, 0, 0, 0, 0, 0],
                estimations: charts.estimations ?? charts.estimation ?? [0, 0, 0, 0, 0, 0, 0],
                invoices: charts.invoices ?? charts.invoice ?? [0, 0, 0, 0, 0, 0, 0],
            },
        };
    } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        // Return default zero values when API fails
        return {
            leads: 0,
            contacts: 0,
            accounts: 0,
            deals: 0,
            proposals: 0,
            estimations: 0,
            invoices: 0,
            leads_by_status: [],
            deals_by_stage: [],
            charts: {
                categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                leads: [0, 0, 0, 0, 0, 0, 0],
                contacts: [0, 0, 0, 0, 0, 0, 0],
                accounts: [0, 0, 0, 0, 0, 0, 0],
                deals: [0, 0, 0, 0, 0, 0, 0],
                proposals: [0, 0, 0, 0, 0, 0, 0],
                estimations: [0, 0, 0, 0, 0, 0, 0],
                invoices: [0, 0, 0, 0, 0, 0, 0]
            },
        };
    }
}

export async function fetchTodayActivities(): Promise<TodayActivities> {
    try {
        const res = await frappeRequest(
            '/api/method/company.company.frontend_api.get_today_activities'
        );

        if (!res.ok) {
            const error = await res.json();
            throw new Error(handleFrappeError(error, 'Failed to fetch today activities'));
        }

        const data = await res.json();
        return data.message;
    } catch (error) {
        console.error('Failed to fetch today activities:', error);
        // Return default empty arrays when API fails
        return {
            calls: [],
            meetings: [],
        };
    }
}
export interface HRDashboardData {
    announcements: Array<{ title: string; message: string; posting_date: string }>;
    total_employees: number;
    total_active_employees?: number;
    pending_leaves: number;
    present_today: number;
    today_present?: number;
    today_absent?: number;
    missing_attendance: number;
    todays_leaves: Array<{ employee_name: string; employee: string }>;
    todays_birthdays: Array<{ employee_name: string; employee: string }>;
    holidays: Array<{ date: string; description: string }>;
    pending_leaves_list: Array<{ name: string; employee_name: string; leave_type: string; from_date: string; to_date: string; total_days: number }>;
    pending_requests_list: Array<{ name: string; employee_name: string; subject: string; creation: string }>;
}

export interface EmployeeDashboardData {
    employee_name: string;
    employee: string;
    weekly_attendance: Array<{
        date: string;
        status: string;
        check_in: string | null;
        check_out: string | null;
        working_hours: number;
        holiday_info?: string;
        holiday_is_working_day: number;
    }>;
    leave_allocations: Array<{
        leave_type: string;
        total_leaves_allocated: number;
        total_leaves_taken: number;
    }>;
    monthly_attendance_breakdown: {
        present: number;
        absent: number;
        half_day: number;
        on_leave: number;
        holiday: number;
        missing: number;
        total_days: number;
        calendar_total: number;
        attendance_percentage: number;
    };
    missing_timesheets: Array<{ date: string }>;
    leave_dates?: string[];
    recent_leaves: Array<{
        name: string;
        leave_type: string;
        from_date: string;
        to_date: string;
        workflow_state: string;
        total_leave_days: number;
    }>;
    announcements: Array<{ title: string; message: string; posting_date: string }>;
    todays_birthdays: Array<{ employee_name: string; employee: string }>;
    todays_leaves: Array<{ employee_name: string; employee: string }>;
    holidays: Array<{ date: string; description: string }>;
    monthly_attendance_list: Array<{
        date: string;
        status: string;
        check_in: string | null;
        check_out: string | null;
        working_hours: number;
        holiday_info: string | null;
        holiday_is_working_day: number;
    }>;
    attendance_range?: string;
    in_probation: boolean;
    joining_date?: string | null;
    start_date?: string;
    end_date?: string;
    weekly_chart_source?: 'Attendance' | 'Daily Log';
    hide_missing?: boolean;
}

export async function fetchRecentAnnouncements(): Promise<any[]> {
    const res = await frappeRequest('/api/method/company.company.api.get_recent_announcements');
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch announcements'));
    }
    const data = await res.json();
    return data.message || [];
}

export async function fetchUpcomingRenewals(): Promise<any[]> {
    const res = await frappeRequest(
        '/api/method/company.company.api.get_upcoming_and_expired_renewals'
    );
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch upcoming renewals'));
    }
    const data = await res.json();
    return data.message || [];
}
export async function fetchMonthCalendarData(
    month?: number,
    year?: number
): Promise<{ calendar_data: any[]; joining_date: string | null }> {
    let url = '/api/method/company.company.api.get_month_calendar_data';
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    if (params.toString()) url += `?${params.toString()}&_=${Date.now()}`;
    else url += `?_=${Date.now()}`;

    const res = await frappeRequest(url);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch calendar data'));
    }
    const data = await res.json();
    return data.message || { calendar_data: [], joining_date: null };
}

export async function fetchMonthHolidays(month?: number, year?: number): Promise<any[]> {
    let url = '/api/method/company.company.api.get_month_holidays';
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    if (params.toString()) url += `?${params.toString()}`;

    const res = await frappeRequest(url);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch holidays'));
    }
    const data = await res.json();
    return data.message || [];
}

export async function fetchTodayBirthdays(): Promise<any[]> {
    const res = await frappeRequest('/api/method/company.company.api.get_today_birthdays');
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch birthdays'));
    }
    const data = await res.json();
    return data.message || [];
}

export async function fetchTodayLeaveEmployees(): Promise<any[]> {
    const res = await frappeRequest('/api/method/company.company.api.get_today_leave_employees');
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch today leave employees'));
    }
    const data = await res.json();
    return data.message || [];
}

export async function fetchAttendanceStats(range: string = 'today'): Promise<any> {
    const res = await frappeRequest(
        `/api/method/company.company.api.get_attendance_stats?range=${range}`
    );
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch attendance stats'));
    }
    const data = await res.json();
    return data.message;
}

export async function fetchHRDashboardData(): Promise<HRDashboardData> {
    const res = await frappeRequest('/api/method/company.company.frontend_api.get_hr_dashboard_data');

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch HR dashboard data'));
    }

    const data = await res.json();
    return data.message;
}

export async function fetchEmployeeDashboardData(
    range: string = 'This Month'
): Promise<EmployeeDashboardData> {
    try {
        const res = await frappeRequest(
            `/api/method/company.company.frontend_api.get_employee_dashboard_data?attendance_range=${range}&_=${Date.now()}`
        );

        if (!res.ok) {
            const error = await res.json();
            throw new Error(handleFrappeError(error, 'Failed to fetch employee dashboard data'));
        }

        const data = await res.json();
        return data.message;
    } catch (error) {
        console.error('Failed to fetch employee dashboard data:', error);
        // Return default empty structure to prevent dashboard crash
        return {
            employee_name: '',
            employee: '',
            weekly_attendance: [],
            leave_allocations: [],
            monthly_attendance_breakdown: {
                present: 0,
                absent: 0,
                half_day: 0,
                on_leave: 0,
                holiday: 0,
                missing: 0,
                total_days: 0,
                calendar_total: 0,
                attendance_percentage: 0,
            },
            missing_timesheets: [],
            leave_dates: [],
            recent_leaves: [],
            announcements: [],
            todays_birthdays: [],
            todays_leaves: [],
            holidays: [],
            monthly_attendance_list: [],
            attendance_range: range,
            in_probation: false,
        };
    }
}

// Get total employee count
export async function fetchTotalEmployeeCount(): Promise<number> {
    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_permitted_count?doctype=Employee&filters=${encodeURIComponent(JSON.stringify([]))}`
    );
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch employee count'));
    }
    const data = await res.json();
    return data.message || 0;
}

// Get pending leave applications count
export async function fetchPendingLeaveCount(): Promise<number> {
    const filters = [['Leave Application', 'workflow_state', '=', 'Pending']];
    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_permitted_count?doctype=Leave Application&filters=${encodeURIComponent(JSON.stringify(filters))}`
    );
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch pending leave count'));
    }
    const data = await res.json();
    return data.message || 0;
}

// Get pending leave applications count
export async function fetchPendingRequestCount(): Promise<number> {
    const filters = [['Request', 'workflow_state', '=', 'Pending']];
    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_permitted_count?doctype=Request&filters=${encodeURIComponent(JSON.stringify(filters))}`
    );
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch pending leave count'));
    }
    const data = await res.json();
    return data.message || 0;
}

// Get missing attendance chart data (last 7 days)
export async function fetchMissingAttendanceChartData(): Promise<
    Array<{ date: string; count: number }>
> {
    const res = await frappeRequest(
        '/api/method/company.company.api.get_missing_attendance_chart_data'
    );
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch missing attendance chart data'));
    }
    const data = await res.json();
    return data.message || [];
}

// Get weekly present count chart data (current week Mon-Sun)
export async function fetchWeeklyPresentChartData(): Promise<
    Array<{ date: string; day: string; count: number }>
> {
    const res = await frappeRequest('/api/method/company.company.api.get_weekly_present_chart_data');
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch weekly present chart data'));
    }
    const data = await res.json();
    return data.message || [];
}
// Get weekly present/absent count data
export async function fetchWeeklyPresentAbsentChartData(params?: {
    filter_type?: string;
    from_date?: string;
    to_date?: string;
}): Promise<Array<{ date: string; day: string; present: number; absent: number }>> {
    let url = '/api/method/company.company.frontend_api.get_weekly_present_absent_data';

    if (params) {
        const queryParams = new URLSearchParams();
        if (params.filter_type) queryParams.append('filter_type', params.filter_type);
        if (params.from_date) queryParams.append('from_date', params.from_date);
        if (params.to_date) queryParams.append('to_date', params.to_date);

        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
    }

    const res = await frappeRequest(url);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to fetch weekly present absent chart data'));
    }
    const data = await res.json();
    return data.message || [];
}

export interface SalesDashboardData {
    total_sales: number;
    total_qty_sold: number;
    total_orders: number;
    aov: number;
    gross_sales: number;
    net_sales: number;
    total_discounts: number;
    mtd_sales: number;
    ytd_sales: number;
    pipeline_value: number;
    top_customers_by_revenue: Array<{
        client_name: string;
        billing_name: string;
        contact_name?: string;
        account_name?: string;
        revenue: number;
        order_count: number;
    }>;
    most_repeated_customers: Array<{
        client_name: string;
        billing_name: string;
        contact_name?: string;
        account_name?: string;
        order_count: number;
        total_spent: number;
    }>;
    overdue_orders: Array<{
        name: string;
        billing_name: string;
        account_name?: string;
        due_date: string;
        balance_amount: number;
        grand_total: number;
    }>;
    pending_orders_count: number;
    sales_trend: {
        categories: string[];
        series: number[];
    };
    discount_trend: {
        categories: string[];
        series: number[];
    };
    conversion_rate: number;
}

export async function fetchSalesDashboardData(start_date?: string, end_date?: string): Promise<SalesDashboardData> {
    try {
        let url = '/api/method/company.company.frontend_api.get_sales_dashboard_data';
        const params = new URLSearchParams();
        if (start_date) params.append('start_date', start_date);
        if (end_date) params.append('end_date', end_date);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await frappeRequest(url);

        if (!res.ok) {
            const error = await res.json();
            throw new Error(handleFrappeError(error, 'Failed to fetch sales dashboard data'));
        }

        const data = await res.json();
        return data.message;
    } catch (error) {
        console.error('Failed to fetch sales dashboard data:', error);
        // Return default zero values when API fails
        return {
            total_sales: 0,
            total_qty_sold: 0,
            total_orders: 0,
            aov: 0,
            gross_sales: 0,
            net_sales: 0,
            total_discounts: 0,
            mtd_sales: 0,
            ytd_sales: 0,
            pipeline_value: 0,
            top_customers_by_revenue: [],
            most_repeated_customers: [],
            overdue_orders: [],
            pending_orders_count: 0,
            sales_trend: {
                categories: [],
                series: [],
            },
            discount_trend: {
                categories: [],
                series: [],
            },
            conversion_rate: 0,
        };
    }
}

export interface FinancialTotals {
    invoices: {
        total: number;
        count: number;
        chart: number[];
    };
    estimations: {
        total: number;
        count: number;
        chart: number[];
    };
    purchases: {
        total: number;
        count: number;
        chart: number[];
    };
    expenses: {
        total: number;
        count: number;
        chart: number[];
    };
    categories: string[];
}

// export async function fetchFinancialTotals(start_date?: string, end_date?: string): Promise<FinancialTotals> {
//     try {
//         let url = '/api/method/company.company.frontend_api.get_financial_totals';
//         const params = new URLSearchParams();
//         if (start_date) params.append('start_date', start_date);
//         if (end_date) params.append('end_date', end_date);
//         if (params.toString()) url += `?${params.toString()}`;

//         const res = await frappeRequest(url);

//         if (!res.ok) {
//             const error = await res.json();
//             throw new Error(handleFrappeError(error, 'Failed to fetch financial totals'));
//         }

//         const data = await res.json();
//         return data.message;
//     } catch (error) {
//         console.error('Failed to fetch financial totals:', error);
//         // Return default zero values when API fails
//         return {
//             invoices: {
//                 total: 0,
//                 count: 0,
//                 chart: [0, 0, 0, 0, 0, 0, 0],
//             },
//             estimations: {
//                 total: 0,
//                 count: 0,
//                 chart: [0, 0, 0, 0, 0, 0, 0],
//             },
//             purchases: {
//                 total: 0,
//                 count: 0,
//                 chart: [0, 0, 0, 0, 0, 0, 0],
//             },
//             expenses: {
//                 total: 0,
//                 count: 0,
//                 chart: [0, 0, 0, 0, 0, 0, 0],
//             },
//             categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
//         };
//     }
// }

export async function fetchMonthlyEmployee(): Promise<any> {
    try {
        const res = await frappeRequest('/api/method/company.company.frontend_api.get_monthly_employee');

        if (!res.ok) {
            const error = await res.json();
            throw new Error(handleFrappeError(error, 'Failed to fetch monthly employee'));
        }

        const data = await res.json();
        return data.message;
    } catch (error) {
        console.error('Failed to fetch monthly employee:', error);
        return null;
    }
}

export async function fetchPersonalityDashboardData(employeeId?: string): Promise<PersonalityDashboardData | null> {
    try {
        let url = '/api/method/company.company.frontend_api.get_personality_dashboard_data';
        if (employeeId) {
            url += `?employee=${employeeId}`;
        }
        const res = await frappeRequest(url);

        if (!res.ok) {
            const error = await res.json();
            throw new Error(handleFrappeError(error, 'Failed to fetch personality dashboard data'));
        }

        const data = await res.json();
        return data.message;
    } catch (error) {
        console.error('Failed to fetch personality dashboard data:', error);
        return null;
    }
}

