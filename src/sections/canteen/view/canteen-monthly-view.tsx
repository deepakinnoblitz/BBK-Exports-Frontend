import dayjs from 'dayjs';
import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { useMonthlyCanteen } from 'src/hooks/use-canteen';

import { filterEmployeeOptions } from 'src/utils/filter-employees';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { CanteenDialog } from '../canteen-dialog';
import { CanteenTableFiltersDrawer } from '../canteen-table-filters-drawer';

// ----------------------------------------------------------------------

export function CanteenMonthlyView({
  canEdit = true,
  selectedEmployees: controlledEmployees,
  onSelectEmployees,
  selectedEmployee,
  onSelectEmployee,
  filterVariant = 'drawer',
  refreshTrigger,
  isHR,
}: {
  canEdit?: boolean;
  selectedEmployees?: any[];
  onSelectEmployees?: (emps: any[]) => void;
  selectedEmployee?: any | null;
  onSelectEmployee?: (emp: any | null) => void;
  filterVariant?: 'drawer' | 'inline';
  refreshTrigger?: number;
  isHR?: boolean;
}) {
  const theme = useTheme();
  const { user } = useAuth();
  const isHRUser =
    isHR !== undefined
      ? isHR
      : user?.roles?.some((role: string) =>
          ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
        );
  const isRestrictedEmployee = user?.roles?.includes('Employee') && !isHRUser;

  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs());
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [openFilters, setOpenFilters] = useState(false);
  const [internalEmployees, setInternalEmployees] = useState<any[]>([]);

  const selectedEmployees: any[] = useMemo(() => {
    if (isRestrictedEmployee && user?.employee) {
      return [{ name: user.employee, employee_name: user.employee_name || user.employee }];
    }
    if (controlledEmployees !== undefined) {
      return Array.isArray(controlledEmployees)
        ? controlledEmployees
        : controlledEmployees
          ? [controlledEmployees]
          : [];
    }
    if (selectedEmployee !== undefined) {
      return Array.isArray(selectedEmployee)
        ? selectedEmployee
        : selectedEmployee
          ? [selectedEmployee]
          : [];
    }
    return internalEmployees;
  }, [
    isRestrictedEmployee,
    user?.employee,
    user?.employee_name,
    controlledEmployees,
    selectedEmployee,
    internalEmployees,
  ]);

  const setSelectedEmployees = (val: any[]) => {
    if (isRestrictedEmployee) return;
    setInternalEmployees(val);
    onSelectEmployees?.(val);
    onSelectEmployee?.(val.length === 1 ? val[0] : val.length > 0 ? val : null);
  };

  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Dialog state for adding/editing entry from a cell
  const [openDialog, setOpenDialog] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<string | undefined>();
  const [targetDate, setTargetDate] = useState<string | undefined>();

  // Drag-scroll horizontal container
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const isMouseDownRef = useRef(false);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;

    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, input, select, a, [role="button"]')) return;
      isMouseDownRef.current = true;
      isDraggingRef.current = false;
      startXRef.current = e.pageX - el.offsetLeft;
      scrollLeftRef.current = el.scrollLeft;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startXRef.current) * 1.2;
      if (Math.abs(walk) > 5) {
        isDraggingRef.current = true;
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
        el.scrollLeft = scrollLeftRef.current - walk;
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      if (el) {
        el.style.cursor = 'default';
        el.style.userSelect = '';
      }
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 50);
    };

    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Fetch Master Data
  useEffect(() => {
    const fetchMasters = async () => {
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
    fetchMasters();
  }, []);

  const employeeFilterParam = useMemo(() => {
    if (selectedEmployees.length > 0) {
      return selectedEmployees.map((e) => (typeof e === 'string' ? e : e.name));
    }
    return undefined;
  }, [selectedEmployees]);

  // Hook for monthly data
  const {
    data: rosterData,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    refetch,
    loadMore,
  } = useMonthlyCanteen(
    currentDate.month() + 1,
    currentDate.year(),
    selectedDept,
    employeeFilterParam,
    selectedMealType,
    50
  );

  useEffect(() => {
    if (refreshTrigger) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Filter employees client-side for immediate search responsiveness
  const filteredEmployees = useMemo(() => {
    if (!rosterData?.employees) return [];
    if (!searchEmployee) return rosterData.employees;
    const term = searchEmployee.toLowerCase();
    return rosterData.employees.filter(
      (emp) =>
        emp.employee_name.toLowerCase().includes(term) ||
        emp.employee.toLowerCase().includes(term) ||
        emp.department.toLowerCase().includes(term)
    );
  }, [rosterData?.employees, searchEmployee]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => prev.add(1, 'month'));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(dayjs());
  };

  const handleCellClick = (employeeId: string, dateStr: string) => {
    if (!canEdit) return;
    setTargetEmployee(employeeId);
    setTargetDate(dateStr);
    setOpenDialog(true);
  };

  const activeFiltersCount =
    (selectedDept !== 'all' ? 1 : 0) +
    (selectedMealType !== 'all' ? 1 : 0) +
    (selectedEmployees.length > 0 ? 1 : 0);

  return (
    <>
      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        {/* Controls Toolbar */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {/* Search bar */}
          <Stack direction="row" spacing={2} alignItems="center" flexGrow={1} sx={{ minWidth: 260, maxWidth: { xs: '100%', md: 480 } }}>
            <OutlinedInput
              fullWidth
              size="small"
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              placeholder="Search employee, department..."
              startAdornment={
                <InputAdornment position="start">
                  <Iconify width={18} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              }
              endAdornment={
                searchEmployee ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchEmployee('')}
                      edge="end"
                      aria-label="clear search"
                      sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
                    >
                      <Iconify icon={"solar:close-circle-bold" as any} width={18} />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }
              sx={{
                height: 44,
                borderRadius: 1.25,
                bgcolor: 'background.paper',
                '& .MuiOutlinedInput-input': { py: 0, fontSize: '0.875rem' },
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: 'text.secondary' },
                '&.Mui-focused fieldset': { borderColor: COMMON_COLORS.emerald.main },
              }}
            />
          </Stack>

          {/* Month Navigation & Action Controls */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                p: 0.5,
                px: 1,
                borderRadius: 1,
                bgcolor: 'background.paper',
                border: (t) => `1px solid ${t.palette.divider}`,
              }}
            >
              <Button
                variant="text"
                size="small"
                onClick={handleCurrentMonth}
                sx={{ fontWeight: 700, color: COMMON_COLORS.emerald.main, px: 1 }}
              >
                Current Month
              </Button>

              <IconButton size="small" onClick={handlePrevMonth}>
                <Iconify icon={"solar:alt-arrow-left-linear" as any} width={18} />
              </IconButton>
              <Typography variant="subtitle2" sx={{ minWidth: 140, textAlign: 'center', fontWeight: 800 }}>
                {currentDate.format('MMMM YYYY')}
              </Typography>
              <IconButton size="small" onClick={handleNextMonth}>
                <Iconify icon={"solar:alt-arrow-right-linear" as any} width={18} />
              </IconButton>
            </Stack>

            {/* Filter Drawer Trigger Button */}
            <Button
              disableRipple
              onClick={() => setOpenFilters(true)}
              sx={{
                height: 42,
                px: 2,
                bgcolor: COMMON_COLORS.filterButton.bg,
                color: COMMON_COLORS.filterButton.color,
                borderRadius: 1.25,
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                boxShadow: 'none',
                border: 'none',
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: COMMON_COLORS.filterButton.hoverBg,
                  boxShadow: 'none',
                },
              }}
            >
              <Badge
                color="error"
                variant="dot"
                invisible={activeFiltersCount === 0}
                sx={{
                  '& .MuiBadge-badge': {
                    top: 2,
                    right: 2,
                  },
                }}
              >
                <Iconify icon={"solar:filter-linear" as any} width={18} sx={{ color: COMMON_COLORS.filterButton.color, flexShrink: 0 }} />
              </Badge>
              <Box component="span" sx={{ whiteSpace: 'nowrap', display: 'inline', fontWeight: 700 }}>
                {activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filters'}
              </Box>
              <Iconify icon={"eva:chevron-down-fill" as any} width={16} sx={{ color: COMMON_COLORS.filterButton.color, flexShrink: 0 }} />
            </Button>
          </Stack>
        </Stack>

        {/* Legend Bar */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          flexWrap="wrap"
          sx={{ px: 2.5, py: 1.25, bgcolor: alpha(theme.palette.grey[500], 0.04), borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5 }}>
            LEGEND:
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: 0.5,
                bgcolor: alpha(COMMON_COLORS.emerald.main, 0.15),
                color: COMMON_COLORS.emerald.dark,
                fontWeight: 700,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${COMMON_COLORS.emerald.main}`,
              }}
            >
              1
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Meal Availed (Count)
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: 0.5,
                bgcolor: '#fef3c7',
                border: '1px solid #fde68a',
                color: '#b45309',
                fontWeight: 700,
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              H
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Holiday / Sunday
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: 0.5,
                bgcolor: alpha(theme.palette.grey[500], 0.08),
                border: '1px dashed #d1d5db',
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              No Meal
            </Typography>
          </Stack>
        </Stack>

        {/* Matrix Grid Container */}
        <Box
          ref={tableContainerRef}
          sx={{
            width: '100%',
            overflowX: 'auto',
            maxHeight: 'calc(100vh - 280px)',
            position: 'relative',
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
              <CircularProgress size={36} />
            </Box>
          ) : (
            <Table
              size="small"
              stickyHeader
              sx={{
                minWidth: 1000,
                borderCollapse: 'separate',
                borderSpacing: 0,
                '& th, & td': {
                  borderRight: `1px solid ${theme.palette.divider}`,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                },
              }}
            >
              <TableHead>
                {/* Day Names & Day Numbers Header */}
                <TableRow sx={{ '& th': { bgcolor: 'background.paper', zIndex: 3 } }}>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 5,
                      bgcolor: 'background.paper',
                      minWidth: 240,
                      fontWeight: 700,
                      boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
                    }}
                  >
                    Employee ({filteredEmployees.length} of {totalCount || filteredEmployees.length})
                  </TableCell>

                  {rosterData?.days.map((d) => {
                    const isSunOrHol = d.is_weekend || d.is_holiday;
                    return (
                      <TableCell
                        key={d.date}
                        align="center"
                        sx={{
                          p: 0.75,
                          minWidth: 38,
                          maxWidth: 42,
                          bgcolor: isSunOrHol ? '#fef3c7 !important' : 'background.neutral',
                          color: isSunOrHol ? '#b45309' : 'text.primary',
                        }}
                      >
                        <Tooltip title={d.is_holiday ? `Holiday: ${d.holiday_name}` : d.is_weekend ? 'Sunday (Weekly Off)' : ''}>
                          <div>
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', fontWeight: 700 }}>
                              {d.day_name.toUpperCase()}
                            </Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem' }}>
                              {String(d.day).padStart(2, '0')}
                            </Typography>
                          </div>
                        </Tooltip>
                      </TableCell>
                    );
                  })}

                  <TableCell
                    align="center"
                    sx={{
                      minWidth: 64,
                      fontWeight: 700,
                      bgcolor: 'background.neutral',
                    }}
                  >
                    Total
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow
                    key={emp.employee}
                    hover
                    sx={{
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                    }}
                  >
                    {/* Sticky Employee Name Column */}
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        bgcolor: 'background.paper',
                        boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
                        py: 1,
                        px: 1.5,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {emp.employee_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                        {emp.employee} {emp.department ? `• ${emp.department}` : ''}
                      </Typography>
                    </TableCell>

                    {/* Day Cells */}
                    {rosterData?.days.map((d) => {
                      const entry = emp.entries[d.date];
                      const availed = entry?.availed && entry?.meal_count > 0;
                      const isSunOrHol = d.is_weekend || d.is_holiday;

                      return (
                        <TableCell
                          key={d.date}
                          align="center"
                          onClick={() => handleCellClick(emp.employee, d.date)}
                          sx={{
                            p: 0.5,
                            cursor: canEdit ? 'pointer' : 'default',
                            bgcolor: isSunOrHol ? '#fffbeb' : 'inherit',
                            transition: 'all 0.15s ease',
                            '&:hover': canEdit
                              ? {
                                  bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                                }
                              : {},
                          }}
                        >
                          {availed ? (
                            <Tooltip
                              title={`${emp.employee_name} - ${entry.meal_type || 'Lunch'} (${entry.meal_count} meals) on ${d.date}`}
                            >
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 26,
                                  height: 26,
                                  borderRadius: 1,
                                  bgcolor: COMMON_COLORS.emerald.main,
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                }}
                              >
                                {entry.meal_count}
                              </Box>
                            </Tooltip>
                          ) : (
                            <Box
                              sx={{
                                width: '100%',
                                height: 26,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isSunOrHol ? '#d97706' : 'text.disabled',
                                fontSize: '0.75rem',
                              }}
                            >
                              {d.is_holiday ? 'H' : ''}
                            </Box>
                          )}
                        </TableCell>
                      );
                    })}

                    {/* Employee Row Total */}
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {emp.total_meals}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Daily Totals Footer Row (Image 1 bottom sum row) */}
                {rosterData && filteredEmployees.length > 0 && (
                  <TableRow
                    sx={{
                      position: 'sticky',
                      bottom: 0,
                      zIndex: 3,
                      bgcolor: 'background.neutral',
                      '& td': {
                        borderTop: '2px solid',
                        borderColor: 'divider',
                        fontWeight: 800,
                        bgcolor: 'background.neutral',
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 4,
                        bgcolor: 'background.neutral',
                        fontWeight: 800,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
                      }}
                    >
                      Daily Totals (Sum)
                    </TableCell>

                    {rosterData.days.map((d) => {
                      const count = rosterData.daily_totals?.[d.date] || 0;
                      return (
                        <TableCell key={d.date} align="center">
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              color: count > 0 ? COMMON_COLORS.emerald.dark : 'text.disabled',
                            }}
                          >
                            {count > 0 ? count : '-'}
                          </Typography>
                        </TableCell>
                      );
                    })}

                    <TableCell
                      align="center"
                      sx={{
                        bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                        color: COMMON_COLORS.emerald.dark,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                        {rosterData.grand_total}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {/* Load More Button if hasMore */}
          {hasMore && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={loadMore}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={16} /> : null}
              >
                {loadingMore ? 'Loading More Employees...' : 'Load More Employees'}
              </Button>
            </Box>
          )}
        </Box>
      </Card>

      {/* Filter Drawer */}
      <CanteenTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={{
          department: selectedDept,
          employees: selectedEmployees,
          meal_type: selectedMealType,
        }}
        onFilters={(update) => {
          if (update.department !== undefined) setSelectedDept(update.department);
          if (update.meal_type !== undefined) setSelectedMealType(update.meal_type);
          if (update.employees !== undefined) setSelectedEmployees(update.employees);
        }}
        canReset={activeFiltersCount > 0}
        onResetFilters={() => {
          setSelectedDept('all');
          setSelectedMealType('all');
          setSelectedEmployees([]);
        }}
        employeeOptions={employees}
        departmentOptions={departments}
        hideDateFilters
        hideStatusFilter
      />

      {/* Add / Edit Entry Dialog for clicked cell */}
      {openDialog && (
        <CanteenDialog
          open={openDialog}
          onClose={() => {
            setOpenDialog(false);
            setTargetEmployee(undefined);
            setTargetDate(undefined);
          }}
          onSuccess={() => {
            refetch();
          }}
          initialEmployee={targetEmployee}
          initialDate={targetDate}
        />
      )}
    </>
  );
}
