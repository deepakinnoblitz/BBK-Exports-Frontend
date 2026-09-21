import dayjs from 'dayjs';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
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
import CircularProgress from '@mui/material/CircularProgress';

import { useMonthlyRoster } from 'src/hooks/use-shift-roster';

import { getDoctypeList } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';

import { ShiftRosterDialog } from '../shift-roster-dialog';

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
  selectedEmployee: controlledEmployee,
  onSelectEmployee,
}: {
  canEdit?: boolean;
  selectedEmployee?: any | null;
  onSelectEmployee?: (emp: any | null) => void;
}) {
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs());
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [internalEmployee, setInternalEmployee] = useState<any | null>(null);

  const selectedEmployee = controlledEmployee !== undefined ? controlledEmployee : internalEmployee;
  const setSelectedEmployee = (val: any | null) => {
    setInternalEmployee(val);
    onSelectEmployee?.(val);
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

  const { data, loading, refetch } = useMonthlyRoster(
    month,
    year,
    selectedDept !== 'all' ? selectedDept : undefined,
    selectedEmployee?.name || undefined
  );

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

  // Color map for shifts
  const shiftColorMap: Record<string, { bg: string; color: string; border: string }> = {};
  data?.shifts?.forEach((s, idx) => {
    shiftColorMap[s.name] = SHIFT_PALETTES[idx % SHIFT_PALETTES.length];
  });

  const filteredEmployees = (data?.employees || []).filter((emp) => {
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
      {/* Top Filter Card styled like Leave Allocation Report */}
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

          {/* Specific Employee Filter */}
          <Autocomplete
            size="small"
            options={employees}
            getOptionLabel={(opt) => opt.employee_name || opt.name}
            isOptionEqualToValue={(option, value) => option?.name === value?.name}
            value={selectedEmployee}
            onChange={(_, val) => setSelectedEmployee(val)}
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
            sx={{ minWidth: 260, flexGrow: 1 }}
            renderInput={(params) => (
              <TextField {...params} label="Employee" placeholder="Filter specific employee..." />
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
              backgroundColor: 'rgba(145,158,171,0.30)',
              borderRadius: 999,
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: 'rgba(145,158,171,0.50)',
            },
          }}
        >
          <Table size="medium" stickyHeader sx={{ borderCollapse: 'collapse', minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f4f6f8' }}>
                {/* Sticky Left Header */}
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    bgcolor: '#f4f6f8',
                    zIndex: 12,
                    minWidth: 220,
                    fontWeight: 700,
                    borderRight: (t) => `1px solid ${t.palette.divider}`,
                  }}
                >
                  Employee ({filteredEmployees.length})
                </TableCell>

                {/* Day Columns */}
                {data?.days?.map((d) => {
                  const isToday = d.date === todayStr;
                  const isSun = d.is_weekend;
                  return (
                    <TableCell
                      key={d.date}
                      align="center"
                      sx={{
                        minWidth: 48,
                        p: 1,
                        bgcolor: isToday ? '#08a3cd18' : isSun ? '#f8fafc' : '#f4f6f8',
                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                        borderBottom: isToday ? '2px solid #08a3cd' : undefined,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          display: 'block',
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          fontSize: '0.72rem',
                        }}
                      >
                        {d.day_name}
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          mt: 0.2,
                          fontSize: '0.85rem',
                          color: isToday ? '#08a3cd' : 'text.primary',
                        }}
                      >
                        {d.day < 10 ? `0${d.day}` : d.day}
                      </Typography>
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
                        ? `${emp.employee_name} • ${d.date}\nShift: ${cell.shift_name || cell.shift}\nTiming: ${cell.start_time || '---'} - ${cell.end_time || '---'}\nSource: ${cell.source}`
                        : isHoliday
                        ? `Holiday: ${d.holiday_name || 'Company Holiday'}`
                        : isWeeklyOff
                        ? 'Weekly Off (Sunday)'
                        : 'Unassigned (Default)';

                      return (
                        <TableCell
                          key={d.date}
                          align="center"
                          onClick={() => handleCellClick(emp.employee, d.date)}
                          sx={{
                            p: 0.5,
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
    </Stack>
  );
}
