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

interface LineCalendarProps {
  reportData: any[];
  employee: string;
  fromDate?: any;
  toDate?: any;
  onEventClick?: (record: any) => void;
}

const LINE_PALETTE: Record<string, { border: string; bg: string; text: string; monthBg: string }> = {
  cutting: {
    border: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    text: '#047857',
    monthBg: 'rgba(16, 185, 129, 0.14)',
  },
  stitching: {
    border: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.08)',
    text: '#4338ca',
    monthBg: 'rgba(99, 102, 241, 0.14)',
  },
  assembly: {
    border: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    text: '#b45309',
    monthBg: 'rgba(245, 158, 11, 0.14)',
  },
  packing: {
    border: '#0ea5e9',
    bg: 'rgba(14, 165, 233, 0.08)',
    text: '#0369a1',
    monthBg: 'rgba(14, 165, 233, 0.14)',
  },
  ironing: {
    border: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.08)',
    text: '#be185d',
    monthBg: 'rgba(236, 72, 153, 0.14)',
  },
  finishing: {
    border: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.08)',
    text: '#6d28d9',
    monthBg: 'rgba(139, 92, 246, 0.14)',
  },
  weeklyoff: {
    border: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.08)',
    text: '#6d28d9',
    monthBg: 'rgba(139, 92, 246, 0.14)',
  },
  holiday: {
    border: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.08)',
    text: '#be123c',
    monthBg: 'rgba(244, 63, 94, 0.14)',
  },
};

function getLineColors(lineName: string, status?: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('holiday')) return LINE_PALETTE.holiday;
  if (s.includes('off') || s.includes('weekly')) return LINE_PALETTE.weeklyoff;

  const name = (lineName || '').toLowerCase();
  if (name.includes('cut')) return LINE_PALETTE.cutting;
  if (name.includes('stitch') || name.includes('strich')) return LINE_PALETTE.stitching;
  if (name.includes('assembly')) return LINE_PALETTE.assembly;
  if (name.includes('pack')) return LINE_PALETTE.packing;
  if (name.includes('iron')) return LINE_PALETTE.ironing;
  if (name.includes('finish')) return LINE_PALETTE.finishing;

  return {
    border: '#059669',
    bg: 'rgba(5, 150, 105, 0.08)',
    text: '#047857',
    monthBg: 'rgba(5, 150, 105, 0.14)',
  };
}

export function LineCalendar({ reportData, employee, fromDate, toDate, onEventClick }: LineCalendarProps) {
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

  // Map line rows to calendar events
  const calendarEvents = reportData.map((row, index) => {
    const start = row.line_date ? dayjs(row.line_date).toDate() : new Date();
    const end = row.line_date ? dayjs(row.line_date).toDate() : new Date();
    const lineDisplayName = row.line_name || row.line_order || (row.status === 'Weekly Off' ? 'Weekly Off' : 'Line');

    return {
      id: row.name || `line_${index}`,
      title: employee === 'all' ? `${row.employee_name} - ${lineDisplayName}` : lineDisplayName,
      start,
      end,
      allDay: true,
      extendedProps: {
        lineName: row.line_name || row.line_order,
        lineOrder: row.line_order,
        status: row.status,
        source: row.source,
        assignmentType: row.assignment_type,
        employeeName: row.employee_name,
        employeeId: row.employee,
        department: row.department,
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
        height: 860,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5fcfe78',
        borderRadius: 2,
        border: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      {/* Custom Header Controls */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        {/* Left side: Today + Navigation Arrows + Title */}
        <Stack direction="row" alignItems="center" spacing={2.5}>
          <Button
            variant="outlined"
            onClick={handleToday}
            sx={{
              borderRadius: '8px',
              color: 'text.primary',
              borderColor: alpha(theme.palette.grey[500], 0.2),
              bgcolor: alpha(theme.palette.grey[500], 0.04),
              textTransform: 'capitalize',
              fontWeight: 600,
              px: 2,
              py: 0.75,
              '&:hover': {
                bgcolor: alpha(theme.palette.grey[500], 0.08),
              },
            }}
          >
            Today
          </Button>

          <Stack direction="row" alignItems="center" spacing={1.5}>
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
              <Iconify icon="solar:alt-arrow-left-bold" width={16} />
            </IconButton>

            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: -0.5, minWidth: 160, textAlign: 'center' }}
            >
              {title}
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
              <Iconify icon="solar:alt-arrow-right-bold" width={16} />
            </IconButton>
          </Stack>
        </Stack>

        {/* Right side: Day / Week / Month Tab Switcher */}
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
                  bgcolor: isActive ? '#059669' : 'transparent',
                  boxShadow: isActive ? `0 2px 8px ${alpha('#059669', 0.3)}` : 'none',
                  textTransform: 'capitalize',
                  transition: theme.transitions.create(['background-color', 'color', 'box-shadow'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                  '&:hover': {
                    bgcolor: isActive ? '#059669' : alpha(theme.palette.grey[500], 0.08),
                  },
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>
      </Stack>

      <Box
        sx={{
          flexGrow: 1,
          height: '100%',
          '& .fc': {
            '--fc-border-color': alpha(theme.palette.grey[500], 0.16),
            '--fc-today-bg-color': alpha(theme.palette.primary.main, 0.04),
            fontFamily: theme.typography.fontFamily,
            height: '100%',
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
            bgcolor: '#059669 !important',
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
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          validRange={
            fromDate && toDate
              ? {
                  start: dayjs(fromDate).startOf('month').format('YYYY-MM-DD'),
                  end: dayjs(toDate).endOf('month').add(1, 'day').format('YYYY-MM-DD'),
                }
              : undefined
          }
          dayHeaderFormat={{ weekday: 'long' }}
          headerToolbar={false}
          height="100%"
          stickyHeaderDates
          displayEventTime={false}
          datesSet={(arg) => {
            setTitle(arg.view.title);
            setActiveView(arg.view.type);
          }}
          eventClick={(info) => {
            if (onEventClick) {
              onEventClick(info.event.extendedProps.rawRow);
            }
          }}
          eventContent={(arg) => {
            const lineName = arg.event.extendedProps.lineName || arg.event.title;
            const status = arg.event.extendedProps.status;
            const employeeName = arg.event.extendedProps.employeeName;

            const colors = getLineColors(lineName, status);
            const displayTitle = employee === 'all' ? `${employeeName}: ${lineName}` : lineName;

            if (arg.view.type === 'dayGridMonth') {
              return (
                <Box
                  sx={{
                    width: '100%',
                    py: 0.5,
                    px: 1,
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: colors.text,
                    backgroundColor: colors.monthBg,
                    borderLeft: `3px solid ${colors.border}`,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayTitle}
                </Box>
              );
            }

            // TimeGrid Week/Day Views
            return (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  width: '100%',
                  p: 1.25,
                  borderLeft: `4px solid ${colors.border}`,
                  backgroundColor: colors.bg,
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  transition: theme.transitions.create(['box-shadow', 'filter'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                  cursor: 'pointer',
                  overflow: 'hidden',
                  '&:hover': {
                    boxShadow: `0 4px 12px ${alpha(colors.border, 0.15)}`,
                    filter: 'brightness(0.96)',
                  },
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: '#1e293b',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {displayTitle}
                </Typography>
              </Box>
            );
          }}
        />
      </Box>
    </Card>
  );
}
