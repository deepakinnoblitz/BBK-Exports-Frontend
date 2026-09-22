import { useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { useExpense } from 'src/hooks/useExpense';

import { DashboardContent } from 'src/layouts/dashboard';
import { deleteExpense, getDoctypeList } from 'src/api/expenses';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { emptyRows } from '../utils';
import { TableNoData } from '../table-no-data';
import { TableEmptyRows } from '../table-empty-rows';
import { ExpenseTableRow } from '../expenses-table-row';
import { ExpenseTableHead } from '../expenses-table-head';
import { ExpenseTableToolbar } from '../expenses-table-toolbar';
import { ExpenseTableFiltersDrawer } from '../expenses-table-filters-drawer';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'expense_no', label: 'Expense No' },
    { id: 'expense_category', label: 'Category' },
    { id: 'date', label: 'Date' },
    { id: 'payment_type', label: 'Payment Type' },
    { id: 'total', label: 'Total', align: 'right' },
    { id: '' },
];

// ----------------------------------------------------------------------

export function ExpenseListView() {
    const table = useTable();
    const router = useRouter();

    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('modified_desc');

    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState({
        expense_id: '',
        expense_category: 'all',
        payment_type: 'all',
        start_date: null as string | null,
        end_date: null as string | null,
    });
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    const [paymentTypeOptions, setPaymentTypeOptions] = useState<string[]>([]);

    useEffect(() => {
        getDoctypeList('Expense Category', ['name']).then((res) => {
            setCategoryOptions(res.map((item: any) => item.name));
        });
        getDoctypeList('Payment Type', ['name']).then((res) => {
            setPaymentTypeOptions(res.map((item: any) => item.name));
        });
    }, []);

    const handleFilters = (newFilters: any) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        table.onResetPage();
    };

    const handleResetFilters = () => {
        setFilters({ expense_id: '', expense_category: 'all', payment_type: 'all', start_date: null, end_date: null });
        table.onResetPage();
    };

    const canReset = !!filters.expense_id || filters.expense_category !== 'all' || filters.payment_type !== 'all' || !!filters.start_date || !!filters.end_date || !!filterName;
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const { data, total, loading, refetch } = useExpense(
        table.page,
        table.rowsPerPage,
        filterName,
        filters,
        sortBy
    );

    const handleFilterName = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            table.onResetPage();
        },
        [table]
    );

    const handleCreateNew = () => {
        router.push('/expenses/new');
    };

    const handleEditRow = (id: string) => {
        router.push(`/expenses/${encodeURIComponent(id)}/edit`);
    };

    const handleViewRow = (id: string) => {
        router.push(`/expenses/${encodeURIComponent(id)}/view`);
    };

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteExpense(confirmDelete.id);
            setSnackbar({ open: true, message: 'Expense deleted successfully', severity: 'success' });
            await refetch();
        } catch (e) {
            console.error(e);
            setSnackbar({ open: true, message: 'Failed to delete expense', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const notFound = !loading && data.length === 0 && !!filterName;
    const empty = !loading && data.length === 0 && !filterName && !canReset;

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
                <Typography variant="h4">Expenses</Typography>
                <Button
                    variant="contained"
                    color="info"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={handleCreateNew}
                >
                    New Expense
                </Button>
            </Stack>

            <Card>
                <ExpenseTableToolbar
                    numSelected={table.selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterName}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
                            <ExpenseTableHead
                                order={table.order}
                                orderBy={table.orderBy}
                                rowCount={total}
                                numSelected={table.selected.length}
                                onSort={table.onSort}
                                onSelectAllRows={(checked) =>
                                    table.onSelectAllRows(
                                        checked,
                                        data.map((row) => row.name)
                                    )
                                }
                                headLabel={TABLE_HEAD}
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
                                        {data.map((row) => (
                                            <ExpenseTableRow
                                                key={row.name}
                                                row={{
                                                    id: row.name,
                                                    expense_no: row.expense_no || '',
                                                    expense_category: row.expense_category || '',
                                                    date: row.date,
                                                    payment_type: row.payment_type || '',
                                                    total: row.total || 0,
                                                }}
                                                selected={table.selected.includes(row.name)}
                                                onSelectRow={() => table.onSelectRow(row.name)}
                                                onEdit={() => handleEditRow(row.name)}
                                                onView={() => handleViewRow(row.name)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                canEdit
                                                canDelete
                                            />
                                        ))}

                                        <TableEmptyRows
                                            height={77}
                                            emptyRows={data.length < 5 ? 5 - data.length : 0}
                                        />

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={6}>
                                                    <EmptyContent
                                                        title="No expenses found"
                                                        description="Record and track your business expenses efficiently."
                                                        icon="solar:bill-list-bold-duotone"
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
                    page={table.page}
                    component="div"
                    count={total}
                    rowsPerPage={table.rowsPerPage}
                    onPageChange={table.onChangePage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={table.onChangeRowsPerPage}
                />
            </Card>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{
                        width: '100%',
                        boxShadow: (theme) => theme.customShadows.z20
                    }}
                >
                    <AlertTitle>{snackbar.severity === 'success' ? 'Success' : 'Error'}</AlertTitle>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this expense?"
                action={
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDelete}
                        sx={{ borderRadius: 1.5, minWidth: 100 }}
                    >
                        Delete
                    </Button>
                }
            />
            <ExpenseTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                options={{
                    categories: categoryOptions,
                    paymentTypes: paymentTypeOptions,
                }}
            />
        </DashboardContent>
    );
}

// ----------------------------------------------------------------------

export function useTable() {
    const [page, setPage] = useState(0);
    const [orderBy, setOrderBy] = useState('expense_category');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selected, setSelected] = useState<string[]>([]);
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');

    const onSort = useCallback(
        (id: string) => {
            const isAsc = orderBy === id && order === 'asc';
            setOrder(isAsc ? 'desc' : 'asc');
            setOrderBy(id);
        },
        [order, orderBy]
    );

    const onSelectAllRows = useCallback((checked: boolean, ids: string[]) => {
        setSelected(checked ? ids : []);
    }, []);

    const onSelectRow = useCallback((value: string) => {
        setSelected((prev: string[]) =>
            prev.includes(value) ? prev.filter((v: string) => v !== value) : [...prev, value]
        );
    }, []);

    const onResetPage = () => setPage(0);

    const onChangePage = (_: unknown, newPage: number) => setPage(newPage);

    const onChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        onResetPage();
    };

    return {
        page,
        order,
        orderBy,
        rowsPerPage,
        selected,
        onSort,
        onSelectRow,
        onSelectAllRows,
        onResetPage,
        onChangePage,
        onChangeRowsPerPage,
    };
}
