import type { SelectorEmployeeItem } from 'src/api/shift-rotation';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import {
  fetchSelectorEmployees,
  fetchSelectorEmployeeIds,
} from 'src/api/shift-rotation';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  onConfirm: (selectedIds: string[]) => void;
};

export function EmployeeSelectorDialog({
  open,
  onClose,
  selectedIds,
  onConfirm,
}: Props) {
  // Local set of selected employee IDs
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Masters
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);

  // Filter States (Autocomplete objects or null)
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<any | null>(null);
  const [selectedShift, setSelectedShift] = useState<any | null>(null);
  const [selectedLine, setSelectedLine] = useState<any | null>(null);

  // Pagination & Data
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [employees, setEmployees] = useState<SelectorEmployeeItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Sync selected on open
  useEffect(() => {
    if (open) {
      setSelected(new Set(selectedIds));
      setPage(0);
      loadMasters();
    }
  }, [open, selectedIds]);

  const loadMasters = async () => {
    try {
      const [deptRes, shiftRes, lineRes] = await Promise.all([
        getDoctypeList('Department', ['name', 'department_name']),
        getDoctypeList('Shift', ['name', 'shift_name']),
        getDoctypeList('Line Order', ['name', 'line_name', 'status']),
      ]);
      setDepartments(deptRes || []);
      setShifts(shiftRes || []);
      setLines(lineRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch employees on filter / page change
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSelectorEmployees({
        department: selectedDept?.name || 'all',
        shift: selectedShift?.name || 'all',
        line_order: selectedLine?.name || 'all',
        search,
        page: page + 1,
        page_size: rowsPerPage,
        status: 'Active',
      });
      setEmployees(res.employees || []);
      setTotalCount(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedDept, selectedShift, selectedLine, search, page, rowsPerPage]);

  useEffect(() => {
    if (open) {
      loadEmployees();
    }
  }, [open, loadEmployees]);

  // Handle single toggle
  const handleToggleRow = (empId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  // Header checkbox: Select / Deselect all on CURRENT page
  const pageIds = useMemo(() => employees.map((e) => e.name), [employees]);
  const isPageAllSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const isPagePartiallySelected = pageIds.some((id) => selected.has(id)) && !isPageAllSelected;

  const handleTogglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isPageAllSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Bulk action: Select ALL filtered (across all pages)
  const handleSelectAllFiltered = async () => {
    setBulkLoading(true);
    try {
      const allIds = await fetchSelectorEmployeeIds({
        department: selectedDept?.name || 'all',
        shift: selectedShift?.name || 'all',
        line_order: selectedLine?.name || 'all',
        search,
        status: 'Active',
      });
      setSelected((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.add(id));
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setBulkLoading(false);
    }
  };


  // Clear all selections
  const handleClearAll = () => {
    setSelected(new Set());
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedDept(null);
    setSelectedShift(null);
    setSelectedLine(null);
    setPage(0);
  };

  const hasActiveFilters =
    Boolean(search) || selectedDept !== null || selectedShift !== null || selectedLine !== null;

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 2,
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Title Bar */}
      <DialogTitle
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <div>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Select Target Assignees
            </Typography>
          </div>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton onClick={onClose} size="small">
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>
      </DialogTitle>

      {/* Main Content Area */}
      <DialogContent sx={{ m: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Filters Top Bar */}
        <Card
          variant="outlined"
          sx={{
            p: 2,
            my: 2,
            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: '2fr 1.5fr 1.5fr 1.5fr auto',
              },
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            {/* Search */}
            <TextField
              size="small"
              fullWidth
              placeholder="Search by ID, Name or Designation..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Department Autocomplete */}
            <Autocomplete
              size="small"
              fullWidth
              options={departments}
              getOptionLabel={(option) => option.department_name || option.name}
              isOptionEqualToValue={(option, value) => option.name === value?.name}
              value={selectedDept}
              onChange={(_, newValue) => {
                setSelectedDept(newValue);
                setPage(0);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Department"
                  label="Department"
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />

            {/* Shift Autocomplete */}
            <Autocomplete
              size="small"
              fullWidth
              options={shifts}
              getOptionLabel={(option) => option.shift_name || option.name}
              isOptionEqualToValue={(option, value) => option.name === value?.name}
              value={selectedShift}
              onChange={(_, newValue) => {
                setSelectedShift(newValue);
                setPage(0);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Shift"
                  label="Shift"
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />

            {/* Line Order Autocomplete */}
            <Autocomplete
              size="small"
              fullWidth
              options={lines}
              getOptionLabel={(option) => option.line_name || option.name}
              isOptionEqualToValue={(option, value) => option.name === value?.name}
              value={selectedLine}
              onChange={(_, newValue) => {
                setSelectedLine(newValue);
                setPage(0);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Line Order"
                  label="Line Order"
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button
                variant="text"
                size="small"
                onClick={handleResetFilters}
                startIcon={<Iconify icon="solar:restart-bold" />}
                sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
              >
                Reset
              </Button>
            )}
          </Box>
        </Card>

        {/* Selection Actions Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            px: 0.5,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button
              size="small"
              variant="outlined"
              onClick={handleSelectAllFiltered}
              disabled={bulkLoading || totalCount === 0}
              startIcon={
                bulkLoading ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <Iconify icon="solar:check-read-bold" />
                )
              }
              sx={{
                color: COMMON_COLORS.emerald.main,
                borderColor: COMMON_COLORS.emerald.main,
                '&:hover': {
                  borderColor: COMMON_COLORS.emerald.darker,
                  bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
                },
              }}
            >
              Select All Filtered ({totalCount})
            </Button>

            {selected.size > 0 && (
              <Button
                size="small"
                variant="text"
                color="error"
                onClick={handleClearAll}
                startIcon={<Iconify icon={"solar:trash-bin-minimalistic-bold" as any} />}
              >
                Clear All ({selected.size})
              </Button>
            )}
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Showing <strong>{employees.length}</strong> of <strong>{totalCount}</strong> matching employees
          </Typography>
        </Box>

        {/* Table Container styled like standard application list */}
        <Card variant="outlined" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 280, borderRadius: 1.5 }}>
          <Scrollbar sx={{ flexGrow: 1 }}>
            <TableContainer sx={{ minWidth: 780 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                        color: 'text.secondary',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        py: 1.5,
                        borderBottom: (t) => `1px solid ${t.palette.divider}`,
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={isPagePartiallySelected}
                        checked={isPageAllSelected}
                        onChange={handleTogglePage}
                        sx={{
                          color: COMMON_COLORS.emerald.main,
                          '&.Mui-checked': { color: COMMON_COLORS.emerald.main },
                          '&.MuiCheckbox-indeterminate': { color: COMMON_COLORS.emerald.main },
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ width: 60 }}>
                      S.No
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>Name</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Department</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Shift</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Line Order</TableCell>
                    <TableCell sx={{ minWidth: 140 }}>Designation</TableCell>
                    <TableCell sx={{ width: 100 }} align="center">
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                        <CircularProgress sx={{ color: COMMON_COLORS.emerald.main }} />
                      </TableCell>
                    </TableRow>
                  ) : employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                        <EmptyContent
                          title="No employees found"
                          description="Try changing the department, shift, line, or search terms."
                          icon="solar:users-group-rounded-bold-duotone"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp, index) => {
                      const isSelected = selected.has(emp.name);
                      return (
                        <TableRow
                          key={emp.name}
                          hover
                          onClick={() => handleToggleRow(emp.name)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isSelected
                              ? alpha(COMMON_COLORS.emerald.main, 0.06)
                              : 'transparent',
                            '& td, & th': {
                              borderBottom: (t) => `1px solid ${t.palette.divider}`,
                              py: 1.5,
                            },
                            '&:hover': {
                              bgcolor: isSelected
                                ? alpha(COMMON_COLORS.emerald.main, 0.12)
                                : undefined,
                            },
                          }}
                        >
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleRow(emp.name)}
                              sx={{
                                color: COMMON_COLORS.emerald.main,
                                '&.Mui-checked': { color: COMMON_COLORS.emerald.main },
                              }}
                            />
                          </TableCell>

                          <TableCell align="center">
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                display: 'flex',
                                borderRadius: '50%',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: COMMON_COLORS.snoBadge.bg,
                                color: COMMON_COLORS.snoBadge.color,
                                typography: 'subtitle2',
                                fontWeight: 800,
                                border: COMMON_COLORS.snoBadge.border,
                                mx: 'auto',
                                fontSize: '0.75rem',
                              }}
                            >
                              {page * rowsPerPage + index + 1}
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color: 'text.primary' }}>
                                {emp.employee_name || emp.name}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }} noWrap>
                                {emp.name}
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ color: 'text.primary' }}>
                              {emp.department || '—'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ color: 'text.primary' }}>
                              {emp.shift || '—'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ color: 'text.primary' }}>
                              {emp.line_order || '—'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                              {emp.designation || '—'}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Label
                              variant="soft"
                              color={emp.status === 'Active' ? 'success' : 'default'}
                              sx={{ textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}
                            >
                              {emp.status || 'Active'}
                            </Label>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>

          <TablePagination
            component="div"
            count={totalCount}
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
      </DialogContent>

      {/* Footer Actions */}
      <DialogActions
        sx={{
          p: 2.5,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.25,
              px: 2,
              py: 0.85,
              borderRadius: 1.5,
              bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
              border: `1.5px solid ${alpha(COMMON_COLORS.emerald.main, 0.3)}`,
              boxShadow: `0 2px 8px ${alpha(COMMON_COLORS.emerald.main, 0.08)}`,
            }}
          >
            <Box
              sx={{
                minWidth: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: COMMON_COLORS.emerald.main,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 900,
                boxShadow: `0 2px 6px ${alpha(COMMON_COLORS.emerald.main, 0.35)}`,
              }}
            >
              {selected.size}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  color: COMMON_COLORS.emerald.darker,
                  fontSize: '0.925rem',
                  letterSpacing: 0.1,
                }}
              >
                {selected.size === 1 ? 'Employee' : 'Employees'} selected
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                for this rotation
              </Typography>
            </Box>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{
              bgcolor: COMMON_COLORS.primaryButton.bg,
              color: COMMON_COLORS.primaryButton.color,
              '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
              px: 3,
            }}
          >
            Confirm Selection ({selected.size})
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
