import { useState } from 'react';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useHRDocumentCategoryList } from 'src/hooks/use-masters';

import { DashboardContent } from 'src/layouts/dashboard';
import { deleteHRDocumentCategoryMaster } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { MasterEmptyState } from 'src/sections/master/master-empty-state';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../../lead/table-no-data';
import { LeadTableToolbar } from '../../../lead/lead-table-toolbar';
import { HRDocumentCategoryDialog } from '../hr-document-category-dialog';
import { ProposalTableHead } from '../../../proposal/proposal-table-head';
import { HRDocumentCategoryTableRow } from '../hr-document-category-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'category_name', label: 'Category Name', minWidth: 220 },
    { id: 'description', label: 'Description', width: 280 },
    { id: 'status', label: 'Status', align: 'center', width: 140 },
    { id: 'actions', label: 'Actions', align: 'right' },
];

const SORT_OPTIONS = [
    { value: 'modified_desc', label: 'Newest First' },
    { value: 'modified_asc', label: 'Oldest First' },
];

// ----------------------------------------------------------------------

export function HRDocumentCategoryView() {
    const { user } = useAuth();
    const actionPerms = (user?.permissions?.actions as any)?.hr_document_category;
    const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const canCreate = hasCustomPerms ? !!actionPerms?.create : true;
    const canEdit = hasCustomPerms ? !!actionPerms?.edit : true;
    const canDelete = hasCustomPerms ? !!actionPerms?.delete : true;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');

    const [openForm, setOpenForm] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({
        open: false,
        id: null,
    });

    const { enqueueSnackbar } = useSnackbar();

    const { data, total, loading, refetch } = useHRDocumentCategoryList(
        page + 1,
        rowsPerPage,
        filterName,
        orderBy,
        order
    );

    const notFound = !data.length && !!filterName;
    const empty = !loading && !data.length && !filterName;

    const handleSortChange = (value: string) => {
        const [id, ord] = value.split('_');
        setOrderBy(id);
        setOrder(ord as 'asc' | 'desc');
    };

    const handleOpenCreate = () => {
        setSelectedId(null);
        setOpenForm(true);
    };

    const handleEditRow = (id: string) => {
        setSelectedId(id);
        setOpenForm(true);
    };

    const handleDeleteRow = (id: string) => {
        setConfirmDelete({ open: true, id });
    };

    const handleConfirmDelete = async () => {
        if (confirmDelete.id) {
            setDeleting(true);
            try {
                await deleteHRDocumentCategoryMaster(confirmDelete.id);
                enqueueSnackbar('HR document category deleted successfully', { variant: 'success' });
                refetch();
            } catch (error: any) {
                enqueueSnackbar(error.message || 'Failed to delete HR document category', { variant: 'error' });
            } finally {
                setDeleting(false);
                setConfirmDelete({ open: false, id: null });
            }
        }
    };

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 5 }}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    HR Document Category List
                </Typography>
                {canCreate && (
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                        sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                    >
                        New Category
                    </Button>
                )}
            </Stack>

            <Card>
                <LeadTableToolbar
                    numSelected={0}
                    filterName={filterName}
                    onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
                        setFilterName(event.target.value);
                        setPage(0);
                    }}
                    searchPlaceholder="Search category name or description..."
                    sortOptions={SORT_OPTIONS}
                    sortBy={`${orderBy}_${order}`}
                    onSortChange={handleSortChange}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 960 }}>
                            <ProposalTableHead
                                rowCount={total}
                                numSelected={0}
                                onSelectAllRows={() => {}}
                                hideCheckbox
                                showIndex
                                headLabel={TABLE_HEAD}
                            />
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <HRDocumentCategoryTableRow
                                                key={row.name}
                                                row={row}
                                                index={page * rowsPerPage + index + 1}
                                                onEditRow={() => handleEditRow(row.name)}
                                                onDeleteRow={() => handleDeleteRow(row.name)}
                                                canEdit={canEdit}
                                                canDelete={canDelete}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <MasterEmptyState
                                                masterName="HR Document Category"
                                                colSpan={5}
                                            />
                                        )}

                                        {!empty && !notFound && data.length < 5 && (
                                            <>
                                                {Array.from({ length: 5 - data.length }).map((_, i) => (
                                                    <TableRow
                                                        key={`empty-${i}`}
                                                        sx={{
                                                            height: 56,
                                                            '& td': { borderBottom: 'none' },
                                                        }}
                                                    >
                                                        <TableCell colSpan={5} />
                                                    </TableRow>
                                                ))}
                                            </>
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
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </Card>

            <HRDocumentCategoryDialog
                open={openForm}
                onClose={() => setOpenForm(false)}
                onSuccess={refetch}
                id={selectedId}
            />

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Delete HR Document Category"
                content="Are you sure you want to delete this HR Document Category?"
                action={
                    <Button
                        variant="contained"
                        color="error"
                        loading={deleting}
                        onClick={handleConfirmDelete}
                    >
                        Delete
                    </Button>
                }
            />
        </DashboardContent>
    );
}
