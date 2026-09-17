import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import Checkbox from '@mui/material/Checkbox';
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TablePagination from '@mui/material/TablePagination';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { MenuItem, IconButton, CircularProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useAttendance } from 'src/hooks/useAttendance';

import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import { getHRPermissions } from 'src/api/hr-management';
import { fetchAttendance, createAttendance, updateAttendance, deleteAttendance } from 'src/api/attendance';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../lead/table-no-data';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { AttendanceTableRow } from '../attendance-table-row';
import { AttendanceImportDialog } from '../attendance-import-dialog';
import { LeadTableHead as AttendanceTableHead } from '../../lead/lead-table-head';
import { AttendanceTableFiltersDrawer } from '../attendance-table-filters-drawer';
import { LeadTableToolbar as AttendanceTableToolbar } from '../../lead/lead-table-toolbar';
import { AttendanceDetailsDialog } from '../../report/attendance/attendance-details-dialog';

// ----------------------------------------------------------------------

export function AttendanceView() {
    const { user } = useAuth();

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.attendance_list;
    const canCreateAttendace = hasCustomPerms && user?.permissions?.actions?.attendance_list ? !!user?.permissions?.actions?.attendance_list?.create : true;
    const canImportAttendace = hasCustomPerms && user?.permissions?.actions?.attendance_list ? !!user?.permissions?.actions?.attendance_list?.import : true;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [selected, setSelected] = useState<string[]>([]);

    const [openCreate, setOpenCreate] = useState(false);
    const [openImport, setOpenImport] = useState(false);
    const [creating, setCreating] = useState(false);
    const [currentAttendanceId, setCurrentAttendanceId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({
        status: 'Present',
        attendance_date: dayjs().format('YYYY-MM-DD'),
    });
    const [touched, setTouched] = useState(false);

    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);

    // Filter State
    const [filterStatus, setFilterStatus] = useState('all');
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);
    const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
    const [openFilters, setOpenFilters] = useState(false);

    // Alert & Dialog State
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [serverAlert, setServerAlert] = useState<{ message: string, severity: 'success' | 'error' | 'warning' | 'info' }>({
        message: '',
        severity: 'info'
    });

    const [openDetails, setOpenDetails] = useState(false);
    const [detailsId, setDetailsId] = useState<string | null>(null);

    // Permissions State
    const [permissions, setPermissions] = useState<{ read: boolean; write: boolean; delete: boolean }>({
        read: true,
        write: true,
        delete: true,
    });

    const isHR = user?.roles?.some((role: string) =>
        ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
    );

    const effectiveEmployee = isHR ? filterEmployee : user?.employee;

    const { data, total, loading, refetch } = useAttendance(
        page + 1,
        rowsPerPage,
        filterName,
        orderBy,
        order,
        startDate || undefined,
        endDate || undefined,
        filterStatus,
        effectiveEmployee
    );

    const notFound = !data.length && !!filterName;
    const empty = !data.length && !filterName && !loading;

    useEffect(() => {
        getHRPermissions('Attendance').then(setPermissions);
        getDoctypeList('Employee', ['name', 'employee_name']).then(setEmployeeOptions).catch(console.error);
    }, []);

    const handleOpenCreate = () => {
        setFormData({
            status: 'Present',
            attendance_date: dayjs().format('YYYY-MM-DD'),
        });
        setTouched(false);
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setCurrentAttendanceId(null);
        setTouched(false);
    };

    const handleOpenImport = () => {
        setOpenImport(true);
    };

    const handleCloseImport = () => {
        setOpenImport(false);
    };

    const handleInputChange = (fieldname: string, value: any) => {
        setFormData((prev: Record<string, any>) => {
            const next = { ...prev, [fieldname]: value };

            if (fieldname === 'manual') {
                next.manual = value ? 1 : 0;
            }

            // Calculate working hours
            if (fieldname === 'in_time' || fieldname === 'out_time') {
                if (next.in_time && next.out_time) {
                    const start = dayjs(`2000-01-01 ${next.in_time}`);
                    const end = dayjs(`2000-01-01 ${next.out_time}`);
                    if (end.isAfter(start)) {
                        const diffMs = end.diff(start);
                        const diffHrs = diffMs / (1000 * 60 * 60);

                        const h = Math.floor(diffHrs);
                        const m = Math.round((diffHrs - h) * 60);
                        const formattedTime = `${h.toString().padStart(2, '0')}.${m.toString().padStart(2, '0')}`;

                        next.working_hours_display = formattedTime;

                        if (diffHrs > 9) {
                            const otDiff = diffHrs - 9;
                            const otH = Math.floor(otDiff);
                            const otM = Math.round((otDiff - otH) * 60);
                            next.overtime_display = `${otH.toString().padStart(2, '0')}.${otM.toString().padStart(2, '0')}`;
                        } else {
                            next.overtime_display = '00.00';
                        }
                    } else {
                        next.working_hours_display = '00.00';
                        next.overtime_display = '00.00';
                    }
                }
            }
            return next;
        });
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev: any) => ({ ...prev, open: false }));
    };

    const handleDeleteClick = (id: string) => {
        setConfirmDelete({ open: true, id });
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteAttendance(confirmDelete.id);
            setSnackbar({ open: true, message: 'Attendance record deleted successfully', severity: 'success' });
            await refetch();
        } catch (e: any) {
            console.error(e);
            setSnackbar({ open: true, message: e.message || 'Failed to delete record', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const validateForm = () => {
        if (!formData.employee) return 'Employee is required';
        if (!formData.attendance_date) return 'Attendance Date is required';
        if (!formData.status) return 'Status is required';

        // Check future date
        const selectedDate = dayjs(formData.attendance_date);
        const today = dayjs().startOf('day');
        if (selectedDate.isAfter(today)) {
            return 'Attendance cannot be marked for future dates';
        }

        // Time validation for Present/Half Day
        if (formData.status === 'Present' || formData.status === 'Half Day') {
            if (!formData.in_time) return 'In Time is required for ' + formData.status;
            if (!formData.out_time) return 'Out Time is required for ' + formData.status;
        }

        // Logical time check
        if (formData.in_time && formData.out_time) {
            const start = dayjs(`2000-01-01 ${formData.in_time}`);
            const end = dayjs(`2000-01-01 ${formData.out_time}`);
            if (!end.isAfter(start)) {
                return 'Out Time must be after In Time';
            }
        }

        return null;
    };

    const handleCreate = async () => {
        setTouched(true);
        const error = validateForm();
        if (error) {
            setSnackbar({ open: true, message: error, severity: 'error' });
            return;
        }

        try {
            setCreating(true);
            setServerAlert({ message: '', severity: 'info' });

            // Duplicate Check: Check if attendance already exists for this employee on this date
            const existing = await fetchAttendance({
                page: 1,
                page_size: 1,
                filters: [
                    ['Attendance', 'employee', '=', formData.employee],
                    ['Attendance', 'attendance_date', '=', formData.attendance_date]
                ]
            });

            if (existing.data.length > 0 && existing.data[0].name !== currentAttendanceId) {
                setSnackbar({ open: true, message: `Attendance already marked for ${formData.employee} on ${formData.attendance_date}`, severity: 'error' });
                setCreating(false);
                return;
            }

            if (currentAttendanceId) {
                await updateAttendance(currentAttendanceId, formData as any);
                setSnackbar({ open: true, message: 'Attendance updated successfully', severity: 'success' });
            } else {
                await createAttendance(formData as any);
                setSnackbar({ open: true, message: 'Attendance marked successfully', severity: 'success' });
            }

            await refetch();
            handleCloseCreate();
        } catch (err: any) {
            console.error(err);
            setServerAlert({ message: err.message || 'Error saving attendance', severity: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handleEditRow = (id: string) => {
        setCurrentAttendanceId(id);
        const fullRow = data.find((item: any) => item.name === id);
        if (fullRow) {
            setFormData({ ...fullRow });
        }
        setTouched(false);
        setOpenCreate(true);
    };

    const handleOpenDetails = (id: string) => {
        setDetailsId(id);
        setOpenDetails(true);
    };

    const handleCloseDetails = () => {
        setOpenDetails(false);
        setDetailsId(null);
    };

    const handleOpenFilters = () => {
        setOpenFilters(true);
    };

    const handleCloseFilters = () => {
        setOpenFilters(false);
    };

    const handleFilters = (update: any) => {
        if (update.startDate !== undefined) setStartDate(update.startDate);
        if (update.endDate !== undefined) setEndDate(update.endDate);
        if (update.status !== undefined) setFilterStatus(update.status);
        if (update.employee !== undefined) setFilterEmployee(update.employee);
        setPage(0);
    };

    const handleResetFilters = () => {
        setStartDate(null);
        setEndDate(null);
        setFilterStatus('all');
        setFilterEmployee(null);
        setFilterName('');
        setPage(0);
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

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selected.map((id) => deleteAttendance(id)));
            setSnackbar({ open: true, message: `${selected.length} records deleted successfully`, severity: 'success' });
            setSelected([]);
            await refetch();
        } catch (e: any) {
            setSnackbar({ open: true, message: e.message || 'Error during bulk delete', severity: 'error' });
        }
    };

    const renderField = (fieldname: string, label: string, type: string = 'text', options: any[] = [], extraProps: any = {}, required: boolean = false) => {

        // ✅ HIDDEN FIELD HANDLING (ADD THIS)
        if (type === 'hidden' || extraProps?.hidden) {
            return (
                <input
                    type="hidden"
                    name={fieldname}
                    value={formData[fieldname] || ''}
                />
            );
        }

        let errorMsg = '';
        if (touched) {
            if (required && !formData[fieldname]) {
                errorMsg = `${label} is required`;
            } else if ((fieldname === 'in_time' || fieldname === 'out_time') && (formData.status === 'Present' || formData.status === 'Half Day') && !formData[fieldname]) {
                errorMsg = `${label} is required for ${formData.status}`;
            }
        }

        const commonProps = {
            fullWidth: true,
            label,
            value: formData[fieldname] || '',
            onChange: (e: any) => handleInputChange(fieldname, e.target.value),
            InputLabelProps: { shrink: true },
            required,
            error: !!errorMsg,
            helperText: errorMsg,
            ...extraProps,
            sx: {
                '& .MuiFormLabel-asterisk': {
                    color: 'red',
                },
                ...extraProps.sx
            }
        };

        if (type === 'select' || type === 'link') {
            return (
                <TextField {...commonProps} select>
                    <MenuItem value="" disabled>Select {label}</MenuItem>
                    {options.map((opt: any) => (
                        <MenuItem key={opt.name || opt} value={opt.name || opt}>
                            {opt.employee_name ? `${opt.employee_name} (${opt.name})` : (opt.name || opt)}
                        </MenuItem>
                    ))}
                </TextField>
            );
        }

        if (type === 'date') {
            return (
                <DatePicker
                    label={label}
                    value={formData[fieldname] ? dayjs(formData[fieldname]) : null}
                    onChange={(newValue) => handleInputChange(fieldname, newValue?.format('YYYY-MM-DD') || '')}
                    format="DD-MM-YYYY"
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            required,
                            InputLabelProps: { shrink: true },
                            error: !!errorMsg,
                            helperText: errorMsg,
                            sx: commonProps.sx
                        }
                    }}
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
                            InputLabelProps: { shrink: true },
                            error: !!errorMsg,
                            helperText: errorMsg,
                            sx: commonProps.sx
                        }
                    }}
                />
            );
        }

        if (type === 'checkbox') {
            return (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={!!formData[fieldname]}
                            onChange={(e) => handleInputChange(fieldname, e.target.checked)}
                        />
                    }
                    label={label}
                />
            );
        }

        return <TextField {...commonProps} />;
    };

    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'date_asc', label: 'Date Asc' },
        { value: 'date_desc', label: 'Date Desc' },
        { value: 'employee_asc', label: 'Employee Asc' },
        { value: 'employee_desc', label: 'Employee Desc' },
    ];

    const getSortByValue = () => {
        if (orderBy === 'modified') {
            return order === 'desc' ? 'newest' : 'oldest';
        }
        if (orderBy === 'attendance_date') {
            return order === 'asc' ? 'date_asc' : 'date_desc';
        }
        if (orderBy === 'employee_name') {
            return order === 'asc' ? 'employee_asc' : 'employee_desc';
        }
        return 'newest';
    };

    const handleSortChange = (value: string) => {
        if (value === 'newest') {
            setOrderBy('modified');
            setOrder('desc');
        } else if (value === 'oldest') {
            setOrderBy('modified');
            setOrder('asc');
        } else if (value === 'date_asc') {
            setOrderBy('attendance_date');
            setOrder('asc');
        } else if (value === 'date_desc') {
            setOrderBy('attendance_date');
            setOrder('desc');
        } else if (value === 'employee_asc') {
            setOrderBy('employee_name');
            setOrder('asc');
        } else if (value === 'employee_desc') {
            setOrderBy('employee_name');
            setOrder('desc');
        }
    };

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Attendance
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    {isHR && permissions.write && (
                        <>
                            {canImportAttendace &&(
                                <Button
                                    variant="outlined"
                                    startIcon={<Iconify icon="solar:import-bold-duotone" />}
                                    onClick={handleOpenImport}
                                >
                                    Import
                                </Button>
                            )}
                            
                            {canCreateAttendace &&(
                                <Button
                                    variant="contained"
                                    startIcon={<Iconify icon="mingcute:add-line" />}
                                    onClick={handleOpenCreate}
                                    sx={{ bgcolor: '#08a3cd', color: 'common.white', '&:hover': { bgcolor: '#068fb3' } }}
                                >
                                    Mark Attendance
                                </Button>
                            )}
                        </>
                    )}
                </Box>
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
                    searchPlaceholder="Search attendance..."
                    sortOptions={sortOptions}
                    sortBy={getSortByValue()}
                    onSortChange={handleSortChange}
                    onOpenFilter={handleOpenFilters}
                    canReset={!!startDate || !!endDate || !!filterName || filterStatus !== 'all' || !!filterEmployee}
                />

                <AttendanceTableFiltersDrawer
                    open={openFilters}
                    onOpen={handleOpenFilters}
                    onClose={handleCloseFilters}
                    filters={{ startDate, endDate, status: filterStatus, employee: filterEmployee }}
                    onFilters={handleFilters}
                    canReset={!!startDate || !!endDate || filterStatus !== 'all' || !!filterEmployee || !!filterName}
                    onResetFilters={handleResetFilters}
                    employeeOptions={employeeOptions}
                    isHR={isHR}
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
                                    { id: 'employee_name', label: 'Employee', minWidth: { xs: 140, md: 180 }, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'attendance_date', label: 'Date', minWidth: { xs: 100, md: 120 } },
                                    { id: 'status', label: 'Status', minWidth: { xs: 80, md: 90 } },
                                    { id: 'attendance_source', label: 'Source', minWidth: { xs: 80, md: 100 } },
                                    { id: 'in_time', label: 'In Time', minWidth: 120, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'out_time', label: 'Out Time', minWidth: 120, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'working_hours_display', label: 'Working Hours', minWidth: 120, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: '', label: '', align: 'right' },
                                ]}
                            />

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#08a3cd' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <AttendanceTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    employee: row.employee,
                                                    employeeName: row.employee_name,
                                                    attendanceDate: row.attendance_date,
                                                    status: row.status,
                                                    inTime: row.in_time,
                                                    out_time: row.out_time,
                                                    working_hours_display: row.working_hours_display,
                                                    attendance_source: row.attendance_source,
                                                    manual: row.manual,
                                                    modified: row.modified,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleOpenDetails(row.name)}
                                                onEdit={() => handleEditRow(row.name)}
                                                onDelete={() => handleDeleteClick(row.name)}
                                                canEdit={permissions.write}
                                                canDelete={permissions.delete}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={9}>
                                                    <EmptyContent
                                                        title="No attendance records"
                                                        description="You haven't marked any attendance yet."
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
            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24 } }}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {currentAttendanceId ? 'Edit Attendance' : 'Mark Attendance'}
                    <IconButton onClick={handleCloseCreate} sx={{ color: (theme) => theme.palette.grey[500] }}>
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
                            <Autocomplete
                                fullWidth
                                options={employeeOptions}
                                getOptionLabel={(option) => option.employee_name || option.name || ''}
                                value={employeeOptions.find((opt) => opt.name === formData.employee) || null}
                                onChange={(event, newValue) => {
                                    handleInputChange('employee', newValue?.name || '');
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Employee"
                                        required
                                        InputLabelProps={{ shrink: true }}
                                        error={touched && !formData.employee}
                                        helperText={touched && !formData.employee ? 'Employee is required' : ''}
                                        sx={{
                                            '& .MuiFormLabel-asterisk': {
                                                color: 'red',
                                            },
                                        }}
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <li {...props}>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {option.employee_name || option.name}
                                            </Typography>
                                            {option.employee_name && (
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                                    ID: {option.name}
                                                </Typography>
                                            )}
                                        </Box>
                                    </li>
                                )}
                            />
                            {renderField('attendance_date', 'Attendance Date', 'date', [], {}, true)}
                            {renderField('status', 'Status', 'select', ['Present', 'Absent', 'Half Day', 'On Leave', 'Holiday', 'Missing'], { hidden: false })}

                            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                                {renderField('in_time', 'In Time', 'time')}
                                {renderField('out_time', 'Out Time', 'time')}
                            </Box>

                            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                                {renderField('working_hours_display', 'Working Hours', 'text', [], { InputProps: { readOnly: true } })}
                                {renderField('overtime_display', 'Overtime Hours', 'text', [], { InputProps: { readOnly: true } })}
                            </Box>

                            {renderField('manual', 'Manual', 'checkbox')}
                        </Box>
                    </LocalizationProvider>
                </DialogContent>

                <DialogActions sx={{ p: 2}}>
                    <Button variant="contained" onClick={handleCreate} disabled={creating} sx={{ bgcolor: '#08a3cd', '&:hover': { bgcolor: '#068fb3' } }}>
                        {creating ? 'Saving...' : (currentAttendanceId ? 'Update Record' : 'Save Record')}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this attendance record?"
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

            <AttendanceDetailsDialog
                open={openDetails}
                onClose={handleCloseDetails}
                attendanceId={detailsId}
            />

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

            <AttendanceImportDialog
                open={openImport}
                onClose={handleCloseImport}
                onRefresh={refetch}
            />
        </DashboardContent>
    );
}
