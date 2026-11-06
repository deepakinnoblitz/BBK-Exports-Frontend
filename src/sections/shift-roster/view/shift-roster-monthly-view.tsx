import dayjs from 'dayjs';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useMonthlyRoster } from 'src/hooks/use-shift-roster';

import { filterEmployeeOptions } from 'src/utils/filter-employees';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { ShiftRosterDialog } from '../shift-roster-dialog';
import { ShiftRosterTableFiltersDrawer } from '../shift-roster-table-filters-drawer';

// ----------------------------------------------------------------------

const SHIFT_PALETTES = [
  { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' }, // Sky
  { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' }, // Green
  { bg: '#fef3c7', color: '#d97706', border: '#fde68a' }, // Amber
  { bg: '#f3e8ff', color: '#9333ea', border: '#e9d5ff' }, // Purple
  { bg: '#ffe4e6', color: '#e11d48', border: '#fecdd3' }, // Rose
  { bg: '#ccfbf1', color: '#0d9488', border: '#99f6e4' }, // Teal
];

function getShiftShortCode(name: string): string {
  if (!name) return '-';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ShiftRosterMonthlyView({
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
  filterVariant?: 'drawer' | 'inline' | 'quick-range';
  refreshTrigger?: number;
  isHR?: boolean;
}) {
  const { user } = useAuth();
  const isHRUser = isHR !== undefined ? isHR : user?.roles?.some((role: string) => ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role));
  const isRestrictedEmployee = user?.roles?.includes('Employee') && !isHRUser;

  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs());
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date_asc');
  const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(
    filterVariant === 'quick-range' ? dayjs().startOf('month') : null
  );
  const [toDate, setToDate] = useState<dayjs.Dayjs | null>(
    filterVariant === 'quick-range' ? dayjs().endOf('month') : null
  );
  const [searchEmployee, setSearchEmployee] = useState('');
  const [openFilters, setOpenFilters] = useState(false);
  const [internalEmployees, setInternalEmployees] = useState<any[]>([]);

  // Quick Range Presets
  const handlePreset = useCallback(
    (preset: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth') => {
      const today = dayjs();
      if (preset === 'today') {
        setFromDate(today);
        setToDate(today);
        if (!currentDate.isSame(today, 'month')) setCurrentDate(today);
      } else if (preset === 'yesterday') {
        const yest = today.subtract(1, 'day');
        setFromDate(yest);
        setToDate(yest);
        if (!currentDate.isSame(yest, 'month')) setCurrentDate(yest);
      } else if (preset === 'last7') {
        setFromDate(today.subtract(6, 'day'));
        setToDate(today);
        if (!currentDate.isSame(today, 'month')) setCurrentDate(today);
      } else if (preset === 'thisMonth') {
        setFromDate(today.startOf('month'));
        setToDate(today.endOf('month'));
        if (!currentDate.isSame(today, 'month')) setCurrentDate(today);
      } else if (preset === 'lastMonth') {
        const lastM = today.subtract(1, 'month');
        setFromDate(lastM.startOf('month'));
        setToDate(lastM.endOf('month'));
        setCurrentDate(lastM);
      }
    },
    [currentDate]
  );

  const isPresetActive = useCallback(
    (preset: string) => {
      const today = dayjs();
      if (!fromDate || !toDate) return false;
      if (preset === 'today') return fromDate.isSame(today, 'day') && toDate.isSame(today, 'day');
      if (preset === 'yesterday')
        return fromDate.isSame(today.subtract(1, 'day'), 'day') && toDate.isSame(today.subtract(1, 'day'), 'day');
      if (preset === 'last7')
        return fromDate.isSame(today.subtract(6, 'day'), 'day') && toDate.isSame(today, 'day');
      if (preset === 'thisMonth')
        return (
          fromDate.isSame(today.startOf('month'), 'day') &&
          toDate.isSame(today.endOf('month'), 'day') &&
          currentDate.isSame(today, 'month')
        );
      if (preset === 'lastMonth') {
        const lastM = today.subtract(1, 'month');
        return (
          fromDate.isSame(lastM.startOf('month'), 'day') &&
          toDate.isSame(lastM.endOf('month'), 'day') &&
          currentDate.isSame(lastM, 'month')
        );
      }
      return false;
    },
    [fromDate, toDate, currentDate]
  );

  const selectedEmployees: any[] = useMemo(() => {
    if (isRestrictedEmployee && user?.employee) {
      return [{ name: user.employee, employee_name: user.employee_name || user.employee }];
    }
    if (controlledEmployees !== undefined) {
      return Array.isArray(controlledEmployees) ? controlledEmployees : controlledEmployees ? [controlledEmployees] : [];
    }
    if (selectedEmployee !== undefined) {
      return Array.isArray(selectedEmployee) ? selectedEmployee : selectedEmployee ? [selectedEmployee] : [];
    }
    return internalEmployees;
  }, [isRestrictedEmployee, user?.employee, user?.employee_name, controlledEmployees, selectedEmployee, internalEmployees]);

  const setSelectedEmployees = (val: any[]) => {
    if (isRestrictedEmployee) return;
    setInternalEmployees(val);
    onSelectEmployees?.(val);
    onSelectEmployee?.(val.length === 1 ? val[0] : val.length > 0 ? val : null);
  };

  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  // Dialog state
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<string | undefined>();
  const [targetDate, setTargetDate] = useState<string | undefined>();

  // Drag-scroll horizontal container (zero re-renders)
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);
  const dragMoved = useRef(0);

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      const [deptRes, empRes, shiftRes] = await Promise.all([
        getDoctypeList('Department', ['name', 'department_name']),
        getDoctypeList('Employee', ['name', 'employee_name', 'department']),
        getDoctypeList('Shift', ['name', 'shift_name']),
      ]);
      setDepartments(deptRes || []);
      setEmployees(empRes || []);
      setShifts(shiftRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const month = currentDate.month() + 1;
  const year = currentDate.year();

  const employeeFilterParam = useMemo(() => {
    if (isRestrictedEmployee && user?.employee) {
      return [user.employee];
    }
    if (selectedEmployees.length === 0) return undefined;
    return selectedEmployees.map((e) => (typeof e === 'string' ? e : e.name));
  }, [isRestrictedEmployee, user?.employee, selectedEmployees]);

  const { data, loading, loadingMore, hasMore, totalCount, refetch, loadMore } = useMonthlyRoster(
    month,
    year,
    selectedDept !== 'all' ? selectedDept : undefined,
    employeeFilterParam
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
        { root: null, rootMargin: '350px', threshold: 0.1 }
      );
      observer.observe(sentinelRef.current);
      return () => observer.disconnect();
    }
    return undefined;
  }, [hasMore, loading, loadingMore, loadMore]);

  useEffect(() => {
    if (hasMore && !loading && !loadingMore) {
      const handleScroll = () => {
        const scrollY = window.scrollY || window.pageYOffset;
        const viewportHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        if (scrollY + viewportHeight >= docHeight - 350) {
          loadMore();
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
    return undefined;
  }, [hasMore, loading, loadingMore, loadMore]);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  const handlePrevMonth = () => {
    const newDate = currentDate.subtract(1, 'month');
    setCurrentDate(newDate);
    if (filterVariant === 'quick-range') {
      setFromDate(newDate.startOf('month'));
      setToDate(newDate.endOf('month'));
    }
  };

  const handleNextMonth = () => {
    const newDate = currentDate.add(1, 'month');
    setCurrentDate(newDate);
    if (filterVariant === 'quick-range') {
      setFromDate(newDate.startOf('month'));
      setToDate(newDate.endOf('month'));
    }
  };

  const handleToday = () => {
    const today = dayjs();
    setCurrentDate(today);
    if (filterVariant === 'quick-range') {
      setFromDate(today.startOf('month'));
      setToDate(today.endOf('month'));
    }
  };

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

  const handleCellClick = (empId: string, dStr: string) => {
    if (dragMoved.current > 6) return; // Ignore drag clicks
    if (canEdit) {
      setTargetEmployee(empId);
      setTargetDate(dStr);
      setOpenAssignDialog(true);
    }
  };

  // Filter helper logic
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (isHRUser && selectedEmployees.length > 0) count += 1;
    if (selectedShiftFilter !== 'all') count += 1;
    if (selectedStatus !== 'all') count += 1;
    if (fromDate?.isValid()) count += 1;
    if (toDate?.isValid()) count += 1;
    return count;
  }, [isHRUser, selectedEmployees, selectedShiftFilter, selectedStatus, fromDate, toDate]);

  const canReset =
    (isHRUser && selectedEmployees.length > 0) ||
    selectedShiftFilter !== 'all' ||
    selectedStatus !== 'all' ||
    Boolean(fromDate?.isValid()) ||
    Boolean(toDate?.isValid()) ||
    Boolean(searchEmployee);

  const handleResetFilters = () => {
    if (isHRUser) {
      setSelectedDept('all');
      setSelectedEmployees([]);
    }
    setSelectedShiftFilter('all');
    setSelectedStatus('all');
    setFromDate(null);
    setToDate(null);
    setSearchEmployee('');
  };

  const handleDrawerFilters = (update: any) => {
    if (update.department !== undefined) {
      setSelectedDept(update.department);
    }
    if (update.employees !== undefined) {
      setSelectedEmployees(update.employees || []);
    } else if (update.employee !== undefined) {
      const val = Array.isArray(update.employee) ? update.employee : update.employee ? [update.employee] : [];
      setSelectedEmployees(val);
    }
    if (update.shift !== undefined) {
      setSelectedShiftFilter(update.shift);
    }
    if (update.status !== undefined) {
      setSelectedStatus(update.status);
    }
    if (update.fromDate !== undefined) {
      setFromDate(update.fromDate);
    }
    if (update.toDate !== undefined) {
      setToDate(update.toDate);
    }
  };

  // Color map for shifts
  const shiftColorMap: Record<string, { bg: string; color: string; border: string }> = {};
  const shiftList = data?.shifts?.length ? data.shifts : shifts;
  shiftList.forEach((s, idx) => {
    shiftColorMap[s.name] = SHIFT_PALETTES[idx % SHIFT_PALETTES.length];
  });

  const shiftOptions = useMemo(() => {
    if (shifts.length > 0) return shifts;
    return data?.shifts || [];
  }, [shifts, data?.shifts]);

  const days = useMemo(() => {
    if (!data?.days) return [];
    return data.days.filter((d) => {
      if (fromDate?.isValid() && dayjs(d.date).isBefore(fromDate, 'day')) return false;
      if (toDate?.isValid() && dayjs(d.date).isAfter(toDate, 'day')) return false;
      return true;
    });
  }, [data?.days, fromDate, toDate]);

  const filteredEmployees = (data?.employees || []).filter((emp) => {
    if (selectedShiftFilter && selectedShiftFilter !== 'all') {
      const hasShift = Object.values(emp.shifts || {}).some(
        (cell: any) => cell?.shift === selectedShiftFilter || cell?.shift_name === selectedShiftFilter
      );
      if (!hasShift) return false;
    }
    if (selectedStatus && selectedStatus !== 'all') {
      const hasMatchingStatus = Object.values(emp.shifts || {}).some((cell: any) => {
        if (selectedStatus === 'Active') {
          return cell?.source === 'ROSTER' || cell?.source === 'ROTATION' || cell?.source === 'DEFAULT';
        }
        if (selectedStatus === 'Cancelled') {
          return cell?.status === 'Cancelled';
        }
        return true;
      });
      if (!hasMatchingStatus) return false;
    }
    if (!searchEmployee) return true;
    const q = searchEmployee.toLowerCase();
    return (
      emp.employee_name.toLowerCase().includes(q) ||
      emp.employee.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q)
    );
  });

  const todayStr = dayjs().format('YYYY-MM-DD');

  const sortedEmployees = useMemo(() => {
    const list = [...filteredEmployees];
    if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.employee_name || a.employee).localeCompare(b.employee_name || b.employee));
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => (b.employee_name || b.employee).localeCompare(a.employee_name || a.employee));
    }
    return list;
  }, [filteredEmployees, sortBy]);

  const displayDays = useMemo(() => {
    if (sortBy === 'date_desc') {
      return [...days].reverse();
    }
    return days;
  }, [days, sortBy]);

  return (
    <Stack spacing={2.5}>
      {/* Filter toolbar based on filterVariant */}
      {filterVariant === 'quick-range' ? (
        <Card
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.75,
            borderRadius: 2,
            bgcolor: (t) => alpha('#10b981', 0.04),
            border: (t) => `1px solid ${alpha('#10b981', 0.18)}`,
            boxShadow: 'none',
          }}
        >
          {/* Top Row: Quick Presets & Month Navigator */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            gap={1.5}
            flexWrap="wrap"
          >
            {/* Quick Range Chips */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 0.75 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  mr: 0.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontSize: '0.7rem',
                }}
              >
                <Iconify icon={"solar:calendar-linear" as any} width={15} />
                Quick Range:
              </Typography>
              {[
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'last7', label: 'Last 7 Days' },
                { key: 'thisMonth', label: 'This Month' },
                { key: 'lastMonth', label: 'Last Month' },
              ].map((p) => {
                const active = isPresetActive(p.key);
                return (
                  <Chip
                    key={p.key}
                    label={p.label}
                    size="small"
                    clickable
                    onClick={() => handlePreset(p.key as any)}
                    sx={{
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.75rem',
                      height: 26,
                      bgcolor: active ? COMMON_COLORS.emerald.main : 'background.paper',
                      color: active ? '#fff' : 'text.primary',
                      border: (t) =>
                        `1px solid ${active ? COMMON_COLORS.emerald.main : t.palette.divider}`,
                      boxShadow: active ? `0 2px 8px ${alpha(COMMON_COLORS.emerald.main, 0.28)}` : 'none',
                      '&:hover': {
                        bgcolor: active ? COMMON_COLORS.emerald.dark : 'action.hover',
                      },
                    }}
                  />
                );
              })}
            </Stack>

            {/* Month Navigator on Right */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                p: 0.5,
                px: 1,
                borderRadius: 1.25,
                bgcolor: 'background.paper',
                border: (t) => `1px solid ${t.palette.divider}`,
              }}
            >
              <Button
                variant="text"
                size="small"
                onClick={handleToday}
                sx={{ fontWeight: 700, color: COMMON_COLORS.emerald.main, px: 1, fontSize: '0.8rem' }}
              >
                Current Month
              </Button>

              <IconButton size="small" onClick={handlePrevMonth}>
                <Iconify icon={"solar:alt-arrow-left-linear" as any} width={18} />
              </IconButton>

              <Typography
                variant="subtitle2"
                sx={{ minWidth: 120, textAlign: 'center', fontWeight: 800, fontSize: '0.85rem' }}
              >
                {currentDate.format('MMMM YYYY')}
              </Typography>

              <IconButton size="small" onClick={handleNextMonth}>
                <Iconify icon={"solar:alt-arrow-right-linear" as any} width={18} />
              </IconButton>
            </Stack>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed', borderColor: (t) => alpha('#10b981', 0.16) }} />

          {/* Filter Inputs Grid */}
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: '160px 160px 190px 170px 1fr',
              },
              alignItems: 'center',
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="From Date"
                format="DD-MM-YYYY"
                value={fromDate}
                onChange={(newValue) => {
                  setFromDate(newValue);
                  if (
                    newValue?.isValid() &&
                    (newValue.month() !== currentDate.month() || newValue.year() !== currentDate.year())
                  ) {
                    setCurrentDate(newValue);
                  }
                }}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    sx: {
                      bgcolor: 'background.paper',
                      borderRadius: 1.5,
                      '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 },
                    },
                  },
                }}
              />
              <DatePicker
                label="To Date"
                format="DD-MM-YYYY"
                value={toDate}
                onChange={(newValue) => setToDate(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    sx: {
                      bgcolor: 'background.paper',
                      borderRadius: 1.5,
                      '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 },
                    },
                  },
                }}
              />
            </LocalizationProvider>

            <Autocomplete
              size="small"
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}
              options={shiftOptions}
              getOptionLabel={(opt) => (opt ? opt.shift_name || opt.name : '')}
              isOptionEqualToValue={(option, value) => option?.name === value?.name}
              value={shiftOptions.find((s) => s.name === selectedShiftFilter) || null}
              onChange={(_, val) => setSelectedShiftFilter(val ? val.name : 'all')}
              renderOption={(props, option) => {
                const pal = shiftColorMap[option.name];
                const code = getShiftShortCode(option.shift_name || option.name);
                return (
                  <li {...props} key={option.name}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {pal && (
                        <Box
                          sx={{
                            width: 24,
                            height: 20,
                            borderRadius: '4px',
                            bgcolor: pal.bg,
                            color: pal.color,
                            border: `1px solid ${pal.border}`,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {code}
                        </Box>
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {option.shift_name || option.name}
                      </Typography>
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={!selectedShiftFilter || selectedShiftFilter === 'all' ? 'Shift' : ''}
                />
              )}
            />

            <FormControl
              size="small"
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}
            >
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <MenuItem value="date_asc">Date ↓ (Latest)</MenuItem>
                <MenuItem value="date_desc">Date ↑ (Oldest)</MenuItem>
                <MenuItem value="name_asc">Name: A to Z</MenuItem>
                <MenuItem value="name_desc">Name: Z to A</MenuItem>
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              disableCloseOnSelect
              size="small"
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}
              options={selectedDept === 'all' ? employees : employees.filter((e) => e.department === selectedDept)}
              filterOptions={filterEmployeeOptions}
              getOptionLabel={(opt) => (opt ? `${opt.employee_name || opt.name} (${opt.name})` : '')}
              isOptionEqualToValue={(option, value) => option?.name === value?.name}
              value={employees.filter((opt) =>
                selectedEmployees.some((se) => (typeof se === 'string' ? se === opt.name : se?.name === opt.name))
              )}
              onChange={(_, val) => setSelectedEmployees(val || [])}
              disabled={!isHRUser}
              renderOption={(props, option, { selected: isSelected }) => (
                <li {...props} key={option.name}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {option.employee_name || option.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                      ID: {option.name}
                    </Typography>
                  </Box>
                  {isSelected && (
                    <Iconify
                      icon={"solar:check-circle-bold" as any}
                      width={20}
                      sx={{ color: 'primary.main', ml: 1 }}
                    />
                  )}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={selectedEmployees.length === 0 ? 'Employee' : ''}
                />
              )}
            />
          </Box>
        </Card>
      ) : filterVariant === 'drawer' ? (
        <Card
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            bgcolor: 'background.paper',
            border: (t) => `1px solid ${t.palette.divider}`,
            borderRadius: 2,
          }}
        >
          {/* Month Navigator — left side */}
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
              onClick={handleToday}
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

          {/* Filter Drawer Trigger Button — right side */}
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
              invisible={activeFilterCount === 0}
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
              Filters
            </Box>
          </Button>
        </Card>
      ) : (
        /* Top Filter Card styled like Leave Allocation Report (Inline) */
        <Card
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            bgcolor: 'background.neutral',
            border: (t) => `1px solid ${t.palette.divider}`,
          }}
        >
          <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
            {/* Month Navigator */}
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
                onClick={handleToday}
                sx={{ fontWeight: 700, color: '#059669', px: 1 }}
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

            {/* Multiple Employee Filter */}
            <Autocomplete
              multiple
              disableCloseOnSelect
              size="small"
              options={selectedDept === 'all' ? employees : employees.filter((e) => e.department === selectedDept)}
              filterOptions={filterEmployeeOptions}
              getOptionLabel={(opt) => (opt ? `${opt.employee_name || opt.name} (${opt.name})` : '')}
              isOptionEqualToValue={(option, value) => option?.name === value?.name}
              value={employees.filter((opt) => selectedEmployees.some((se) => (typeof se === 'string' ? se === opt.name : se?.name === opt.name)))}
              onChange={(_, val) => setSelectedEmployees(val || [])}
              renderOption={(props, option, { selected: isSelected }) => (
                <li {...props} key={option.name}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {option.employee_name || option.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                      ID: {option.name}
                    </Typography>
                  </Box>
                  {isSelected && (
                    <Iconify icon={"solar:check-circle-bold" as any} width={20} sx={{ color: 'primary.main', ml: 1 }} />
                  )}
                </li>
              )}
              sx={{ minWidth: 280, flexGrow: 1 }}
              renderInput={(params) => (
                <TextField {...params} label="Employee" placeholder={selectedEmployees.length === 0 ? "Select Employee(s)..." : ""} />
              )}
            />

            {/* Department Filter */}
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDept}
                label="Department"
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <MenuItem value="all">All Departments</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.name} value={d.name}>
                    {d.department_name || d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Search Query */}
            <TextField
              size="small"
              placeholder="Search employee / department..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              InputProps={{
                startAdornment: <Iconify icon={"solar:magnifer-linear" as any} sx={{ mr: 1, color: 'text.disabled' }} />,
              }}
              sx={{ minWidth: 240 }}
            />
          </Stack>
        </Card>
      )}

      {/* Main Board Card */}
      <Card sx={{ p: 2.5 }}>
        {/* Legend styled like Leave Allocation Report */}
        <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1.5 }} alignItems="center">
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>
            Shift Legend:
          </Typography>

          {data?.shifts?.map((s) => {
            const pal = shiftColorMap[s.name] || { bg: '#e2e8f0', color: '#475569', border: '#cbd5e1' };
            const code = getShiftShortCode(s.shift_name || s.name);
            return (
              <Stack key={s.name} direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 26,
                    height: 22,
                    borderRadius: '6px',
                    bgcolor: pal.bg,
                    color: pal.color,
                    border: `1px solid ${pal.border}`,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {code}
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {s.shift_name || s.name}
                </Typography>
              </Stack>
            );
          })}

          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 26,
                height: 22,
                borderRadius: '6px',
                bgcolor: '#fee2e2',
                color: '#ef4444',
                border: '1px solid #fca5a5',
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              H
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Holiday
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 30,
                height: 22,
                borderRadius: '6px',
                bgcolor: '#fee2e2',
                color: '#ef4444',
                border: '1px solid #fca5a5',
                fontSize: '0.68rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              WO
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Weekly Off
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 26,
                height: 22,
                borderRadius: '6px',
                bgcolor: '#f8fafc',
                color: '#94a3b8',
                border: '1px dashed #cbd5e1',
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              -
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Unassigned
            </Typography>
          </Stack>
        </Stack>

        {/* Scrollable Muster Board */}
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
                  Employee ({sortedEmployees.length}{totalCount ? ` of ${totalCount}` : ''})
                </TableCell>

                {displayDays.map((d) => {
                  const isToday = d.date === todayStr;
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
                        bgcolor: isToday ? alpha(COMMON_COLORS.emerald.main, 0.08) : undefined,
                        color: isToday ? COMMON_COLORS.emerald.main : d.is_weekend ? 'text.secondary' : 'text.primary',
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        borderBottom: (t) => `1px solid ${t.palette.divider}`,
                      }}
                    >
                      <Box sx={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8, fontWeight: 800 }}>
                        {d.day_name}
                      </Box>
                      <Box sx={{ fontSize: '0.85rem', fontWeight: 800 }}>
                        {d.day < 10 ? `0${d.day}` : d.day}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={(displayDays.length || 0) + 1} align="center" sx={{ py: 10 }}>
                    <CircularProgress sx={{ color: COMMON_COLORS.emerald.main }} />
                  </TableCell>
                </TableRow>
              ) : sortedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(displayDays.length || 0) + 1} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No employees matching the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                sortedEmployees.map((emp, empIndex) => (
                  <TableRow key={emp.employee} hover sx={{ '& td': { py: 1.2 } }}>
                    {/* Sticky Employee Column */}
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        bgcolor: 'background.paper',
                        zIndex: 10,
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        borderBottom: (t) => `1px solid ${t.palette.divider}`,
                        boxShadow: '4px 0 8px -4px rgba(0,0,0,0.12)',
                      }}
                    >
                      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                        {emp.employee_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {emp.employee} {emp.department && emp.department !== '-' ? `• ${emp.department}` : ''}
                      </Typography>
                    </TableCell>

                    {/* Day Shift Cells */}
                    {displayDays.map((d) => {
                      const isFullHoliday = Boolean(
                        d.is_holiday &&
                        sortedEmployees.length > 0 &&
                        !sortedEmployees.some((e) => {
                          const c = e.shifts?.[d.date];
                          return c?.source === 'ROSTER' || (c?.shift && !c?.is_weekly_off);
                        })
                      );

                      if (isFullHoliday) {
                        if (empIndex === 0) {
                          return (
                            <TableCell
                              key={d.date}
                              rowSpan={sortedEmployees.length}
                              align="center"
                              onClick={() => canEdit && handleCellClick(emp.employee, d.date)}
                              sx={{
                                px: 0.5,
                                py: 1,
                                minWidth: 42,
                                maxWidth: 42,
                                verticalAlign: 'middle',
                                bgcolor: 'rgba(244, 63, 94, 0.08)',
                                borderRight: (t) => `1px solid ${t.palette.divider}`,
                                borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                cursor: canEdit ? 'pointer' : 'default',
                                transition: 'background-color 0.15s ease',
                                '&:hover': {
                                  bgcolor: 'rgba(244, 63, 94, 0.14)',
                                },
                              }}
                            >
                              <Tooltip
                                title={
                                  <span style={{ whiteSpace: 'pre-line' }}>
                                    {`Holiday: ${d.holiday_name || 'Public Holiday'}\n${d.date}`}
                                  </span>
                                }
                                arrow
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    width: '100%',
                                    minHeight: 80,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: '0.72rem',
                                      letterSpacing: 2.5,
                                      color: '#9f1239',
                                      textTransform: 'uppercase',
                                      writingMode: 'vertical-rl',
                                      transform: 'rotate(180deg)',
                                      display: 'inline-block',
                                      whiteSpace: 'nowrap',
                                      userSelect: 'none',
                                    }}
                                  >
                                    Holiday
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </TableCell>
                          );
                        }
                        return null;
                      }

                      const isFullWeeklyOff = Boolean(
                        !isFullHoliday &&
                        sortedEmployees.length > 0 &&
                        sortedEmployees.every((e) => {
                          const c = e.shifts?.[d.date];
                          return c?.is_weekly_off && c?.source !== 'ROSTER';
                        })
                      );

                      if (isFullWeeklyOff) {
                        if (empIndex === 0) {
                          return (
                            <TableCell
                              key={d.date}
                              rowSpan={sortedEmployees.length}
                              align="center"
                              onClick={() => canEdit && handleCellClick(emp.employee, d.date)}
                              sx={{
                                px: 0.5,
                                py: 1,
                                minWidth: 42,
                                maxWidth: 42,
                                verticalAlign: 'middle',
                                bgcolor: 'rgba(244, 63, 94, 0.08)',
                                borderRight: (t) => `1px solid ${t.palette.divider}`,
                                borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                cursor: canEdit ? 'pointer' : 'default',
                                transition: 'background-color 0.15s ease',
                                '&:hover': {
                                  bgcolor: 'rgba(244, 63, 94, 0.14)',
                                },
                              }}
                            >
                              <Tooltip
                                title={
                                  <span style={{ whiteSpace: 'pre-line' }}>
                                    {`Weekly Off\n${d.date}`}
                                  </span>
                                }
                                arrow
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    width: '100%',
                                    minHeight: 80,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: '0.72rem',
                                      letterSpacing: 2.5,
                                      color: '#9f1239',
                                      textTransform: 'uppercase',
                                      writingMode: 'vertical-rl',
                                      transform: 'rotate(180deg)',
                                      display: 'inline-block',
                                      whiteSpace: 'nowrap',
                                      userSelect: 'none',
                                    }}
                                  >
                                    Weekly Off
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </TableCell>
                          );
                        }
                        return null;
                      }

                      const cell = emp.shifts?.[d.date];
                      const isToday = d.date === todayStr;
                      const isHoliday = d.is_holiday;
                      const isWeeklyOff = cell?.is_weekly_off;

                      let chipCode = '-';
                      let chipStyle = {
                        bg: '#f8fafc',
                        color: '#94a3b8',
                        border: '1px dashed #cbd5e1',
                      };

                      if (isHoliday && cell?.source !== 'ROSTER') {
                        chipCode = 'H';
                        chipStyle = { bg: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' };
                      } else if (isWeeklyOff && cell?.source !== 'ROSTER') {
                        chipCode = 'WO';
                        chipStyle = { bg: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' };
                      } else if (cell?.shift) {
                        const pal = shiftColorMap[cell.shift] || { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' };
                        chipCode = getShiftShortCode(cell.shift_name || cell.shift);
                        chipStyle = pal;
                      }

                      const tooltipText = (isHoliday && cell?.source !== 'ROSTER')
                        ? `Holiday: ${d.holiday_name || 'Public Holiday'}\n${d.date}`
                        : (isWeeklyOff && cell?.source !== 'ROSTER')
                        ? `Weekly Off\n${d.date}`
                        : cell?.shift
                        ? `${cell.shift_name || cell.shift}\n${d.date}\nSource: ${cell.source || 'ROSTER'}`
                        : `Unassigned\n${d.date}`;

                      return (
                        <TableCell
                          key={d.date}
                          align="center"
                          onClick={() => handleCellClick(emp.employee, d.date)}
                          sx={{
                            px: 0.5,
                            py: 0.8,
                            minWidth: 42,
                            maxWidth: 42,
                            bgcolor: isToday
                              ? 'action.selected'
                              : (isWeeklyOff && cell?.source !== 'ROSTER')
                              ? 'rgba(244, 63, 94, 0.05)'
                              : undefined,
                            borderRight: (t) => `1px solid ${t.palette.divider}`,
                            borderBottom: (t) => `1px solid ${t.palette.divider}`,
                            cursor: canEdit ? 'pointer' : 'default',
                            transition: 'background-color 0.15s ease',
                            '&:hover': {
                              bgcolor: (isWeeklyOff && cell?.source !== 'ROSTER')
                                ? 'rgba(244, 63, 94, 0.12)'
                                : alpha(COMMON_COLORS.emerald.main, 0.08),
                            },
                          }}
                        >
                          <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltipText}</span>} arrow>
                            <Box
                              sx={{
                                width: 34,
                                height: 28,
                                mx: 'auto',
                                borderRadius: '6px',
                                bgcolor: chipStyle.bg,
                                color: chipStyle.color,
                                border: `1px solid ${chipStyle.border}`,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: cell?.source === 'ROSTER' ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
                              }}
                            >
                              {chipCode}
                            </Box>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}

              {/* Sentinel and Load More row */}
              {hasMore && (
                <TableRow>
                  <TableCell
                    colSpan={(displayDays.length || 31) + 1}
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
                          Load More ({Math.min(50, totalCount - filteredEmployees.length)} remaining)
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

      {/* Quick Cell Assignment Dialog */}
      {openAssignDialog && (
        <ShiftRosterDialog
          open={openAssignDialog}
          onClose={() => setOpenAssignDialog(false)}
          onSuccess={() => refetch()}
          initialEmployee={targetEmployee}
          initialDate={targetDate}
        />
      )}

      {/* Filters Drawer for drawer variant */}
      {filterVariant === 'drawer' && (
        <ShiftRosterTableFiltersDrawer
          open={openFilters}
          onOpen={() => setOpenFilters(true)}
          onClose={() => setOpenFilters(false)}
          filters={{
            employees: selectedEmployees,
            shift: selectedShiftFilter,
            status: selectedStatus,
            fromDate,
            toDate,
          }}
          onFilters={handleDrawerFilters}
          canReset={canReset}
          onResetFilters={handleResetFilters}
          employeeOptions={employees}
          shiftOptions={data?.shifts || []}
          isHR={isHRUser}
        />
      )}
    </Stack>
  );
}
