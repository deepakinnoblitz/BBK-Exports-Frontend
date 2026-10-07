import dayjs from 'dayjs';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRef, useMemo, useState, useEffect } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import CircularProgress from '@mui/material/CircularProgress';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useCalendarLineRoster } from 'src/hooks/use-line-roster';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { LineRosterDialog } from '../line-roster-dialog';
import { LineRosterTableFiltersDrawer } from '../line-roster-table-filters-drawer';

// ----------------------------------------------------------------------

const LINE_COLORS: Record<string, string> = {
  'Line 1': COMMON_COLORS.emerald.main,
  'Line 2': '#0284C7',
  'Line 3': '#F59E0B',
  'Line 4': '#6366F1',
  'Line 5': '#EC4899',
  Holiday: '#EF4444',
  Default: COMMON_COLORS.emerald.main,
};

const getLineColor = (lineName?: string, isHoliday?: boolean) => {
  if (isHoliday) return LINE_COLORS.Holiday;
  if (!lineName) return LINE_COLORS.Default;
  const match = Object.keys(LINE_COLORS).find((k) =>
    lineName.toLowerCase().includes(k.toLowerCase())
  );
  return match ? LINE_COLORS[match] : LINE_COLORS.Default;
};

export function LineRosterCalendarView({
  canCreate = true,
  canEdit = true,
  selectedEmployees: controlledEmployees,
  onSelectEmployees,
  selectedEmployee,
  onSelectEmployee,
  refreshTrigger,
  isHR,
}: {
  canCreate?: boolean;
  canEdit?: boolean;
  selectedEmployees?: any[];
  onSelectEmployees?: (emps: any[]) => void;
  selectedEmployee?: any | null;
  onSelectEmployee?: (emp: any | null) => void;
  refreshTrigger?: number;
  isHR?: boolean;
}) {
  const { user } = useAuth();
  const isHRUser =
    isHR !== undefined
      ? isHR
      : user?.roles?.some((role: string) =>
        ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
      );
  const isRestrictedEmployee = user?.roles?.includes('Employee') && !isHRUser;

  const calendarRef = useRef<FullCalendar>(null);

  const [title, setTitle] = useState('');
  const [activeView, setActiveView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listMonth'>('dayGridMonth');

  // Mini Calendar Selected Date
  const [miniCalDate, setMiniCalDate] = useState<dayjs.Dayjs>(dayjs());

  // Filters State
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [internalEmployees, setInternalEmployees] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [openFilters, setOpenFilters] = useState(false);

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

  const [filters, setFilters] = useState<{
    department: string;
    employees: any[];
    line_order: string;
    status: string;
  }>({
    department: 'all',
    employees: selectedEmployees,
    line_order: 'all',
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
  const startDate = currentDate.startOf('month').subtract(14, 'day').format('YYYY-MM-DD');
  const endDate = currentDate.endOf('month').add(14, 'day').format('YYYY-MM-DD');

  // Quick dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<string | undefined>();
  const [targetDate, setTargetDate] = useState<string | undefined>();

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      const [empRes, deptRes, lineRes] = await Promise.all([
        getDoctypeList('Employee', ['name', 'employee_name', 'department']),
        getDoctypeList('Department', ['name', 'department_name']),
        getDoctypeList('Line Order', ['name', 'line_name']),
      ]);
      setEmployees(empRes || []);
      setDepartments(deptRes || []);
      setLines(lineRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDrawerFilters = (update: any) => {
    setFilters((prev) => {
      const next = { ...prev, ...update };
      if ('employees' in update) {
        const val = update.employees || [];
        setSelectedEmployees(val);
      } else if ('employee' in update) {
        const val = Array.isArray(update.employee) ? update.employee : update.employee ? [update.employee] : [];
        setSelectedEmployees(val);
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilters({
      department: 'all',
      employees: isRestrictedEmployee && user?.employee ? [{ name: user.employee, employee_name: user.employee_name || user.employee }] : [],
      line_order: 'all',
      status: 'all',
    });
    if (isHRUser) {
      setSelectedEmployees([]);
    }
  };

  const employeeFilterParam = useMemo(() => {
    if (selectedEmployees.length === 0) return undefined;
    const ids = selectedEmployees.map((e) => (typeof e === 'string' ? e : e.name)).filter(Boolean);
    return ids.length === 1 ? ids[0] : ids;
  }, [selectedEmployees]);

  const { events = [], loading, refetch } = useCalendarLineRoster(
    startDate,
    endDate,
    employeeFilterParam,
    filters.department !== 'all' ? filters.department : undefined
  );

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Sync title on mount / calendar ready
  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      setTitle(api.view.title);
    }
  }, []);

  // Calendar Navigation
  const handlePrev = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.prev();
      const newDate = dayjs(calendarApi.getDate());
      setCurrentDate(newDate);
      setMiniCalDate(newDate);
      setTitle(calendarApi.view.title);
    }
  };

  const handleNext = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.next();
      const newDate = dayjs(calendarApi.getDate());
      setCurrentDate(newDate);
      setMiniCalDate(newDate);
      setTitle(calendarApi.view.title);
    }
  };

  const handleToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
      const newDate = dayjs(calendarApi.getDate());
      setCurrentDate(newDate);
      setMiniCalDate(newDate);
      setTitle(calendarApi.view.title);
    }
  };

  const handleChangeView = (newView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listMonth') => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(newView);
      setActiveView(newView);
      setTitle(calendarApi.view.title);
    }
  };

  const handleMiniCalChange = (newVal: dayjs.Dayjs | null) => {
    if (!newVal) return;
    setMiniCalDate(newVal);
    setCurrentDate(newVal);
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.gotoDate(newVal.toDate());
      setTitle(calendarApi.view.title);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    if (canCreate) {
      setTargetDate(selectInfo.startStr);
      setTargetEmployee(
        selectedEmployees.length === 1
          ? selectedEmployees[0]?.name || selectedEmployees[0]
          : undefined
      );
      setOpenDialog(true);
    }
  };

  const handleEventClick = (clickInfo: any) => {
    if (canEdit) {
      const emp = clickInfo.event.extendedProps?.employee || clickInfo.event.extendedProps?.employee_name;
      const dStr = clickInfo.event.startStr || dayjs(clickInfo.event.start).format('YYYY-MM-DD');
      setTargetEmployee(emp);
      setTargetDate(dStr);
      setOpenDialog(true);
    }
  };

  // Filter events by search and line filter
  const filteredEvents = useMemo(() => {
    let list = events;

    if (filters.line_order && filters.line_order !== 'all') {
      list = list.filter((e: any) => {
        const evLine = e.line_order || e.extendedProps?.line_order;
        return evLine === filters.line_order;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e: any) => {
        const titleMatch = e.title?.toLowerCase().includes(q);
        const empNameMatch =
          e.employee_name?.toLowerCase().includes(q) ||
          e.extendedProps?.employee_name?.toLowerCase().includes(q);
        const empIdMatch =
          e.employee?.toLowerCase().includes(q) ||
          e.extendedProps?.employee?.toLowerCase().includes(q);
        const lineMatch =
          e.line_name?.toLowerCase().includes(q) ||
          e.extendedProps?.line_name?.toLowerCase().includes(q);
        return titleMatch || empNameMatch || empIdMatch || lineMatch;
      });
    }

    return list;
  }, [events, filters.line_order, search]);

  // Today / selected mini calendar date events for the sidebar
  const selectedDateEvents = useMemo(() => {
    const selectedDateStr = (miniCalDate || dayjs()).format('YYYY-MM-DD');
    return events.filter((e: any) => {
      const startStr = e.start ? dayjs(e.start).format('YYYY-MM-DD') : '';
      return startStr === selectedDateStr;
    });
  }, [events, miniCalDate]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (isHRUser && filters.department !== 'all') count += 1;
    if (isHRUser && filters.employees.length > 0) count += 1;
    if (filters.line_order !== 'all') count += 1;
    return count;
  }, [isHRUser, filters]);

  const formattedEvents = useMemo(
    () =>
      filteredEvents.map((evt: any) => {
        const lineName = evt.line_name || evt.extendedProps?.line_name || evt.title;
        const isHoliday = Boolean(evt.is_holiday || evt.extendedProps?.is_holiday);
        const chipColor = getLineColor(lineName, isHoliday);

        return {
          ...evt,
          backgroundColor: chipColor,
          borderColor: chipColor,
          textColor: '#ffffff',
          extendedProps: {
            ...evt.extendedProps,
            chipColor,
          },
        };
      }),
    [filteredEvents]
  );

  const renderEventContent = (eventInfo: any) => {
    const isHoliday = Boolean(eventInfo.event.extendedProps?.is_holiday);
    const chipColor = eventInfo.event.extendedProps?.chipColor || COMMON_COLORS.emerald.main;
    const titleText = eventInfo.event.title;
    const empName = eventInfo.event.extendedProps?.employee_name;
    const lineName = eventInfo.event.extendedProps?.line_name;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: '8px',
          py: '3px',
          fontSize: '11.5px',
          fontWeight: 700,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          width: '100%',
          borderRadius: '6px',
          bgcolor: chipColor,
          color: '#ffffff',
          boxSizing: 'border-box',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        }}
      >
        <Iconify
          icon={isHoliday ? ('solar:calendar-bold' as any) : ('solar:layers-minimalistic-bold' as any)}
          width={13}
          sx={{ flexShrink: 0, color: '#ffffff' }}
        />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: '#ffffff',
            minWidth: 0,
            flex: 1,
          }}
        >
          {empName ? `${empName} - ${lineName || titleText}` : titleText}
        </span>
      </Box>
    );
  };

  return (
    <>
      <Card
        sx={{
          borderRadius: 2,
          boxShadow: '0 8px 24px -4px rgba(145, 158, 171, 0.2), 0 0 2px 0 rgba(145, 158, 171, 0.24)',
          border: '1px solid rgba(145, 158, 171, 0.12)',
          position: 'relative',
          height: 850,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          overflow: 'visible',
        }}
      >
        {/* Top Header Toolbar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 2,
            bgcolor: '#FFFFFF',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            borderBottom: '1px solid #E2E8F0',
            height: 72,
            boxSizing: 'border-box',
            flexShrink: 0,
            zIndex: 30,
          }}
        >
          {/* Left controls: Today button, < >, Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="contained"
              size="medium"
              onClick={handleToday}
              startIcon={<FiCalendar size={18} style={{ color: '#0F172A' }} />}
              sx={{
                borderRadius: '10px',
                bgcolor: '#FFFFFF',
                color: '#0F172A',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.925rem',
                px: 2,
                py: 0.7,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid #E2E8F0',
                '&:hover': {
                  bgcolor: '#F8FAFC',
                },
              }}
            >
              Today
            </Button>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <IconButton
                size="small"
                onClick={handlePrev}
                sx={{ color: '#334155', p: 0.5 }}
              >
                <FiChevronLeft size={22} />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleNext}
                sx={{ color: '#334155', p: 0.5 }}
              >
                <FiChevronRight size={22} />
              </IconButton>
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                ml: 1,
                color: '#1E293B',
                fontSize: '1.45rem',
                letterSpacing: '-0.02em',
              }}
            >
              {title || currentDate.format('MMMM YYYY')}
            </Typography>
          </Box>

          {/* Right controls: View switcher buttons & Filters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, flexWrap: 'nowrap' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 0.45,
                bgcolor: '#F4F6F8',
                border: '1px solid #E5E7EB',
                borderRadius: '999px',
                gap: 0.35,
              }}
            >
              {[
                { label: 'Day', view: 'timeGridDay' as const },
                { label: 'Week', view: 'timeGridWeek' as const },
                { label: 'Month', view: 'dayGridMonth' as const },
                { label: 'Agenda', view: 'listMonth' as const },
              ].map((item) => {
                const isSelected = activeView === item.view;
                return (
                  <Box
                    key={item.label}
                    onClick={() => handleChangeView(item.view)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 2,
                      py: 0.45,
                      borderRadius: '999px',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      bgcolor: isSelected ? COMMON_COLORS.emerald.darker : 'transparent',
                      color: isSelected ? '#fff' : '#637381',
                      boxShadow: isSelected ? `0 3px 10px ${alpha(COMMON_COLORS.emerald.darker, 0.35)}` : 'none',
                      '&:hover': {
                        bgcolor: isSelected ? COMMON_COLORS.emerald.darker : alpha(COMMON_COLORS.emerald.darker, 0.08),
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isSelected ? 700 : 600,
                        fontSize: '0.8rem',
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {/* Advanced Filters Button (matching Monthly Roster View filter size) */}
            {isHRUser && (
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
                  {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
                </Box>
                <Iconify icon={"eva:chevron-down-fill" as any} width={16} sx={{ color: COMMON_COLORS.filterButton.color, flexShrink: 0 }} />
              </Button>
            )}
          </Box>
        </Box>

        {/* Content Body: Left Sidebar + Main Calendar Grid */}
        <Box sx={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden' }}>
          {/* ---- Left Sidebar ---- */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: 290,
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid #E2E8F0',
              bgcolor: 'background.paper',
              overflowY: 'auto',
              zIndex: 20,
            }}
          >
            {/* Mini Month Calendar */}
            <Box
              sx={{
                '& .MuiDateCalendar-root': {
                  width: '100%',
                  height: 'auto',
                  maxHeight: 'none',
                  minHeight: 285,
                  mt: 0.5,
                  px: 1,
                },
                '& .MuiPickersCalendarHeader-root': {
                  pl: 1.5,
                  pr: 1,
                  mt: 0.5,
                  mb: 0.5,
                },
                '& .MuiPickersCalendarHeader-label': {
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#1E293B',
                },
                '& .MuiDayCalendar-header': {
                  justifyContent: 'space-around',
                },
                '& .MuiDayCalendar-weekContainer': {
                  justifyContent: 'space-around',
                  my: 0.25,
                },
                '& .MuiDayCalendar-weekDayLabel': {
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748B',
                  width: 32,
                  height: 28,
                },
                '& .MuiPickersDay-root': {
                  width: 32,
                  height: 32,
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: '#1E293B',
                  '&.Mui-selected': {
                    bgcolor: `${COMMON_COLORS.emerald.main} !important`,
                    color: '#fff',
                    fontWeight: 700,
                    '&:hover': { bgcolor: `${COMMON_COLORS.emerald.dark} !important` },
                  },
                  '&.MuiPickersDay-today:not(.Mui-selected)': {
                    borderColor: `${COMMON_COLORS.emerald.main} !important`,
                    color: `${COMMON_COLORS.emerald.main} !important`,
                    fontWeight: 700,
                  },
                },
                '& .MuiDayCalendar-slideTransition': {
                  minHeight: 235,
                  overflowY: 'hidden',
                },
              }}
            >
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateCalendar
                  value={miniCalDate}
                  onChange={handleMiniCalChange}
                  showDaysOutsideCurrentMonth
                  slots={{
                    day: (props) => {
                      const { day, outsideCurrentMonth, ...other } = props;
                      const dateStr = day.format('YYYY-MM-DD');

                      const dayEvents = outsideCurrentMonth
                        ? []
                        : events.filter((evt: any) => {
                          const s = evt.start ? dayjs(evt.start).format('YYYY-MM-DD') : '';
                          return s === dateStr;
                        });

                      const dots = dayEvents.slice(0, 3).map((evt: any, idx: number) => {
                        const lineName = evt.line_name || evt.extendedProps?.line_name;
                        const isHol = Boolean(evt.is_holiday || evt.extendedProps?.is_holiday);
                        const bg = getLineColor(lineName, isHol);
                        return (
                          <Box
                            key={`${evt.id || idx}-${idx}`}
                            sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: bg }}
                          />
                        );
                      });

                      return (
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                          <PickersDay {...other} outsideCurrentMonth={outsideCurrentMonth} day={day} />
                          {dots.length > 0 && (
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: 2,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                gap: '2px',
                                pointerEvents: 'none',
                              }}
                            >
                              {dots}
                            </Box>
                          )}
                        </Box>
                      );
                    },
                  }}
                />
              </LocalizationProvider>
            </Box>

            <Divider sx={{ borderColor: '#E2E8F0' }} />

            {/* Search Box */}
            <Box sx={{ p: 2, pb: 1.5 }}>
              <OutlinedInput
                fullWidth
                size="small"
                placeholder="Search lines, employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                }
                sx={{
                  borderRadius: 2,
                  fontSize: '0.85rem',
                  bgcolor: '#F8FAFC',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E2E8F0',
                  },
                }}
              />
            </Box>

            <Divider sx={{ borderColor: '#E2E8F0' }} />

            {/* Today / Selected Date Line Cards */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
              <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: COMMON_COLORS.emerald.main,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    fontSize: '0.72rem',
                  }}
                >
                  <Iconify icon={"solar:layers-minimalistic-bold" as any} width={14} />
                  {miniCalDate.isSame(dayjs(), 'day') ? 'TODAY LINE ASSIGNMENTS' : `${miniCalDate.format('MMM D')} LINE ASSIGNMENTS`}
                </Typography>

                {(() => {
                  const linesOnDate = selectedDateEvents.filter((e: any) => !e.is_holiday && !e.extendedProps?.is_holiday);
                  if (linesOnDate.length === 0) {
                    return (
                      <Box
                        sx={{
                          py: 1.5,
                          px: 2,
                          borderRadius: '10px',
                          bgcolor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.825rem', fontWeight: 600 }}>
                          No Line Assignments Today
                        </Typography>
                      </Box>
                    );
                  }

                  return (
                    <Stack spacing={1}>
                      {linesOnDate.slice(0, 10).map((evt: any) => {
                        const lineName = evt.line_name || evt.extendedProps?.line_name || 'Line';
                        const color = getLineColor(lineName, false);
                        return (
                          <Box
                            key={evt.id || `${evt.employee}-${evt.start}`}
                            onClick={() => handleEventClick({ event: evt })}
                            sx={{
                              p: 1.25,
                              borderRadius: '8px',
                              bgcolor: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderLeft: `4px solid ${color}`,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor: '#F8FAFC',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 3px 8px rgba(0,0,0,0.06)',
                              },
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                                color: '#1E293B',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {evt.employee_name || evt.extendedProps?.employee_name || evt.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.725rem', fontWeight: 600 }}>
                              {lineName} • {evt.department || evt.extendedProps?.department || 'General'}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  );
                })()}
              </Stack>
            </Box>
          </Box>

          {/* ---- Main Calendar Area ---- */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 290,
              right: 0,
              bottom: 0,
              overflow: 'auto',
              p: 0,
              bgcolor: '#FFFFFF',
              '& .fc': {
                height: '100%',
                fontFamily: 'inherit',
              },
              '& .fc-header-toolbar': {
                display: 'none',
              },
              '& .fc-theme-standard, & .fc-scrollgrid': {
                border: 'none !important',
              },
              '& .fc-theme-standard td, & .fc-theme-standard th': {
                borderColor: '#E2E8F0',
              },
              '& .fc-col-header-cell': {
                py: 1.75,
                bgcolor: '#FAFAFA',
                color: '#303538',
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderTop: 'none !important',
                borderLeft: 'none !important',
                borderRight: 'none !important',
                borderBottom: '1px solid #E2E8F0 !important',
              },
              '& .fc-col-header-cell.fc-day-sun': {
                color: '#E11D48 !important',
              },
              '& .fc-daygrid-day-number': {
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.8125rem',
                p: 1,
              },
              '& .fc-day-today': {
                backgroundColor: `${alpha(COMMON_COLORS.emerald.main, 0.06)} !important`,
              },
              '& .fc-day-today .fc-daygrid-day-number': {
                color: `${COMMON_COLORS.emerald.main} !important`,
                fontWeight: 700,
              },
              '& .fc-event': {
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: 'none',
                bgcolor: 'transparent !important',
                p: 0,
                mb: '4px',
                transition: 'transform 0.15s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                },
              },
              '& .fc-daygrid-event-harness': {
                mb: '4px',
              },
              '& .fc-h-event, & .fc-v-event': {
                bgcolor: 'transparent !important',
                border: 'none !important',
              },
              '& .fc-daygrid-more-link': {
                color: '#637381',
                fontWeight: 600,
                fontSize: '0.785rem',
                textDecoration: 'none',
                mt: 0.5,
                display: 'block',
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': {
                  color: `${COMMON_COLORS.emerald.dark} !important`,
                  textDecoration: 'underline',
                },
              },
              '& .fc-popover, & .fc-more-popover': {
                borderRadius: '12px !important',
                border: '1px solid #E2E8F0 !important',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1) !important',
                overflow: 'hidden !important',
                zIndex: '999999 !important',
                minWidth: '220px !important',
                maxWidth: '300px !important',
                bgcolor: '#FFFFFF !important',
              },
              '& .fc-popover-header': {
                bgcolor: '#F8FAFC !important',
                p: '8px 12px !important',
                fontWeight: '700 !important',
                color: '#1E293B !important',
                fontSize: '0.85rem !important',
                borderBottom: '1px solid #E2E8F0 !important',
              },
              '& .fc-popover-body': {
                p: '8px !important',
                maxHeight: '260px',
                overflowY: 'auto',
                boxSizing: 'border-box !important',
                width: '100% !important',
              },
            }}
          >
            {loading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(2px)',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircularProgress size={40} sx={{ color: COMMON_COLORS.emerald.main }} />
              </Box>
            )}

            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={activeView}
              headerToolbar={false}
              selectable={canCreate}
              selectMirror
              dayMaxEvents={3}
              events={formattedEvents}
              eventContent={renderEventContent}
              select={handleDateSelect}
              eventClick={handleEventClick}
              datesSet={(dateInfo) => {
                setTitle(dateInfo.view.title);
              }}
              height="100%"
            />
          </Box>
        </Box>
      </Card>

      {/* Filter Drawer */}
      <LineRosterTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={filters}
        onFilters={handleDrawerFilters}
        canReset={activeFilterCount > 0 || Boolean(search)}
        onResetFilters={handleResetFilters}
        employeeOptions={employees}
        lineOptions={lines}
        departmentOptions={departments}
        hideDateFilters
        hideStatusFilter
        isHR={isHRUser}
      />

      {/* Quick Assign Dialog */}
      {openDialog && (
        <LineRosterDialog
          open={openDialog}
          onClose={() => {
            setOpenDialog(false);
            setTargetEmployee(undefined);
            setTargetDate(undefined);
          }}
          initialEmployee={targetEmployee}
          initialDate={targetDate}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </>
  );
}
