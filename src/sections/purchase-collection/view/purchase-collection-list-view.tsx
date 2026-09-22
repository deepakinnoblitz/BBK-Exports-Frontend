import type { PurchaseCollection } from 'src/api/purchase-collection';

import { useLocation } from 'react-router-dom';
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
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchPurchaseCollections, deletePurchaseCollection } from 'src/api/purchase-collection';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from '../../invoice/table-no-data';
import { TableEmptyRows } from '../../invoice/table-empty-rows';
import PurchaseCollectionTableRow from '../purchase-collection-table-row';
import PurchaseCollectionTableHead from '../purchase-collection-table-head';
import PurchaseCollectionTableToolbar from '../purchase-collection-table-toolbar';
import { PurchaseCollectionTableFiltersDrawer } from '../purchase-collection-table-filters-drawer';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'name', label: 'ID' },
    { id: 'purchase', label: 'Purchase ID' },
    { id: 'collection_date', label: 'Date' },
    { id: 'mode_of_payment', label: 'Mode' },
    { id: 'amount_to_pay', label: 'Amount to Pay', align: 'right' },
    { id: 'amount_collected', label: 'Amount', align: 'right' },
    { id: 'amount_pending', label: 'Pending', align: 'right' },
    { id: '', label: 'Actions', align: 'right' },
];

// ----------------------------------------------------------------------

type Props = {
    hideHeader?: boolean;
};

export function PurchaseCollectionListView({ hideHeader }: Props) {
    const router = useRouter();
    const location = useLocation();

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState('modified');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [selected, setSelected] = useState<string[]>([]);

    const [tableData, setTableData] = useState<PurchaseCollection[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [filterName, setFilterName] = useState('');
    const [loading, setLoading] = useState(true);

    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        if (location.state?.message) {
            setSnackbar({
                open: true,
                message: location.state.message,
                severity: 'success',
            });
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState({
        vendor_name: 'all',
        mode_of_payment: 'all',
    });
    const [vendorOptions, setVendorOptions] = useState<{ name: string; first_name: string }[]>([]);
    const [paymentTypeOptions, setPaymentTypeOptions] = useState<{ name: string }[]>([]);

    const getCollections = useCallback(async () => {
        try {
            setLoading(true);
            const { data, total } = await fetchPurchaseCollections({
                page: page + 1,
                page_size: rowsPerPage,
                search: filterName,
                sort_by: `${orderBy}_${order}`,
                filterValues: filters,
            });

            // Determine latest collection for each purchase based on collection_date (with creation as tiebreaker)
            const latestCollectionsByPurchase = new Map<string, string>();
            data.forEach((collection: any) => {
                const existing = latestCollectionsByPurchase.get(collection.purchase);
                if (!existing) {
                    latestCollectionsByPurchase.set(collection.purchase, collection.name);
                } else {
                    const existingCollection = data.find((c: any) => c.name === existing);
                    const collectionDate = new Date(collection.collection_date);
                    const existingDate = new Date(existingCollection?.collection_date || 0);

                    if (collectionDate > existingDate ||
                        (collectionDate.getTime() === existingDate.getTime() &&
                            new Date(collection.creation) > new Date(existingCollection?.creation || 0))) {
                        latestCollectionsByPurchase.set(collection.purchase, collection.name);
                    }
                }
            });

            // Add isLatest flag to each collection
            const dataWithLatestFlag = data.map((collection: any) => ({
                ...collection,
                isLatest: latestCollectionsByPurchase.get(collection.purchase) === collection.name
            }));

            setTableData(dataWithLatestFlag);
            setTotalRecords(total);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, orderBy, order, filters]);

    const handleFilters = useCallback((name: string, value: string) => {
        setFilters((prevState) => ({
            ...prevState,
            [name]: value,
        }));
        setPage(0);
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({
            vendor_name: 'all',
            mode_of_payment: 'all',
        });
        setPage(0);
    }, []);

    const canReset = filters.vendor_name !== 'all' || filters.mode_of_payment !== 'all' || !!filterName;

    useEffect(() => {
        getCollections();
    }, [getCollections]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [vendorsRes, paymentTypesRes] = await Promise.all([
                    fetch("/api/method/frappe.client.get_list?doctype=Contacts&fields=[\"name\",\"first_name\"]&link_full_match=0&limit_page_length=999&filters=[[\"Contacts\",\"customer_type\",\"=\",\"Purchase\"]]", {
                        credentials: "include"
                    }),
                    fetch("/api/method/frappe.client.get_list?doctype=Payment Type&fields=[\"name\"]", {
                        credentials: "include"
                    })
                ]);

                if (vendorsRes.ok) {
                    const data = await vendorsRes.json();
                    setVendorOptions(data.message || []);
                }
                if (paymentTypesRes.ok) {
                    const data = await paymentTypesRes.json();
                    setPaymentTypeOptions(data.message || []);
                }
            } catch (error) {
                console.error("Failed to fetch filter options", error);
            }
        };

        fetchOptions();
    }, []);

    const handleFilterName = useCallback(
        (value: string) => {
            setFilterName(value);
            setPage(0);
        },
        []
    );

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

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deletePurchaseCollection(confirmDelete.id);
            setSnackbar({ open: true, message: 'Collection deleted successfully', severity: 'success' });
            getCollections();
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

    const notFound = !loading && tableData.length === 0 && (!!filterName || canReset);
    const empty = !loading && tableData.length === 0 && !filterName && !canReset;

    const totalHeadCols = TABLE_HEAD.length + 1; // + 1 for Sno

    // Assuming this is part of a functional component, and `router` is defined via `useRouter()`
    // and `hideHeader` is a prop passed to this component.
    // For example: export default function PurchaseCollectionListView({ hideHeader = false }: { hideHeader?: boolean }) {
    // And `router` is defined as: const router = useRouter();

    const handleCreateNew = useCallback(() => {
        router.push('/purchase-collections/new');
    }, [router]);

    const content = (
        <>
            {!hideHeader && (
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
                    <Typography variant="h4">Purchase Settlements</Typography>
                    <Button
                        variant="contained"
                        color="info"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleCreateNew}
                    >
                        New Settlement
                    </Button>
                </Stack>
            )}

            <Card>
                <PurchaseCollectionTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterName(e.target.value)}
                    sortBy={`${orderBy}_${order}`}
                    onSortChange={(value: string) => {
                        const [field, direction] = value.split('_').reduce((acc: string[], part: string) => {
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

                <PurchaseCollectionTableFiltersDrawer
                    open={openFilters}
                    onOpen={() => setOpenFilters(true)}
                    onClose={() => setOpenFilters(false)}
                    filters={filters}
                    onFilters={(newFilters) => {
                        setFilters((prev) => ({ ...prev, ...newFilters }));
                        setPage(0);
                    }}
                    canReset={canReset}
                    onResetFilters={handleResetFilters}
                    options={{
                        vendors: vendorOptions,
                        payment_types: paymentTypeOptions,
                    }}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
                            <PurchaseCollectionTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={totalRecords}
                                numSelected={selected.length}
                                onSort={handleSort}
                                onSelectAllRows={handleSelectAllRows}
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
                                        {tableData.map((row, index) => (
                                            <PurchaseCollectionTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={row}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onEditRow={() => router.push(`/purchase-collections/${row.name}/edit`)}
                                                onDeleteRow={() => handleDeleteRow(row.name)}
                                                onViewRow={() => router.push(`/purchase-collections/${row.name}/view`)}
                                                isLatest={(row as any).isLatest}
                                            />
                                        ))}

                                        {tableData.length > 0 && (
                                            <TableEmptyRows
                                                height={77}
                                                emptyRows={tableData.length < 5 ? 5 - tableData.length : 0}
                                            />
                                        )}

                                        {notFound && (
                                            <TableNoData searchQuery={filterName} />
                                        )}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={totalHeadCols}>
                                                    <EmptyContent
                                                        title="No purchase settlements found"
                                                        description="Track your purchase payments to vendors here."
                                                        icon="solar:bill-check-bold-duotone"
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
                    page={page}
                    component="div"
                    count={totalRecords}
                    rowsPerPage={rowsPerPage}
                    onPageChange={handleChangePage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Card>

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
