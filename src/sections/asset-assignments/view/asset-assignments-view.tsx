import dayjs from 'dayjs';
import { FaUser } from "react-icons/fa";
import { GoHash } from "react-icons/go";
import { BsLaptop } from "react-icons/bs";
import { IoMdReturnLeft } from "react-icons/io";
import { MdOutlineAssignmentTurnedIn } from "react-icons/md";
import { useState, useCallback, useEffect, useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useAssetAssignments } from 'src/hooks/useAssetAssignments';

import { frappeRequest } from 'src/utils/csrf';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    getEmployees,
    getAvailableAssets,
    deleteAssetAssignment,
    createAssetAssignment,
    updateAssetAssignment,
    getAssetAssignmentPermissions,
} from 'src/api/asset-assignments';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { LeadTableHead as AssetAssignmentTableHead } from 'src/sections/lead/lead-table-head';
import { AssetAssignmentTableRow } from 'src/sections/asset-assignments/asset-assignments-table-row';
import { LeadTableToolbar as AssetAssignmentTableToolbar } from 'src/sections/lead/lead-table-toolbar';
// import { AssetAssignmentTableRow } from 'src/sections/asset-assignments/asset-assignments-table-row';
import { AssetAssignmentImportDialog } from 'src/sections/asset-assignments/asset-assignment-import-dialog';
import { AssetAssignmentsTableFiltersDrawer } from 'src/sections/asset-assignments/asset-assignments-table-filters-drawer';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

export function AssetAssignmentsView() {
    const theme = useTheme();

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.asset_assignments;
    const actionPerms = user?.permissions?.actions?.asset_assignments;
    const canCreateAssignment = hasCustomPerms && actionPerms ? !!actionPerms?.create : true;
    const canEditAssignment = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const canDeleteAssignment = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;
    const canImportAssignment = hasCustomPerms && actionPerms ? !!actionPerms?.import : true;

    const isHR = user?.roles?.some((role: string) =>
        ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
    );
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [selected, setSelected] = useState<string[]>([]);

    const [filters, setFilters] = useState<{
        employee: string;
        status: string;
        startDate: string | null;
        endDate: string | null;
    }>({
        employee: 'all',
        status: 'all',
        startDate: null,
        endDate: null
    });

    const [openFilters, setOpenFilters] = useState(false);
    const canReset = filters.employee !== 'all' || filters.status !== 'all' || filters.startDate !== null || filters.endDate !== null || !!filterName;

    const effectiveFilters = useMemo(() => ({
        ...filters,
        employee: isHR ? filters.employee : (user?.employee || 'all'),
    }), [filters, isHR, user]);

    const { data, total, loading, refetch } = useAssetAssignments(page + 1, rowsPerPage, filterName, orderBy, order, effectiveFilters);

    const [openCreate, setOpenCreate] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentAssignment, setCurrentAssignment] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [openImport, setOpenImport] = useState(false);

    // View state
    const [openView, setOpenView] = useState(false);
    const [viewAssignment, setViewAssignment] = useState<any>(null);

    // Form state
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [assignedOn, setAssignedOn] = useState('');
    const [returnedOn, setReturnedOn] = useState('');
    const [remarks, setRemarks] = useState('');
    const [touched, setTouched] = useState(false);

    // Dropdown options
    const [assets, setAssets] = useState<Array<{ name: string; asset_name: string }>>([]);
    const [employees, setEmployees] = useState<Array<{ name: string; employee_name: string }>>([]);

    // Permissions
    const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });

    // Snackbar
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Load permissions and dropdown data
    useEffect(() => {
        getAssetAssignmentPermissions().then(setPermissions);
        getAvailableAssets().then(setAssets);
        getEmployees().then(setEmployees);
    }, []);

    const handleFilters = (newFilters: Partial<typeof filters>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            employee: 'all',
            status: 'all',
            startDate: null,
            endDate: null
        });
        setPage(0);
    };

    const handleSortChange = (value: string) => {
        if (value === 'date_desc') { setOrderBy('modified'); setOrder('desc'); }
        else if (value === 'date_asc') { setOrderBy('modified'); setOrder('asc'); }
        else if (value === 'employee_asc') { setOrderBy('employee_name'); setOrder('asc'); }
        else if (value === 'employee_desc') { setOrderBy('employee_name'); setOrder('desc'); }
        else if (value === 'asset_asc') { setOrderBy('asset_name'); setOrder('asc'); }
        else if (value === 'asset_desc') { setOrderBy('asset_name'); setOrder('desc'); }
        setPage(0);
    };

    const getCurrentSortValue = () => {
        if (orderBy === 'modified') return order === 'desc' ? 'date_desc' : 'date_asc';
        if (orderBy === 'employee_name') return order === 'desc' ? 'employee_desc' : 'employee_asc';
        if (orderBy === 'asset_name') return order === 'desc' ? 'asset_desc' : 'asset_asc';
        return 'date_desc';
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
            await Promise.all(selected.map((name) => deleteAssetAssignment(name)));
            setSnackbar({ open: true, message: `${selected.length} assignment(s) deleted successfully`, severity: 'success' });
            setSelected([]);
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to delete assignments', severity: 'error' });
        }
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setCurrentAssignment(null);
        setSelectedAsset(null);
        setSelectedEmployee(null);
        setAssignedOn('');
        setReturnedOn('');
        setRemarks('');
        setTouched(false);
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setIsEdit(false);
        setCurrentAssignment(null);
        setSelectedAsset(null);
        setSelectedEmployee(null);
        setAssignedOn('');
        setReturnedOn('');
        setRemarks('');
        setTouched(false);
    };

    const handleEditRow = useCallback((row: any) => {
        setCurrentAssignment(row);
        setSelectedAsset(assets.find(a => a.name === row.asset) || { name: row.asset, asset_name: row.asset_name });
        setSelectedEmployee(employees.find(e => e.name === row.assigned_to) || null);
        setAssignedOn(row.assigned_on || '');
        setReturnedOn(row.returned_on || '');
        setRemarks(row.remarks || '');
        setTouched(false);
        setIsEdit(true);
        setOpenCreate(true);
    }, [assets, employees]);

    const handleViewRow = useCallback((row: any) => {
        setViewAssignment(row);
        setOpenView(true);
    }, []);

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteAssetAssignment(confirmDelete.id);
            setSnackbar({ open: true, message: 'Assignment deleted successfully', severity: 'success' });
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to delete assignment', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setTouched(true);

        if (!selectedAsset || !selectedEmployee || !assignedOn) {
            const errs: string[] = [];
            if (!selectedAsset) errs.push('asset');
            if (!selectedEmployee) errs.push('employee');
            if (!assignedOn) errs.push('assignedOn');

            if (errs.length > 1) {
                setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
            } else if (errs[0] === 'asset') {
                setSnackbar({ open: true, message: 'Asset is required', severity: 'error' });
            } else if (errs[0] === 'employee') {
                setSnackbar({ open: true, message: 'Employee is required', severity: 'error' });
            } else {
                setSnackbar({ open: true, message: 'Assignment date is required', severity: 'error' });
            }
            return;
        }

        // Pre-validation: Check if asset is already assigned
        try {
            const checkUrl = `/api/method/company.company.frontend_api.check_asset_availability?asset=${selectedAsset.name}${isEdit && currentAssignment ? `&name=${currentAssignment.name}` : ''}`;
            const checkRes = await frappeRequest(checkUrl);
            const checkData = await checkRes.json();

            if (checkData.message && checkData.message.is_assigned) {
                setSnackbar({
                    open: true,
                    message: `Asset Already Assigned: ${checkData.message.employee_name} (${checkData.message.assigned_to}) currently has this asset.`,
                    severity: 'error'
                });
                return;
            }
        } catch (error) {
            console.error('Pre-validation failed:', error);
        }

        const assignmentData = {
            asset: selectedAsset.name,
            assigned_to: selectedEmployee.name,
            assigned_on: assignedOn,
            returned_on: returnedOn || '',
            remarks: remarks.trim(),
        };

        try {
            if (isEdit && currentAssignment) {
                await updateAssetAssignment(currentAssignment.name, assignmentData);
                setSnackbar({ open: true, message: 'Assignment updated successfully', severity: 'success' });
            } else {
                await createAssetAssignment(assignmentData);
                setSnackbar({ open: true, message: 'Assignment created successfully', severity: 'success' });
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
                    {isHR ? 'Asset Assignments' : 'My Assets'}
                </Typography>

                {(permissions.write && (canCreateAssignment || canImportAssignment)) && (
                    <Stack direction="row" spacing={1}>
                        {canImportAssignment && (
                            <Button
                                variant="outlined"
                                startIcon={<Iconify icon="solar:import-bold-duotone" />}
                                onClick={() => setOpenImport(true)}
                            >
                                Import
                            </Button>
                        )}
                        {canCreateAssignment && (
                            <Button
                                variant="contained"
                                startIcon={<Iconify icon="mingcute:add-line" />}
                                onClick={handleOpenCreate}
                                sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                            >
                                New Assignment
                            </Button>
                        )}
                    </Stack>
                )}
            </Box>

            <Card>
                <AssetAssignmentTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterByName}
                    searchPlaceholder={isHR ? "Search assignments..." : "Search my assets..."}
                    onDelete={selected.length > 0 ? handleBulkDelete : undefined}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={getCurrentSortValue()}
                    onSortChange={handleSortChange}
                    sortOptions={[
                        { value: 'date_desc', label: 'Newest First' },
                        { value: 'date_asc', label: 'Oldest First' },
                        ...(isHR ? [
                            { value: 'employee_asc', label: 'Employee: A to Z' },
                            { value: 'employee_desc', label: 'Employee: Z to A' },
                        ] : []),
                        { value: 'asset_asc', label: 'Asset: A to Z' },
                        { value: 'asset_desc', label: 'Asset: Z to A' },
                    ]}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: { xs: 300, md: 800 } }}>
                            <AssetAssignmentTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={data.length}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'asset_name', label: 'Asset' },
                                    ...(isHR ? [{ id: 'employee_name', label: 'Employee' }] : []),
                                    { id: 'assigned_on', label: 'Assigned On', sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'returned_on', label: 'Returned On', sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: '', label: '' },
                                ]}
                            />
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={isHR ? 6 : 5} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <AssetAssignmentTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    asset_name: row.asset_name,
                                                    employee_name: row.employee_name,
                                                    assigned_to: row.assigned_to,
                                                    assigned_on: row.assigned_on,
                                                    returned_on: row.returned_on,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleViewRow(row)}
                                                onEdit={() => handleEditRow(row)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                canEdit={permissions.write && canEditAssignment}
                                                canDelete={permissions.delete && canDeleteAssignment}
                                                isHR={isHR}
                                            />
                                        ))}

                                        {!empty && !notFound && (
                                            <TableEmptyRows height={68} emptyRows={data.length < 5 ? 5 - data.length : 0} />
                                        )}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={isHR ? 6 : 5}>
                                                    <EmptyContent
                                                        title={isHR ? "No assignments found" : "No assets assigned"}
                                                        description={isHR ? "You haven't created any asset assignments yet. Click 'New Assignment' to get started." : "You haven't been assigned any assets yet."}
                                                        icon={isHR ? "solar:clipboard-list-bold-duotone" : "solar:laptop-bold-duotone"}
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
                    page={page}
                    count={total}
                    rowsPerPage={rowsPerPage}
                    onPageChange={handleChangePage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Card>

            <AssetAssignmentsTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                isHR={isHR}
            />

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
                <form onSubmit={handleCreate} noValidate style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
                        {isEdit ? 'Edit Assignment' : 'New Assignment'}
                        <IconButton onClick={handleCloseCreate} sx={{ color: (t) => t.palette.grey[500] }}>
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent dividers sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        <Box sx={{ display: 'grid', gap: 3, margin: '1rem', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <Autocomplete
                                fullWidth
                                options={assets}
                                getOptionLabel={(option) => `${option.asset_name} (${option.name})`}
                                value={selectedAsset}
                                onChange={(event, newValue) => setSelectedAsset(newValue)}
                                renderOption={(props, option) => {
                                    const { key, ...optionProps } = props as any;
                                    return (
                                        <li key={key} {...optionProps}>
                                            <Stack spacing={0.5}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                    {option.asset_name}
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
                                        label="Asset"
                                        required
                                        placeholder="Select asset"
                                        error={touched && !selectedAsset}
                                        helperText={touched && !selectedAsset ? 'Asset is required' : ''}
                                    />
                                )}
                                disabled={isEdit}
                            />

                            <Autocomplete
                                fullWidth
                                options={employees}
                                getOptionLabel={(option) => `${option.employee_name} (${option.name})`}
                                value={selectedEmployee}
                                onChange={(event, newValue) => setSelectedEmployee(newValue)}
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
                                        placeholder="Select employee"
                                        error={touched && !selectedEmployee}
                                        helperText={touched && !selectedEmployee ? 'Employee is required' : ''}
                                    />
                                )}
                            />

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Assigned On"
                                    format="DD-MM-YYYY"
                                    value={assignedOn ? dayjs(assignedOn) : null}
                                    onChange={(newValue) => setAssignedOn(newValue?.format('YYYY-MM-DD') || '')}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            required: true,
                                            InputLabelProps: { shrink: true },
                                            error: touched && !assignedOn,
                                            helperText: touched && !assignedOn ? 'Assignment date is required' : ''
                                        },
                                    }}
                                />
                            </LocalizationProvider>

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Returned On"
                                    format="DD-MM-YYYY"
                                    value={returnedOn ? dayjs(returnedOn) : null}
                                    onChange={(newValue) => setReturnedOn(newValue?.format('YYYY-MM-DD') || '')}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            InputLabelProps: { shrink: true },
                                        },
                                    }}
                                />
                            </LocalizationProvider>

                            <TextField
                                fullWidth
                                label="Remarks"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                multiline
                                rows={3}
                                placeholder="Enter remarks"
                                sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
                            />
                        </Box>
                    </DialogContent>

                    <DialogActions sx={{ p: 1.5 }}>
                        <Button type="submit" variant="contained">
                            {isEdit ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* View Dialog */}
            <Dialog
                open={openView}
                onClose={() => setOpenView(false)}
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
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Assignment Details</Typography>
                    <IconButton
                        onClick={() => setOpenView(false)}
                        sx={{ color: (t) => t.palette.grey[500] }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 4, m: 2, mt: 4 }}>
                    {viewAssignment && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {/* Header Summary Card */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                                <Box
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'info.lighter',
                                        color: 'info.main',
                                        boxShadow: (t) => `0 8px 16px 0 ${alpha(t.palette.info.main, 0.16)}`,
                                    }}
                                >
                                    <Iconify icon={"solar:laptop-bold-duotone" as any} width={40} />
                                </Box>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                        {viewAssignment.asset_name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                        Asset ID: {viewAssignment.asset}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Label
                                        color={viewAssignment.returned_on ? 'default' : 'success'}
                                        variant="soft"
                                        sx={{ textTransform: 'uppercase', height: 24, px: 1.5 }}
                                    >
                                        {viewAssignment.returned_on ? 'RETURNED' : 'ACTIVE'}
                                    </Label>
                                </Box>
                            </Box>

                            <Divider sx={{ borderStyle: 'dashed' }} />

                            {/* Assignment Information */}
                            <Box>
                                <SectionHeader title="Assignment Information" />
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gap: 3,
                                        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' },
                                    }}
                                >
                                    <DetailItem
                                        label="Employee"
                                        value={viewAssignment.employee_name}
                                        icon={<FaUser size={18}/>}
                                    />
                                    <DetailItem
                                        label="Employee ID"
                                        value={viewAssignment.assigned_to}
                                        icon={<GoHash size={18}/>}
                                    />
                                    <DetailItem
                                        label="Assest"
                                        value={viewAssignment.asset_name}
                                        icon={<BsLaptop size={18}/>}
                                    />
                                </Box>
                            </Box>


                            <Box>
                                <SectionHeader title="Lifecycle Details" />
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gap: 3,
                                        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' },
                                    }}
                                >
                                    <DetailItem
                                        label="Assigned On"
                                        value={dayjs(viewAssignment.assigned_on).format('DD MMM YYYY')}
                                        icon={<MdOutlineAssignmentTurnedIn size={18}/>}
                                    />
                                    {viewAssignment.returned_on && (
                                        <DetailItem
                                            label="Returned On"
                                            value={dayjs(viewAssignment.returned_on).format('DD MMM YYYY')}
                                            icon={<IoMdReturnLeft  size={18}/>}
                                        />
                                    )}
                                </Box>
                            </Box>

                            {/* Remarks Section */}
                            {viewAssignment.remarks && (
                                <Box>
                                    <SectionHeader title="Remarks" />
                                    <Box                                     
                                        sx={{
                                            p: 3,
                                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                                            borderRadius: 2,
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {viewAssignment.remarks}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            <AssetAssignmentImportDialog
                open={openImport}
                onClose={() => setOpenImport(false)}
                onRefresh={refetch}
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

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this assignment?"
                action={
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />
        </DashboardContent >
    );
}

function SectionHeader({ title, noMargin = false }: { title: string, noMargin?: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: noMargin ? 0 : 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13.5px' }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailItem({ label, value, icon }: { label: string; value?: React.ReactNode; icon: React.ReactNode }) {
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 50,
                    height: 50,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'info.main',
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5, fontSize: 11 }}>
                    {label}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}
