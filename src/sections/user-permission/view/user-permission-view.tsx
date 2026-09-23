import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchUserPermissions, createUserPermission, deleteUserPermission } from 'src/api/user-permissions';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from '../../user/table-no-data';
import { TableEmptyRows } from '../../user/table-empty-rows';
import { LeadTableToolbar } from '../../lead/lead-table-toolbar';
import { UserPermissionTableRow } from '../user-permission-table-row';
import { UserPermissionTableHead } from '../user-permission-table-head';
import { UserPermissionFormDialog } from '../user-permission-form-dialog';
import { UserPermissionTableFiltersDrawer } from '../user-permission-table-filters-drawer';

// Android 12 Button Style
const Android12Button = styled(Button)(({ theme }) => ({
    borderRadius: 20,
    textTransform: 'none',
    fontWeight: 500,
    padding: '4px 12px',
    fontSize: '0.875rem',
    boxShadow: 'none',
    '&:hover': {
        boxShadow: 'none',
    },
}));

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'sno', label: 'Sno', align: 'center' },
    { id: 'user', label: 'User' },
    { id: 'allow', label: 'Allow' },
    { id: 'for_value', label: 'For Value' },
    { id: '', label: 'Actions', align: 'right' },
];

// ----------------------------------------------------------------------

export const UserPermissionView = forwardRef(({ hideHeader = false, hideActionButton = false }: { hideHeader?: boolean; hideActionButton?: boolean }, ref) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('creation desc');
    const [filters, setFilters] = useState({
        user: '',
        allow: '',
        for_value: ''
    });

    const [openFilters, setOpenFilters] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState<any>(null);
    const [formData, setFormData] = useState({
        user: '',
        allow: '',
        for_value: '',
        applicable_for: ''
    });

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const [openDelete, setOpenDelete] = useState(false);
    const [permissionToDelete, setPermissionToDelete] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchUserPermissions({
                page: page + 1,
                page_size: rowsPerPage,
                search: filterName,
                filters: filters,
                order_by: sortBy
            });
            setData(result.data);
            setTotal(result.total);
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to load data', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, filters, sortBy]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenCreate = () => {
        setFormData({
            user: '',
            allow: '',
            for_value: '',
            applicable_for: ''
        });
        setSelectedPermission(null);
        setOpenCreate(true);
    };

    useImperativeHandle(ref, () => ({
        handleOpenCreate
    }));

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setSelectedPermission(null);
    };

    const handleEditRow = useCallback((row: any) => {
        setFormData({
            user: row.user,
            allow: row.allow,
            for_value: row.for_value,
            applicable_for: row.applicable_for || ''
        });
        setSelectedPermission(row);
        setOpenCreate(true);
    }, []);

    const handleSubmit = async () => {
        try {
            if (selectedPermission) {
                // For User Permission, updating usually involves re-creating or a specific update call.
                // We'll delete and re-create to ensure unique constraints are managed by Frappe.
                await deleteUserPermission(selectedPermission.name);
                await createUserPermission({
                    user: formData.user,
                    allow: formData.allow,
                    for_value: formData.for_value,
                    applicable_for: formData.applicable_for || undefined
                });
                setSnackbar({ open: true, message: 'User permission updated successfully', severity: 'success' });
            } else {
                await createUserPermission({
                    user: formData.user,
                    allow: formData.allow,
                    for_value: formData.for_value,
                    applicable_for: formData.applicable_for || undefined
                });
                setSnackbar({ open: true, message: 'User permission created successfully', severity: 'success' });
            }
            loadData();
            handleCloseCreate();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to save permission', severity: 'error' });
        }
    };

    const handleDeleteRow = (name: string) => {
        setPermissionToDelete(name);
        setOpenDelete(true);
    };

    const handleConfirmDelete = async () => {
        if (!permissionToDelete) return;
        try {
            await deleteUserPermission(permissionToDelete);
            setSnackbar({ open: true, message: 'User permission deleted successfully', severity: 'success' });
            loadData();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Delete failed', severity: 'error' });
        } finally {
            setOpenDelete(false);
            setPermissionToDelete(null);
        }
    };

    const handleFilters = (update: any) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            user: '',
            allow: '',
            for_value: ''
        });
        setFilterName('');
        setPage(0);
    };

    const canReset = !!filterName || !!filters.user || !!filters.allow || !!filters.for_value;

    const notFound = !loading && data.length === 0 && (!!filterName || canReset);
    const empty = !loading && data.length === 0 && !filterName && !canReset;

    const renderContent = (
        <>
            {!hideActionButton && (
                <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h4" sx={{ flexGrow: 1 }}>
                        {!hideHeader ? 'User Permission' : ''}
                    </Typography>

                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                        sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                    >
                        Add User Permission
                    </Button>
                </Box>
            )}

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
                    searchPlaceholder="Search user permissions..."
                    sortOptions={[
                        { value: 'creation desc', label: 'Newest First' },
                        { value: 'creation asc', label: 'Oldest First' },
                        { value: 'user asc', label: 'User: A to Z' },
                        { value: 'user desc', label: 'User: Z to A' },
                        { value: 'allow asc', label: 'Allow: A to Z' },
                        { value: 'allow desc', label: 'Allow: Z to A' },
                    ]}
                    filterLabel="Filters"
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
                            <UserPermissionTableHead
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
                                            <UserPermissionTableRow
                                                key={row.name}
                                                row={row}
                                                selected={false}
                                                index={page * rowsPerPage + index}
                                                onSelectRow={() => { }}
                                                onEditRow={() => handleEditRow(row)}
                                                onDeleteRow={() => handleDeleteRow(row.name)}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={5}>
                                                    <EmptyContent
                                                        title="No user permissions found"
                                                        description="You haven't created any user permissions yet."
                                                        icon="solar:lock-password-bold-duotone"
                                                        sx={{ py: 5 }}
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
                    component="div"
                    page={page}
                    count={total}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(e, newPage) => {
                        setPage(newPage);
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </Card>

            <UserPermissionTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
            />

            <UserPermissionFormDialog
                open={openCreate}
                onClose={handleCloseCreate}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                isEdit={!!selectedPermission}
            />

            <ConfirmDialog
                open={openDelete}
                onClose={() => setOpenDelete(false)}
                title="Delete User Permission"
                content="Are you sure you want to delete this user permission?"
                action={
                    <Button variant="contained" color="error" onClick={handleConfirmDelete}>
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
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );

    if (hideHeader) {
        return renderContent;
    }

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            {renderContent}
        </DashboardContent>
    );
});
