import type {
  ShiftRotation} from 'src/api/shift-rotation';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useShiftRotations } from 'src/hooks/use-shift-rotation';

import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  deleteShiftRotation,
} from 'src/api/shift-rotation';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../lead/table-no-data';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { ShiftRotationDialog } from '../shift-rotation-dialog';
import { ShiftRotationTableRow } from '../shift-rotation-table-row';
import { ShiftRotationDetailsDialog } from '../shift-rotation-details-dialog';
import { ShiftRotationGenerateDialog } from '../shift-rotation-generate-dialog';
import { LeadTableHead as ShiftRotationTableHead } from '../../lead/lead-table-head';
import { ShiftRotationTableFiltersDrawer } from '../shift-rotation-table-filters-drawer';
import { LeadTableToolbar as ShiftRotationTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

const sortOptions = [
  { value: 'modified_desc', label: 'Newest First' },
  { value: 'modified_asc', label: 'Oldest First' },
  { value: 'rotation_name_asc', label: 'Name: A to Z' },
  { value: 'rotation_name_desc', label: 'Name: Z to A' },
];

export function ShiftRotationView() {
  const { user } = useAuth();
  const actionPerms = user?.permissions?.actions?.shift_rotation;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canCreate = hasCustomPerms ? !!actionPerms?.create : true;
  const canEdit = hasCustomPerms ? !!actionPerms?.edit : true;
  const canDelete = hasCustomPerms ? !!actionPerms?.delete : true;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterName, setFilterName] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState('modified');

  // Filter Drawer State
  const [filters, setFilters] = useState({
    frequency: 'all',
    department: 'all',
    status: 'all',
  });
  const [openFilters, setOpenFilters] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState<any[]>([]);

  // Dialogs
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  // Detail View State
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedDetailName, setSelectedDetailName] = useState<string | null>(null);

  // Generate Dialog State (near Add button)
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [generateTargetName, setGenerateTargetName] = useState<string | null>(null);

  // Snackbar State
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; name: string | null }>({
    open: false,
    name: null,
  });

  useEffect(() => {
    getDoctypeList('Department', ['name'])
      .then((opts) => setDepartmentOptions(opts || []))
      .catch(console.error);
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleFilters = (update: any) => {
    setFilters((prev) => ({ ...prev, ...update }));
    setPage(0);
  };

  const handleResetFilters = () => {
    setFilters({
      frequency: 'all',
      department: 'all',
      status: 'all',
    });
  };

  const canReset =
    !!filterName ||
    filters.frequency !== 'all' ||
    filters.department !== 'all' ||
    filters.status !== 'all';

  const customFilters = useMemo(() => {
    const result: any[] = [];
    if (filters.frequency !== 'all') {
      result.push(['Shift Rotation', 'frequency', '=', filters.frequency]);
    }
    if (filters.department !== 'all') {
      result.push(['Shift Rotation', 'department', '=', filters.department]);
    }
    if (filters.status !== 'all') {
      result.push(['Shift Rotation', 'status', '=', filters.status]);
    }
    return result;
  }, [filters]);

  const { data, total, loading, refetch } = useShiftRotations(
    page + 1,
    rowsPerPage,
    filterName,
    orderBy,
    order,
    customFilters
  );

  const notFound = !data.length && !!filterName;
  const empty = !data.length && !filterName && !loading;

  const handleSortChange = (value: string) => {
    if (value === 'modified_desc') {
      setOrderBy('modified');
      setOrder('desc');
    } else if (value === 'modified_asc') {
      setOrderBy('modified');
      setOrder('asc');
    } else if (value === 'rotation_name_asc') {
      setOrderBy('rotation_name');
      setOrder('asc');
    } else if (value === 'rotation_name_desc') {
      setOrderBy('rotation_name');
      setOrder('desc');
    }
  };

  const getSortByValue = () => {
    if (orderBy === 'modified' && order === 'desc') return 'modified_desc';
    if (orderBy === 'modified' && order === 'asc') return 'modified_asc';
    if (orderBy === 'rotation_name' && order === 'asc') return 'rotation_name_asc';
    if (orderBy === 'rotation_name' && order === 'desc') return 'rotation_name_desc';
    return 'modified_desc';
  };

  const handleCreate = () => {
    setSelectedName(null);
    setOpenDialog(true);
  };

  const handleEdit = (row: ShiftRotation) => {
    setSelectedName(row.name);
    setOpenDialog(true);
  };

  const handleViewDetails = (row: ShiftRotation) => {
    setSelectedDetailName(row.name);
    setOpenDetails(true);
  };

  const handleDelete = (row: ShiftRotation) => {
    setConfirmDelete({ open: true, name: row.name });
  };

  const handleConfirmDelete = async () => {
    if (confirmDelete.name) {
      try {
        await deleteShiftRotation(confirmDelete.name);
        setSnackbar({
          open: true,
          message: 'Shift Rotation deleted successfully',
          severity: 'success',
        });
        refetch();
      } catch (e: any) {
        console.error(e);
        setSnackbar({
          open: true,
          message: e?.message || 'Failed to delete Shift Rotation',
          severity: 'error',
        });
      } finally {
        setConfirmDelete({ open: false, name: null });
      }
    }
  };

  const handleOpenGenerateHeader = () => {
    setGenerateTargetName(null);
    setOpenGenerateDialog(true);
  };

  return (
    <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
      {/* Top Header */}
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Shift Rotation
        </Typography>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {canCreate && (
            <>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:play-bold" />}
                onClick={handleOpenGenerateHeader}
                sx={{
                  color: '#08a3cd',
                  borderColor: '#08a3cd',
                  '&:hover': { borderColor: '#068fb3', bgcolor: '#08a3cd08' },
                }}
              >
                Generate Roster
              </Button>

              <Button
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={handleCreate}
                sx={{ bgcolor: '#08a3cd', color: 'common.white', '&:hover': { bgcolor: '#068fb3' } }}
              >
                New Shift Rotation
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {/* Single Table Card matching Employees View */}
      <Card>
        <ShiftRotationTableToolbar
          numSelected={0}
          filterName={filterName}
          onFilterName={(e: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(e.target.value);
            setPage(0);
          }}
          searchPlaceholder="Search shift rotations..."
          sortOptions={sortOptions}
          sortBy={getSortByValue()}
          onSortChange={handleSortChange}
          onOpenFilter={() => setOpenFilters(true)}
          canReset={canReset}
        />

        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 960, borderCollapse: 'collapse' }}>
              <ShiftRotationTableHead
                order={order}
                orderBy={orderBy}
                rowCount={total}
                numSelected={0}
                onSelectAllRows={() => {}}
                hideCheckbox
                showIndex
                headLabel={[
                  { id: 'rotation_name', label: 'Rotation Name', minWidth: 160 },
                  { id: 'frequency', label: 'Frequency', minWidth: 120 },
                  { id: 'department', label: 'Department', minWidth: 120 },
                  { id: 'start_date', label: 'Active Period', minWidth: 160 },
                  { id: 'exclusions', label: 'Exclusions', minWidth: 120 },
                  { id: 'status', label: 'Status', minWidth: 100 },
                  { id: '', label: 'Actions', align: 'right' },
                ]}
              />

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                      <CircularProgress sx={{ color: '#08a3cd' }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.map((row, index) => (
                      <ShiftRotationTableRow
                        key={row.name}
                        index={page * rowsPerPage + index + 1}
                        row={row}
                        onViewRow={() => handleViewDetails(row)}
                        onEditRow={() => handleEdit(row)}
                        onDeleteRow={() => handleDelete(row)}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ))}

                    {notFound && <TableNoData searchQuery={filterName} />}

                    {empty && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <EmptyContent
                            title="No shift rotations found"
                            description="Click 'New Shift Rotation' to create your first rotation rule."
                            icon="solar:refresh-circle-bold-duotone"
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
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Card>

      {/* Filter Drawer */}
      <ShiftRotationTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={filters}
        onFilters={handleFilters}
        canReset={canReset}
        onResetFilters={handleResetFilters}
        departmentOptions={departmentOptions}
      />

      {/* Details Dialog */}
      <ShiftRotationDetailsDialog
        open={openDetails}
        onClose={() => {
          setOpenDetails(false);
          setSelectedDetailName(null);
        }}
        rotationName={selectedDetailName}
        canEdit={canEdit}
        onEdit={() => {
          setOpenDetails(false);
          if (selectedDetailName) {
            setSelectedName(selectedDetailName);
            setOpenDialog(true);
          }
        }}
        onGenerate={() => {
          if (selectedDetailName) {
            setGenerateTargetName(selectedDetailName);
            setOpenDetails(false);
            setOpenGenerateDialog(true);
          }
        }}
      />

      {/* Generate Roster Modal (near Add button & details) */}
      {openGenerateDialog && (
        <ShiftRotationGenerateDialog
          open={openGenerateDialog}
          onClose={() => {
            setOpenGenerateDialog(false);
            setGenerateTargetName(null);
          }}
          rotations={data}
          selectedRotationName={generateTargetName}
          onSuccess={(msg) => {
            setSnackbar({
              open: true,
              message: msg,
              severity: 'success',
            });
            refetch();
          }}
          onError={(err) => {
            setSnackbar({
              open: true,
              message: err,
              severity: 'error',
            });
          }}
        />
      )}

      {/* Create / Edit Dialog */}
      {openDialog && (
        <ShiftRotationDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          onSuccess={() => {
            setSnackbar({
              open: true,
              message: selectedName ? 'Shift Rotation updated successfully' : 'Shift Rotation created successfully',
              severity: 'success',
            });
            refetch();
          }}
          editName={selectedName}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, name: null })}
        title="Delete Shift Rotation"
        content="Are you sure you want to delete this Shift Rotation pattern?"
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />

      {/* Global Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
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
