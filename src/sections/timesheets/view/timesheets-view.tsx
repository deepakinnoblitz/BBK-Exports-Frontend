import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';

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
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useRouter } from 'src/routes/hooks';

import { useTimesheets } from 'src/hooks/useTimesheets';

import { fetchEmployees } from 'src/api/employees';
import { fetchMonthHolidays } from 'src/api/dashboard';
import { DashboardContent } from 'src/layouts/dashboard';
import {
    getTimesheet,
    fetchProjects,
    createProject,
    createActivityType,
    createTimesheet,
    updateTimesheet,
    deleteTimesheet,
    fetchActivityTypes,
    getTimesheetPermissions,
} from 'src/api/timesheets';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { TimesheetTableRow } from 'src/sections/timesheets/timesheets-table-row';
import { LeadTableHead as TimesheetTableHead } from 'src/sections/lead/lead-table-head';
import { LeadTableToolbar as TimesheetTableToolbar } from 'src/sections/lead/lead-table-toolbar';
import { TimesheetDetailsDialog } from 'src/sections/report/timesheets/timesheets-details-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TimesheetsTableFiltersDrawer } from '../timesheets-table-filters-drawer';

const filter = createFilterOptions<any>();

// ----------------------------------------------------------------------

interface TimesheetEntry {
    idx?: number;
    project: string;
    activity_type: string;
    hours: number;
    description: string;
}

export function TimesheetsView() {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && (user?.permissions?.actions?.timesheets || user?.permissions?.actions?.my_timesheet);
    const actionPerms = user?.permissions?.actions?.timesheets || user?.permissions?.actions?.my_timesheet;
    const canCreateTimesheet = hasCustomPerms && actionPerms ? !!actionPerms?.create : true;
    const canEditTimesheet = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const canDeleteTimesheet = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;

    const isHR = user?.roles?.some((role: string) =>
        ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
    );

    const router = useRouter();
    const [searchParams] = useSearchParams();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [selected, setSelected] = useState<string[]>([]);

    const [filters, setFilters] = useState({
        employee: 'all',
        startDate: null as string | null,
        endDate: null as string | null,
    });
    const [openFilters, setOpenFilters] = useState(false);

    const timesheetFilters = useMemo(() => ({
        ...filters,
        employee: isHR ? (filters.employee || 'all') : (user?.employee || 'all'),
    }), [filters, isHR, user]);

    const { data, total, loading, refetch } = useTimesheets(page + 1, rowsPerPage, filterName, orderBy, order, timesheetFilters);

    const [openCreate, setOpenCreate] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentTimesheet, setCurrentTimesheet] = useState<any>(null);

    // View state
    const [openView, setOpenView] = useState(false);
    const [viewTimesheet, setViewTimesheet] = useState<any>(null);

    // Form state
    const [employee, setEmployee] = useState('');
    const [timesheetDate, setTimesheetDate] = useState('');
    const [notes, setNotes] = useState('');
    const [entries, setEntries] = useState<TimesheetEntry[]>([]);

    // Entry dialog state
    const [openEntryDialog, setOpenEntryDialog] = useState(false);
    const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null);
    const [entryProject, setEntryProject] = useState('');
    const [projectInputValue, setProjectInputValue] = useState('');
    const [entryActivityType, setEntryActivityType] = useState('');
    const [activityTypeInputValue, setActivityTypeInputValue] = useState('');
    const [entryHours, setEntryHours] = useState('');
    const [entryDescription, setEntryDescription] = useState('');

    // Employees for dropdown
    const [employees, setEmployees] = useState<any[]>([]);

    // Projects and Activity Types for dropdown
    const [projects, setProjects] = useState<any[]>([]);
    const [activityTypes, setActivityTypes] = useState<any[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingActivityTypes, setLoadingActivityTypes] = useState(false);

    // Permissions
    const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });

    // Snackbar
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [holidays, setHolidays] = useState<any[]>([]);

    // Delete confirmation state
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [confirmEntryDelete, setConfirmEntryDelete] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deletingEntryIndex, setDeletingEntryIndex] = useState<number | null>(null);

    // Create Project state
    const [openProjectCreate, setOpenProjectCreate] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [creatingProject, setCreatingProject] = useState(false);

    // Create Activity Type state
    const [openActivityTypeCreate, setOpenActivityTypeCreate] = useState(false);
    const [newActivityTypeName, setNewActivityTypeName] = useState('');
    const [creatingActivityType, setCreatingActivityType] = useState(false);

    // Load permissions and employees
    useEffect(() => {
        getTimesheetPermissions().then(setPermissions);
        fetchEmployees({ page: 1, page_size: 1000, search: '' }).then((res) => {
            setEmployees(res.data || []);
        });
        fetchProjects({ page: 1, page_size: 1000 }).then((res: any) => {
            setProjects(res.data || []);
        });
        fetchActivityTypes({ page: 1, page_size: 1000 }).then((res: any) => {
            setActivityTypes(res.data || []);
        });
        fetchMonthHolidays().then((res) => {
            setHolidays(res || []);
        });
    }, []);

    // Calculate total hours whenever entries change
    const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

    const handleFilters = (update: any) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            employee: 'all',
            startDate: null,
            endDate: null,
        });
        setPage(0);
    };

    const canReset =
        filters.employee !== 'all' ||
        !!filters.startDate ||
        !!filters.endDate ||
        !!filterName;

    const employeeOptions = employees.map((emp) => ({
        value: emp.name,
        label: `${emp.employee_name} (${emp.name || emp.employee_id})`,
    }));

    const handleSort = (value: string) => {
        if (value === 'timesheet_date_desc') {
            setOrderBy('modified');
            setOrder('desc');
        } else if (value === 'timesheet_date_asc') {
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
        if (orderBy === 'modified' && order === 'desc') return 'timesheet_date_desc';
        if (orderBy === 'modified' && order === 'asc') return 'timesheet_date_asc';
        if (orderBy === 'employee_name' && order === 'asc') return 'employee_name_asc';
        if (orderBy === 'employee_name' && order === 'desc') return 'employee_name_desc';
        if (orderBy === 'total_hours' && order === 'desc') return 'total_hours_desc';
        if (orderBy === 'total_hours' && order === 'asc') return 'total_hours_asc';
        return 'timesheet_date_desc';
    };

    const handleSelectAllRows = (checked: boolean) => {
        if (checked) {
            setSelected(data.map((row) => row.name));
        } else {
            setSelected([]);
        }
    };

    const handleSelectRow = (name: string) => {
        setSelected((prev) =>
            prev.includes(name) ? prev.filter((id) => id !== name) : [...prev, name]
        );
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selected.map((name) => deleteTimesheet(name)));
            setSnackbar({
                open: true,
                message: `${selected.length} timesheet(s) deleted successfully`,
                severity: 'success',
            });
            setSelected([]);
            refetch();
            setConfirmBulkDelete(false);
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to delete timesheets',
                severity: 'error',
            });
        }
    };

    const handleOpenCreate = useCallback(() => {
        setIsEdit(false);
        setCurrentTimesheet(null);
        // Pre-fill with current user's employee ID
        const currentEmployee = user?.employee || '';
        setEmployee(currentEmployee);
        setTimesheetDate('');
        setNotes('');
        setEntries([]);
        setFormErrors({});
        setOpenCreate(true);
    }, [user]);


    // Deep linking for new timesheet
    useEffect(() => {
        const date = searchParams.get('date');
        const action = searchParams.get('action');

        if (action === 'new' && date) {
            handleOpenCreate();
            setTimesheetDate(date);
        }
    }, [searchParams, handleOpenCreate]);

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setIsEdit(false);
        setCurrentTimesheet(null);
        setEmployee('');
        setTimesheetDate('');
        setNotes('');
        setEntries([]);
        setFormErrors({});

        // Redirect back to dashboard if opened via deep link
        const action = searchParams.get('action');
        if (action === 'new') {
            router.push('/');
        }
    };

    const handleEditRow = useCallback(async (row: any) => {
        try {
            // Fetch full timesheet data with child tables
            const fullData = await getTimesheet(row.name);
            setCurrentTimesheet(fullData);
            setEmployee(fullData.employee || '');
            setTimesheetDate(fullData.timesheet_date || '');
            setNotes(fullData.notes || '');
            setEntries(fullData.timesheet_entries || []);
            setFormErrors({});
            setIsEdit(true);
            setOpenCreate(true);
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to load timesheet',
                severity: 'error',
            });
        }
    }, []);

    const handleViewRow = useCallback(async (row: any) => {
        try {
            // Fetch full timesheet data with child tables
            const fullData = await getTimesheet(row.name);
            setViewTimesheet(fullData);
            setOpenView(true);
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to load timesheet',
                severity: 'error',
            });
        }
    }, []);

    const handleDeleteRow = useCallback(
        (name: string) => {
            setDeleteId(name);
            setConfirmDelete(true);
        },
        []
    );

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteTimesheet(deleteId);
            setSnackbar({ open: true, message: 'Timesheet deleted successfully', severity: 'success' });
            refetch();
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to delete timesheet',
                severity: 'error',
            });
        } finally {
            setDeleteId(null);
            setConfirmDelete(false);
        }
    };

    // Entry management functions
    const loadProjects = useCallback(async () => {
        setLoadingProjects(true);
        try {
            const res = await fetchProjects({ page: 1, page_size: 1000 });
            setProjects(res.data || []);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoadingProjects(false);
        }
    }, []);

    const loadActivityTypes = useCallback(async () => {
        setLoadingActivityTypes(true);
        try {
            const res = await fetchActivityTypes({ page: 1, page_size: 1000 });
            setActivityTypes(res.data || []);
        } catch (error) {
            console.error('Failed to fetch activity types:', error);
        } finally {
            setLoadingActivityTypes(false);
        }
    }, []);

    const handleOpenEntryDialog = () => {
        setEditingEntryIndex(null);
        setEntryProject('');
        setProjectInputValue('');
        setEntryActivityType('');
        setActivityTypeInputValue('');
        setEntryHours('');
        setEntryDescription('');
        loadProjects();
        loadActivityTypes();
        setOpenEntryDialog(true);
    };

    const handleEditEntry = (index: number) => {
        const entry = entries[index];
        setEditingEntryIndex(index);
        setEntryProject(entry.project);
        setProjectInputValue(entry.project);
        setEntryActivityType(entry.activity_type);
        setActivityTypeInputValue(entry.activity_type);
        setEntryHours(entry.hours.toString());
        setEntryDescription(entry.description);
        loadProjects();
        loadActivityTypes();
        setOpenEntryDialog(true);
    };

    const handleDeleteEntry = (index: number) => {
        setDeletingEntryIndex(index);
        setConfirmEntryDelete(true);
    };

    const handleConfirmDeleteEntry = () => {
        if (deletingEntryIndex !== null) {
            setEntries((prev) => prev.filter((_, i) => i !== deletingEntryIndex));
        }
        setConfirmEntryDelete(false);
        setDeletingEntryIndex(null);
    };

    const handleSaveEntry = () => {
        const newEntry: TimesheetEntry = {
            project: entryProject,
            activity_type: entryActivityType,
            hours: parseFloat(entryHours) || 0,
            description: entryDescription,
        };

        if (editingEntryIndex !== null) {
            setEntries((prev) => prev.map((entry, i) => (i === editingEntryIndex ? newEntry : entry)));
        } else {
            setEntries((prev) => [...prev, newEntry]);
        }

        setOpenEntryDialog(false);
        if (formErrors.entries) {
            setFormErrors((prev) => ({ ...prev, entries: '' }));
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!employee) errors.employee = 'Employee is required';
        if (!timesheetDate) {
            errors.timesheetDate = 'Timesheet Date is required';
        } else {
            const isHoliday = holidays.some((h) => h.date === timesheetDate);
            const isSunday = dayjs(timesheetDate).day() === 0;

            if (isHoliday) {
                const holiday = holidays.find((h) => h.date === timesheetDate);
                errors.timesheetDate = `Cannot create timesheet on a holiday: ${holiday?.description || 'Holiday'}`;
            } else if (isSunday) {
                errors.timesheetDate = 'Cannot create timesheet on a Sunday';
            }
        }
        if (entries.length === 0) errors.entries = 'At least one entry is required';

        setFormErrors(errors);
        return errors;
    };

    const renderField = (
        fieldname: string,
        label: string,
        type: string = 'text',
        options: any[] = [],
        extraProps: any = {},
        required: boolean = false
    ) => {
        const commonProps = {
            fullWidth: true,
            label,
            value:
                fieldname === 'employee' ? employee : fieldname === 'timesheetDate' ? timesheetDate : notes,
            onChange: (e: any) => {
                const val = e.target.value;
                if (fieldname === 'employee') setEmployee(val);
                else if (fieldname === 'timesheetDate') setTimesheetDate(val);
                else if (fieldname === 'notes') setNotes(val);

                if (formErrors[fieldname]) {
                    setFormErrors((prev) => ({ ...prev, [fieldname]: '' }));
                }
            },
            required,
            error: !!formErrors[fieldname],
            helperText: formErrors[fieldname],
            InputLabelProps: { shrink: true },
            sx: {
                '& .MuiFormLabel-asterisk': {
                    color: 'red',
                },
                ...extraProps.sx,
            },
            ...extraProps,
        };

        if (type === 'select') {
            return (
                <TextField {...commonProps} select SelectProps={{ native: true }}>
                    <option value="">Select {label}</option>
                    {options.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </TextField>
            );
        }

        if (fieldname === 'timesheetDate') {
            const dateValue = timesheetDate ? dayjs(timesheetDate) : null;
            return (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                        label={label}
                        format="DD-MM-YYYY"
                        value={dateValue}
                        onChange={(newValue) => {
                            const val =
                                newValue && dayjs(newValue).isValid() ? dayjs(newValue).format('YYYY-MM-DD') : '';
                            setTimesheetDate(val);
                            if (formErrors.timesheetDate)
                                setFormErrors((prev) => ({ ...prev, timesheetDate: '' }));
                        }}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                required,
                                error: !!formErrors.timesheetDate,
                                helperText: formErrors.timesheetDate,
                                InputLabelProps: { shrink: true },
                                sx: {
                                    '& .MuiFormLabel-asterisk': {
                                        color: 'red',
                                    },
                                },
                            },
                        }}
                    />
                </LocalizationProvider>
            );
        }

        return (
            <TextField
                {...commonProps}
                multiline={type === 'textarea'}
                rows={type === 'textarea' ? 3 : 1}
            />
        );
    };

    const handleCreate = async () => {
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            const firstError = Object.values(errors)[0];
            setSnackbar({
                open: true,
                message: firstError || 'Please correct the errors in the form',
                severity: 'error',
            });
            return;
        }

        const timesheetData = {
            employee: employee.trim(),
            timesheet_date: timesheetDate,
            total_hours: totalHours,
            notes: notes.trim(),
            timesheet_entries: entries,
        };

        try {
            if (isEdit && currentTimesheet) {
                await updateTimesheet(currentTimesheet.name, timesheetData);
                setSnackbar({ open: true, message: 'Timesheet updated successfully', severity: 'success' });
            } else {
                await createTimesheet(timesheetData);
                setSnackbar({ open: true, message: 'Timesheet created successfully', severity: 'success' });
            }
            handleCloseCreate();
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Operation failed', severity: 'error' });
        }
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleFilterByName = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilterName(event.target.value);
        setPage(0);
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const notFound = !loading && !data.length && !!filterName;
    const empty = !loading && !data.length && !filterName;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Timesheets
                </Typography>

                {permissions.write && canCreateTimesheet && (
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        New Timesheet
                    </Button>
                )}
            </Box>

            <Card>
                <TimesheetTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterByName}
                    searchPlaceholder="Search timesheets..."
                    onDelete={selected.length > 0 ? () => setConfirmBulkDelete(true) : undefined}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={getCurrentSortValue()}
                    onSortChange={handleSort}
                    sortOptions={[
                        { value: 'timesheet_date_desc', label: 'Newest First' },
                        { value: 'timesheet_date_asc', label: 'Oldest First' },
                        { value: 'employee_name_asc', label: 'Employee: A to Z' },
                        { value: 'employee_name_desc', label: 'Employee: Z to A' },
                        { value: 'total_hours_desc', label: 'Hours: High to Low' },
                        { value: 'total_hours_asc', label: 'Hours: Low to High' },
                    ]}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: { xs: 300, md: 800 } }}>
                            <TimesheetTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={data.length}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'employee_name', label: 'Employee' },
                                    { id: 'timesheet_date', label: 'Date' },
                                    { id: 'total_hours', label: 'Total Hours', sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: '', label: '' },
                                ]}
                            />
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={12} align="center" sx={{ py: 10 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <TimesheetTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    employee_name: row.employee_name,
                                                    employee_id: row.employee,
                                                    timesheet_date: row.timesheet_date,
                                                    total_hours: row.total_hours,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleViewRow(row)}
                                                onEdit={() => handleEditRow(row)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                canEdit={permissions.write && canEditTimesheet}
                                                canDelete={permissions.delete && canDeleteTimesheet}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={12}>
                                                    <EmptyContent
                                                        title="No Timesheet Found"
                                                        description="You haven't recorded any timesheets yet."
                                                        icon="solar:clock-circle-bold-duotone"
                                                        sx={{ py: 16 }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {!empty && !notFound && (
                                            <TableEmptyRows height={68} emptyRows={data.length < 5 ? 5 - data.length : 0} />
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Scrollbar>

                <TablePagination
                    component="div"
                    page={page}
                    count={total}
                    rowsPerPage={rowsPerPage}
                    onPageChange={handleChangePage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Card>

            {/* Single Delete Confirmation */}
            <ConfirmDialog
                open={confirmDelete}
                onClose={() => {
                    setConfirmDelete(false);
                    setDeleteId(null);
                }}
                title="Delete Timesheet"
                content="Are you sure you want to delete this timesheet? This action cannot be undone."
                action={
                    <Button variant="contained" color="error" onClick={handleConfirmDelete}>
                        Delete
                    </Button>
                }
            />

            {/* Bulk Delete Confirmation */}
            <ConfirmDialog
                open={confirmBulkDelete}
                onClose={() => setConfirmBulkDelete(false)}
                title="Delete Timesheets"
                content={`Are you sure you want to delete ${selected.length} selected timesheet(s)? This action cannot be undone.`}
                action={
                    <Button variant="contained" color="error" onClick={handleBulkDelete}>
                        Delete
                    </Button>
                }
            />

            {/* Entry Delete Confirmation */}
            <ConfirmDialog
                open={confirmEntryDelete}
                onClose={() => {
                    setConfirmEntryDelete(false);
                    setDeletingEntryIndex(null);
                }}
                title="Delete Entry"
                content="Are you sure you want to delete this entry? This action cannot be undone."
                action={
                    <Button variant="contained" color="error" onClick={handleConfirmDeleteEntry}>
                        Delete
                    </Button>
                }
            />

            {/* Create/Edit Dialog */}
            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',

                    }}
                >
                    {isEdit ? 'Edit Timesheet' : 'New Timesheet'}
                    <IconButton onClick={handleCloseCreate}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <Box sx={{ display: 'grid', gap: 3, p: 2 }}>
                        <Box
                            sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
                        >
                            <Autocomplete
                                fullWidth
                                options={employees}
                                getOptionLabel={(option) => option.employee_name || option.name || option.employee_id || ''}
                                isOptionEqualToValue={(option, value) => option.name === (value?.name || value)}
                                value={employees.find((emp) => emp.name === employee) || (employee && user?.employee === employee ? { name: user.employee, employee_name: user.employee_name } : null)}
                                readOnly={isEdit}
                                onChange={(event, newValue) => {
                                    setEmployee(newValue?.name || '');
                                    if (formErrors.employee) {
                                        setFormErrors((prev) => ({ ...prev, employee: '' }));
                                    }
                                }}
                                renderOption={(props, option) => {
                                    const { key, ...optionProps } = props as any;
                                    return (
                                        <li key={key} {...optionProps}>
                                            <Stack spacing={0.5}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                    {option.employee_name || option.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                                    ID: {option.name || option.employee_id}
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
                                        placeholder="Search employee..."
                                        sx={{
                                            '& .MuiFormLabel-asterisk': {
                                                color: 'red',
                                            },
                                        }}
                                        inputProps={{
                                            ...params.inputProps,
                                            readOnly: isEdit,
                                        }}
                                    />
                                )}

                            />
                            {renderField('timesheetDate', 'Timesheet Date', 'date', [], {}, true)}
                        </Box>

                        {renderField('notes', 'Notes', 'textarea', [], {
                            placeholder: 'Enter timesheet notes',
                        })}

                        {/* Timesheet Entries Child Table */}
                        <Box sx={{ mt: 2 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 2,
                                }}
                            >
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontWeight: 700,
                                        color: formErrors.entries ? 'error.main' : 'text.primary',
                                    }}
                                >
                                    Timesheet Entries
                                    <Typography
                                        component="span"
                                        variant="body2"
                                        sx={{ ml: 2, color: 'primary.main', fontWeight: 600 }}
                                    >
                                        Total: {totalHours.toFixed(1)} hours
                                    </Typography>
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<Iconify icon="mingcute:add-line" />}
                                    onClick={handleOpenEntryDialog}
                                >
                                    Add Entry
                                </Button>
                            </Box>

                            {formErrors.entries && (
                                <Typography variant="caption" sx={{ color: 'error.main', mb: 1, display: 'block' }}>
                                    {formErrors.entries}
                                </Typography>
                            )}

                            <TableContainer
                                sx={{
                                    border: '1px solid',
                                    borderColor: formErrors.entries ? 'error.main' : 'divider',
                                    borderRadius: 1,
                                }}
                            >
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'background.neutral' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>Project</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Activity Type</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Hours</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                Actions
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {entries.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    align="center"
                                                    sx={{ py: 3, color: 'text.secondary' }}
                                                >
                                                    No entries added yet. Click &quot;Add Entry&quot; to begin.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            entries.map((entry, index) => (
                                                <TableRow key={index} hover>
                                                    <TableCell>{entry.project}</TableCell>
                                                    <TableCell>{entry.activity_type}</TableCell>
                                                    <TableCell>{entry.hours} hrs</TableCell>
                                                    <TableCell>{entry.description || '-'}</TableCell>
                                                    <TableCell align="right">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEditEntry(index)}
                                                            color="info"
                                                        >
                                                            <Iconify icon="solar:pen-bold" width={18} />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeleteEntry(index)}
                                                            color="error"
                                                        >
                                                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 1.5 }}>
                    <Button
                        onClick={handleCreate}
                        variant="contained"
                        sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                    >
                        {isEdit ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Entry Dialog */}
            <Dialog
                open={openEntryDialog}
                onClose={() => setOpenEntryDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    {editingEntryIndex !== null ? 'Edit Entry' : 'Add Entry'}
                    <IconButton onClick={() => setOpenEntryDialog(false)}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 3, pt: 2 }}>
                        <Autocomplete
                            fullWidth
                            options={projects}
                            loading={loadingProjects}
                            getOptionLabel={(option) => {
                                if (typeof option === 'string') return option;
                                if (option.isNew) return option.inputValue || '';
                                return option.project || option.name || '';
                            }}
                            value={
                                projects.find((p) => p.name === entryProject) ||
                                (entryProject ? { name: entryProject, project: entryProject } : null)
                            }
                            inputValue={projectInputValue}
                            isOptionEqualToValue={(option, value) =>
                                option?.name === value?.name
                            }
                            filterOptions={(currentOptions, params) => {
                                const filtered = filter(currentOptions, params);
                                const hasCreate = filtered.some((o: any) => o.isNew);
                                if (!hasCreate) {
                                    filtered.push({
                                        inputValue: params.inputValue || '',
                                        name: 'Create Project',
                                        project: 'Create Project',
                                        isNew: true,
                                    });
                                }
                                return filtered;
                            }}
                            renderOption={(props, option) => (
                                <Box
                                    component="li"
                                    {...props}
                                    sx={{
                                        typography: 'body2',
                                        ...(option.isNew && {
                                            color: 'primary.main',
                                            fontWeight: 600,
                                            bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
                                            borderTop: (theme: any) => `1px solid ${theme.palette.divider}`,
                                            mt: 0.5,
                                            py: 3,
                                            minHeight: '56px',
                                            '&:hover': {
                                                bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.16),
                                            },
                                        }),
                                    }}
                                >
                                    {option.isNew ? (
                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                            <Iconify icon={"solar:add-circle-bold" as any} width={24} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                Create Project
                                            </Typography>
                                        </Stack>
                                    ) : (
                                        option.project || option.name
                                    )}
                                </Box>
                            )}
                            onInputChange={(event, newInputValue, reason) => {
                                if (reason === 'input') {
                                    setProjectInputValue(newInputValue);
                                    setEntryProject('');
                                } else if (reason === 'clear') {
                                    setProjectInputValue('');
                                    setEntryProject('');
                                }
                            }}
                            onChange={(event, newValue: any) => {
                                if (newValue?.isNew) {
                                    setNewProjectName(newValue.inputValue || projectInputValue || '');
                                    setOpenProjectCreate(true);
                                } else {
                                    const projName = newValue?.name || newValue?.project || '';
                                    const projLabel = newValue?.project || newValue?.name || '';
                                    setEntryProject(projName);
                                    setProjectInputValue(projLabel);
                                }
                            }}
                            renderInput={(params) => (
                                <TextField {...params} label="Project" required placeholder="Select project" />
                            )}
                        />
                        <Autocomplete
                            fullWidth
                            options={activityTypes}
                            loading={loadingActivityTypes}
                            getOptionLabel={(option) => {
                                if (typeof option === 'string') return option;
                                if (option.isNew) return option.inputValue || '';
                                return option.activity_type || option.name || '';
                            }}
                            value={
                                activityTypes.find((at) => at.name === entryActivityType) ||
                                (entryActivityType
                                    ? { name: entryActivityType, activity_type: entryActivityType }
                                    : null)
                            }
                            inputValue={activityTypeInputValue}
                            isOptionEqualToValue={(option, value) =>
                                option?.name === value?.name
                            }
                            filterOptions={(currentOptions, params) => {
                                const filtered = filter(currentOptions, params);
                                const hasCreate = filtered.some((o: any) => o.isNew);
                                if (!hasCreate) {
                                    filtered.push({
                                        inputValue: params.inputValue || '',
                                        name: 'Create Activity Type',
                                        activity_type: 'Create Activity Type',
                                        isNew: true,
                                    });
                                }
                                return filtered;
                            }}
                            renderOption={(props, option) => (
                                <Box
                                    component="li"
                                    {...props}
                                    sx={{
                                        typography: 'body2',
                                        ...(option.isNew && {
                                            color: 'primary.main',
                                            fontWeight: 600,
                                            bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
                                            borderTop: (theme: any) => `1px solid ${theme.palette.divider}`,
                                            mt: 0.5,
                                            py: 3,
                                            minHeight: '56px',
                                            '&:hover': {
                                                bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.16),
                                            },
                                        }),
                                    }}
                                >
                                    {option.isNew ? (
                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                            <Iconify icon={"solar:add-circle-bold" as any} width={24} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                Create Activity Type
                                            </Typography>
                                        </Stack>
                                    ) : (
                                        option.activity_type || option.name
                                    )}
                                </Box>
                            )}
                            onInputChange={(event, newInputValue, reason) => {
                                if (reason === 'input') {
                                    setActivityTypeInputValue(newInputValue);
                                    setEntryActivityType('');
                                } else if (reason === 'clear') {
                                    setActivityTypeInputValue('');
                                    setEntryActivityType('');
                                }
                            }}
                            onChange={(event, newValue: any) => {
                                if (newValue?.isNew) {
                                    setNewActivityTypeName(newValue.inputValue || activityTypeInputValue || '');
                                    setOpenActivityTypeCreate(true);
                                } else {
                                    const actName = newValue?.name || newValue?.activity_type || '';
                                    const actLabel = newValue?.activity_type || newValue?.name || '';
                                    setEntryActivityType(actName);
                                    setActivityTypeInputValue(actLabel);
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Activity Type"
                                    required
                                    placeholder="Select activity type"
                                />
                            )}
                        />
                        <TextField
                            fullWidth
                            label="Hours"
                            type="number"
                            value={entryHours}
                            onChange={(e) => setEntryHours(e.target.value)}
                            required
                            inputProps={{ step: '0.5', min: '0' }}
                            placeholder="Enter hours worked"
                        />
                        <TextField
                            fullWidth
                            label="Description"
                            value={entryDescription}
                            onChange={(e) => setEntryDescription(e.target.value)}
                            multiline
                            rows={3}
                            placeholder="Enter task description"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleSaveEntry}
                        variant="contained"
                        disabled={!entryProject || !entryActivityType || !entryHours}
                    >
                        {editingEntryIndex !== null ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create Project Dialog */}
            <Dialog
                open={openProjectCreate}
                onClose={() => {
                    setOpenProjectCreate(false);
                    setNewProjectName('');
                }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    Create New Project
                    <IconButton onClick={() => { setOpenProjectCreate(false); setNewProjectName(''); }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <TextField
                            fullWidth
                            label="Project Name"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Enter project name"
                            required
                            autoFocus
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={async () => {
                            if (!newProjectName.trim()) return;
                            try {
                                setCreatingProject(true);
                                const created = await createProject(newProjectName.trim());
                                await loadProjects();
                                const createdProj = created?.name || newProjectName.trim();
                                setEntryProject(createdProj);
                                setProjectInputValue(createdProj);
                                setOpenProjectCreate(false);
                                setNewProjectName('');
                                setSnackbar({ open: true, message: 'Project created successfully', severity: 'success' });
                            } catch (err: any) {
                                setSnackbar({ open: true, message: err.message || 'Failed to create project', severity: 'error' });
                            } finally {
                                setCreatingProject(false);
                            }
                        }}
                        variant="contained"
                        disabled={!newProjectName.trim() || creatingProject}
                        sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                    >
                        {creatingProject ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create Activity Type Dialog */}
            <Dialog
                open={openActivityTypeCreate}
                onClose={() => {
                    setOpenActivityTypeCreate(false);
                    setNewActivityTypeName('');
                }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    Create New Activity Type
                    <IconButton onClick={() => { setOpenActivityTypeCreate(false); setNewActivityTypeName(''); }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <TextField
                            fullWidth
                            label="Activity Type Name"
                            value={newActivityTypeName}
                            onChange={(e) => setNewActivityTypeName(e.target.value)}
                            placeholder="Enter activity type name"
                            required
                            autoFocus
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={async () => {
                            if (!newActivityTypeName.trim()) return;
                            try {
                                setCreatingActivityType(true);
                                const created = await createActivityType(newActivityTypeName.trim());
                                await loadActivityTypes();
                                const createdAct = created?.name || newActivityTypeName.trim();
                                setEntryActivityType(createdAct);
                                setActivityTypeInputValue(createdAct);
                                setOpenActivityTypeCreate(false);
                                setNewActivityTypeName('');
                                setSnackbar({ open: true, message: 'Activity type created successfully', severity: 'success' });
                            } catch (err: any) {
                                setSnackbar({ open: true, message: err.message || 'Failed to create activity type', severity: 'error' });
                            } finally {
                                setCreatingActivityType(false);
                            }
                        }}
                        variant="contained"
                        disabled={!newActivityTypeName.trim() || creatingActivityType}
                        sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                    >
                        {creatingActivityType ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            <TimesheetDetailsDialog
                open={openView}
                onClose={() => setOpenView(false)}
                timesheet={viewTimesheet}
            />

            <TimesheetsTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                employees={employees}
                isHR={isHR}
            />

            {/* Snackbar */}
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
        </DashboardContent>
    );
}
