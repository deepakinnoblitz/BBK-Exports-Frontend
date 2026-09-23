import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Snackbar from '@mui/material/Snackbar';
import { styled } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useHolidayLists } from 'src/hooks/useHolidayLists';

const Android12Switch = styled(Switch)(({ theme }) => ({
    padding: 8,
    '& .MuiSwitch-track': {
        borderRadius: 22 / 2,
        '&::before, &::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 16,
            height: 16,
        },
        '&::before': {
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
                '#fff',
            )}" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>')`,
            left: 12,
        }
    },
    '& .MuiSwitch-thumb': {
        boxShadow: 'none',
        width: 16,
        height: 16,
        margin: 2,
    },
}));

import { DashboardContent } from 'src/layouts/dashboard';
import { getHolidayList, populateHolidays, createHolidayList, updateHolidayList, deleteHolidayList, getHolidayListPermissions } from 'src/api/holiday-lists';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { HolidayListTableRow } from 'src/sections/holidays/holidays-table-row';
import { LeadTableHead as HolidayTableHead } from 'src/sections/lead/lead-table-head';
import { HolidayDetailsDialog } from 'src/sections/report/holidays/holidays-details-dialog';
import { LeadTableToolbar as HolidayTableToolbar } from 'src/sections/lead/lead-table-toolbar';

import { HolidayTableFiltersDrawer } from '../holidays-table-filters-drawer';

// ----------------------------------------------------------------------

const HOLIDAY_SORT_OPTIONS = [
    { value: 'modified_desc', label: 'Newest First' },
    { value: 'modified_asc', label: 'Oldest First' },
    { value: 'year_desc', label: 'Year: Newest First' },
    { value: 'year_asc', label: 'Year: Oldest First' },
    { value: 'holiday_list_name_asc', label: 'Name: A to Z' },
    { value: 'holiday_list_name_desc', label: 'Name: Z to A' },
];

const MONTH_OPTIONS = [
    { label: 'January', value: '1' },
    { label: 'February', value: '2' },
    { label: 'March', value: '3' },
    { label: 'April', value: '4' },
    { label: 'May', value: '5' },
    { label: 'June', value: '6' },
    { label: 'July', value: '7' },
    { label: 'August', value: '8' },
    { label: 'September', value: '9' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
];

interface Holiday {
    idx?: number;
    holiday_date: string;
    description: string;
    is_working_day: number;
}

import { useAuth } from 'src/auth/auth-context';

export function HolidaysView() {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.holidays_list;
    const actionPerms = user?.permissions?.actions?.holidays_list;
    const canCreateHolidayList = hasCustomPerms && actionPerms ? !!actionPerms?.create : true;
    const canEditHolidayList = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const canDeleteHolidayList = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [selected, setSelected] = useState<string[]>([]);

    const { data, total, loading, refetch } = useHolidayLists(page + 1, rowsPerPage, filterName, orderBy, order);

    const [openCreate, setOpenCreate] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentHoliday, setCurrentHoliday] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });

    // View state
    const [openView, setOpenView] = useState(false);
    const [viewHoliday, setViewHoliday] = useState<any>(null);

    // Form state
    const [holidayListName, setHolidayListName] = useState('');
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [workingDays, setWorkingDays] = useState('');
    const [holidays, setHolidays] = useState<Holiday[]>([]);

    // Validation state
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState<{ year: string | null; month_year: string | null }>({
        year: null,
        month_year: null,
    });

    // Apply filters
    const filteredData = data.filter((item) => {
        if (filters.year && item.year.toString() !== filters.year) return false;
        if (filters.month_year && item.month_year !== filters.month_year) return false;
        return true;
    });

    // Permissions
    const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });

    // Snackbar
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Load permissions
    useEffect(() => {
        getHolidayListPermissions().then(setPermissions);
    }, []);

    const [populating, setPopulating] = useState(false);

    useEffect(() => {
        const fetchHolidays = async () => {
            if (year && month && !isEdit) {
                setPopulating(true);
                try {
                    const result = await populateHolidays(month, year);
                    setHolidays(result.holidays);
                    setWorkingDays(result.working_days.toString());
                } catch (error) {
                    console.error('Failed to populate holidays:', error);
                } finally {
                    setPopulating(false);
                }
            }
        };

        fetchHolidays();
    }, [year, month, isEdit]); // Only auto-populate for NEW lists when both are set and list is empty

    useEffect(() => {
        const count = holidays.filter(h => h.is_working_day === 1).length;
        setWorkingDays(count.toString());
    }, [holidays]);

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
            year: null,
            month_year: null,
        });
        setFilterName('');
    };

    const canReset = filters.year !== null || filters.month_year !== null || !!filterName;

    const handleSort = (property: string) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
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
            await Promise.all(selected.map((name) => deleteHolidayList(name)));
            setSnackbar({ open: true, message: `${selected.length} holiday list(s) deleted successfully`, severity: 'success' });
            setSelected([]);
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to delete holiday lists', severity: 'error' });
        }
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setCurrentHoliday(null);
        setHolidayListName('');
        setYear(new Date().getFullYear().toString());
        setMonth('');
        setWorkingDays('');
        setHolidays([]);
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setIsEdit(false);
        setCurrentHoliday(null);
        setHolidayListName('');
        setYear('');
        setMonth('');
        setWorkingDays('');
        setWorkingDays('');
        setHolidays([]);
        setFormErrors({});
    };

    const handleEditRow = useCallback(async (row: any) => {
        try {
            // Fetch full holiday list data with child tables
            const fullData = await getHolidayList(row.name);
            setCurrentHoliday(fullData);
            setHolidayListName(fullData.holiday_list_name || '');
            setYear(fullData.year?.toString() || '');
            setMonth(fullData.month_year || '');
            setWorkingDays(fullData.working_days?.toString() || '');
            setHolidays(fullData.holidays || []);
            setIsEdit(true);
            setOpenCreate(true);
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to load holiday list', severity: 'error' });
        }
    }, []);

    const handleViewRow = useCallback(async (row: any) => {
        try {
            // Fetch full holiday list data with child tables
            const fullData = await getHolidayList(row.name);
            setViewHoliday(fullData);
            setOpenView(true);
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to load holiday list', severity: 'error' });
        }
    }, []);

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteHolidayList(confirmDelete.id);
            setSnackbar({ open: true, message: 'Holiday list deleted successfully', severity: 'success' });
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to delete holiday list', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    // Holiday entry management functions
    const handleAddHoliday = () => {
        setHolidays((prev) => [
            ...prev,
            {
                holiday_date: dayjs().format('YYYY-MM-DD'),
                description: '',
                is_working_day: 0,
            }
        ]);
    };

    const handleHolidayChange = (index: number, field: keyof Holiday, value: any) => {
        setHolidays((prev) =>
            prev.map((holiday, i) => (i === index ? { ...holiday, [field]: value } : holiday))
        );
    };

    const handleDeleteHoliday = (index: number) => {
        setHolidays((prev) => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!holidayListName.trim()) errors.holidayListName = 'Holiday List Name is required';
        if (!year) errors.year = 'Year is required';
        if (!month) errors.month = 'Month is required';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreate = async () => {
        if (!validateForm()) {
            setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
            return;
        }

        const holidayData = {
            holiday_list_name: holidayListName.trim(),
            year: parseInt(year, 10),
            month_year: month.trim(),
            working_days: parseInt(workingDays, 10) || 0,
            holidays,
        };

        try {
            if (isEdit && currentHoliday) {
                await updateHolidayList(currentHoliday.name, holidayData);
                setSnackbar({ open: true, message: 'Holiday list updated successfully', severity: 'success' });
            } else {
                await createHolidayList(holidayData);
                setSnackbar({ open: true, message: 'Holiday list created successfully', severity: 'success' });
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
                    Holidays
                </Typography>

                {permissions.write && canCreateHolidayList && (
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        New Holiday List
                    </Button>
                )}
            </Box>

            <Card>
                <HolidayTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterByName}
                    searchPlaceholder="Search holiday lists..."
                    onDelete={selected.length > 0 ? handleBulkDelete : undefined}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={`${orderBy}_${order}`}
                    onSortChange={handleSortChange}
                    sortOptions={HOLIDAY_SORT_OPTIONS}
                />

                <Scrollbar>
                    <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                        <Table size="medium">
                            <HolidayTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={filteredData.length}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'holiday_list_name', label: 'Holiday List Name' },
                                    { id: 'year', label: 'Year' },
                                    { id: 'month', label: 'Month' },
                                    { id: 'working_days', label: 'Working Days' },
                                    { id: '', label: '' },
                                ]}
                            />
                             <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {filteredData.map((row, index) => (
                                            <HolidayListTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    holiday_list_name: row.holiday_list_name,
                                                    year: row.year,
                                                    month: row.month_year,
                                                    working_days: row.working_days,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleViewRow(row)}
                                                onEdit={() => handleEditRow(row)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                canEdit={permissions.write && canEditHolidayList}
                                                canDelete={permissions.delete && canDeleteHolidayList}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={5}>
                                                    <EmptyContent
                                                        title="No holiday lists found"
                                                        description="You haven't created any holiday lists yet."
                                                        icon="solar:calendar-mark-bold-duotone"
                                                        sx={{ py: 5 }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {!empty && !notFound && (
                                            <TableEmptyRows
                                                height={68}
                                                emptyRows={filteredData.length < 5 ? 5 - filteredData.length : 0}
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
                    page={page}
                    count={total}
                    rowsPerPage={rowsPerPage}
                    onPageChange={handleChangePage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {isEdit ? 'Edit Holiday List' : 'New Holiday List'}
                    <IconButton onClick={handleCloseCreate}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <Box sx={{ display: 'grid', gap: 3, p: 2 }}>
                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <TextField
                                fullWidth
                                label="Holiday List Name"
                                value={holidayListName}
                                onChange={(e) => {
                                    setHolidayListName(e.target.value);
                                    if (formErrors.holidayListName) setFormErrors(prev => ({ ...prev, holidayListName: '' }));
                                }}
                                required
                                error={!!formErrors.holidayListName}
                                helperText={formErrors.holidayListName}
                                placeholder="e.g., Public Holidays 2024"
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                            />

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Year"
                                    views={['year']}
                                    openTo="year"
                                    format="YYYY"
                                    value={year ? dayjs(`${year}-01-01`) : null}
                                    onChange={(newValue) => {
                                        setYear(newValue ? newValue.format('YYYY') : '');
                                        if (formErrors.year) setFormErrors(prev => ({ ...prev, year: '' }));
                                    }}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            required: true,
                                            error: !!formErrors.year,
                                            helperText: formErrors.year,
                                            InputLabelProps: { shrink: true },
                                            sx: { '& .MuiFormLabel-asterisk': { color: 'red' } }
                                        },
                                    }}
                                />
                            </LocalizationProvider>
                        </Box>

                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <TextField
                                select
                                fullWidth
                                label="Month"
                                value={month}
                                onChange={(e) => {
                                    setMonth(e.target.value);
                                    if (formErrors.month) setFormErrors(prev => ({ ...prev, month: '' }));
                                }}
                                InputLabelProps={{ shrink: true }}
                                required
                                error={!!formErrors.month}
                                helperText={formErrors.month}
                                sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                            >
                                <MenuItem value="" disabled>Select Month</MenuItem>
                                {MONTH_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                fullWidth
                                label="Working Days"
                                type="number"
                                value={workingDays}
                                onChange={(e) => setWorkingDays(e.target.value)}
                                placeholder="Number of working days"
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                        </Box>

                        {/* Holidays Child Table */}
                        <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    Holidays
                                    <Typography component="span" variant="body2" sx={{ ml: 2, color: 'primary.main', fontWeight: 600 }}>
                                        Total: {holidays.filter(h => h.is_working_day === 0).length} holiday(s)
                                    </Typography>
                                </Typography>
                            </Box>

                            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Date</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Description</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, textAlign: 'center' }}>Working Day</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, width: 80 }} />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {holidays.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                    No holidays added yet...
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            holidays.map((holiday, index) => (
                                                <TableRow
                                                    key={index}
                                                    sx={{
                                                        '&:nth-of-type(odd)': { bgcolor: 'grey.50' },
                                                        '&:hover': { bgcolor: 'action.hover' }
                                                    }}
                                                >
                                                    <TableCell sx={{ minWidth: 140, py: 1.5 }}>
                                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                            <DatePicker
                                                                value={dayjs(holiday.holiday_date)}
                                                                onChange={(newValue) => handleHolidayChange(index, 'holiday_date', newValue?.format('YYYY-MM-DD'))}
                                                                format="DD-MM-YYYY"
                                                                slotProps={{
                                                                    textField: {
                                                                        size: 'small',
                                                                        variant: 'standard',
                                                                        fullWidth: true,
                                                                        InputProps: {
                                                                            disableUnderline: true,
                                                                        },
                                                                    },
                                                                }}
                                                            />
                                                        </LocalizationProvider>
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1.5 }}>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            variant="standard"
                                                            value={holiday.description}
                                                            onChange={(e) => handleHolidayChange(index, 'description', e.target.value)}
                                                            placeholder="Holiday description"
                                                            InputProps={{
                                                                disableUnderline: true,
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1.5, textAlign: 'center' }}>
                                                        <Android12Switch
                                                            checked={holiday.is_working_day === 1}
                                                            onChange={(e) => handleHolidayChange(index, 'is_working_day', e.target.checked ? 1 : 0)}
                                                        />
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

                <DialogActions sx={{p: 1.5}}>
                    <Button onClick={handleCreate} variant="contained">
                        {isEdit ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            <HolidayDetailsDialog
                open={openView}
                onClose={() => setOpenView(false)}
                holidayList={viewHoliday}
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

            {/* Filter Drawer */}
            <HolidayTableFiltersDrawer
                open={openFilters}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                onResetFilters={handleResetFilters}
                canReset={canReset}
            />
        </DashboardContent>
    );
}
