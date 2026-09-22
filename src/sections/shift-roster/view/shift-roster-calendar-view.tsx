import dayjs from 'dayjs';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRef, useMemo, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import { Box, alpha, useTheme } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';

import { useCalendarRoster } from 'src/hooks/use-shift-roster';

import { getDoctypeList } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';

import { ShiftRosterDialog } from '../shift-roster-dialog';
// ----------------------------------------------------------------------

export function ShiftRosterCalendarView({
  canCreate = true,
  canEdit = true,
  selectedEmployees: controlledEmployees,
  onSelectEmployees,
  selectedEmployee,
  onSelectEmployee,
}: {
  canCreate?: boolean;
  canEdit?: boolean;
  selectedEmployees?: any[];
  onSelectEmployees?: (emps: any[]) => void;
  selectedEmployee?: any | null;
  onSelectEmployee?: (emp: any | null) => void;
}) {
  const theme = useTheme();
  const calendarRef = useRef<FullCalendar>(null);

  const [title, setTitle] = useState('');
  const [activeView, setActiveView] = useState('dayGridMonth');

  // Filters
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [internalEmployees, setInternalEmployees] = useState<any[]>([]);

  const selectedEmployees: any[] = (controlledEmployees !== undefined
    ? (Array.isArray(controlledEmployees) ? controlledEmployees : controlledEmployees ? [controlledEmployees] : [])
    : selectedEmployee !== undefined
    ? (Array.isArray(selectedEmployee) ? selectedEmployee : selectedEmployee ? [selectedEmployee] : [])
    : internalEmployees);

  const setSelectedEmployees = (val: any[]) => {
    setInternalEmployees(val);
    onSelectEmployees?.(val);
    onSelectEmployee?.(val.length === 1 ? val[0] : val.length > 0 ? val : null);
  };

  const currentSelectedEmployee = useMemo(() => {
    if (selectedEmployees.length === 0) return null;
    const first = selectedEmployees[0];
    if (typeof first === 'string') {
      return employees.find((e) => e.name === first) || { name: first, employee_name: first };
    }
    return first;
  }, [selectedEmployees, employees]);
  const [selectedDept, setSelectedDept] = useState('all');

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
      const [empRes, deptRes] = await Promise.all([
        getDoctypeList('Employee', ['name', 'employee_name', 'department']),
        getDoctypeList('Department', ['name', 'department_name']),
      ]);
      const empList = empRes || [];
      setEmployees(empList);
      setDepartments(deptRes || []);
      if (!controlledEmployees && !selectedEmployee && empList.length > 0 && selectedEmployees.length === 0) {
        setSelectedEmployees([empList[0]]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startDate = currentDate.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
  const endDate = currentDate.endOf('month').add(7, 'day').format('YYYY-MM-DD');

  const activeEmployeeName = currentSelectedEmployee?.name || (employees.length > 0 ? employees[0]?.name : undefined);

  const { events, loading, refetch } = useCalendarRoster(
    startDate,
    endDate,
    activeEmployeeName,
    selectedDept !== 'all' ? selectedDept : undefined
  );

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
      setDialogEmployee(currentSelectedEmployee?.name || undefined);
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
    <Card
      sx={{
        p: 2.5,
        bgcolor: 'background.paper',
        border: (t) => `1px solid ${t.palette.divider}`,
        borderRadius: 2,
      }}
    >
      {/* Calendar Header & Toolbar matching Attendance Report */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        {/* Navigation & Title */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleToday}
            sx={{
              borderRadius: '8px',
              px: 2,
              py: 0.5,
              fontWeight: 700,
              fontSize: '0.825rem',
              borderColor: alpha(theme.palette.grey[500], 0.24),
              color: 'text.primary',
              '&:hover': {
                borderColor: alpha(theme.palette.grey[500], 0.48),
                bgcolor: alpha(theme.palette.grey[500], 0.04),
              },
            }}
          >
            Today
          </Button>

          <IconButton
            onClick={handlePrev}
            size="small"
            sx={{
              width: 32,
              height: 32,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '8px',
              bgcolor: 'background.paper',
              color: 'text.secondary',
              transition: theme.transitions.create(['background-color', 'color', 'border-color', 'box-shadow'], {
                duration: theme.transitions.duration.shorter,
              }),
              '&:hover': {
                bgcolor: theme.palette.action.hover,
                color: 'text.primary',
                borderColor: alpha(theme.palette.grey[500], 0.32),
              },
            }}
          >
            <Iconify icon={"solar:alt-arrow-left-bold" as any} width={16} />
          </IconButton>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: 'text.primary',
              letterSpacing: -0.5,
              minWidth: 160,
              textAlign: 'center',
            }}
          >
            {title || currentDate.format('MMMM YYYY')}
          </Typography>

          <IconButton
            onClick={handleNext}
            size="small"
            sx={{
              width: 32,
              height: 32,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '8px',
              bgcolor: 'background.paper',
              color: 'text.secondary',
              transition: theme.transitions.create(['background-color', 'color', 'border-color', 'box-shadow'], {
                duration: theme.transitions.duration.shorter,
              }),
              '&:hover': {
                bgcolor: theme.palette.action.hover,
                color: 'text.primary',
                borderColor: alpha(theme.palette.grey[500], 0.32),
              },
            }}
          >
            <Iconify icon={"solar:alt-arrow-right-bold" as any} width={16} />
          </IconButton>
        </Stack>

        {/* Filters & View Switcher */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={selectedDept}
              onChange={(e) => {
                const newDept = e.target.value;
                setSelectedDept(newDept);
                if (newDept !== 'all') {
                  const filtered = employees.filter((emp) => emp.department === newDept);
                  if (filtered.length > 0 && (!currentSelectedEmployee || currentSelectedEmployee.department !== newDept)) {
                    setSelectedEmployees([filtered[0]]);
                  }
                }
              }}
              displayEmpty
            >
              <MenuItem value="all">All Departments</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.name} value={d.name}>
                  {d.department_name || d.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            size="small"
            options={selectedDept === 'all' ? employees : employees.filter((e) => e.department === selectedDept)}
            getOptionLabel={(opt) => (opt ? `${opt.employee_name || opt.name} (${opt.name})` : '')}
            isOptionEqualToValue={(option, value) => option?.name === value?.name}
            value={currentSelectedEmployee || null}
            onChange={(_, val) => {
              setSelectedEmployees(val ? [val] : []);
            }}
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
            renderInput={(params) => (
              <TextField {...params} placeholder="Select Employee..." sx={{ width: 240 }} />
            )}
          />

          {/* Day / Week / Month Switcher matching Attendance Report */}
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
      </Stack>

      {/* Calendar Area with Attendance Report FullCalendar Styling */}
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
          events={events}
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
  );
}

