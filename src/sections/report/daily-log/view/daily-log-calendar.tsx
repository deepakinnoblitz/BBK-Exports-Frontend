import dayjs from 'dayjs';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRef, useMemo, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import { alpha } from '@mui/material/styles';
import { Box, Stack, Button, Tooltip, useTheme, IconButton, Typography } from '@mui/material';

import { getDoctypeList } from 'src/api/leads';
import { getHRSettings } from 'src/api/hr-management';
import { getHolidayList, populateHolidays } from 'src/api/holiday-lists';

import { Iconify } from 'src/components/iconify';


// ----------------------------------------------------------------------

function getLeaveStyle(leaveType: string) {
    const lower = (leaveType || '').toLowerCase();
    if (lower.includes('sick')) {
        return {
            bgColor: 'rgba(219, 39, 119, 0.14)',
            textColor: '#9d174d',
            borderColor: '#db2777',
        };
    }
    if (lower.includes('casual')) {
        return {
            bgColor: 'rgba(13, 148, 136, 0.14)',
            textColor: '#115e59',
            borderColor: '#0d9488',
        };
    }
    // Default for Unpaid Leave, Paid Leave, Permission, Leave, etc.
    return {
        bgColor: '#EEEDFE',
        textColor: '#26215C',
        borderColor: '#7C3AED',
    };
}

function applyHolidayStylesToCell(cellEl: HTMLElement, holidayRow: any) {
    cellEl.style.backgroundColor = 'rgba(244, 63, 94, 0.05)';
    cellEl.title = holidayRow.description || 'Holiday';

    const dayNumberEl = cellEl.querySelector('.fc-daygrid-day-number') as HTMLElement;
    if (dayNumberEl) {
        dayNumberEl.style.color = '#f43f5e';
        dayNumberEl.style.fontWeight = '700';
    }

    let holidayDesc = holidayRow.description || 'Holiday';
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

    const frameEl = cellEl.querySelector('.fc-daygrid-day-frame');
    if (frameEl) {
        // Remove existing label if present to avoid duplicates
        const existing = frameEl.querySelector('.holiday-desc-label');
        if (existing) {
            existing.remove();
        }

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
        frameEl.appendChild(descEl);
    }
}

function clearHolidayStylesFromCell(cellEl: HTMLElement) {
    cellEl.style.backgroundColor = '';
    cellEl.removeAttribute('title');
    const dayNumberEl = cellEl.querySelector('.fc-daygrid-day-number') as HTMLElement;
    if (dayNumberEl) {
        dayNumberEl.style.color = '';
        dayNumberEl.style.fontWeight = '';
    }
    const existing = cellEl.querySelector('.holiday-desc-label');
    if (existing) {
        existing.remove();
    }
}

interface DailyLogCalendarProps {
    reportData: any[];
    employee: string;
    fromDate?: any;
    toDate?: any;
    leaveApplications?: any[];
    holidays?: any[];
    onEventClick?: (session: any) => void;
    onLeaveClick?: (leave: any) => void;
}

export function DailyLogCalendar({
    reportData,
    employee,
    fromDate,
    toDate,
    leaveApplications,
    holidays: holidaysProp,
    onEventClick,
    onLeaveClick,
}: DailyLogCalendarProps) {
    const theme = useTheme();
    const calendarRef = useRef<FullCalendar>(null);

    const [title, setTitle] = useState('');
    const [activeView, setActiveView] = useState('dayGridMonth');
    const [hrmsSettings, setHrmsSettings] = useState<any>(null);
    const [holidays, setHolidays] = useState<any[]>(holidaysProp || []);

    useEffect(() => {
        if (holidaysProp && holidaysProp.length > 0) {
            setHolidays(holidaysProp);
        }
    }, [holidaysProp]);

    useEffect(() => {
        async function loadSettings() {
            try {
                const settings = await getHRSettings();
                setHrmsSettings(settings);
            } catch (error) {
                console.error('Failed to load HRMS settings:', error);
            }
        }
        loadSettings();
    }, []);

    useEffect(() => {
        if (fromDate && calendarRef.current) {
            const api = calendarRef.current.getApi();
            api.gotoDate(dayjs(fromDate).toDate());
        }
    }, [fromDate]);

    useEffect(() => {
        if (!calendarRef.current) return;
        const calendarEl = (calendarRef.current.getApi() as any).el;
        if (!calendarEl) return;

        const allDayCells = calendarEl.querySelectorAll('.fc-daygrid-day');
        allDayCells.forEach((cellEl: any) => {
            const dateStr = cellEl.getAttribute('data-date');
            if (!dateStr) return;
            const holidayRow = holidays.find(
                (h) => h.holiday_date && dayjs(h.holiday_date).format('YYYY-MM-DD') === dateStr && h.is_working_day === 0
            );
            if (holidayRow) {
                applyHolidayStylesToCell(cellEl, holidayRow);
            } else {
                clearHolidayStylesFromCell(cellEl);
            }
        });
    }, [holidays]);

    const [calendarRange, setCalendarRange] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs } | null>(() => {
        const start = fromDate || (reportData.length > 0
            ? dayjs(reportData.reduce((min: string, p: any) => p.login_date < min ? p.login_date : min, reportData[0].login_date)).startOf('month')
            : dayjs().startOf('month'));
        const end = toDate || (reportData.length > 0
            ? dayjs(reportData.reduce((max: string, p: any) => p.login_date > max ? p.login_date : max, reportData[0].login_date)).endOf('month')
            : dayjs().endOf('month'));
        return { start, end };
    });

    useEffect(() => {
        if (fromDate || toDate) {
            setCalendarRange({
                start: fromDate ? dayjs(fromDate) : dayjs().startOf('month'),
                end: toDate ? dayjs(toDate) : dayjs().endOf('month')
            });
        }
    }, [fromDate, toDate]);

    const activeHolidays = holidaysProp && holidaysProp.length > 0 ? holidaysProp : holidays;

    // Map logs, approved leaves, and absent days to calendar events
    const calendarEvents = useMemo(() => {
        const events: any[] = [];

        // 1. Map work sessions
        (reportData || []).forEach((session, index) => {
            const start = session.login_time
                ? dayjs(session.login_time).toDate()
                : dayjs(session.login_date).startOf('day').toDate();

            const end = session.logout_time
                ? dayjs(session.logout_time).toDate()
                : (session.status === 'Active' ? new Date() : dayjs(session.login_date).endOf('day').toDate());

            const loginStr = session.login_time ? dayjs(session.login_time).format('hh:mm A') : '---';
            const logoutStr = session.logout_time ? dayjs(session.logout_time).format('hh:mm A') : (session.status === 'Active' ? 'Active' : '---');
            const workHoursStr = session.total_work_hours ? `${session.total_work_hours.toFixed(2)}h` : '0.00h';

            events.push({
                id: session.name || `session-${index}`,
                title: session.status === 'Active' ? 'Active Session' : `Session (${workHoursStr})`,
                start,
                end,
                allDay: false, // timed events for timegrid vertical display
                extendedProps: {
                    status: session.status,
                    loginStr,
                    logoutStr,
                    workHoursStr,
                    rawSession: session,
                    isLeave: false,
                }
            });
        });

        // 2. Map approved leave applications for this employee
        (leaveApplications || []).forEach((leave) => {
            if (leave.employee !== employee) return;
            const isApproved = (leave.workflow_state === 'Approved' || leave.status === 'Approved');
            if (!isApproved) return;

            if (!leave.from_date || !leave.to_date) return;

            const from = dayjs(leave.from_date);
            const to = dayjs(leave.to_date);
            if (!from.isValid() || !to.isValid()) return;

            let current = from;
            while (current.isBefore(to, 'day') || current.isSame(to, 'day')) {
                const dateStr = current.format('YYYY-MM-DD');

                // Check if this date is a non-working holiday (e.g., Sunday)
                const isHoliday = activeHolidays.some(
                    (h) => h.holiday_date && dayjs(h.holiday_date).format('YYYY-MM-DD') === dateStr && h.is_working_day === 0
                );

                if (!isHoliday) {
                    const leaveType = leave.leave_type || 'Leave';
                    const isHalfDay = !!leave.half_day && (!leave.half_day_date || dayjs(leave.half_day_date).isSame(current, 'day'));
                    const leaveTitle = isHalfDay ? `${leaveType} (Half Day)` : leaveType;

                    events.push({
                        id: `leave-${leave.name || leave.id}-${dateStr}`,
                        title: leaveTitle,
                        start: dateStr,
                        allDay: true,
                        extendedProps: {
                            isLeave: true,
                            leaveType,
                            halfDay: isHalfDay,
                            leaveRecord: leave,
                            dateStr,
                        }
                    });
                }

                current = current.add(1, 'day');
            }
        });

        // 3. Map Absent events for dates in active range that have no sessions, no holidays, and no approved leave
        if (calendarRange) {
            let cur = calendarRange.start;
            const end = calendarRange.end;
            const maxDays = 366;
            let count = 0;

            while ((cur.isBefore(end, 'day') || cur.isSame(end, 'day')) && count < maxDays) {
                const dateStr = cur.format('YYYY-MM-DD');

                // Check if date has sessions
                const hasSession = (reportData || []).some(
                    (s) => s.employee === employee && s.login_date === dateStr
                );

                // Check if date is a holiday
                const isHoliday = activeHolidays.some(
                    (h) => h.holiday_date && dayjs(h.holiday_date).format('YYYY-MM-DD') === dateStr && h.is_working_day === 0
                );

                // Check if date is an approved leave
                const isLeave = (leaveApplications || []).some((l) => {
                    if (l.employee !== employee) return false;
                    const isApproved = (l.workflow_state === 'Approved' || l.status === 'Approved');
                    if (!isApproved) return false;
                    const from = dayjs(l.from_date);
                    const to = dayjs(l.to_date);
                    return (cur.isSame(from, 'day') || cur.isAfter(from, 'day')) &&
                        (cur.isSame(to, 'day') || cur.isBefore(to, 'day'));
                });

                if (!hasSession && !isHoliday && !isLeave) {
                    events.push({
                        id: `absent-${employee}-${dateStr}`,
                        title: 'Absent',
                        start: dateStr,
                        allDay: true,
                        extendedProps: {
                            isAbsent: true,
                            dateStr,
                        }
                    });
                }

                cur = cur.add(1, 'day');
                count++;
            }
        }

        return events;
    }, [reportData, leaveApplications, employee, activeHolidays, calendarRange]);

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
        <Card sx={{ p: 3, height: 860, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#f5fcfe78' }}>
            {/* Custom Header Controls matching Mockup */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                {/* Left side: Today + Current Title + Navigation Arrows */}
                <Stack direction="row" alignItems="center" spacing={2}>
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
                        bgcolor: alpha(theme.palette.grey[500], 0.06),
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
                                    bgcolor: isActive ? '#059669' : 'transparent', // Indigo/purple active style
                                    boxShadow: isActive ? `0 2px 8px ${alpha('#059669', 0.3)}` : 'none',
                                    textTransform: 'capitalize',
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
                        border: `1px solid ${alpha(theme.palette.grey[500], 0.15)} !important`,
                        borderRadius: '12px',
                        overflow: 'hidden',
                    },
                    '& .fc-col-header': {
                        border: 'none !important',
                    },
                    '& .fc-col-header-cell': {
                        border: 'none !important',
                        borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.12)} !important`,
                        bgcolor: `${theme.palette.background.neutral} !important`,
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
                    /* Make default event backgrounds transparent so our custom event cards render cleanly */
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
                    key={activeView}
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    initialView={activeView}
                    events={calendarEvents}
                    validRange={fromDate && toDate ? {
                        start: dayjs(fromDate).startOf('month').format('YYYY-MM-DD'),
                        end: dayjs(toDate).endOf('month').add(1, 'day').format('YYYY-MM-DD')
                    } : undefined}
                    dayHeaderFormat={{ weekday: 'long' }}
                    headerToolbar={false} // Hidden as we use our custom React controls
                    height="100%"
                    stickyHeaderDates
                    datesSet={async (arg) => {
                        setTitle(arg.view.title);
                        setActiveView(arg.view.type);
                        const viewDate = dayjs(arg.view.currentStart);
                        const month = viewDate.format('M');
                        const year = viewDate.format('YYYY');

                        // Keep calendarRange in sync with current view if fromDate/toDate not explicitly specified
                        if (!fromDate && !toDate) {
                            const vStart = dayjs(arg.view.currentStart);
                            const vEnd = dayjs(arg.view.currentEnd).subtract(1, 'day');
                            setCalendarRange({ start: vStart, end: vEnd });
                        }

                        try {
                            const lists = await getDoctypeList('Holiday List', ['name'], {
                                year: parseInt(year, 10),
                                month_year: month,
                            });

                            if (lists && lists.length > 0) {
                                const fullList = await getHolidayList(lists[0].name);
                                if (fullList && fullList.holidays) {
                                    setHolidays(fullList.holidays);
                                    return;
                                }
                            }

                            const res = await populateHolidays(month, year);
                            if (res && res.holidays) {
                                setHolidays(res.holidays);
                            }
                        } catch (error) {
                            console.error('Failed to fetch holidays:', error);
                        }
                    }}
                    dayCellDidMount={(arg) => {
                        const dateStr = dayjs(arg.date).format('YYYY-MM-DD');
                        const holidayRow = holidays.find(
                            (h) => h.holiday_date && dayjs(h.holiday_date).format('YYYY-MM-DD') === dateStr && h.is_working_day === 0
                        );
                        if (holidayRow) {
                            applyHolidayStylesToCell(arg.el, holidayRow);
                        } else {
                            clearHolidayStylesFromCell(arg.el);
                        }
                    }}
                    eventClick={(info) => {
                        if (info.event.extendedProps.isAbsent) {
                            return;
                        }
                        if (info.event.extendedProps.isLeave) {
                            if (onLeaveClick) {
                                onLeaveClick(info.event.extendedProps.leaveRecord);
                            }
                        } else if (onEventClick) {
                            onEventClick(info.event.extendedProps.rawSession);
                        }
                    }}
                    eventContent={(arg) => {
                        if (arg.event.extendedProps.isAbsent) {
                            if (arg.view.type === 'dayGridMonth') {
                                return (
                                    <Tooltip title="Absent" arrow>
                                        <Box
                                            sx={{
                                                width: '100%',
                                                py: 0.5,
                                                px: 1,
                                                borderRadius: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                color: '#991b1b',
                                                backgroundColor: 'rgba(239, 68, 68, 0.14)',
                                                borderLeft: '3px solid #ef4444',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                cursor: 'default',
                                                transition: (t) => t.transitions.create(['opacity', 'transform'], {
                                                    duration: t.transitions.duration.shorter,
                                                }),
                                                '&:hover': {
                                                    opacity: 0.85,
                                                }
                                            }}
                                        >
                                            Absent
                                        </Box>
                                    </Tooltip>
                                );
                            }

                            // TimeGrid Week / Day views (All-Day slot or card)
                            return (
                                <Tooltip title="Absent" arrow>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            height: '100%',
                                            width: '100%',
                                            py: 0.5,
                                            px: 1,
                                            borderRadius: '4px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: '#991b1b',
                                            backgroundColor: 'rgba(239, 68, 68, 0.14)',
                                            borderLeft: '3px solid #ef4444',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            cursor: 'default',
                                            boxSizing: 'border-box',
                                            transition: (t) => t.transitions.create(['opacity', 'transform'], {
                                                duration: t.transitions.duration.shorter,
                                            }),
                                            '&:hover': {
                                                opacity: 0.85,
                                            }
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: '0.7rem',
                                                color: '#991b1b',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            Absent
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            );
                        }

                        if (arg.event.extendedProps.isLeave) {
                            const leaveType = arg.event.extendedProps.leaveType || 'Leave';
                            const isHalfDay = arg.event.extendedProps.halfDay;
                            const displayText = isHalfDay ? `${leaveType} (Half Day)` : leaveType;
                            const style = getLeaveStyle(leaveType);

                            if (arg.view.type === 'dayGridMonth') {
                                return (
                                    <Tooltip title={displayText} arrow>
                                        <Box
                                            sx={{
                                                width: '100%',
                                                py: 0.5,
                                                px: 1,
                                                borderRadius: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                color: style.textColor,
                                                backgroundColor: style.bgColor,
                                                borderLeft: `3px solid ${style.borderColor}`,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                cursor: 'pointer',
                                                transition: (t) => t.transitions.create(['opacity', 'transform'], {
                                                    duration: t.transitions.duration.shorter,
                                                }),
                                                '&:hover': {
                                                    opacity: 0.85,
                                                }
                                            }}
                                        >
                                            {displayText}
                                        </Box>
                                    </Tooltip>
                                );
                            }

                            // TimeGrid Week / Day views (All-Day slot or card)
                            return (
                                <Tooltip title={displayText} arrow>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            height: '100%',
                                            width: '100%',
                                            py: 0.5,
                                            px: 1,
                                            borderRadius: '4px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: style.textColor,
                                            backgroundColor: style.bgColor,
                                            borderLeft: `3px solid ${style.borderColor}`,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            cursor: 'pointer',
                                            boxSizing: 'border-box',
                                            transition: (t) => t.transitions.create(['opacity', 'transform'], {
                                                duration: t.transitions.duration.shorter,
                                            }),
                                            '&:hover': {
                                                opacity: 0.85,
                                            }
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: '0.7rem',
                                                color: style.textColor,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {displayText}
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            );
                        }

                        const status = arg.event.extendedProps.status;
                        const workHours = arg.event.extendedProps.rawSession?.total_work_hours || 0;

                        // Load thresholds from HRMS Settings (Salary Slip -> Daily Log Thresholds)
                        const presentThreshold = hrmsSettings?.salary_slip_present_threshold != null && hrmsSettings?.salary_slip_present_threshold !== ''
                            ? Number(hrmsSettings.salary_slip_present_threshold)
                            : (Number(hrmsSettings?.present_threshold) || 5.0);
                        const halfDayThreshold = hrmsSettings?.salary_slip_half_day_threshold != null && hrmsSettings?.salary_slip_half_day_threshold !== ''
                            ? Number(hrmsSettings.salary_slip_half_day_threshold)
                            : (Number(hrmsSettings?.half_day_threshold) || 3.0);

                        let borderColor = '#22c55e'; // Green (Present)
                        let bgColor = 'rgba(34, 197, 94, 0.08)';
                        let textColor = '#15803d';
                        let monthBgColor = 'rgba(34, 197, 94, 0.14)';

                        if (status !== 'Active') {
                            if (workHours >= presentThreshold) {
                                borderColor = '#22c55e';
                                bgColor = 'rgba(34, 197, 94, 0.08)';
                                textColor = '#15803d';
                                monthBgColor = 'rgba(34, 197, 94, 0.14)';
                            } else if (workHours >= halfDayThreshold) {
                                borderColor = '#f97316';
                                bgColor = 'rgba(249, 115, 22, 0.08)';
                                textColor = '#c2410c';
                                monthBgColor = 'rgba(249, 115, 22, 0.14)';
                            } else {
                                borderColor = '#ef4444';
                                bgColor = 'rgba(239, 68, 68, 0.08)';
                                textColor = '#c5221f';
                                monthBgColor = 'rgba(239, 68, 68, 0.14)';
                            }
                        }

                        const loginStr = arg.event.extendedProps.loginStr;
                        const logoutStr = arg.event.extendedProps.logoutStr;
                        const workHoursStr = arg.event.extendedProps.workHoursStr;

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
                                        color: textColor,
                                        backgroundColor: monthBgColor,
                                        borderLeft: `3px solid ${borderColor}`,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {loginStr} - {logoutStr} ({workHoursStr})
                                </Box>
                            );
                        }

                        // TimeGrid Week/Day Views: Beautiful cards matching Mockup
                        return (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    height: '100%',
                                    width: '100%',
                                    p: 1.25,
                                    borderLeft: `4px solid ${borderColor}`,
                                    backgroundColor: bgColor,
                                    borderRadius: '6px',
                                    boxSizing: 'border-box',
                                    transition: theme.transitions.create(['box-shadow', 'filter'], {
                                        duration: theme.transitions.duration.shorter,
                                    }),
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    '&:hover': {
                                        boxShadow: `0 4px 12px ${alpha(borderColor, 0.15)}`,
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
                                    {status === 'Active' ? 'Active Session' : `Session (${workHoursStr})`}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        color: textColor,
                                        mt: 0.5,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {loginStr} - {logoutStr}
                                </Typography>
                            </Box>
                        );
                    }}
                />
            </Box>
        </Card>
    );
}
