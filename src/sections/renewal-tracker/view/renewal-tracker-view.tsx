import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useRenewals } from 'src/hooks/useRenewals';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    getRenewal,
    createRenewal,
    updateRenewal,
    deleteRenewal,
    getRenewalPermissions,
} from 'src/api/renewal-tracker';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { LeadTableHead as RenewalTableHead } from 'src/sections/lead/lead-table-head';
import { LeadTableToolbar as RenewalTableToolbar } from 'src/sections/lead/lead-table-toolbar';
import { RenewalTrackerTableRow } from 'src/sections/renewal-tracker/renewal-tracker-table-row';
import { RenewalDetailsDialog } from 'src/sections/report/renewal-tracker/renewal-details-dialog';
import { RenewalTrackerTableFiltersDrawer } from 'src/sections/renewal-tracker/renewal-tracker-table-filters-drawer';

// ----------------------------------------------------------------------

const CATEGORIES = ['Domain', 'Email', 'SSL', 'Server', 'Laptop', 'Others'];
const PERIODS = ['Monthly', 'Quarterly', 'Yearly'];
const STATUSES = ['Active', 'Expired', 'Pending'];

export function RenewalTrackerView() {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('renewal_date');
    const [selected, setSelected] = useState<string[]>([]);

    const [filters, setFilters] = useState<{
        category: string;
        status: string;
        startDate: string | null;
        endDate: string | null;
    }>({
        category: 'all',
        status: 'all',
        startDate: null,
        endDate: null
    });

    const [openFilters, setOpenFilters] = useState(false);
    const canReset = filters.category !== 'all' || filters.status !== 'all' || filters.startDate !== null || filters.endDate !== null || !!filterName;

    const { data, total, refetch } = useRenewals(
        page + 1,
        rowsPerPage,
        filterName,
        orderBy,
        order,
        filters
    );

    const [openCreate, setOpenCreate] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentRenewal, setCurrentRenewal] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });

    // View state
    const [openView, setOpenView] = useState(false);
    const [viewRenewal, setViewRenewal] = useState<any>(null);

    // Form state
    const [itemName, setItemName] = useState('');
    const [category, setCategory] = useState('');
    const [vendor, setVendor] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [renewalDate, setRenewalDate] = useState('');
    const [amount, setAmount] = useState('');
    const [renewalPeriod, setRenewalPeriod] = useState('');
    const [status, setStatus] = useState('');
    const [remarks, setRemarks] = useState('');

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

    useEffect(() => {
        getRenewalPermissions().then(setPermissions);
    }, []);

    const handleFilters = (newFilters: Partial<typeof filters>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            category: 'all',
            status: 'all',
            startDate: null,
            endDate: null
        });
        setPage(0);
    };

    const handleSort = (id: string) => {
        const isAsc = orderBy === id && order === 'asc';
        if (id !== '') {
            setOrder(isAsc ? 'desc' : 'asc');
            setOrderBy(id);
        }
    };

    const handleSortChange = (value: string) => {
        // Map dropdown values to orderBy and order
        if (value === 'date_desc') { setOrderBy('creation'); setOrder('desc'); }
        else if (value === 'date_asc') { setOrderBy('creation'); setOrder('asc'); }
        else if (value === 'amount_desc') { setOrderBy('amount'); setOrder('desc'); }
        else if (value === 'amount_asc') { setOrderBy('amount'); setOrder('asc'); }
        else if (value === 'name_asc') { setOrderBy('item_name'); setOrder('asc'); }
        else if (value === 'name_desc') { setOrderBy('item_name'); setOrder('desc'); }
        setPage(0);
    };

    const getCurrentSortValue = () => {
        if (orderBy === 'creation' || orderBy === 'renewal_date') return order === 'desc' ? 'date_desc' : 'date_asc';
        if (orderBy === 'amount') return order === 'desc' ? 'amount_desc' : 'amount_asc';
        if (orderBy === 'item_name') return order === 'desc' ? 'name_desc' : 'name_asc';
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
            await Promise.all(selected.map((name) => deleteRenewal(name)));
            setSnackbar({
                open: true,
                message: `${selected.length} record(s) deleted successfully`,
                severity: 'success',
            });
            setSelected([]);
            refetch();
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to delete records',
                severity: 'error',
            });
        }
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setCurrentRenewal(null);
        setItemName('');
        setCategory('');
        setVendor('');
        setPurchaseDate('');
        setRenewalDate('');
        setAmount('');
        setRenewalPeriod('');
        setStatus('Active');
        setRemarks('');
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setIsEdit(false);
        setCurrentRenewal(null);
    };

    const handleEditRow = useCallback(async (row: any) => {
        try {
            const fullData = await getRenewal(row.name);
            setCurrentRenewal(fullData);
            setItemName(fullData.item_name || '');
            setCategory(fullData.category || '');
            setVendor(fullData.vendor || '');
            setPurchaseDate(fullData.purchase_date || '');
            setRenewalDate(fullData.renewal_date || '');
            setAmount(fullData.amount?.toString() || '');
            setRenewalPeriod(fullData.renewal_period || '');
            setStatus(fullData.status || 'Active');
            setRemarks(fullData.remarks || '');
            setIsEdit(true);
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
            const fullData = await getRenewal(row.name);
            setViewRenewal(fullData);
            setOpenView(true);
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to load record',
                severity: 'error',
            });
        }
    }, []);

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteRenewal(confirmDelete.id);
            setSnackbar({
                open: true,
                message: 'Record deleted successfully',
                severity: 'success',
            });
            refetch();
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to delete record',
                severity: 'error',
            });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const renewalData = {
            item_name: itemName.trim(),
            category,
            vendor: vendor.trim(),
            purchase_date: purchaseDate,
            renewal_date: renewalDate,
            amount: parseFloat(amount) || 0,
            renewal_period: renewalPeriod,
            status,
            remarks: remarks.trim(),
        };

        try {
            if (isEdit && currentRenewal) {
                await updateRenewal(currentRenewal.name, renewalData);
                setSnackbar({
                    open: true,
                    message: 'Record updated successfully',
                    severity: 'success',
                });
            } else {
                await createRenewal(renewalData);
                setSnackbar({
                    open: true,
                    message: 'Record created successfully',
                    severity: 'success',
                });
            }
            handleCloseCreate();
            refetch();
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Operation failed',
                severity: 'error',
            });
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

    const notFound = !data.length && !!filterName;
    const empty = !data.length && !filterName;

    return (
        <DashboardContent maxWidth={false} sx={{mt: 2}}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Renewals Tracker
                </Typography>

                {permissions.write && (
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                        sx={{
                            bgcolor: '#059669',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#047857' },
                        }}
                    >
                        New Renewal
                    </Button>
                )}
            </Box>

            <Card>
                <RenewalTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterByName}
                    searchPlaceholder="Search renewals..."
                    onDelete={selected.length > 0 ? handleBulkDelete : undefined}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={getCurrentSortValue()}
                    onSortChange={handleSortChange}
                    sortOptions={[
                        { value: 'date_desc', label: 'Newest First' },
                        { value: 'date_asc', label: 'Oldest First' },
                        { value: 'amount_desc', label: 'Amount: High to Low' },
                        { value: 'amount_asc', label: 'Amount: Low to High' },
                        { value: 'name_asc', label: 'Name: A to Z' },
                        { value: 'name_desc', label: 'Name: Z to A' },
                    ]}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <RenewalTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={data.length}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'item_name', label: 'Item Name' },
                                    { id: 'category', label: 'Category' },
                                    { id: 'renewal_date', label: 'Renewal Date' },
                                    { id: 'amount', label: 'Amount', align: 'right' },
                                    { id: 'status', label: 'Status', align: 'center' },
                                    { id: '', label: '', align: 'right' },
                                ]}
                            />
                            <TableBody>
                                {data.map((row, index) => (
                                    <RenewalTrackerTableRow
                                        key={row.name}
                                        index={page * rowsPerPage + index}
                                        hideCheckbox
                                        row={{
                                            id: row.name,
                                            item_name: row.item_name,
                                            category: row.category,
                                            renewal_date: row.renewal_date,
                                            amount: row.amount,
                                            status: row.status,
                                        }}
                                        selected={selected.includes(row.name)}
                                        onSelectRow={() => handleSelectRow(row.name)}
                                        onView={() => handleViewRow(row)}
                                        onEdit={() => handleEditRow(row)}
                                        onDelete={() => handleDeleteRow(row.name)}
                                        canEdit={permissions.write}
                                        canDelete={permissions.delete}
                                    />
                                ))}

                                {notFound && <TableNoData searchQuery={filterName} />}

                                {empty && (
                                    <TableRow>
                                        <TableCell colSpan={6}>
                                            <EmptyContent
                                                title="No renewals found"
                                                description="You haven't added any renewal tracking records yet."
                                                icon="solar:reorder-bold-duotone"
                                            />
                                        </TableCell>
                                    </TableRow>
                                )}

                                {!empty && (
                                    <TableEmptyRows
                                        height={68}
                                        emptyRows={data.length < 5 ? 5 - data.length : 0}
                                    />
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

            <RenewalTrackerTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
            />

            {/* Create/Edit Dialog */}
            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="md">
                <form onSubmit={handleCreate}>
                    <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {isEdit ? 'Edit Renewal' : 'New Renewal'}
                        <IconButton onClick={handleCloseCreate}>
                            <Iconify icon={"mingcute:close-line" as any} />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent dividers>
                        <Box sx={{ display: 'grid', gap: 3, margin: '1rem' }}>
                            <TextField
                                fullWidth
                                label="Item Name"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                required
                            />

                            <FormControl fullWidth required>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    label="Category"
                                >
                                    {CATEGORIES.map((cat) => (
                                        <MenuItem key={cat} value={cat}>
                                            {cat}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="Vendor / Provider"
                                value={vendor}
                                onChange={(e) => setVendor(e.target.value)}
                            />

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                    <DatePicker
                                        label="Purchase Date"
                                        value={purchaseDate ? dayjs(purchaseDate) : null}
                                        onChange={(newValue) => setPurchaseDate(newValue?.format('YYYY-MM-DD') || '')}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                InputLabelProps: { shrink: true },
                                            },
                                        }}
                                    />
                                    <DatePicker
                                        label="Renewal Date"
                                        value={renewalDate ? dayjs(renewalDate) : null}
                                        onChange={(newValue) => setRenewalDate(newValue?.format('YYYY-MM-DD') || '')}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                InputLabelProps: { shrink: true },
                                            },
                                        }}
                                    />
                                </Box>
                            </LocalizationProvider>

                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    inputProps={{ min: 0, step: 0.01 }}
                                />
                                <FormControl fullWidth>
                                    <InputLabel>Renewal Period</InputLabel>
                                    <Select
                                        value={renewalPeriod}
                                        onChange={(e) => setRenewalPeriod(e.target.value)}
                                        label="Renewal Period"
                                    >
                                        <MenuItem value="">None</MenuItem>
                                        {PERIODS.map((period) => (
                                            <MenuItem key={period} value={period}>
                                                {period}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>

                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    label="Status"
                                >
                                    {STATUSES.map((stat) => (
                                        <MenuItem key={stat} value={stat}>
                                            {stat}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="Remarks"
                                multiline
                                rows={3}
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </Box>
                    </DialogContent>

                    <DialogActions>
                        <Button type="submit" variant="contained">
                            {isEdit ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* View Dialog */}
            <RenewalDetailsDialog
                open={openView}
                onClose={() => setOpenView(false)}
                renewal={viewRenewal}
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
                content="Are you sure you want to delete this renewal record?"
                action={
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />
        </DashboardContent>
    );
}
