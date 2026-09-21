import { FaUsers } from "react-icons/fa6";
import { useState, useEffect } from 'react';
import { GrDocumentUser } from "react-icons/gr";
import { HiOutlineDocumentText } from "react-icons/hi2";

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    fetchAttendanceStats,
    fetchUpcomingRenewals,
    fetchHRDashboardData,
    fetchMissingAttendanceChartData,
    fetchWeeklyPresentChartData,
    fetchWeeklyPresentAbsentChartData,
    fetchMonthHolidays
} from 'src/api/dashboard';

import { Loader } from 'src/components/loader';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { HRCalendar } from '../hr-calendar';
import { HRAnnouncements } from '../hr-announcements';
import { HRSummaryWidget } from '../hr-summary-widget';
import { HRDashboardTable } from '../hr-dashboard-table';
// import { DashboardEomCard } from '../dashboard-eom-card';
import { WeeklyPresentChart } from '../weekly-present-chart';
import { HRTaskSummaryCards } from '../hr-task-summary-cards';
import { MissingAttendanceChart } from '../missing-attendance-chart';
import { WeeklyPresentAbsentChart } from '../weekly-present-absent-chart';

// ----------------------------------------------------------------------

export function HRDashboardView() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);
    const [data, setData] = useState<any>({
        announcements: [],
        total_employees: 0,
        pending_leaves: 0,
        pending_request: 0,
        present_today: 0,
        missing_attendance: 0,
        todays_leaves: [],
        todays_birthdays: [],
        holidays: [],
        pending_leaves_list: [],
        pending_requests_list: [],
        missing_attendance_chart: [],
        weekly_present_chart: [],
        weekly_present_absent: []
    });

    const [attendanceFilter, setAttendanceFilter] = useState('Last 7 Days');
    const [attendanceDates, setAttendanceDates] = useState<{ from: string; to: string }>({
        from: '',
        to: ''
    });

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [
                    hrData,
                    stats,
                    holidays,
                    renewals,
                    missingAttendanceChart,
                    weeklyPresentChart,
                    weeklyPresentAbsent
                ] = await Promise.all([
                    fetchHRDashboardData(),
                    fetchAttendanceStats('today'),
                    fetchMonthHolidays(),
                    fetchUpcomingRenewals(),
                    fetchMissingAttendanceChartData(),
                    fetchWeeklyPresentChartData(),
                    fetchWeeklyPresentAbsentChartData()
                ]);

                console.log('Holidays data received:', holidays);

                setData({
                    ...hrData,
                    holidays,
                    renewals,
                    present_today: stats?.present || 0,
                    missing_attendance: stats?.missing || 0,
                    missing_attendance_chart: missingAttendanceChart,
                    weekly_present_chart: weeklyPresentChart,
                    weekly_present_absent: weeklyPresentAbsent
                });
            } catch (error) {
                console.error('Failed to load HR dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) {
        return (
            <DashboardContent maxWidth="xl">
                <Box
                    sx={{
                        height: '70vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                    }}
                >
                    <Loader />
                </Box>
            </DashboardContent>
        );
    }

    const handleAttendanceFilterChange = async (filter: string, from?: string, to?: string) => {
        setAttendanceFilter(filter);
        if (from && to) {
            setAttendanceDates({ from, to });
        }
        setChartLoading(true);
        try {
            const weeklyPresentAbsent = await fetchWeeklyPresentAbsentChartData({
                filter_type: filter,
                from_date: from,
                to_date: to
            });
            setData((prev: any) => ({ ...prev, weekly_present_absent: weeklyPresentAbsent }));
        } catch (error) {
            console.error('Failed to update attendance chart:', error);
        } finally {
            setChartLoading(false);
        }
    };

    const handleMonthChange = async (date: Date) => {
        try {
            const holidays = await fetchMonthHolidays(date.getMonth() + 1, date.getFullYear());
            setData((prev: any) => ({ ...prev, holidays }));
        } catch (error) {
            console.error('Failed to update holidays:', error);
        }
    };

    const hasCrmOrSalesRole = user?.roles?.some((role: string) => {
        const r = role.toLowerCase();
        return r.includes('crm and sales');
    });

    const isHrOnlyWithTaskAccess = !hasCrmOrSalesRole && user?.roles?.some((role: string) => role.toLowerCase().includes('task manager'));

    return (
        <DashboardContent maxWidth="xl">
            <Typography variant="h4" sx={{ mb: { xs: 3, md: 2 }, mt: 3 }}>
                Hi, {user?.full_name || 'HR User'}, Welcome back !
            </Typography>

            {/* <DashboardEomCard /> */}

            <Grid container spacing={3}>
                {/* Announcements */}
                <Grid size={{ xs: 12 }}>
                    <HRAnnouncements
                        title="Latest Announcements"
                        list={data.announcements}
                    />
                </Grid>

                {/* Task Dashboard for CRM/Sales Roles */}
                {/* {hasCrmOrSalesRole && (
                    <Grid size={{ xs: 12 }}>
                        <HRTaskSummaryCards />
                    </Grid>
                )} */}

                {/* Summary Widgets */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <HRSummaryWidget
                        title="Total Employees"
                        total={data.total_employees || 0}
                        loading={loading}
                        icon={<FaUsers />}
                        color="#3b82f6"
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <HRSummaryWidget
                        title="Pending Leave Applications"
                        total={data.pending_leaves || 0}
                        color="#0284c7"
                        loading={loading}
                        icon={<GrDocumentUser />}
                    />
                </Grid>

                {/* <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <HRSummaryWidget
                        title="Yesterday Missing Attendance"
                        total={data.missing_attendance || 0}
                        color="#ef4444"
                        loading={loading}
                        subtitle="Unregistered punches"
                        icon={<Iconify icon={"solar:close-circle-bold-duotone" as any} width={32} />}
                    />
                </Grid> */}

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <HRSummaryWidget
                        title="Pending Request Applications"
                        total={data.pending_request || 0}
                        color="#7c3aed"
                        loading={loading}
                        icon={<HiOutlineDocumentText />}
                    />
                </Grid>

                {/* Weekly Present/Absent Chart */}
                <Grid size={{ xs: 12 }}>
                    <WeeklyPresentAbsentChart
                        title="Weekly Present / Absent"
                        data={data.weekly_present_absent}
                        filter={attendanceFilter}
                        loading={loading || chartLoading}
                        onFilterChange={handleAttendanceFilterChange}
                    />
                </Grid>

                {/* Missing Attendance Chart */}
                {/* <Grid size={{ xs: 12, md: 6 }}>
                    <MissingAttendanceChart
                        title="Missing Attendance"
                        subheader="Last 7 days"
                        data={data.missing_attendance_chart}
                    />
                </Grid> */}

                {/* Weekly Present Count Chart */}
                {/* <Grid size={{ xs: 12, md: 6 }}>
                    <WeeklyPresentChart
                        title="Weekly Present Count"
                        subheader="Current week (Mon-Sun)"
                        data={data.weekly_present_chart}
                    />
                </Grid> */}

                {/* Task Dashboard for HR Only Role */}
                {/* {isHrOnlyWithTaskAccess && (
                    <Grid size={{ xs: 12 }}>
                        <HRTaskSummaryCards />
                    </Grid>
                )} */}


                {/* Today's Leaves */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <HRDashboardTable
                        title="Today's Leave"
                        tableData={data.todays_leaves}
                        loading={loading}
                        headLabel={[
                            { id: 'index', label: 'S.No' },
                            { id: 'employee_name', label: 'Employee Name' },
                            { id: 'employee', label: 'Employee ID' },
                        ]}
                        emptyMessage="No leave today"
                    />
                </Grid>

                {/* Today's Birthdays */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <HRDashboardTable
                        title="Today's Birthdays"
                        tableData={data.todays_birthdays}
                        loading={loading}
                        headLabel={[
                            { id: 'index', label: 'S.No' },
                            { id: 'employee_name', label: 'Employee Name' },
                            { id: 'employee', label: 'Employee ID' },
                        ]}
                        emptyMessage="No birthdays today"
                    />
                </Grid>

                {/* Pending Leave Applications */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <HRDashboardTable
                        title="Pending Leave Applications"
                        tableData={data.pending_leaves_list}
                        totalCount={data.pending_leaves}
                        loading={loading}
                        viewAllPath="/leaves"
                        headLabel={[
                            { id: 'index', label: 'S.No' },
                            { id: 'employee_name', label: 'Employee Name' },
                            { id: 'leave_type', label: 'Type' },
                            { id: 'total_days', label: 'Days' },
                        ]}
                        emptyMessage="No pending leaves"
                    />
                </Grid>

                {/* Pending Request Applications */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <HRDashboardTable
                        title="Pending Request Applications"
                        tableData={data.pending_requests_list}
                        totalCount={data.pending_request}
                        loading={loading}
                        viewAllPath="/requests"
                        headLabel={[
                            { id: 'index', label: 'S.No' },
                            { id: 'employee_name', label: 'Employee Name' },
                            { id: 'subject', label: 'Subject' },
                        ]}
                        emptyMessage="No pending requests"
                    />
                </Grid>

                {/* Upcoming Renewals */}
                {/* <Grid size={{ xs: 12 }}>
                    <HRDashboardTable
                        title="Upcoming Renewals"
                        tableData={data.renewals || []}
                        headLabel={[
                            { id: 'index', label: 'S.No' },
                            { id: 'item_name', label: 'Item Name' },
                            { id: 'category', label: 'Category' },
                            { id: 'renewal_date', label: 'Renewal Date' },
                            { id: 'amount', label: 'Amount' },
                            { id: 'status', label: 'Status' },
                        ]}
                        emptyMessage="No upcoming renewals"
                    />
                </Grid> */}

                {/* Holiday Calendar */}
                <Grid size={{ xs: 12 }}>
                    <HRCalendar
                        title="Monthly Calendar"
                        subheader="Upcoming holidays for this month"
                        onDateChange={handleMonthChange}
                        events={(() => {
                            const mappedEvents = (data.holidays || []).map((h: any) => ({
                                title: h.description,
                                start: h.date || h.holiday_date,
                                color: '#FF4842'
                            }));
                            console.log('Mapped holiday events:', mappedEvents);
                            return mappedEvents;
                        })()}
                    />
                </Grid>
            </Grid>
        </DashboardContent>
    );
}
