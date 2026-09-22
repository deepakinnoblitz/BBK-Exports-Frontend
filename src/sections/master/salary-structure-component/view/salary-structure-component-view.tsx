import { useState } from 'react';

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

import { useSalaryStructureComponents } from 'src/hooks/use-masters';

import { COMMON_COLORS } from 'src/theme';
import { DashboardContent } from 'src/layouts/dashboard';
import { deleteSalaryStructureComponent } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { MasterEmptyState } from 'src/sections/master/master-empty-state';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../../lead/table-no-data';
import { LeadTableHead } from '../../../lead/lead-table-head';
import { TableEmptyRows } from '../../../lead/table-empty-rows';
import { LeadTableToolbar } from '../../../lead/lead-table-toolbar';
import { SalaryStructureComponentDialog } from '../salary-structure-component-dialog';
import { SalaryStructureComponentTableRow } from '../salary-structure-component-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'component_name', label: 'Component' },
  { id: 'type', label: 'Type', align: 'center' },
  { id: 'is_default', label: 'Default', align: 'center' },
  { id: 'percentage', label: 'Percentage', align: 'right' },
  { id: 'static_amount', label: 'Static Amount', align: 'right' },
  { id: 'actions', label: 'Actions', align: 'right' },
];

const SORT_OPTIONS = [
  { value: 'modified_desc', label: 'Newest First' },
  { value: 'modified_asc', label: 'Oldest First' },
];

// ----------------------------------------------------------------------

export function SalaryStructureComponentView() {
  const { user } = useAuth();
  const actionPerms = user?.permissions?.actions?.salary_component;
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

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data, total, loading, refetch } = useSalaryStructureComponents(
    page + 1,
    rowsPerPage,
    filterName,
    orderBy,
    order
  );

  const notFound = !data.length && !!filterName;
  const empty = !loading && !data.length && !filterName;

  const totalDefaultEarningPercent = data
    .filter((c) => c.is_default && c.type === 'Earning')
    .reduce((sum, c) => sum + (parseFloat(c.percentage) || 0), 0);

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
      try {
        await deleteSalaryStructureComponent(confirmDelete.id);
        setSnackbar({ open: true, message: 'Component deleted successfully', severity: 'success' });
        refetch();
      } catch (error: any) {
        setSnackbar({ open: true, message: error.message || 'Failed to delete', severity: 'error' });
      } finally {
        setConfirmDelete({ open: false, id: null });
      }
    }
  };

  return (
    <DashboardContent maxWidth={false} sx={{mt: 2}}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 5 }}>
        <Typography variant="h4">Salary Structure Components</Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
            sx={{ bgcolor: COMMON_COLORS.primaryButton.bg, color: COMMON_COLORS.primaryButton.color, '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg } }}
          >
            New Component
          </Button>
        )}
      </Stack>

      <Alert
        severity={totalDefaultEarningPercent === 100 ? 'success' : 'warning'}
        variant="outlined"
        sx={{ mb: 3, border: (theme) => `1px solid ${totalDefaultEarningPercent === 100 ? theme.palette.success.main : theme.palette.warning.main}20` }}
        icon={<Iconify icon={totalDefaultEarningPercent === 100 ? "solar:check-circle-bold" : "solar:info-circle-bold"} />}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Default Earning Configuration: {totalDefaultEarningPercent.toFixed(2)}%
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
          {totalDefaultEarningPercent === 100 
            ? 'Configuration is valid for Default Splitting.' 
            : `Total Default Earning percentage must be exactly 100% for proper splitting. Current total: ${totalDefaultEarningPercent.toFixed(2)}%`}
        </Typography>
      </Alert>

      <Card>
        <LeadTableToolbar
          numSelected={0}
          filterName={filterName}
          onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            setPage(0);
          }}
          searchPlaceholder="Search components..."
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
                onSelectAllRows={() => { }}
                showIndex
                hideCheckbox
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
                      <SalaryStructureComponentTableRow
                        key={row.name}
                        index={page * rowsPerPage + index}
                        row={row}
                        selected={false}
                        onEditRow={() => handleEditRow(row.name)}
                        onDeleteRow={() => handleDeleteRow(row.name)}
                        onSelectRow={() => { }}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ))}

                    {!empty && !notFound && (
                        <TableEmptyRows
                            height={68}
                            emptyRows={data.length < 5 ? 5 - data.length : 0}
                        />
                    )}
                    {notFound && <TableNoData searchQuery={filterName} />}

                    {empty && (
                      <MasterEmptyState
                        masterName="Salary Structure Component"
                        colSpan={7}
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
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Card>

      <SalaryStructureComponentDialog
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setSelectedId(null);
        }}
        id={selectedId}
        onSuccess={() => {
          setSnackbar({
            open: true,
            message: `Component ${selectedId ? 'updated' : 'created'} successfully`,
            severity: 'success',
          });
          refetch();
        }}
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
          sx={{ width: '100%', whiteSpace: 'pre-line' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        title="Delete"
        content="Are you sure you want to delete this salary component?"
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />
    </DashboardContent>
  );
}
