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
import { useTheme } from '@mui/material/styles';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { useMonthlyRoster } from 'src/hooks/use-shift-roster';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';

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
}: {
  canEdit?: boolean;
  selectedEmployees?: any[];
  onSelectEmployees?: (emps: any[]) => void;
  selectedEmployee?: any | null;
  onSelectEmployee?: (emp: any | null) => void;
  filterVariant?: 'drawer' | 'inline';
  refreshTrigger?: number;
}) {
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs());
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState('all');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [openFilters, setOpenFilters] = useState(false);
  const [internalEmployees, setInternalEmployees] = useState<any[]>([]);

  const selectedEmployees: any[] = useMemo(() => {
    if (controlledEmployees !== undefined) {
      return Array.isArray(controlledEmployees) ? controlledEmployees : controlledEmployees ? [controlledEmployees] : [];
    }
    if (selectedEmployee !== undefined) {
      return Array.isArray(selectedEmployee) ? selectedEmployee : selectedEmployee ? [selectedEmployee] : [];
    }
    return internalEmployees;
  }, [controlledEmployees, selectedEmployee, internalEmployees]);

  const setSelectedEmployees = (val: any[]) => {
    setInternalEmployees(val);
    onSelectEmployees?.(val);
    onSelectEmployee?.(val.length === 1 ? val[0] : val.length > 0 ? val : null);
  };

  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

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
      const [deptRes, empRes] = await Promise.all([
        getDoctypeList('Department', ['name', 'department_name']),
        getDoctypeList('Employee', ['name', 'employee_name', 'department']),
      ]);
      setDepartments(deptRes || []);
      setEmployees(empRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const month = currentDate.month() + 1;
  const year = currentDate.year();

  const employeeFilterParam = useMemo(() => {
    if (selectedEmployees.length === 0) return undefined;
    return selectedEmployees.map((e) => (typeof e === 'string' ? e : e.name));
  }, [selectedEmployees]);

  const { data, loading, refetch } = useMonthlyRoster(
    month,
    year,
    selectedDept !== 'all' ? selectedDept : undefined,
    employeeFilterParam
  );

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => prev.add(1, 'month'));
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
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
    if (selectedDept !== 'all') count += 1;
    if (selectedEmployees.length > 0) count += 1;
    if (selectedShiftFilter !== 'all') count += 1;
    return count;
  }, [selectedDept, selectedEmployees, selectedShiftFilter]);

  const canReset = selectedDept !== 'all' || selectedEmployees.length > 0 || selectedShiftFilter !== 'all' || !!searchEmployee;

  const handleResetFilters = () => {
    setSelectedDept('all');
    setSelectedEmployees([]);
    setSelectedShiftFilter('all');
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
  };

  // Color map for shifts
  const shiftColorMap: Record<string, { bg: string; color: string; border: string }> = {};
  data?.shifts?.forEach((s, idx) => {
    shiftColorMap[s.name] = SHIFT_PALETTES[idx % SHIFT_PALETTES.length];
  });

  const filteredEmployees = (data?.employees || []).filter((emp) => {
    if (selectedShiftFilter && selectedShiftFilter !== 'all') {
      const hasShift = Object.values(emp.shifts || {}).some(
        (cell: any) => cell?.shift === selectedShiftFilter || cell?.shift_name === selectedShiftFilter
      );
      if (!hasShift) return false;
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

  return (
    <Stack spacing={2.5}>
      {/* Filter toolbar based on filterVariant */}
      {filterVariant === 'drawer' ? (
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
                      <Iconify icon="solar:close-circle-bold" width={18} />
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
                '&.Mui-focused fieldset': { borderColor: '#08a3cd' },
              }}
            />
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
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
                sx={{ fontWeight: 700, color: '#08a3cd', px: 1 }}
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
          </Stack>
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
                sx={{ fontWeight: 700, color: '#08a3cd', px: 1 }}
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

            {/* Multiple Employee Filter */}
            <Autocomplete
              multiple
              disableCloseOnSelect
              size="small"
              options={selectedDept === 'all' ? employees : employees.filter((e) => e.department === selectedDept)}
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
                bgcolor: '#f1f5f9',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                fontSize: '0.7rem',
                fontWeight: 700,
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
                  Employee ({filteredEmployees.length})
                </TableCell>

                {data?.days?.map((d) => {
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
                        bgcolor: isToday ? '#08a3cd15' : undefined,
                        color: isToday ? '#08a3cd' : d.is_weekend ? 'text.secondary' : 'text.primary',
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
                  <TableCell colSpan={(data?.days?.length || 0) + 1} align="center" sx={{ py: 10 }}>
                    <CircularProgress sx={{ color: '#08a3cd' }} />
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(data?.days?.length || 0) + 1} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No employees matching the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
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
                    {data?.days?.map((d) => {
                      const cell = emp.shifts?.[d.date];
                      const isToday = d.date === todayStr;
                      const isHoliday = d.is_holiday;
                      const isWeeklyOff = d.is_weekend;

                      let chipCode = '-';
                      let chipStyle = {
                        bg: '#f8fafc',
                        color: '#94a3b8',
                        border: '1px dashed #cbd5e1',
                      };

                      if (cell?.shift) {
                        const pal = shiftColorMap[cell.shift] || { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' };
                        chipCode = getShiftShortCode(cell.shift_name || cell.shift);
                        chipStyle = pal;
                      } else if (isHoliday) {
                        chipCode = 'H';
                        chipStyle = { bg: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' };
                      } else if (isWeeklyOff) {
                        chipCode = 'WO';
                        chipStyle = { bg: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' };
                      }

                      const tooltipText = cell?.shift
                        ? `${cell.shift_name || cell.shift}\n${d.date}\nSource: ${cell.source || 'ROSTER'}`
                        : isHoliday
                        ? `Holiday: ${d.holiday_name || 'Public Holiday'}`
                        : isWeeklyOff
                        ? 'Weekly Off'
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
                            bgcolor: isToday ? 'action.selected' : undefined,
                            borderRight: (t) => `1px solid ${t.palette.divider}`,
                            borderBottom: (t) => `1px solid ${t.palette.divider}`,
                            cursor: canEdit ? 'pointer' : 'default',
                            transition: 'background-color 0.15s ease',
                            '&:hover': {
                              bgcolor: '#08a3cd15',
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
            department: selectedDept,
            employees: selectedEmployees,
            shift: selectedShiftFilter,
          }}
          onFilters={handleDrawerFilters}
          canReset={canReset}
          onResetFilters={handleResetFilters}
          employeeOptions={selectedDept === 'all' ? employees : employees.filter((e) => e.department === selectedDept)}
          shiftOptions={data?.shifts || []}
          departmentOptions={departments}
          hideDateFilters
          hideStatusFilter
        />
      )}
    </Stack>
  );
}
