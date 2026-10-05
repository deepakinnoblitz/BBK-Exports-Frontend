import type dayjs from 'dayjs';
import type { CanteenEntry } from 'src/api/canteen';

import { useMemo, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useCanteen } from 'src/hooks/use-canteen';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import { deleteCanteenEntry, bulkDeleteCanteenEntries } from 'src/api/canteen';

import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { CanteenDialog } from '../canteen-dialog';
import { TableNoData } from '../../lead/table-no-data';
import { CanteenTableRow } from '../canteen-table-row';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { CanteenTableFiltersDrawer } from '../canteen-table-filters-drawer';
import { LeadTableToolbar as CanteenTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

const sortOptions = [
  { value: 'modified_desc', label: 'Newest First' },
  { value: 'modified_asc', label: 'Oldest First' },
  { value: 'canteen_date_desc', label: 'Date: Newest' },
  { value: 'canteen_date_asc', label: 'Date: Oldest' },
];

export function CanteenListView({
  onCreateNew,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  selectedEmployees: controlledEmployees,
  onSelectEmployees,
  selectedEmployee,
  onSelectEmployee,
}: {
  onCreateNew: VoidFunction;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  selectedEmployees?: any[];
  onSelectEmployees?: (emps: any[]) => void;
  selectedEmployee?: any | null;
  onSelectEmployee?: (emp: any | null) => void;
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState('modified');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<string[]>([]);

  // Filters State
  const [filters, setFilters] = useState<{
    employees: any[];
    department: string;
    meal_type: string;
    status: string;
    fromDate: dayjs.Dayjs | null;
    toDate: dayjs.Dayjs | null;
  }>({
    employees: controlledEmployees || (selectedEmployee ? (Array.isArray(selectedEmployee) ? selectedEmployee : [selectedEmployee]) : []),
    department: 'all',
    meal_type: 'all',
    status: 'all',
    fromDate: null,
    toDate: null,
  });

  useEffect(() => {
    if (controlledEmployees !== undefined) {
      setFilters((prev) => ({
        ...prev,
        employees: Array.isArray(controlledEmployees) ? controlledEmployees : controlledEmployees ? [controlledEmployees] : [],
      }));
    } else if (selectedEmployee !== undefined) {
      setFilters((prev) => ({
        ...prev,
        employees: Array.isArray(selectedEmployee) ? selectedEmployee : selectedEmployee ? [selectedEmployee] : [],
      }));
    }
  }, [controlledEmployees, selectedEmployee]);

  const [openFilters, setOpenFilters] = useState(false);

  // Masters
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Dialog states
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CanteenEntry | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<string | null>(null);

  // Loading States for Actions
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [empRes, deptRes] = await Promise.all([
          getDoctypeList('Employee', ['name', 'employee_name', 'department', 'designation']),
          getDoctypeList('Department', ['name', 'department_name']),
        ]);
        setEmployees(empRes || []);
        setDepartments(deptRes || []);
      } catch (err) {
        console.error('Failed to load masters:', err);
      }
    };
    loadMasters();
  }, []);

  // Build customFilters for API
  const customFilters = useMemo(() => {
    const list: any[] = [];

    if (filters.employees && filters.employees.length > 0) {
      const empIds = filters.employees.map((e) => (typeof e === 'string' ? e : e.name));
      if (empIds.length === 1) {
        list.push(['Canteen Entry', 'employee', '=', empIds[0]]);
      } else {
        list.push(['Canteen Entry', 'employee', 'in', empIds]);
      }
    }

    if (filters.department && filters.department !== 'all') {
      list.push(['Canteen Entry', 'department', '=', filters.department]);
    }

    if (filters.meal_type && filters.meal_type !== 'all') {
      list.push(['Canteen Entry', 'meal_type', '=', filters.meal_type]);
    }

    if (filters.status && filters.status !== 'all') {
      list.push(['Canteen Entry', 'status', '=', filters.status]);
    }

    if (filters.fromDate?.isValid()) {
      list.push(['Canteen Entry', 'canteen_date', '>=', filters.fromDate.format('YYYY-MM-DD')]);
    }

    if (filters.toDate?.isValid()) {
      list.push(['Canteen Entry', 'canteen_date', '<=', filters.toDate.format('YYYY-MM-DD')]);
    }

    return list;
  }, [filters]);

  const { data, total, loading, refetch } = useCanteen(
    page + 1,
    rowsPerPage,
    search,
    orderBy,
    order,
    customFilters
  );

  const notFound = !data.length && !!search;
  const empty = !data.length && !search && !loading;

  const handleSortChange = (value: string) => {
    if (value === 'modified_desc') {
      setOrderBy('modified');
      setOrder('desc');
    } else if (value === 'modified_asc') {
      setOrderBy('modified');
      setOrder('asc');
    } else if (value === 'canteen_date_desc') {
      setOrderBy('canteen_date');
      setOrder('desc');
    } else if (value === 'canteen_date_asc') {
      setOrderBy('canteen_date');
      setOrder('asc');
    }
  };

  const getSortByValue = () => {
    if (orderBy === 'modified' && order === 'desc') return 'modified_desc';
    if (orderBy === 'modified' && order === 'asc') return 'modified_asc';
    if (orderBy === 'canteen_date' && order === 'desc') return 'canteen_date_desc';
    if (orderBy === 'canteen_date' && order === 'asc') return 'canteen_date_asc';
    return 'modified_desc';
  };

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const currentPageIds = data.map((row) => row.name);
      setSelected((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    } else {
      const currentPageIds = new Set(data.map((row) => row.name));
      setSelected((prev) => prev.filter((id) => !currentPageIds.has(id)));
    }
  };

  const handleSelectRow = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((id) => id !== name) : [...prev, name]
    );
  };

  const handleEditRow = (row: CanteenEntry) => {
    setSelectedEntry(row);
    setOpenEditDialog(true);
  };

  const handleDeleteRow = (name: string) => {
    setSingleDeleteTarget(name);
  };

  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteCanteenEntry(singleDeleteTarget);
      setSelected((prev) => prev.filter((id) => id !== singleDeleteTarget));
      setSnackbar({ open: true, message: 'Canteen entry deleted', severity: 'success' });
      refetch();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to delete', severity: 'error' });
    } finally {
      setIsDeleting(false);
      setSingleDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    try {
      setIsBulkDeleting(true);
      await bulkDeleteCanteenEntries(selected);
      setSelected([]);
      setSnackbar({
        open: true,
        message: `${selected.length} canteen entries deleted successfully`,
        severity: 'success',
      });
      refetch();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to bulk delete', severity: 'error' });
    } finally {
      setIsBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  };

  const isCurrentPageSelected =
    data.length > 0 && data.every((row) => selected.includes(row.name));
  const isCurrentPageIndeterminate =
    data.some((row) => selected.includes(row.name)) && !isCurrentPageSelected;

  const canReset =
    filters.department !== 'all' ||
    filters.meal_type !== 'all' ||
    filters.status !== 'all' ||
    !!filters.fromDate ||
    !!filters.toDate ||
    filters.employees.length > 0;

  return (
    <>
      <Card
        sx={{
          border: (t) => `1px solid ${t.palette.divider}`,
          borderRadius: 2,
        }}
      >
        <CanteenTableToolbar
          filterName={search}
          onFilterName={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
            setPage(0);
            setSelected([]);
          }}
          searchPlaceholder="Search employee, meal type, remarks..."
          filterCount={
            (filters.department !== 'all' ? 1 : 0) +
            (filters.meal_type !== 'all' ? 1 : 0) +
            (filters.status !== 'all' ? 1 : 0) +
            (filters.fromDate ? 1 : 0) +
            (filters.toDate ? 1 : 0) +
            (filters.employees.length > 0 ? 1 : 0)
          }
          onOpenFilter={() => setOpenFilters(true)}
          numSelected={selected.length}
          onDelete={() => setConfirmBulkDelete(true)}
          sortOptions={sortOptions}
          sortBy={getSortByValue()}
          onSortChange={handleSortChange}
          canReset={canReset}
        />

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table
              size="medium"
              sx={{
                minWidth: 800,
                borderCollapse: 'collapse',
                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
              }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: '#f4f6f8', '& th': { borderBottom: (t) => `1px solid ${t.palette.divider}` } }}>
                  <TableCell padding="checkbox" sx={{ width: 48, px: 1 }}>
                    <Checkbox
                      indeterminate={isCurrentPageIndeterminate}
                      checked={isCurrentPageSelected}
                      onChange={(e) => handleSelectAllRows(e.target.checked)}
                      sx={{
                        color: 'text.secondary',
                        '&.Mui-checked': { color: COMMON_COLORS.emerald.main },
                        '&.MuiCheckbox-indeterminate': { color: COMMON_COLORS.emerald.main },
                      }}
                      inputProps={{ 'aria-label': 'Select all visible entries' }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', width: 50, px: 1 }}>
                    S.No
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>
                    Employee
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>
                    Department
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>
                    Date
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>
                    Meal Type
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>
                    Count
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>
                    Source
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>
                    Status
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', pr: 2, pl: 1, whiteSpace: 'nowrap' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                      <CircularProgress sx={{ color: COMMON_COLORS.emerald.main }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.map((row, index) => (
                      <CanteenTableRow
                        key={row.name}
                        row={row}
                        index={page * rowsPerPage + index + 1}
                        selected={selected.includes(row.name)}
                        onSelectRow={() => handleSelectRow(row.name)}
                        onEditRow={() => handleEditRow(row)}
                        onDeleteRow={() => handleDeleteRow(row.name)}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ))}

                    {notFound && <TableNoData searchQuery={search} />}

                    {empty && (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <EmptyContent
                            title="No canteen entries found"
                            description="Click 'New Entry' or 'Import' to add employee canteen meal records."
                            icon="solar:calendar-bold-duotone"
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
          </Scrollbar>
        </TableContainer>

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
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Card>

      {/* Filter Drawer */}
      <CanteenTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={filters}
        onFilters={(update) => {
          setFilters((prev) => ({ ...prev, ...update }));
          setPage(0);
        }}
        canReset={canReset}
        onResetFilters={() => {
          setFilters({
            employees: [],
            department: 'all',
            meal_type: 'all',
            status: 'all',
            fromDate: null,
            toDate: null,
          });
          setPage(0);
        }}
        employeeOptions={employees}
        departmentOptions={departments}
      />

      {/* Edit Dialog */}
      {openEditDialog && (
        <CanteenDialog
          open={openEditDialog}
          onClose={() => {
            setOpenEditDialog(false);
            setSelectedEntry(null);
          }}
          onSuccess={() => {
            refetch();
            setSnackbar({ open: true, message: 'Canteen entry updated successfully', severity: 'success' });
          }}
          editData={selectedEntry}
        />
      )}

      {/* Single Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(singleDeleteTarget)}
        onClose={() => setSingleDeleteTarget(null)}
        title="Delete Canteen Entry"
        content="Are you sure you want to delete this canteen entry? This action cannot be undone."
        action={
          <LoadingButton
            variant="contained"
            color="error"
            loading={isDeleting}
            onClick={handleConfirmSingleDelete}
          >
            Delete
          </LoadingButton>
        }
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title="Bulk Delete Canteen Entries"
        content={`Are you sure you want to delete ${selected.length} selected canteen entries? This action cannot be undone.`}
        action={
          <LoadingButton
            variant="contained"
            color="error"
            loading={isBulkDeleting}
            onClick={handleBulkDelete}
          >
            Delete Selected
          </LoadingButton>
        }
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
