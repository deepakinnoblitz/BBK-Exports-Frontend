import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Backdrop from '@mui/material/Backdrop';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { useInvoices } from 'src/hooks/useInvoices';

import { handleDownload, handleDirectPrint } from 'src/utils/print';

import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchInvoices, deleteInvoice, getInvoicePrintUrl } from 'src/api/invoice';

import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { emptyRows } from '../utils';
import { TableNoData } from '../table-no-data';
import { TableEmptyRows } from '../table-empty-rows';
import { InvoiceTableRow } from '../invoice-table-row';
import { InvoiceTableHead } from '../invoice-table-head';
import { InvoiceTableToolbar } from '../invoice-table-toolbar';
import { InvoiceTableFiltersDrawer } from '../invoice-table-filters-drawer';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'ref_no', label: 'Ref No' },
    { id: 'billing_name', label: 'Billing Name' },
    { id: 'customer_name', label: 'Client' },
    { id: 'invoice_date', label: 'Date' },
    { id: 'grand_total', label: 'Amount', align: 'right' },
    { id: 'received_amount', label: 'Received', align: 'right' },
    { id: 'balance_amount', label: 'Balance', align: 'right' },
    { id: 'actions', label: 'Actions', align: 'right' },
];

// ----------------------------------------------------------------------

export function InvoiceListView({ hideHeader = false }: { hideHeader?: boolean }) {
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
    const [printing, setPrinting] = useState(false);

    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState({
        client_name: 'all',
        ref_no: '',
        invoice_date: null as string | null,
    });
    const [customerOptions, setCustomerOptions] = useState<{ name: string; customer_name: string }[]>([]);
    const [refNoOptions, setRefNoOptions] = useState<string[]>([]);

    useEffect(() => {
        // Fetch Contacts for Customer Filter
        getDoctypeList('Contacts', ['name', 'first_name', 'company_name']).then((res) => {
            const options = res.map((c: any) => ({
                name: c.name,
                customer_name: c.first_name + (c.company_name ? ` - ${c.company_name}` : '')
            }));
            setCustomerOptions(options);
        });

        // Fetch Invoices for Ref No Filter
        fetchInvoices({ page: 1, page_size: 1000 }).then((res) => {
            const refs = Array.from(new Set(res.data.map((i: any) => i.ref_no).filter(Boolean))) as string[];
            setRefNoOptions(refs);
        });
    }, []);

    const { data, total, loading, refetch } = useInvoices(
        table.page,
        table.rowsPerPage,
        filterName,
        filters,
        sortBy
    );

    const handleFilters = (newFilters: any) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        table.onResetPage();
    };

    const handleResetFilters = () => {
        setFilters({ client_name: 'all', ref_no: '', invoice_date: null });
        table.onResetPage();
    };

    const canReset = filters.client_name !== 'all' || !!filters.ref_no || !!filters.invoice_date || !!filterName;

    const handleFilterName = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            table.onResetPage();
        },
        [table]
    );

    const handleCreateNew = () => {
        router.push('/invoices/new');
    };

    const handleEditRow = (id: string) => {
        router.push(`/invoices/${encodeURIComponent(id)}/edit`);
    };

    const handleViewRow = (id: string) => {
        router.push(`/invoices/${encodeURIComponent(id)}/view`);
    };

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handlePrintRow = (id: string, ref_no?: string) => {
        handleDownload(
            getInvoicePrintUrl(id),
            `${ref_no || id}.pdf`,
            () => setPrinting(true),
            () => setPrinting(false)
        );
    };

    const handlePreviewRow = (id: string) => {
        handleDirectPrint(
            getInvoicePrintUrl(id),
            () => setPrinting(true),
            () => setPrinting(false)
        );
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteInvoice(confirmDelete.id);
            setSnackbar({ open: true, message: 'Invoice deleted successfully', severity: 'success' });
            await refetch();
        } catch (e) {
            console.error(e);
            setSnackbar({ open: true, message: 'Failed to delete invoice', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };



    const notFound = !loading && data.length === 0 && !!filterName;
    const empty = !loading && data.length === 0 && !filterName && !canReset;

    const content = (
        <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                {!hideHeader && (
                    <Typography variant="h4">Invoices</Typography>
                )}
                {hideHeader && <Box sx={{ flexGrow: 1 }} />}
                {/* <Button
                    variant="contained"
                    color="info"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={handleCreateNew}
                    sx={{
                        ...(hideHeader && {
                            bgcolor: '#059669',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#047857' }
                        })
                    }}
                >
                    New Invoice
                </Button> */}
            </Stack>

            <Card>
                <InvoiceTableToolbar
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
                            <InvoiceTableHead
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
                                        <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <InvoiceTableRow
                                                key={row.name}
                                                index={table.page * table.rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    ref_no: row.ref_no,
                                                    client_name: row.client_name || '',
                                                    customer_name: row.customer_name || '',
                                                    billing_name: row.billing_name || '',
                                                    billing_account_name: row.billing_account_name || '',
                                                    invoice_date: row.invoice_date,
                                                    grand_total: row.grand_total || 0,
                                                    received_amount: row.received_amount || 0,
                                                    balance_amount: row.balance_amount || 0,
                                                }}
                                                selected={table.selected.includes(row.name)}
                                                onSelectRow={() => table.onSelectRow(row.name)}
                                                onEdit={() => handleEditRow(row.name)}
                                                onView={() => handleViewRow(row.name)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                onPrint={() => handlePrintRow(row.name, row.ref_no)}
                                                onPreview={() => handlePreviewRow(row.name)}
                                            />
                                        ))}

                                        {notFound && <TableNoData colSpan={10} searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={10}>
                                                    <EmptyContent
                                                        title="No invoices found"
                                                        description="Create a new invoice to track your sales pipeline."
                                                        icon="solar:bill-list-bold-duotone"
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
                    page={table.page}
                    component="div"
                    count={total}
                    rowsPerPage={table.rowsPerPage}
                    onPageChange={table.onChangePage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={table.onChangeRowsPerPage}
                />
            </Card>

            <InvoiceTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                options={{
                    customers: customerOptions,
                    refNos: refNoOptions,
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
                content="Are you sure you want to delete this invoice?"
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

            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={printing}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
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
    const [orderBy, setOrderBy] = useState('ref_no');
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
