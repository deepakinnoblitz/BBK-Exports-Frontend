import { useSnackbar } from 'notistack';
import React, { useMemo, useState, useEffect } from 'react';

import {
    Box,
    Tab,
    Card,
    Tabs,
    Chip,
    Grid,
    Stack,
    Table,
    alpha,
    Button,
    TableRow,
    Collapse,
    TableBody,
    TableCell,
    TableHead,
    TextField,
    Typography,
    IconButton,
    TableContainer,
    InputAdornment,
    CircularProgress,
} from '@mui/material';

import { getDailyAttendanceSummary, getDailyAttendanceByDepartment } from 'src/api/reports';

import { Iconify } from 'src/components/iconify';

import { exportDailyReportToExcel } from './daily-report-excel-exporter';

import type { DailyReportData } from './daily-report-excel-exporter';

interface AttendanceDailyReportViewProps {
    date: string; // YYYY-MM-DD
    onViewEmployeeDetails?: (employeeId: string) => void;
}

export function AttendanceDailyReportView({ date, onViewEmployeeDetails }: AttendanceDailyReportViewProps) {
    const { enqueueSnackbar } = useSnackbar();

    const [activeTab, setActiveTab] = useState<'attendance' | 'headcount' | 'linewise'>('headcount');
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<DailyReportData | null>(null);
    const [exporting, setExporting] = useState(false);

    // Filter for Tab 1 (Attendance by Department)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState('all');
    const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
    const [deptEmployeesMap, setDeptEmployeesMap] = useState<Record<string, any[]>>({});
    const [deptLoadingMap, setDeptLoadingMap] = useState<Record<string, boolean>>({});

    // Filter for Tab 2 (Factory Head Count)
    const [headcountGroupBy, setHeadcountGroupBy] = useState<'department' | 'designation'>('department');
    const [expandedStaffRows, setExpandedStaffRows] = useState<Record<string, boolean>>({});
    const [expandedWorkerRows, setExpandedWorkerRows] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        getDailyAttendanceSummary(date, false)
            .then((res: any) => {
                if (!isMounted) return;
                if (res && res.status === 'success') {
                    setReportData(res);
                    // Close all collapse except the first one
                    const firstDept = res.department_summaries?.[0]?.department || (res.attendance_by_department?.[0]?.department);
                    const initExpanded: Record<string, boolean> = {};
                    if (firstDept) {
                        initExpanded[firstDept] = true;
                    }
                    setExpandedDepts(initExpanded);

                    // Initialize first department employees into map
                    if (firstDept && res.attendance_by_department) {
                        setDeptEmployeesMap({ [firstDept]: res.attendance_by_department });
                    } else {
                        setDeptEmployeesMap({});
                    }
                } else {
                    enqueueSnackbar(res?.message || 'Failed to fetch daily report', { variant: 'error' });
                }
            })
            .catch((err) => {
                if (!isMounted) return;
                enqueueSnackbar(err.message || 'Error loading daily report', { variant: 'error' });
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [date, enqueueSnackbar]);

    const handleExport = async () => {
        setExporting(true);
        try {
            // Load full data for all departments for Excel export
            const fullReport = await getDailyAttendanceSummary(date, true);
            await exportDailyReportToExcel(fullReport, date);
            enqueueSnackbar('Daily Report Excel exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('Export error:', error);
            enqueueSnackbar('Failed to export Daily Report Excel', { variant: 'error' });
        } finally {
            setExporting(false);
        }
    };

    const toggleDept = async (dept: string) => {
        const willOpen = !expandedDepts[dept];
        setExpandedDepts((prev) => ({ ...prev, [dept]: willOpen }));

        // On-demand load if opening and not loaded yet
        if (willOpen && !deptEmployeesMap[dept]) {
            setDeptLoadingMap((prev) => ({ ...prev, [dept]: true }));
            try {
                const res = await getDailyAttendanceByDepartment(date, dept);
                if (res && res.status === 'success') {
                    setDeptEmployeesMap((prev) => ({ ...prev, [dept]: res.employees || [] }));
                } else {
                    enqueueSnackbar(res?.message || `Failed to load ${dept}`, { variant: 'error' });
                }
            } catch (err: any) {
                enqueueSnackbar(err.message || `Error loading ${dept}`, { variant: 'error' });
            } finally {
                setDeptLoadingMap((prev) => ({ ...prev, [dept]: false }));
            }
        }
    };

    const departmentSummaries = useMemo(() => {
        if (reportData?.department_summaries && reportData.department_summaries.length > 0) {
            return reportData.department_summaries;
        }
        const map: Record<string, { department: string; total: number; present: number; absent: number }> = {};
        (reportData?.attendance_by_department || []).forEach((e) => {
            const d = e.department || 'Unassigned';
            if (!map[d]) map[d] = { department: d, total: 0, present: 0, absent: 0 };
            map[d].total += 1;
            if (e.is_present) map[d].present += 1;
            else map[d].absent += 1;
        });
        return Object.values(map);
    }, [reportData]);

    const totalEmployeesCount = useMemo(
        () => reportData?.meta?.total_employees || departmentSummaries.reduce((sum, d) => sum + d.total, 0),
        [reportData, departmentSummaries]
    );

    const filteredDepartmentSummaries = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return departmentSummaries.filter((deptSum) => {
            if (selectedDept !== 'all' && deptSum.department !== selectedDept) return false;
            if (!q) return true;
            if (deptSum.department.toLowerCase().includes(q)) return true;

            const loaded = deptEmployeesMap[deptSum.department];
            if (loaded) {
                return loaded.some(
                    (emp) =>
                        (emp.employee_name || '').toLowerCase().includes(q) ||
                        (emp.employee || '').toLowerCase().includes(q) ||
                        (emp.designation || '').toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [departmentSummaries, selectedDept, searchQuery, deptEmployeesMap]);

    if (loading) {
        return (
            <Card sx={{ p: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress sx={{ color: '#059669' }} />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    Computing Daily Report for {date}...
                </Typography>
            </Card>
        );
    }

    if (!reportData) {
        return (
            <Card sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                    No daily report data found for {date}
                </Typography>
            </Card>
        );
    }

    const { meta, head_count, line_wise } = reportData;

    return (
        <Stack spacing={3}>
            {/* Header & KPI Summary */}
            <Card
                sx={{
                    p: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f8fafc 100%)',
                    border: `1px solid ${alpha('#059669', 0.15)}`,
                    boxShadow: '0 4px 20px rgba(5, 150, 105, 0.08)',
                }}
            >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '10px',
                                    bgcolor: alpha('#059669', 0.12),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#059669',
                                }}
                            >
                                <Iconify icon={"solar:document-text-bold" as any} width={22} />
                            </Box>
                            <div>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#064e3b' }}>
                                    Daily Attendance & Factory Manpower Report
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Comprehensive 3-Sheet Statutory Report for <b>{date}</b>
                                </Typography>
                            </div>
                        </Stack>
                    </Box>

                    <Button
                        variant="contained"
                        onClick={handleExport}
                        disabled={exporting}
                        startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <Iconify icon={"solar:export-bold" as any} width={18} />}
                        sx={{
                            bgcolor: '#059669',
                            color: '#ffffff',
                            fontWeight: 600,
                            borderRadius: '12px',
                            px: 3,
                            py: 1,
                            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                            '&:hover': { bgcolor: '#047857' },
                        }}
                    >
                        {exporting ? 'Exporting Excel...' : 'Export 3-Sheet Excel'}
                    </Button>
                </Stack>

                {/* KPI Metrics */}
                <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                FACTORY MANPOWER
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', mt: 0.5 }}>
                                {meta.total_employees}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                                ACTUAL PRESENT
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                                {meta.total_present}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                                {meta.present_pct}% Present
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 600 }}>
                                ABSENT MANPOWER
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#dc2626', mt: 0.5 }}>
                                {meta.total_absent}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 600 }}>
                                {(100 - meta.present_pct).toFixed(1)}% Absent
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#4338ca', fontWeight: 600 }}>
                                STAFF / WORKERS
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: '#4338ca', mt: 1 }}>
                                {head_count.staff_total.manpower} / {head_count.workers_total.manpower}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Card>

            {/* Sub-Tabs Switcher */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, val) => setActiveTab(val)}
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        '& .MuiTab-root': {
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            minHeight: 48,
                            px: 2.5,
                            textTransform: 'none',
                        },
                        '& .Mui-selected': {
                            color: '#059669 !important',
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#059669',
                            height: 3,
                            borderRadius: '3px 3px 0 0',
                        },
                    }}
                >
                    <Tab
                        value="headcount"
                        label="Factory Head Count"
                        icon={<Iconify icon={"solar:users-group-rounded-bold" as any} width={18} />}
                        iconPosition="start"
                    />
                    <Tab
                        value="linewise"
                        label="Line Wise Report"
                        icon={<Iconify icon={"solar:chart-2-bold" as any} width={18} />}
                        iconPosition="start"
                    />
                    <Tab
                        value="attendance"
                        label="Attendance with Department"
                        icon={<Iconify icon={"solar:user-id-bold" as any} width={18} />}
                        iconPosition="start"
                    />
                </Tabs>
            </Box>

            {/* TAB 1: Attendance with Department */}
            {activeTab === 'attendance' && (
                <Stack spacing={2.5}>
                    {/* Filter Bar */}
                    <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <TextField
                            fullWidth
                            size="medium"
                            placeholder="Search employee by name, ID or designation..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', py: 0.5, width: '100%' }}>
                            <Chip
                                label={`All (${totalEmployeesCount})`}
                                clickable
                                color={selectedDept === 'all' ? 'primary' : 'default'}
                                variant={selectedDept === 'all' ? 'filled' : 'outlined'}
                                onClick={() => setSelectedDept('all')}
                                sx={{
                                    bgcolor: selectedDept === 'all' ? '#059669' : undefined,
                                    fontWeight: selectedDept === 'all' ? 700 : 500,
                                }}
                            />
                            {departmentSummaries.map((deptSum) => {
                                const isSelected = selectedDept === deptSum.department;
                                return (
                                    <Chip
                                        key={deptSum.department}
                                        label={`${deptSum.department} (${deptSum.total})`}
                                        clickable
                                        variant={isSelected ? 'filled' : 'outlined'}
                                        onClick={() => setSelectedDept(deptSum.department)}
                                        sx={{
                                            bgcolor: isSelected ? '#059669' : undefined,
                                            color: isSelected ? '#ffffff' : undefined,
                                            fontWeight: isSelected ? 700 : 500,
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </Card>

                    {/* Department Groups */}
                    {filteredDepartmentSummaries.length === 0 ? (
                        <Card sx={{ p: 5, textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                No departments or employees found matching the filters
                            </Typography>
                        </Card>
                    ) : (
                        filteredDepartmentSummaries.map((deptSummary) => {
                            const deptName = deptSummary.department;
                            const isExpanded = !!expandedDepts[deptName];
                            const isLoadingEmployees = !!deptLoadingMap[deptName];
                            const loadedEmps = deptEmployeesMap[deptName] || [];

                            const q = searchQuery.toLowerCase().trim();
                            const emps = q
                                ? loadedEmps.filter((emp) => {
                                      const matchName = (emp.employee_name || '').toLowerCase().includes(q);
                                      const matchId = (emp.employee || '').toLowerCase().includes(q);
                                      const matchDesig = (emp.designation || '').toLowerCase().includes(q);
                                      return matchName || matchId || matchDesig;
                                  })
                                : loadedEmps;

                            return (
                                <Card key={deptName} sx={{ overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                    <Box
                                        onClick={() => toggleDept(deptName)}
                                        sx={{
                                            p: 2,
                                            px: 2.5,
                                            bgcolor: '#f8fafc',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                                            '&:hover': { bgcolor: '#f1f5f9' },
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                                            <IconButton size="small">
                                                <Iconify icon={(isExpanded ? 'eva:arrow-ios-downward-fill' : 'eva:arrow-ios-forward-fill') as any} />
                                            </IconButton>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                                {deptName}
                                            </Typography>
                                            <Chip label={`${deptSummary.total} Total`} size="small" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                                            <Chip
                                                label={`${deptSummary.present} Present`}
                                                size="small"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                    bgcolor: alpha('#059669', 0.1),
                                                    color: '#059669',
                                                }}
                                            />
                                            {deptSummary.absent > 0 && (
                                                <Chip
                                                    label={`${deptSummary.absent} Absent`}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: '0.75rem',
                                                        bgcolor: alpha('#dc2626', 0.1),
                                                        color: '#dc2626',
                                                    }}
                                                />
                                            )}
                                        </Stack>

                                        {isLoadingEmployees && (
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <CircularProgress size={16} sx={{ color: '#059669' }} />
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                                    Loading...
                                                </Typography>
                                            </Stack>
                                        )}
                                    </Box>

                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                        {isLoadingEmployees ? (
                                            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                                                <CircularProgress size={22} sx={{ color: '#059669' }} />
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    Loading {deptName} attendance...
                                                </Typography>
                                            </Box>
                                        ) : emps.length === 0 ? (
                                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    {q ? 'No employees matching search in this department' : 'No employee records found'}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow sx={{ bgcolor: '#fafafa', '& th': { borderBottom: '1px solid #e2e8f0', fontWeight: 700 } }}>
                                                            <TableCell sx={{ width: 140 }}>Employee ID</TableCell>
                                                            <TableCell>Employee Name</TableCell>
                                                            <TableCell>Designation</TableCell>
                                                            <TableCell>Line / Order</TableCell>
                                                            <TableCell align="center" sx={{ width: 110 }}>In Time</TableCell>
                                                            <TableCell align="center" sx={{ width: 110 }}>Out Time</TableCell>
                                                            <TableCell align="center" sx={{ width: 120 }}>Present Status</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {emps.map((emp) => (
                                                            <TableRow
                                                                key={emp.employee}
                                                                hover
                                                                onClick={() => {
                                                                    if (emp.attendance_name) {
                                                                        onViewEmployeeDetails?.(emp.attendance_name);
                                                                    } else {
                                                                        enqueueSnackbar(
                                                                            `No attendance record found for ${emp.employee_name} (${emp.employee}) - Employee is marked ${emp.status}`,
                                                                            { variant: 'info' }
                                                                        );
                                                                    }
                                                                }}
                                                                sx={{
                                                                    cursor: emp.attendance_name ? 'pointer' : 'default',
                                                                    '& td': { borderBottom: '1px solid #e2e8f0', py: 1.25 },
                                                                }}
                                                            >
                                                                <TableCell sx={{ fontWeight: 600, color: emp.attendance_name ? '#2563eb' : '#64748b' }}>
                                                                    {emp.employee}
                                                                </TableCell>
                                                                <TableCell sx={{ fontWeight: 600 }}>{emp.employee_name}</TableCell>
                                                                <TableCell sx={{ color: 'text.secondary' }}>{emp.designation}</TableCell>
                                                                <TableCell sx={{ color: 'text.secondary' }}>{emp.line_order || '--'}</TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 500 }}>
                                                                    {emp.in_time || '--'}
                                                                </TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 500 }}>
                                                                    {emp.out_time || '--'}
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    <Chip
                                                                        label={emp.status}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            fontSize: '0.75rem',
                                                                            bgcolor:
                                                                                emp.status === 'Present'
                                                                                    ? alpha('#059669', 0.12)
                                                                                    : emp.status === 'MP'
                                                                                    ? alpha('#d97706', 0.15)
                                                                                    : alpha('#dc2626', 0.12),
                                                                            color:
                                                                                emp.status === 'Present'
                                                                                    ? '#059669'
                                                                                    : emp.status === 'MP'
                                                                                    ? '#b45309'
                                                                                    : '#dc2626',
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}
                                    </Collapse>
                                </Card>
                            );
                        })
                    )}
                </Stack>
            )}

            {/* TAB 2: Factory Head Count Report */}
            {activeTab === 'headcount' && (() => {
                const staffList = headcountGroupBy === 'department'
                    ? (head_count.staff_departments || head_count.staff || [])
                    : (head_count.staff_designations || head_count.staff || []);

                const workerList = headcountGroupBy === 'department'
                    ? (head_count.worker_departments || head_count.workers || [])
                    : (head_count.worker_designations || head_count.workers || []);

                return (
                    <Stack spacing={3}>
                        {/* Dynamic Switcher Header */}
                        <Card sx={{ p: 2, px: 2.5, border: '1px solid #e2e8f0' }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                                <div>
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
                                        Dynamic Head Count Summary
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        Showing real-time counts grouped by {headcountGroupBy} with expandable breakdowns
                                    </Typography>
                                </div>
                                <Stack direction="row" spacing={1} sx={{ bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1.5 }}>
                                    <Button
                                        size="small"
                                        variant={headcountGroupBy === 'department' ? 'contained' : 'text'}
                                        onClick={() => setHeadcountGroupBy('department')}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.82rem',
                                            bgcolor: headcountGroupBy === 'department' ? '#059669' : 'transparent',
                                            color: headcountGroupBy === 'department' ? '#ffffff' : 'text.secondary',
                                            '&:hover': { bgcolor: headcountGroupBy === 'department' ? '#047857' : alpha('#000', 0.05) },
                                        }}
                                    >
                                        Group by Department
                                    </Button>
                                    <Button
                                        size="small"
                                        variant={headcountGroupBy === 'designation' ? 'contained' : 'text'}
                                        onClick={() => setHeadcountGroupBy('designation')}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.82rem',
                                            bgcolor: headcountGroupBy === 'designation' ? '#059669' : 'transparent',
                                            color: headcountGroupBy === 'designation' ? '#ffffff' : 'text.secondary',
                                            '&:hover': { bgcolor: headcountGroupBy === 'designation' ? '#047857' : alpha('#000', 0.05) },
                                        }}
                                    >
                                        Group by Designation
                                    </Button>
                                </Stack>
                            </Stack>
                        </Card>

                        <Grid container spacing={3}>
                            {/* Staff Table */}
                            <Grid size={{ xs: 12, lg: 6 }}>
                                <Card sx={{ border: '1px solid #e2e8f0', overflow: 'hidden', height: '100%' }}>
                                    <Box sx={{ p: 2, px: 2.5, bgcolor: '#059669', color: '#ffffff' }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                Staff Head Count
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9 }}>
                                                Manpower: {head_count.staff_total.manpower} | Present: {head_count.staff_total.present}
                                            </Typography>
                                        </Stack>
                                    </Box>

                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                                    <TableCell sx={{ fontWeight: 700 }}>
                                                        {headcountGroupBy === 'department' ? 'Staff Department' : 'Staff Designation'}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Manpower</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Actual - Present</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Absent</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Absent %</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {staffList.map((row) => {
                                                    const isExpanded = !!expandedStaffRows[row.category];
                                                    const hasSubs = row.sub_items && row.sub_items.length > 0;
                                                    return (
                                                        <React.Fragment key={row.category}>
                                                            <TableRow
                                                                hover
                                                                onClick={() => {
                                                                    if (hasSubs) {
                                                                        setExpandedStaffRows((prev) => ({ ...prev, [row.category]: !prev[row.category] }));
                                                                    }
                                                                }}
                                                                sx={{ cursor: hasSubs ? 'pointer' : 'default' }}
                                                            >
                                                                <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>
                                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                                        {hasSubs && (
                                                                            <Iconify
                                                                                icon={isExpanded ? 'eva:arrow-ios-downward-fill' : 'eva:arrow-ios-forward-fill'}
                                                                                width={16}
                                                                                sx={{ color: 'text.secondary' }}
                                                                            />
                                                                        )}
                                                                        <span>{row.category}</span>
                                                                    </Stack>
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ fontWeight: 700 }}>{row.manpower}</TableCell>
                                                                <TableCell align="right" sx={{ color: '#059669', fontWeight: 700 }}>{row.present}</TableCell>
                                                                <TableCell align="right" sx={{ color: row.absent > 0 ? '#dc2626' : 'text.secondary', fontWeight: 600 }}>
                                                                    {row.absent}
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ fontWeight: 600, color: row.absent_pct > 20 ? '#dc2626' : 'text.primary' }}>
                                                                    {row.absent_pct.toFixed(1)}%
                                                                </TableCell>
                                                            </TableRow>
                                                            {hasSubs && isExpanded && row.sub_items?.map((sub) => (
                                                                <TableRow key={sub.category} sx={{ bgcolor: alpha('#059669', 0.03) }}>
                                                                    <TableCell sx={{ pl: 5, color: 'text.secondary', fontSize: '0.8rem' }}>
                                                                        ↳ {sub.category}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{sub.manpower}</TableCell>
                                                                    <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#059669' }}>{sub.present}</TableCell>
                                                                    <TableCell align="right" sx={{ fontSize: '0.8rem', color: sub.absent > 0 ? '#dc2626' : 'text.secondary' }}>
                                                                        {sub.absent}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{sub.absent_pct.toFixed(1)}%</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </React.Fragment>
                                                    );
                                                })}

                                                {/* Staff Total Row */}
                                                <TableRow sx={{ bgcolor: alpha('#059669', 0.08), borderTop: '2px solid #059669' }}>
                                                    <TableCell sx={{ fontWeight: 800, color: '#064e3b' }}>
                                                        {head_count.staff_total.category}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#064e3b' }}>
                                                        {head_count.staff_total.manpower}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#059669' }}>
                                                        {head_count.staff_total.present}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>
                                                        {head_count.staff_total.absent}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#064e3b' }}>
                                                        {head_count.staff_total.absent_pct.toFixed(1)}%
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Card>
                            </Grid>

                            {/* Worker's Table */}
                            <Grid size={{ xs: 12, lg: 6 }}>
                                <Card sx={{ border: '1px solid #e2e8f0', overflow: 'hidden', height: '100%' }}>
                                    <Box sx={{ p: 2, px: 2.5, bgcolor: '#059669', color: '#ffffff' }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                Worker&apos;s Head Count
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9 }}>
                                                Manpower: {head_count.workers_total.manpower} | Present: {head_count.workers_total.present}
                                            </Typography>
                                        </Stack>
                                    </Box>

                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                                    <TableCell sx={{ fontWeight: 700 }}>
                                                        {headcountGroupBy === 'department' ? 'Worker Department' : 'Worker Designation'}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Manpower</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Actual - Present</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Absent</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Absent %</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {workerList.map((row) => {
                                                    const isExpanded = !!expandedWorkerRows[row.category];
                                                    const hasSubs = row.sub_items && row.sub_items.length > 0;
                                                    return (
                                                        <React.Fragment key={row.category}>
                                                            <TableRow
                                                                hover
                                                                onClick={() => {
                                                                    if (hasSubs) {
                                                                        setExpandedWorkerRows((prev) => ({ ...prev, [row.category]: !prev[row.category] }));
                                                                    }
                                                                }}
                                                                sx={{ cursor: hasSubs ? 'pointer' : 'default' }}
                                                            >
                                                                <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>
                                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                                        {hasSubs && (
                                                                            <Iconify
                                                                                icon={isExpanded ? 'eva:arrow-ios-downward-fill' : 'eva:arrow-ios-forward-fill'}
                                                                                width={16}
                                                                                sx={{ color: 'text.secondary' }}
                                                                            />
                                                                        )}
                                                                        <span>{row.category}</span>
                                                                    </Stack>
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ fontWeight: 700 }}>{row.manpower}</TableCell>
                                                                <TableCell align="right" sx={{ color: '#059669', fontWeight: 700 }}>{row.present}</TableCell>
                                                                <TableCell align="right" sx={{ color: row.absent > 0 ? '#dc2626' : 'text.secondary', fontWeight: 600 }}>
                                                                    {row.absent}
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ fontWeight: 600, color: row.absent_pct > 20 ? '#dc2626' : 'text.primary' }}>
                                                                    {row.absent_pct.toFixed(1)}%
                                                                </TableCell>
                                                            </TableRow>
                                                            {hasSubs && isExpanded && row.sub_items?.map((sub) => (
                                                                <TableRow key={sub.category} sx={{ bgcolor: alpha('#059669', 0.03) }}>
                                                                    <TableCell sx={{ pl: 5, color: 'text.secondary', fontSize: '0.8rem' }}>
                                                                        ↳ {sub.category}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{sub.manpower}</TableCell>
                                                                    <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#059669' }}>{sub.present}</TableCell>
                                                                    <TableCell align="right" sx={{ fontSize: '0.8rem', color: sub.absent > 0 ? '#dc2626' : 'text.secondary' }}>
                                                                        {sub.absent}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{sub.absent_pct.toFixed(1)}%</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </React.Fragment>
                                                    );
                                                })}

                                                {/* Worker's Total Row */}
                                                <TableRow sx={{ bgcolor: alpha('#059669', 0.08), borderTop: '2px solid #059669' }}>
                                                    <TableCell sx={{ fontWeight: 800, color: '#064e3b' }}>
                                                        {head_count.workers_total.category}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#064e3b' }}>
                                                        {head_count.workers_total.manpower}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#059669' }}>
                                                        {head_count.workers_total.present}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>
                                                        {head_count.workers_total.absent}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#064e3b' }}>
                                                        {head_count.workers_total.absent_pct.toFixed(1)}%
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Card>
                            </Grid>
                        </Grid>

                        {/* Factory Grand Total Banner */}
                        <Card
                            sx={{
                                p: 2.5,
                                bgcolor: '#fffbeb',
                                border: '2px solid #f59e0b',
                                borderRadius: 2,
                                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.12)',
                            }}
                        >
                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                                <div>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#92400e' }}>
                                        {head_count.factory_total.category}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#b45309', fontWeight: 500 }}>
                                        Combined Staff & Worker Attendance Summary for {date}
                                    </Typography>
                                </div>

                                <Stack direction="row" spacing={3} alignItems="center">
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 700 }}>
                                            MANPOWER
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#78350f' }}>
                                            {head_count.factory_total.manpower}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>
                                            PRESENT
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#059669' }}>
                                            {head_count.factory_total.present}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700 }}>
                                            ABSENT
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#dc2626' }}>
                                            {head_count.factory_total.absent}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 700 }}>
                                            ABSENT %
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#92400e' }}>
                                            {head_count.factory_total.absent_pct.toFixed(1)}%
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Stack>
                        </Card>
                    </Stack>
                );
            })()}

            {/* TAB 3: Line Wise Manpower Report */}
            {activeTab === 'linewise' && (
                <Card sx={{ border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <Box sx={{ p: 2, px: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                            <div>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b' }}>
                                    Daily Line Wise Manpower - Attendance
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Breakdown by Existing, New Join (≤30 Days), North Indian, and Total across all lines
                                </Typography>
                            </div>
                            <Chip
                                label={`Grand Total: ${line_wise.factory_grand_total.total.str} Manpower (${line_wise.factory_grand_total.total.pre} Present)`}
                                sx={{ bgcolor: alpha('#059669', 0.1), color: '#047857', fontWeight: 700, border: '1px solid', borderColor: alpha('#059669', 0.25) }}
                            />
                        </Stack>
                    </Box>

                    <TableContainer>
                        <Table size="small" sx={{ minWidth: 1100 }}>
                            <TableHead>
                                {/* Level 1 Group Headers */}
                                <TableRow>
                                    <TableCell
                                        colSpan={2}
                                        sx={{ bgcolor: '#334155', color: '#ffffff', fontWeight: 700, textAlign: 'center', py: 1 }}
                                    >
                                        SECTION & LINE
                                    </TableCell>
                                    <TableCell
                                        colSpan={4}
                                        sx={{ bgcolor: '#2563eb', color: '#ffffff', fontWeight: 700, textAlign: 'center', py: 1, borderLeft: '1px solid rgba(255,255,255,0.2)' }}
                                    >
                                        EXISTING
                                    </TableCell>
                                    <TableCell
                                        colSpan={4}
                                        sx={{ bgcolor: '#0d9488', color: '#ffffff', fontWeight: 700, textAlign: 'center', py: 1, borderLeft: '1px solid rgba(255,255,255,0.2)' }}
                                    >
                                        NEW JOIN
                                    </TableCell>
                                    <TableCell
                                        colSpan={4}
                                        sx={{ bgcolor: '#7c3aed', color: '#ffffff', fontWeight: 700, textAlign: 'center', py: 1, borderLeft: '1px solid rgba(255,255,255,0.2)' }}
                                    >
                                        NORTH INDIAN
                                    </TableCell>
                                    <TableCell
                                        colSpan={4}
                                        sx={{ bgcolor: '#059669', color: '#ffffff', fontWeight: 700, textAlign: 'center', py: 1, borderLeft: '1px solid rgba(255,255,255,0.2)' }}
                                    >
                                        TOTAL
                                    </TableCell>
                                </TableRow>

                                {/* Level 2 Columns */}
                                <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                    <TableCell sx={{ fontWeight: 700, width: 140 }}>SECTION</TableCell>
                                    <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>LINE / DEPARTMENT</TableCell>

                                    {/* Existing */}
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 55, borderLeft: '1px solid #cbd5e1' }}>STR</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 55 }}>PRE</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 55 }}>ABS</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 65 }}>ABS%</TableCell>

                                    {/* New Join */}
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 55, borderLeft: '1px solid #cbd5e1' }}>STR</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 55 }}>PRE</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 55 }}>ABS</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 65 }}>ABS%</TableCell>

                                    {/* North Indian */}
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 55, borderLeft: '1px solid #cbd5e1' }}>STR</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 55 }}>PRE</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 55 }}>ABS</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 65 }}>ABS%</TableCell>

                                    {/* Total */}
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 60, borderLeft: '1px solid #cbd5e1' }}>STR</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 60 }}>PRE</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 60 }}>ABS</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, width: 70 }}>ABS%</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {/* Production Sections */}
                                {line_wise.production_sections.map((sec) => (
                                    <React.Fragment key={sec.section_name}>
                                        {sec.lines.map((l, idx) => (
                                            <TableRow key={l.line_name} hover>
                                                <TableCell sx={{ fontWeight: idx === 0 ? 700 : 400, color: idx === 0 ? '#1e293b' : 'text.disabled' }}>
                                                    {idx === 0 ? sec.section_name : ''}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 500 }}>{l.line_name}</TableCell>

                                                {/* Existing */}
                                                <TableCell align="right" sx={{ borderLeft: '1px solid #e2e8f0' }}>{l.existing.str}</TableCell>
                                                <TableCell align="right" sx={{ color: '#059669' }}>{l.existing.pre}</TableCell>
                                                <TableCell align="right" sx={{ color: l.existing.abs > 0 ? '#dc2626' : 'text.secondary' }}>{l.existing.abs}</TableCell>
                                                <TableCell align="right">{l.existing.abs_pct.toFixed(1)}%</TableCell>

                                                {/* New Join */}
                                                <TableCell align="right" sx={{ borderLeft: '1px solid #e2e8f0' }}>{l.new_join.str}</TableCell>
                                                <TableCell align="right" sx={{ color: '#059669' }}>{l.new_join.pre}</TableCell>
                                                <TableCell align="right" sx={{ color: l.new_join.abs > 0 ? '#dc2626' : 'text.secondary' }}>{l.new_join.abs}</TableCell>
                                                <TableCell align="right">{l.new_join.abs_pct.toFixed(1)}%</TableCell>

                                                {/* North Indian */}
                                                <TableCell align="right" sx={{ borderLeft: '1px solid #e2e8f0' }}>{l.north_indian.str}</TableCell>
                                                <TableCell align="right" sx={{ color: '#059669' }}>{l.north_indian.pre}</TableCell>
                                                <TableCell align="right" sx={{ color: l.north_indian.abs > 0 ? '#dc2626' : 'text.secondary' }}>{l.north_indian.abs}</TableCell>
                                                <TableCell align="right">{l.north_indian.abs_pct.toFixed(1)}%</TableCell>

                                                {/* Total */}
                                                <TableCell align="right" sx={{ borderLeft: '1px solid #e2e8f0', fontWeight: 700 }}>{l.total.str}</TableCell>
                                                <TableCell align="right" sx={{ color: '#059669', fontWeight: 700 }}>{l.total.pre}</TableCell>
                                                <TableCell align="right" sx={{ color: l.total.abs > 0 ? '#dc2626' : 'text.secondary', fontWeight: 700 }}>{l.total.abs}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>{l.total.abs_pct.toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))}

                                        {/* Section Subtotal (only when multiple sections exist) */}
                                        {line_wise.production_sections.length > 1 && (
                                            <TableRow sx={{ bgcolor: alpha('#059669', 0.06), borderBottom: '1px solid #cbd5e1' }}>
                                                <TableCell sx={{ fontWeight: 700, color: '#064e3b' }}>{sec.section_name}</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: '#064e3b' }}>TOTAL</TableCell>

                                            <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 700 }}>{sec.total.existing.str}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>{sec.total.existing.pre}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626' }}>{sec.total.existing.abs}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{sec.total.existing.abs_pct.toFixed(1)}%</TableCell>

                                            <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 700 }}>{sec.total.new_join.str}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>{sec.total.new_join.pre}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626' }}>{sec.total.new_join.abs}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{sec.total.new_join.abs_pct.toFixed(1)}%</TableCell>

                                            <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 700 }}>{sec.total.north_indian.str}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>{sec.total.north_indian.pre}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626' }}>{sec.total.north_indian.abs}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{sec.total.north_indian.abs_pct.toFixed(1)}%</TableCell>

                                            <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 800, color: '#064e3b' }}>{sec.total.total.str}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, color: '#059669' }}>{sec.total.total.pre}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>{sec.total.total.abs}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, color: '#064e3b' }}>{sec.total.total.abs_pct.toFixed(1)}%</TableCell>
                                        </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}

                                {/* Grand Total of Production */}
                                <TableRow sx={{ bgcolor: alpha('#1e40af', 0.12), borderTop: '2px solid #1e40af', borderBottom: '2px solid #1e40af' }}>
                                    <TableCell colSpan={2} sx={{ fontWeight: 800, color: '#1e3a8a', py: 1.2 }}>
                                        {line_wise.production_grand_total.line_name}
                                    </TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 800 }}>{line_wise.production_grand_total.existing.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#059669' }}>{line_wise.production_grand_total.existing.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>{line_wise.production_grand_total.existing.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800 }}>{line_wise.production_grand_total.existing.abs_pct.toFixed(1)}%</TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 800 }}>{line_wise.production_grand_total.new_join.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#059669' }}>{line_wise.production_grand_total.new_join.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>{line_wise.production_grand_total.new_join.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800 }}>{line_wise.production_grand_total.new_join.abs_pct.toFixed(1)}%</TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 800 }}>{line_wise.production_grand_total.north_indian.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#059669' }}>{line_wise.production_grand_total.north_indian.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>{line_wise.production_grand_total.north_indian.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800 }}>{line_wise.production_grand_total.north_indian.abs_pct.toFixed(1)}%</TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 900, color: '#1e3a8a' }}>{line_wise.production_grand_total.total.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#059669' }}>{line_wise.production_grand_total.total.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#dc2626' }}>{line_wise.production_grand_total.total.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#1e3a8a' }}>{line_wise.production_grand_total.total.abs_pct.toFixed(1)}%</TableCell>
                                </TableRow>

                                {/* Non-Production Section */}
                                {line_wise.non_production_section.lines.map((l, idx) => (
                                    <TableRow key={l.line_name} hover>
                                        <TableCell sx={{ fontWeight: idx === 0 ? 700 : 400, color: idx === 0 ? '#1e293b' : 'text.disabled' }}>
                                            {idx === 0 ? line_wise.non_production_section.section_name : ''}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{l.line_name}</TableCell>

                                        <TableCell align="right" sx={{ borderLeft: '1px solid #e2e8f0' }}>{l.existing.str}</TableCell>
                                        <TableCell align="right" sx={{ color: '#059669' }}>{l.existing.pre}</TableCell>
                                        <TableCell align="right" sx={{ color: l.existing.abs > 0 ? '#dc2626' : 'text.secondary' }}>{l.existing.abs}</TableCell>
                                        <TableCell align="right">{l.existing.abs_pct.toFixed(1)}%</TableCell>

                                        <TableCell align="right" sx={{ borderLeft: '1px solid #e2e8f0' }}>{l.new_join.str}</TableCell>
                                        <TableCell align="right" sx={{ color: '#059669' }}>{l.new_join.pre}</TableCell>
                                        <TableCell align="right" sx={{ color: l.new_join.abs > 0 ? '#dc2626' : 'text.secondary' }}>{l.new_join.abs}</TableCell>
                                        <TableCell align="right">{l.new_join.abs_pct.toFixed(1)}%</TableCell>

                                        <TableCell align="right" sx={{ borderLeft: '1px solid #e2e8f0' }}>{l.north_indian.str}</TableCell>
                                        <TableCell align="right" sx={{ color: '#059669' }}>{l.north_indian.pre}</TableCell>
                                        <TableCell align="right" sx={{ color: l.north_indian.abs > 0 ? '#dc2626' : 'text.secondary' }}>{l.north_indian.abs}</TableCell>
                                        <TableCell align="right">{l.north_indian.abs_pct.toFixed(1)}%</TableCell>

                                        <TableCell align="right" sx={{ borderLeft: '1px solid #e2e8f0', fontWeight: 700 }}>{l.total.str}</TableCell>
                                        <TableCell align="right" sx={{ color: '#059669', fontWeight: 700 }}>{l.total.pre}</TableCell>
                                        <TableCell align="right" sx={{ color: l.total.abs > 0 ? '#dc2626' : 'text.secondary', fontWeight: 700 }}>{l.total.abs}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{l.total.abs_pct.toFixed(1)}%</TableCell>
                                    </TableRow>
                                ))}

                                {/* Non-Production Total */}
                                <TableRow sx={{ bgcolor: alpha('#059669', 0.06), borderBottom: '1px solid #cbd5e1' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#064e3b' }}>Non production</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#064e3b' }}>TOTAL</TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 700 }}>{line_wise.non_production_section.total.existing.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>{line_wise.non_production_section.total.existing.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626' }}>{line_wise.non_production_section.total.existing.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{line_wise.non_production_section.total.existing.abs_pct.toFixed(1)}%</TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 700 }}>{line_wise.non_production_section.total.new_join.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>{line_wise.non_production_section.total.new_join.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626' }}>{line_wise.non_production_section.total.new_join.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{line_wise.non_production_section.total.new_join.abs_pct.toFixed(1)}%</TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 700 }}>{line_wise.non_production_section.total.north_indian.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>{line_wise.non_production_section.total.north_indian.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626' }}>{line_wise.non_production_section.total.north_indian.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{line_wise.non_production_section.total.north_indian.abs_pct.toFixed(1)}%</TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #cbd5e1', fontWeight: 800, color: '#064e3b' }}>{line_wise.non_production_section.total.total.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#059669' }}>{line_wise.non_production_section.total.total.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>{line_wise.non_production_section.total.total.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#064e3b' }}>{line_wise.non_production_section.total.total.abs_pct.toFixed(1)}%</TableCell>
                                </TableRow>

                                {/* GRAND TOTAL OF FACTORY */}
                                <TableRow sx={{ bgcolor: '#fffbeb', borderTop: '3px solid #d97706', borderBottom: '3px solid #d97706' }}>
                                    <TableCell colSpan={2} sx={{ fontWeight: 900, color: '#92400e', py: 1.5, fontSize: '0.95rem' }}>
                                        {line_wise.factory_grand_total.line_name}
                                    </TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #f59e0b', fontWeight: 900, color: '#92400e' }}>{line_wise.factory_grand_total.existing.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#059669' }}>{line_wise.factory_grand_total.existing.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#dc2626' }}>{line_wise.factory_grand_total.existing.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#92400e' }}>{line_wise.factory_grand_total.existing.abs_pct.toFixed(1)}%</TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #f59e0b', fontWeight: 900, color: '#92400e' }}>{line_wise.factory_grand_total.new_join.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#059669' }}>{line_wise.factory_grand_total.new_join.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#dc2626' }}>{line_wise.factory_grand_total.new_join.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#92400e' }}>{line_wise.factory_grand_total.new_join.abs_pct.toFixed(1)}%</TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #f59e0b', fontWeight: 900, color: '#92400e' }}>{line_wise.factory_grand_total.north_indian.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#059669' }}>{line_wise.factory_grand_total.north_indian.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#dc2626' }}>{line_wise.factory_grand_total.north_indian.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#92400e' }}>{line_wise.factory_grand_total.north_indian.abs_pct.toFixed(1)}%</TableCell>

                                    <TableCell align="right" sx={{ borderLeft: '1px solid #f59e0b', fontWeight: 900, color: '#92400e', fontSize: '1rem' }}>{line_wise.factory_grand_total.total.str}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#059669', fontSize: '1rem' }}>{line_wise.factory_grand_total.total.pre}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#dc2626', fontSize: '1rem' }}>{line_wise.factory_grand_total.total.abs}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 900, color: '#92400e', fontSize: '1rem' }}>{line_wise.factory_grand_total.total.abs_pct.toFixed(1)}%</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            )}
        </Stack>
    );
}
