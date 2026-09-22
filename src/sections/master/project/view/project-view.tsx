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

import { useProjects } from 'src/hooks/use-masters';

import { deleteProject } from 'src/api/masters';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { MasterEmptyState } from 'src/sections/master/master-empty-state';

import { useAuth } from 'src/auth/auth-context';

import { ProjectDialog } from '../project-dialog';
import { ProjectTableRow } from '../project-table-row';
import { TableNoData } from '../../../lead/table-no-data';
import { LeadTableHead } from '../../../lead/lead-table-head';
import { TableEmptyRows } from '../../../lead/table-empty-rows';
import { ProjectDetailsDialog } from '../project-details-dialog';
import { LeadTableToolbar } from '../../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'project_name', label: 'Project' },
  { id: 'customer', label: 'Customer' },
  { id: 'actions', label: 'Actions', align: 'right' },
];

const SORT_OPTIONS = [
  { value: 'modified_desc', label: 'Newest First' },
  { value: 'modified_asc', label: 'Oldest First' },
];

// ----------------------------------------------------------------------


export function ProjectView() {
  const { user } = useAuth();
  const actionPerms = user?.permissions?.actions?.project;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canCreateProject = hasCustomPerms ? !!actionPerms?.create : true;
  const canEditProject = hasCustomPerms ? !!actionPerms?.edit : true;
  const canDeleteProject = hasCustomPerms ? !!actionPerms?.delete : true;

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

  const { data, total, loading, refetch } = useProjects(
    page + 1,
    rowsPerPage,
    filterName,
    orderBy,
    order,
    filters.status
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
        await deleteProject(confirmDelete.id);
        setSnackbar({ open: true, message: 'Project deleted successfully', severity: 'success' });
        refetch();
      } catch (error: any) {
        setSnackbar({ open: true, message: error.message || 'Failed to delete project', severity: 'error' });
      } finally {
        setConfirmDelete({ open: false, id: null });
      }
    }
  };

  const canReset = filters.status !== 'all' || !!filterName;

  return (
    <DashboardContent maxWidth={false} sx={{mt: 2}}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 5 }}>
        <Typography variant="h4">Project List</Typography>
        {canCreateProject && (
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
            sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
          >
            New Project
          </Button>
        )}
      </Stack>

      <Card>
        <LeadTableToolbar
          numSelected={selected.length}
          filterName={filterName}
          onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            setPage(0);
          }}
          searchPlaceholder="Search projects..."
          sortOptions={SORT_OPTIONS}
          sortBy={`${orderBy}_${order}`}
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
                onSelectAllRows={() => {}}
                showIndex
                hideCheckbox
              />

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                      <CircularProgress sx={{ color: '#059669' }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.map((row, index) => (
                      <ProjectTableRow
                        key={row.name}
                        index={page * rowsPerPage + index}
                        row={row}
                        selected={selected.includes(row.name)}
                        onEditRow={() => handleEditRow(row.name)}
                        onViewRow={() => handleViewRow(row.name)}
                        onDeleteRow={() => handleDeleteRow(row.name)}
                        onSelectRow={() => {}}
                        canEdit={canEditProject}
                        canDelete={canDeleteProject}
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
                        masterName="Project"
                        colSpan={4}
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

      <ProjectDialog
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setSelectedId(null);
        }}
        id={selectedId}
        onSuccess={() => {
          setSnackbar({
            open: true,
            message: `Project ${selectedId ? 'updated' : 'created'} successfully`,
            severity: 'success',
          });
          refetch();
        }}
      />

      <ProjectDetailsDialog
        open={openDetails}
        onClose={() => {
          setOpenDetails(false);
          setDetailsId(null);
        }}
        projectId={detailsId}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%', whiteSpace: 'pre-line' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        title="Delete"
        content="Are you sure you want to delete this project?"
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />
    </DashboardContent>
  );
}
