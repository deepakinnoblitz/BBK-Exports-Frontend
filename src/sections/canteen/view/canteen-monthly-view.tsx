import type { CanteenEntry } from 'src/api/canteen';

import dayjs from 'dayjs';
import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { useMonthlyCanteen } from 'src/hooks/use-canteen';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { CanteenDialog } from '../canteen-dialog';
import { CanteenTableFiltersDrawer } from '../canteen-table-filters-drawer';

// ----------------------------------------------------------------------

const sortOptions = [
  { value: 'modified_desc', label: 'Newest First' },
  { value: 'modified_asc', label: 'Oldest First' },
  { value: 'employee_name_asc', label: 'Employee Name: A to Z' },
  { value: 'employee_name_desc', label: 'Employee Name: Z to A' },
  { value: 'department_asc', label: 'Department: A to Z' },
  { value: 'department_desc', label: 'Department: Z to A' },
];

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
  const [selectedEntry, setSelectedEntry] = useState<CanteenEntry | null>(null);
  const [targetEmployee, setTargetEmployee] = useState<string | undefined>();
  const [targetDate, setTargetDate] = useState<string | undefined>();

  // Drag-scroll horizontal container (zero re-renders)
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);
  const dragMoved = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = gridScrollRef.current;
    if (!el) return;
    isDragging.current = true;
    dragStartX.current = e.clientX;
    scrollStartLeft.current = el.scrollLeft;
    dragMoved.current = 0;
    el.style.cursor = 'grabbing';
  };

  const handleMouseLeave = () => {
    const el = gridScrollRef.current;
    if (!el) return;
    isDragging.current = false;
    el.style.cursor = 'grab';
  };

  const handleMouseUp = () => {
    const el = gridScrollRef.current;
    if (!el) return;
    isDragging.current = false;
    el.style.cursor = 'grab';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const el = gridScrollRef.current;
    if (!el) return;
    e.preventDefault();
    const dx = e.clientX - dragStartX.current;
    dragMoved.current = Math.abs(dx);
    el.scrollLeft = scrollStartLeft.current - dx;
  };

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

  const [sortBy, setSortBy] = useState('modified_desc');
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);

  // Hook for monthly data with server-side sorting
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
    50,
    sortBy
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sentinelRef.current && hasMore && !loading && !loadingMore) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
            loadMore();
          }
        },
        { root: null, rootMargin: '200px', threshold: 0.1 }
      );
      observer.observe(sentinelRef.current);
      return () => observer.disconnect();
    }
    return undefined;
  }, [hasMore, loading, loadingMore, loadMore]);

  useEffect(() => {
    if (refreshTrigger) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Filter employees client-side for immediate search term responsiveness
  const filteredEmployees = useMemo(() => {
    if (!rosterData?.employees) return [];
    let list = [...rosterData.employees];
    if (searchEmployee) {
      const term = searchEmployee.toLowerCase();
      list = list.filter(
        (emp) =>
          emp.employee_name.toLowerCase().includes(term) ||
          emp.employee.toLowerCase().includes(term) ||
          emp.department.toLowerCase().includes(term)
      );
    }
    return list;
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

  const handleCellClick = (emp: any, d: any) => {
    if (dragMoved.current > 6) return;
    if (!canEdit) return;
    const entry = emp.entries?.[d.date];
    if (entry?.availed) {
      setSelectedEntry({
        name: entry.entry_id || '',
        employee: emp.employee,
        employee_name: emp.employee_name,
        department: emp.department,
        designation: emp.designation,
        canteen_date: d.date,
        meal_type: entry.meal_type || 'Lunch',
        meal_count: entry.meal_count ?? 1,
        status: 'Availed',
        source: entry.source || 'Manual',
      });
      setTargetEmployee(undefined);
      setTargetDate(undefined);
    } else {
      setSelectedEntry(null);
      setTargetEmployee(emp.employee);
      setTargetDate(d.date);
    }
    setOpenDialog(true);
  };

  const activeFiltersCount =
    (selectedDept !== 'all' ? 1 : 0) +
    (selectedMealType !== 'all' ? 1 : 0) +
    (selectedEmployees.length > 0 ? 1 : 0);

  return (
    <Stack spacing={2.5}>
      {/* Controls Toolbar Card */}
      <Card
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          bgcolor: 'background.paper',
          border: (t) => `1px solid ${t.palette.divider}`,
        }}
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

          {/* Sort Button & Menu */}
          <Button
            onClick={(e) => setSortAnchorEl(e.currentTarget)}
            sx={{
              height: 42,
              minWidth: 165,
              px: 1.5,
              py: 0.5,
              bgcolor: COMMON_COLORS.sortButton.bg,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.25,
              textTransform: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.25,
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'text.secondary',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon={"solar:sort-vertical-linear" as any} width={18} sx={{ color: COMMON_COLORS.sortButton.labelColor, flexShrink: 0 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography component="span" sx={{ fontSize: '0.675rem', fontWeight: 500, color: COMMON_COLORS.sortButton.labelColor, lineHeight: 1.1 }}>
                  Sort by
                </Typography>
                <Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 700, color: COMMON_COLORS.sortButton.valueColor, lineHeight: 1.2 }}>
                  {sortOptions.find((o) => o.value === sortBy)?.label || 'Newest First'}
                </Typography>
              </Box>
            </Box>
            <Iconify icon={"eva:chevron-down-fill" as any} width={16} sx={{ color: COMMON_COLORS.sortButton.labelColor, flexShrink: 0 }} />
          </Button>

          <Menu
            anchorEl={sortAnchorEl}
            open={Boolean(sortAnchorEl)}
            onClose={() => setSortAnchorEl(null)}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 190,
                borderRadius: 1.25,
                boxShadow: '0 4px 20px 0 rgba(0,0,0,0.08)',
              },
            }}
          >
            {sortOptions.map((option) => (
              <MenuItem
                key={option.value}
                selected={option.value === sortBy}
                onClick={() => {
                  setSortBy(option.value);
                  setSortAnchorEl(null);
                }}
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: option.value === sortBy ? 600 : 400,
                  py: 1,
                  px: 2,
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      </Card>

      {/* Main Board Card */}
      <Card sx={{ p: 2.5 }}>
        {/* Legend Bar */}
        <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1.5 }} alignItems="center">
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>
            LEGEND:
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 26,
                height: 22,
                borderRadius: '6px',
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
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Meal Availed (Count)
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 26,
                height: 22,
                borderRadius: '6px',
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
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Holiday / Sunday
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 26,
                height: 22,
                borderRadius: '6px',
                bgcolor: '#f8fafc',
                border: '1px dashed #cbd5e1',
              }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              No Meal
            </Typography>
          </Stack>
        </Stack>

        {/* Scrollable Matrix Grid Container */}
        <Box
          ref={gridScrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          sx={{
            width: '100%',
            overflowX: 'auto',
            borderRadius: '12px',
            border: (t) => `1px solid ${t.palette.divider}`,
            bgcolor: 'background.paper',
            cursor: 'grab',
            userSelect: 'none',
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.15)',
              borderRadius: 4,
            },
          }}
        >
          <Table size="small" sx={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 900 }}>
            <TableHead>
              {/* Day Names & Day Numbers Header */}
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    color: 'text.primary',
                    py: 1.5,
                    minWidth: 200,
                    position: 'sticky',
                    left: 0,
                    bgcolor: 'background.neutral',
                    zIndex: 11,
                    borderRight: (t) => `1px solid ${t.palette.divider}`,
                    borderBottom: (t) => `1px solid ${t.palette.divider}`,
                  }}
                >
                  Employee ({filteredEmployees.length}{totalCount ? ` of ${totalCount}` : ''})
                </TableCell>

                {rosterData?.days?.map((d) => {
                  const isSunOrHol = d.is_weekend || d.is_holiday;
                  return (
                    <TableCell
                      key={d.date}
                      align="center"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        py: 1,
                        px: 0.5,
                        minWidth: 42,
                        maxWidth: 42,
                        bgcolor: isSunOrHol ? '#fef3c7 !important' : undefined,
                        color: isSunOrHol ? '#b45309' : d.is_weekend ? 'text.secondary' : 'text.primary',
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        borderBottom: (t) => `1px solid ${t.palette.divider}`,
                      }}
                    >
                      <Tooltip title={d.is_holiday ? `Holiday: ${d.holiday_name}` : d.is_weekend ? 'Sunday (Weekly Off)' : ''}>
                        <Box>
                          <Box sx={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8, fontWeight: 800 }}>
                            {d.day_name}
                          </Box>
                          <Box sx={{ fontSize: '0.85rem', fontWeight: 800 }}>
                            {d.day < 10 ? `0${d.day}` : d.day}
                          </Box>
                        </Box>
                      </Tooltip>
                    </TableCell>
                  );
                })}

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    py: 1.5,
                    px: 1,
                    minWidth: 70,
                    color: 'text.primary',
                    borderRight: (t) => `1px solid ${t.palette.divider}`,
                    borderBottom: (t) => `1px solid ${t.palette.divider}`,
                  }}
                >
                  Total
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={(rosterData?.days?.length || 0) + 2} align="center" sx={{ py: 10 }}>
                    <CircularProgress sx={{ color: COMMON_COLORS.emerald.main }} />
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(rosterData?.days?.length || 0) + 2} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No employees matching the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow
                    key={emp.employee}
                    hover
                    sx={{
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                      '& td': { py: 1.2 },
                    }}
                  >
                    {/* Sticky Employee Name Column */}
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        bgcolor: 'background.paper',
                        zIndex: 10,
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        borderBottom: (t) => `1px solid ${t.palette.divider}`,
                        boxShadow: '4px 0 8px -4px rgba(0,0,0,0.12)',
                        minWidth: 200,
                        maxWidth: 240,
                      }}
                    >
                      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                        {emp.employee_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {emp.employee} {emp.department && emp.department !== '-' ? `• ${emp.department}` : ''}
                      </Typography>
                    </TableCell>

                    {/* Day Cells */}
                    {rosterData?.days?.map((d) => {
                      const entry = emp.entries[d.date];
                      const availed = entry?.availed && entry?.meal_count > 0;
                      const isSunOrHol = d.is_weekend || d.is_holiday;

                      return (
                        <TableCell
                          key={d.date}
                          align="center"
                          onClick={() => handleCellClick(emp, d)}
                          sx={{
                            px: 0.5,
                            py: 0.8,
                            minWidth: 42,
                            maxWidth: 42,
                            cursor: canEdit ? 'pointer' : 'default',
                            bgcolor: isSunOrHol ? '#fffbeb' : undefined,
                            borderRight: (t) => `1px solid ${t.palette.divider}`,
                            borderBottom: (t) => `1px solid ${t.palette.divider}`,
                            transition: 'background-color 0.15s ease',
                            '&:hover': canEdit
                              ? {
                                  bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
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
                                  height: 22,
                                  borderRadius: '6px',
                                  bgcolor: COMMON_COLORS.emerald.main,
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
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
                                height: 22,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            />
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
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        borderBottom: (t) => `1px solid ${t.palette.divider}`,
                        minWidth: 70,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {emp.total_meals}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}

              {/* Daily Totals Footer Row */}
              {rosterData && filteredEmployees.length > 0 && (
                <TableRow
                  sx={{
                    bgcolor: 'background.neutral',
                  }}
                >
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      bgcolor: 'background.neutral',
                      fontWeight: 800,
                      boxShadow: '4px 0 8px -4px rgba(0,0,0,0.12)',
                      borderRight: (t) => `1px solid ${t.palette.divider}`,
                      borderBottom: (t) => `1px solid ${t.palette.divider}`,
                      borderTop: (t) => `2px solid ${t.palette.divider}`,
                      py: 1.2,
                      px: 1.5,
                      minWidth: 200,
                      maxWidth: 240,
                    }}
                  >
                    Daily Totals (Sum)
                  </TableCell>

                  {rosterData.days.map((d) => {
                    const count = rosterData.daily_totals?.[d.date] || 0;
                    return (
                      <TableCell
                        key={d.date}
                        align="center"
                        sx={{
                          px: 0.5,
                          py: 1,
                          minWidth: 42,
                          maxWidth: 42,
                          borderRight: (t) => `1px solid ${t.palette.divider}`,
                          borderBottom: (t) => `1px solid ${t.palette.divider}`,
                          borderTop: (t) => `2px solid ${t.palette.divider}`,
                          bgcolor: 'background.neutral',
                        }}
                      >
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
                      borderRight: (t) => `1px solid ${t.palette.divider}`,
                      borderBottom: (t) => `1px solid ${t.palette.divider}`,
                      borderTop: (t) => `2px solid ${t.palette.divider}`,
                      minWidth: 70,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                      {rosterData.grand_total}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {/* Sentinel and Load More row */}
              {hasMore && (
                <TableRow>
                  <TableCell
                    colSpan={(rosterData?.days?.length || 31) + 2}
                    align="center"
                    sx={{ py: 2, bgcolor: 'background.neutral' }}
                  >
                    <Box ref={sentinelRef} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                      {loadingMore ? (
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <CircularProgress size={20} color="primary" />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            Loading more employees... ({filteredEmployees.length} of {totalCount})
                          </Typography>
                        </Stack>
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => loadMore()}
                          startIcon={<Iconify icon={"solar:alt-arrow-down-linear" as any} />}
                          sx={{ fontWeight: 700 }}
                        >
                          Load More ({Math.min(50, (totalCount || filteredEmployees.length) - filteredEmployees.length)} remaining)
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
        employeeOptions={selectedDept === 'all' ? employees : employees.filter((e) => e.department === selectedDept)}
        departmentOptions={departments}
        hideDateFilters
        hideStatusFilter
        isHR={isHRUser}
      />

      {/* Add / Edit Entry Dialog for clicked cell */}
      {openDialog && (
        <CanteenDialog
          open={openDialog}
          onClose={() => {
            setOpenDialog(false);
            setSelectedEntry(null);
            setTargetEmployee(undefined);
            setTargetDate(undefined);
          }}
          onSuccess={() => {
            refetch();
          }}
          editData={selectedEntry}
          initialEmployee={targetEmployee}
          initialDate={targetDate}
        />
      )}
    </Stack>
  );
}

