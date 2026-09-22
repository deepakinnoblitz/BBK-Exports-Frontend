import type {
    AutoLeaveAllocationLog} from 'src/api/leave-allocations';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useSocket } from 'src/hooks/use-socket';
import { useLeaveAllocations } from 'src/hooks/useLeaveAllocations';

import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import { getHRPermissions } from 'src/api/hr-management';
import {
    createLeaveAllocation,
    deleteLeaveAllocation,
    updateLeaveAllocation,
    fetchAutoLeaveAllocationLogs,
} from 'src/api/leave-allocations';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../lead/table-no-data';
import AutoAllocateDialog from './auto-allocate-dialog';
import AutoAllocateResultDialog from './auto-allocate-result-dialog';
import { LeaveAllocationTableRow } from './leave-allocation-table-row';
import { AutoAllocateLogTableRow } from './auto-allocate-log-table-row';
import { LeadTableHead as LeavesTableHead } from '../../lead/lead-table-head';
import AutoAllocateLogDetailsDialog from './auto-allocate-log-details-dialog';
import { LeaveAllocationDetailsDialog } from './leave-allocation-details-dialog';
import { LeaveAllocationFiltersDrawer } from './leave-allocation-filters-drawer';
import { AutoAllocateLogFiltersDrawer } from './auto-allocate-log-filters-drawer';
import { LeadTableToolbar as LeavesTableToolbar } from '../../lead/lead-table-toolbar';

import type { LogFiltersProps } from './auto-allocate-log-filters-drawer';
// ----------------------------------------------------------------------

const SORT_OPTIONS = [
    { value: 'modified_desc', label: 'Newest First' },
    { value: 'modified_asc', label: 'Oldest First' },
    { value: 'employee_name_asc', label: 'Employee: A to Z' },
    { value: 'employee_name_desc', label: 'Employee: Z to A' },
];

const LOG_SORT_OPTIONS = [
    { value: 'execution_date_desc', label: 'Newest First' },
    { value: 'execution_date_asc', label: 'Oldest First' },
    { value: 'created_count_desc', label: 'Allocations: High to Low' },
    { value: 'created_count_asc', label: 'Allocations: Low to High' },
];

const LOG_TABLE_HEAD = [
    { id: 'name', label: 'Log ID / Time', width: 220 },
    { id: 'target_period', label: 'Target Period', width: 180 },
    { id: 'execution_type', label: 'Execution Mode', width: 140 },
    { id: 'executed_by', label: 'Executed By', width: 160 },
    { id: 'created_count', label: 'Allocations Summary', align: 'center' as const, width: 180 },
    { id: 'status', label: 'Status', align: 'center' as const, width: 120 },
    { id: 'actions', label: 'Actions', align: 'right' as const, width: 80 },
];

export function LeaveAllocationView() {
    const { user } = useAuth();
    const { socket } = useSocket(user?.email);

    const isHR = user?.roles?.some((role: string) =>
        ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
    );

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.leave_allocate;
    const canCreateLeaveAllocation = hasCustomPerms && user?.permissions?.actions?.leave_allocate ? !!user?.permissions?.actions?.leave_allocate?.create : true;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState<{
        status: string;
        leave_type: string;
        employee: string | null;
        startDate: string | null;
        endDate: string | null;
    }>({
        status: 'all',
        leave_type: 'all',
        employee: null,
        startDate: null,
        endDate: null,
    });

    const [openCreate, setOpenCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedAllocationName, setSelectedAllocationName] = useState<string | null>(null);

    // Form state
    const [employee, setEmployee] = useState('');
    const [leaveType, setLeaveType] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [totalLeaves, setTotalLeaves] = useState('');
    const [leavesTaken, setLeavesTaken] = useState('');
    const [status, setStatus] = useState('Approved');

    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
    const [leaveTypeOptions, setLeaveTypeOptions] = useState<any[]>([]);

    // Validation State
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(null);
    const [openAutoAllocate, setOpenAutoAllocate] = useState(false);
    const [openDetails, setOpenDetails] = useState(false);
    const [openResult, setOpenResult] = useState(false);
    const [resultData, setResultData] = useState<any>(null);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [permissions, setPermissions] = useState<{ read: boolean; write: boolean; delete: boolean }>({
        read: true,
        write: true,
        delete: true,
    });

    // Tab State
    const [currentTab, setCurrentTab] = useState<'allocations' | 'logs'>('allocations');

    // Logs Tab State
    const [logPage, setLogPage] = useState(0);
    const [logRowsPerPage, setLogRowsPerPage] = useState(10);
    const [logSearch, setLogSearch] = useState('');
    const [logSortBy, setLogSortBy] = useState('execution_date_desc');
    const [openLogFilters, setOpenLogFilters] = useState(false);
    const [logFilters, setLogFilters] = useState<LogFiltersProps>({
        status: 'all',
        execution_type: 'all',
        year: 'all',
        month: 'all',
    });
    const [logData, setLogData] = useState<AutoLeaveAllocationLog[]>([]);
    const [logTotal, setLogTotal] = useState(0);
    const [logLoading, setLogLoading] = useState(false);
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
    const [openLogDetails, setOpenLogDetails] = useState(false);

    const canResetLogFilters =
        logFilters.status !== 'all' ||
        logFilters.execution_type !== 'all' ||
        logFilters.year !== 'all' ||
        logFilters.month !== 'all' ||
        !!logSearch;

    const handleResetLogFilters = () => {
        setLogFilters({
            status: 'all',
            execution_type: 'all',
            year: 'all',
            month: 'all',
        });
        setLogSearch('');
        setLogPage(0);
    };

    const handleLogFilters = (update: Partial<LogFiltersProps>) => {
        setLogFilters((prev) => ({ ...prev, ...update }));
        setLogPage(0);
    };

    const { data, total, loading, refetch } = useLeaveAllocations(
        page + 1,
        rowsPerPage,
        filterName,
        {
            ...(filters.status !== 'all' ? { status: filters.status } : {}),
            ...(filters.leave_type !== 'all' ? { leave_type: filters.leave_type } : {}),
            ...(filters.employee ? { employee: filters.employee } : {}),
            // Show allocations that overlap with the selected range:
            // Allocation's 'to_date' must be after or on 'startDate' AND 'from_date' must be before or on 'endDate'
            ...(filters.startDate ? { to_date: ['>=', filters.startDate] } : {}),
            ...(filters.endDate ? { from_date: ['<=', filters.endDate] } : {}),
        },
        orderBy,
        order,
    );

    useEffect(() => {
        getHRPermissions('Leave Allocation').then(setPermissions);
        getDoctypeList('Employee', ['name', 'employee_name']).then(setEmployeeOptions);
        getDoctypeList('Leave Type', ['name']).then(setLeaveTypeOptions);
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            setLogLoading(true);
            const res = await fetchAutoLeaveAllocationLogs({
                page: logPage + 1,
                limit: logRowsPerPage,
                search: logSearch || undefined,
                status: logFilters.status,
                execution_type: logFilters.execution_type,
                year: logFilters.year !== 'all' ? logFilters.year : undefined,
                month: logFilters.month !== 'all' ? logFilters.month : undefined,
                sort_by: logSortBy,
            });
            setLogData(res.data || []);
            setLogTotal(res.total || 0);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLogLoading(false);
        }
    }, [logPage, logRowsPerPage, logSearch, logFilters, logSortBy]);

    useEffect(() => {
        if (currentTab === 'logs') {
            fetchLogs();
        }
    }, [currentTab, fetchLogs]);

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!employee) errors.employee = 'Employee is required';
        if (!leaveType) errors.leaveType = 'Leave Type is required';
        if (!fromDate) errors.fromDate = 'From Date is required';
        if (!toDate) errors.toDate = 'To Date is required';
        if (!totalLeaves) errors.totalLeaves = 'Total Leaves is required';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
            return;
        }

        try {
            setCreating(true);
            const payload = {
                employee,
                leave_type: leaveType,
                from_date: fromDate,
                to_date: toDate,
                total_leaves_allocated: Number(totalLeaves),
                total_leaves_taken: Number(leavesTaken || 0),
                status,
            };

            if (isEdit && selectedAllocationName) {
                await updateLeaveAllocation(selectedAllocationName, payload);
                setSnackbar({ open: true, message: 'Leave allocation updated successfully', severity: 'success' });
            } else {
                await createLeaveAllocation(payload);
                setSnackbar({ open: true, message: 'Leave allocation created successfully', severity: 'success' });
            }
            refetch();
            handleCloseCreate();
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = (row: any) => {
        setSelectedAllocationName(row.name);
        setEmployee(row.employee);
        setLeaveType(row.leave_type);
        setFromDate(row.from_date);
        setToDate(row.to_date);
        setTotalLeaves(String(row.total_leaves_allocated));
        setLeavesTaken(String(row.total_leaves_taken || 0));
        setStatus(row.status || 'Approved');
        setIsEdit(true);
        setOpenCreate(true);
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteLeaveAllocation(confirmDelete.id);
            setSnackbar({ open: true, message: 'Deleted successfully', severity: 'success' });
            refetch();
        } catch (e: any) {
            setSnackbar({ open: true, message: e.message, severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setEmployee('');
        setLeaveType('');
        setFromDate('');
        setToDate('');
        setTotalLeaves('');
        setLeavesTaken('');
        setStatus('Approved');
        setFormErrors({});
        setIsEdit(false);
        setSelectedAllocationName(null);
    };

    return (
        <DashboardContent maxWidth={false} sx={{mt: 2}}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: { xs: 3, md: 5 } }}>
                <Stack spacing={1}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Leave Allocations
                    </Typography>
                </Stack>


                <Stack direction="row" spacing={2}>
                    {permissions.write && canCreateLeaveAllocation &&(
                        <Button
                            variant="outlined"
                            startIcon={<Iconify icon="solar:calendar-add-bold" />}
                            onClick={() => setOpenAutoAllocate(true)}
                            sx={{
                                borderColor: '#059669',
                                color: '#059669',
                                '&:hover': {
                                    borderColor: '#047857',
                                    bgcolor: (theme) => alpha('#059669', 0.08)
                                }
                            }}
                        >
                            Allocate Monthly Leave
                        </Button>
                    )}
                    {permissions.write && canCreateLeaveAllocation &&(
                        <Button
                            variant="contained"
                            startIcon={<Iconify icon="mingcute:add-line" />}
                            onClick={() => setOpenCreate(true)}
                            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                        >
                            New Allocation
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Tabs
                    value={currentTab}
                    onChange={(_, val) => setCurrentTab(val)}
                    sx={{
                        px: 0,
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                            minHeight: 48,
                            fontWeight: 700,
                            typography: 'subtitle2',
                            marginRight: (theme) => theme.spacing(1),
                            '&:last-of-type': {
                                marginRight: 0,
                            },
                            '&.Mui-selected': { color: '#059669' },
                        },
                    }}
                >
                    <Tab
                        value="allocations"
                        label="Allocation List"
                        icon={<Iconify icon="solar:list-bold" width={20} />}
                        iconPosition="start"
                    />
                    <Tab
                        value="logs"
                        label="Auto Allocate Leave Log"
                        icon={<Iconify icon="solar:history-bold" width={20} />}
                        iconPosition="start"
                    />
                </Tabs>
            </Stack>

            {currentTab === 'allocations' && (
            <Card>
                <LeavesTableToolbar
                    numSelected={0}
                    filterName={filterName}
                    onFilterName={(e) => setFilterName(e.target.value)}
                    searchPlaceholder="Search allocations..."
                    sortBy={`${orderBy}_${order}`}
                    onSortChange={(val) => {
                        const index = val.lastIndexOf('_');
                        const f = val.substring(0, index);
                        const d = val.substring(index + 1);
                        setOrderBy(f);
                        setOrder(d as any);
                    }}

                    sortOptions={SORT_OPTIONS}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={filters.status !== 'all' || filters.leave_type !== 'all' || filters.employee !== null || filters.startDate !== null || filters.endDate !== null || !!filterName}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <LeavesTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={data.length}
                                numSelected={0}
                                onSelectAllRows={() => { }}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'employee', label: 'Employee' },
                                    { id: 'leave_type', label: 'Leave Type' },
                                    { id: 'allocation_source', label: 'Source' },
                                    { id: 'from_date', label: 'Period' },
                                    { id: 'total_leaves_allocated', label: 'Allocated', align: 'center' },
                                    { id: 'total_leaves_taken', label: 'Taken', align: 'center' },
                                    { id: 'status', label: 'Status' },
                                    { id: '', label: '' },
                                ]}
                            />

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <LeaveAllocationTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    employee: row.employee,
                                                    employeeName: row.employee_name,
                                                    leaveType: row.leave_type,
                                                    allocationSource: row.allocation_source || 'Manual',
                                                    fromDate: row.from_date,
                                                    toDate: row.to_date,
                                                    totalLeaves: row.total_leaves_allocated,
                                                    leavesTaken: row.total_leaves_taken,
                                                    status: row.workflow_state || row.status,
                                                }}
                                                selected={false}
                                                onSelectRow={() => { }}
                                                onView={() => {
                                                    setSelectedAllocationId(row.name);
                                                    setOpenDetails(true);
                                                }}
                                                onEdit={() => handleEdit(row)}
                                                onDelete={() => setConfirmDelete({ open: true, id: row.name })}
                                                canEdit={permissions.write}
                                                canDelete={permissions.delete}
                                            />
                                        ))}

                                        {data.length > 0 && data.length < 5 && (
                                            <>
                                                {Array.from({ length: 5 - data.length }).map((_, i) => (
                                                    <TableRow
                                                        key={`empty-${i}`}
                                                        sx={{
                                                            height: 68,
                                                            '& td': { borderBottom: 'none' },
                                                        }}
                                                    >
                                                        <TableCell colSpan={8} />
                                                    </TableRow>
                                                ))}
                                            </>
                                        )}

                                        {filterName && !data.length && (
                                            <TableNoData searchQuery={filterName} />
                                        )}

                                        {!data.length && !filterName && (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <EmptyContent title="No Leave Allocation Found" sx={{ py: 16 }} />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Scrollbar>

                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(_: any, p: number) => setPage(p)}
                    onRowsPerPageChange={(e: any) => setRowsPerPage(parseInt(e.target.value, 10))}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </Card>
            )}

            {currentTab === 'logs' && (
                <Card>
                    <LeavesTableToolbar
                        numSelected={0}
                        filterName={logSearch}
                        onFilterName={(e) => {
                            setLogSearch(e.target.value);
                            setLogPage(0);
                        }}
                        searchPlaceholder="Search logs by ID, period, user..."
                        sortBy={logSortBy}
                        onSortChange={(val) => {
                            setLogSortBy(val);
                            setLogPage(0);
                        }}
                        sortOptions={LOG_SORT_OPTIONS}
                        onOpenFilter={() => setOpenLogFilters(true)}
                        canReset={canResetLogFilters}
                    />

                    <Scrollbar>
                        <TableContainer sx={{ overflow: 'unset' }}>
                            <Table sx={{ minWidth: 800 }}>
                                <LeavesTableHead
                                    order={logSortBy.endsWith('_asc') ? 'asc' : 'desc'}
                                    orderBy={logSortBy.replace(/_(asc|desc)$/, '')}
                                    headLabel={LOG_TABLE_HEAD}
                                    rowCount={logData.length}
                                    numSelected={0}
                                    onSelectAllRows={() => {}}
                                    hideCheckbox
                                    showIndex
                                />

                                <TableBody>
                                    {logLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 12 }}>
                                                <CircularProgress sx={{ color: '#059669' }} />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {logData.map((row, index) => (
                                                <AutoAllocateLogTableRow
                                                    key={row.name}
                                                    index={logPage * logRowsPerPage + index}
                                                    row={row}
                                                    onView={() => {
                                                        setSelectedLogId(row.name);
                                                        setOpenLogDetails(true);
                                                    }}
                                                />
                                            ))}

                                            {logData.length > 0 && logData.length < 5 && (
                                                <>
                                                    {Array.from({ length: 5 - logData.length }).map((_, i) => (
                                                        <TableRow
                                                            key={`empty-log-${i}`}
                                                            sx={{
                                                                height: 68,
                                                                '& td': { borderBottom: 'none' },
                                                            }}
                                                        >
                                                            <TableCell colSpan={8} />
                                                        </TableRow>
                                                    ))}
                                                </>
                                            )}

                                            {logSearch && !logData.length && (
                                                <TableNoData searchQuery={logSearch} />
                                            )}

                                            {!logData.length && !logSearch && (
                                                <TableRow>
                                                    <TableCell colSpan={8}>
                                                        <EmptyContent
                                                            title="No Auto Allocation Logs Found"
                                                            description="Logs will appear here whenever automatic or manual monthly allocations are executed."
                                                            sx={{ py: 16 }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Scrollbar>

                    <TablePagination
                        component="div"
                        count={logTotal}
                        page={logPage}
                        rowsPerPage={logRowsPerPage}
                        onPageChange={(_: any, p: number) => setLogPage(p)}
                        onRowsPerPageChange={(e: any) => {
                            setLogRowsPerPage(parseInt(e.target.value, 10));
                            setLogPage(0);
                        }}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Card>
            )}

            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {isEdit ? 'Edit Leave Allocation' : 'New Leave Allocation'}
                    <IconButton onClick={handleCloseCreate} sx={{ color: (theme) => theme.palette.grey[500] }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box display="grid" gridTemplateColumns="1fr" gap={3} sx={{ mt: 1 }}>
                        <Autocomplete
                            fullWidth
                            options={employeeOptions}
                            getOptionLabel={(opt) => `${opt.employee_name} (${opt.name})`}
                            value={employeeOptions.find((opt) => opt.name === employee) || null}
                            onChange={(event, newValue) => {
                                setEmployee(newValue ? newValue.name : '');
                                if (formErrors.employee) setFormErrors((prev) => ({ ...prev, employee: '' }));
                            }}
                            renderOption={(props, option) => {
                                const { key, ...optionProps } = props as any;
                                return (
                                    <li key={key} {...optionProps}>
                                        <Stack spacing={0.5}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                {option.employee_name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                ID: {option.name}
                                            </Typography>
                                        </Stack>
                                    </li>
                                );
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Employee"
                                    required
                                    error={!!formErrors.employee}
                                    helperText={formErrors.employee}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                                />
                            )}
                        />

                        <Autocomplete
                            fullWidth
                            options={leaveTypeOptions}
                            getOptionLabel={(opt) => opt.name}
                            value={leaveTypeOptions.find((opt) => opt.name === leaveType) || null}
                            onChange={(event, newValue) => {
                                setLeaveType(newValue ? newValue.name : '');
                                if (formErrors.leaveType) setFormErrors((prev) => ({ ...prev, leaveType: '' }));
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Leave Type"
                                    required
                                    error={!!formErrors.leaveType}
                                    helperText={formErrors.leaveType}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                                />
                            )}
                        />

                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                                <DatePicker
                                    label="From Date"
                                    format="DD-MM-YYYY"
                                    value={fromDate ? dayjs(fromDate) : null}
                                    onChange={(val) => {
                                        setFromDate(val?.format('YYYY-MM-DD') || '');
                                        if (formErrors.fromDate) setFormErrors(prev => ({ ...prev, fromDate: '' }));
                                    }}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            required: true,
                                            error: !!formErrors.fromDate,
                                            helperText: formErrors.fromDate,
                                            InputLabelProps: { shrink: true },
                                            sx: { '& .MuiFormLabel-asterisk': { color: 'red' } }
                                        }
                                    }}
                                />
                                <DatePicker
                                    label="To Date"
                                    format="DD-MM-YYYY"
                                    value={toDate ? dayjs(toDate) : null}
                                    onChange={(val) => {
                                        setToDate(val?.format('YYYY-MM-DD') || '');
                                        if (formErrors.toDate) setFormErrors(prev => ({ ...prev, toDate: '' }));
                                    }}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            required: true,
                                            error: !!formErrors.toDate,
                                            helperText: formErrors.toDate,
                                            InputLabelProps: { shrink: true },
                                            sx: { '& .MuiFormLabel-asterisk': { color: 'red' } }
                                        }
                                    }}
                                />
                            </Box>
                        </LocalizationProvider>

                        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                            <TextField
                                fullWidth
                                label="Total Leaves Allocated"
                                type="number"
                                value={totalLeaves}
                                onChange={(e) => {
                                    setTotalLeaves(e.target.value);
                                    if (formErrors.totalLeaves) setFormErrors(prev => ({ ...prev, totalLeaves: '' }));
                                }}
                                required
                                error={!!formErrors.totalLeaves}
                                helperText={formErrors.totalLeaves}
                                sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                            />
                            
                            <TextField
                                fullWidth
                                label="Total Leaves Taken"
                                type="number"
                                value={leavesTaken}
                                onChange={(e) => {
                                    setLeavesTaken(e.target.value);
                                }}
                            />
                        </Box>

                        <TextField
                            select
                            fullWidth
                            label="Status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            required
                            sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                        >
                            <MenuItem value="Approved">Approved</MenuItem>
                            <MenuItem value="Draft">Draft</MenuItem>
                            <MenuItem value="Cancelled">Cancelled</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <LoadingButton variant="contained" loading={creating} onClick={handleSubmit}>{isEdit ? 'Update' : 'Create'}</LoadingButton>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Delete"
                content="Are you sure you want to delete this allocation?"
                action={<Button variant="contained" color="error" onClick={handleConfirmDelete}>Delete</Button>}
            />

            <LeaveAllocationDetailsDialog
                open={openDetails}
                onClose={() => {
                    setOpenDetails(false);
                    setSelectedAllocationId(null);
                }}
                allocationId={selectedAllocationId}
                onRefresh={refetch}
                socket={socket}
                onEdit={(alloc) => {
                    setOpenDetails(false);
                    handleEdit(alloc);
                }}
                onDelete={(id) => {
                    setOpenDetails(false);
                    setConfirmDelete({ open: true, id });
                }}
            />

            <AutoAllocateDialog
                open={openAutoAllocate}
                onClose={() => setOpenAutoAllocate(false)}
                onSuccess={(res) => {
                    setOpenAutoAllocate(false);
                    setResultData(res);
                    setOpenResult(true);
                    refetch();
                    fetchLogs();
                }}
                onError={(error) => {
                    setSnackbar({ open: true, message: error, severity: 'error' });
                }}
            />

            <AutoAllocateResultDialog
                open={openResult}
                onClose={() => {
                    setOpenResult(false);
                    setResultData(null);
                }}
                data={resultData}
            />

            <AutoAllocateLogDetailsDialog
                open={openLogDetails}
                onClose={() => {
                    setOpenLogDetails(false);
                    setSelectedLogId(null);
                }}
                logId={selectedLogId}
            />

            {/* Filter Drawer */}
            <LeaveAllocationFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={(update) => setFilters({ ...filters, ...update })}
                canReset={filters.status !== 'all' || filters.leave_type !== 'all' || filters.employee !== null || filters.startDate !== null || filters.endDate !== null}
                onResetFilters={() => {
                    setFilters({
                        status: 'all',
                        leave_type: 'all',
                        employee: null,
                        startDate: null,
                        endDate: null,
                    });
                }}
                options={{
                    statuses: ['Approved', 'Pending', 'Rejected'],
                    leaveTypes: leaveTypeOptions.map((type) => type.name),
                    employees: employeeOptions,
                }}
                isHR={isHR}
            />

            {/* Auto Allocate Logs Filter Drawer */}
            <AutoAllocateLogFiltersDrawer
                open={openLogFilters}
                onClose={() => setOpenLogFilters(false)}
                filters={logFilters}
                onFilters={handleLogFilters}
                canReset={canResetLogFilters}
                onResetFilters={handleResetLogFilters}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                message={snackbar.message}
            >
                <Alert onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}
