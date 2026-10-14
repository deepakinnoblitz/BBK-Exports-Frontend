import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';
import { useAuth } from 'src/auth/auth-context';
import {
    EligibleTransferEmployee,
    getEligibleTransferEmployees,
    executeBulkAttendanceTransfer
} from 'src/api/attendance-transfer';
import { AttendanceTransferConfirmDialog } from '../attendance-transfer-confirm-dialog';

export function AttendanceTransferView() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Super Admin Check: User must have HR (or HR Manager) AND System Manager roles, OR be Administrator
    const hasHR = user?.roles?.some((role: string) => ['HR', 'HR Manager'].includes(role));
    const hasSystemManager = user?.roles?.some((role: string) => ['System Manager', 'Administrator'].includes(role));
    const isSuperAdmin = (hasHR && hasSystemManager) || user?.roles?.includes('Administrator');

    // Date state (defaults: Source date = previous Sunday, Target date = following Monday)
    const [sourceDate, setSourceDate] = useState(() => {
        const today = dayjs();
        const dayOfWeek = today.day(); // 0 is Sunday
        return dayOfWeek === 0 ? today.format('YYYY-MM-DD') : today.subtract(dayOfWeek, 'day').format('YYYY-MM-DD');
    });

    const [targetDate, setTargetDate] = useState(() => {
        const today = dayjs();
        const dayOfWeek = today.day();
        const lastSunday = dayOfWeek === 0 ? today : today.subtract(dayOfWeek, 'day');
        return lastSunday.add(1, 'day').format('YYYY-MM-DD'); // Monday
    });

    const [departmentFilter, setDepartmentFilter] = useState('');
    const [searchFilter, setSearchFilter] = useState('');
    const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);

    // Data State
    const [loading, setLoading] = useState(false);
    const [dateInfo, setDateInfo] = useState<{ is_sunday: boolean; is_holiday: boolean } | null>(null);
    const [candidates, setCandidates] = useState<EligibleTransferEmployee[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Dialog & Feedback state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
        open: false,
        message: '',
        severity: 'info'
    });

    // Fetch Candidates handler
    const fetchCandidates = useCallback(async () => {
        if (!sourceDate || !targetDate) return;
        if (sourceDate === targetDate) {
            setSnackbar({ open: true, message: 'Source date and Target date cannot be the same day.', severity: 'error' });
            return;
        }

        setLoading(true);
        try {
            const res = await getEligibleTransferEmployees({
                sourceDate,
                targetDate,
                department: departmentFilter || undefined,
                search: searchFilter || undefined
            });

            setDateInfo({ is_sunday: res.is_sunday, is_holiday: res.is_holiday });
            setCandidates(res.employees || []);
            // Default select all eligible candidates
            setSelectedIds((res.employees || []).filter((e) => e.is_eligible).map((e) => e.employee));

            // Extract unique departments for filter dropdown
            const depts = Array.from(new Set((res.employees || []).map((e) => e.department).filter(Boolean)));
            if (depts.length > 0 && departmentOptions.length === 0) {
                setDepartmentOptions(depts);
            }
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message || 'Failed to fetch candidate employees', severity: 'error' });
            setCandidates([]);
            setSelectedIds([]);
        } finally {
            setLoading(false);
        }
    }, [sourceDate, targetDate, departmentFilter, searchFilter, departmentOptions.length]);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchCandidates();
        }
    }, [isSuperAdmin, fetchCandidates]);

    // Selection handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(candidates.filter((c) => c.is_eligible).map((c) => c.employee));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (empId: string) => {
        setSelectedIds((prev) =>
            prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
        );
    };

    // Execute Transfer
    const handleConfirmTransfer = async (reason: string) => {
        const selectedList = candidates.filter((c) => selectedIds.includes(c.employee));
        if (selectedList.length === 0) return;

        setSubmitting(true);
        try {
            const res = await executeBulkAttendanceTransfer({
                sourceDate,
                targetDate,
                employeeData: selectedList,
                reason
            });

            setConfirmOpen(false);
            setSnackbar({ open: true, message: res.message || 'Transfer completed successfully!', severity: 'success' });

            // Navigate to history page after short delay
            setTimeout(() => {
                navigate('/attendance/transfer-history');
            }, 1200);
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message || 'Transfer execution failed', severity: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    // Access Denied if not Super Admin
    if (!isSuperAdmin) {
        return (
            <DashboardContent maxWidth={false} sx={{ mt: 3 }}>
                <Card sx={{ p: 4, textAlign: 'center' }}>
                    <Iconify icon={"solar:shield-warning-bold-duotone" as any} width={64} sx={{ color: 'error.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        Access Restricted to Super Admin
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 3 }}>
                        Attendance Transfer is an administrative operation restricted strictly to users with both <strong>HR</strong> and <strong>System Manager</strong> roles.
                    </Typography>
                    <Button variant="contained" onClick={() => navigate('/attendance')}>
                        Back to Attendance
                    </Button>
                </Card>
            </DashboardContent>
        );
    }

    const selectedEmployees = candidates.filter((c) => selectedIds.includes(c.employee));
    const allSelected = candidates.length > 0 && selectedIds.length === candidates.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < candidates.length;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: '#7928CA',
                                color: 'common.white'
                            }}
                        >
                            <Iconify icon={"solar:transfer-horizontal-bold-duotone" as any} width={26} />
                        </Box>
                        <Box>
                            <Typography variant="h4" fontWeight={700}>
                                Sunday & Non-Working Day Attendance Transfer
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Bulk adjust worked Sunday / Holiday attendance to an eligible working date instead of Compensatory Off
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<Iconify icon={"solar:history-bold-duotone" as any} />}
                        onClick={() => navigate('/attendance/transfer-history')}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Transfer History
                    </Button>
                    <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<Iconify icon={"solar:arrow-left-bold" as any} />}
                        onClick={() => navigate('/attendance')}
                        sx={{ textTransform: 'none' }}
                    >
                        Back to Attendance
                    </Button>
                </Stack>
            </Stack>

            {/* Filter and Date Selection Card */}
            <Card sx={{ p: 3, mb: 3 }}>
                <Stack spacing={2.5}>
                    <Typography variant="subtitle2" color="text.secondary">
                        1. SELECT SOURCE & TARGET DATES
                    </Typography>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="center">
                        <TextField
                            label="Original Date (Sunday / Holiday)"
                            type="date"
                            value={sourceDate}
                            onChange={(e) => setSourceDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 260, flex: 1 }}
                            helperText={
                                dateInfo?.is_sunday
                                    ? '✓ Sunday detected'
                                    : dateInfo?.is_holiday
                                    ? '✓ Holiday detected'
                                    : 'Please ensure this date is a Sunday or declared non-working holiday'
                            }
                        />

                        <Box sx={{ display: { xs: 'none', md: 'flex' }, color: 'text.secondary', pt: 1 }}>
                            <Iconify icon={"solar:arrow-right-bold" as any} width={24} />
                        </Box>

                        <TextField
                            label="Adjusted Working Date (Target)"
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 260, flex: 1 }}
                            helperText="Target working date where employees were Absent or unrecorded"
                        />

                        <TextField
                            select
                            label="Department"
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            sx={{ minWidth: 200 }}
                        >
                            <MenuItem value="">All Departments</MenuItem>
                            {departmentOptions.map((dept) => (
                                <MenuItem key={dept} value={dept}>
                                    {dept}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Search Employee"
                            placeholder="Name or ID..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            sx={{ minWidth: 200 }}
                        />

                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Iconify icon={"solar:magnifer-bold" as any} />}
                            onClick={fetchCandidates}
                            disabled={loading}
                            sx={{ height: 54, px: 3, minWidth: 160 }}
                        >
                            {loading ? <CircularProgress size={22} color="inherit" /> : 'Find Candidates'}
                        </Button>
                    </Stack>
                </Stack>
            </Card>

            {/* Candidate Table Card */}
            <Card sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                    <Box>
                        <Typography variant="h6">
                            Eligible Employees ({candidates.length})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Employees who worked on {dayjs(sourceDate).format('DD MMM')} and are absent or uncredited on {dayjs(targetDate).format('DD MMM')}.
                        </Typography>
                    </Box>

                    {candidates.length > 0 && (
                        <Button
                            variant="contained"
                            disabled={selectedIds.length === 0}
                            onClick={() => setConfirmOpen(true)}
                            startIcon={<Iconify icon={"solar:transfer-horizontal-bold-duotone" as any} />}
                            sx={{
                                bgcolor: '#7928CA',
                                color: 'common.white',
                                fontWeight: 700,
                                px: 3,
                                '&:hover': { bgcolor: '#611f9f' }
                            }}
                        >
                            Proceed to Transfer ({selectedIds.length})
                        </Button>
                    )}
                </Stack>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : candidates.length === 0 ? (
                    <Alert severity="info" sx={{ my: 2 }}>
                        No eligible candidate records found for <strong>{dayjs(sourceDate).format('DD MMM YYYY')}</strong> to <strong>{dayjs(targetDate).format('DD MMM YYYY')}</strong>.
                        Ensure employees have present punches on the original date and are absent on the target date.
                    </Alert>
                ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                        <Table size="medium">
                            <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? '#f4f6f8' : 'background.neutral' }}>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={allSelected}
                                            indeterminate={isIndeterminate}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </TableCell>
                                    <TableCell>Employee</TableCell>
                                    <TableCell>Department & Shift</TableCell>
                                    <TableCell align="center">Sunday In / Out</TableCell>
                                    <TableCell align="center">Sunday Worked Hours</TableCell>
                                    <TableCell align="center">Target Current Status</TableCell>
                                    <TableCell align="center">Eligibility</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {candidates.map((row) => {
                                    const isSelected = selectedIds.includes(row.employee);
                                    return (
                                        <TableRow
                                            key={row.employee}
                                            hover
                                            selected={isSelected}
                                            onClick={() => handleToggleSelect(row.employee)}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(row.employee)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="subtitle2" fontWeight={600}>
                                                    {row.employee_name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    ID: {row.employee}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{row.department || '-'}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {row.shift || row.designation || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" fontFamily="monospace">
                                                    {row.source_in_time || '--:--'} - {row.source_out_time || '--:--'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={`${row.source_working_hours_display || `${row.source_working_hours}h`}`}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={row.previous_target_status}
                                                    size="small"
                                                    color={row.previous_target_status === 'Absent' ? 'error' : 'default'}
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label="Ready to Transfer"
                                                    size="small"
                                                    color="success"
                                                    icon={<Iconify icon={"solar:check-circle-bold" as any} width={14} />}
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Card>

            {/* Confirmation & Reason Dialog */}
            <AttendanceTransferConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmTransfer}
                sourceDate={sourceDate}
                targetDate={targetDate}
                selectedEmployees={selectedEmployees}
                loading={submitting}
            />

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}
