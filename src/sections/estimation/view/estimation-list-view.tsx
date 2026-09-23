import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import Backdrop from '@mui/material/Backdrop';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { useEstimations } from 'src/hooks/useEstimations';

import { handleDownload, handleDirectPrint } from 'src/utils/print';

import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import { deleteEstimation, getEstimationPrintUrl } from 'src/api/estimation';

import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { emptyRows } from '../utils';
import { TableNoData } from '../table-no-data';
import { TableEmptyRows } from '../table-empty-rows';
import { EstimationTableRow } from '../estimation-table-row';
import { EstimationTableHead } from '../estimation-table-head';
import { EstimationTableToolbar } from '../estimation-table-toolbar';
import { EstimationTableFiltersDrawer } from '../estimation-table-filters-drawer';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'ref_no', label: 'Ref No' },
    { id: 'billing_name', label: 'Billing Name' },
    { id: 'client_name', label: 'Client' },
    { id: 'estimate_date', label: 'Date' },
    { id: 'grand_total', label: 'Amount', align: 'right' },
    { id: 'actions', label: 'Actions', align: 'right' },
];

// ----------------------------------------------------------------------

interface Props {
    hideTitle?: boolean;
}

export function EstimationListView({ hideTitle }: Props) {
    const table = useTable();
    const router = useRouter();

    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('modified_desc');
    const [printing, setPrinting] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState({
        client_name: 'all',
        ref_no: '',
        estimate_date: '',
    });
    const [customerOptions, setCustomerOptions] = useState<any[]>([]);

    const [refNoOptions, setRefNoOptions] = useState<string[]>([]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                // Fetch Contacts for Customer filter
                const contacts = await getDoctypeList('Contacts', ['name', 'first_name', 'company_name']);
                setCustomerOptions(contacts.map((c: any) => ({ name: c.name, customer_name: c.first_name || c.name })));

                // Fetch Estimations for Ref No filter
                const estimations = await getDoctypeList('Estimation', ['ref_no']);
                // Unique ref numbers
                const refs = Array.from(new Set(estimations.map((e: any) => e.ref_no).filter(Boolean))) as string[];
                setRefNoOptions(refs);
            } catch (err) {
                console.error('Failed to fetch filter options', err);
            }
        };

        fetchOptions();
    }, []);

    const { data, total, loading, refetch } = useEstimations(
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
            client_name: 'all',
            ref_no: '',
            estimate_date: '',
        });
        table.onResetPage();
    };

    const canReset = filters.client_name !== 'all' || !!filters.ref_no || !!filters.estimate_date || !!filterName;

    const handleFilterName = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            table.onResetPage();
        },
        [table]
    );

    const handleCreateNew = () => {
        router.push('/estimations/new');
    };

    const handleEditRow = (id: string) => {
        router.push(`/estimations/${encodeURIComponent(id)}/edit`);
    };

    const handleViewRow = (id: string) => {
        router.push(`/estimations/${encodeURIComponent(id)}/view`, { from: '/deals?tab=estimations' });
    };

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handlePrintRow = (id: string, ref_no?: string) => {
        // Now Print triggers Direct Download as requested
        handleDownload(
            getEstimationPrintUrl(id),
            `${ref_no || id}.pdf`,
            () => setPrinting(true),
            () => setPrinting(false)
        );
    };

    const handlePreviewRow = (id: string) => {
        // Now Preview triggers the "Current print functionality" (dialog) as requested
        handleDirectPrint(
            getEstimationPrintUrl(id),
            () => setPrinting(true),
            () => setPrinting(false)
        );
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteEstimation(confirmDelete.id);
            setSnackbar({ open: true, message: 'Estimation deleted successfully', severity: 'success' });
            await refetch();
        } catch (e) {
            console.error(e);
            setSnackbar({ open: true, message: 'Failed to delete estimation', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const notFound = !loading && data.length === 0 && (!!filterName || canReset);
    const empty = !loading && data.length === 0 && !filterName && !canReset;

    const renderContent = (
        <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                {!hideTitle && (
                    <Typography variant="h4">Estimations</Typography>
                )}
                {hideTitle && <Box sx={{ flexGrow: 1 }} />}
                {/* <Button
                    variant="contained"
                    color="info"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={handleCreateNew}
                    sx={{
                        ...(hideTitle && {
                            bgcolor: '#059669',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#047857' }
                        })
                    }}
                >
                    New Estimation
                </Button> */}
            </Stack>
            <Card>
                <EstimationTableToolbar
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
                        <Table sx={{ minWidth: 800 }}>
                            <EstimationTableHead
                                rowCount={total}
                                numSelected={table.selected.length}
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
                                        <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <EstimationTableRow
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
                                                    estimate_date: row.estimate_date,
                                                    grand_total: row.grand_total || 0,
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

                                        {notFound && <TableNoData colSpan={8} searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <EmptyContent
                                                        title="No estimations found"
                                                        description="Create a new estimation to track your sales pipeline."
                                                        icon="solar:document-text-bold-duotone"
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

            <EstimationTableFiltersDrawer
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
                content="Are you sure you want to delete this estimation?"
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

    if (hideTitle) {
        return renderContent;
    }

    return <DashboardContent maxWidth={false} sx={{ mt: 2 }}>{renderContent}</DashboardContent>;
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
