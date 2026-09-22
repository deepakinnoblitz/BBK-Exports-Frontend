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

import { getDoctypeList } from 'src/api/leads';
import { getHolidayList, populateHolidays } from 'src/api/holiday-lists';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

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

// ----------------------------------------------------------------------

interface TimesheetReportCalendarProps {
    reportData: any[];
    fromDate?: any;
    toDate?: any;
    onEventClick?: (name: string) => void;
}

export function TimesheetReportCalendar({ reportData, fromDate, toDate, onEventClick }: TimesheetReportCalendarProps) {
    const theme = useTheme();
    const calendarRef = useRef<FullCalendar>(null);

    const [title, setTitle] = useState('');
    const [activeView, setActiveView] = useState('dayGridMonth');
    const [holidays, setHolidays] = useState<any[]>([]);

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

    useEffect(() => {
        if (fromDate && calendarRef.current) {
            const api = calendarRef.current.getApi();
            api.gotoDate(dayjs(fromDate).toDate());
        }
    }, [fromDate]);

    // Helper to get color config based on logged hours
    const getHoursColors = (hours: number) => {
        if (hours >= 8) {
            return {
                border: '#22c55e',
                bg: 'rgba(34, 197, 94, 0.08)',
                text: '#15803d',
                monthBg: 'rgba(34, 197, 94, 0.14)'
            };
        }
        if (hours >= 4) {
            return {
                border: '#f97316',
                bg: 'rgba(249, 115, 22, 0.08)',
                text: '#c2410c',
                monthBg: 'rgba(249, 115, 22, 0.14)'
            };
        }
        return {
            border: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.08)',
            text: '#c5221f',
            monthBg: 'rgba(239, 68, 68, 0.14)'
        };
    };

    // Filter out total row and map entries to calendar events
    const timesheetData = reportData.filter(d => d.timesheet_date !== 'TOTAL');

    // Compute total hours per timesheet (grouped by name/date) to determine color
    const timesheetTotals: Record<string, number> = {};
    timesheetData.forEach((row) => {
        const key = row.name || row.timesheet_date || 'unknown';
        timesheetTotals[key] = (timesheetTotals[key] || 0) + (row.hours || 0);
    });

    const calendarEvents = timesheetData.map((row, index) => {
        const start = row.timesheet_date ? dayjs(row.timesheet_date).toDate() : new Date();
        const end = row.timesheet_date ? dayjs(row.timesheet_date).toDate() : new Date();
        const uniqueId = `${row.name || row.employee || 'timesheet'}-${index}`;
        const hours = row.hours || 0;
        const groupId = row.name || row.employee || 'unknown';
        const totalHoursForGroup = timesheetTotals[row.name || row.timesheet_date || 'unknown'] || hours;

        return {
            id: uniqueId,
            title: `${row.activity_type || 'Timesheet'} (${hours} hrs)`,
            start,
            end,
            allDay: true,
            extendedProps: {
                row,
                colors: getHoursColors(totalHoursForGroup),
                groupId
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

    return (
        <Card sx={{ p: 3, display: 'flex', flexDirection: 'column', backgroundColor: '#f5fcfe78' }}>
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
                    '& .fc-scroller::-webkit-scrollbar': {
                        display: 'none !important',
                    },
                    '& .fc-scroller': {
                        msOverflowStyle: 'none !important',
                        scrollbarWidth: 'none !important',
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
                    '& .fc-daygrid-more-link': {
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        color: `${theme.palette.info.main} !important`,
                        textDecoration: 'none !important',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: alpha(theme.palette.info.main, 0.08),
                        display: 'inline-block',
                        marginTop: '2px',
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.info.main, 0.16),
                        }
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
                    dayMaxEvents={3}
                    validRange={fromDate && toDate ? {
                        start: dayjs(fromDate).startOf('month').format('YYYY-MM-DD'),
                        end: dayjs(toDate).endOf('month').add(1, 'day').format('YYYY-MM-DD')
                    } : undefined}
                    dayHeaderFormat={{ weekday: 'long' }}
                    headerToolbar={false}
                    height="auto"
                    stickyHeaderDates
                    displayEventTime={false}
                    datesSet={async (arg) => {
                        setTitle(arg.view.title);
                        setActiveView(arg.view.type);
                        const viewDate = dayjs(arg.view.currentStart);
                        const month = viewDate.format('M');
                        const year = viewDate.format('YYYY');
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
                        if (onEventClick) {
                            onEventClick(info.event.extendedProps.row.name);
                        }
                    }}
                    eventContent={(arg) => {
                        const { row, colors, groupId } = arg.event.extendedProps;

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
                                        transition: 'all 0.2s ease-in-out',
                                    }}
                                >
                                    {arg.event.title}
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
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    '&:hover': {
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
                                    {row.activity_type}
                                </Typography>

                                {row.project && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                            color: 'text.secondary',
                                            mt: 0.5,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        Project: {row.project}
                                    </Typography>
                                )}

                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                                    <Box
                                        sx={{
                                            py: 0.25,
                                            px: 0.75,
                                            borderRadius: '4px',
                                            fontSize: '0.625rem',
                                            fontWeight: 700,
                                            color: colors.text,
                                            bgcolor: colors.monthBg,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {row.hours} Hrs
                                    </Box>
                                </Stack>
                            </Box>
                        );
                    }}
                />
            </Box>
        </Card>
    );
}
