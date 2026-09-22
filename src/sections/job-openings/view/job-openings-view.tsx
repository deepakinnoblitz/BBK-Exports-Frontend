import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useJobOpenings } from 'src/hooks/useJobOpenings';

import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import {
    getJobOpening,
    createJobOpening,
    updateJobOpening,
    deleteJobOpening,
    getJobOpeningPermissions,
    getJobLocations,
} from 'src/api/job-openings';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { JobOpeningTableRow } from 'src/sections/job-openings/job-opening-table-row';
import { LeadTableHead as JobOpeningTableHead } from 'src/sections/lead/lead-table-head';
import { DesignationCreateDialog } from 'src/sections/job-openings/designation-create-dialog';
import { LeadTableToolbar as JobOpeningTableToolbar } from 'src/sections/lead/lead-table-toolbar';
import { JobOpeningDetailsDialog } from 'src/sections/report/job-openings/job-opening-details-dialog';
import { JobOpeningsTableFiltersDrawer } from 'src/sections/job-openings/job-openings-table-filters-drawer';

// ----------------------------------------------------------------------

const filter = createFilterOptions<any>();

import { useAuth } from 'src/auth/auth-context';

export function JobOpeningsView() {
    const { user } = useAuth();
    const actionPerms = user?.permissions?.actions?.job_opening_list;
    const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const canCreateJobOpening = hasCustomPerms ? !!actionPerms?.create : true;
    const canEditJobOpening = hasCustomPerms ? !!actionPerms?.edit : true;
    const canDeleteJobOpening = hasCustomPerms ? !!actionPerms?.delete : true;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [selected, setSelected] = useState<string[]>([]);
    const [openFilters, setOpenFilters] = useState(false);
    const [locations, setLocations] = useState<string[]>([]);
    const [filters, setFilters] = useState({
        status: 'all',
        location: 'all',
        startDate: null as string | null,
        endDate: null as string | null
    });

    const { data, total, loading, refetch } = useJobOpenings(
        page + 1,
        rowsPerPage,
        filterName,
        orderBy,
        order,
        filters
    );

    const empty = !loading && !data.length && !filterName;

    const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });

    // Dialog states
    const [openCreate, setOpenCreate] = useState(false);
    const [openView, setOpenView] = useState(false);
    const [viewJob, setViewJob] = useState<any>(null);
    const [editJob, setEditJob] = useState<any>(null);

    const [designations, setDesignations] = useState<any[]>([]);
    const [openDesignationCreate, setOpenDesignationCreate] = useState(false);

    // Form state
    const [formData, setFormData] = useState<any>({
        job_title: '',
        designation: '',
        shift: 'General Shift',
        location: '',
        experience: '',
        status: 'Open',
        closes_on: '',
        description: '',
        small_description: '',
        skills_required: '',
    });

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

    useEffect(() => {
        const fetchPermissions = async () => {
            const perms = await getJobOpeningPermissions();
            setPermissions(perms);
        };
        const fetchLocations = async () => {
            const locs = await getJobLocations();
            setLocations(locs);
        };
        const fetchDesignations = async () => {
            const dests = await getDoctypeList('Designation', ['name']);
            setDesignations(dests);
        };
        fetchPermissions();
        fetchLocations();
        fetchDesignations();
    }, []);

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

    const handleOpenCreate = () => {
        setEditJob(null);
        setFormData({
            job_title: '',
            designation: '',
            shift: 'General Shift',
            location: '',
            experience: '',
            status: 'Open',
            closes_on: '',
            description: '',
            small_description: '',
            skills_required: '',
        });
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setEditJob(null);
    };

    const handleEditRow = useCallback(async (row: any) => {
        try {
            const fullData = await getJobOpening(row.name);
            setEditJob(fullData);
            setFormData({
                job_title: fullData.job_title,
                designation: fullData.designation,
                shift: fullData.shift,
                location: fullData.location,
                experience: fullData.experience,
                status: fullData.status,
                closes_on: fullData.closes_on,
                description: fullData.description,
                small_description: fullData.small_description,
                skills_required: fullData.skills_required,
            });
            setOpenCreate(true);
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to load record',
                severity: 'error',
            });
        }
    }, []);

    const handleViewRow = useCallback(async (row: any) => {
        try {
            const fullData = await getJobOpening(row.name);
            setViewJob(fullData);
            setOpenView(true);
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to load record',
                severity: 'error',
            });
        }
    }, []);

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selected.map((name) => deleteJobOpening(name)));
            setSnackbar({ open: true, message: 'Deleted successfully', severity: 'success' });
            setSelected([]);
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Bulk delete failed', severity: 'error' });
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            if (editJob) {
                await updateJobOpening(editJob.name, formData);
                setSnackbar({ open: true, message: 'Updated successfully', severity: 'success' });
            } else {
                await createJobOpening(formData);
                setSnackbar({ open: true, message: 'Created successfully', severity: 'success' });
            }
            handleCloseCreate();
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Action failed', severity: 'error' });
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

    const handleFilters = (newFilters: Partial<typeof filters>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            status: 'all',
            location: 'all',
            startDate: null,
            endDate: null
        });
        setPage(0);
    };

    const canReset = filters.status !== 'all' || filters.location !== 'all' || filters.startDate !== null || filters.endDate !== null || !!filterName;

    const handleSortChange = (value: string) => {
        if (value === 'date_desc') { setOrderBy('modified'); setOrder('desc'); }
        else if (value === 'date_asc') { setOrderBy('modified'); setOrder('asc'); }
        else if (value === 'title_asc') { setOrderBy('job_title'); setOrder('asc'); }
        else if (value === 'title_desc') { setOrderBy('job_title'); setOrder('desc'); }
        else if (value === 'location_asc') { setOrderBy('location'); setOrder('asc'); }
        else if (value === 'location_desc') { setOrderBy('location'); setOrder('desc'); }
        setPage(0);
    };

    const getCurrentSortValue = () => {
        if (orderBy === 'modified') return order === 'desc' ? 'date_desc' : 'date_asc';
        if (orderBy === 'job_title') return order === 'desc' ? 'title_desc' : 'title_asc';
        if (orderBy === 'location') return order === 'desc' ? 'location_desc' : 'location_asc';
        return 'date_desc';
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const notFound = !loading && !data.length && !!filterName;

    const [errors, setErrors] = useState({
    job_title: '',
    designation: '',
    location: '',
    experience: '',
    });

    const validateForm = () => {
        const newErrors = {
            job_title: '',
            designation: '',
            location: '',
            experience: '',
        };

        let valid = true;

        if (!formData.job_title?.trim()) {
            newErrors.job_title = 'Job Title is required';
            valid = false;
        }

        if (!formData.designation?.trim()) {
            newErrors.designation = 'Designation is required';
            valid = false;
        }

        if (!formData.location?.trim()) {
            newErrors.location = 'Location is required';
            valid = false;
        }

        if (!formData.experience?.trim()) {
            newErrors.experience = 'Experience is required';
            valid = false;
        }

        setErrors(newErrors);

        return valid;
    };

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteJobName, setDeleteJobName] = useState<string | null>(null);

    const handleDeleteRow = useCallback((name: string) => {
            setDeleteJobName(name);
            setConfirmDelete(true);
        }, []);

        const handleConfirmDelete = async () => {
        if (!deleteJobName) return;

        try {
            await deleteJobOpening(deleteJobName);

            setSnackbar({
                open: true,
                message: 'Job Opening deleted successfully',
                severity: 'success',
            });

            refetch();
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Delete failed',
                severity: 'error',
            });
        } finally {
            setConfirmDelete(false);
            setDeleteJobName(null);
        }
    };

    return (
        <DashboardContent maxWidth={false} sx={{mt: 2}}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 5 }}>
                <Typography variant="h4">Job Openings</Typography>
                {permissions.write && canCreateJobOpening && (
                    <Button
                        variant="contained"
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                    >
                        New Job Opening
                    </Button>
                )}
            </Box>

            <Card>
                <JobOpeningTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterByName}
                    searchPlaceholder="Search job openings..."
                    onDelete={selected.length > 0 ? handleBulkDelete : undefined}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={getCurrentSortValue()}
                    onSortChange={handleSortChange}
                    sortOptions={[
                        { value: 'date_desc', label: 'Newest First' },
                        { value: 'date_asc', label: 'Oldest First' },
                        { value: 'title_asc', label: 'Job Title: A to Z' },
                        { value: 'title_desc', label: 'Job Title: Z to A' },
                        { value: 'location_asc', label: 'Location: A to Z' },
                        { value: 'location_desc', label: 'Location: Z to A' },
                    ]}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <JobOpeningTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={data.length}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'job_title', label: 'Job Title' },
                                    { id: 'location', label: 'Location' },
                                    { id: 'posted_on', label: 'Posted Date' },
                                    { id: 'status', label: 'Status' },
                                    { id: '', label: '' },
                                ]}
                            />
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <JobOpeningTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    job_title: row.job_title,
                                                    designation: row.designation,
                                                    posted_on: row.posted_on,
                                                    status: row.status,
                                                    location: row.location,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleViewRow(row)}
                                                onEdit={() => handleEditRow(row)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                canEdit={permissions.write && canEditJobOpening}
                                                canDelete={permissions.delete && canDeleteJobOpening}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={6}>
                                                    <EmptyContent
                                                        title="No job openings"
                                                        description="Create your first job opening to start hiring."
                                                        icon="solar:case-round-minimalistic-bold-duotone"
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

            {/* Create/Edit Dialog */}
            <Dialog
                open={openCreate}
                onClose={handleCloseCreate}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: (themeVar) => themeVar.customShadows.z24,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                        {editJob ? 'Edit Job Opening' : 'New Job Opening'}
                    </Typography>

                    <IconButton
                        onClick={handleCloseCreate}
                        sx={{ color: (theme) => theme.palette.grey[500] }}
                    >
                        <Iconify icon="mingcute:close-line" width={20} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Stack spacing={3} sx={{ mt: 3.5 }}>
                            <TextField
                                fullWidth
                                label="Job Title"
                                required
                                value={formData.job_title}
                                onChange={(e) => {
                                    setFormData({ ...formData, job_title: e.target.value });

                                    if (errors.job_title) {
                                    setErrors({ ...errors, job_title: '' });
                                    }
                                }}
                                error={!!errors.job_title}
                                helperText={errors.job_title}
                            />
                            <Autocomplete
                                fullWidth
                                options={designations}
                                value={formData.designation || ''}
                                onChange={(event, newValue: any) => {
                                    if (
                                        newValue?.isNew ||
                                        newValue === 'Create Designation' ||
                                        newValue?.name === 'Create Designation'
                                    ) {
                                        setOpenDesignationCreate(true);
                                        return;
                                    }

                                    const value =
                                        typeof newValue === 'object'
                                            ? newValue?.name || ''
                                            : newValue || '';

                                    setFormData((prev: any) => ({
                                        ...prev,
                                        designation: value,
                                    }));

                                    if (value.trim()) {
                                        setErrors((prev) => ({
                                            ...prev,
                                            designation: '',
                                        }));
                                    }
                                }}
                                filterOptions={(options, params) => {
                                    const filtered = filter(options, params);
                                    const { inputValue } = params;
                                    const hasCreateOption = filtered.some((option: any) =>
                                        (typeof option === 'string' ? option : option.name) === 'Create Designation' || option.isNew
                                    );
                                    if (!hasCreateOption && inputValue) {
                                        filtered.push({
                                            inputValue,
                                            name: 'Create Designation',
                                            isNew: true,
                                        });
                                    }
                                    return filtered;
                                }}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props} sx={{
                                        typography: 'body2',
                                        ...(option.isNew && {
                                            color: 'primary.main',
                                            fontWeight: 600,
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                            mt: 0.5,
                                            py: 3, minHeight: '56px',
                                            '&:hover': {
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                            }
                                        })
                                    }}>
                                        {option.isNew ? (
                                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                                <Iconify icon="solar:add-circle-bold" width={24} />
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Create Designation</Typography>
                                            </Stack>
                                        ) : (
                                            typeof option === 'string' ? option : option.name
                                        )}
                                    </Box>
                                )}
                                getOptionLabel={(option) => {
                                    if (typeof option === 'string') return option;
                                    if (option?.name) return option.name;
                                    return '';
                                }}
                                isOptionEqualToValue={(option, value) => {
                                    const optionValue = typeof option === 'string' ? option : option?.name;
                                    return optionValue === value;
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Designation"
                                        required
                                        placeholder="Manager, Developer, etc."
                                        InputLabelProps={{ shrink: true }}
                                        error={!!errors.designation}
                                        helperText={errors.designation}
                                    />
                                )}
                                freeSolo
                                selectOnFocus
                                clearOnBlur
                                handleHomeEndKeys
                            />
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Shift"
                                    value={formData.shift}
                                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                                >
                                    <MenuItem value="General Shift">General Shift</MenuItem>
                                    <MenuItem value="Night Shift">Night Shift</MenuItem>
                                    <MenuItem value="WFH">WFH</MenuItem>
                                </TextField>
                                <TextField
                                    select
                                    fullWidth
                                    label="Status"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <MenuItem value="Open">Open</MenuItem>
                                    <MenuItem value="Closed">Closed</MenuItem>
                                </TextField>
                            </Stack>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    fullWidth
                                    label="Location"
                                    required
                                    value={formData.location}
                                    onChange={(e) => {
                                        setFormData({ ...formData, location: e.target.value });

                                        if (errors.location) {
                                        setErrors({ ...errors, location: '' });
                                        }
                                    }}
                                    error={!!errors.location}
                                    helperText={errors.location}
                                />
                                <TextField
                                    fullWidth
                                    label="Experience"
                                    required
                                    value={formData.experience}
                                    onChange={(e) => {
                                        setFormData({ ...formData, experience: e.target.value });

                                        if (errors.experience) {
                                        setErrors({ ...errors, experience: '' });
                                        }
                                    }}
                                    error={!!errors.experience}
                                    helperText={errors.experience}
                                    placeholder="2-4 Years"
                                />
                            </Stack>
                            <DatePicker
                                label="Closes On"
                                value={formData.closes_on ? dayjs(formData.closes_on) : null}
                                onChange={(newValue) => setFormData({ ...formData, closes_on: newValue?.format('YYYY-MM-DD') || '' })}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        InputLabelProps: { shrink: true },
                                    },
                                }}
                            />
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Skills Required"
                                value={formData.skills_required}
                                onChange={(e) => setFormData({ ...formData, skills_required: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Small Description"
                                value={formData.small_description}
                                onChange={(e) => setFormData({ ...formData, small_description: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Stack>
                    </LocalizationProvider>
                </DialogContent>
                <DialogActions sx={{ p: 1.5 }}>
                    <Button variant="contained" onClick={handleSubmit}>
                        {editJob ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            <JobOpeningDetailsDialog
                open={openView}
                onClose={() => setOpenView(false)}
                job={viewJob}
            />

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={confirmDelete}
                onClose={() => {
                    setConfirmDelete(false);
                    setDeleteJobName(null);
                }}
                title="Delete Job Opening"
                content="Are you sure you want to delete this Job Opening?"
                action={
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDelete}
                    >
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

            {/* Filters Drawer */}
            <JobOpeningsTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                locations={locations}
            />

            <DesignationCreateDialog
                open={openDesignationCreate}
                onClose={() => setOpenDesignationCreate(false)}
                onCreate={(name) => {
                    setDesignations((prev) => [...prev, { name }]);
                    setFormData((prev: any) => ({ ...prev, designation: name }));
                }}
            />
        </DashboardContent>
    );
}
