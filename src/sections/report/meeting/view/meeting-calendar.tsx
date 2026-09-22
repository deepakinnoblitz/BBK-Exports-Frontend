import dayjs from 'dayjs';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useRef, useState, useEffect } from 'react';
import interactionPlugin from '@fullcalendar/interaction';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Card, Stack, Button, IconButton, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface MeetingCalendarProps {
    reportData: any[];
    owner: string;
    fromDate?: any;
    toDate?: any;
    onEventClick?: (meetingId: string) => void;
}

export function MeetingCalendar({ reportData, owner, fromDate, toDate, onEventClick }: MeetingCalendarProps) {
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

    // Map meetings to calendar events
    const calendarEvents = reportData
        .filter(meet => owner === 'all' || meet.owner_name === owner || meet.owner === owner)
        .map((meet, index) => {
            const start = meet.from_time
                ? dayjs(meet.from_time).toDate()
                : meet.from
                ? dayjs(meet.from).toDate()
                : dayjs(meet.creation).toDate();

            const end = meet.to_time
                ? dayjs(meet.to_time).toDate()
                : meet.to
                ? dayjs(meet.to).toDate()
                : dayjs(start).add(30, 'minute').toDate();

            const timeStr = meet.from_time 
                ? dayjs(meet.from_time).format('hh:mm A') 
                : meet.from 
                ? dayjs(meet.from).format('hh:mm A') 
                : '---';

            return {
                id: meet.name || index.toString(),
                title: meet.title || 'Meeting',
                start,
                end,
                allDay: false,
                extendedProps: {
                    status: meet.outgoing_call_status,
                    timeStr,
                    rawMeet: meet
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

    const getStatusColors = (status: string) => {
        switch (status) {
            case 'Completed':
                return {
                    borderColor: theme.palette.success.main,
                    bgColor: alpha(theme.palette.success.main, 0.08),
                    textColor: theme.palette.success.dark,
                    monthBgColor: alpha(theme.palette.success.main, 0.16)
                };
            case 'Scheduled':
                return {
                    borderColor: theme.palette.info.main,
                    bgColor: alpha(theme.palette.info.main, 0.08),
                    textColor: theme.palette.info.dark,
                    monthBgColor: alpha(theme.palette.info.main, 0.16)
                };
            case 'Overdue':
                return {
                    borderColor: theme.palette.error.main,
                    bgColor: alpha(theme.palette.error.main, 0.08),
                    textColor: theme.palette.error.dark,
                    monthBgColor: alpha(theme.palette.error.main, 0.16)
                };
            case 'Cancelled':
                return {
                    borderColor: theme.palette.warning.main,
                    bgColor: alpha(theme.palette.warning.main, 0.08),
                    textColor: theme.palette.warning.dark,
                    monthBgColor: alpha(theme.palette.warning.main, 0.16)
                };
            default:
                return {
                    borderColor: theme.palette.grey[500],
                    bgColor: alpha(theme.palette.grey[500], 0.08),
                    textColor: theme.palette.text.secondary,
                    monthBgColor: alpha(theme.palette.grey[500], 0.16)
                };
        }
    };

    return (
        <Card sx={{ p: 3, height: 860, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#f5fcfe78' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
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

                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: -0.5, minWidth: 180, textAlign: 'center' }}>
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
                                    bgcolor: isActive ? '#059669' : 'transparent',
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
                            onEventClick(info.event.id);
                        }
                    }}
                    eventContent={(arg) => {
                        const status = arg.event.extendedProps.status;
                        const colors = getStatusColors(status);

                        const timeStr = arg.event.extendedProps.timeStr;
                        const titleVal = arg.event.title;

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
                                        color: colors.textColor,
                                        backgroundColor: colors.monthBgColor,
                                        borderLeft: `3px solid ${colors.borderColor}`,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {timeStr} {titleVal}
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
                                    p: 1.25,
                                    borderLeft: `4px solid ${colors.borderColor}`,
                                    backgroundColor: colors.bgColor,
                                    borderRadius: '6px',
                                    boxSizing: 'border-box',
                                    transition: theme.transitions.create(['box-shadow', 'filter'], {
                                        duration: theme.transitions.duration.shorter,
                                    }),
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    '&:hover': {
                                        boxShadow: `0 4px 12px ${alpha(colors.borderColor, 0.15)}`,
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
                                    {titleVal}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        color: colors.textColor,
                                        mt: 0.5,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {timeStr} ({status})
                                </Typography>
                            </Box>
                        );
                    }}
                />
            </Box>
        </Card>
    );
}
