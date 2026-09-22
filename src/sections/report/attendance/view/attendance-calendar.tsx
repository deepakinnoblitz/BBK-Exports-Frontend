import dayjs from 'dayjs';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useRef, useState, useEffect } from 'react';
import interactionPlugin from '@fullcalendar/interaction';

import Card from '@mui/material/Card';
import { alpha } from '@mui/material/styles';
import { Box, Stack, Button, Typography, IconButton, useTheme } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

function formatWorkingHours(hoursStr: string): string {
    if (!hoursStr || hoursStr === '---' || hoursStr === '00:00' || hoursStr === '0:00' || hoursStr === '0') {
        return '';
    }

    // Check if format is HH:MM (e.g. 9:12 or 09:12)
    if (hoursStr.includes(':')) {
        const parts = hoursStr.split(':');
        const hrs = parseInt(parts[0], 10);
        const mins = parseInt(parts[1], 10);

        if (!isNaN(hrs) && !isNaN(mins)) {
            const hrsStr = hrs === 1 ? '1 hr' : `${hrs} hrs`;
            const minsStr = mins === 1 ? '1 min' : `${mins} mins`;

            if (hrs > 0 && mins > 0) {
                return `${hrsStr} and ${minsStr}`;
            } else if (hrs > 0) {
                return hrsStr;
            } else if (mins > 0) {
                return minsStr;
            }
        }
    }

    // Check if format is decimal (e.g. 9.5 or 8.2)
    const decimalVal = parseFloat(hoursStr);
    if (!isNaN(decimalVal) && decimalVal > 0) {
        const hrs = Math.floor(decimalVal);
        const mins = Math.round((decimalVal - hrs) * 60);

        const hrsStr = hrs === 1 ? '1 hr' : `${hrs} hrs`;
        const minsStr = mins === 1 ? '1 min' : `${mins} mins`;

        if (hrs > 0 && mins > 0) {
            return `${hrsStr} and ${minsStr}`;
        } else if (hrs > 0) {
            return hrsStr;
        } else if (mins > 0) {
            return minsStr;
        }
    }

    return hoursStr;
}

// ----------------------------------------------------------------------

interface AttendanceCalendarProps {
    reportData: any[];
    employee: string;
    fromDate?: any;
    toDate?: any;
    onEventClick?: (name: string) => void;
}

export function AttendanceCalendar({ reportData, employee, fromDate, toDate, onEventClick }: AttendanceCalendarProps) {
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

    // Map attendance rows to calendar events (excluding holidays to keep UI clean and style-only)
    const calendarEvents = reportData
        .filter(row => !row.status?.toLowerCase().includes('holiday'))
        .map((row, index) => {
            // Attendance represents a full day record
            const start = row.attendance_date ? dayjs(row.attendance_date).toDate() : new Date();
            const end = row.attendance_date ? dayjs(row.attendance_date).toDate() : new Date();

            return {
                id: row.name || index.toString(),
                title: employee === 'all' ? `${row.employee_name} - ${row.status}` : `${row.status}`,
                start,
                end,
                allDay: true,
                extendedProps: {
                    status: row.status,
                    inTime: row.in_time || '---',
                    outTime: row.out_time || '---',
                    workingHours: row.working_hours_display || '---',
                    employeeName: row.employee_name,
                    employeeId: row.employee,
                    rawRow: row
                }
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

    // Helper to get status colors
    const getStatusColorConfig = (status: string) => {
        switch (status) {
            case 'Present':
                return {
                    border: '#22c55e',
                    bg: 'rgba(34, 197, 94, 0.08)',
                    text: '#15803d',
                    monthBg: 'rgba(34, 197, 94, 0.14)'
                };
            case 'Half Day':
                return {
                    border: '#f97316',
                    bg: 'rgba(249, 115, 22, 0.08)',
                    text: '#c2410c',
                    monthBg: 'rgba(249, 115, 22, 0.14)'
                };
            case 'On Leave':
                return {
                    border: '#0ea5e9',
                    bg: 'rgba(14, 165, 233, 0.08)',
                    text: '#0369a1',
                    monthBg: 'rgba(14, 165, 233, 0.14)'
                };
            case 'Holiday':
                return {
                    border: '#6366f1',
                    bg: 'rgba(99, 102, 241, 0.08)',
                    text: '#4f46e5',
                    monthBg: 'rgba(99, 102, 241, 0.14)'
                };
            case 'Absent':
                return {
                    border: '#ef4444',
                    bg: 'rgba(239, 68, 68, 0.08)',
                    text: '#c5221f',
                    monthBg: 'rgba(239, 68, 68, 0.14)'
                };
            default: // Missing or others
                return {
                    border: '#94a3b8',
                    bg: 'rgba(148, 163, 184, 0.08)',
                    text: '#475569',
                    monthBg: 'rgba(148, 163, 184, 0.14)'
                };
        }
    };

    return (
        <Card sx={{ p: 3, height: 860, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#f5fcfe78' }}>
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
                            }
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
                                }
                            }}
                        >
                            <Iconify icon="solar:alt-arrow-left-bold" width={16} />
                        </IconButton>

                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: -0.5, minWidth: 160, textAlign: 'center' }}>
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
                                }
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
                        { value: 'dayGridMonth', label: 'Month' }
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
                                    }
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
                        backgroundColor: '#ededed3d'
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
                        }
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
                    validRange={fromDate && toDate ? {
                        start: dayjs(fromDate).startOf('month').format('YYYY-MM-DD'),
                        end: dayjs(toDate).endOf('month').add(1, 'day').format('YYYY-MM-DD')
                    } : undefined}
                    dayHeaderFormat={{ weekday: 'long' }}
                    headerToolbar={false}
                    height="100%"
                    stickyHeaderDates
                    displayEventTime={false}
                    datesSet={(arg) => {
                        setTitle(arg.view.title);
                        setActiveView(arg.view.type);
                    }}
                    dayCellDidMount={(arg) => {
                        const dateStr = dayjs(arg.date).format('YYYY-MM-DD');
                        const holidayRow = reportData.find(
                            (row) => row.attendance_date && dayjs(row.attendance_date).format('YYYY-MM-DD') === dateStr && row.status?.toLowerCase().includes('holiday')
                        );
                        if (holidayRow) {
                            arg.el.style.backgroundColor = 'rgba(244, 63, 94, 0.05)'; // soft rose/pink bg for holiday
                            arg.el.title = holidayRow.status; // Tooltip showing holiday name on hover
                            const dayNumberEl = arg.el.querySelector('.fc-daygrid-day-number');
                            if (dayNumberEl) {
                                (dayNumberEl as HTMLElement).style.color = '#f43f5e'; // red text for holiday date number
                                (dayNumberEl as HTMLElement).style.fontWeight = '700';
                            }

                            let holidayDesc = holidayRow.status;

                            if (holidayRow.status === 'Holiday' && holidayRow.working_hours_display && holidayRow.working_hours_display !== '---') {
                                holidayDesc = holidayRow.working_hours_display;
                            }

                            const match = holidayDesc.match(/\(([^)]+)\)/);
                            if (match) {
                                holidayDesc = match[1];
                            }

                            holidayDesc = holidayDesc
                                .replace(/^holiday\s*/gi, '')
                                .replace(/\s*holiday$/gi, '')
                                .replace(/^\s*-\s*/, '')
                                .trim();

                            if (!holidayDesc) {
                                holidayDesc = 'Holiday';
                            }

                            const existing = arg.el.querySelector('.holiday-desc-label');
                            if (!existing) {
                                const descEl = document.createElement('div');
                                descEl.className = 'holiday-desc-label';
                                descEl.innerText = holidayDesc;
                                descEl.style.fontSize = '0.675rem';
                                descEl.style.fontWeight = '700';
                                descEl.style.color = '#be123c';
                                descEl.style.textAlign = 'center';
                                descEl.style.padding = '4px 6px';
                                descEl.style.borderRadius = '6px';
                                descEl.style.whiteSpace = 'nowrap';
                                descEl.style.overflow = 'hidden';
                                descEl.style.textOverflow = 'ellipsis';
                                descEl.style.width = 'calc(100% - 12px)';
                                descEl.style.margin = '8px auto 0 auto';

                                const frameEl = arg.el.querySelector('.fc-daygrid-day-frame');
                                if (frameEl) {
                                    frameEl.appendChild(descEl);
                                }
                            }
                        }
                    }}
                    eventClick={(info) => {
                        if (onEventClick && info.event.extendedProps.status !== 'Holiday') {
                            onEventClick(info.event.id);
                        }
                    }}
                    eventContent={(arg) => {
                        const status = arg.event.extendedProps.status;
                        const inTime = arg.event.extendedProps.inTime;
                        const outTime = arg.event.extendedProps.outTime;
                        const workingHours = arg.event.extendedProps.workingHours;
                        const employeeName = arg.event.extendedProps.employeeName;

                        const colors = getStatusColorConfig(status);
                        const formattedHours = formatWorkingHours(workingHours);

                        const displayTitle = employee === 'all'
                            ? `${employeeName}: ${status}`
                            : (formattedHours ? `${status} (${formattedHours})` : status);

                        const timegridDisplayTitle = employee === 'all'
                            ? `${employeeName} - ${status}`
                            : (formattedHours ? `${status} (${formattedHours})` : status);

                        if (arg.view.type === 'dayGridMonth') {
                            // Month View: Compact horizontal strip
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

                        // TimeGrid Week/Day Views: Beautiful cards
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
                                    cursor: status === 'Holiday' ? 'default' : 'pointer',
                                    overflow: 'hidden',
                                    '&:hover': status === 'Holiday' ? {} : {
                                        boxShadow: `0 4px 12px ${alpha(colors.border, 0.15)}`,
                                        filter: 'brightness(0.96)',
                                    }
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
                                    {timegridDisplayTitle}
                                </Typography>
                                {status !== 'Holiday' && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                            color: colors.text,
                                            mt: 0.5,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {inTime} - {outTime}
                                    </Typography>
                                )}
                            </Box>
                        );
                    }}
                />
            </Box>
        </Card>
    );
}
