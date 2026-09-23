import dayjs from 'dayjs';
import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
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

import { useExpenses } from 'src/hooks/useExpenses';

import { DashboardContent } from 'src/layouts/dashboard';
import { createExpense, updateExpense, deleteExpense, getExpensePermissions } from 'src/api/expenses';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { ExpenseTableRow } from 'src/sections/expenses/expenses-table-row';
import { LeadTableHead as ExpenseTableHead } from 'src/sections/lead/lead-table-head';
import { ExpenseDetailsDialog } from 'src/sections/report/expenses/expenses-details-dialog';
import { LeadTableToolbar as ExpenseTableToolbar } from 'src/sections/lead/lead-table-toolbar';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

export function ExpensesView() {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && (user?.permissions?.actions?.expense_tracker || user?.permissions?.actions?.expense_tracker);
    const actionPerms = user?.permissions?.actions?.expense_tracker || user?.permissions?.actions?.expense_tracker;
    const canCreateExpense = hasCustomPerms && actionPerms ? !!actionPerms?.create : true;
    const canEditExpenseClaim = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const canDeleteExpenseClaim = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('date');
    const [selected, setSelected] = useState<string[]>([]);

    const { data, total, refetch } = useExpenses(page + 1, rowsPerPage, filterName, orderBy, order);

    const [openCreate, setOpenCreate] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentExpense, setCurrentExpense] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });

    // View state
    const [openView, setOpenView] = useState(false);
    const [viewExpense, setViewExpense] = useState<any>(null);

    // Form state
    const [expenseCategory, setExpenseCategory] = useState('');
    const [date, setDate] = useState('');
    const [paymentType, setPaymentType] = useState('Cash');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

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
        getExpensePermissions().then(setPermissions);
    }, []);

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
            await Promise.all(selected.map((name) => deleteExpense(name)));
            setSnackbar({ open: true, message: `${selected.length} expense(s) deleted successfully`, severity: 'success' });
            setSelected([]);
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to delete expenses', severity: 'error' });
        }
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setCurrentExpense(null);
        setExpenseCategory('');
        setDate('');
        setPaymentType('Cash');
        setAmount('');
        setDescription('');
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setIsEdit(false);
        setCurrentExpense(null);
        setExpenseCategory('');
        setDate('');
        setPaymentType('Cash');
        setAmount('');
        setDescription('');
    };

    const handleEditRow = useCallback((row: any) => {
        setCurrentExpense(row);
        setExpenseCategory(row.expense_category || '');
        setDate(row.date || '');
        setPaymentType(row.payment_type || 'Cash');
        setAmount(row.total?.toString() || '');
        setDescription(row.description || '');
        setIsEdit(true);
        setOpenCreate(true);
    }, []);

    const handleViewRow = useCallback((row: any) => {
        setViewExpense(row);
        setOpenView(true);
    }, []);

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteExpense(confirmDelete.id);
            setSnackbar({ open: true, message: 'Expense deleted successfully', severity: 'success' });
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to delete expense', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const expenseData = {
            expense_category: expenseCategory.trim(),
            date,
            payment_type: paymentType,
            total: parseFloat(amount) || 0,
            description: description.trim(),
        };

        try {
            if (isEdit && currentExpense) {
                await updateExpense(currentExpense.name, expenseData);
                setSnackbar({ open: true, message: 'Expense updated successfully', severity: 'success' });
            } else {
                await createExpense(expenseData);
                setSnackbar({ open: true, message: 'Expense created successfully', severity: 'success' });
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

    const notFound = !data.length && !!filterName;
    const empty = !data.length && !filterName;

    return (
        <DashboardContent maxWidth={false} sx={{mt: 2}}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Company Expenses
                </Typography>

                {permissions.write && canCreateExpense && (
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        New Expense
                    </Button>
                )}
            </Box>

            <Card>
                <ExpenseTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterByName}
                    searchPlaceholder="Search expenses..."
                    onDelete={selected.length > 0 ? handleBulkDelete : undefined}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <ExpenseTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={data.length}
                                numSelected={selected.length}
                                onSort={handleSort}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'expense_no', label: 'Expense No' },
                                    { id: 'expense_category', label: 'Category' },
                                    { id: 'date', label: 'Date' },
                                    { id: 'payment_type', label: 'Payment Type' },
                                    { id: 'total', label: 'Amount' },
                                    { id: '', label: '' },
                                ]}
                            />
                            <TableBody>
                                {data.map((row, index) => (
                                    <ExpenseTableRow
                                        key={row.name}
                                        index={page * rowsPerPage + index}
                                        hideCheckbox
                                        row={{
                                            id: row.name,
                                            expense_no: row.expense_no || '',
                                            expense_category: row.expense_category,
                                            date: row.date,
                                            payment_type: row.payment_type,
                                            total: row.total,
                                        }}
                                        selected={selected.includes(row.name)}
                                        onSelectRow={() => handleSelectRow(row.name)}
                                        onView={() => handleViewRow(row)}
                                        onEdit={() => handleEditRow(row)}
                                        onDelete={() => handleDeleteRow(row.name)}
                                        canEdit={permissions.write && canEditExpenseClaim}
                                        canDelete={permissions.delete && canDeleteExpenseClaim}
                                    />
                                ))}

                                {notFound && <TableNoData searchQuery={filterName} />}

                                {empty && (
                                    <TableRow>
                                        <TableCell colSpan={5}>
                                            <EmptyContent
                                                title="No expenses found"
                                                description="You haven't recorded any expenses yet."
                                                icon="solar:bill-list-bold-duotone"
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

            {/* Create/Edit Dialog */}
            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="sm">
                <form onSubmit={handleCreate}>
                    <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {isEdit ? 'Edit Expense' : 'New Expense'}
                        <IconButton onClick={handleCloseCreate}>
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent dividers>
                        <Box sx={{ display: 'grid', gap: 3, margin: '1rem' }}>
                            <TextField
                                fullWidth
                                label="Expense Category"
                                value={expenseCategory}
                                onChange={(e) => setExpenseCategory(e.target.value)}
                                required
                                placeholder="e.g., Office Supplies, Travel"
                            />

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Date"
                                    value={date ? dayjs(date) : null}
                                    onChange={(newValue) => setDate(newValue?.format('YYYY-MM-DD') || '')}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            required: true,
                                            InputLabelProps: { shrink: true },
                                        },
                                    }}
                                />
                            </LocalizationProvider>

                            <FormControl fullWidth required>
                                <InputLabel>Payment Type</InputLabel>
                                <Select
                                    value={paymentType}
                                    onChange={(e) => setPaymentType(e.target.value)}
                                    label="Payment Type"
                                >
                                    <MenuItem value="Cash">Cash</MenuItem>
                                    <MenuItem value="Credit Card">Credit Card</MenuItem>
                                    <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                                    <MenuItem value="Cheque">Cheque</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="Amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                                placeholder="Enter amount"
                                inputProps={{ step: '0.01', min: '0' }}
                            />

                            <TextField
                                fullWidth
                                label="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                multiline
                                rows={3}
                                placeholder="Enter expense description"
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
            <ExpenseDetailsDialog
                open={openView}
                onClose={() => setOpenView(false)}
                expenseId={viewExpense ? viewExpense.name : null}
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
                content="Are you sure you want to delete this expense?"
                action={
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />
        </DashboardContent>
    );
}
