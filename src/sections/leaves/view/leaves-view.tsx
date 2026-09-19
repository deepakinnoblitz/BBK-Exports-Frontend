import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Checkbox, IconButton, FormControlLabel, CircularProgress } from '@mui/material';

import { useSocket } from 'src/hooks/use-socket';
import { useLeaveApplications } from 'src/hooks/useLeaveApplications';

import { getDoctypeList } from 'src/api/leads';
import { uploadFile } from 'src/api/data-import';
import { markAsRead } from 'src/api/unread-counts';
import { DashboardContent } from 'src/layouts/dashboard';
import { getHRPermissions, getHRDoc } from 'src/api/hr-management';
import { applyLeaveWorkflowAction, checkLeaveBalance, checkLeaveOverlap, createLeaveApplication, deleteLeaveApplication, getEmployeeProbationInfo, updateLeaveStatus } from 'src/api/leaves';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { LeavesTableRow } from '../leaves-table-row';
import { TableNoData } from '../../lead/table-no-data';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { LeavesTableFiltersDrawer } from '../leaves-table-filters-drawer';
import { LeadTableHead as LeavesTableHead } from '../../lead/lead-table-head';
import { LeavesDetailsDialog } from '../../report/leaves/leaves-details-dialog';
import { LeadTableToolbar as LeavesTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

const LEAVE_SORT_OPTIONS = [
    { value: 'modified_desc', label: 'Newest First' },
    { value: 'modified_asc', label: 'Oldest First' },
    { value: 'employee_name_asc', label: 'Employee: A to Z' },
    { value: 'employee_name_desc', label: 'Employee: Z to A' },
    { value: 'leave_type_asc', label: 'Leave Type: A to Z' },
    { value: 'leave_type_desc', label: 'Leave Type: Z to A' },
];

export function LeavesView() {
    const { user } = useAuth();

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.leaves;
    const canCreateUser = hasCustomPerms && user?.permissions?.actions?.leaves ? !!user?.permissions?.actions?.leaves?.create : true;

    const { socket } = useSocket(user?.email);

    const isHR = user?.roles?.some((role: string) =>
        ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
    );

    // Check if user is restricted to their own employee ID
    const isRestrictedEmployee = user?.roles.includes('Employee') && !isHR;
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
        unread_messages: boolean;
    }>({
        status: 'all',
        leave_type: 'all',
        employee: null,
        startDate: null,
        endDate: null,
        unread_messages: false,
    });

    const [openCreate, setOpenCreate] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form state
    const [employee, setEmployee] = useState('');
    const [leaveType, setLeaveType] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [reason, setReason] = useState('');
    const [halfDay, setHalfDay] = useState(false);
    const [halfDayDate, setHalfDayDate] = useState('');
    const [permissionHours, setPermissionHours] = useState<string>('');
    const [attachments, setAttachments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [totalDays, setTotalDays] = useState(0);
    const [balanceInfo, setBalanceInfo] = useState<{ remaining: number, unit: string } | null>(null);
    const [probationInfo, setProbationInfo] = useState<{ is_probation: boolean; restricted_types: string[]; probation_end_date: string | null; } | null>(null);

    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
    const [leaveTypeOptions, setLeaveTypeOptions] = useState<any[]>([]);

    // Alert & Dialog State
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [openDetails, setOpenDetails] = useState(false);
    const [detailsId, setDetailsId] = useState<string | null>(null);

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Permissions State
    const [permissions, setPermissions] = useState<{ read: boolean; write: boolean; delete: boolean }>({
        read: true,
        write: true,
        delete: true,
    });

    const { data, total, loading, refetch } = useLeaveApplications(
        page + 1,
        rowsPerPage,
        filterName,
        {
            ...(isRestrictedEmployee && user?.employee ? { employee: user.employee } : (filters.employee ? { employee: filters.employee } : {})),
            ...(filters.status !== 'all' ? { workflow_state: filters.status } : {}),
            ...(filters.leave_type !== 'all' ? { leave_type: filters.leave_type } : {}),
            ...(filters.startDate ? { start_date: filters.startDate } : {}),
            ...(filters.endDate ? { end_date: filters.endDate } : {}),
            ...(filters.unread_messages ? { unread_messages: true } : {}),
        },
        orderBy,
        order,
        socket  // real-time socket — replaces 3s polling
    );

    const notFound = !data.length && !!filterName;
    const empty = !data.length && !filterName && !loading;

    useEffect(() => {
        getHRPermissions('Leave Application').then(setPermissions);
        getDoctypeList('Employee', ['name', 'employee_name']).then(setEmployeeOptions).catch(console.error);
        getDoctypeList('Leave Type', ['name']).then(setLeaveTypeOptions).catch(console.error);
    }, []);


    useEffect(() => {
        if (isRestrictedEmployee && user?.employee && !employee) {
            setEmployee(user.employee);
        }
    }, [isRestrictedEmployee, user, employee]);

    // Fetch probation info when employee changes
    useEffect(() => {
        if (employee) {
            getEmployeeProbationInfo(employee, fromDate || undefined)
                .then(setProbationInfo)
                .catch(console.error);
        } else {
            setProbationInfo(null);
        }
    }, [employee, fromDate]);

    // Calculate total days and check balance
    useEffect(() => {
        let days = 0;
        if (fromDate && toDate) {
            const start = dayjs(fromDate);
            const end = dayjs(toDate);
            days = end.diff(start, 'day') + 1;

            if (halfDay) {
                days -= 0.5;
            }
        }

        if (leaveType.toLowerCase() === 'permission') {
            days = Number(permissionHours) || 0;
        }

        setTotalDays(days > 0 ? days : 0);

        if (employee && leaveType && fromDate && toDate) {
            checkLeaveBalance({
                employee,
                leave_type: leaveType,
                from_date: fromDate,
                to_date: toDate,
                half_day: halfDay ? 1 : 0,
                permission_hours: leaveType.toLowerCase() === 'permission' ? Number(permissionHours) : undefined
            }).then(res => {
                setBalanceInfo({ remaining: res.remaining, unit: res.unit });
            }).catch(console.error);
        } else {
            setBalanceInfo(null);
        }
    }, [employee, leaveType, fromDate, toDate, halfDay, permissionHours]);

    const handleOpenCreate = () => {
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setEmployee(isRestrictedEmployee && user?.employee ? user.employee : '');
        setLeaveType('');
        setFromDate('');
        setToDate('');
        setReason('');
        setHalfDay(false);
        setHalfDayDate('');
        setPermissionHours('');
        setAttachments([]);
        setTotalDays(0);
        setBalanceInfo(null);
        setFormErrors({});
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!employee) errors.employee = 'Employee selection is required';
        if (!leaveType) errors.leaveType = 'Please select a leave type';
        if (!fromDate) errors.fromDate = 'Start date is required';
        if (!toDate) errors.toDate = 'End date is required';
        if (!reason) errors.reason = 'Please provide a reason for your leave';

        if (leaveType.toLowerCase() === 'permission' && (!permissionHours || Number(permissionHours) < 10)) {
            errors.permissionHours = 'Permission duration must be at least 10 minutes';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const handleDeleteClick = (id: string) => {
        setConfirmDelete({ open: true, id });
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteLeaveApplication(confirmDelete.id);
            setSnackbar({ open: true, message: 'Leave application deleted successfully', severity: 'success' });
            await refetch();
        } catch (e) {
            console.error(e);
            setSnackbar({ open: true, message: 'Failed to delete record', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setAttachments([file]);
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCreate = async () => {
        try {
            setCreating(true);

            if (!validateForm()) {
                setSnackbar({
                    open: true,
                    message: 'Missing required information. Please check the highlighted fields.',
                    severity: 'error'
                });
                return;
            }

            // Upload files if any
            let attachmentUrl = '';
            if (attachments.length > 0 && attachments[0] instanceof File) {
                setUploading(true);
                try {
                    const uploaded = await uploadFile(attachments[0]);
                    attachmentUrl = uploaded.file_url;
                } catch (error: any) {
                    throw new Error(`File upload failed: ${error.message}`);
                } finally {
                    setUploading(false);
                }
            } else if (attachments.length > 0) {
                attachmentUrl = attachments[0].url || '';
            }

            if (leaveType.toLowerCase() === 'permission' && (!permissionHours || Number(permissionHours) < 10)) {
                setSnackbar({ open: true, message: 'Permission duration must be at least 10 minutes', severity: 'error' });
                return;
            }

            const leaveData = {
                employee,
                leave_type: leaveType,
                from_date: fromDate,
                to_date: toDate,
                reson: reason,
                half_day: halfDay ? 1 : 0,
                half_day_date: halfDay ? halfDayDate : undefined,
                permission_hours: leaveType.toLowerCase() === 'permission' ? Number(permissionHours) : undefined,
                attachment: attachmentUrl,
                total_days: totalDays,
            };

            await createLeaveApplication(leaveData);
            setSnackbar({ open: true, message: 'Leave application submitted successfully', severity: 'success' });

            await refetch();
            handleCloseCreate();
        } catch (err: any) {
            console.error(err);
            setSnackbar({ open: true, message: err.message || 'Error saving leave application', severity: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handleOpenDetails = (id: string) => {
        setDetailsId(id);
        setOpenDetails(true);

        // Mark as read and trigger sidebar refresh
        markAsRead('Leave Application', id).then(() => {
            window.dispatchEvent(new CustomEvent('REFRESH_UNREAD_COUNTS'));
        });
    };

    const handleCloseDetails = () => {
        setOpenDetails(false);
        setDetailsId(null);
    };

    const handleApplyAction = async (id: string, action: string) => {
        try {
            // 🛡️ PREEMPTIVE OVERLAP CHECK
            if (action.toLowerCase().includes('approve')) {
                const leaveRecord = data.find(r => r.name === id);
                if (leaveRecord) {
                    const res = await checkLeaveOverlap({
                        employee: leaveRecord.employee,
                        from_date: leaveRecord.from_date,
                        to_date: leaveRecord.to_date,
                        exclude_doc: id
                    });

                    if (res.overlap) {
                        setSnackbar({ open: true, message: res.message, severity: 'error' });
                        return;
                    }
                }
            }

            const res = await applyLeaveWorkflowAction(id, action);
            const extra = res?.email_warning ? ` (${res.email_warning})` : '';
            setSnackbar({ open: true, message: `Leave application ${action}ed successfully${extra}`, severity: 'success' });
            await refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || `Failed to ${action} leave application`, severity: 'error' });
        }
    };

    const handleClarify = async (id: string, action: string, message: string) => {
        try {
            const leave = await getHRDoc('Leave Application', id);
            const fields = ['hr_query', 'hr_query_2', 'hr_query_3', 'hr_query_4', 'hr_query_5', 'employee_reply', 'employee_reply_2', 'employee_reply_3', 'employee_reply_4', 'employee_reply_5'];
            const nextField = fields.find(f => !leave[f]);

            if (!nextField) {
                throw new Error('Maximum clarification limit reached');
            }

            const updateData = { [nextField]: message };
            await applyLeaveWorkflowAction(id, action, undefined, updateData);

            setSnackbar({ open: true, message: 'Clarification requested successfully', severity: 'success' });
            await refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to request clarification', severity: 'error' });
            throw error;
        }
    };

    const handleSortChange = (value: string) => {
        const parts = value.split('_');
        const direction = parts.pop() as 'asc' | 'desc';
        const field = parts.join('_');
        setOrderBy(field);
        setOrder(direction);
    };

    const handleFilters = (update: Partial<typeof filters>) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            status: 'all',
            leave_type: 'all',
            employee: null,
            startDate: null,
            endDate: null,
            unread_messages: false,
        });
        setFilterName('');
    };

    const handleOpenFilters = () => {
        setOpenFilters(true);
    };

    const handleCloseFilters = () => {
        setOpenFilters(false);
    };

    const canReset = filters.status !== 'all' || filters.leave_type !== 'all' || filters.employee !== null || filters.startDate !== null || filters.endDate !== null || filters.unread_messages || !!filterName;

    const onChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const onChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <DashboardContent maxWidth={false} sx={{mt: 2}}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Leave Applications
                </Typography>

                {permissions.write && canCreateUser &&(
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                        sx={{ bgcolor: '#08a3cd', color: 'common.white', '&:hover': { bgcolor: '#068fb3' } }}
                    >
                        New Application
                    </Button>
                )}
            </Box>

            <Card>
                <LeavesTableToolbar
                    numSelected={0}
                    filterName={filterName}
                    onFilterName={(e) => {
                        setFilterName(e.target.value);
                        setPage(0);
                    }}
                    searchPlaceholder="Search leaves..."
                    onOpenFilter={handleOpenFilters}
                    canReset={canReset}
                    sortBy={`${orderBy}_${order}`}
                    onSortChange={handleSortChange}
                    sortOptions={LEAVE_SORT_OPTIONS}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: { xs: 300, md: 800 } }}>
                            <LeavesTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={data.length}
                                numSelected={0}
                                onSelectAllRows={() => { }}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'employee', label: 'Employee', minWidth: { xs: 140, md: 180 } },
                                    { id: 'leave_type', label: 'Leave Type', minWidth: 140, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'from_date', label: 'Duration', minWidth: 120, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'total_days', label: 'Days', align: 'center', minWidth: 100, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'workflow_state', label: 'Status', minWidth: 120 },
                                    { id: 'actions', label: '', align: 'right', minWidth: 100 },
                                ]}
                            />

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#08a3cd' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <LeavesTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    employee: row.employee,
                                                    employeeName: row.employee_name,
                                                    leaveType: row.leave_type,
                                                    fromDate: row.from_date,
                                                    toDate: row.to_date,
                                                    totalDays: row.total_days,
                                                    reason: row.reson,
                                                    status: row.workflow_state || row.status || 'Pending',
                                                    halfDay: row.half_day,
                                                    permissionHours: row.permission_hours,
                                                    modified: row.modified,
                                                    hrQueryCount: [1, 2, 3, 4, 5].filter(i => {
                                                        const field = i === 1 ? 'hr_query' : `hr_query_${i}`;
                                                        return row[field] && String(row[field]).trim();
                                                    }).length,
                                                    empReplyCount: [1, 2, 3, 4, 5].filter(i => {
                                                        const field = i === 1 ? 'employee_reply' : `employee_reply_${i}`;
                                                        return row[field] && String(row[field]).trim();
                                                    }).length,
                                                }}
                                                selected={false}
                                                onSelectRow={() => { }}
                                                onView={() => handleOpenDetails(row.name)}
                                                onDelete={() => handleDeleteClick(row.name)}
                                                onApplyAction={(action) => handleApplyAction(row.name, action)}
                                                onClarify={(action, message) => handleClarify(row.name, action, message)}
                                                canDelete={permissions.delete}
                                                isHR={isHR}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <EmptyContent
                                                        title="No leave applications"
                                                        description="You haven't submitted any leave requests yet."
                                                        icon="solar:calendar-add-bold-duotone"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {!empty && !notFound && (
                                            <TableEmptyRows
                                                height={68}
                                                emptyRows={data.length < 5 ? 5 - data.length : 0}
                                            />
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
                    onPageChange={onChangePage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={onChangeRowsPerPage}
                />
            </Card>

            {/* CREATE/EDIT DIALOG */}
            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24 } }}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',  }}>
                    New Leave Application
                    <IconButton onClick={handleCloseCreate} sx={{ color: (theme) => theme.palette.grey[500] }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {/* Summary Section - At the Top with Attractive Styling */}
                    {leaveType && (fromDate || toDate) && (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                gap: 2,
                                mb: 3,
                            }}
                        >
                            <Box
                                sx={{
                                    p: 2.5,
                                    borderRadius: 2,
                                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                    border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        mb: 0.5,
                                        color: 'text.secondary',
                                        fontWeight: 500
                                    }}
                                >
                                    {leaveType.toLowerCase() === 'permission' ? 'Requested Minutes' : 'Total Days'}
                                </Typography>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontWeight: 700,
                                        color: 'text.primary'
                                    }}
                                >
                                    {totalDays}
                                </Typography>
                            </Box>

                            {balanceInfo && (
                                <Box
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        bgcolor: (theme) => balanceInfo.remaining >= totalDays
                                            ? alpha(theme.palette.success.main, 0.08)
                                            : alpha(theme.palette.error.main, 0.08),
                                        border: (theme) => balanceInfo.remaining >= totalDays
                                            ? `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                                            : `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            mb: 0.5,
                                            color: 'text.secondary',
                                            fontWeight: 500
                                        }}
                                    >
                                        Available {leaveType.toLowerCase() === 'permission' ? 'Minutes' : 'Days'}
                                    </Typography>
                                    <Typography
                                        variant="h3"
                                        sx={{
                                            fontWeight: 700,
                                            color: balanceInfo.remaining >= totalDays ? 'success.main' : 'error.main'
                                        }}
                                    >
                                        {balanceInfo.remaining} {leaveType.toLowerCase() === 'permission' ? 'Minutes' : 'Days'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    {leaveType && balanceInfo && totalDays > balanceInfo.remaining && (
                        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                            Insufficient {leaveType} balance. You have <strong>{balanceInfo.remaining} {leaveType.toLowerCase() === 'permission' ? 'minutes' : 'days'}</strong> available, but you are requesting <strong>{totalDays} {leaveType.toLowerCase() === 'permission' ? 'minutes' : 'days'}</strong>.
                        </Alert>
                    )}

                    <Box
                        display="grid"
                        margin={2}
                        gridTemplateColumns="1fr"
                        gap={3}
                    >
                        {isRestrictedEmployee ? (
                            <TextField
                                fullWidth
                                label="Employee"
                                value={`${user?.employee_name} (${user?.employee})`}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ readOnly: true }}
                                required
                                sx={{
                                    '& .MuiFormLabel-asterisk': { color: 'red' },
                                }}
                            />
                        ) : (
                            <Autocomplete
                                fullWidth
                                options={employeeOptions}
                                getOptionLabel={(option) => {
                                    if (typeof option === 'string') {
                                        const emp = employeeOptions.find((e) => e.name === option);
                                        return emp ? `${emp.employee_name} (${emp.name})` : option;
                                    }
                                    return `${option.employee_name} (${option.name})`;
                                }}
                                value={employeeOptions.find((e) => e.name === employee) || null}
                                onChange={(event, newValue) => {
                                    setEmployee(newValue ? newValue.name : '');
                                    if (formErrors.employee) setFormErrors(prev => ({ ...prev, employee: '' }));
                                }}
                                renderOption={(props, option) => {
                                    const { key, ...optionProps } = props as any;
                                    return (
                                        <li key={key} {...optionProps}>
                                            <Stack spacing={0.5}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                    {option.employee_name}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
                                        placeholder="Search by name or ID..."
                                        sx={{
                                            '& .MuiFormLabel-asterisk': { color: 'red' },
                                        }}
                                    />
                                )}
                            />
                        )}

                        <Autocomplete
                            fullWidth
                            options={leaveTypeOptions}
                            getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                            value={leaveTypeOptions.find((o) => o.name === leaveType) || null}
                            onChange={(event, newValue) => {
                                setLeaveType(newValue ? newValue.name : '');
                                if (formErrors.leaveType) setFormErrors(prev => ({ ...prev, leaveType: '' }));
                            }}
                            getOptionDisabled={(option) => !!(probationInfo?.is_probation && probationInfo.restricted_types.includes(option.name))}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Leave Type"
                                    required
                                    error={!!formErrors.leaveType}
                                    helperText={formErrors.leaveType}
                                    InputLabelProps={{ shrink: true }}
                                    placeholder="Select Leave Type"
                                    sx={{
                                        '& .MuiFormLabel-asterisk': { color: 'red' },
                                    }}
                                />
                            )}
                            renderOption={(props, option) => {
                                const { key, ...optionProps } = props as any;
                                const isDisabled = probationInfo?.is_probation && probationInfo.restricted_types.includes(option.name);
                                return (
                                    <li key={key} {...optionProps}>
                                        <Typography variant="body1">
                                            {option.name} {isDisabled ? '(Restricted during probation)' : ''}
                                        </Typography>
                                    </li>
                                );
                            }}
                        />

                        {/* Show other fields only if Employee and Leave Type are selected */}
                        {employee && leaveType && (
                            <>
                                {/* Half Day checkbox - only for Paid Leave and Unpaid Leave - Show BEFORE date pickers */}
                                {leaveType && (leaveType.toLowerCase() === 'paid leave' || leaveType.toLowerCase() === 'unpaid leave') && (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={halfDay}
                                                onChange={(e) => {
                                                    setHalfDay(e.target.checked);
                                                    if (e.target.checked && fromDate) {
                                                        setToDate(fromDate); // When enabling half day, set to date same as from date
                                                        setHalfDayDate(fromDate);
                                                    }
                                                }}
                                            />
                                        }
                                        label="Half Day"
                                    />
                                )}

                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    {/* For Permission leave type OR Half Day, show only one date picker */}
                                    {(leaveType.toLowerCase() === 'permission' || halfDay) ? (
                                        <DatePicker
                                            label={leaveType.toLowerCase() === 'permission' ? "Permission Date" : "Leave Date"}
                                            value={fromDate ? dayjs(fromDate) : null}
                                            format="DD-MM-YYYY"
                                            onChange={(newValue) => {
                                                const date = newValue?.format('YYYY-MM-DD') || '';
                                                setFromDate(date);
                                                setToDate(date); // Set both from and to date as same
                                                if (halfDay) setHalfDayDate(date);
                                                if (formErrors.fromDate) setFormErrors(prev => ({ ...prev, fromDate: '', toDate: '' }));
                                            }}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    required: true,
                                                    InputLabelProps: { shrink: true },
                                                    error: !!formErrors.fromDate,
                                                    helperText: formErrors.fromDate,
                                                    sx: { '& .MuiFormLabel-asterisk': { color: 'red' } }
                                                },
                                            }}
                                        />
                                    ) : (
                                        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                                            <DatePicker
                                                label="From Date"
                                                value={fromDate ? dayjs(fromDate) : null}
                                                format="DD-MM-YYYY"
                                                onChange={(newValue) => {
                                                    const date = newValue?.format('YYYY-MM-DD') || '';
                                                    setFromDate(date);
                                                    if (formErrors.fromDate) setFormErrors(prev => ({ ...prev, fromDate: '' }));
                                                }}
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        required: true,
                                                        InputLabelProps: { shrink: true },
                                                        error: !!formErrors.fromDate,
                                                        helperText: formErrors.fromDate,
                                                        sx: { '& .MuiFormLabel-asterisk': { color: 'red' } }
                                                    },
                                                }}
                                            />
                                            <DatePicker
                                                label="To Date"
                                                value={toDate ? dayjs(toDate) : null}
                                                format="DD-MM-YYYY"
                                                onChange={(newValue) => {
                                                    const date = newValue?.format('YYYY-MM-DD') || '';
                                                    setToDate(date);
                                                    if (formErrors.toDate) setFormErrors(prev => ({ ...prev, toDate: '' }));
                                                }}
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        required: true,
                                                        InputLabelProps: { shrink: true },
                                                        error: !!formErrors.toDate,
                                                        helperText: formErrors.toDate,
                                                        sx: { '& .MuiFormLabel-asterisk': { color: 'red' } }
                                                    },
                                                }}
                                            />
                                        </Box>
                                    )}

                                    {/* Permission Duration Picker - only for Permission leave type */}
                                    {leaveType && leaveType.toLowerCase() === 'permission' && (
                                        <TimePicker
                                            label="Permission Duration (HH:mm)"
                                            value={permissionHours ? dayjs().startOf('day').add(Number(permissionHours), 'minutes') : null}
                                            onChange={(newValue: dayjs.Dayjs | null) => {
                                                if (newValue) {
                                                    const totalMinutes = newValue.hour() * 60 + newValue.minute();
                                                    setPermissionHours(totalMinutes.toString());
                                                    if (totalMinutes >= 10 && formErrors.permissionHours) {
                                                        setFormErrors(prev => ({ ...prev, permissionHours: '' }));
                                                    }
                                                } else {
                                                    setPermissionHours('');
                                                }
                                            }}
                                            ampm={false}
                                            views={['hours', 'minutes']}
                                            format="HH:mm"
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    required: true,
                                                    helperText: formErrors.permissionHours || "Select hours and minutes. Minimum 10 minutes required.",
                                                    error: !!formErrors.permissionHours,
                                                    InputLabelProps: { shrink: true }
                                                }
                                            }}
                                        />
                                    )}
                                </LocalizationProvider>

                                <TextField
                                    fullWidth
                                    label="Reason"
                                    multiline
                                    rows={3}
                                    value={reason}
                                    onChange={(e) => {
                                        setReason(e.target.value);
                                        if (formErrors.reason) setFormErrors(prev => ({ ...prev, reason: '' }));
                                    }}
                                    required
                                    error={!!formErrors.reason}
                                    helperText={formErrors.reason}
                                    sx={{
                                        '& .MuiFormLabel-asterisk': { color: 'red' },
                                    }}
                                />

                                {/* Attachments Section - Moved to last */}
                                <Box
                                    sx={{
                                        p: 3,
                                        borderRadius: 2,
                                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                        border: (theme) => `1px dashed ${alpha(theme.palette.grey[500], 0.2)}`,
                                    }}
                                >
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                                        justifyContent="space-between"
                                        spacing={2}
                                        sx={{ mb: 2.5 }}
                                    >
                                        <Typography variant="h6">Attachments</Typography>

                                        <Button
                                            variant="contained"
                                            component="label"
                                            color="primary"
                                            size="small"
                                            startIcon={<Iconify icon={"solar:upload-bold" as any} />}
                                            disabled={uploading}
                                            sx={{ minWidth: { xs: 1, sm: 'auto' } }}
                                        >
                                            {uploading ? 'Uploading...' : 'Upload File'}
                                            <input type="file" hidden onChange={handleFileUpload} />
                                        </Button>
                                    </Stack>

                                    <Stack spacing={1}>
                                        {attachments.length === 0 ? (
                                            <Stack alignItems="center" justifyContent="center" sx={{ py: 3, color: 'text.disabled' }}>
                                                <Iconify icon={"solar:file-bold" as any} width={40} height={40} sx={{ mb: 1, opacity: 0.48 }} />
                                                <Typography variant="body2">No attachments yet</Typography>
                                            </Stack>
                                        ) : (
                                            attachments.map((file: any, index) => (
                                                <Stack
                                                    key={index}
                                                    direction="row"
                                                    alignItems="center"
                                                    sx={{
                                                        px: 1.5,
                                                        py: 0.75,
                                                        borderRadius: 1.5,
                                                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                                    }}
                                                >
                                                    <Iconify icon={"solar:link-bold" as any} width={20} sx={{ mr: 1, color: 'text.secondary', flexShrink: 0 }} />
                                                    <Typography variant="body2" noWrap sx={{ flexGrow: 1, fontWeight: 'fontWeightMedium' }}>
                                                        {typeof file === 'string' ? file : (file.url || file.name)}
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        color="inherit"
                                                        onClick={() => handleRemoveAttachment(index)}
                                                        sx={{
                                                            px: 1.5,
                                                            py: 0,
                                                            height: 26,
                                                            borderRadius: 1.5,
                                                            minWidth: 'auto',
                                                            typography: 'caption',
                                                            bgcolor: 'background.paper',
                                                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
                                                            '&:hover': {
                                                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                                            },
                                                        }}
                                                    >
                                                        Remove
                                                    </Button>
                                                </Stack>
                                            ))
                                        )}
                                    </Stack>
                                </Box>
                            </>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 1.5}}>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={creating || uploading || (balanceInfo && totalDays > balanceInfo.remaining) || false}
                        sx={{ bgcolor: '#08a3cd', '&:hover': { bgcolor: '#068fb3' } }}
                    >
                        {creating ? 'Submitting...' : 'Submit Application'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this leave application?"
                action={
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <LeavesDetailsDialog
                open={openDetails}
                onClose={handleCloseDetails}
                leaveId={detailsId}
                onRefresh={refetch}
                socket={socket}
            />

            <LeavesTableFiltersDrawer
                open={openFilters}
                onOpen={handleOpenFilters}
                onClose={handleCloseFilters}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                options={{
                    statuses: ['Pending', 'Approved', 'Rejected', 'Clarification Requested'],
                    leaveTypes: leaveTypeOptions.map((opt) => opt.name),
                }}
                employeeOptions={employeeOptions}
                isHR={isHR}
            />
        </DashboardContent>
    );
}
