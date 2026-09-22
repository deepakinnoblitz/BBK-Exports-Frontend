import dayjs from 'dayjs';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { useCalendarRoster } from 'src/hooks/use-shift-roster';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';

import { ShiftRosterDialog } from '../shift-roster-dialog';
import { ShiftRosterTableFiltersDrawer } from '../shift-roster-table-filters-drawer';
// ----------------------------------------------------------------------

export function ShiftRosterCalendarView({
  canCreate = true,
  canEdit = true,
  selectedEmployees: controlledEmployees,
  onSelectEmployees,
  selectedEmployee,
  onSelectEmployee,
  refreshTrigger,
}: {
  canCreate?: boolean;
  canEdit?: boolean;
  selectedEmployees?: any[];
  onSelectEmployees?: (emps: any[]) => void;
  selectedEmployee?: any | null;
  onSelectEmployee?: (emp: any | null) => void;
  refreshTrigger?: number;
}) {
  const theme = useTheme();
  const calendarRef = useRef<FullCalendar>(null);

  const [title, setTitle] = useState('');
  const [activeView, setActiveView] = useState('dayGridMonth');

  // Filters State
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [internalEmployees, setInternalEmployees] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [openFilters, setOpenFilters] = useState(false);

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

  const [filters, setFilters] = useState<{
    department: string;
    employees: any[];
    shift: string;
    status: string;
  }>({
    department: 'all',
    employees: selectedEmployees,
    shift: 'all',
    status: 'all',
  });

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      employees: selectedEmployees,
    }));
  }, [selectedEmployees]);

  // Calendar dates
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs());

  // Quick dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogDate, setDialogDate] = useState<string | undefined>();
  const [dialogEmployee, setDialogEmployee] = useState<string | undefined>();

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      const [empRes, deptRes, shiftRes] = await Promise.all([
        getDoctypeList('Employee', ['name', 'employee_name', 'department']),
        getDoctypeList('Department', ['name', 'department_name']),
        getDoctypeList('Shift', ['name', 'shift_name']),
      ]);
      const empList = empRes || [];
      setEmployees(empList);
      setDepartments(deptRes || []);
      setShifts(shiftRes || []);
      if (!controlledEmployees && !selectedEmployee && empList.length > 0 && selectedEmployees.length === 0) {
        setSelectedEmployees([empList[0]]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFilters = (update: any) => {
    setFilters((prev) => {
      const next = { ...prev, ...update };
      if ('employees' in update) {
        const val = update.employees || [];
        setSelectedEmployees(val);
      } else if ('employee' in update) {
        const val = Array.isArray(update.employee) ? update.employee : update.employee ? [update.employee] : [];
        next.employees = val;
        setSelectedEmployees(val);
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilters({
      department: 'all',
      employees: [],
      shift: 'all',
      status: 'all',
    });
    setSelectedEmployees([]);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.department && filters.department !== 'all') count += 1;
    if (filters.employees && filters.employees.length > 0) count += 1;
    if (filters.shift && filters.shift !== 'all') count += 1;
    if (filters.status && filters.status !== 'all') count += 1;
    return count;
  }, [filters]);

  const canReset =
    Boolean(search) ||
    (filters.department && filters.department !== 'all') ||
    (filters.employees && filters.employees.length > 0) ||
    (filters.shift && filters.shift !== 'all') ||
    (filters.status && filters.status !== 'all');

  const startDate = currentDate.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
  const endDate = currentDate.endOf('month').add(7, 'day').format('YYYY-MM-DD');

  const employeeFilterParam = useMemo(() => {
    if (filters.employees && filters.employees.length > 0) {
      const ids = filters.employees.map((e) => (typeof e === 'string' ? e : e.name)).filter(Boolean);
      return ids.length === 1 ? ids[0] : ids;
    }
    if (selectedEmployees.length > 0) {
      const ids = selectedEmployees.map((e) => (typeof e === 'string' ? e : e.name)).filter(Boolean);
      return ids.length === 1 ? ids[0] : ids;
    }
    return undefined;
  }, [filters.employees, selectedEmployees]);

  const { events, loading, refetch } = useCalendarRoster(
    startDate,
    endDate,
    employeeFilterParam,
    filters.department !== 'all' ? filters.department : undefined
  );

  const filteredEvents = useMemo(
    () =>
      events.filter((e: any) => {
        if (filters.shift && filters.shift !== 'all') {
          const evShift = e.extendedProps?.shift || e.shift;
          const evShiftName = e.extendedProps?.shift_name || e.shift_name;
          if (evShift !== filters.shift && evShiftName !== filters.shift) {
            return false;
          }
        }
        if (search) {
          const q = search.toLowerCase();
          const titleMatch = e.title?.toLowerCase().includes(q);
          const empNameMatch = e.extendedProps?.employee_name?.toLowerCase().includes(q) || e.employee_name?.toLowerCase().includes(q);
          const empIdMatch = e.extendedProps?.employee?.toLowerCase().includes(q) || e.employee?.toLowerCase().includes(q);
          const shiftMatch = e.extendedProps?.shift_name?.toLowerCase().includes(q) || e.shift_name?.toLowerCase().includes(q);
          const deptMatch = e.extendedProps?.department?.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q);
          if (!titleMatch && !empNameMatch && !empIdMatch && !shiftMatch && !deptMatch) {
            return false;
          }
        }
        return true;
      }),
    [events, filters.shift, search]
  );

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  const handlePrev = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.prev();
      setTitle(api.view.title);
      setCurrentDate(dayjs(api.getDate()));
    }
  };

  const handleNext = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.next();
      setTitle(api.view.title);
      setCurrentDate(dayjs(api.getDate()));
    }
  };

  const handleToday = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.today();
      setTitle(api.view.title);
      setCurrentDate(dayjs(api.getDate()));
    }
  };

  const handleChangeView = (newView: string) => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(newView);
      setActiveView(newView);
      setTitle(api.view.title);
    }
  };

  const handleDateClick = (arg: any) => {
    if (canCreate) {
      setDialogDate(arg.dateStr);
      setDialogEmployee(employeeFilterParam && typeof employeeFilterParam === 'string' ? employeeFilterParam : undefined);
      setOpenDialog(true);
    }
  };

  const handleEventClick = (info: any) => {
    if (canEdit) {
      const event = info.event;
      setDialogDate(dayjs(event.start).format('YYYY-MM-DD'));
      setDialogEmployee(event.extendedProps?.employee);
      setOpenDialog(true);
    }
  };

  return (
    <Stack spacing={2.5}>
      {/* Top Filter Card exactly matching Monthly Roster View */}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, department..."
            startAdornment={
              <InputAdornment position="start">
                <Iconify width={18} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            }
            endAdornment={
              search ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearch('')}
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

            <IconButton size="small" onClick={handlePrev}>
              <Iconify icon={"solar:alt-arrow-left-linear" as any} width={18} />
            </IconButton>

            <Typography variant="subtitle2" sx={{ minWidth: 140, textAlign: 'center', fontWeight: 800 }}>
              {title || currentDate.format('MMMM YYYY')}
            </Typography>

            <IconButton size="small" onClick={handleNext}>
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

          {/* Day / Week / Month Switcher */}
          <Box
            sx={{
              display: 'inline-flex',
              bgcolor: alpha(theme.palette.grey[500], 0.04),
              p: 0.5,
              borderRadius: '10px',
              border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
            }}
          >
            {[
              { value: 'timeGridDay', label: 'Day' },
              { value: 'timeGridWeek', label: 'Week' },
              { value: 'dayGridMonth', label: 'Month' },
            ].map((tab) => {
              const isActive = activeView === tab.value;
              return (
                <Button
                  key={tab.value}
                  onClick={() => handleChangeView(tab.value)}
                  sx={{
                    borderRadius: '8px',
                    px: 2.5,
                    py: 0.5,
                    fontSize: '0.825rem',
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? '#fff' : theme.palette.text.secondary,
                    bgcolor: isActive ? '#08a3cd' : 'transparent',
                    boxShadow: isActive ? `0 2px 8px ${alpha('#08a3cd', 0.3)}` : 'none',
                    textTransform: 'capitalize',
                    transition: theme.transitions.create(['background-color', 'color', 'box-shadow'], {
                      duration: theme.transitions.duration.shorter,
                    }),
                    '&:hover': {
                      bgcolor: isActive ? '#08a3cd' : alpha(theme.palette.grey[500], 0.08),
                    },
                  }}
                >
                  {tab.label}
                </Button>
              );
            })}
          </Box>
        </Stack>
      </Card>

      {/* Main Calendar Board Card */}
      <Card
        sx={{
          p: 2.5,
          bgcolor: 'background.paper',
          border: (t) => `1px solid ${t.palette.divider}`,
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            position: 'relative',
            '& .fc': {
              '--fc-border-color': alpha(theme.palette.grey[500], 0.16),
              '--fc-today-bg-color': alpha(theme.palette.primary.main, 0.04),
              fontFamily: theme.typography.fontFamily,
            },
            '& .fc-theme-standard .fc-scrollgrid': {
              border: `1px solid ${alpha(theme.palette.grey[500], 0.4)} !important`,
              borderRadius: '12px',
              overflow: 'hidden',
            },
            '& .fc-col-header': {
              border: 'none !important',
            },
            '& .fc-col-header-cell': {
              border: 'none !important',
              borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.12)} !important`,
              py: 2,
              backgroundColor: '#ededed3d',
            },
            '& .fc-col-header-cell-cushion': {
              fontSize: '0.8rem',
              fontWeight: 700,
              color: theme.palette.text.primary,
              textDecoration: 'none !important',
              display: 'inline-block',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            },
            '& .fc-theme-standard td, & .fc-theme-standard th': {
              borderColor: `${alpha(theme.palette.grey[500], 0.25)} !important`,
            },
            '& .fc-timegrid-slot-label-cushion': {
              fontSize: '0.75rem',
              fontWeight: 600,
              color: theme.palette.text.secondary,
            },
            '& .fc-v-event, & .fc-h-event, & .fc-event': {
              backgroundColor: 'transparent !important',
              borderColor: 'transparent !important',
              boxShadow: 'none !important',
              padding: '0px !important',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'transparent !important',
              },
            },
            '& .fc-timegrid-event-harness': {
              padding: '1.5px !important',
            },
            '& .fc-daygrid-day-events': {
              margin: 0,
              padding: 0,
            },
            '& .fc-daygrid-day-number': {
              fontSize: '0.825rem',
              fontWeight: 600,
              color: theme.palette.text.secondary,
              textDecoration: 'none !important',
              padding: '8px 10px !important',
            },
            '& .fc-day-today': {
              bgcolor: 'transparent !important',
            },
            '& .fc-day-today .fc-daygrid-day-top': {
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-end',
            },
            '& .fc-day-today .fc-daygrid-day-number': {
              bgcolor: '#08a3cd !important',
              color: '#fff !important',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '6px 6px 0 0',
              padding: '0 !important',
            },
          }}
        >
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(255, 255, 255, 0.6)',
                zIndex: 10,
              }}
            >
              <CircularProgress sx={{ color: '#08a3cd' }} />
            </Box>
          )}

          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            dayHeaderFormat={{ weekday: 'long' }}
            headerToolbar={false}
            events={filteredEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            height="auto"
            dayMaxEventRows={3}
            datesSet={(dateInfo) => {
              setTitle(dateInfo.view.title);
              setActiveView(dateInfo.view.type);
            }}
            eventContent={(arg) => {
              const titleText = arg.event.title;
              const empName = arg.event.extendedProps?.employee_name;
              const shiftName = arg.event.extendedProps?.shift_name;

              if (arg.view.type === 'dayGridMonth') {
                return (
                  <Box
                    sx={{
                      width: '100%',
                      py: 0.5,
                      px: 1,
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#0284c7',
                      backgroundColor: 'rgba(14, 165, 233, 0.12)',
                      borderLeft: '3px solid #0284c7',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      transition: 'all 0.15s ease-in-out',
                      '&:hover': {
                        backgroundColor: 'rgba(14, 165, 233, 0.22)',
                      },
                    }}
                  >
                    {titleText}
                  </Box>
                );
              }

              return (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                    width: '100%',
                    p: 1,
                    borderRadius: '6px',
                    bgcolor: 'rgba(14, 165, 233, 0.08)',
                    border: '1px solid rgba(14, 165, 233, 0.24)',
                    borderLeft: '4px solid #0284c7',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                      bgcolor: 'rgba(14, 165, 233, 0.16)',
                    },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1' }} noWrap>
                    {empName || titleText}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} noWrap>
                    {shiftName || 'Shift'}
                  </Typography>
                </Box>
              );
            }}
          />
        </Box>

        {/* Quick Create/Edit Dialog */}
        {openDialog && (
          <ShiftRosterDialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            onSuccess={() => refetch()}
            initialDate={dialogDate}
            initialEmployee={dialogEmployee}
          />
        )}
      </Card>

      {/* Filters Drawer */}
      <ShiftRosterTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={filters}
        onFilters={handleFilters}
        canReset={Boolean(canReset)}
        onResetFilters={handleResetFilters}
        employeeOptions={employees}
        shiftOptions={shifts}
        departmentOptions={departments}
        hideDateFilters
      />
    </Stack>
  );
}

