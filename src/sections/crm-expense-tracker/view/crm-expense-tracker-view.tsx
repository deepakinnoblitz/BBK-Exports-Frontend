import type dayjs from 'dayjs';

import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    createCRMExpenseTracker,
    updateCRMExpenseTracker,
    deleteCRMExpenseTracker,
    fetchCRMExpenseTrackerList,
    fetchCRMExpenseTrackerStats
} from 'src/api/crm-expense-tracker';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../lead/table-no-data';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import CRMExpenseTrackerDialog from '../crm-expense-tracker-dialog';
import CRMExpenseTrackerStatsCards from '../crm-expense-tracker-stats-cards';
import { CRMExpenseTrackerTableRow } from '../crm-expense-tracker-table-row';
import { LeadTableHead as CRMExpenseTrackerTableHead } from '../../lead/lead-table-head';
import CRMExpenseTrackerTableFiltersDrawer from '../crm-expense-tracker-table-filters-drawer';
import { LeadTableToolbar as CRMExpenseTrackerTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

const SORT_OPTIONS = [
    { value: 'creation_desc', label: 'Newest First' },
    { value: 'creation_asc', label: 'Oldest First' },
    { value: 'amount_desc', label: 'Amount: High to Low' },
    { value: 'amount_asc', label: 'Amount: Low to High' },
    { value: 'titlenotes_asc', label: 'Title: A to Z' },
    { value: 'titlenotes_desc', label: 'Title: Z to A' },
];

export default function CRMExpenseTrackerView() {
    const { enqueueSnackbar } = useSnackbar();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('creation_desc');
    const [selected, setSelected] = useState<string[]>([]);

    const [filters, setFilters] = useState({
        type: 'all',
        startDate: null as dayjs.Dayjs | null,
        endDate: null as dayjs.Dayjs | null,
    });

    const [openFilters, setOpenFilters] = useState(false);

    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total_income: 0, total_expense: 0, balance: 0 });

    const [openDialog, setOpenDialog] = useState(false);
    const [currentData, setCurrentData] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.crm_expenses;
    const canCreateExpense = hasCustomPerms && user?.permissions?.actions?.crm_expenses ? !!user?.permissions?.actions?.crm_expenses?.create : true;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.crm_expenses?.edit : true;
    const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.crm_expenses?.delete : true;
    const showActions = displayEdit || displayDelete;
    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const startDate = filters.startDate ? filters.startDate.startOf('day').format('YYYY-MM-DD HH:mm:ss') : undefined;
            const endDate = filters.endDate ? filters.endDate.endOf('day').format('YYYY-MM-DD HH:mm:ss') : undefined;

            const [listRes, statsRes] = await Promise.all([
                fetchCRMExpenseTrackerList({
                    page: page + 1,
                    page_size: rowsPerPage,
                    search: filterName,
                    filters: {
                        type: filters.type,
                        start_date: startDate,
                        end_date: endDate,
                    },
                    sort_by: sortBy,
                }),
                fetchCRMExpenseTrackerStats({
                    start_date: startDate,
                    end_date: endDate,
                })
            ]);

            setData(listRes.data);
            setTotal(listRes.total);
            setStats(statsRes);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, filters, sortBy]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handleOpenDialog = (rowData?: any) => {
        setCurrentData(rowData || null);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setCurrentData(null);
    };

    const handleSubmit = async (formData: any) => {
        try {
            if (currentData) {
                await updateCRMExpenseTracker(currentData.name, formData);
                enqueueSnackbar('Expense Tracker entry updated successfully', { variant: 'success' });
            } else {
                await createCRMExpenseTracker(formData);
                enqueueSnackbar('Expense Tracker entry created successfully', { variant: 'success' });
            }
            handleCloseDialog();
            refreshData();
        } catch (error: any) {
            console.error(error);
            const action = currentData ? 'update' : 'create';
            enqueueSnackbar(error.message || `Failed to ${action} entry, please try again`, { variant: 'error' });
        }
    };

    const handleDelete = async () => {
        if (confirmDelete.id) {
            try {
                await deleteCRMExpenseTracker(confirmDelete.id);
                setConfirmDelete({ open: false, id: null });
                enqueueSnackbar('Expense Tracker entry deleted successfully', { variant: 'success' });
                refreshData();
            } catch (error: any) {
                console.error(error);
                enqueueSnackbar(error.message || 'Failed to delete entry', { variant: 'error' });
            }
        }
    };

    const handleSelectAllRows = (checked: boolean) => {
        if (checked) {
            setSelected(data.map((row) => row.name));
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

    const handleFilters = (update: any) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            type: 'all',
            startDate: null,
            endDate: null,
        });
    };

    const canReset = filters.type !== 'all' || !!filters.startDate || !!filters.endDate || !!filterName;

    const notFound = !loading && !data.length && (!!filterName || canReset);
    const empty = !loading && !data.length && !filterName && !canReset;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Expense Tracker
                </Typography>

                {canCreateExpense && (
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={() => handleOpenDialog()}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        Add Expense Tracker
                    </Button>
                )}

            </Box>

            <CRMExpenseTrackerStatsCards stats={stats} />

            <Card>
                <CRMExpenseTrackerTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFilterName(e.target.value);
                        setPage(0);
                    }}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    searchPlaceholder="Search by ID or title..."
                    onDelete={() => { }}
                    sortBy={sortBy}
                    onSortChange={(value: string) => { setSortBy(value); setPage(0); }}
                    sortOptions={SORT_OPTIONS}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <CRMExpenseTrackerTableHead
                                rowCount={total}
                                numSelected={selected.length}
                                onSelectAllRows={handleSelectAllRows}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'titlenotes', label: 'Title (Notes)' },
                                    { id: 'type', label: 'Type' },
                                    { id: 'date_time', label: 'Date' },
                                    { id: 'amount', label: 'Amount' },
                                    ...(showActions
                                        ? [{ id: 'actions', label: 'Actions', align: 'right' as const }]
                                        : []),
                                ]}
                            />
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <CRMExpenseTrackerTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                row={{
                                                    id: row.name,
                                                    name: row.name,
                                                    type: row.type,
                                                    titlenotes: row.titlenotes,
                                                    amount: row.amount,
                                                    date_time: row.date_time,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onEdit={() => handleOpenDialog(row)}
                                                onDelete={() => setConfirmDelete({ open: true, id: row.name })}
                                                hideCheckbox
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={7}>
                                                    <EmptyContent
                                                        title="No records found"
                                                        description="You haven't added any expense tracker records yet. Click 'Add Expense Tracker' to get started."
                                                        icon="solar:wallet-money-bold-duotone"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {data.length < rowsPerPage && !empty && (
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
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </Card>

            <CRMExpenseTrackerDialog
                open={openDialog}
                onClose={handleCloseDialog}
                onSubmit={handleSubmit}
                currentData={currentData}
            />

            <CRMExpenseTrackerTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
            />

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Delete"
                content="Are you sure you want to delete this record?"
                action={
                    <Button variant="contained" color="error" onClick={handleDelete}>
                        Delete
                    </Button>
                }
            />
        </DashboardContent>
    );
}
