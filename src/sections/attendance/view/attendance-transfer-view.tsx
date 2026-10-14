import type {
    EligibleTransferEmployee} from 'src/api/attendance-transfer';

import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Badge from '@mui/material/Badge';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import {
    getEligibleTransferEmployees,
    executeBulkAttendanceTransfer
} from 'src/api/attendance-transfer';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuth } from 'src/auth/auth-context';

import { AttendanceTransferConfirmDialog } from '../attendance-transfer-confirm-dialog';

const formatTime = (timeStr?: string | null) => {
    if (!timeStr || timeStr === '--:--' || timeStr === '-') return '--:--';
    const str = String(timeStr).trim();
    if (str.toUpperCase().includes('AM') || str.toUpperCase().includes('PM')) {
        return str;
    }
    const normalized = str.includes(':') && !str.includes(' ') && !str.includes('-') ? `2000-01-01 ${str}` : str;
    const parsed = dayjs(normalized);
    if (parsed.isValid()) {
        return parsed.format('hh:mm A');
    }
    return str;
};

export function AttendanceTransferView() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { enqueueSnackbar } = useSnackbar();

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
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [searchFilter, setSearchFilter] = useState('');
    const [targetStatusFilter, setTargetStatusFilter] = useState('all');
    const [eligibilityFilter, setEligibilityFilter] = useState('all');
    const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

    // Date picker picker modal states for auto-open
    const [openStartDate, setOpenStartDate] = useState(false);
    const [openEndDate, setOpenEndDate] = useState(false);

    // Pagination State
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Data State
    const [loading, setLoading] = useState(false);
    const [candidates, setCandidates] = useState<EligibleTransferEmployee[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Dialog & Feedback state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Initial Options Loading
    useEffect(() => {
        getDoctypeList('Employee', ['name', 'employee_name', 'department', 'shift'])
            .then((emps: any[]) => {
                if (Array.isArray(emps)) setEmployeeOptions(emps);
            })
            .catch(console.error);

        getDoctypeList('Department', ['name'])
            .then((depts: any[]) => {
                if (Array.isArray(depts)) setDepartmentOptions(depts.map((d: any) => d.name));
            })
            .catch(console.error);
    }, []);

    // Fetch Candidates handler
    const fetchCandidates = useCallback(async () => {
        if (!sourceDate || !targetDate) return;
        if (sourceDate === targetDate) {
            enqueueSnackbar('Source date and Target date cannot be the same day.', { variant: 'error' });
            return;
        }

        setLoading(true);
        try {
            const effectiveSearch = selectedEmployee || searchFilter || undefined;
            const res = await getEligibleTransferEmployees({
                sourceDate,
                targetDate,
                department: departmentFilter || undefined,
                search: effectiveSearch
            });

            setCandidates(res.employees || []);
            setPage(0);
            // Default select all eligible candidates
            setSelectedIds((res.employees || []).filter((e) => e.is_eligible).map((e) => e.employee));

            // Extract unique departments if options empty
            const depts = Array.from(new Set((res.employees || []).map((e) => e.department).filter(Boolean)));
            if (depts.length > 0 && departmentOptions.length === 0) {
                setDepartmentOptions(depts);
            }
        } catch (err: any) {
            enqueueSnackbar(err.message || 'Failed to fetch candidate employees', { variant: 'error' });
            setCandidates([]);
            setSelectedIds([]);
        } finally {
            setLoading(false);
        }
    }, [sourceDate, targetDate, departmentFilter, selectedEmployee, searchFilter, departmentOptions.length, enqueueSnackbar]);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchCandidates();
        }
    }, [isSuperAdmin, fetchCandidates]);

    // Selection handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(displayedCandidates.filter((c) => c.is_eligible).map((c) => c.employee));
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
        const selectedList = displayedCandidates.filter((c) => selectedIds.includes(c.employee));
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
            enqueueSnackbar(res.message || 'Transfer completed successfully!', { variant: 'success' });

            // Navigate to history page after short delay
            setTimeout(() => {
                navigate('/attendance/transfer-history');
            }, 1200);
        } catch (err: any) {
            enqueueSnackbar(err.message || 'Transfer execution failed', { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    // Quick presets
    const quickPresets = [
        {
            id: 'this_month',
            label: 'This Month',
            start: dayjs().startOf('month').format('YYYY-MM-DD'),
            end: dayjs().endOf('month').format('YYYY-MM-DD'),
        },
        {
            id: 'past_month',
            label: 'Past Month',
            start: dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
            end: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
        },
        {
            id: 'this_week',
            label: 'This Week',
            start: dayjs().startOf('week').format('YYYY-MM-DD'),
            end: dayjs().endOf('week').format('YYYY-MM-DD'),
        },
        {
            id: 'today',
            label: 'Today',
            start: dayjs().format('YYYY-MM-DD'),
            end: dayjs().format('YYYY-MM-DD'),
        },
        {
            id: 'yesterday',
            label: 'Yesterday',
            start: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
            end: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
        },
    ];

    const isPresetSelected = (start: string, end: string) => {
        if (!sourceDate || !targetDate) return false;
        return (
            dayjs(sourceDate).format('YYYY-MM-DD') === start &&
            dayjs(targetDate).format('YYYY-MM-DD') === end
        );
    };

    const handleStartDateSelect = (newValue: any) => {
        const val = newValue && dayjs(newValue).isValid() ? dayjs(newValue).format('YYYY-MM-DD') : '';
        setSourceDate(val);
        if (newValue && dayjs(newValue).isValid()) {
            setOpenStartDate(false);
            setTimeout(() => {
                setOpenEndDate(true);
            }, 180);
        }
    };

    const handleResetFilters = () => {
        setDepartmentFilter('');
        setSelectedEmployee(null);
        setSearchFilter('');
        setTargetStatusFilter('all');
        setEligibilityFilter('all');
    };

    // Filtered candidate list
    const displayedCandidates = candidates.filter((item) => {
        if (departmentFilter && item.department !== departmentFilter) {
            return false;
        }
        if (selectedEmployee && item.employee !== selectedEmployee) {
            return false;
        }
        if (targetStatusFilter !== 'all' && item.previous_target_status !== targetStatusFilter) {
            return false;
        }
        if (eligibilityFilter === 'eligible' && !item.is_eligible) {
            return false;
        }
        if (eligibilityFilter === 'ineligible' && item.is_eligible) {
            return false;
        }
        return true;
    });

    const paginatedCandidates = displayedCandidates.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const selectedEmployees = displayedCandidates.filter((c) => selectedIds.includes(c.employee));
    const allSelected = displayedCandidates.length > 0 && selectedIds.length === displayedCandidates.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < displayedCandidates.length;

    const activeFilterCount =
        (departmentFilter ? 1 : 0) +
        (selectedEmployee ? 1 : 0) +
        (searchFilter.trim() ? 1 : 0) +
        (targetStatusFilter !== 'all' ? 1 : 0) +
        (eligibilityFilter !== 'all' ? 1 : 0);
    const hasActiveFilters = activeFilterCount > 0;

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

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box>
                            <Typography variant="h4" fontWeight={700}>
                                Attendance Transfer
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => navigate('/attendance')}
                        startIcon={<Iconify icon={"solar:arrow-left-outline" as any} width={18} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 1.75,
                            py: 0.75,
                            borderColor: 'text.primary',
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            },
                        }}
                    >
                        Go Back
                    </Button>

                    <Button
                        variant="contained"
                        startIcon={<Iconify icon={"solar:history-bold-duotone" as any} />}
                        onClick={() => navigate('/attendance/transfer-history')}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 1.75,
                            py: 0.75,
                            bgcolor: '#36b37e',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#2b9065' }
                        }}
                    >
                        Transfer History
                    </Button>
                </Stack>
            </Stack>

            {/* Filter and Date Selection Card */}
            <Card sx={{ p: 2.5, mb: 3 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'stretch', md: 'center' }}
                        sx={{ pt: 1 }}
                    >
                        <Box sx={{ width: { xs: '100%', sm: 220, md: 230 } }}>
                            <DatePicker
                                label="Original Date (Source)"
                                value={sourceDate ? dayjs(sourceDate) : null}
                                onChange={(newVal) => setSourceDate(newVal && dayjs(newVal).isValid() ? dayjs(newVal).format('YYYY-MM-DD') : '')}
                                format="DD-MM-YYYY"
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        size: 'medium',
                                    }
                                }}
                            />
                        </Box>

                        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', color: 'text.secondary' }}>
                            <Iconify icon={"solar:arrow-right-bold" as any} width={20} />
                        </Box>

                        <Box sx={{ width: { xs: '100%', sm: 220, md: 230 } }}>
                            <DatePicker
                                label="Target Date (Adjusted)"
                                value={targetDate ? dayjs(targetDate) : null}
                                onChange={(newVal) => setTargetDate(newVal && dayjs(newVal).isValid() ? dayjs(newVal).format('YYYY-MM-DD') : '')}
                                format="DD-MM-YYYY"
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        size: 'medium',
                                    }
                                }}
                            />
                        </Box>

                        <Button
                            disableRipple
                            onClick={() => setFilterDrawerOpen(true)}
                            sx={{
                                whiteSpace: 'nowrap',
                                minWidth: 'fit-content',
                                height: 54,
                                px: 1.75,
                                bgcolor: COMMON_COLORS.filterButton.bg,
                                color: COMMON_COLORS.filterButton.color,
                                borderRadius: 1.25,
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                textTransform: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 1,
                                boxShadow: 'none',
                                border: 'none',
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                    bgcolor: COMMON_COLORS.filterButton.hoverBg,
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            <Badge
                                color="error"
                                variant="dot"
                                invisible={!hasActiveFilters}
                                sx={{
                                    '& .MuiBadge-badge': {
                                        top: 2,
                                        right: 2,
                                    },
                                }}
                            >
                                <Iconify icon={"solar:filter-linear" as any} width={18} sx={{ color: COMMON_COLORS.filterButton.color, flexShrink: 0 }} />
                            </Badge>
                            <Box component="span" sx={{ whiteSpace: 'nowrap', display: 'inline', fontWeight: 700 }}>
                                {hasActiveFilters ? `Filters (${activeFilterCount})` : 'Filters'}
                            </Box>
                            <Iconify icon={"eva:chevron-down-fill" as any} width={16} sx={{ color: COMMON_COLORS.filterButton.color, flexShrink: 0 }} />
                        </Button>

                        <Button
                            variant="contained"
                            startIcon={<Iconify icon={"solar:magnifer-linear" as any} width={18} />}
                            onClick={fetchCandidates}
                            disabled={loading}
                            sx={{
                                height: 54,
                                borderRadius: 1.25,
                                px: 2.5,
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                textTransform: 'none',
                                whiteSpace: 'nowrap',
                                bgcolor: '#059669',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#047857' }
                            }}
                        >
                            {loading ? <CircularProgress size={18} color="inherit" /> : 'Find Candidates'}
                        </Button>
                    </Stack>
                </LocalizationProvider>
            </Card>

            {/* Candidate Table Card */}
            <Card sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                    <Box>
                        <Typography variant="h6">
                            Eligible Employees ({displayedCandidates.length})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Employees who worked on {dayjs(sourceDate).format('DD MMM')} and are absent or uncredited on {dayjs(targetDate).format('DD MMM')}.
                        </Typography>
                    </Box>

                    {displayedCandidates.length > 0 && (
                        <Button
                            variant="contained"
                            disabled={selectedIds.length === 0}
                            onClick={() => setConfirmOpen(true)}
                            startIcon={<Iconify icon={"solar:transfer-horizontal-bold-duotone" as any} />}
                            sx={{
                                bgcolor: '#36b37e',
                                color: 'common.white',
                                fontWeight: 700,
                                px: 3,
                                '&:hover': { bgcolor: '#2b9065' }
                            }}
                        >
                            Proceed to Transfer ({selectedIds.length})
                        </Button>
                    )}
                </Stack>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                            <Table size="medium">
                                <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? '#f4f6f8' : 'background.neutral' }}>
                                    <TableRow>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={allSelected}
                                                indeterminate={isIndeterminate}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                disabled={displayedCandidates.length === 0}
                                            />
                                        </TableCell>
                                        <TableCell>Employee</TableCell>
                                        <TableCell>Department & Shift</TableCell>
                                        <TableCell align="center">Source In / Out</TableCell>
                                        <TableCell align="center">Source Worked Hours</TableCell>
                                        <TableCell align="center">Target Current Status</TableCell>
                                        <TableCell align="center">Eligibility</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                                <CircularProgress />
                                            </TableCell>
                                        </TableRow>
                                    ) : displayedCandidates.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} sx={{ p: 0 }}>
                                                <Box
                                                    sx={{
                                                        py: 6,
                                                        px: 3,
                                                        display: 'flex',
                                                        textAlign: 'center',
                                                        alignItems: 'center',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 76,
                                                            height: 76,
                                                            borderRadius: '50%',
                                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            mb: 2,
                                                            color: 'primary.main',
                                                        }}
                                                    >
                                                        <Iconify icon="solar:users-group-rounded-bold-duotone" width={44} />
                                                    </Box>

                                                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
                                                        No eligible candidate records found for{' '}
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                color: 'primary.main',
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            {dayjs(sourceDate).format('DD MMM YYYY')}
                                                        </Box>
                                                        {' '}to{' '}
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                color: 'primary.main',
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            {dayjs(targetDate).format('DD MMM YYYY')}
                                                        </Box>
                                                    </Typography>

                                                    <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 540, lineHeight: 1.6 }}>
                                                        Ensure employees have present punches on the original date and are absent on the target date.
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedCandidates.map((row) => {
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
                                                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                                                            {formatTime(row.source_in_time)} - {formatTime(row.source_out_time)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Label variant="soft" color="info" sx={{ fontWeight: 700 }}>
                                                            {row.source_working_hours_display || `${row.source_working_hours}h`}
                                                        </Label>
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
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TablePagination
                            component="div"
                            count={displayedCandidates.length}
                            page={page}
                            onPageChange={(_, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                        />
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

            {/* Filter Drawer */}
            <Drawer
                anchor="right"
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                slotProps={{
                    paper: {
                        sx: {
                            width: 320,
                            boxShadow: (theme: any) => theme.customShadows.z24,
                        },
                    },
                }}
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 100,
                }}
            >
                {/* Drawer Header */}
                <Box
                    sx={{
                        py: 2.5,
                        pl: 3,
                        pr: 2,
                        display: 'flex',
                        alignItems: 'center',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                        Filters
                    </Typography>

                    <IconButton
                        onClick={handleResetFilters}
                        disabled={!hasActiveFilters}
                        sx={{
                            mr: 0.5,
                            color: hasActiveFilters ? 'primary.main' : 'text.disabled',
                            '&:hover': {
                                bgcolor: hasActiveFilters ? 'primary.lighter' : 'transparent',
                            },
                        }}
                    >
                        <Badge color="error" variant="dot" invisible={!hasActiveFilters}>
                            <Iconify icon="solar:restart-bold" width={20} />
                        </Badge>
                    </IconButton>

                    <IconButton
                        onClick={() => setFilterDrawerOpen(false)}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                bgcolor: 'action.hover',
                            },
                        }}
                    >
                        <Iconify icon="mingcute:close-line" width={20} />
                    </IconButton>
                </Box>

                {/* Drawer Body */}
                <Scrollbar>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Stack spacing={3} sx={{ p: 3 }}>
                            {/* Employee Autocomplete */}
                            <Stack spacing={1.5}>
                                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                    Employee
                                </Typography>
                                <Autocomplete
                                    fullWidth
                                    options={['all', ...employeeOptions.map((e) => e.name)]}
                                    getOptionLabel={(option) => {
                                        if (option === 'all') return 'All Employees';
                                        const employee = employeeOptions.find((e) => e.name === option);
                                        return employee ? `${employee.employee_name} (${employee.name})` : option;
                                    }}
                                    filterOptions={(opts, state) => {
                                        const input = state.inputValue.toLowerCase().trim();
                                        if (!input) {
                                            const selectedEmp = selectedEmployee ? [selectedEmployee] : [];
                                            const first50 = opts.filter(
                                                (opt) => opt !== 'all' && !selectedEmp.includes(opt)
                                            ).slice(0, 50);
                                            return ['all', ...selectedEmp, ...first50];
                                        }
                                        const terms = input.split(/\s+/).filter(Boolean);
                                        const filtered = opts.filter((opt) => {
                                            if (opt === 'all') return 'all employees'.includes(input);
                                            const emp = employeeOptions.find((e) => e.name === opt);
                                            if (!emp) return opt.toLowerCase().includes(input);
                                            const fullName = emp.employee_name || '';
                                            const empId = emp.name || '';
                                            const combined = `${fullName} ${empId} (${empId})`.toLowerCase();
                                            return terms.every((term) => combined.includes(term));
                                        });
                                        return filtered.slice(0, 50);
                                    }}
                                    value={selectedEmployee || 'all'}
                                    onChange={(_, newValue) => setSelectedEmployee(newValue === 'all' ? null : newValue)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            placeholder="Search employee..."
                                            size="small"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5,
                                                    bgcolor: 'background.neutral',
                                                    '&:hover': {
                                                        bgcolor: 'action.hover',
                                                    },
                                                },
                                            }}
                                        />
                                    )}
                                    renderOption={(props, option) => {
                                        if (option === 'all') {
                                            return (
                                                <li {...props} key="all">
                                                    All Employees
                                                </li>
                                            );
                                        }
                                        const employee = employeeOptions.find((e) => e.name === option);
                                        const { key, ...optionProps } = props as any;
                                        return (
                                            <li key={key} {...optionProps}>
                                                <Stack spacing={0.5}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                        {employee?.employee_name}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        ID: {employee?.name}
                                                    </Typography>
                                                </Stack>
                                            </li>
                                        );
                                    }}
                                />
                            </Stack>

                            {/* Department Autocomplete */}
                            <Stack spacing={1.5}>
                                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                    Department
                                </Typography>
                                <Autocomplete
                                    fullWidth
                                    options={['all', ...departmentOptions]}
                                    getOptionLabel={(option) => (option === 'all' ? 'All Departments' : option)}
                                    value={departmentFilter || 'all'}
                                    onChange={(_, newValue) => setDepartmentFilter(newValue === 'all' ? '' : (newValue || ''))}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            placeholder="Search department..."
                                            size="small"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5,
                                                    bgcolor: 'background.neutral',
                                                    '&:hover': {
                                                        bgcolor: 'action.hover',
                                                    },
                                                },
                                            }}
                                        />
                                    )}
                                    renderOption={(props, option) => {
                                        const { key, ...optionProps } = props as any;
                                        return (
                                            <li key={key} {...optionProps}>
                                                {option === 'all' ? 'All Departments' : option}
                                            </li>
                                        );
                                    }}
                                />
                            </Stack>

                            {/* Quick Select Presets */}
                            <Box sx={{ mb: 1.5 }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.primary',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        display: 'block',
                                        pb: 1.5,
                                    }}
                                >
                                    Quick Select:
                                </Typography>

                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {quickPresets.map((preset) => {
                                        const selected = isPresetSelected(preset.start, preset.end);
                                        return (
                                            <Button
                                                key={preset.id}
                                                size="small"
                                                onClick={() => {
                                                    setSourceDate(preset.start);
                                                    setTargetDate(preset.end);
                                                }}
                                                sx={{
                                                    borderRadius: 1,
                                                    py: 0.5,
                                                    px: 1.25,
                                                    fontWeight: 700,
                                                    fontSize: '0.75rem',
                                                    textTransform: 'none',
                                                    ...(selected
                                                        ? {
                                                            bgcolor: '#059669',
                                                            color: 'common.white',
                                                            boxShadow: '0 2px 8px 0 rgba(5, 150, 105, 0.35)',
                                                            '&:hover': {
                                                                bgcolor: '#047857',
                                                            },
                                                        }
                                                        : {
                                                            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                                            color: 'text.secondary',
                                                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
                                                            '&:hover': {
                                                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.16),
                                                                color: 'text.primary',
                                                            },
                                                        }),
                                                }}
                                            >
                                                {preset.label}
                                            </Button>
                                        );
                                    })}
                                </Box>
                            </Box>

                            {/* Date Range */}
                            <Stack spacing={1.5}>
                                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                    Date Range
                                </Typography>
                                <Stack spacing={2}>
                                    <DatePicker
                                        label="Original Date (Source)"
                                        format="DD-MM-YYYY"
                                        open={openStartDate}
                                        onOpen={() => setOpenStartDate(true)}
                                        onClose={() => setOpenStartDate(false)}
                                        value={sourceDate ? dayjs(sourceDate) : null}
                                        onChange={handleStartDateSelect}
                                        onAccept={handleStartDateSelect}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                size: 'small',
                                                onClick: () => setOpenStartDate(true),
                                                sx: {
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 1.5,
                                                        bgcolor: 'background.neutral',
                                                        '&:hover': {
                                                            bgcolor: 'action.hover',
                                                        },
                                                    },
                                                }
                                            }
                                        }}
                                    />
                                    <DatePicker
                                        label="Target Date (Adjusted)"
                                        format="DD-MM-YYYY"
                                        open={openEndDate}
                                        onOpen={() => setOpenEndDate(true)}
                                        onClose={() => setOpenEndDate(false)}
                                        value={targetDate ? dayjs(targetDate) : null}
                                        onChange={(newVal) => setTargetDate(newVal && dayjs(newVal).isValid() ? dayjs(newVal).format('YYYY-MM-DD') : '')}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                size: 'small',
                                                onClick: () => setOpenEndDate(true),
                                                sx: {
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 1.5,
                                                        bgcolor: 'background.neutral',
                                                        '&:hover': {
                                                            bgcolor: 'action.hover',
                                                        },
                                                    },
                                                }
                                            }
                                        }}
                                    />
                                </Stack>
                            </Stack>

                            {/* Target Status */}
                            <Stack spacing={1.5}>
                                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                    Target Status
                                </Typography>
                                <FormControl fullWidth size="small">
                                    <Select
                                        value={targetStatusFilter}
                                        onChange={(e) => setTargetStatusFilter(e.target.value)}
                                        displayEmpty
                                        sx={{
                                            borderRadius: 1.5,
                                            bgcolor: 'background.neutral',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                        }}
                                    >
                                        <MenuItem value="all">All Status</MenuItem>
                                        <MenuItem value="Absent">Absent</MenuItem>
                                        <MenuItem value="Not Marked">Not Marked</MenuItem>
                                        <MenuItem value="Half Day">Half Day</MenuItem>
                                        <MenuItem value="On Leave">On Leave</MenuItem>
                                        <MenuItem value="Holiday">Holiday</MenuItem>
                                        <MenuItem value="Compensatory Off">Compensatory Off</MenuItem>
                                        <MenuItem value="Missing">Missing</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>

                            {/* Eligibility Filter */}
                            <Stack spacing={1.5}>
                                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                    Eligibility
                                </Typography>
                                <FormControl fullWidth size="small">
                                    <Select
                                        value={eligibilityFilter}
                                        onChange={(e) => setEligibilityFilter(e.target.value)}
                                        displayEmpty
                                        sx={{
                                            borderRadius: 1.5,
                                            bgcolor: 'background.neutral',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                        }}
                                    >
                                        <MenuItem value="all">All Eligibility</MenuItem>
                                        <MenuItem value="eligible">Ready to Transfer</MenuItem>
                                        <MenuItem value="ineligible">Ineligible</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                        </Stack>
                    </LocalizationProvider>
                </Scrollbar>

                {/* Drawer Footer */}
                <Box
                    sx={{
                        p: 2.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.neutral',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                    }}
                >
                    <Button
                        fullWidth
                        size="large"
                        variant="contained"
                        onClick={() => {
                            setFilterDrawerOpen(false);
                            fetchCandidates();
                        }}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            bgcolor: '#059669',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#047857' },
                        }}
                    >
                        Apply Filters
                    </Button>

                    <Button
                        fullWidth
                        size="large"
                        color="inherit"
                        variant="outlined"
                        onClick={handleResetFilters}
                        disabled={!hasActiveFilters}
                        startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                        sx={{
                            borderRadius: 1.5,
                            borderColor: 'divider',
                            fontWeight: 600,
                            '&:hover': {
                                borderColor: 'error.main',
                                color: 'error.main',
                                bgcolor: 'error.lighter',
                            },
                            '&.Mui-disabled': {
                                borderColor: 'divider',
                            },
                        }}
                    >
                        Clear All Filters
                    </Button>
                </Box>
            </Drawer>
        </DashboardContent>
    );
}
