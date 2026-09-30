import dayjs from 'dayjs';
import { useMemo, useState, useEffect } from 'react';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

import { alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
    Box,
    Card,
    Chip,
    Stack,
    Table,
    Alert,
    Badge,
    Drawer,
    Button,
    Dialog,
    TableRow,
    MenuItem,
    TableBody,
    TableCell,
    TableHead,
    TextField,
    Typography,
    IconButton,
    DialogTitle,
    Autocomplete,
    DialogContent,
    TableContainer,
    InputAdornment,
    TablePagination,
} from '@mui/material';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// ----------------------------------------------------------------------

interface AllocationResult {
    created_count: number;
    skipped_count: number;
    created_details: {
        employee_name: string;
        employee_id: string;
        leave_type: string;
        allocated?: number;
        total_leaves?: number;
        carry_forward?: number;
        from_date?: string;
        to_date?: string;
        status?: string;
    }[];
    errors: string[];
}

interface Props {
    open: boolean;
    onClose: VoidFunction;
    data: AllocationResult | null;
}

type ResultFilters = {
    employee: string;
    status: string;
    leave_type: string;
    startDate: string | null;
    endDate: string | null;
};

const defaultFilters: ResultFilters = {
    employee: 'all',
    status: 'all',
    leave_type: 'all',
    startDate: null,
    endDate: null,
};

export default function AutoAllocateResultDialog({ open, onClose, data }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState<ResultFilters>(defaultFilters);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [employeeOptions, setEmployeeOptions] = useState<Array<{ name: string; employee_name?: string }>>([]);
    const [leaveTypeOptions, setLeaveTypeOptions] = useState<Array<{ name: string }>>([]);

    useEffect(() => {
        if (open) {
            getDoctypeList('Employee', ['name', 'employee_name'])
                .then((res: any) => {
                    if (Array.isArray(res)) {
                        setEmployeeOptions(res);
                    }
                })
                .catch((err) => {
                    console.error('Failed to load employees in result dialog:', err);
                });

            getDoctypeList('Leave Type', ['name'])
                .then((res: any) => {
                    if (Array.isArray(res)) {
                        setLeaveTypeOptions(res);
                    }
                })
                .catch((err) => {
                    console.error('Failed to load leave types in result dialog:', err);
                });
        }
    }, [open]);

    const handleFiltersChange = (field: keyof ResultFilters, value: any) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters(defaultFilters);
        setSearchQuery('');
        setPage(0);
    };

    const canReset =
        filters.employee !== 'all' ||
        filters.status !== 'all' ||
        filters.leave_type !== 'all' ||
        filters.startDate !== null ||
        filters.endDate !== null ||
        searchQuery.trim() !== '';

    // Extract options merged with full employee list
    const uniqueEmployees = useMemo(() => {
        const map = new Map<string, string>();

        // 1. Add all system employees
        employeeOptions.forEach((emp: any) => {
            const id = String(emp.name || emp.employee || emp.employee_id || '').trim();
            const name = String(emp.employee_name || emp.name || id).trim();
            if (id) {
                map.set(id, name);
            }
        });

        // 2. Also ensure any employees present in allocation result details are included
        if (data?.created_details) {
            data.created_details.forEach((item: any) => {
                const id = String(item.employee_id || item.employee || '').trim();
                const name = String(item.employee_name || item.name || id).trim();
                if (id && !map.has(id)) {
                    map.set(id, name);
                }
            });
        }

        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [employeeOptions, data]);

    const uniqueLeaveTypes = useMemo(() => {
        const set = new Set<string>();
        leaveTypeOptions.forEach((lt: any) => {
            if (lt.name) set.add(lt.name.trim());
        });
        if (data?.created_details) {
            data.created_details.forEach((item) => {
                if (item.leave_type) {
                    set.add(item.leave_type.trim());
                }
            });
        }
        return Array.from(set);
    }, [leaveTypeOptions, data]);

    const filteredDetails = useMemo(() => {
        if (!data?.created_details) return [];
        return data.created_details.filter((detail: any) => {
            const searchLower = searchQuery.trim().toLowerCase();
            const matchesSearch =
                !searchLower ||
                String(detail.employee_name || '').toLowerCase().includes(searchLower) ||
                String(detail.employee_id || detail.employee || '').toLowerCase().includes(searchLower) ||
                String(detail.leave_type || '').toLowerCase().includes(searchLower);

            const empId = String(detail.employee_id || detail.employee || '').trim().toLowerCase();
            const empName = String(detail.employee_name || '').trim().toLowerCase();
            const selectedEmp = filters.employee.trim().toLowerCase();
            const matchesEmployee =
                !filters.employee ||
                filters.employee === 'all' ||
                empId === selectedEmp ||
                empName === selectedEmp;

            const detailStatus = String(detail.status || 'Created').trim().toLowerCase();
            const matchesStatus =
                !filters.status ||
                filters.status === 'all' ||
                detailStatus === filters.status.trim().toLowerCase();

            const detailLeaveType = String(detail.leave_type || '').trim().toLowerCase();
            const matchesLeaveType =
                !filters.leave_type ||
                filters.leave_type === 'all' ||
                detailLeaveType === filters.leave_type.trim().toLowerCase();

            const matchesDateRange = (() => {
                if (!filters.startDate && !filters.endDate) return true;
                const fromDateStr = detail.from_date || detail.date || detail.creation;
                const toDateStr = detail.to_date || fromDateStr;
                if (!fromDateStr && !toDateStr) return true;
                if (filters.startDate && fromDateStr && dayjs(fromDateStr).isBefore(dayjs(filters.startDate), 'day')) {
                    return false;
                }
                if (filters.endDate && toDateStr && dayjs(toDateStr).isAfter(dayjs(filters.endDate), 'day')) {
                    return false;
                }
                return true;
            })();

            return matchesSearch && matchesEmployee && matchesStatus && matchesLeaveType && matchesDateRange;
        });
    }, [data, searchQuery, filters]);

    const paginatedDetails = useMemo(
        () => filteredDetails.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [filteredDetails, page, rowsPerPage]
    );

    if (!data) return null;

    const getLeaveTypeColor = (leaveType: string): any => {
        const map: Record<string, any> = {
            'Paid Leave': 'primary',
            'Unpaid Leave': 'warning',
            'Permission': 'info',
            'Sick Leave': 'error',
            'Casual Leave': 'success',
        };

        return map[leaveType] || 'default';
    };



    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        borderRadius: 2.5,
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: (theme) => `0 24px 48px -12px ${alpha(theme.palette.common.black, 0.24)}`,
                    },
                }}
            >
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
                        flexShrink: 0,
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            Leave Allocation Result
                        </Typography>
                    </Stack>
                    <IconButton onClick={onClose} sx={{ color: 'text.disabled' }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent
                    sx={{
                        p: { xs: 2, sm: 3 },
                        pt: { xs: 2, sm: 2.5 },
                        bgcolor: 'background.paper',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        flex: 1,
                    }}
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        <Typography variant="h5" sx={{ mb: 2, fontWeight: 800, color: 'text.primary', flexShrink: 0 }}>
                            Allocation Completed Successfully!
                        </Typography>

                        {/* Metric Cards */}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5, flexShrink: 0 }}>
                            <Card
                                sx={{
                                    p: 2,
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
                                    border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.12)}`,
                                    boxShadow: 'none',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 1.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'success.main',
                                        color: 'common.white',
                                        boxShadow: (theme) => `0 8px 16px -4px ${alpha(theme.palette.success.main, 0.4)}`,
                                    }}
                                >
                                    <Iconify icon="eva:checkmark-fill" width={28} />
                                </Box>
                                <Stack>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                        {data.created_count}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                        Allocations Created
                                    </Typography>
                                </Stack>
                            </Card>

                            <Card
                                sx={{
                                    p: 2,
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.04),
                                    border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.12)}`,
                                    boxShadow: 'none',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 1.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'warning.main',
                                        color: 'common.white',
                                        boxShadow: (theme) => `0 8px 16px -4px ${alpha(theme.palette.warning.main, 0.4)}`,
                                    }}
                                >
                                    <Iconify icon="solar:double-alt-arrow-right-bold" width={28} />
                                </Box>
                                <Stack>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                        {data.skipped_count}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                        Already Existing / Skipped
                                    </Typography>
                                </Stack>
                            </Card>

                            <Card
                                sx={{
                                    p: 2,
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    bgcolor: (theme) => alpha(theme.palette.error.main, 0.04),
                                    border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.12)}`,
                                    boxShadow: 'none',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 1.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'error.main',
                                        color: 'common.white',
                                        boxShadow: (theme) => `0 8px 16px -4px ${alpha(theme.palette.error.main, 0.4)}`,
                                    }}
                                >
                                    <Iconify icon={'solar:danger-triangle-bold' as any} width={28} />
                                </Box>
                                <Stack>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                        {data.errors?.length || 0}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                        Errors Encountered
                                    </Typography>
                                </Stack>
                            </Card>
                        </Stack>

                        {/* Detailed Log Title, Search & Filters Bar */}
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            justifyContent="space-between"
                            spacing={1.5}
                            sx={{ mb: 1.5, flexShrink: 0 }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', px: 0.5 }}>
                                Detailed Log ({filteredDetails.length})
                            </Typography>

                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <TextField
                                    size="small"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setPage(0);
                                    }}
                                    placeholder="Search employee..."
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: searchQuery ? (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setPage(0);
                                                    }}
                                                >
                                                    <Iconify icon="solar:close-circle-bold" width={16} />
                                                </IconButton>
                                            </InputAdornment>
                                        ) : null,
                                    }}
                                    sx={{ width: { xs: '100%', sm: 260 } }}
                                />

                                <Button
                                    disableRipple
                                    onClick={() => setOpenFilters(true)}
                                    startIcon={
                                        <Badge color="error" variant="dot" invisible={!canReset}>
                                            <Iconify icon={'solar:filter-bold' as any} width={18} />
                                        </Badge>
                                    }
                                    sx={{
                                        height: 40,
                                        px: 2,
                                        borderRadius: 1.25,
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        textTransform: 'none',
                                        bgcolor: COMMON_COLORS.filterButton.bg,
                                        color: COMMON_COLORS.filterButton.color,
                                        '&:hover': {
                                            bgcolor: COMMON_COLORS.filterButton.hoverBg,
                                        },
                                    }}
                                >
                                    Filters
                                </Button>
                            </Stack>
                        </Stack>

                        {/* Table Container */}
                        <TableContainer
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                flex: 1,
                                minHeight: 200,
                                maxHeight: { xs: 240, sm: 300, md: 340 },
                                overflow: 'auto',
                                bgcolor: 'background.neutral',
                            }}
                        >
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Leave Type</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                                            Carry Forward
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                                            Total Allocated
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                                            Status
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {paginatedDetails.map((detail: any) => (
                                        <TableRow hover key={`${detail.employee_id || detail.employee}-${detail.leave_type}`}>
                                            {/* Employee */}
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                    {detail.employee_name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {detail.employee_id || detail.employee}
                                                </Typography>
                                            </TableCell>

                                            {/* Leave Type */}
                                            <TableCell>
                                                <Chip
                                                    label={detail.leave_type}
                                                    size="small"
                                                    color={getLeaveTypeColor(detail.leave_type)}
                                                    variant="filled"
                                                    sx={{
                                                        fontWeight: 700,
                                                        minWidth: 110,
                                                    }}
                                                />
                                            </TableCell>

                                            {/* Carry Forward */}
                                            <TableCell align="center">
                                                {(detail.carry_forward ?? 0) > 0 ? (
                                                    <Chip
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        icon={
                                                            <Iconify
                                                                icon={'solar:arrow-up-bold' as any}
                                                                width={14}
                                                            />
                                                        }
                                                        label={`+${detail.carry_forward}`}
                                                    />
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">
                                                        —
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            {/* Allocated */}
                                            <TableCell align="center">
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: 'success.main',
                                                    }}
                                                >
                                                    {detail.allocated ?? detail.total_leaves ?? 0}
                                                </Typography>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell align="center">
                                                <Chip
                                                    icon={
                                                        <Iconify
                                                            icon={'eva:checkmark-circle-2-fill' as any}
                                                            width={16}
                                                        />
                                                    }
                                                    label={detail.status || 'Created'}
                                                    color="success"
                                                    size="small"
                                                    variant="filled"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {filteredDetails.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                sx={{
                                                    py: 5,
                                                    textAlign: 'center',
                                                }}
                                            >
                                                <Stack spacing={1} alignItems="center">
                                                    <Iconify
                                                        icon="solar:folder-bold-duotone"
                                                        width={48}
                                                        sx={{ color: 'text.disabled' }}
                                                    />
                                                    <Typography variant="body2" color="text.secondary">
                                                        No matching records found.
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Pagination Bar - Always Visible */}
                        <Box sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', mt: 0.5 }}>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                component="div"
                                count={filteredDetails.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={(e, newPage) => setPage(newPage)}
                                onRowsPerPageChange={(e) => {
                                    setRowsPerPage(parseInt(e.target.value, 10));
                                    setPage(0);
                                }}
                                sx={{
                                    borderTop: 'none',
                                    '& .MuiTablePagination-toolbar': {
                                        px: 1,
                                        minHeight: 48,
                                    },
                                }}
                            />
                        </Box>

                        {data.errors && data.errors.length > 0 && (
                            <Box sx={{ mt: 2, flexShrink: 0, maxHeight: 120, overflow: 'auto' }}>
                                <Alert
                                    severity="error"
                                    variant="outlined"
                                    sx={{ borderRadius: 1.5, '& .MuiAlert-message': { width: '100%' } }}
                                >
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                        Errors Encountered ({data.errors.length}):
                                    </Typography>
                                    <Box
                                        component="ul"
                                        sx={{ m: 0, pl: 2, fontSize: '0.75rem', fontFamily: 'monospace' }}
                                    >
                                        {data.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </Box>
                                </Alert>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Filter Drawer */}
            <Drawer
                anchor="right"
                open={openFilters}
                onClose={() => setOpenFilters(false)}
                slotProps={{
                    paper: {
                        sx: {
                            width: 340,
                            boxShadow: (theme) => theme.customShadows?.z24,
                        },
                    },
                }}
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 200,
                }}
            >
                {/* Header */}
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
                        disabled={!canReset}
                        sx={{
                            mr: 0.5,
                            color: canReset ? 'primary.main' : 'text.disabled',
                            '&:hover': {
                                bgcolor: canReset ? 'primary.lighter' : 'transparent',
                            },
                        }}
                    >
                        <Badge color="error" variant="dot" invisible={!canReset}>
                            <Iconify icon={'solar:restart-bold' as any} width={20} />
                        </Badge>
                    </IconButton>

                    <IconButton
                        onClick={() => setOpenFilters(false)}
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

                {/* Filter Controls */}
                <Scrollbar>
                    <Stack spacing={3} sx={{ p: 3 }}>
                        {/* Employee Autocomplete with Popper zIndex */}
                        <Stack spacing={1.5}>
                            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                Employee
                            </Typography>
                            <Autocomplete
                                fullWidth
                                options={['all', ...uniqueEmployees.map((e) => e.id)]}
                                getOptionLabel={(option) => {
                                    if (option === 'all') return 'All Employees';
                                    const employee = uniqueEmployees.find((e) => e.id === option);
                                    return employee ? `${employee.name} (${employee.id})` : option;
                                }}
                                filterOptions={(opts, state) => {
                                    const input = state.inputValue.toLowerCase().trim();
                                    const currentEmp = uniqueEmployees.find((e) => e.id === filters.employee);
                                    const currentLabel = currentEmp ? `${currentEmp.name} (${currentEmp.id})`.toLowerCase() : 'all employees';

                                    if (!input || input === 'all' || input === 'all employees' || input === currentLabel) {
                                        const selectedEmp = filters.employee && filters.employee !== 'all' ? [filters.employee] : [];
                                        const first50 = opts.filter(
                                            (opt) => opt !== 'all' && !selectedEmp.includes(opt)
                                        ).slice(0, 50);
                                        return ['all', ...selectedEmp, ...first50];
                                    }

                                    const terms = input.split(/\s+/).filter(Boolean);
                                    const filtered = opts.filter((opt) => {
                                        if (opt === 'all') return 'all employees'.includes(input);
                                        const employee = uniqueEmployees.find((e) => e.id === opt);
                                        if (!employee) return opt.toLowerCase().includes(input);
                                        const fullName = employee.name || '';
                                        const empId = employee.id || '';
                                        const combined = `${fullName} ${empId} (${empId})`.toLowerCase();
                                        return terms.every((term: string) => combined.includes(term));
                                    });
                                    return filtered.slice(0, 50);
                                }}
                                value={filters.employee || 'all'}
                                onChange={(event, newValue) => {
                                    handleFiltersChange('employee', !newValue || newValue === 'all' ? 'all' : newValue);
                                }}
                                slotProps={{
                                    popper: {
                                        sx: {
                                            zIndex: (theme) => theme.zIndex.drawer + 300,
                                        },
                                    },
                                }}
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
                                        const { key, ...itemProps } = props as any;
                                        return (
                                            <li key="all" {...itemProps}>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    All Employees
                                                </Typography>
                                            </li>
                                        );
                                    }
                                    const employee = uniqueEmployees.find((e) => e.id === option);
                                    const { key, ...optionProps } = props as any;
                                    return (
                                        <li key={key || option} {...optionProps}>
                                            <Stack spacing={0.25}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                    {employee?.name || option}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    ID: {employee?.id || option}
                                                </Typography>
                                            </Stack>
                                        </li>
                                    );
                                }}
                            />
                        </Stack>

                        {/* Status */}
                        <Stack spacing={1.5}>
                            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                Status
                            </Typography>
                            <TextField
                                select
                                fullWidth
                                value={filters.status}
                                onChange={(e) => handleFiltersChange('status', e.target.value)}
                                SelectProps={{
                                    MenuProps: {
                                        sx: {
                                            zIndex: (theme) => theme.zIndex.drawer + 300,
                                        },
                                    },
                                }}
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
                            >
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="Created">Created</MenuItem>
                                <MenuItem value="Skipped">Skipped</MenuItem>
                                <MenuItem value="Error">Error</MenuItem>
                            </TextField>
                        </Stack>

                        {/* Leave Type */}
                        <Stack spacing={1.5}>
                            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                Leave Type
                            </Typography>
                            <TextField
                                select
                                fullWidth
                                value={filters.leave_type}
                                onChange={(e) => handleFiltersChange('leave_type', e.target.value)}
                                SelectProps={{
                                    MenuProps: {
                                        sx: {
                                            zIndex: (theme) => theme.zIndex.drawer + 300,
                                        },
                                    },
                                }}
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
                            >
                                <MenuItem value="all">All Types</MenuItem>
                                {uniqueLeaveTypes.map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Stack>

                        {/* Date Range */}
                        <Stack spacing={2}>
                            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                                Date Range
                            </Typography>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <Stack spacing={2}>
                                    <DatePicker
                                        label="From Date"
                                        format="DD-MM-YYYY"
                                        value={filters.startDate ? dayjs(filters.startDate) : null}
                                        onChange={(newValue) => {
                                            handleFiltersChange(
                                                'startDate',
                                                newValue ? dayjs(newValue).format('YYYY-MM-DD') : null
                                            );
                                        }}
                                        slotProps={{
                                            popper: {
                                                sx: {
                                                    zIndex: (theme) => theme.zIndex.drawer + 300,
                                                },
                                            },
                                            dialog: {
                                                sx: {
                                                    zIndex: (theme) => theme.zIndex.drawer + 300,
                                                },
                                            },
                                            textField: {
                                                fullWidth: true,
                                                size: 'medium',
                                                InputLabelProps: { shrink: true },
                                                sx: {
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 1.5,
                                                        bgcolor: 'background.paper',
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                    <DatePicker
                                        label="To Date"
                                        format="DD-MM-YYYY"
                                        value={filters.endDate ? dayjs(filters.endDate) : null}
                                        onChange={(newValue) => {
                                            handleFiltersChange(
                                                'endDate',
                                                newValue ? dayjs(newValue).format('YYYY-MM-DD') : null
                                            );
                                        }}
                                        slotProps={{
                                            popper: {
                                                sx: {
                                                    zIndex: (theme) => theme.zIndex.drawer + 300,
                                                },
                                            },
                                            dialog: {
                                                sx: {
                                                    zIndex: (theme) => theme.zIndex.drawer + 300,
                                                },
                                            },
                                            textField: {
                                                fullWidth: true,
                                                size: 'medium',
                                                InputLabelProps: { shrink: true },
                                                sx: {
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 1.5,
                                                        bgcolor: 'background.paper',
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                </Stack>
                            </LocalizationProvider>
                        </Stack>
                    </Stack>
                </Scrollbar>

                {/* Footer */}
                <Box
                    sx={{
                        p: 2.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.neutral',
                    }}
                >
                    <Button
                        fullWidth
                        size="large"
                        color="inherit"
                        variant="outlined"
                        startIcon={<Iconify icon={'solar:trash-bin-trash-bold' as any} />}
                        onClick={handleResetFilters}
                        disabled={!canReset}
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
        </>
    );
}
