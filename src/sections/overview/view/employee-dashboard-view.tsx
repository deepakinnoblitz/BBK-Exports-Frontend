import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { usePresence } from 'src/hooks/use-presence';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    fetchMonthCalendarData,
    fetchEmployeeDashboardData,
    type EmployeeDashboardData,
} from 'src/api/dashboard';

import { Loader } from 'src/components/loader';

import { useAuth } from 'src/auth/auth-context';

import { UserStatusBar } from '../user-status-bar';
import { HRAnnouncements } from '../hr-announcements';
import { EmployeeCalendar } from '../employee-calendar';
import { HRDashboardTable } from '../hr-dashboard-table';
import { LeaveStatusCards } from '../leave-status-cards';
import { DashboardEomCard } from '../dashboard-eom-card';
import { MissingTimesheets } from '../missing-timesheets';
import { HRTaskSummaryCards } from '../hr-task-summary-cards';
import { PremiumWorkingHours } from '../premium-working-hours';
import { TodayPresenceWidget } from '../today-presence-widget';
import { PersonalityManagement } from '../personality-management';
import { CalendarAttendanceChart } from '../calendar-attendance-chart';

// ----------------------------------------------------------------------

export function EmployeeDashboardView() {
    const { user } = useAuth();
    const { status: currentStatus } = usePresence();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<EmployeeDashboardData | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const dashboardData = await fetchEmployeeDashboardData();
            setData(dashboardData);
        } catch (error) {
            console.error('Failed to load employee dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRefresh = async () => {
        try {
            const dashboardData = await fetchEmployeeDashboardData(data?.attendance_range);
            setData(dashboardData);
        } catch (error) {
            console.error('Failed to refresh dashboard data:', error);
        }
    };

    const handleAttendanceRangeChange = async (range: string) => {
        try {
            const dashboardData = await fetchEmployeeDashboardData(range);
            setData((prev: any) => ({
                ...prev,
                monthly_attendance_breakdown: dashboardData.monthly_attendance_breakdown,
                missing_timesheets: dashboardData.missing_timesheets,
                attendance_range: range,
            }));
        } catch (error) {
            console.error('Failed to update attendance range:', error);
        }
    };

    const handleMonthChange = async (date: Date) => {
        try {
            const response = await fetchMonthCalendarData(date.getMonth() + 1, date.getFullYear());
            if (data) {
                setData((prev: any) => ({
                    ...prev,
                    monthly_attendance_list: response.calendar_data || [],
                    joining_date: response.joining_date,
                    holidays: (response.calendar_data || []).filter((d: any) => d.holiday_info),
                }));
            }
        } catch (error) {
            console.error('Failed to update calendar data:', error);
        }
    };

    if (loading || !data) {
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

    return (
        <DashboardContent maxWidth="xl">
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                alignItems="center"
                spacing={{ xs: 1.5, md: 2 }}
                sx={{ display: { xs: 'flex', md: 'none' }, mb: 2 }}
            >
                <UserStatusBar disableAutoCheckIn />
            </Stack>
            <Typography variant="h4" sx={{ mb: { xs: 3, md: 2 } }}>
                Hi, {data.employee_name || user?.full_name || 'Employee'}, Welcome back 👋
            </Typography>


            <DashboardEomCard />

            {/* <Box sx={{ mt: 3 }}>
                <TodayPresenceWidget />
            </Box> */}

            <Grid container spacing={3} sx={{ mt: 3 }}>
                {/* 1. Latest Announcements */}
                <Grid size={{ xs: 12 }}>
                    <HRAnnouncements
                        list={(data.announcements || []).map((a: any) => ({
                            title: a.title,
                            message: a.message,
                            posting_date: a.posting_date,
                        }))}
                    />
                </Grid>

                {/* Task Analytics Overview */}
                <Grid size={{ xs: 12 }}>
                    <HRTaskSummaryCards employeeFilter={data.employee} />
                </Grid>

                {/* 2. Last Seven Days Working Hours (Premium Widget) */}
                <Grid size={{ xs: 12 }}>
                    <PremiumWorkingHours
                        data={(data.weekly_attendance || []).slice(0, 7)}
                        weeklyTarget={45}
                        source={data.weekly_chart_source}
                        onRefreshData={handleRefresh}
                    />
                </Grid>

                {/* 3. Leave Status Cards */}
                <Grid size={{ xs: 12 }}>
                    <LeaveStatusCards
                        data={data.leave_allocations || []}
                        inProbation={data.in_probation}
                    />
                </Grid>

                {/* Personality Management */}
                <Grid size={{ xs: 12 }}>
                    <PersonalityManagement />
                </Grid>

                {/* 4. Calendar Attendance Chart */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <CalendarAttendanceChart
                        title="Monthly Attendance Overview"
                        subheader={`Period: ${new Date(data.start_date || new Date()).toLocaleString('default', { month: 'long' })} ${new Date(data.start_date || new Date()).getFullYear()}`}
                        calendarData={data.monthly_attendance_list || []}
                        joiningDate={data.joining_date}
                        breakdown={data.monthly_attendance_breakdown} // Pass backend breakdown
                        hideMissing={data.hide_missing} // Hide missing for Daily Log
                        sx={{ pt: 5 }}
                    />
                </Grid>

                {/* 5. Calendar */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <EmployeeCalendar
                        title={`${new Date(data.start_date || new Date()).toLocaleString('default', { month: 'long' })} ${new Date(data.start_date || new Date()).getFullYear()} Calendar`}
                        subheader="Attendance and holidays for this month"
                        onDateChange={handleMonthChange}
                        events={
                            (data.monthly_attendance_list || [])
                                .map((record: any) => {
                                    const todayObj = new Date();
                                    const year = todayObj.getFullYear();
                                    const month = String(todayObj.getMonth() + 1).padStart(2, '0');
                                    const day = String(todayObj.getDate()).padStart(2, '0');
                                    const todayStr = `${year}-${month}-${day}`;

                                    const isToday = record.date === todayStr;
                                    const isPast = record.date < todayStr;
                                    const isHoliday = !!record.holiday_info;
                                    const isNonWorkingHoliday = isHoliday && record.holiday_is_working_day === 0;

                                    let eventTitle = '';
                                    let bgColor = '';

                                    // Check if date is before joining date
                                    const joiningDate = data.joining_date;
                                    if (joiningDate && record.date < joiningDate) {
                                        // Don't show anything for dates before joining
                                        return null;
                                    }

                                    // 1. Holiday Logic (Non-working) - Priority
                                    if (isNonWorkingHoliday) {
                                        eventTitle = record.holiday_info || 'Holiday';
                                        bgColor = '#B71D18'; // Dark Red for Holiday
                                    }
                                    // 2. Status Based Logic
                                    else {
                                        // Check for incomplete attendance (missing in_time or out_time)
                                        const hasInTime = !!record.check_in;
                                        const hasOutTime = !!record.check_out;
                                        const isIncomplete = (hasInTime && !hasOutTime) || (!hasInTime && hasOutTime);

                                        if (isToday && currentStatus !== 'Offline' && data.weekly_chart_source === 'Daily Log') {
                                            eventTitle = currentStatus === 'Available' ? 'Available' : currentStatus;
                                            if (currentStatus === 'Available') {
                                                bgColor = '#22C55E'; // Green
                                            } else if (currentStatus === 'Busy' || currentStatus === 'Do Not Disturb') {
                                                bgColor = '#FF5630'; // Red
                                            } else {
                                                bgColor = '#FFAB00'; // Orange for Break/Away
                                            }
                                        } else if (isIncomplete && (isPast || isToday) && !data.hide_missing) {
                                            eventTitle = 'Missing';
                                            bgColor = '#FFC107'; // Amber/Yellow for Missing
                                        } else if (record.status === 'On Leave' || record.status === 'Leave' || record.leave_type) {
                                            eventTitle = record.leave_type || 'On Leave';
                                            bgColor = '#FF5630'; // Red for all leave types
                                        } else if (record.status === 'Present') {
                                            eventTitle = 'Present';
                                            bgColor = '#22C55E'; // Green
                                        } else if (record.status === 'Absent') {
                                            eventTitle = 'Absent';
                                            bgColor = '#FF5630'; // Red
                                        } else if (record.status === 'Half Day') {
                                            eventTitle = 'Half Day';
                                            bgColor = '#FFAB00'; // Orange
                                        } else if (
                                            record.status === 'Not Marked' &&
                                            isPast &&
                                            joiningDate &&
                                            record.date >= joiningDate
                                        ) {
                                            // Working day after joining with no log entry
                                            eventTitle = data.hide_missing ? 'Absent' : 'Unmarked';
                                            bgColor = data.hide_missing ? '#FF5630' : '#9E9E9E';
                                        } else if (isPast) {
                                            // Default for past unmarked days (legacy logic)
                                            eventTitle = 'Absent';
                                            bgColor = '#FF5630';
                                        } else if (isToday) {
                                            if (record.status === 'Present' || record.check_in) {
                                                eventTitle = 'Present';
                                                bgColor = '#22C55E';
                                            } else if (record.status === 'Absent') {
                                                eventTitle = 'Absent';
                                                bgColor = '#FF5630';
                                            } else {
                                                // Today not marked yet
                                                eventTitle = 'Not Marked';
                                                bgColor = '#9E9E9E';
                                            }
                                        } else if (isHoliday) {
                                            // Future Working Holiday
                                            eventTitle = record.holiday_info || 'Holiday';
                                            bgColor = '#B71D18';
                                        } else {
                                            return null;
                                        }
                                    }

                                    return {
                                        title: eventTitle,
                                        subTitle: record.leave_type || '',
                                        extendedProps: { subTitle: record.leave_type || '' },
                                        start: record.date,
                                        color: bgColor,
                                        textColor: '#FFFFFF',
                                    };
                                })
                                .filter(Boolean) as any[]
                        }
                    />
                </Grid>

                {/* 6. Today's Birthdays */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <HRDashboardTable
                        title="Today's Birthdays"
                        tableData={data.todays_birthdays || []}
                        headLabel={[
                            { id: 'index', label: 'S.No' },
                            { id: 'employee_name', label: 'Employee Name' },
                        ]}
                        emptyMessage="No birthday today"
                    />
                </Grid>

                {/* 7. Today's Leave */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <HRDashboardTable
                        title="Today's Leave"
                        tableData={data.todays_leaves || []}
                        headLabel={[
                            { id: 'index', label: 'S.No' },
                            { id: 'employee_name', label: 'Employee Name' },
                            { id: 'employee', label: 'Employee ID' },
                        ]}
                        emptyMessage="No leave today"
                    />
                </Grid>

                {/* 8. Missing Timesheets */}
                <Grid size={{ xs: 12 }}>
                    <MissingTimesheets
                        title="Missing Timesheets - Current Month"
                        data={data.missing_timesheets || []}
                        holidays={data.holidays || []}
                        leave_dates={data.leave_dates || []}
                    />
                </Grid>
            </Grid>
        </DashboardContent>
    );
}
