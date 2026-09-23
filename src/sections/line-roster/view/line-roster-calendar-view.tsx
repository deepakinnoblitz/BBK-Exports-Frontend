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

import { useCalendarLineRoster } from 'src/hooks/use-line-roster';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';

import { LineRosterDialog } from '../line-roster-dialog';
import { LineRosterTableFiltersDrawer } from '../line-roster-table-filters-drawer';

// ----------------------------------------------------------------------

export function LineRosterCalendarView({
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
  const [lines, setLines] = useState<any[]>([]);
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
  const startDate = currentDate.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
  const endDate = currentDate.endOf('month').add(7, 'day').format('YYYY-MM-DD');

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

  const employeeFilterParam = useMemo(() => {
    if (selectedEmployees.length === 0) return undefined;
    return selectedEmployees.map((e) => (typeof e === 'string' ? e : e.name));
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

  // Calendar Navigation
  const handlePrev = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.prev();
      setCurrentDate(dayjs(calendarApi.getDate()));
      setTitle(calendarApi.view.title);
    }
  };

  const handleNext = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.next();
      setCurrentDate(dayjs(calendarApi.getDate()));
      setTitle(calendarApi.view.title);
    }
  };

  const handleToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
      setCurrentDate(dayjs(calendarApi.getDate()));
      setTitle(calendarApi.view.title);
    }
  };

  const handleChangeView = (newView: string) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(newView);
      setActiveView(newView);
      setTitle(calendarApi.view.title);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    if (canCreate) {
      setTargetDate(selectInfo.startStr);
      setTargetEmployee(selectedEmployees.length === 1 ? selectedEmployees[0]?.name || selectedEmployees[0] : undefined);
      setOpenDialog(true);
    }
  };

  const handleEventClick = (clickInfo: any) => {
    if (canEdit) {
      const emp = clickInfo.event.extendedProps?.employee;
      const dStr = clickInfo.event.startStr;
      setTargetEmployee(emp);
      setTargetDate(dStr);
      setOpenDialog(true);
    }
  };

  // Filter events by search
  const filteredEvents = useMemo(() => {
    let list = events;
    if (filters.line_order && filters.line_order !== 'all') {
      list = list.filter((e) => e.line_order === filters.line_order);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.employee_name?.toLowerCase().includes(q) ||
          e.employee?.toLowerCase().includes(q) ||
          e.line_name?.toLowerCase().includes(q)
      );
    }
    return list.map((ev) => ({
      ...ev,
      backgroundColor: COMMON_COLORS.emerald.main,
      borderColor: COMMON_COLORS.emerald.dark,
      textColor: '#ffffff',
    }));
  }, [events, filters.line_order, search]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.department !== 'all') count += 1;
    if (filters.employees.length > 0) count += 1;
    if (filters.line_order !== 'all') count += 1;
    return count;
  }, [filters]);

  const canReset = filters.department !== 'all' || filters.employees.length > 0 || filters.line_order !== 'all' || !!search;

  const handleResetFilters = () => {
    setFilters({
      department: 'all',
      employees: [],
      line_order: 'all',
      status: 'all',
    });
    setSelectedEmployees([]);
    setSearch('');
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

  return (
    <Stack spacing={2.5}>
      {/* Top Controls Card */}
      <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          {/* Navigation Controls */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={handlePrev} size="small">
              <Iconify icon="solar:alt-arrow-left-bold" />
            </IconButton>

            <Typography variant="h6" sx={{ minWidth: 180, textAlign: 'center', fontWeight: 800 }}>
              {title || currentDate.format('MMMM YYYY')}
            </Typography>

            <IconButton onClick={handleNext} size="small">
              <Iconify icon="solar:alt-arrow-right-bold" />
            </IconButton>

            <Button
              size="small"
              variant="outlined"
              onClick={handleToday}
              sx={{ ml: 1, textTransform: 'capitalize', fontWeight: 700 }}
            >
              Today
            </Button>
          </Stack>

          {/* View Switchers & Filter */}
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <OutlinedInput
              size="small"
              placeholder="Search in calendar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <Iconify icon={"solar:magnifer-linear" as any} sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              }
              sx={{ width: { xs: '100%', md: 220 } }}
            />

            <Box sx={{ display: 'inline-flex', bgcolor: alpha(theme.palette.grey[500], 0.08), p: 0.5, borderRadius: 1 }}>
              {[
                { value: 'dayGridMonth', label: 'Month' },
                { value: 'timeGridWeek', label: 'Week' },
                { value: 'timeGridDay', label: 'Day' },
                { value: 'listMonth', label: 'List' },
              ].map((v) => (
                <Button
                  key={v.value}
                  size="small"
                  onClick={() => handleChangeView(v.value)}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    fontWeight: activeView === v.value ? 700 : 500,
                    bgcolor: activeView === v.value ? 'background.paper' : 'transparent',
                    boxShadow: activeView === v.value ? theme.shadows[1] : 'none',
                    color: activeView === v.value ? 'text.primary' : 'text.secondary',
                    '&:hover': { bgcolor: activeView === v.value ? 'background.paper' : alpha(theme.palette.grey[500], 0.12) },
                  }}
                >
                  {v.label}
                </Button>
              ))}
            </Box>

            <Badge badgeContent={activeFilterCount} color="error">
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon={"solar:filter-bold" as any} />}
                onClick={() => setOpenFilters(true)}
                sx={{
                  color: canReset ? COMMON_COLORS.emerald.main : 'text.secondary',
                  borderColor: canReset ? COMMON_COLORS.emerald.main : 'divider',
                  fontWeight: 700,
                }}
              >
                Filters
              </Button>
            </Badge>
          </Stack>
        </Stack>
      </Card>

      {/* Calendar Card */}
      <Card sx={{ p: 2, position: 'relative', minHeight: 650 }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.background.paper, 0.7),
              zIndex: 10,
            }}
          >
            <CircularProgress sx={{ color: COMMON_COLORS.emerald.main }} />
          </Box>
        )}

        <Box
          sx={{
            '& .fc': {
              '--fc-border-color': theme.palette.divider,
              '--fc-today-bg-color': alpha(COMMON_COLORS.emerald.main, 0.08),
              fontFamily: theme.typography.fontFamily,
            },
            '& .fc-col-header-cell': {
              bgcolor: alpha(theme.palette.grey[500], 0.08),
              py: 1,
              fontWeight: 700,
              fontSize: '0.85rem',
            },
            '& .fc-daygrid-event': {
              borderRadius: 0.75,
              px: 0.75,
              py: 0.25,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              bgcolor: COMMON_COLORS.emerald.main,
              border: `1px solid ${COMMON_COLORS.emerald.dark}`,
            },
            '& .fc-event-title': {
              fontWeight: 600,
            },
          }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            events={filteredEvents}
            selectable={canCreate}
            select={handleDateSelect}
            eventClick={handleEventClick}
            dayMaxEvents={3}
            datesSet={(dateInfo) => {
              setTitle(dateInfo.view.title);
            }}
            height="auto"
          />
        </Box>
      </Card>

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

      {/* Side Filters Drawer */}
      <LineRosterTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={filters}
        onFilters={handleDrawerFilters}
        canReset={canReset}
        onResetFilters={handleResetFilters}
        employeeOptions={employees}
        lineOptions={lines}
        departmentOptions={departments}
        hideDateFilters
        hideStatusFilter
      />
    </Stack>
  );
}
