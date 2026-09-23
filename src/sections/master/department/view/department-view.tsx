import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import Snackbar from '@mui/material/Snackbar';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useDepartments } from 'src/hooks/use-masters';

import { deleteDepartment } from 'src/api/masters';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { MasterEmptyState } from 'src/sections/master/master-empty-state';

import { useAuth } from 'src/auth/auth-context';

import { DepartmentDialog } from '../department-dialog';
import { TableNoData } from '../../../lead/table-no-data';
import { DepartmentTableRow } from '../department-table-row';
import { LeadTableHead } from '../../../lead/lead-table-head';
import { TableEmptyRows } from '../../../lead/table-empty-rows';
import { LeadTableToolbar } from '../../../lead/lead-table-toolbar';
import { DepartmentDetailsDialog } from '../department-details-dialog';
import DepartmentTableFiltersDrawer from '../department-table-filters-drawer';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'department_name', label: 'Department' },
  { id: 'department_head', label: 'Head' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', align: 'right' },
];

const SORT_OPTIONS = [
  { value: 'modified_desc', label: 'Newest First' },
  { value: 'modified_asc', label: 'Oldest First' },
];

// ----------------------------------------------------------------------


export function DepartmentView() {
  const { user } = useAuth();
  const actionPerms = user?.permissions?.actions?.department;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canCreateDept = hasCustomPerms ? !!actionPerms?.create : true;
  const canEditDept = hasCustomPerms ? !!actionPerms?.edit : true;
  const canDeleteDept = hasCustomPerms ? !!actionPerms?.delete : true;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterName, setFilterName] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState('modified');
  const [selected, setSelected] = useState<string[]>([]);
  
  const [filters, setFilters] = useState({ status: 'all' });
  const [openFilters, setOpenFilters] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbar({ ...snackbar, open: false });
  };

  const { data, total, loading, refetch } = useDepartments(
    page + 1,
    rowsPerPage,
    filterName,
    orderBy,
    order,
    filters.status
  );

  const notFound = !data.length && !!filterName;
  const empty = !loading && !data.length && !filterName;

  const handleOpenFilters = () => setOpenFilters(true);
  const handleCloseFilters = () => setOpenFilters(false);

  const handleFilters = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(0);
  };

  const handleResetFilters = () => {
    setFilters({ status: 'all' });
  };

  const handleSort = (id: string) => {
    const isAsc = orderBy === id && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(id);
  };

  const handleSortChange = (value: string) => {
    if (value === 'modified_desc') {
      setOrderBy('modified');
      setOrder('desc');
    } else if (value === 'modified_asc') {
      setOrderBy('modified');
      setOrder('asc');
    }
  };

  const getSortByValue = () => `${orderBy}_${order}`;

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const newSelected = data.map((n) => n.name);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelectRow = (id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
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

  const handleOpenCreate = () => {
    setSelectedId(null);
    setOpenForm(true);
  };

  const handleEditRow = (id: string) => {
    setSelectedId(id);
    setOpenForm(true);
  };

  const handleViewRow = (id: string) => {
    setDetailsId(id);
    setOpenDetails(true);
  };

  const handleDeleteRow = (id: string) => {
    setConfirmDelete({ open: true, id });
  };

  const handleConfirmDelete = async () => {
    if (confirmDelete.id) {
      try {
        await deleteDepartment(confirmDelete.id);
        setSnackbar({ open: true, message: 'Department deleted successfully', severity: 'success' });
        refetch();
      } catch (error: any) {
        setSnackbar({ open: true, message: error.message || 'Failed to delete department', severity: 'error' });
        console.error(error);
      } finally {
        setConfirmDelete({ open: false, id: null });
      }
    }
  };

  const onChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const onChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const canReset = filters.status !== 'all' || !!filterName;

  return (
    <DashboardContent maxWidth={false} sx={{mt: 2}}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 5 }}>
        <Typography variant="h4">Department List</Typography>
        {canCreateDept && (
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
            sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
          >
            New Department
          </Button>
        )}
      </Stack>

      <Card>
        <LeadTableToolbar
          numSelected={selected.length}
          filterName={filterName}
          onFilterName={(event) => {
            setFilterName(event.target.value);
            setPage(0);
          }}
          onOpenFilter={handleOpenFilters}
          searchPlaceholder="Search departments..."
          sortOptions={SORT_OPTIONS}
          sortBy={getSortByValue()}
          onSortChange={handleSortChange}
          canReset={canReset}
        />

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size="medium" sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
              <LeadTableHead
                order={order}
                orderBy={orderBy}
                headLabel={TABLE_HEAD}
                rowCount={total}
                numSelected={selected.length}
                onSelectAllRows={handleSelectAllRows}
                showIndex
                hideCheckbox
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
                      <DepartmentTableRow
                        key={row.name}
                        index={page * rowsPerPage + index}
                        row={row}
                        selected={selected.includes(row.name)}
                        onSelectRow={() => handleSelectRow(row.name)}
                        onEditRow={() => handleEditRow(row.name)}
                        onViewRow={() => handleViewRow(row.name)}
                        onDeleteRow={() => handleDeleteRow(row.name)}
                        canEdit={canEditDept}
                        canDelete={canDeleteDept}
                      />
                    ))}

                    {empty && (
                      <MasterEmptyState
                        masterName="Department"
                        colSpan={5}
                      />
                    )}

                    {notFound && <TableNoData searchQuery={filterName} />}

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
          </Scrollbar>
        </TableContainer>

        <TablePagination
          component="div"
          page={page}
          count={total}
          rowsPerPage={rowsPerPage}
          onPageChange={onChangePage}
          onRowsPerPageChange={onChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Card>

      <DepartmentTableFiltersDrawer
        open={openFilters}
        onOpen={handleOpenFilters}
        onClose={handleCloseFilters}
        canReset={canReset}
        filters={filters}
        onFilters={handleFilters}
        onResetFilters={handleResetFilters}
      />

      <DepartmentDialog
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setSelectedId(null);
        }}
        id={selectedId}
        onSuccess={() => {
          setSnackbar({
            open: true,
            message: `Department ${selectedId ? 'updated' : 'created'} successfully`,
            severity: 'success',
          });
          refetch();
        }}
      />

      <DepartmentDetailsDialog
        open={openDetails}
        onClose={() => {
          setOpenDetails(false);
          setDetailsId(null);
        }}
        departmentId={detailsId}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', whiteSpace: 'pre-line' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        title="Delete"
        content="Are you sure you want to delete this department?"
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />
    </DashboardContent>
  );
}
