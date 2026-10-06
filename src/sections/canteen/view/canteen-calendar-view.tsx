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
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { useCalendarCanteen } from 'src/hooks/use-canteen';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { CanteenDialog } from '../canteen-dialog';
import { CanteenTableFiltersDrawer } from '../canteen-table-filters-drawer';

// ----------------------------------------------------------------------

export function CanteenCalendarView({
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

  const theme = useTheme();
  const calendarRef = useRef<FullCalendar>(null);

  const [title, setTitle] = useState('');
  const [activeView, setActiveView] = useState('dayGridMonth');

  // Filters State
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
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
    meal_type: string;
    status: string;
  }>({
    department: 'all',
    employees: selectedEmployees,
    meal_type: 'all',
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
      const [empRes, deptRes] = await Promise.all([
        getDoctypeList('Employee', ['name', 'employee_name', 'department']),
        getDoctypeList('Department', ['name', 'department_name']),
      ]);
      setEmployees(empRes || []);
      setDepartments(deptRes || []);
    } catch (e) {
      console.error(e);
    }
  };

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

  const { events = [], loading, refetch } = useCalendarCanteen(
    startDate,
    endDate,
    filters.department !== 'all' ? filters.department : undefined,
    employeeFilterParam,
    filters.meal_type !== 'all' ? filters.meal_type : undefined
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
      setTargetEmployee(
        selectedEmployees.length === 1
          ? selectedEmployees[0]?.name || selectedEmployees[0]
          : undefined
      );
      setOpenDialog(true);
    }
  };

  const handleEventClick = (clickInfo: any) => {
    if (clickInfo.event.extendedProps?.is_holiday) return;
    if (canEdit) {
      const emp = clickInfo.event.extendedProps?.employee;
      const dStr = clickInfo.event.extendedProps?.canteen_date || clickInfo.event.startStr;
      setTargetEmployee(emp);
      setTargetDate(dStr);
      setOpenDialog(true);
    }
  };

  // Filter events by search
  const filteredEvents = useMemo(() => {
    let list = events;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.extendedProps?.employee_name?.toLowerCase().includes(q) ||
          e.extendedProps?.employee?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [events, search]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (isHRUser && filters.department !== 'all') count += 1;
    if (isHRUser && filters.employees.length > 0) count += 1;
    if (filters.meal_type !== 'all') count += 1;
    return count;
  }, [isHRUser, filters]);

  const canReset =
    (isHRUser && filters.department !== 'all') ||
    (isHRUser && filters.employees.length > 0) ||
    filters.meal_type !== 'all' ||
    !!search;

  const handleResetFilters = () => {
    setFilters({
      department: 'all',
      employees: [],
      meal_type: 'all',
      status: 'all',
    });
    setSearch('');
    setSelectedEmployees([]);
  };

  return (
    <>
      <Card
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          p: 2.5,
          position: 'relative',
        }}
      >
        {/* Calendar Header Controls */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2.5 }}
        >
          {/* Search */}
          <OutlinedInput
            size="small"
            placeholder="Search events, employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            }
            sx={{ width: { xs: '100%', sm: 260 } }}
          />

          {/* Navigation */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button size="small" variant="outlined" onClick={handleToday}>
              Today
            </Button>
            <IconButton size="small" onClick={handlePrev}>
              <Iconify icon="solar:alt-arrow-left-bold" width={18} />
            </IconButton>
            <Typography variant="h6" sx={{ minWidth: 160, textAlign: 'center', fontWeight: 700 }}>
              {title || currentDate.format('MMMM YYYY')}
            </Typography>
            <IconButton size="small" onClick={handleNext}>
              <Iconify icon="solar:alt-arrow-right-bold" width={18} />
            </IconButton>
          </Stack>

          {/* View Toggles & Filters */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant={activeView === 'dayGridMonth' ? 'contained' : 'outlined'}
              onClick={() => handleChangeView('dayGridMonth')}
            >
              Month
            </Button>
            <Button
              size="small"
              variant={activeView === 'timeGridWeek' ? 'contained' : 'outlined'}
              onClick={() => handleChangeView('timeGridWeek')}
            >
              Week
            </Button>
            <Button
              size="small"
              variant={activeView === 'listMonth' ? 'contained' : 'outlined'}
              onClick={() => handleChangeView('listMonth')}
            >
              List
            </Button>

            <Button
              disableRipple
              onClick={() => setOpenFilters(true)}
              sx={{
                height: 36,
                px: 1.75,
                bgcolor: COMMON_COLORS.filterButton.bg,
                color: COMMON_COLORS.filterButton.color,
                borderRadius: 1.25,
                fontWeight: 700,
                fontSize: '0.8125rem',
                textTransform: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
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
                <Iconify icon={"solar:filter-linear" as any} width={16} sx={{ color: COMMON_COLORS.filterButton.color, flexShrink: 0 }} />
              </Badge>
              <Box component="span" sx={{ whiteSpace: 'nowrap', display: 'inline', fontWeight: 700 }}>
                {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
              </Box>
              <Iconify icon={"eva:chevron-down-fill" as any} width={14} sx={{ color: COMMON_COLORS.filterButton.color, flexShrink: 0 }} />
            </Button>
          </Stack>
        </Stack>

        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: alpha('#fff', 0.6),
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={40} />
          </Box>
        )}

        {/* FullCalendar Component */}
        <Box
          sx={{
            '& .fc': {
              '--fc-border-color': theme.palette.divider,
              '--fc-today-bg-color': alpha(theme.palette.primary.main, 0.06),
              fontSize: '0.85rem',
            },
            '& .fc-header-toolbar': {
              display: 'none',
            },
            '& .fc-event': {
              cursor: 'pointer',
              borderRadius: '4px',
              padding: '2px 4px',
              fontWeight: 600,
            },
          }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            selectable={canCreate}
            selectMirror
            dayMaxEvents={4}
            events={filteredEvents}
            select={handleDateSelect}
            eventClick={handleEventClick}
            datesSet={(dateInfo) => {
              setTitle(dateInfo.view.title);
            }}
            height="auto"
          />
        </Box>
      </Card>

      {/* Filter Drawer */}
      <CanteenTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={filters}
        onFilters={(update) => {
          setFilters((prev) => ({ ...prev, ...update }));
          if (update.employees !== undefined) {
            setSelectedEmployees(update.employees);
          }
        }}
        canReset={canReset}
        onResetFilters={handleResetFilters}
        employeeOptions={filters.department === 'all' ? employees : employees.filter((e) => e.department === filters.department)}
        departmentOptions={departments}
        hideDateFilters
        hideStatusFilter
        isHR={isHRUser}
      />

      {/* Add / Edit Entry Dialog */}
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
