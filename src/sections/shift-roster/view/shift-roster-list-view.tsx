import type dayjs from 'dayjs';
import type { ShiftRoster} from 'src/api/shift-roster';

import { useMemo, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useShiftRoster } from 'src/hooks/use-shift-roster';

import { getDoctypeList } from 'src/api/leads';
import { deleteOrCancelRosterAssignment } from 'src/api/shift-roster';

import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from '../../lead/table-no-data';
import { ShiftRosterDialog } from '../shift-roster-dialog';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { ShiftRosterTableRow } from '../shift-roster-table-row';
import { ShiftRosterHistoryDialog } from '../shift-roster-history-dialog';
import { ShiftRosterTableFiltersDrawer } from '../shift-roster-table-filters-drawer';
import { LeadTableToolbar as ShiftRosterTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

const sortOptions = [
  { value: 'modified_desc', label: 'Newest First' },
  { value: 'modified_asc', label: 'Oldest First' },
  { value: 'effective_from_desc', label: 'Effective Date: Newest' },
  { value: 'effective_from_asc', label: 'Effective Date: Oldest' },
];

export function ShiftRosterListView({
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

  // Filters State
  const [filters, setFilters] = useState<{
    employees: any[];
    shift: string;
    status: string;
    fromDate: dayjs.Dayjs | null;
    toDate: dayjs.Dayjs | null;
  }>({
    employees: controlledEmployees || (selectedEmployee ? (Array.isArray(selectedEmployee) ? selectedEmployee : [selectedEmployee]) : []),
    shift: 'all',
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
  const [shifts, setShifts] = useState<any[]>([]);

  // Dialog states
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState<ShiftRoster | null>(null);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{ rosterId?: string; employee?: string }>({});

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
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      const [empRes, shiftRes] = await Promise.all([
        getDoctypeList('Employee', ['name', 'employee_name', 'department']),
        getDoctypeList('Shift', ['name', 'shift_name']),
      ]);
      setEmployees(empRes || []);
      setShifts(shiftRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleFilters = (update: any) => {
    setFilters((prev) => {
      const next = { ...prev, ...update };
      if ('employees' in update) {
        const val = update.employees || [];
        onSelectEmployees?.(val);
        onSelectEmployee?.(val.length === 1 ? val[0] : val.length > 0 ? val : null);
      } else if ('employee' in update) {
        const val = Array.isArray(update.employee) ? update.employee : update.employee ? [update.employee] : [];
        next.employees = val;
        onSelectEmployees?.(val);
        onSelectEmployee?.(val.length === 1 ? val[0] : val.length > 0 ? val : null);
      }
      return next;
    });
    setPage(0);
  };

  const handleResetFilters = () => {
    setFilters({
      employees: [],
      shift: 'all',
      status: 'all',
      fromDate: null,
      toDate: null,
    });
    onSelectEmployees?.([]);
    onSelectEmployee?.(null);
  };

  const canReset =
    !!search ||
    (filters.employees && filters.employees.length > 0) ||
    filters.shift !== 'all' ||
    filters.status !== 'all' ||
    !!filters.fromDate ||
    !!filters.toDate;

  // Build custom filter criteria
  const customFilters = useMemo(() => {
    const res: any[] = [];
    if (filters.employees && filters.employees.length > 0) {
      const empIds = filters.employees.map((e: any) => (typeof e === 'string' ? e : e?.name)).filter(Boolean);
      if (empIds.length === 1) {
        res.push(['Employee Shift Roster', 'employee', '=', empIds[0]]);
      } else if (empIds.length > 1) {
        res.push(['Employee Shift Roster', 'employee', 'in', empIds]);
      }
    }
    if (filters.shift && filters.shift !== 'all') {
      res.push(['Employee Shift Roster', 'shift', '=', filters.shift]);
    }
    if (filters.status && filters.status !== 'all') {
      res.push(['Employee Shift Roster', 'status', '=', filters.status]);
    }
    if (filters.fromDate?.isValid()) {
      res.push(['Employee Shift Roster', 'effective_from', '>=', filters.fromDate.format('YYYY-MM-DD')]);
    }
    if (filters.toDate?.isValid()) {
      res.push(['Employee Shift Roster', 'effective_from', '<=', filters.toDate.format('YYYY-MM-DD')]);
    }
    return res;
  }, [filters]);

  const { data, total, loading, refetch } = useShiftRoster(
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
    } else if (value === 'effective_from_desc') {
      setOrderBy('effective_from');
      setOrder('desc');
    } else if (value === 'effective_from_asc') {
      setOrderBy('effective_from');
      setOrder('asc');
    }
  };

  const getSortByValue = () => {
    if (orderBy === 'modified' && order === 'desc') return 'modified_desc';
    if (orderBy === 'modified' && order === 'asc') return 'modified_asc';
    if (orderBy === 'effective_from' && order === 'desc') return 'effective_from_desc';
    if (orderBy === 'effective_from' && order === 'asc') return 'effective_from_asc';
    return 'modified_desc';
  };

  const handleEdit = (row: ShiftRoster) => {
    setSelectedRoster(row);
    setOpenEditDialog(true);
  };

  const handleDelete = (row: ShiftRoster) => {
    setConfirmDelete({ open: true, name: row.name });
  };

  const handleConfirmDelete = async () => {
    if (confirmDelete.name) {
      try {
        await deleteOrCancelRosterAssignment(confirmDelete.name, 'Cancelled by user');
        setSnackbar({
          open: true,
          message: 'Shift assignment cancelled successfully',
          severity: 'success',
        });
        refetch();
      } catch (e: any) {
        console.error(e);
        setSnackbar({
          open: true,
          message: e?.message || 'Failed to cancel shift assignment',
          severity: 'error',
        });
      } finally {
        setConfirmDelete({ open: false, name: null });
      }
    }
  };

  const handleViewHistory = (row: ShiftRoster) => {
    setHistoryTarget({ rosterId: row.name, employee: row.employee });
    setOpenHistoryDialog(true);
  };

  return (
    <>
      <Card
        sx={{
          border: (t) => `1px solid ${t.palette.divider}`,
          borderRadius: 2,
        }}
      >
        <ShiftRosterTableToolbar
          numSelected={0}
          filterName={search}
          onFilterName={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          searchPlaceholder="Search employee, shift..."
          sortOptions={sortOptions}
          sortBy={getSortByValue()}
          onSortChange={handleSortChange}
          onOpenFilter={() => setOpenFilters(true)}
          canReset={canReset}
        />

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size="medium" sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f4f6f8' }}>
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
                    Designation
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>
                    Shift
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>
                    Effective From
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>
                    Effective To
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
                      <CircularProgress sx={{ color: '#08a3cd' }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.map((row, index) => (
                      <ShiftRosterTableRow
                        key={row.name}
                        index={page * rowsPerPage + index + 1}
                        row={row}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEditRow={() => handleEdit(row)}
                        onDeleteRow={() => handleDelete(row)}
                        onViewHistory={() => handleViewHistory(row)}
                      />
                    ))}

                    {notFound && <TableNoData searchQuery={search} />}

                    {empty && (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <EmptyContent
                            title="No shift roster assignments found"
                            description="Click 'New Assignment' or 'Bulk Assign' to schedule employee shifts."
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
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Card>

      {/* Filters Drawer */}
      <ShiftRosterTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={filters}
        onFilters={handleFilters}
        canReset={canReset}
        onResetFilters={handleResetFilters}
        employeeOptions={employees}
        shiftOptions={shifts}
      />

      {/* Edit Dialog */}
      {openEditDialog && (
        <ShiftRosterDialog
          open={openEditDialog}
          onClose={() => setOpenEditDialog(false)}
          onSuccess={() => {
            setSnackbar({
              open: true,
              message: 'Shift assignment updated successfully',
              severity: 'success',
            });
            refetch();
          }}
          editData={selectedRoster}
        />
      )}

      {/* History Dialog */}
      {openHistoryDialog && (
        <ShiftRosterHistoryDialog
          open={openHistoryDialog}
          onClose={() => setOpenHistoryDialog(false)}
          rosterId={historyTarget.rosterId}
          employee={historyTarget.employee}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, name: null })}
        title="Cancel Shift Assignment"
        content="Are you sure you want to cancel this shift roster assignment?"
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Cancel Assignment
          </Button>
        }
      />

      {/* Snackbar Alert */}
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
    </>
  );
}
