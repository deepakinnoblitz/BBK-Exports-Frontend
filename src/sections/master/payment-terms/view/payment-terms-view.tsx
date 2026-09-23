import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { usePaymentTerms } from 'src/hooks/use-masters';

import { DashboardContent } from 'src/layouts/dashboard';
import { deletePaymentTerm, PaymentTerm } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { MasterEmptyState } from 'src/sections/master/master-empty-state';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../../lead/table-no-data';
import { PaymentTermsDialog } from '../payment-terms-dialog';
import { LeadTableHead } from '../../../lead/lead-table-head';
import { TableEmptyRows } from '../../../lead/table-empty-rows';
import { PaymentTermsTableRow } from '../payment-terms-table-row';
import { LeadTableToolbar } from '../../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'payment_terms', label: 'Payment Terms' },
  { id: 'actions', label: 'Actions', align: 'right' },
];

const SORT_OPTIONS = [
  { value: 'modified_desc', label: 'Newest First' },
  { value: 'modified_asc', label: 'Oldest First' },
];

// ----------------------------------------------------------------------

export function PaymentTermsView() {
  const { user } = useAuth();
  const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.payment_terms;
  const canCreate = hasCustomPerms && user?.permissions?.actions?.payment_terms ? !!user?.permissions?.actions?.payment_terms?.create : true;
  const canEdit = hasCustomPerms && user?.permissions?.actions?.payment_terms ? !!user?.permissions?.actions?.payment_terms?.edit : true;
  const canDelete = hasCustomPerms && user?.permissions?.actions?.payment_terms ? !!user?.permissions?.actions?.payment_terms?.delete : true;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterName, setFilterName] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState('modified');
  
  const [openForm, setOpenForm] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<PaymentTerm | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const { data, total, loading, refetch } = usePaymentTerms(
    page + 1,
    rowsPerPage,
    filterName,
    orderBy,
    order
  );

  const notFound = !loading && !data.length && !!filterName;
  const empty = !loading && !data.length && !filterName;

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

  const handleOpenCreate = () => {
    setSelectedTerm(null);
    setOpenForm(true);
  };

  const handleEditRow = (row: PaymentTerm) => {
    setSelectedTerm(row);
    setOpenForm(true);
  };

  const handleDeleteRow = (name: string) => {
    setConfirmDelete({ open: true, id: name });
  };

  const handleConfirmDelete = async () => {
    if (confirmDelete.id) {
      try {
        await deletePaymentTerm(confirmDelete.id);
        setSnackbar({ open: true, message: 'Payment Terms deleted successfully', severity: 'success' });
        refetch();
      } catch (error: any) {
        setSnackbar({ open: true, message: error.message || 'Failed to delete', severity: 'error' });
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

  return (
    <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
      <Box display="flex" alignItems="center" mb={5}>
        <Typography variant="h4" flexGrow={1}>
          Payment Terms
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
          >
            New Payment Terms
          </Button>
        )}
      </Box>

      <Card>
        <LeadTableToolbar
          numSelected={0}
          filterName={filterName}
          onFilterName={(event) => {
            setFilterName(event.target.value);
            setPage(0);
          }}
          searchPlaceholder="Search payment terms..."
          sortOptions={SORT_OPTIONS}
          sortBy={`${orderBy}_${order}`}
          onSortChange={handleSortChange}
        />

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size="medium" sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
              <LeadTableHead
                order={order}
                orderBy={orderBy}
                headLabel={TABLE_HEAD}
                rowCount={total}
                numSelected={0}
                onSort={handleSort}
                onSelectAllRows={() => {}}
                showIndex
                hideCheckbox
              />

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 10 }}>
                      <CircularProgress sx={{ color: '#059669' }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {!loading && data.map((row, index) => (
                      <PaymentTermsTableRow
                        key={row.name}
                        index={page * rowsPerPage + index}
                        row={row}
                        onEditRow={() => handleEditRow(row)}
                        onDeleteRow={() => handleDeleteRow(row.name)}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ))}

                    {notFound && <TableNoData searchQuery={filterName} />}

                    {empty && (
                      <MasterEmptyState
                        masterName="Payment Terms"
                        colSpan={3}
                      />
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
          </Scrollbar>
        </TableContainer>

        <TablePagination
          component="div"
          page={page}
          count={total}
          rowsPerPage={rowsPerPage}
          onPageChange={onChangePage}
          onRowsPerPageChange={onChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Card>

      <PaymentTermsDialog
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setSelectedTerm(null);
        }}
        currentItem={selectedTerm}
        onSuccess={async () => {
          setOpenForm(false);
          setSelectedTerm(null);
          setSnackbar({
            open: true,
            message: `Payment Terms ${selectedTerm ? 'updated' : 'created'} successfully`,
            severity: 'success',
          });
          await refetch({
            page: page + 1,
            pageSize: rowsPerPage,
            search: filterName,
            orderBy,
            order
          });
        }}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        title="Confirm Delete"
        content="Are you sure you want to delete this payment terms?"
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
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
    </DashboardContent>
  );
}
