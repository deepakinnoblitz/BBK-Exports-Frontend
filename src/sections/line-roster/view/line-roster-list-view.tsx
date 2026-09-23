import type dayjs from 'dayjs';
import type { LineRoster } from 'src/api/line-roster';

import { useMemo, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useLineRoster } from 'src/hooks/use-line-roster';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import { deleteOrCancelLineRosterAssignment } from 'src/api/line-roster';

import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from '../../lead/table-no-data';
import { LineRosterDialog } from '../line-roster-dialog';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { LineRosterTableRow } from '../line-roster-table-row';
import { LineRosterHistoryDialog } from '../line-roster-history-dialog';
import { LineRosterTableFiltersDrawer } from '../line-roster-table-filters-drawer';
import { LeadTableToolbar as LineRosterTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

const sortOptions = [
  { value: 'modified_desc', label: 'Newest First' },
  { value: 'modified_asc', label: 'Oldest First' },
  { value: 'effective_from_desc', label: 'Effective Date: Newest' },
  { value: 'effective_from_asc', label: 'Effective Date: Oldest' },
];

export function LineRosterListView({
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
    line_order: string;
    status: string;
    fromDate: dayjs.Dayjs | null;
    toDate: dayjs.Dayjs | null;
  }>({
    employees: controlledEmployees || (selectedEmployee ? (Array.isArray(selectedEmployee) ? selectedEmployee : [selectedEmployee]) : []),
    line_order: 'all',
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
  const [lines, setLines] = useState<any[]>([]);

  // Dialog states
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState<LineRoster | null>(null);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{ rosterId?: string; employee?: string }>({});
  const [confirmBulkCancel, setConfirmBulkCancel] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

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

  const [confirmCancel, setConfirmCancel] = useState<{ open: boolean; name: string | null }>({
    open: false,
    name: null,
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
      const [empRes, lineRes] = await Promise.all([
        getDoctypeList('Employee', ['name', 'employee_name', 'department']),
        getDoctypeList('Line Order', ['name', 'line_name']),
      ]);
      setEmployees(empRes || []);
      setLines(lineRes || []);
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
      line_order: 'all',
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
    filters.line_order !== 'all' ||
    filters.status !== 'all' ||
    !!filters.fromDate ||
    !!filters.toDate;

  // Build custom filter criteria
  const customFilters = useMemo(() => {
    const res: any[] = [];
    if (filters.employees && filters.employees.length > 0) {
      const empIds = filters.employees.map((e: any) => (typeof e === 'string' ? e : e?.name)).filter(Boolean);
      if (empIds.length === 1) {
        res.push(['Employee Line Roster', 'employee', '=', empIds[0]]);
      } else if (empIds.length > 1) {
        res.push(['Employee Line Roster', 'employee', 'in', empIds]);
      }
    }
    if (filters.line_order && filters.line_order !== 'all') {
      res.push(['Employee Line Roster', 'line_order', '=', filters.line_order]);
    }
    if (filters.status && filters.status !== 'all') {
      res.push(['Employee Line Roster', 'status', '=', filters.status]);
    }
    if (filters.fromDate?.isValid()) {
      res.push(['Employee Line Roster', 'effective_from', '>=', filters.fromDate.format('YYYY-MM-DD')]);
    }
    if (filters.toDate?.isValid()) {
      res.push(['Employee Line Roster', 'effective_from', '<=', filters.toDate.format('YYYY-MM-DD')]);
    }
    return res;
  }, [filters]);

  const { data, total, loading, refetch } = useLineRoster(
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

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      setSelected(data.map((row) => row.name));
    } else {
      setSelected([]);
    }
  };

  const handleSelectRow = (name: string) => {
    const selectedIndex = selected.indexOf(name);
    let newSelected: string[] = [];
    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, name);
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

  const handleBulkCancel = () => {
    if (selected.length > 0) {
      setConfirmBulkCancel(true);
    }
  };

  const handleConfirmBulkCancel = async () => {
    try {
      await Promise.all(
        selected.map((name) => deleteOrCancelLineRosterAssignment(name, 'Cancelled by user in bulk', false))
      );
      setSnackbar({
        open: true,
        message: `${selected.length} line assignment(s) cancelled successfully`,
        severity: 'success',
      });
      setSelected([]);
      refetch();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to cancel assignments in bulk',
        severity: 'error',
      });
    } finally {
      setConfirmBulkCancel(false);
    }
  };

  const handleBulkDelete = () => {
    if (selected.length > 0) {
      setConfirmBulkDelete(true);
    }
  };

  const handleConfirmBulkDelete = async () => {
    try {
      await Promise.all(
        selected.map((name) => deleteOrCancelLineRosterAssignment(name, 'Deleted by user in bulk', true))
      );
      setSnackbar({
        open: true,
        message: `${selected.length} line assignment(s) deleted permanently`,
        severity: 'success',
      });
      setSelected([]);
      refetch();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to delete assignments in bulk',
        severity: 'error',
      });
    } finally {
      setConfirmBulkDelete(false);
    }
  };

  const handleCancelAssignment = (name: string) => {
    setConfirmCancel({ open: true, name });
  };

  const handleConfirmCancel = async () => {
    if (confirmCancel.name) {
      try {
        await deleteOrCancelLineRosterAssignment(confirmCancel.name, 'Cancelled by user', false);
        setSnackbar({ open: true, message: 'Line assignment cancelled successfully', severity: 'success' });
        refetch();
      } catch (err: any) {
        setSnackbar({ open: true, message: err.message || 'Failed to cancel assignment', severity: 'error' });
      } finally {
        setConfirmCancel({ open: false, name: null });
      }
    }
  };

  const handleDeleteAssignment = (name: string) => {
    setConfirmDelete({ open: true, name });
  };

  const handleConfirmDelete = async () => {
    if (confirmDelete.name) {
      try {
        await deleteOrCancelLineRosterAssignment(confirmDelete.name, 'Deleted by user', true);
        setSnackbar({ open: true, message: 'Line assignment deleted permanently', severity: 'success' });
        refetch();
      } catch (err: any) {
        setSnackbar({ open: true, message: err.message || 'Failed to delete assignment', severity: 'error' });
      } finally {
        setConfirmDelete({ open: false, name: null });
      }
    }
  };

  const handleEdit = (roster: LineRoster) => {
    setSelectedRoster(roster);
    setOpenEditDialog(true);
  };

  const handleHistory = (rosterId: string, employeeId: string) => {
    setHistoryTarget({ rosterId, employee: employeeId });
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
        <LineRosterTableToolbar
          numSelected={selected.length}
          filterName={search}
          onFilterName={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
            setPage(0);
            setSelected([]);
          }}
          onCancel={handleBulkCancel}
          onDelete={handleBulkDelete}
          searchPlaceholder="Search employee, line..."
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
                  <TableCell padding="checkbox" sx={{ width: 48, px: 1 }}>
                    <Checkbox
                      indeterminate={selected.length > 0 && selected.length < data.length}
                      checked={data.length > 0 && selected.length === data.length}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectAllRows(e.target.checked)}
                      sx={{ color: 'text.secondary', '&.Mui-checked': { color: COMMON_COLORS.emerald.main }, '&.MuiCheckbox-indeterminate': { color: COMMON_COLORS.emerald.main } }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', width: 50, px: 1 }}>
                    S.No
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>Designation</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>Line</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>Effective From</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>Effective To</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', px: 1.5 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', pr: 2, pl: 1, whiteSpace: 'nowrap' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 10 }}>
                      <CircularProgress sx={{ color: COMMON_COLORS.emerald.main }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.map((row, idx) => (
                      <LineRosterTableRow
                        key={row.name}
                        row={row}
                        index={page * rowsPerPage + idx + 1}
                        selected={selected.includes(row.name)}
                        onSelectRow={() => handleSelectRow(row.name)}
                        onEditRow={() => handleEdit(row)}
                        onCancelRow={() => handleCancelAssignment(row.name)}
                        onDeleteRow={() => handleDeleteAssignment(row.name)}
                        onViewHistory={() => handleHistory(row.name, row.employee)}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ))}

                    <TableEmptyRows
                      height={68}
                      emptyRows={data.length < 5 ? 5 - data.length : 0}
                    />

                    {notFound && <TableNoData searchQuery={search} />}

                    {empty && (
                      <TableRow>
                        <TableCell colSpan={11}>
                          <EmptyContent
                            title="No line roster assignments found"
                            description="Click 'New Assignment' or 'Bulk Assign' to schedule employee lines."
                            icon="solar:calendar-bold-duotone"
                            sx={{ py: 5 }}
                          />
                        </TableCell>
                      </TableRow>
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
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* Edit Single Assignment Dialog */}
      {openEditDialog && (
        <LineRosterDialog
          open={openEditDialog}
          onClose={() => {
            setOpenEditDialog(false);
            setSelectedRoster(null);
          }}
          editData={selectedRoster}
          onSuccess={() => {
            refetch();
            setSnackbar({ open: true, message: 'Line assignment updated successfully', severity: 'success' });
          }}
        />
      )}

      {/* Audit History Dialog */}
      {openHistoryDialog && (
        <LineRosterHistoryDialog
          open={openHistoryDialog}
          onClose={() => setOpenHistoryDialog(false)}
          rosterId={historyTarget.rosterId}
          employee={historyTarget.employee}
        />
      )}

      {/* Side Filters Drawer */}
      <LineRosterTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={filters}
        onFilters={handleFilters}
        canReset={canReset}
        onResetFilters={handleResetFilters}
        employeeOptions={employees}
        lineOptions={lines}
      />

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        open={confirmCancel.open}
        onClose={() => setConfirmCancel({ open: false, name: null })}
        title="Cancel Assignment"
        content="Are you sure you want to cancel this line assignment? It will become inactive but remain in audit logs."
        action={
          <Button variant="contained" color="warning" onClick={handleConfirmCancel}>
            Cancel Assignment
          </Button>
        }
      />

      {/* Confirm Permanent Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, name: null })}
        title="Delete Permanently"
        content="Are you sure you want to permanently delete this line assignment?"
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />

      {/* Confirm Bulk Cancel Dialog */}
      <ConfirmDialog
        open={confirmBulkCancel}
        onClose={() => setConfirmBulkCancel(false)}
        title="Cancel Selected Assignments"
        content={`Are you sure you want to cancel ${selected.length} selected line assignment(s)?`}
        action={
          <Button variant="contained" color="warning" onClick={handleConfirmBulkCancel}>
            Cancel {selected.length} Records
          </Button>
        }
      />

      {/* Confirm Bulk Delete Dialog */}
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title="Delete Selected Assignments Permanently"
        content={`Are you sure you want to permanently delete ${selected.length} selected line assignment(s)?`}
        action={
          <Button variant="contained" color="error" onClick={handleConfirmBulkDelete}>
            Delete {selected.length} Records
          </Button>
        }
      />

      {/* Snackbar */}
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
