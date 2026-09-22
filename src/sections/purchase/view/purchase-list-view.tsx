import { useState, useCallback, useEffect } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { usePurchase } from 'src/hooks/usePurchase';

import { deletePurchase } from 'src/api/purchase';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { emptyRows } from '../utils';
import { TableNoData } from '../table-no-data';
import { TableEmptyRows } from '../table-empty-rows';
import { PurchaseTableRow } from '../purchase-table-row';
import { PurchaseTableHead } from '../purchase-table-head';
import { PurchaseTableToolbar } from '../purchase-table-toolbar';
import { PurchaseTableFiltersDrawer } from '../purchase-table-filters-drawer';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'name', label: 'Purchase ID' },
    { id: 'bill_no', label: 'Bill No' },
    { id: 'vendor_name', label: 'Vendor' },
    { id: 'bill_date', label: 'Bill Date' },
    { id: 'grand_total', label: 'Amount', align: 'right' },
    { id: 'paid_amount', label: 'Paid', align: 'right' },
    { id: 'balance_amount', label: 'Balance', align: 'right' },
    { id: '', label: 'Actions', align: 'right' },
];

// ----------------------------------------------------------------------

type Props = {
    hideHeader?: boolean;
};

export function PurchaseListView({ hideHeader }: Props) {
    const table = useTable();
    const router = useRouter();

    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('modified_desc');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState({
        vendor_name: 'all',
        payment_type: 'all',
        payment_terms: 'all',
    });

    // Dropdown Options
    const [vendorOptions, setVendorOptions] = useState<any[]>([]);
    const [paymentTypeOptions, setPaymentTypeOptions] = useState<any[]>([]);

    const { data, total, loading, refetch } = usePurchase(
        table.page,
        table.rowsPerPage,
        filterName,
        sortBy,
        filters
    );

    const handleFilters = (update: any) => {
        setFilters((prev) => ({ ...prev, ...update }));
        table.onResetPage();
    };

    const handleResetFilters = () => {
        setFilters({
            vendor_name: 'all',
            payment_type: 'all',
            payment_terms: 'all',
        });
        table.onResetPage();
    };

    const canReset =
        filters.vendor_name !== 'all' ||
        filters.payment_type !== 'all' ||
        filters.payment_terms !== 'all' ||
        !!filterName;

    // Fetch filters options
    useEffect(() => {
        Promise.all([
            fetch('/api/method/frappe.client.get_list?doctype=Contacts&fields=["name","first_name"]&link_full_match=0&limit_page_length=999&filters=[["Contacts","customer_type","=","Purchase"]]', { credentials: 'include' }),
            fetch('/api/method/frappe.client.get_list?doctype=Payment Type&fields=["name"]&limit_page_length=999', { credentials: 'include' })
        ]).then(async ([vendorsRes, paymentTypesRes]) => {
            const vendors = await vendorsRes.json();
            const paymentTypes = await paymentTypesRes.json();

            setVendorOptions(vendors.message || []);
            setPaymentTypeOptions(paymentTypes.message || []);
        }).catch(err => console.error('Failed to fetch dropdown options', err));
    }, []);

    const handleFilterName = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            table.onResetPage();
        },
        [table]
    );

    const handleCreateNew = () => {
        router.push('/purchase/new');
    };

    const handleEditRow = (id: string) => {
        router.push(`/purchase/edit/${encodeURIComponent(id)}`);
    };

    const handleViewRow = (id: string) => {
        router.push(`/purchase/${encodeURIComponent(id)}`);
    };

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);



    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deletePurchase(confirmDelete.id);
            setSnackbar({ open: true, message: 'Purchase deleted successfully', severity: 'success' });
            await refetch();
        } catch (e) {
            console.error(e);
            setSnackbar({ open: true, message: 'Failed to delete purchase', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const notFound = !loading && data.length === 0 && (!!filterName || canReset);
    const empty = !loading && data.length === 0 && !filterName && !canReset;

    const totalHeadCols = TABLE_HEAD.length + 1; // + 1 for Sno

    const content = (
        <>
            {!hideHeader && (
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
                    <Typography variant="h4">Purchases</Typography>
                    <Button
                        variant="contained"
                        color="info"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleCreateNew}
                    >
                        New Purchase
                    </Button>
                </Stack>
            )}

            <Card>
                <PurchaseTableToolbar
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
                            <PurchaseTableHead
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
                                hideCheckbox
                                showIndex
                                headLabel={TABLE_HEAD}
                            />
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={totalHeadCols} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => {
                                            const matchedVendor = vendorOptions.find((v) => v.name === row.vendor_name);
                                            const displayVendorName = matchedVendor ? matchedVendor.first_name || matchedVendor.name : row.vendor_name || '';
                                            const displayVendorId = matchedVendor ? matchedVendor.name : row.vendor_name || '';

                                            return (
                                                <PurchaseTableRow
                                                    key={row.name}
                                                    index={table.page * table.rowsPerPage + index}
                                                    hideCheckbox
                                                    row={{
                                                        id: row.name,
                                                        name: row.name,
                                                        bill_no: row.bill_no,
                                                        vendor: displayVendorId,
                                                        vendor_name: displayVendorName,
                                                        bill_date: row.bill_date,
                                                        grand_total: row.grand_total || 0,
                                                        payment_type: row.payment_type || '',
                                                        paid_amount: row.paid_amount || 0,
                                                        balance_amount: row.balance_amount || 0,
                                                    }}
                                                    selected={table.selected.includes(row.name)}
                                                    onSelectRow={() => table.onSelectRow(row.name)}
                                                    onEdit={() => handleEditRow(row.name)}
                                                    onView={() => handleViewRow(row.name)}
                                                    onDelete={() => handleDeleteRow(row.name)}
                                                />
                                            );
                                        })}

                                        {data.length > 0 && (
                                            <TableEmptyRows
                                                height={68}
                                                emptyRows={data.length < 5 ? 5 - data.length : 0}
                                            />
                                        )}

                                        {notFound && <TableNoData query={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={totalHeadCols}>
                                                    <EmptyContent
                                                        title="No purchases found"
                                                        description="Create a new purchase order to track your procurement."
                                                        icon="solar:bag-3-bold-duotone"
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

            <PurchaseTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                options={{
                    vendors: vendorOptions,
                    payment_types: paymentTypeOptions,
                }}
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

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this purchase?"
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
        </>
    );

    if (hideHeader) {
        return content;
    }

    return <DashboardContent maxWidth={false}>{content}</DashboardContent>;
}

// ----------------------------------------------------------------------

export function useTable() {
    const [page, setPage] = useState(0);
    const [orderBy, setOrderBy] = useState('bill_no');
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
