import dayjs from 'dayjs';
import { useState, useEffect, useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { IconButton, CircularProgress } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useSocket } from 'src/hooks/use-socket';
import { useWFHAttendance } from 'src/hooks/useWFHAttendance';

import { getDoctypeList } from 'src/api/leads';
import { getCurrentUserInfo } from 'src/api/auth';
import { markAsRead } from 'src/api/unread-counts';
import { DashboardContent } from 'src/layouts/dashboard';
import { getHRPermissions } from 'src/api/hr-management';
import { getWFHAttendance, createWFHAttendance, updateWFHAttendance, applyWorkflowAction, handleWFHAction } from 'src/api/wfh-attendance';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../lead/table-no-data';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { WFHAttendanceTableRow } from '../wfh-attendance-table-row';
import { WFHAttendanceDetailsDialog } from '../wfh-attendance-details-dialog';
import { LeadTableHead as AttendanceTableHead } from '../../lead/lead-table-head';
import { WFHAttendanceTableFiltersDrawer } from '../wfh-attendance-table-filters-drawer';
import { LeadTableToolbar as AttendanceTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

export function WFHAttendanceView() {
    const { user } = useAuth();
    const userRole: "hr" | "admin" | "" = user?.roles?.some(r => ['hr', 'hr manager'].includes(r.toLowerCase()))
        ? 'hr'
        : (user?.roles?.some(r => ['admin', 'system manager', 'administrator'].includes(r.toLowerCase())) ? 'admin' : '');
    const isHR = userRole === "hr" || userRole === "admin";

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.wfh_attendance;
    const canCreateWFHAttendance = hasCustomPerms && user?.permissions?.actions?.wfh_attendance ? !!user?.permissions?.actions?.wfh_attendance?.create : true;

    const { socket } = useSocket(user?.email);
    const theme = useTheme();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [selected, setSelected] = useState<string[]>([]);

    const [openCreate, setOpenCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({
        date: dayjs().format('YYYY-MM-DD'),
    });

    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState<{ employee: string; status: string; startDate: string | null; endDate: string | null; unreadOnly: boolean }>({
        employee: 'all',
        status: 'all',
        startDate: null,
        endDate: null,
        unreadOnly: false
    });

    const canReset = filters.employee !== 'all' || filters.status !== 'all' || filters.startDate !== null || filters.endDate !== null || filters.unreadOnly || !!filterName;

    const [openDetails, setOpenDetails] = useState(false);
    const [detailsId, setDetailsId] = useState<string | null>(null);

    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);

    // Alert & Dialog State
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [serverAlert, setServerAlert] = useState<{ message: string, severity: 'success' | 'error' | 'warning' | 'info' }>({
        message: '',
        severity: 'info'
    });

    const [permissions, setPermissions] = useState<{ read: boolean; write: boolean }>({
        read: true,
        write: true,
    });

    const effectiveFilters = useMemo(() => {
        const eff: any = {
            ...filters,
            employee: isHR ? filters.employee : (user?.employee || 'all'),
        };
        if (isHR && filters.unreadOnly) {
            eff.unread_only = true;
        }
        return eff;
    }, [filters, isHR, user]);

    const { data, total, loading, refetch } = useWFHAttendance(
        page + 1,
        rowsPerPage,
        filterName,
        orderBy,
        order,
        effectiveFilters,
        socket
    );
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const notFound = !data.length && !!filterName;
    const empty = !data.length && !filterName && !loading;

    useEffect(() => {
        getHRPermissions('WFH Attendance').then(setPermissions);
        getDoctypeList('Employee', ['name', 'employee_name']).then(setEmployeeOptions).catch(console.error);
    }, []);

    const handleFilters = (newFilters: any, value?: any) => {
        if (typeof newFilters === 'string') {
            setFilters((prevState) => ({
                ...prevState,
                [newFilters]: value,
            }));
        } else {
            setFilters((prevState) => ({
                ...prevState,
                ...newFilters,
            }));
        }
    };

    const handleResetFilters = () => {
        setFilters({
            employee: 'all',
            status: 'all',
            startDate: null,
            endDate: null,
            unreadOnly: false,
        });
    };

    const handleOpenCreate = async () => {
        // Fetch current user's employee data
        try {
            const userInfo = await getCurrentUserInfo();
            setFormData({
                date: dayjs().format('YYYY-MM-DD'),
                employee: userInfo?.employee || '',
            });
        } catch (error) {
            console.error('Failed to fetch current user info:', error);
            setFormData({
                date: dayjs().format('YYYY-MM-DD'),
            });
        }

        setFormErrors({});
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setCurrentId(null);
        setFormErrors({});
    };

    const handleInputChange = (fieldname: string, value: any) => {
        setFormData((prev: Record<string, any>) => {
            const next = { ...prev, [fieldname]: value };

            // Calculate hours
            if (fieldname === 'from_time' || fieldname === 'to_time') {
                if (next.from_time && next.to_time) {
                    const start = dayjs(`2000-01-01 ${next.from_time}`);
                    const end = dayjs(`2000-01-01 ${next.to_time}`);
                    if (end.isAfter(start)) {
                        const diffMs = end.diff(start);
                        const diffHrs = diffMs / (1000 * 60 * 60);
                        next.total_hours = diffHrs.toFixed(2);
                    } else {
                        next.total_hours = '0.00';
                    }
                }
            }
            return next;
        });

        if (formErrors[fieldname]) {
            setFormErrors(prev => ({ ...prev, [fieldname]: '' }));
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev: any) => ({ ...prev, open: false }));
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.employee) errors.employee = 'Employee is required';
        if (!formData.date) errors.date = 'Date is required';
        if (!formData.from_time) errors.from_time = 'From Time is required';

        // Logical time check
        if (formData.from_time && formData.to_time) {
            const start = dayjs(`2000-01-01 ${formData.from_time}`);
            const end = dayjs(`2000-01-01 ${formData.to_time}`);
            if (!end.isAfter(start)) {
                errors.to_time = 'To Time must be after From Time';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreate = async () => {
        if (!validateForm()) {
            setSnackbar({ open: true, message: 'Please correct the errors in the form', severity: 'error' });
            return;
        }

        try {
            setCreating(true);
            setServerAlert({ message: '', severity: 'info' });

            if (currentId) {
                await updateWFHAttendance(currentId, formData as any);
                setSnackbar({ open: true, message: 'Record updated successfully', severity: 'success' });
            } else {
                await createWFHAttendance(formData as any);
                setSnackbar({ open: true, message: 'Record created successfully', severity: 'success' });
            }

            await refetch();
            handleCloseCreate();
        } catch (err: any) {
            console.error(err);
            setServerAlert({ message: err.message || 'Error saving record', severity: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handleViewRow = async (id: string) => {
        setDetailsId(id);
        setOpenDetails(true);

        // Mark as read and trigger sidebar refresh
        markAsRead('WFH Attendance', id).then(() => {
            window.dispatchEvent(new CustomEvent('REFRESH_UNREAD_COUNTS'));
        });
    };

    const handleEditRow = async (id: string) => {
        try {
            const fullDoc = await getWFHAttendance(id);
            setCurrentId(id);
            setFormData({ ...fullDoc });
            setFormErrors({});
            setOpenCreate(true);
        } catch (error) {
            console.error('Failed to load details:', error);
            setSnackbar({ open: true, message: 'Failed to load details', severity: 'error' });
        }
    };

    const handleCloseDetails = () => {
        setOpenDetails(false);
        setDetailsId(null);
    };

    const handleSort = (value: string) => {
        if (value === 'modified_desc') {
            setOrderBy('modified');
            setOrder('desc');
        } else if (value === 'modified_asc') {
            setOrderBy('modified');
            setOrder('asc');
        } else if (value === 'employee_name_asc') {
            setOrderBy('employee_name');
            setOrder('asc');
        } else if (value === 'employee_name_desc') {
            setOrderBy('employee_name');
            setOrder('desc');
        } else if (value === 'total_hours_desc') {
            setOrderBy('total_hours');
            setOrder('desc');
        } else if (value === 'total_hours_asc') {
            setOrderBy('total_hours');
            setOrder('asc');
        }
    };

    const getCurrentSortValue = () => {
        if (orderBy === 'modified' && order === 'desc') return 'modified_desc';
        if (orderBy === 'modified' && order === 'asc') return 'modified_asc';
        if (orderBy === 'date' && order === 'desc') return 'date_desc';
        if (orderBy === 'date' && order === 'asc') return 'date_asc';
        if (orderBy === 'employee_name' && order === 'asc') return 'employee_name_asc';
        if (orderBy === 'employee_name' && order === 'desc') return 'employee_name_desc';
        if (orderBy === 'total_hours' && order === 'desc') return 'total_hours_desc';
        if (orderBy === 'total_hours' && order === 'asc') return 'total_hours_asc';
        return 'date_desc';
    };

    const handleSelectAllRows = (checked: boolean) => {
        if (checked) {
            const newSelected = data.map((n) => n.name);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    const handleSelectRow = (id: string) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
        }
        setSelected(newSelected);
    };

    const handleApplyAction = async (id: string, action: string) => {
        try {
            if (action === 'Approve' || action === 'Reject') {
                await handleWFHAction(id, action);
            } else {
                await applyWorkflowAction(id, action);
            }
            setSnackbar({ open: true, message: `Record ${action}ed successfully`, severity: 'success' });
            await refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || `Failed to ${action} record`, severity: 'error' });
        }
    };

    const handleBulkDelete = async () => {
        setSnackbar({ open: true, message: `Bulk delete is disabled`, severity: 'error' });
    };

    const renderField = (fieldname: string, label: string, type: string = 'text', options: any[] = [], extraProps: any = {}, required: boolean = false) => {
        const commonProps = {
            fullWidth: true,
            label,
            value: formData[fieldname] || '',
            onChange: (e: any) => handleInputChange(fieldname, e.target.value),
            InputLabelProps: { shrink: true },
            required,
            error: !!formErrors[fieldname],
            helperText: formErrors[fieldname],
            ...extraProps,
            sx: {
                '& .MuiFormLabel-asterisk': {
                    color: 'red',
                },
                ...extraProps.sx
            }
        };

        if (fieldname === 'employee') {
            return (
                <Autocomplete
                    fullWidth
                    options={options}
                    getOptionLabel={(option: any) => (option.employee_name ? `${option.employee_name} (${option.name})` : (option.name || option))}
                    isOptionEqualToValue={(option: any, value: any) => option.name === (value.name || value)}
                    value={options.find((opt: any) => opt.name === formData[fieldname]) || null}
                    onChange={(event: any, newValue: any) => {
                        handleInputChange(fieldname, newValue?.name || '');
                    }}
                    readOnly={!isHR}
                    disabled={!isHR}
                    renderInput={(params: any) => (
                        <TextField
                            {...params}
                            label={label}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={commonProps.sx}
                            disabled={!!currentId} // Locked in edit mode
                        />
                    )}
                    renderOption={(props, option) => (
                        <li {...props} key={option.name}>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    {option.employee_name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    ID: {option.name}
                                </Typography>
                            </Box>
                        </li>
                    )}
                />
            );
        }

        if (type === 'select' || type === 'link') {
            return (
                <TextField
                    {...commonProps}
                    select
                    SelectProps={{ native: true }}
                    disabled={!!currentId} // Locked in edit mode
                >
                    <option value="">Select {label}</option>
                    {options.map((opt: any) => (
                        <option key={opt.name || opt} value={opt.name || opt}>
                            {opt.employee_name ? `${opt.employee_name} (${opt.name})` : (opt.name || opt)}
                        </option>
                    ))}
                </TextField>
            );
        }

        if (type === 'date') {
            return (
                <DatePicker
                    label={label}
                    format="DD-MM-YYYY"
                    value={formData[fieldname] ? dayjs(formData[fieldname]) : null}
                    onChange={(newValue) => handleInputChange(fieldname, newValue?.format('YYYY-MM-DD') || '')}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            required,
                            error: !!formErrors[fieldname],
                            helperText: formErrors[fieldname],
                            InputLabelProps: { shrink: true },
                            sx: commonProps.sx
                        }
                    }}
                    disabled={!!currentId}
                />
            );
        }

        if (type === 'time') {
            return (
                <TimePicker
                    label={label}
                    value={formData[fieldname] ? dayjs(`2000-01-01 ${formData[fieldname]}`) : null}
                    onChange={(newValue) => handleInputChange(fieldname, newValue?.format('HH:mm:ss') || '')}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            required,
                            error: !!formErrors[fieldname],
                            helperText: formErrors[fieldname],
                            InputLabelProps: { shrink: true },
                            sx: commonProps.sx
                        }
                    }}
                    disabled={!!currentId && fieldname !== 'to_time'}
                />
            );
        }

        return (
            <TextField
                {...commonProps}
                disabled={!!currentId} // Locked in edit mode (Task Description)
            />
        );
    };

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    WFH Attendance
                </Typography>

                {canCreateWFHAttendance && (
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        New WFH Entry
                    </Button>
                )}
            </Box>

            <Card>
                <AttendanceTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFilterName(e.target.value);
                        setPage(0);
                    }}
                    onDelete={handleBulkDelete}
                    searchPlaceholder="Search entries..."
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={getCurrentSortValue()}
                    onSortChange={handleSort}
                    sortOptions={[
                        { value: 'modified_desc', label: 'Newest First' },
                        { value: 'modified_asc', label: 'Oldest First' },
                        { value: 'date_desc', label: 'Date: Newest to Oldest' },
                        { value: 'date_asc', label: 'Date: Oldest to Newest' },
                        { value: 'employee_name_asc', label: 'Employee: A to Z' },
                        { value: 'employee_name_desc', label: 'Employee: Z to A' },
                        { value: 'total_hours_desc', label: 'Hours: High to Low' },
                        { value: 'total_hours_asc', label: 'Hours: Low to High' },
                    ]}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: { xs: 300, md: 800 }, borderCollapse: 'collapse' }}>
                            <AttendanceTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={total}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'employee_name', label: 'Employee', minWidth: 180 },
                                    { id: 'date', label: 'Date', minWidth: 120, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'workflow_state', label: 'Status', minWidth: 100 },
                                    { id: 'from_time', label: 'From', minWidth: 100, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'to_time', label: 'To', minWidth: 100, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'total_hours', label: 'Hours', minWidth: 80, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: '', label: '', align: 'right' },
                                ]}
                            />

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <WFHAttendanceTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    employee: row.employee,
                                                    employeeName: row.employee_name,
                                                    date: row.date,
                                                    workflowState: row.workflow_state || 'Draft',
                                                    fromTime: row.from_time,
                                                    toTime: row.to_time,
                                                    totalHours: row.total_hours,
                                                    modified: row.modified,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleViewRow(row.name)}
                                                onEdit={() => handleEditRow(row.name)}
                                                onApplyAction={(action) => handleApplyAction(row.name, action)}
                                                canEdit={permissions.write}
                                                isHR={isHR}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <EmptyContent
                                                        title="No WFH records"
                                                        description="You haven't added any WFH entries yet."
                                                        icon="solar:calendar-date-bold-duotone"
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
                    onPageChange={(_e, newPage) => setPage(newPage)}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Card>

            {/* CREATE/EDIT DIALOG */}
            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {currentId ? 'Edit WFH Entry' : 'New WFH Entry'}
                    <IconButton onClick={handleCloseCreate} sx={{ color: theme.palette.grey[500] }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box
                            display="grid"
                            margin={2}
                            gridTemplateColumns="1fr"
                            gap={3}
                        >
                            {formData.from_time && formData.to_time && (
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 1.5,
                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Box
                                            sx={{
                                                p: 0.75,
                                                borderRadius: 1,
                                                bgcolor: '#059669',
                                                color: 'common.white',
                                                display: 'flex'
                                            }}
                                        >
                                            <Iconify icon={"solar:clock-square-bold-duotone" as any} width={22} />
                                        </Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                            Total Calculated Hours
                                        </Typography>
                                    </Stack>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                        {formData.total_hours || '0.00'}
                                    </Typography>
                                </Box>
                            )}

                            {renderField('employee', 'Employee', 'select', employeeOptions, {}, true)}
                            {renderField('date', 'Date', 'date', [], {}, true)}

                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                                {renderField('from_time', 'From Time', 'time', [], {}, true)}
                                {renderField('to_time', 'To Time', 'time', [], {}, false)}
                            </Box>

                            {renderField('task_description', 'Task Description', 'text', [], { multiline: true, rows: 3 })}
                        </Box>
                    </LocalizationProvider>
                </DialogContent>

                <DialogActions>
                    <Button variant="contained" onClick={handleCreate} disabled={creating} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
                        {creating ? 'Saving...' : (currentId ? 'Update Entry' : 'Submit')}
                    </Button>
                </DialogActions>
            </Dialog>

            <WFHAttendanceDetailsDialog
                open={openDetails}
                onClose={handleCloseDetails}
                wfhId={detailsId}
                socket={socket}
            />

            <WFHAttendanceTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                options={{
                    employees: employeeOptions
                }}
                isHR={isHR}
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

            <Snackbar
                open={!!serverAlert.message}
                autoHideDuration={6000}
                onClose={() => setServerAlert({ ...serverAlert, message: '' })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setServerAlert({ ...serverAlert, message: '' })}
                    severity={serverAlert.severity}
                    sx={{ width: '100%', whiteSpace: 'pre-line' }}
                >
                    {serverAlert.message}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}
