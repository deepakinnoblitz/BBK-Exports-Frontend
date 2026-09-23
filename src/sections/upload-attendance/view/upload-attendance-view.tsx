import dayjs from 'dayjs';
import { useBoolean } from 'minimal-shared/hooks';
import { useState, useCallback, useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useUploadAttendance } from 'src/hooks/useUploadAttendance';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    importAttendance,
    deleteUploadAttendance,
    createUploadAttendance,
    updateUploadAttendance,
} from 'src/api/upload-attendance';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { TableNoData, TableEmptyRows, TableHeadCustom, TableSelectedAction } from 'src/components/table/index';

import { LeadTableToolbar } from '../../lead/lead-table-toolbar';
import { UploadAttendanceTableRow } from '../upload-attendance-table-row';
import { UploadAttendanceFormDialog } from '../upload-attendance-form-dialog';
import { UploadAttendanceTableFiltersDrawer } from '../upload-attendance-table-filters-drawer';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'sno', label: 'Sno', align: 'center' },
    { id: 'name', label: 'ID' },
    { id: 'upload_date', label: 'Upload Date' },
    { id: 'att_fr_date', label: 'From Date' },
    { id: 'att_to_date', label: 'To Date' },
    { id: 'file', label: 'File' },
    { id: 'import', label: 'Import' },
    { id: 'actions', label: 'Actions', align: 'right' },
];

// ----------------------------------------------------------------------

export function UploadAttendanceView() {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('modified_desc');
    const [filters, setFilters] = useState<any>({
        startDate: null,
        endDate: null,
    });
    const [openFilters, setOpenFilters] = useState(false);

    const [currentRecord, setCurrentRecord] = useState<any>(null);
    const [importing, setImporting] = useState<string | null>(null);

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const formDialog = useBoolean();


    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        recordId: string;
    }>({
        open: false,
        recordId: '',
    });


    const dateFilters = useMemo(() => ({
        startDate: filters.startDate ? dayjs(filters.startDate).format('YYYY-MM-DD') : undefined,
        endDate: filters.endDate ? dayjs(filters.endDate).format('YYYY-MM-DD') : undefined,
    }), [filters.startDate, filters.endDate]);

    const { data, total, loading, refetch } = useUploadAttendance(
        page + 1,
        rowsPerPage,
        filterName,
        sortBy,
        dateFilters
    );

    const handleChangePage = useCallback((event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    const handleFilters = useCallback((update: any) => {
        setFilters((prev: any) => ({ ...prev, ...update }));
        setPage(0);
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({
            startDate: null,
            endDate: null,
        });
        setPage(0);
    }, []);

    const canReset = filters.startDate !== null || filters.endDate !== null || !!filterName;

    const handleNewRecord = useCallback(() => {
        setCurrentRecord(null);
        formDialog.onTrue();
    }, [formDialog]);

    const handleEditRow = useCallback((row: any) => {
        setCurrentRecord(row);
        formDialog.onTrue();
    }, [formDialog]);

    const handleDeleteRow = useCallback((id: string) => {
        setDeleteDialog({ open: true, recordId: id });
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        try {
            await deleteUploadAttendance(deleteDialog.recordId);
            setSnackbar({ open: true, message: 'Record deleted successfully', severity: 'success' });
            setDeleteDialog({ open: false, recordId: '' });
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to delete record', severity: 'error' });
            setDeleteDialog({ open: false, recordId: '' });
        }
    }, [deleteDialog.recordId, refetch]);



    const handleImport = useCallback(async (id: string) => {
        setImporting(id);
        try {
            await importAttendance(id);
            setSnackbar({ open: true, message: 'Import completed successfully', severity: 'success' });
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to import attendance', severity: 'error' });
        } finally {
            setImporting(null);
        }
    }, [refetch]);


    const handleFormSubmit = useCallback(async (formData: any) => {
        try {
            if (currentRecord) {
                await updateUploadAttendance(currentRecord.name, formData);
            } else {
                await createUploadAttendance(formData);
            }
            refetch();
        } catch (error: any) {
            throw new Error(error.message || 'Failed to save record');
        }
    }, [currentRecord, refetch]);

    const emptyRows = data.length < 5 ? 5 - data.length : 0;
    const notFound = !loading && data.length === 0 && !!filterName;
    const empty = !loading && data.length === 0 && !filterName;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box display="flex" alignItems="center" mb={5}>
                <Typography variant="h4" flexGrow={1}>
                    Import Attendance
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={handleNewRecord}
                    sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                >
                    Upload Attendance
                </Button>
            </Box>

            <Card>
                <LeadTableToolbar
                    numSelected={0}
                    filterName={filterName}
                    onFilterName={(e) => {
                        setFilterName(e.target.value);
                        setPage(0);
                    }}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    searchPlaceholder="Search attendance..."
                    sortOptions={[
                        { value: 'modified_desc', label: 'Newest First' },
                        { value: 'modified_asc', label: 'Oldest First' },
                        { value: 'att_fr_date_desc', label: 'Latest From Date' },
                        { value: 'att_fr_date_asc', label: 'Earliest From Date' },
                    ]}
                    filterLabel="Status"
                />

                <Scrollbar>
                    <TableContainer sx={{ minWidth: 800 }}>
                        <Table>
                            <TableHeadCustom
                                headLabel={TABLE_HEAD}
                                rowCount={data.length}
                                numSelected={0}
                                onSort={() => { }}
                                onSelectAllRows={() => { }}
                                hideCheckbox
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
                                            <UploadAttendanceTableRow
                                                key={row.name}
                                                row={row}
                                                index={page * rowsPerPage + index}
                                                onEditRow={() => handleEditRow(row)}
                                                onDeleteRow={() => handleDeleteRow(row.name)}
                                                onImport={() => handleImport(row.name)}
                                                importing={importing === row.name}
                                            />
                                        ))}

                                        {!empty && !notFound && (
                                            <TableEmptyRows
                                                height={52}
                                                emptyRows={emptyRows}
                                            />
                                        )}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <EmptyContent
                                                        title="No Attendance Uploaded"
                                                        description="You haven't uploaded any attendance records yet."
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

            <UploadAttendanceFormDialog
                open={formDialog.value}
                onClose={formDialog.onFalse}
                onSubmit={handleFormSubmit}
                currentData={currentRecord}
            />

            <UploadAttendanceTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
            />

            <ConfirmDialog
                open={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, recordId: '' })}
                title="Delete Record"
                content="Are you sure you want to delete this record? This action cannot be undone."
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

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardContent>


    );
}
