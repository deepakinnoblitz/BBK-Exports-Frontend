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

import { TaskManager } from 'src/api/task-manager';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface TaskReportCalendarProps {
    reportData: TaskManager[];
    employee: string[];
    fromDate?: any;
    toDate?: any;
    onEventClick?: (task: TaskManager) => void;
}

export function TaskReportCalendar({ reportData, employee, fromDate, toDate, onEventClick }: TaskReportCalendarProps) {
    const theme = useTheme();
    const calendarRef = useRef<FullCalendar>(null);

    const [title, setTitle] = useState('');
    const [activeView, setActiveView] = useState('dayGridMonth');
    const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

    useEffect(() => {
        if (fromDate && calendarRef.current) {
            const api = calendarRef.current.getApi();
            api.gotoDate(dayjs(fromDate).toDate());
        }
    }, [fromDate]);

    // Helper to get status / overdue based colors for tasks
    const getTaskColors = (task: TaskManager) => {
        const isOverdue = task.status !== 'Completed' && task.due_date && dayjs(task.due_date).isBefore(dayjs().startOf('day'));
        
        if (isOverdue) {
            return {
                border: '#ef4444',
                bg: 'rgba(239, 68, 68, 0.08)',
                text: '#c5221f',
                monthBg: 'rgba(239, 68, 68, 0.14)'
            };
        }
        switch (task.status) {
            case 'Completed':
                return {
                    border: '#22c55e',
                    bg: 'rgba(34, 197, 94, 0.08)',
                    text: '#15803d',
                    monthBg: 'rgba(34, 197, 94, 0.14)'
                };
            case 'In Progress':
                return {
                    border: '#0ea5e9',
                    bg: 'rgba(14, 165, 233, 0.08)',
                    text: '#0369a1',
                    monthBg: 'rgba(14, 165, 233, 0.14)'
                };
            case 'On Hold':
                return {
                    border: '#f97316',
                    bg: 'rgba(249, 115, 22, 0.08)',
                    text: '#c2410c',
                    monthBg: 'rgba(249, 115, 22, 0.14)'
                };
            case 'Open':
            case 'Reopened':
            default:
                return {
                    border: '#94a3b8',
                    bg: 'rgba(148, 163, 184, 0.08)',
                    text: '#475569',
                    monthBg: 'rgba(148, 163, 184, 0.14)'
                };
        }
    };

    // Map tasks to calendar events spanning from creation date to due date
    const calendarEvents = reportData.map((task, index) => {
        const start = dayjs(task.creation).format('YYYY-MM-DD');
        
        const endDateVal = task.due_date ? dayjs(task.due_date) : dayjs(task.creation);
        const resolvedEnd = endDateVal.isBefore(dayjs(task.creation), 'day') ? dayjs(task.creation) : endDateVal;
        const end = resolvedEnd.add(1, 'day').format('YYYY-MM-DD');

        const assigneesList = task.assignees?.map(a => a.employee_name).join(', ') || '';
        const priorityPrefix = task.priority ? `[${task.priority}] ` : '';

        // If employee list does not filter to exactly one employee, show assignee names
        const showAssignees = employee.length !== 1 && assigneesList;
        const eventTitle = showAssignees
            ? `${priorityPrefix}${task.title} (${assigneesList})`
            : `${priorityPrefix}${task.title}`;

        return {
            id: task.name || index.toString(),
            title: eventTitle,
            start,
            end,
            allDay: true,
            extendedProps: {
                task,
                colors: getTaskColors(task),
                assigneesList,
                showAssignees,
                isDimmed: hoveredTaskId !== null && hoveredTaskId !== task.name,
                isHovered: hoveredTaskId === task.name
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
                    datesSet={(arg) => {
                        setTitle(arg.view.title);
                        setActiveView(arg.view.type);
                    }}
                    eventClick={(info) => {
                        if (onEventClick) {
                            onEventClick(info.event.extendedProps.task);
                        }
                    }}
                    eventContent={(arg) => {
                        const { task, colors, assigneesList, showAssignees, isDimmed, isHovered } = arg.event.extendedProps;
                        const isOverdue = task.status !== 'Completed' && task.due_date && dayjs(task.due_date).isBefore(dayjs().startOf('day'));
                        const displayStatus = isOverdue ? 'Overdue' : task.status;

                        if (arg.view.type === 'dayGridMonth') {
                            // Month View: Compact horizontal strip
                            return (
                                <Box
                                    onMouseEnter={() => setHoveredTaskId(task.name)}
                                    onMouseLeave={() => setHoveredTaskId(null)}
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
                                        opacity: isDimmed ? 0.35 : 1,
                                        transition: 'all 0.2s ease-in-out',
                                        transform: isHovered ? 'scale(1.015)' : 'none',
                                        boxShadow: isHovered ? `0 2px 6px ${alpha(colors.border, 0.3)}` : 'none',
                                        zIndex: isHovered ? 10 : 1,
                                    }}
                                >
                                    {arg.event.title}
                                </Box>
                            );
                        }

                        // TimeGrid Week/Day Views: Beautiful cards
                        return (
                            <Box
                                onMouseEnter={() => setHoveredTaskId(task.name)}
                                onMouseLeave={() => setHoveredTaskId(null)}
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
                                    transition: theme.transitions.create(['box-shadow', 'filter', 'opacity', 'transform'], {
                                        duration: theme.transitions.duration.shorter,
                                    }),
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    opacity: isDimmed ? 0.35 : 1,
                                    transform: isHovered ? 'scale(1.02)' : 'none',
                                    boxShadow: isHovered ? `0 4px 12px ${alpha(colors.border, 0.3)}` : 'none',
                                    zIndex: isHovered ? 10 : 1,
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
                                    {task.title}
                                </Typography>
                                
                                {showAssignees && (
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
                                        Assignees: {assigneesList}
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
                                        {displayStatus}
                                    </Box>
                                    {task.priority && (
                                        <Box
                                            sx={{
                                                py: 0.25,
                                                px: 0.75,
                                                borderRadius: '4px',
                                                fontSize: '0.625rem',
                                                fontWeight: 700,
                                                color: 'text.primary',
                                                bgcolor: alpha(theme.palette.grey[500], 0.16),
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {task.priority}
                                        </Box>
                                    )}
                                </Stack>
                            </Box>
                        );
                    }}
                />
            </Box>
        </Card>
    );
}
