import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Rating from '@mui/material/Rating';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useInterviews } from 'src/hooks/useInterviews';

import { getDoctypeList } from 'src/api/leads';
import { uploadFile } from 'src/api/data-import';
import { DashboardContent } from 'src/layouts/dashboard';
import { getJobApplicant } from 'src/api/job-applicants';
import {
    getInterview,
    createInterview,
    deleteInterview,
    updateInterview,
    getInterviewPermissions,
    createInterviewType,
} from 'src/api/interviews';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { InterviewTableRow } from 'src/sections/interviews/interview-table-row';
import { LeadTableHead as InterviewTableHead } from 'src/sections/lead/lead-table-head';
import { InterviewDetailsDialog } from 'src/sections/interviews/interview-details-dialog';
import { InterviewTypeCreateDialog } from 'src/sections/interviews/interview-type-create-dialog';
import { LeadTableToolbar as InterviewTableToolbar } from 'src/sections/lead/lead-table-toolbar';

import { useAuth } from 'src/auth/auth-context';

import { InterviewTableFiltersDrawer } from '../interview-table-filters-drawer';

// ----------------------------------------------------------------------

const filterInterviewType = createFilterOptions<any>();



export function InterviewsView() {
    const { user } = useAuth();
    const actionPerms = user?.permissions?.actions?.interview_list;
    const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const canCreateInterview = hasCustomPerms ? !!actionPerms?.create : true;
    const canEditInterview = hasCustomPerms ? !!actionPerms?.edit : true;
    const canDeleteInterview = hasCustomPerms ? !!actionPerms?.delete : true;

    const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('creation_desc');
    const [selected, setSelected] = useState<string[]>([]);

    const [filters, setFilters] = useState<any>({
        status: 'all',
        job_applied: 'all',
        startDate: null,
        endDate: null,
    });

    const [openFilters, setOpenFilters] = useState(false);

    const [orderBy, order] = sortBy.split('_') as [string, 'asc' | 'desc'];

    const { data, total, loading, refetch } = useInterviews(
        page + 1,
        rowsPerPage,
        filterName,
        orderBy,
        order,
        filters
    );

    const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });
    const [applicants, setApplicants] = useState<any[]>([]);
    const [interviewTypes, setInterviewTypes] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [jobOpenings, setJobOpenings] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<string[]>([]);
    const [uploadingResume, setUploadingResume] = useState(false);

    // Dialog states
    const [openCreate, setOpenCreate] = useState(false);
    const [openView, setOpenView] = useState(false);
    const [dialogTab, setDialogTab] = useState(0);
    const [viewInterview, setViewInterview] = useState<any>(null);
    const [editInterview, setEditInterview] = useState<any>(null);

    // Interview Type Create Dialog state
    const [openInterviewTypeCreate, setOpenInterviewTypeCreate] = useState(false);
    const [interviewTypeSearch, setInterviewTypeSearch] = useState('');
    const [activeFeedbackIndex, setActiveFeedbackIndex] = useState<number | null>(null);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState<any>({
        job_applicant: '',
        job_applied: '',
        designation: '',
        email_id: '',
        phone_number: '',
        country: '',
        state: '',
        city: '',
        notes: '',
        cover_letter: '',
        resume_link: '',
        resume_attachment: '',
        currency: 'INR',
        lower_range: '',
        upper_range: '',
        scheduled_on: dayjs().format('YYYY-MM-DD'),
        from_time: '',
        to_time: '',
        interview_summary: '',
        overall_status: 'Scheduled',
        overall_performance: '',
        feedbacks: [],
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
        const fetchData = async () => {
            const perms = await getInterviewPermissions();
            setPermissions(perms);

            const [applicantsList, typesList, usersList, openingsList, currencyList] = await Promise.all([
                getDoctypeList('Job Applicant', ['name', 'applicant_name']),
                getDoctypeList('Interview Type', ['name']),
                getDoctypeList('User', ['name', 'full_name']),
                getDoctypeList('Job Opening', ['name', 'job_title']),
                getDoctypeList('Currency', ['name']),
            ]);
            setApplicants(applicantsList);
            setInterviewTypes(typesList);
            setUsers(usersList);
            setJobOpenings(openingsList);
            setCurrencies(currencyList.map((c: any) => c.name));
        };
        fetchData();
    }, []);

    const handleFilters = useCallback((newFilters: any) => {
        setFilters((prev: any) => ({ ...prev, ...newFilters }));
        setPage(0);
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({
            status: 'all',
            job_applied: 'all',
            startDate: null,
            endDate: null,
        });
    }, []);

    const handleSort = (property: string) => {
        const isAsc = orderBy === property && order === 'asc';
        setSortBy(`${property}_${isAsc ? 'desc' : 'asc'}`);
    };

    const handleSortChange = useCallback((value: string) => {
        setSortBy(value);
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
        setEditInterview(null);
        setDialogTab(0);
        setFormData({
            job_applicant: '',
            job_applied: '',
            designation: '',
            email_id: '',
            phone_number: '',
            country: '',
            state: '',
            city: '',
            notes: '',
            cover_letter: '',
            resume_link: '',
            resume_attachment: '',
            currency: 'INR',
            lower_range: '',
            upper_range: '',
            scheduled_on: dayjs().format('YYYY-MM-DD'),
            from_time: '',
            to_time: '',
            interview_summary: '',
            overall_status: 'Scheduled',
            overall_performance: '',
            feedbacks: [],
        });
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setEditInterview(null);
    };

    const handleEditRow = useCallback(async (row: any) => {
        try {
            const fullData = await getInterview(row.name);
            setEditInterview(fullData);
            setFormData({
                job_applicant: fullData.job_applicant,
                job_applied: fullData.job_applied,
                designation: fullData.designation,
                email_id: fullData.email_id,
                phone_number: fullData.phone_number,
                country: fullData.country || '',
                state: fullData.state || '',
                city: fullData.city || '',
                notes: fullData.notes || '',
                cover_letter: fullData.cover_letter || '',
                resume_link: fullData.resume_link || '',
                resume_attachment: fullData.resume_attachment || '',
                currency: fullData.currency || 'INR',
                lower_range: fullData.lower_range || '',
                upper_range: fullData.upper_range || '',
                scheduled_on: fullData.scheduled_on,
                from_time: fullData.from_time,
                to_time: fullData.to_time,
                interview_summary: fullData.interview_summary || '',
                overall_status: fullData.overall_status,
                overall_performance: fullData.overall_performance,
                feedbacks: (fullData.feedbacks || []).map((fb: any) => ({
                    ...fb,
                    rating: fb.rating != null ? (Number(fb.rating) <= 1 && Number(fb.rating) > 0 ? Math.round(Number(fb.rating) * 5) : Number(fb.rating)) : 0,
                })),
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
            const fullData = await getInterview(row.name);
            setViewInterview(fullData);
            setOpenView(true);
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to load record',
                severity: 'error',
            });
        }
    }, []);

    const handleDeleteRow = useCallback((name: string) => {
        setDeleteTarget(name);
        setConfirmDelete(true);
    }, []);

    const onConfirmDelete = async () => {
        if (!deleteTarget || deleteLoading) return;
        setDeleteLoading(true);
        try {
            await deleteInterview(deleteTarget);
            setSnackbar({ open: true, message: 'Deleted successfully', severity: 'success' });
            setConfirmDelete(false);
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Delete failed', severity: 'error' });
        } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
        }
    };

    const handleBulkDelete = () => {
        setConfirmBulkDelete(true);
    };

    const onConfirmBulkDelete = async () => {
        if (bulkDeleteLoading) return;
        setBulkDeleteLoading(true);
        try {
            await Promise.all(selected.map((name) => deleteInterview(name)));
            setSnackbar({ open: true, message: 'Deleted successfully', severity: 'success' });
            setConfirmBulkDelete(false);
            setSelected([]);
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Bulk delete failed', severity: 'error' });
        } finally {
            setBulkDeleteLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                ...formData,
                scheduled_on: formData.scheduled_on ? dayjs(formData.scheduled_on).format('YYYY-MM-DD') : null,
                feedbacks: (formData.feedbacks || []).map((fb: any) => ({
                    ...fb,
                    rating: fb.rating ? (Number(fb.rating) > 1 ? Number(fb.rating) / 5 : Number(fb.rating)) : 0,
                })),
            };

            if (editInterview) {
                await updateInterview(editInterview.name, payload);
                setSnackbar({ open: true, message: 'Updated successfully', severity: 'success' });
            } else {
                await createInterview(payload);
                setSnackbar({ open: true, message: 'Created successfully', severity: 'success' });
            }
            handleCloseCreate();
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Action failed', severity: 'error' });
        }
    };

    const handleApplicantChange = async (name: string) => {
        setFormData((prev: any) => ({ ...prev, job_applicant: name }));
        if (name) {
            try {
                const applicantData = await getJobApplicant(name);
                setFormData((prev: any) => ({
                    ...prev,
                    job_applied: applicantData.job_opening || applicantData.job_title || '',
                    designation: applicantData.designation || '',
                    email_id: applicantData.email_id || '',
                    phone_number: applicantData.phone_number || '',
                    country: applicantData.country || '',
                    state: applicantData.state || '',
                    city: applicantData.city || '',
                    notes: applicantData.notes || '',
                    cover_letter: applicantData.cover_letter || '',
                    resume_link: applicantData.resume_link || '',
                    resume_attachment: applicantData.resume_attachment || '',
                    currency: applicantData.currency || 'INR',
                    lower_range: applicantData.lower_range || '',
                    upper_range: applicantData.upper_range || '',
                }));
            } catch (error) {
                console.error("Failed to fetch applicant details:", error);
            }
        }
    };

    const handleAddFeedback = () => {
        setFormData({
            ...formData,
            feedbacks: [
                ...formData.feedbacks,
                { interview_type: '', rating: 0, interviewer: '', notes: '' },
            ],
        });
    };

    const handleRemoveFeedback = (index: number) => {
        const newFeedbacks = [...formData.feedbacks];
        newFeedbacks.splice(index, 1);
        setFormData({ ...formData, feedbacks: newFeedbacks });
    };

    const handleFeedbackChange = (index: number, field: string, value: any) => {
        const newFeedbacks = [...formData.feedbacks];
        newFeedbacks[index] = { ...newFeedbacks[index], [field]: value };
        setFormData({ ...formData, feedbacks: newFeedbacks });
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

    const canReset = filters.status !== 'all' || filters.job_applied !== 'all' || !!filters.startDate || !!filters.endDate || !!filterName;

    const notFound = !loading && !data.length && !!filterName;
    const empty = !loading && !data.length && !filterName && !canReset;
    return (
        <DashboardContent maxWidth={false} sx={{mt: 2}}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 5 }}>
                <Typography variant="h4">Interviews</Typography>
                {permissions.write && canCreateInterview && (
                    <Button
                        variant="contained"
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                    >
                        Schedule Interview
                    </Button>
                )}
            </Box>

            <Card>
                <InterviewTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterByName}
                    onDelete={handleBulkDelete}
                    searchPlaceholder="Search by applicant..."
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={sortBy}
                    onSortChange={handleSortChange}
                    sortOptions={[
                        { value: 'creation_desc', label: 'Newest First' },
                        { value: 'creation_asc', label: 'Oldest First' },
                        { value: 'overall_status_asc', label: 'Status: A to Z' },
                        { value: 'overall_status_desc', label: 'Status: Z to A' },
                    ]}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <InterviewTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={total}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'job_applicant', label: 'Job Applicant' },
                                    { id: 'scheduled_on', label: 'Interview Date & Time' },
                                    { id: 'overall_status', label: 'Status' },
                                    { id: '', label: '' },
                                ]}
                            />
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <InterviewTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    job_applicant: row.job_applicant,
                                                    job_applied: row.job_applied,
                                                    designation: row.designation,
                                                    scheduled_on: row.scheduled_on,
                                                    from_time: row.from_time,
                                                    overall_status: row.overall_status,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleViewRow(row)}
                                                onEdit={() => handleEditRow(row)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                canEdit={permissions.write && canEditInterview}
                                                canDelete={permissions.delete && canDeleteInterview}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {!data.length && !loading && !notFound && canReset && (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                                    <Stack spacing={1} alignItems="center">
                                                        <Iconify icon={"eva:slash-outline" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>No interviews found matching your filters</Typography>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={6}>
                                                    <EmptyContent
                                                        title="No interviews scheduled"
                                                        description="Start scheduling interviews for your shortlisted candidates."
                                                        icon="solar:video-library-bold-duotone"
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
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {editInterview ? 'Edit Interview' : 'Schedule Interview'}
                    </Typography>

                    <IconButton
                        onClick={handleCloseCreate}
                        sx={{ color: (theme) => theme.palette.grey[500] }}
                    >
                        <Iconify icon="mingcute:close-line" width={20} />
                    </IconButton>
                </DialogTitle>
                <Tabs
                    value={dialogTab}
                    onChange={(_, val) => setDialogTab(val)}
                    sx={{
                        px: 3,
                        bgcolor: 'background.paper',
                        borderBottom: (t) => `solid 1px ${t.vars.palette.divider}`,
                    }}
                >
                    <Tab label="Applicant Details" />
                    <Tab label="Interview Details" />
                    <Tab label="Performance" />
                </Tabs>
                <DialogContent sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>

                    {/* ── Tab 0: Applicant Details ── */}
                    {dialogTab === 0 && (
                        <Stack spacing={3}>
                            {/* Overall Status */}
                            <TextField
                                select
                                fullWidth
                                label="Overall Status"
                                value={formData.overall_status}
                                InputLabelProps={{ shrink: true }}
                                onChange={(e) => setFormData({ ...formData, overall_status: e.target.value })}
                            >
                                <MenuItem value="Applied">Applied</MenuItem>
                                <MenuItem value="Screening">Screening</MenuItem>
                                <MenuItem value="Shortlisted">Shortlisted</MenuItem>
                                <MenuItem value="Scheduled">Scheduled</MenuItem>
                                <MenuItem value="In Progress">In Progress</MenuItem>
                                <MenuItem value="Completed">Completed</MenuItem>
                                <MenuItem value="No-Show">No-Show</MenuItem>
                                <MenuItem value="Cancelled">Cancelled</MenuItem>
                                <MenuItem value="Rescheduled">Rescheduled</MenuItem>
                                <MenuItem value="Selected">Selected</MenuItem>
                                <MenuItem value="Rejected">Rejected</MenuItem>
                                <MenuItem value="On Hold">On Hold</MenuItem>
                            </TextField>

                            {/* Job Applicant Details Section */}
                            <Divider sx={{ borderStyle: 'dashed' }}>Job Applicant Details</Divider>
                            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                                <Autocomplete
                                    fullWidth
                                    options={applicants}
                                    getOptionLabel={(option) =>
                                        typeof option === 'string'
                                            ? option
                                            : option.applicant_name || option.name
                                    }
                                    isOptionEqualToValue={(option, value) =>
                                        option.name === (typeof value === 'string' ? value : value?.name)
                                    }
                                    value={
                                        applicants.find((a) => a.name === formData.job_applicant) || null
                                    }
                                    onChange={(_, newValue) => {
                                        handleApplicantChange(newValue?.name || '');
                                    }}
                                    renderOption={(props, option) => (
                                        <Box component="li" {...props} key={option.name}>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {option.applicant_name || option.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    {option.name}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Job Applicant"
                                            required
                                            placeholder="Search applicant..."
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    )}
                                />

                                <TextField
                                    select
                                    fullWidth
                                    label="Job Applied"
                                    value={formData.job_applied}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setFormData({ ...formData, job_applied: e.target.value })}
                                >
                                    {jobOpenings.map((opening) => (
                                        <MenuItem key={opening.name} value={opening.name}>
                                            {opening.job_title || opening.name}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    value={formData.email_id}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
                                />

                                <TextField
                                    fullWidth
                                    label="Designation"
                                    value={formData.designation}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                />

                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    value={formData.phone_number}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                />

                                <TextField
                                    fullWidth
                                    label="Country"
                                    value={formData.country}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                />

                                <TextField
                                    fullWidth
                                    label="State"
                                    value={formData.state}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                />

                                <TextField
                                    fullWidth
                                    label="City"
                                    value={formData.city}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />

                                <TextField
                                    fullWidth
                                    label="Notes"
                                    value={formData.notes}
                                    InputLabelProps={{ shrink: true }}
                                    InputProps={{ readOnly: true }}
                                    sx={{ gridColumn: 'span 2' }}
                                />
                            </Box>

                            {/* Resume Section */}
                            <Divider sx={{ borderStyle: 'dashed' }}>Resume</Divider>
                            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                                <TextField
                                    fullWidth
                                    label="Resume Link"
                                    value={formData.resume_link}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setFormData({ ...formData, resume_link: e.target.value })}
                                />

                                {/* Resume Attachment: MUI outlined-field style */}
                                <Box sx={{ position: 'relative' }}>
                                    {/* Floating label — matches MUI outlined TextField legend */}
                                    <Typography
                                        component="label"
                                        variant="caption"
                                        sx={{
                                            position: 'absolute',
                                            top: -9,
                                            left: 10,
                                            px: 0.5,
                                            bgcolor: 'background.paper',
                                            color: 'text.secondary',
                                            fontSize: '0.75rem',
                                            lineHeight: 1,
                                            zIndex: 1,
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        Resume Attachment
                                    </Typography>

                                    <Box
                                        sx={{
                                            border: (theme) => `1px solid ${theme.vars.palette.divider}`,
                                            borderRadius: 1,
                                            px: 1.5,
                                            py: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            minHeight: 56,
                                        }}
                                    >
                                        {formData.resume_attachment ? (
                                            <>
                                                {/* File icon + name */}
                                                <Iconify icon="solar:file-text-bold" width={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
                                                <Typography
                                                    variant="body2"
                                                    noWrap
                                                    sx={{ flex: 1, fontWeight: 500, color: 'text.primary' }}
                                                >
                                                    {formData.resume_attachment.split('/').pop()}
                                                </Typography>

                                                {/* Download */}
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    title="Download"
                                                    href={formData.resume_attachment}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download
                                                    component="a"
                                                >
                                                    <Iconify icon="solar:download-bold" width={18} />
                                                </IconButton>

                                                {/* Remove */}
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    title="Remove"
                                                    onClick={() => setFormData({ ...formData, resume_attachment: '' })}
                                                >
                                                    <Iconify icon={"solar:trash-bin-minimalistic-bold" as any} width={18} />
                                                </IconButton>
                                            </>
                                        ) : (
                                            <>
                                                <Iconify icon={"solar:file-text-linear" as any} width={18} sx={{ color: 'text.disabled', flexShrink: 0 }} />
                                                <Typography variant="body2" sx={{ flex: 1, color: 'text.disabled' }}>
                                                    No file attached
                                                </Typography>
                                            </>
                                        )}

                                        {/* Upload button always visible on the right */}
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            component="label"
                                            disabled={uploadingResume}
                                            startIcon={<Iconify icon={uploadingResume ? 'svg-spinners:ring-resize' : 'solar:upload-minimalistic-bold'} width={14} />}
                                            sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                                        >
                                            {uploadingResume ? 'Uploading...' : 'Upload'}
                                            <input
                                                type="file"
                                                hidden
                                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setUploadingResume(true);
                                                    try {
                                                        const result = await uploadFile(file);
                                                        setFormData((prev: any) => ({ ...prev, resume_attachment: result.file_url }));
                                                    } catch (err: any) {
                                                        setSnackbar({ open: true, message: err.message || 'Upload failed', severity: 'error' });
                                                    } finally {
                                                        setUploadingResume(false);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </Button>
                                    </Box>
                                </Box>

                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="Cover Letter"
                                    value={formData.cover_letter}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
                                    sx={{ gridColumn: 'span 2' }}
                                />
                            </Box>

                            {/* Salary Expectation Section */}
                            <Divider sx={{ borderStyle: 'dashed' }}>Salary Expectation</Divider>
                            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
                                <Autocomplete
                                    fullWidth
                                    options={currencies}
                                    value={formData.currency || null}
                                    onChange={(_, newValue) => setFormData({ ...formData, currency: newValue || '' })}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Currency"
                                            InputLabelProps={{ shrink: true }}
                                            placeholder="Search currency..."
                                        />
                                    )}
                                />

                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Lower Range"
                                    value={formData.lower_range}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setFormData({ ...formData, lower_range: e.target.value })}
                                />

                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Upper Range"
                                    value={formData.upper_range}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setFormData({ ...formData, upper_range: e.target.value })}
                                />
                            </Box>
                        </Stack>
                    )}

                    {/* ── Tab 1: Interview Details ── */}
                    {dialogTab === 1 && (
                        <Stack spacing={3}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                                    <DatePicker
                                        label="Scheduled On"
                                        value={formData.scheduled_on ? dayjs(formData.scheduled_on) : null}
                                        onChange={(newValue) => {
                                            setFormData({ ...formData, scheduled_on: newValue?.isValid() ? newValue.format('YYYY-MM-DD') : '' });
                                        }}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                InputLabelProps: { shrink: true },
                                            },
                                        }}
                                    />

                                    <Box />

                                    <TimePicker
                                        label="From Time"
                                        value={formData.from_time ? dayjs(`2000-01-01T${formData.from_time}`) : null}
                                        onChange={(newValue) => {
                                            setFormData({ ...formData, from_time: newValue?.isValid() ? newValue.format('HH:mm:ss') : '' });
                                        }}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                InputLabelProps: { shrink: true },
                                            },
                                        }}
                                    />

                                    <TimePicker
                                        label="To Time"
                                        value={formData.to_time ? dayjs(`2000-01-01T${formData.to_time}`) : null}
                                        onChange={(newValue) => {
                                            setFormData({ ...formData, to_time: newValue?.isValid() ? newValue.format('HH:mm:ss') : '' });
                                        }}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                InputLabelProps: { shrink: true },
                                            },
                                        }}
                                    />
                                </Box>
                            </LocalizationProvider>

                            <Divider sx={{ borderStyle: 'dashed' }}>Interview Summary</Divider>
                            <TextField
                                fullWidth
                                multiline
                                rows={5}
                                label="Interview Summary"
                                value={formData.interview_summary}
                                InputLabelProps={{ shrink: true }}
                                onChange={(e) => setFormData({ ...formData, interview_summary: e.target.value })}
                            />
                        </Stack>
                    )}

                    {/* ── Tab 2: Performance ── */}
                    {dialogTab === 2 && (
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Overall Performance"
                                value={formData.overall_performance}
                                onChange={(e) => setFormData({ ...formData, overall_performance: e.target.value })}
                            />

                            <Divider sx={{ borderStyle: 'dashed' }}>Feedbacks</Divider>

                            {formData.feedbacks.map((fb: any, index: number) => (
                                <Box
                                    key={index}
                                    sx={{
                                        border: (theme) => `1px dashed ${theme.vars.palette.divider}`,
                                        borderRadius: 1.5,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Card header row with delete */}
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        sx={{
                                            px: 2,
                                            py: 1,
                                            bgcolor: 'background.neutral',
                                            borderBottom: (t) => `1px dashed ${t.vars.palette.divider}`,
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                                            Feedback #{index + 1}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemoveFeedback(index)}
                                        >
                                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                                        </IconButton>
                                    </Stack>

                                    {/* Card body */}
                                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, p: 2 }}>
                                        <Autocomplete
                                            fullWidth
                                            options={interviewTypes}
                                            value={fb.interview_type || ''}
                                            onChange={(event, newValue: any) => {
                                                if (newValue?.isNew || newValue === 'Create Interview Type' || newValue?.name === 'Create Interview Type') {
                                                    setActiveFeedbackIndex(index);
                                                    setInterviewTypeSearch(newValue?.inputValue || '');
                                                    setOpenInterviewTypeCreate(true);
                                                } else {
                                                    const value = typeof newValue === 'object' && newValue?.name ? newValue.name : newValue;
                                                    handleFeedbackChange(index, 'interview_type', value || '');
                                                }
                                            }}
                                            filterOptions={(currentOptions, params) => {
                                                const filtered = filterInterviewType(currentOptions, params);
                                                const { inputValue } = params;
                                                const hasCreateOption = filtered.some((option: any) =>
                                                    (typeof option === 'string' ? option : option.name) === 'Create Interview Type' || option.isNew
                                                );
                                                if (!hasCreateOption) {
                                                    filtered.push({
                                                        inputValue: inputValue || '',
                                                        name: 'Create Interview Type',
                                                        isNew: true,
                                                    });
                                                }
                                                return filtered;
                                            }}
                                            renderOption={(props, option: any) => (
                                                <Box
                                                    component="li"
                                                    {...props}
                                                    key={typeof option === 'string' ? option : option.name}
                                                    sx={{
                                                        typography: 'body2',
                                                        ...(option.isNew && {
                                                            color: 'primary.main',
                                                            fontWeight: 600,
                                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                                            mt: 0.5,
                                                            py: 1.5,
                                                            minHeight: '48px',
                                                            '&:hover': {
                                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                                            }
                                                        })
                                                    }}
                                                >
                                                    {option.isNew ? (
                                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                                            <Iconify icon={"solar:add-circle-bold" as any} width={24} />
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Create Interview Type</Typography>
                                                        </Stack>
                                                    ) : (
                                                        typeof option === 'string' ? option : option.name
                                                    )}
                                                </Box>
                                            )}
                                            getOptionLabel={(option: any) => {
                                                if (typeof option === 'string') return option;
                                                if (option?.name) return option.name;
                                                return '';
                                            }}
                                            isOptionEqualToValue={(option: any, value: any) => {
                                                const optionValue = typeof option === 'string' ? option : option?.name;
                                                const compareValue = typeof value === 'string' ? value : value?.name;
                                                return optionValue === compareValue;
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Interview Type"
                                                    InputLabelProps={{ shrink: true }}
                                                />
                                            )}
                                        />

                                        <Autocomplete
                                            fullWidth
                                            options={users}
                                            getOptionLabel={(option) =>
                                                typeof option === 'string'
                                                    ? option
                                                    : option.full_name || option.name
                                            }
                                            isOptionEqualToValue={(option, value) =>
                                                option.name === (typeof value === 'string' ? value : value?.name)
                                            }
                                            value={users.find((u) => u.name === fb.interviewer) || null}
                                            onChange={(_, val) => handleFeedbackChange(index, 'interviewer', val?.name || '')}
                                            renderOption={(props, option) => (
                                                <Box component="li" {...props} key={option.name}>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {option.full_name || option.name}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                            {option.name}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Interviewer"
                                                    InputLabelProps={{ shrink: true }}
                                                />
                                            )}
                                        />

                                        <Box sx={{ gridColumn: 'span 2' }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>Rating</Typography>
                                            <Rating
                                                name={`rating-${index}`}
                                                value={fb.rating}
                                                onChange={(event, newValue) => handleFeedbackChange(index, 'rating', newValue)}
                                            />
                                        </Box>

                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={2}
                                            label="Notes"
                                            InputLabelProps={{ shrink: true }}
                                            value={fb.notes}
                                            onChange={(e) => handleFeedbackChange(index, 'notes', e.target.value)}
                                            sx={{ gridColumn: 'span 2' }}
                                        />
                                    </Box>
                                </Box>
                            ))}
                            <Button
                                variant="outlined"
                                startIcon={<Iconify icon="mingcute:add-line" />}
                                onClick={handleAddFeedback}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Add Feedback
                            </Button>
                        </Stack>
                    )}

                </DialogContent>
                <DialogActions sx={{ p: 1.5 }}>
                    <Button variant="contained" onClick={handleSubmit}>
                        {editInterview ? 'Update' : 'Schedule'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            <InterviewDetailsDialog
                open={openView}
                onClose={() => setOpenView(false)}
                interview={viewInterview}
            />

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                title="Delete Interview"
                content="Are you sure you want to delete this interview?"
                isLoading={deleteLoading}
                action={
                    <Button variant="contained" color="error" onClick={onConfirmDelete} disabled={deleteLoading}>
                        Delete
                    </Button>
                }
            />

            {/* Confirm Bulk Delete Dialog */}
            <ConfirmDialog
                open={confirmBulkDelete}
                onClose={() => setConfirmBulkDelete(false)}
                title="Delete Interviews"
                content={`Are you sure you want to delete ${selected.length} selected interviews?`}
                isLoading={bulkDeleteLoading}
                action={
                    <Button variant="contained" color="error" onClick={onConfirmBulkDelete} disabled={bulkDeleteLoading}>
                        Delete
                    </Button>
                }
            />

            <InterviewTypeCreateDialog
                open={openInterviewTypeCreate}
                onClose={() => setOpenInterviewTypeCreate(false)}
                currentTypeName={interviewTypeSearch}
                onCreate={(newType: string) => {
                    setInterviewTypes((prev) => [...prev, { name: newType }]);
                    if (activeFeedbackIndex !== null) {
                        handleFeedbackChange(activeFeedbackIndex, 'interview_type', newType);
                    }
                    setSnackbar({ open: true, message: 'Interview Type created successfully', severity: 'success' });
                }}
            />

            <InterviewTableFiltersDrawer
                open={openFilters}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                jobOpenings={jobOpenings}
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
        </DashboardContent>
    );
}
