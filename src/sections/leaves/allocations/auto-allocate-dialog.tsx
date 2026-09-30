import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, styled } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import {
    autoAllocateMonthlyLeavesNew,
    getMonthlyLeaveAllocationPreview,
    type MonthlyEmployeeAllocationPreview,
} from 'src/api/leave-allocations';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

// Android 12 Switch Style
const Android12Switch = styled(Switch)(({ theme }) => ({
    width: 36,
    height: 20,
    padding: 0,
    marginRight: 6,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 3,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: theme.palette.primary.main,
                opacity: 1,
                border: 0,
            },
            '& .MuiSwitch-thumb': {
                backgroundColor: theme.palette.primary.contrastText,
                width: 14,
                height: 14,
            },
        },
        '&.Mui-disabled + .MuiSwitch-track': {
            opacity: 0.5,
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 14,
        height: 14,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[600],
        boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)',
    },
    '& .MuiSwitch-track': {
        borderRadius: 20 / 2,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 300,
        }),
    },
}));

// Android 12 Button Style
const Android12Button = styled(Button)(({ theme }) => ({
    borderRadius: 20,
    textTransform: 'none',
    fontWeight: 600,
    padding: '6px 16px',
    fontSize: '0.875rem',
    boxShadow: 'none',
    '&:hover': {
        boxShadow: 'none',
    },
}));

// Android 12 Loading Button Style
const Android12LoadingButton = styled(LoadingButton)(({ theme }) => ({
    borderRadius: 20,
    textTransform: 'none',
    fontWeight: 600,
    padding: '6px 16px',
    fontSize: '0.875rem',
    boxShadow: 'none',
    '&:hover': {
        boxShadow: 'none',
    },
}));

// ----------------------------------------------------------------------

interface AutoAllocateDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (data: any) => void;
    onError: (error: string) => void;
    onStartAllocation?: (params: {
        year: number;
        month: number;
        monthName: string;
        employees: string[];
        attendanceMonth?: number;
        attendanceYear?: number;
    }) => void;
}

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AutoAllocateDialog({
    open,
    onClose,
    onSuccess,
    onError,
    onStartAllocation,
}: AutoAllocateDialogProps) {
    const currentDate = new Date();
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [year, setYear] = useState<Dayjs>(dayjs().year(currentDate.getFullYear()));
    const [month, setMonth] = useState(currentDate.getMonth() + 1);

    const [previewData, setPreviewData] = useState<MonthlyEmployeeAllocationPreview[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [allocating, setAllocating] = useState(false);

    // Filters & Pagination state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'selected' | 'unselected'>('all');
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    const [designationFilter, setDesignationFilter] = useState<string>('all');
    const [empStatusFilter, setEmpStatusFilter] = useState<'all' | 'permanent' | 'probation'>('all');
    const [allocStatusFilter, setAllocStatusFilter] = useState<'all' | 'new' | 'existing'>('all');
    const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');

    // Infinite scroll / pagination
    const [visibleCount, setVisibleCount] = useState(50);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const getAttendanceMonthYear = () => {
        const yearVal = year.year();
        const prevDate = new Date(yearVal, month - 2, 1);
        return { attYear: prevDate.getFullYear(), attMonth: prevDate.getMonth() + 1 };
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setDepartmentFilter('all');
        setDesignationFilter('all');
        setEmpStatusFilter('all');
        setAllocStatusFilter('all');
        setLeaveTypeFilter('all');
        setVisibleCount(50);
    };

    const handleClose = () => {
        setStep('input');
        setPreviewData([]);
        setSelectedEmployees([]);
        handleResetFilters();
        onClose();
    };

    const handlePreview = async () => {
        try {
            setLoading(true);
            const yearVal = year.year();
            const { attYear, attMonth } = getAttendanceMonthYear();
            const data = await getMonthlyLeaveAllocationPreview(yearVal, month, attMonth, attYear);
            setPreviewData(data);

            // Default: select employees who have at least one new allocation or all employees
            const allIds = data.map((emp) => emp.employee);
            setSelectedEmployees(allIds);

            handleResetFilters();
            setStep('preview');
        } catch (error: any) {
            onError(error.message || 'Failed to load allocation preview');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep('input');
        setPreviewData([]);
        setSelectedEmployees([]);
        handleResetFilters();
    };

    const handleAllocate = async () => {
        if (selectedEmployees.length === 0) {
            onError('Please select at least one employee to allocate leaves');
            return;
        }

        const yearVal = year.year();
        const { attYear, attMonth } = getAttendanceMonthYear();

        if (onStartAllocation) {
            onStartAllocation({
                year: yearVal,
                month,
                monthName: monthNames[month - 1],
                employees: selectedEmployees,
                attendanceMonth: attMonth,
                attendanceYear: attYear,
            });
            handleClose();
            return;
        }

        try {
            setAllocating(true);
            const data = await autoAllocateMonthlyLeavesNew(
                yearVal,
                month,
                false,
                attMonth,
                attYear,
                selectedEmployees
            );
            onSuccess(data);
            handleClose();
        } catch (error: any) {
            onError(error.message || 'Failed to allocate leaves');
        } finally {
            setAllocating(false);
        }
    };

    // Selection helpers
    const selectedSet = useMemo(() => new Set(selectedEmployees), [selectedEmployees]);

    const handleToggleEmployee = useCallback((id: string) => {
        setSelectedEmployees((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    }, []);

    // Filter Options extracted from previewData
    const departmentOptions = useMemo(() => {
        const set = new Set<string>();
        previewData.forEach((emp) => {
            if (emp.department) set.add(emp.department);
        });
        return Array.from(set).sort();
    }, [previewData]);

    const designationOptions = useMemo(() => {
        const set = new Set<string>();
        previewData.forEach((emp) => {
            if (emp.designation) set.add(emp.designation);
        });
        return Array.from(set).sort();
    }, [previewData]);

    const availableLeaveTypes = useMemo(() => {
        const map = new Map<string, string>();
        previewData.forEach((row) => {
            row.allocations.forEach((a) => {
                if (!map.has(a.leave_type)) {
                    map.set(a.leave_type, a.leave_type_name || a.leave_type);
                }
            });
        });
        return Array.from(map.entries()).map(([key, name]) => ({ key, name }));
    }, [previewData]);

    // Active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (statusFilter !== 'all') count += 1;
        if (departmentFilter !== 'all') count += 1;
        if (designationFilter !== 'all') count += 1;
        if (empStatusFilter !== 'all') count += 1;
        if (allocStatusFilter !== 'all') count += 1;
        if (leaveTypeFilter !== 'all') count += 1;
        if (searchQuery.trim()) count += 1;
        return count;
    }, [
        statusFilter,
        departmentFilter,
        designationFilter,
        empStatusFilter,
        allocStatusFilter,
        leaveTypeFilter,
        searchQuery,
    ]);

    const isFiltered = activeFilterCount > 0;

    // Filter preview data
    const filteredEmployees = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        return previewData.filter((emp) => {
            // Search query
            if (q) {
                const matchName = emp.employee_name?.toLowerCase().includes(q);
                const matchId = emp.employee_id?.toLowerCase().includes(q);
                const matchDoc = emp.employee?.toLowerCase().includes(q);
                const matchDept = emp.department?.toLowerCase().includes(q);
                const matchDesig = emp.designation?.toLowerCase().includes(q);
                if (!matchName && !matchId && !matchDoc && !matchDept && !matchDesig) {
                    return false;
                }
            }

            // Selection status
            const isSelected = selectedSet.has(emp.employee);
            if (statusFilter === 'selected' && !isSelected) return false;
            if (statusFilter === 'unselected' && isSelected) return false;

            // Department
            if (departmentFilter !== 'all' && emp.department !== departmentFilter) return false;

            // Designation
            if (designationFilter !== 'all' && emp.designation !== designationFilter) return false;

            // Employee status (probation vs permanent)
            if (empStatusFilter === 'permanent' && emp.in_probation) return false;
            if (empStatusFilter === 'probation' && !emp.in_probation) return false;

            // Allocation status
            if (allocStatusFilter === 'new') {
                const hasNew = emp.allocations.some((a) => !a.exists && a.total_leaves > 0);
                if (!hasNew) return false;
            } else if (allocStatusFilter === 'existing') {
                const allExisting = emp.allocations.every((a) => a.exists || a.total_leaves === 0);
                if (!allExisting) return false;
            }

            // Leave type
            if (leaveTypeFilter !== 'all') {
                const hasType = emp.allocations.some((a) => a.leave_type === leaveTypeFilter);
                if (!hasType) return false;
            }

            return true;
        });
    }, [
        previewData,
        searchQuery,
        selectedSet,
        statusFilter,
        departmentFilter,
        designationFilter,
        empStatusFilter,
        allocStatusFilter,
        leaveTypeFilter,
    ]);

    const visibleEmployees = useMemo(
        () => filteredEmployees.slice(0, visibleCount),
        [filteredEmployees, visibleCount]
    );

    // Infinite scroll observer
    useEffect(() => {
        if (!loadMoreRef.current) return undefined;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && visibleCount < filteredEmployees.length) {
                    setVisibleCount((prev) => Math.min(prev + 50, filteredEmployees.length));
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [filteredEmployees.length, visibleCount]);

    // Select/Deselect action handlers
    const allSelected = previewData.length > 0 && selectedEmployees.length === previewData.length;

    const handleSelectAll = useCallback(() => {
        setSelectedEmployees(previewData.map((e) => e.employee));
    }, [previewData]);

    const handleDeselectAll = useCallback(() => {
        setSelectedEmployees([]);
    }, []);

    const handleSelectFiltered = useCallback(() => {
        const filteredIds = new Set(filteredEmployees.map((e) => e.employee));
        setSelectedEmployees((prev) => {
            const next = new Set(prev);
            filteredIds.forEach((id) => next.add(id));
            return Array.from(next);
        });
    }, [filteredEmployees]);

    const handleDeselectFiltered = useCallback(() => {
        const filteredIds = new Set(filteredEmployees.map((e) => e.employee));
        setSelectedEmployees((prev) => prev.filter((id) => !filteredIds.has(id)));
    }, [filteredEmployees]);

    // Header checkbox for visible/filtered employees
    const visibleSelectedCount = useMemo(
        () => visibleEmployees.filter((e) => selectedSet.has(e.employee)).length,
        [visibleEmployees, selectedSet]
    );

    const isAllVisibleSelected = visibleEmployees.length > 0 && visibleSelectedCount === visibleEmployees.length;

    const handleToggleSelectAllVisible = () => {
        if (isAllVisibleSelected) {
            const visibleIds = new Set(visibleEmployees.map((e) => e.employee));
            setSelectedEmployees((prev) => prev.filter((id) => !visibleIds.has(id)));
        } else {
            const visibleIds = new Set(visibleEmployees.map((e) => e.employee));
            setSelectedEmployees((prev) => {
                const next = new Set(prev);
                visibleIds.forEach((id) => next.add(id));
                return Array.from(next);
            });
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth={step === 'preview' ? 'lg' : 'sm'}
            PaperProps={{
                sx: {
                    borderRadius: 2.5,
                    height: step === 'preview' ? '88vh' : 'auto',
                    maxHeight: step === 'preview' ? '88vh' : '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            {/* Dialog Title */}
            <DialogTitle
                sx={{
                    m: 0,
                    px: 3,
                    py: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            Auto Allocate Monthly Leaves
                        </Typography>
                        {step === 'preview' && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                {monthNames[month - 1]} {year.year()} • Step 2 of 2: Review & Allocate
                            </Typography>
                        )}
                    </Box>
                </Stack>

                <IconButton onClick={handleClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            {/* Dialog Content */}
            <DialogContent
                sx={{
                    p: step === 'input' ? 3 : 0,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {step === 'input' ? (
                    <Box sx={{ mt: 2 }}>
                        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    views={['year']}
                                    label="Year"
                                    format="YYYY"
                                    value={year}
                                    onChange={(newValue) => setYear(newValue || dayjs())}
                                    slotProps={{ textField: { fullWidth: true } }}
                                />
                            </LocalizationProvider>
                            <TextField
                                select
                                fullWidth
                                label="Month"
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                                InputLabelProps={{ shrink: true }}
                            >
                                {monthNames.map((name, index) => (
                                    <MenuItem key={name} value={index + 1}>
                                        {name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Stack>

                        <Box
                            sx={{
                                mt: 3,
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                                border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                            }}
                        >
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                <Iconify icon="solar:info-circle-bold" width={20} sx={{ color: 'info.main', mt: 0.2 }} />
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'info.darker', mb: 0.5 }}>
                                        Allocation Preview & Rules
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                                        This will preview monthly leave allocations for all active employees for{' '}
                                        <strong>
                                            {monthNames[month - 1]} {year.year()}
                                        </strong>
                                        . Rules evaluated include attendance baselines, leave carry-forward balances, and probation rules.
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
                        {/* Main Employee Table Area (Left) */}
                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                p: 2.5,
                                overflow: 'hidden',
                                minWidth: 0,
                            }}
                        >
                            {/* Search bar & Selection counters */}
                            <Stack spacing={2} sx={{ mb: 2 }}>
                                <TextField
                                    fullWidth
                                    placeholder="Search employee name, ID, department, designation..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setVisibleCount(50);
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Iconify
                                                    icon="eva:search-fill"
                                                    sx={{ color: 'text.disabled', width: 20, height: 20 }}
                                                />
                                            </InputAdornment>
                                        ),
                                        endAdornment: searchQuery ? (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setVisibleCount(50);
                                                    }}
                                                >
                                                    <Iconify icon="mingcute:close-line" width={16} />
                                                </IconButton>
                                            </InputAdornment>
                                        ) : null,
                                    }}
                                />

                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    flexWrap="wrap"
                                    gap={1}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            {selectedEmployees.length} of {previewData.length} selected
                                        </Typography>
                                        {isFiltered && (
                                            <Chip
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                label={`${filteredEmployees.length} matching filter`}
                                            />
                                        )}
                                    </Stack>

                                    <Stack direction="row" spacing={1}>
                                        {isFiltered ? (
                                            <>
                                                <Android12Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={handleSelectFiltered}
                                                    disabled={filteredEmployees.length === 0}
                                                >
                                                    Select Filtered ({filteredEmployees.length})
                                                </Android12Button>
                                                <Android12Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="inherit"
                                                    onClick={handleDeselectFiltered}
                                                    disabled={filteredEmployees.length === 0}
                                                >
                                                    Deselect Filtered
                                                </Android12Button>
                                            </>
                                        ) : (
                                            <>
                                                <Android12Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={handleSelectAll}
                                                    disabled={allSelected}
                                                >
                                                    Select All
                                                </Android12Button>
                                                <Android12Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="inherit"
                                                    onClick={handleDeselectAll}
                                                    disabled={selectedEmployees.length === 0}
                                                >
                                                    Deselect All
                                                </Android12Button>
                                            </>
                                        )}
                                    </Stack>
                                </Stack>
                            </Stack>

                            {/* List Table Area */}
                            <Scrollbar sx={{ flex: 1, pr: 0.5 }}>
                                {filteredEmployees.length === 0 ? (
                                    <Box
                                        sx={{
                                            py: 8,
                                            textAlign: 'center',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Iconify
                                            icon="solar:users-group-rounded-bold"
                                            width={64}
                                            sx={{ color: 'text.disabled', mb: 2 }}
                                        />
                                        <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            No employees found
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5 }}>
                                            Try adjusting your search terms or filter criteria
                                        </Typography>
                                        {isFiltered && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<Iconify icon="solar:restart-bold" />}
                                                onClick={handleResetFilters}
                                                sx={{ mt: 2 }}
                                            >
                                                Reset Filters
                                            </Button>
                                        )}
                                    </Box>
                                ) : (
                                    <TableContainer
                                        sx={{
                                            borderRadius: 1.5,
                                            border: (theme) => `1px solid ${theme.palette.divider}`,
                                        }}
                                    >
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow sx={{ '& th': { bgcolor: 'background.neutral', fontWeight: 700 } }}>
                                                    <TableCell sx={{ width: 60, pl: 2 }}>
                                                        <Android12Switch
                                                            checked={isAllVisibleSelected}
                                                            onChange={handleToggleSelectAllVisible}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ width: 60, fontWeight: 700 }}>
                                                        S.No
                                                    </TableCell>
                                                    <TableCell>Employee</TableCell>
                                                    <TableCell>Joined / Status</TableCell>
                                                    <TableCell>Proposed Allocations</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {visibleEmployees.map((emp, index) => {
                                                    const isSelected = selectedSet.has(emp.employee);

                                                    return (
                                                        <TableRow
                                                            key={emp.employee}
                                                            hover
                                                            onClick={() => handleToggleEmployee(emp.employee)}
                                                            sx={{
                                                                cursor: 'pointer',
                                                                bgcolor: (theme) =>
                                                                    isSelected
                                                                        ? alpha(theme.palette.primary.main, 0.04)
                                                                        : 'transparent',
                                                                '&:hover': {
                                                                    bgcolor: (theme) =>
                                                                        isSelected
                                                                            ? alpha(theme.palette.primary.main, 0.08)
                                                                            : alpha(theme.palette.action.hover, 0.06),
                                                                },
                                                            }}
                                                        >
                                                            <TableCell sx={{ pl: 2 }} onClick={(e) => e.stopPropagation()}>
                                                                <Android12Switch
                                                                    checked={isSelected}
                                                                    onChange={() => handleToggleEmployee(emp.employee)}
                                                                />
                                                            </TableCell>

                                                            <TableCell align="center">
                                                                <Box
                                                                    sx={{
                                                                        width: 28,
                                                                        height: 28,
                                                                        display: 'flex',
                                                                        borderRadius: '50%',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                        color: 'primary.main',
                                                                        typography: 'subtitle2',
                                                                        fontWeight: 800,
                                                                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                                                                        mx: 'auto',
                                                                        transition: (theme) =>
                                                                            theme.transitions.create(['all'], {
                                                                                duration: theme.transitions.duration.shorter,
                                                                            }),
                                                                        '&:hover': {
                                                                            bgcolor: 'primary.main',
                                                                            color: 'primary.contrastText',
                                                                            transform: 'scale(1.1)',
                                                                        },
                                                                    }}
                                                                >
                                                                    {index + 1}
                                                                </Box>
                                                            </TableCell>

                                                            <TableCell>
                                                                <Typography
                                                                    variant="subtitle2"
                                                                    sx={{
                                                                        fontWeight: isSelected ? 700 : 600,
                                                                        color: isSelected ? 'primary.dark' : 'text.primary',
                                                                        lineHeight: 1.2,
                                                                    }}
                                                                >
                                                                    {emp.employee_name}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                    {emp.employee_id || emp.employee}
                                                                    {emp.department ? ` • ${emp.department}` : ''}
                                                                    {emp.designation ? ` • ${emp.designation}` : ''}
                                                                </Typography>
                                                            </TableCell>

                                                            <TableCell>
                                                                <Stack spacing={0.5} alignItems="flex-start">
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                        {emp.date_of_joining ? dayjs(emp.date_of_joining).format('DD MMM YYYY') : '—'}
                                                                    </Typography>
                                                                    <Chip
                                                                        size="small"
                                                                        label={emp.in_probation ? 'Probation' : 'Permanent'}
                                                                        sx={{
                                                                            height: 20,
                                                                            fontSize: 10,
                                                                            fontWeight: 700,
                                                                            bgcolor: (theme) =>
                                                                                emp.in_probation
                                                                                    ? alpha(theme.palette.warning.main, 0.12)
                                                                                    : alpha(theme.palette.success.main, 0.12),
                                                                            color: emp.in_probation ? 'warning.darker' : 'success.darker',
                                                                        }}
                                                                    />
                                                                </Stack>
                                                            </TableCell>

                                                            <TableCell>
                                                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                                    {emp.allocations.map((a) => (
                                                                        <Tooltip
                                                                            key={a.leave_type}
                                                                            title={
                                                                                <Box sx={{ p: 0.5 }}>
                                                                                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                                                                                        {a.leave_type_name || a.leave_type}
                                                                                    </Typography>
                                                                                    <Typography variant="caption" sx={{ display: 'block' }}>
                                                                                        Base: {a.base_leaves} | Carry Forward: {a.carry_forward_balance} | Total: {a.total_leaves}
                                                                                    </Typography>
                                                                                    {a.criteria_reason && (
                                                                                        <Typography variant="caption" sx={{ color: 'warning.light', display: 'block', mt: 0.5 }}>
                                                                                            {a.criteria_reason}
                                                                                        </Typography>
                                                                                    )}
                                                                                    <Typography variant="caption" sx={{ color: a.exists ? 'warning.light' : 'success.light', display: 'block' }}>
                                                                                        {a.exists ? 'Already Allocated for this period' : 'New Allocation'}
                                                                                    </Typography>
                                                                                </Box>
                                                                            }
                                                                            arrow
                                                                        >
                                                                            <Chip
                                                                                size="small"
                                                                                label={`${a.leave_type_name || a.leave_type}: +${a.total_leaves}`}
                                                                                variant={a.exists ? 'outlined' : 'filled'}
                                                                                sx={{
                                                                                    height: 24,
                                                                                    fontSize: '0.75rem',
                                                                                    fontWeight: 700,
                                                                                    bgcolor: (theme) =>
                                                                                        a.exists
                                                                                            ? alpha(theme.palette.grey[500], 0.08)
                                                                                            : alpha(theme.palette.primary.main, 0.12),
                                                                                    color: a.exists ? 'text.secondary' : 'primary.dark',
                                                                                    borderColor: (theme) =>
                                                                                        a.exists ? theme.palette.divider : 'primary.main',
                                                                                }}
                                                                            />
                                                                        </Tooltip>
                                                                    ))}
                                                                </Stack>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}

                                {visibleCount < filteredEmployees.length && (
                                    <Box
                                        ref={loadMoreRef}
                                        sx={{
                                            py: 2.5,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: 1,
                                        }}
                                    >
                                        <CircularProgress size={22} sx={{ color: 'primary.main' }} />
                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                            Showing {visibleEmployees.length} of {filteredEmployees.length} employees
                                        </Typography>
                                    </Box>
                                )}
                            </Scrollbar>
                        </Box>

                        {/* Filter Panel (Right Side) */}
                        <Box
                            sx={{
                                width: { xs: 240, md: 280, lg: 300 },
                                flexShrink: 0,
                                borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                p: 2.5,
                                display: 'flex',
                                flexDirection: 'column',
                                overflowY: 'auto',
                            }}
                        >
                            {/* Filter Header */}
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Iconify icon="solar:filter-bold-duotone" width={20} sx={{ color: 'primary.main' }} />
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                        Filters
                                    </Typography>
                                    {activeFilterCount > 0 && (
                                        <Chip
                                            size="small"
                                            color="primary"
                                            label={activeFilterCount}
                                            sx={{ height: 20, minWidth: 20, fontSize: '0.75rem', fontWeight: 700 }}
                                        />
                                    )}
                                </Stack>

                                {activeFilterCount > 0 && (
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={handleResetFilters}
                                        sx={{ textTransform: 'none', p: 0.5, fontSize: '0.75rem' }}
                                    >
                                        Reset
                                    </Button>
                                )}
                            </Stack>

                            <Stack spacing={2.5}>
                                {/* Selection Status Filter */}
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                                        Selection Status
                                    </Typography>
                                    <ToggleButtonGroup
                                        exclusive
                                        size="small"
                                        fullWidth
                                        value={statusFilter}
                                        onChange={(_, newVal) => {
                                            if (newVal !== null) {
                                                setStatusFilter(newVal);
                                                setVisibleCount(50);
                                            }
                                        }}
                                        sx={{
                                            '& .MuiToggleButton-root': {
                                                py: 0.75,
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                            },
                                        }}
                                    >
                                        <ToggleButton value="all">All ({previewData.length})</ToggleButton>
                                        <ToggleButton value="selected">Selected ({selectedEmployees.length})</ToggleButton>
                                        <ToggleButton value="unselected">Unselected ({previewData.length - selectedEmployees.length})</ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>

                                {/* Department Filter */}
                                <Autocomplete
                                    fullWidth
                                    size="small"
                                    options={departmentOptions}
                                    value={departmentFilter === 'all' ? null : departmentFilter}
                                    onChange={(_, newValue) => {
                                        setDepartmentFilter(newValue || 'all');
                                        setVisibleCount(50);
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Department"
                                            placeholder="All Departments"
                                        />
                                    )}
                                />

                                {/* Designation Filter */}
                                <Autocomplete
                                    fullWidth
                                    size="small"
                                    options={designationOptions}
                                    value={designationFilter === 'all' ? null : designationFilter}
                                    onChange={(_, newValue) => {
                                        setDesignationFilter(newValue || 'all');
                                        setVisibleCount(50);
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Designation"
                                            placeholder="All Designations"
                                        />
                                    )}
                                />

                                {/* Employee Status Filter */}
                                <Autocomplete
                                    fullWidth
                                    size="small"
                                    options={[
                                        { label: 'All Statuses', value: 'all' },
                                        { label: 'Permanent Only', value: 'permanent' },
                                        { label: 'Probation Only', value: 'probation' },
                                    ]}
                                    getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
                                    value={
                                        empStatusFilter === 'all'
                                            ? null
                                            : {
                                                  label: empStatusFilter === 'permanent' ? 'Permanent Only' : 'Probation Only',
                                                  value: empStatusFilter,
                                              }
                                    }
                                    onChange={(_, newValue) => {
                                        setEmpStatusFilter((newValue?.value as any) || 'all');
                                        setVisibleCount(50);
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Employee Status"
                                            placeholder="All Statuses"
                                        />
                                    )}
                                />

                                {/* Allocation Status Filter */}
                                <Autocomplete
                                    fullWidth
                                    size="small"
                                    options={[
                                        { label: 'All Allocations', value: 'all' },
                                        { label: 'Has New Allocations', value: 'new' },
                                        { label: 'Already Allocated', value: 'existing' },
                                    ]}
                                    getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
                                    value={
                                        allocStatusFilter === 'all'
                                            ? null
                                            : {
                                                  label: allocStatusFilter === 'new' ? 'Has New Allocations' : 'Already Allocated',
                                                  value: allocStatusFilter,
                                              }
                                    }
                                    onChange={(_, newValue) => {
                                        setAllocStatusFilter((newValue?.value as any) || 'all');
                                        setVisibleCount(50);
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Allocation Status"
                                            placeholder="All Allocations"
                                        />
                                    )}
                                />

                                {/* Leave Type Filter */}
                                {availableLeaveTypes.length > 0 && (
                                    <Autocomplete
                                        fullWidth
                                        size="small"
                                        options={availableLeaveTypes}
                                        getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.name)}
                                        value={
                                            leaveTypeFilter === 'all'
                                                ? null
                                                : availableLeaveTypes.find((lt) => lt.key === leaveTypeFilter) || null
                                        }
                                        onChange={(_, newValue) => {
                                            setLeaveTypeFilter(newValue?.key || 'all');
                                            setVisibleCount(50);
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Leave Type"
                                                placeholder="All Leave Types"
                                            />
                                        )}
                                    />
                                )}

                                {/* Quick selection summary & batch helper */}
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 1.5,
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                                        border: (theme) => `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ color: 'primary.dark', fontWeight: 700 }}>
                                        Quick Batch
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, mb: 1.5 }}>
                                        Select only the {filteredEmployees.length} employees matching this filter view.
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            fullWidth
                                            onClick={handleSelectFiltered}
                                            disabled={filteredEmployees.length === 0}
                                            sx={{ fontSize: '0.75rem', py: 0.5 }}
                                        >
                                            Select Filtered
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            fullWidth
                                            onClick={handleDeselectFiltered}
                                            disabled={filteredEmployees.length === 0}
                                            sx={{ fontSize: '0.75rem', py: 0.5 }}
                                        >
                                            Deselect
                                        </Button>
                                    </Stack>
                                </Box>
                            </Stack>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            {/* Dialog Actions */}
            <DialogActions
                sx={{
                    px: 3,
                    py: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    justifyContent: step === 'input' ? 'flex-end' : 'space-between',
                }}
            >
                {step === 'input' ? (
                    <Android12LoadingButton
                        variant="contained"
                        loading={loading}
                        onClick={handlePreview}
                        endIcon={<Iconify icon="solar:arrow-right-bold" />}
                    >
                        Preview Allocations
                    </Android12LoadingButton>
                ) : (
                    <>
                        <Android12Button
                            variant="outlined"
                            color="inherit"
                            onClick={handleBack}
                            startIcon={<Iconify icon="solar:arrow-left-outline" />}
                        >
                            Back
                        </Android12Button>

                        <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                <strong>{selectedEmployees.length}</strong> employee{selectedEmployees.length === 1 ? '' : 's'} selected
                            </Typography>
                            <Android12LoadingButton
                                variant="contained"
                                loading={allocating}
                                onClick={handleAllocate}
                                disabled={selectedEmployees.length === 0}
                                startIcon={<Iconify icon="solar:check-circle-bold" />}
                                sx={{
                                    bgcolor: '#059669',
                                    '&:hover': { bgcolor: '#047857' },
                                }}
                            >
                                Allocate Leaves ({selectedEmployees.length})
                            </Android12LoadingButton>
                        </Stack>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
