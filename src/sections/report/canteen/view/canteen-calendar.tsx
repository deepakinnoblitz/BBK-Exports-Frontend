import dayjs from 'dayjs';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useRef, useState, useEffect } from 'react';
import interactionPlugin from '@fullcalendar/interaction';

import Card from '@mui/material/Card';
import { alpha } from '@mui/material/styles';
import { Box, Stack, Button, useTheme, Typography, IconButton } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface CanteenCalendarProps {
  reportData: any[];
  employee: string;
  fromDate?: any;
  toDate?: any;
  onEventClick?: (name: string, rawData?: any) => void;
}

const MEAL_COLORS: Record<string, { border: string; bg: string; text: string; monthBg: string }> = {
  Lunch: {
    border: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    text: '#047857',
    monthBg: 'rgba(16, 185, 129, 0.14)',
  },
  Dinner: {
    border: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.08)',
    text: '#4338ca',
    monthBg: 'rgba(99, 102, 241, 0.14)',
  },
  Breakfast: {
    border: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    text: '#b45309',
    monthBg: 'rgba(245, 158, 11, 0.14)',
  },
  Snacks: {
    border: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.08)',
    text: '#7e22ce',
    monthBg: 'rgba(168, 85, 247, 0.14)',
  },
};

function getMealColor(mealType: string) {
  const match = Object.keys(MEAL_COLORS).find((k) =>
    (mealType || '').toLowerCase().includes(k.toLowerCase())
  );
  if (match) return MEAL_COLORS[match];
  return {
    border: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    text: '#047857',
    monthBg: 'rgba(16, 185, 129, 0.14)',
  };
}

export function CanteenCalendar({
  reportData,
  employee,
  fromDate,
  toDate,
  onEventClick,
}: CanteenCalendarProps) {
  const theme = useTheme();
  const calendarRef = useRef<FullCalendar>(null);

  const [title, setTitle] = useState('');
  const [activeView, setActiveView] = useState('dayGridMonth');

  useEffect(() => {
    if (fromDate && calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.gotoDate(dayjs(fromDate).toDate());
    }
  }, [fromDate]);

  // Map canteen rows to calendar events
  const calendarEvents = reportData.map((row, index) => {
    const start = row.canteen_date ? dayjs(row.canteen_date).toDate() : new Date();
    const end = row.canteen_date ? dayjs(row.canteen_date).toDate() : new Date();
    const mealType = row.meal_type || 'Lunch';
    const mealCount = row.meal_count || 1;

    return {
      id: row.name || `event-${index}`,
      title: employee === 'all' ? `${row.employee_name} (${mealType} x${mealCount})` : `${mealType} (x${mealCount})`,
      start,
      end,
      allDay: true,
      extendedProps: {
        mealType,
        mealCount,
        status: row.status,
        source: row.source,
        employeeName: row.employee_name,
        employeeId: row.employee,
        rawRow: row,
      },
    };
  });

  const handleToday = () => {
    calendarRef.current?.getApi().today();
  };

  const handlePrev = () => {
    calendarRef.current?.getApi().prev();
  };

  const handleNext = () => {
    calendarRef.current?.getApi().next();
  };

  const handleChangeView = (viewName: string) => {
    calendarRef.current?.getApi().changeView(viewName);
    setActiveView(viewName);
  };

  return (
    <Card
      sx={{
        p: 3,
        borderRadius: 2,
        boxShadow: (t) => t.customShadows?.card || '0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)',
      }}
    >
      {/* Calendar Header Navigation */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleToday}
            sx={{
              fontWeight: 700,
              borderRadius: 1.25,
              borderColor: alpha(theme.palette.grey[500], 0.24),
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
            }}
          >
            Today
          </Button>

          <IconButton onClick={handlePrev} size="small" sx={{ border: `1px solid ${alpha(theme.palette.grey[500], 0.24)}` }}>
            <Iconify icon="solar:alt-arrow-left-bold" width={18} />
          </IconButton>

          <IconButton onClick={handleNext} size="small" sx={{ border: `1px solid ${alpha(theme.palette.grey[500], 0.24)}` }}>
            <Iconify icon="solar:alt-arrow-right-bold" width={18} />
          </IconButton>

          <Typography variant="h5" sx={{ fontWeight: 800, ml: 1 }}>
            {title}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          {[
            { view: 'dayGridMonth', label: 'Month' },
            { view: 'timeGridWeek', label: 'Week' },
            { view: 'timeGridDay', label: 'Day' },
            { view: 'listWeek', label: 'Agenda' },
          ].map((item) => {
            const isActive = activeView === item.view;
            return (
              <Button
                key={item.view}
                size="small"
                variant={isActive ? 'contained' : 'outlined'}
                onClick={() => handleChangeView(item.view)}
                sx={{
                  borderRadius: 1.25,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  ...(isActive
                    ? {
                        bgcolor: '#059669',
                        color: '#fff',
                        '&:hover': { bgcolor: '#047857' },
                      }
                    : {
                        borderColor: alpha(theme.palette.grey[500], 0.24),
                        color: 'text.secondary',
                      }),
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Stack>
      </Stack>

      {/* FullCalendar Component */}
      <Box
        sx={{
          '& .fc': {
            '--fc-border-color': alpha(theme.palette.grey[500], 0.16),
            '--fc-now-indicator-color': '#10b981',
            '--fc-today-bg-color': alpha('#10b981', 0.04),
            fontFamily: theme.typography.fontFamily,
          },
          '& .fc .fc-toolbar': { display: 'none' },
          '& .fc-theme-standard th': {
            bgcolor: alpha(theme.palette.grey[500], 0.06),
            py: 1.2,
            border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
            fontWeight: 700,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            color: theme.palette.text.secondary,
          },
          '& .fc-daygrid-day-number': {
            fontSize: '0.875rem',
            fontWeight: 600,
            p: 1,
            color: theme.palette.text.primary,
          },
          '& .fc-daygrid-event': {
            borderRadius: 1,
            p: '2px 4px',
            m: '2px 4px',
            border: 'none !important',
            cursor: 'pointer',
          },
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          headerToolbar={false}
          dayMaxEvents={3}
          datesSet={(dateInfo) => {
            setTitle(dateInfo.view.title);
          }}
          eventClick={(info) => {
            const rowData = info.event.extendedProps.rawRow;
            onEventClick?.(info.event.id, rowData);
          }}
          eventContent={(eventInfo) => {
            const props = eventInfo.event.extendedProps;
            const colors = getMealColor(props.mealType);
            const isCancelled = props.status === 'Cancelled';

            return (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: isCancelled ? 'rgba(239, 68, 68, 0.12)' : colors.monthBg,
                  color: isCancelled ? '#dc2626' : colors.text,
                  borderLeft: `3px solid ${isCancelled ? '#dc2626' : colors.border}`,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Iconify icon={"solar:cup-hot-bold" as any} width={14} />
                  <span>{props.mealType || 'Meal'}</span>
                </Stack>
                <Box
                  sx={{
                    px: 0.6,
                    py: 0.1,
                    borderRadius: '4px',
                    bgcolor: isCancelled ? alpha('#dc2626', 0.15) : alpha(colors.border, 0.2),
                    fontSize: '0.7rem',
                    fontWeight: 800,
                  }}
                >
                  x{props.mealCount || 1}
                </Box>
              </Box>
            );
          }}
          height="auto"
        />
      </Box>
    </Card>
  );
}
