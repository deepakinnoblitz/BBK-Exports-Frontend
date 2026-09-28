import type { InvoiceCollection } from 'src/api/invoice-collection';

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
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { useRouter } from 'src/routes/hooks';

import { getDoctypeList } from 'src/api/leads';
import { fetchInvoices } from 'src/api/invoice';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchInvoiceCollections, deleteInvoiceCollection } from 'src/api/invoice-collection';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from '../../invoice/table-no-data';
import { TableEmptyRows } from '../../invoice/table-empty-rows';
import { InvoiceCollectionTableRow } from '../invoice-collection-table-row';
import { InvoiceCollectionTableHead } from '../invoice-collection-table-head';
import { InvoiceCollectionTableToolbar } from '../invoice-collection-table-toolbar';
import { InvoiceCollectionTableFiltersDrawer } from '../invoice-collection-table-filters-drawer';

const TABLE_HEAD = [
    { id: 'name', label: 'ID' },
    { id: 'invoice', label: 'Invoice No' },
    { id: 'collection_date', label: 'Date' },
    { id: 'mode_of_payment', label: 'Mode' },
    { id: 'amount_to_pay', label: 'Amount to Pay', align: 'right' },
    { id: 'amount_collected', label: 'Amount', align: 'right' },
    { id: 'amount_pending', label: 'Pending', align: 'right' },
    { id: 'actions', label: 'Actions', align: 'right' },
];


export function InvoiceCollectionListView({ hideHeader = false }: { hideHeader?: boolean }) {
    const router = useRouter();

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState('modified');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [selected, setSelected] = useState<string[]>([]);

    const [tableData, setTableData] = useState<InvoiceCollection[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [search, setSearch] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState({
        customer: 'all',
        invoice: '',
        collection_date: null as string | null,
        mode_of_payment: 'all',
    });
    const [customerOptions, setCustomerOptions] = useState<{ name: string; customer_name: string }[]>([]);
    const [invoiceOptions, setInvoiceOptions] = useState<string[]>([]);
    const [modeOfPaymentOptions, setModeOfPaymentOptions] = useState<string[]>([]);

    useEffect(() => {
        const msg = sessionStorage.getItem('invoice_collection_success_message');
        if (msg) {
            setSnackbar({ open: true, message: msg, severity: 'success' });
            sessionStorage.removeItem('invoice_collection_success_message');
        }
    }, []);

    useEffect(() => {
        // Fetch Contacts for Customer Filter
        getDoctypeList('Contacts', ['name', 'first_name', 'company_name']).then((res) => {
            const options = res.map((c: any) => ({
                name: c.name,
                customer_name: c.first_name || c.name
            }));
            setCustomerOptions(options);
        });

        // Fetch Invoices for Invoice Filter
        fetchInvoices({ page: 1, page_size: 1000 }).then((res) => {
            const invoices = res.data.map((i: any) => i.name) as string[];
            setInvoiceOptions(invoices);
        });

        // Fetch Mode of Payment Options
        getDoctypeList('Payment Type', ['name']).then((res) => {
            setModeOfPaymentOptions(res.map((m: any) => m.name));
        });
    }, []);

    const getInvoiceCollections = useCallback(async () => {
        try {
            setLoading(true);
            const { data, total: totalCount } = await fetchInvoiceCollections({
                page: page + 1,
                page_size: rowsPerPage,
                search,
                filters,
                sort_by: `${orderBy}_${order}`
            });

            // Determine latest collection for each invoice based on collection_date (with creation as tiebreaker)
            const latestCollectionsByInvoice = new Map<string, string>();
            data.forEach((collection: any) => {
                const existing = latestCollectionsByInvoice.get(collection.invoice);
                if (!existing) {
                    latestCollectionsByInvoice.set(collection.invoice, collection.name);
                } else {
                    const existingCollection = data.find((c: any) => c.name === existing);
                    const collectionDate = new Date(collection.collection_date);
                    const existingDate = new Date(existingCollection?.collection_date || 0);

                    // Compare by collection_date first, then by creation time as tiebreaker
                    if (collectionDate > existingDate ||
                        (collectionDate.getTime() === existingDate.getTime() &&
                            new Date(collection.creation) > new Date(existingCollection?.creation || 0))) {
                        latestCollectionsByInvoice.set(collection.invoice, collection.name);
                    }
                }
            });

            // Add isLatest flag to each collection
            const dataWithLatestFlag = data.map((collection: any) => ({
                ...collection,
                isLatest: latestCollectionsByInvoice.get(collection.invoice) === collection.name
            }));

            setTableData(dataWithLatestFlag);
            setTotal(totalCount);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, search, orderBy, order, filters]);

    useEffect(() => {
        getInvoiceCollections();
    }, [getInvoiceCollections]);

    const handleFilters = (newFilters: any) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({ customer: 'all', invoice: '', collection_date: null, mode_of_payment: 'all' });
        setPage(0);
    };

    const canReset = filters.customer !== 'all' || !!filters.invoice || !!filters.collection_date || filters.mode_of_payment !== 'all' || !!search;

    const handleSort = (id: string) => {
        const isAsc = orderBy === id && order === 'asc';
        if (id !== '') {
            setOrder(isAsc ? 'desc' : 'asc');
            setOrderBy(id);
        }
    };

    const handleSelectAllRows = (checked: boolean) => {
        if (checked) {
            const newSelecteds = tableData.map((n) => n.name);
            setSelected(newSelecteds);
            return;
        }
        setSelected([]);
    };

    const handleSelectRow = (name: string) => {
        const selectedIndex = selected.indexOf(name);
        let newSelected: string[] = [];
        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, name);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
        }
        setSelected(newSelected);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearch = useCallback(
        (value: string) => {
            setSearch(value);
            setPage(0);
        },
        []
    );

    const handleCreateNew = () => {
        router.push('/invoice-collections/new');
    };

    const handleEditRow = (id: string) => {
        router.push(`/invoice-collections/${id}/edit`);
    };

    const handleViewRow = (id: string) => {
        router.push(`/invoice-collections/${id}/view`);
    };

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteInvoiceCollection(confirmDelete.id);
            setSnackbar({ open: true, message: 'Collection deleted successfully', severity: 'success' });
            getInvoiceCollections();
            setSelected([]);
        } catch (e: any) {
            console.error(e);
            setSnackbar({ open: true, message: e.message || 'Failed to delete collection', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const notFound = !loading && tableData.length === 0 && (!!search || canReset);
    const empty = !loading && tableData.length === 0 && !search && !canReset;

    const content = (
        <>
            {!hideHeader && (
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
                    <Typography variant="h4">Invoice Collections</Typography>
                    <Button
                        variant="contained"
                        color="info"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleCreateNew}
                    >
                        New Collection
                    </Button>
                </Stack>
            )}

            <Card>
                <InvoiceCollectionTableToolbar
                    numSelected={selected.length}
                    filterName={search}
                    onFilterName={(e) => handleSearch(e.target.value)}
                    sortBy={`${orderBy}_${order}`}
                    onSortChange={(value) => {
                        const [field, direction] = value.split('_').reduce((acc: string[], part) => {
                            if (part === 'asc' || part === 'desc') {
                                acc[1] = part;
                            } else {
                                acc[0] = acc[0] ? `${acc[0]}_${part}` : part;
                            }
                            return acc;
                        }, ['', 'desc']);
                        setOrderBy(field);
                        setOrder(direction as 'asc' | 'desc');
                    }}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <InvoiceCollectionTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={total}
                                numSelected={selected.length}
                                onSort={handleSort}
                                onSelectAllRows={handleSelectAllRows}
                                hideCheckbox
                                showIndex
                                headLabel={TABLE_HEAD}
                            />
                            <TableBody>
                                {tableData.map((row, index) => (
                                    <InvoiceCollectionTableRow
                                        key={row.name}
                                        index={page * rowsPerPage + index}
                                        hideCheckbox
                                        row={row}
                                        selected={selected.includes(row.name)}
                                        onSelectRow={() => handleSelectRow(row.name)}
                                        onView={() => handleViewRow(row.name)}
                                        onEdit={() => handleEditRow(row.name)}
                                        onDelete={() => handleDeleteRow(row.name)}
                                        isLatest={row.isLatest}
                                    />
                                ))}

                                {notFound && (
                                    <TableNoData colSpan={10} searchQuery={search} />
                                )}

                                {empty && (
                                    <TableRow>
                                        <TableCell colSpan={10}>
                                            <EmptyContent
                                                title="No invoice collections found"
                                                description="Track your invoice payments and collections here."
                                                icon="solar:bill-check-bold-duotone"
                                            />
                                        </TableCell>
                                    </TableRow>
                                )}

                                {!empty && !notFound && (
                                    <TableEmptyRows
                                        height={68}
                                        emptyRows={tableData.length < 5 ? 5 - tableData.length : 0}
                                    />
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Scrollbar>

                <TablePagination
                    page={page}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    onPageChange={handleChangePage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Card>

            <InvoiceCollectionTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                options={{
                    customers: customerOptions,
                    invoices: invoiceOptions,
                    modesOfPayment: modeOfPaymentOptions,
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
                content="Are you sure you want to delete this collection?"
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

    return <DashboardContent maxWidth={false} sx={{mt: 2}}>{content}</DashboardContent>;
}