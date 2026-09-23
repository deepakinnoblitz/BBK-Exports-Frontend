import type { CardProps } from '@mui/material/Card';

import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { useRef, useState, useEffect } from 'react';
import interactionPlugin from '@fullcalendar/interaction';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import { alpha, useTheme } from '@mui/material/styles';
import { Box, Stack, Button, IconButton, Typography } from '@mui/material';

import { COMMON_COLORS } from 'src/theme';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
    title?: string;
    subheader?: string;
    events: {
        title: string;
        start: string;
        color?: string;
        textColor?: string;
        backgroundColor?: string;
    }[];
    onDateChange?: (date: Date) => void;
};

const shouldShowRedDayNumber = (title?: string) => {
    const status = title?.trim().toLowerCase() || '';

    return status === 'absent' || status === 'holiday' || status.includes('leave') || status.includes('permission');
};

const isHoliday = (title?: string) => {
    if (!title) return false;
    const status = title.trim().toLowerCase();
    const attendanceStatuses = [
        'present',
        'absent',
        'offline',
        'on leave',
        'leave',
        'half day',
        'unmarked',
        'not marked',
        'available',
        'missing'
    ];
    if (attendanceStatuses.includes(status) || status.includes('leave') || status.includes('permission')) {
        return false;
    }
    return true;
};

export function EmployeeCalendar({ title, subheader, events, onDateChange, ...other }: Props) {
    const theme = useTheme();
    const calendarRef = useRef<HTMLDivElement>(null);
    const fullCalendarRef = useRef<FullCalendar>(null);
    const [calendarTitle, setCalendarTitle] = useState('');
    const [activeView, setActiveView] = useState('dayGridMonth');

    const handleToday = () => {
        fullCalendarRef.current?.getApi().today();
    };

    const handlePrev = () => {
        fullCalendarRef.current?.getApi().prev();
    };

    const handleNext = () => {
        fullCalendarRef.current?.getApi().next();
    };

    const handleChangeView = (viewName: string) => {
        fullCalendarRef.current?.getApi().changeView(viewName);
        setActiveView(viewName);
    };

    useEffect(() => {
        if (!calendarRef.current || !events.length) return;

        // Apply colors to existing cells when events update
        events.forEach((event) => {
            const cell = calendarRef.current?.querySelector(`td[data-date="${event.start}"]`);
            if (cell) {
                const isHolidayCell = isHoliday(event.title);

                if (isHolidayCell) {
                    (cell as HTMLElement).style.backgroundColor = alpha(theme.palette.error.main, 0.08);
                    (cell as HTMLElement).style.removeProperty('box-shadow');
                    (cell as HTMLElement).style.removeProperty('border');
                } else if (event.color) {
                    (cell as HTMLElement).style.backgroundColor = 'transparent';
                    (cell as HTMLElement).style.boxShadow = `inset 0 0 0px 1px ${alpha(event.color, 0.44)}`;
                    (cell as HTMLElement).style.border = 'none';
                }

                const dayNumber = cell?.querySelector('.fc-daygrid-day-number') as HTMLElement | null;
                if (dayNumber) {
                    if (isHolidayCell || shouldShowRedDayNumber(event.title)) {
                        dayNumber.style.color = theme.palette.error.main;
                    } else {
                        dayNumber.style.removeProperty('color');
                    }
                }
            }
        });
    }, [events, theme.palette.error.main]);

    return (
        <Card
            {...other}
            sx={{
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                ...other.sx,
            }}
        >
            <CardHeader
                title={title}
                subheader={subheader}
                sx={{
                    mb: 2,
                    '& .MuiTypography-root': {
                        fontWeight: 'bold',
                    },
                }}
            />

            <Box
                ref={calendarRef}
                sx={{
                    p: 2,
                    '& .fc': {
                        '--fc-border-color': 'rgb(117 117 117 / 23%)',
                        '--fc-today-bg-color': alpha(theme.palette.primary.main, 0.04),
                        '--fc-list-event-hover-bg-color': alpha(theme.palette.primary.lighter, 0.4),
                        fontFamily: theme.typography.fontFamily,
                    },
                    '& .fc .fc-toolbar-title': {
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: theme.palette.text.primary,
                        letterSpacing: -0.5,
                    },
                    '& .fc .fc-toolbar.fc-header-toolbar': {
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                        p: 1.5,
                        mx: -2,
                        mt: -2,
                        mb: 2,
                        borderRadius: '12px 12px 0 0',
                    },
                    '& .fc .fc-button': {
                        bgcolor: alpha(theme.palette.grey[500], 0.08),
                        border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
                        color: theme.palette.text.secondary,
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        borderRadius: '10px',
                        px: 1.5,
                        transition: theme.transitions.create(['background-color', 'color', 'border-color'], {
                            duration: theme.transitions.duration.shorter,
                        }),
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            borderColor: alpha(theme.palette.primary.main, 0.32),
                            color: theme.palette.primary.main,
                        },
                        '&:active, &:focus, &:focus-visible': {
                            boxShadow: 'none !important',
                            outline: 'none !important',
                        },
                        '&:disabled': {
                            bgcolor: alpha(theme.palette.grey[500], 0.05),
                            borderColor: alpha(theme.palette.grey[500], 0.08),
                            color: theme.palette.text.disabled,
                        },
                    },
                    '& .fc .fc-button-primary:not(:disabled).fc-button-active': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        fontWeight: 800,
                        boxShadow: 'none !important',
                        border: 'none !important',
                    },
                    '& .fc .fc-daygrid-day-number': {
                        color: theme.palette.text.secondary,
                        fontWeight: 600,
                        fontSize: '.9rem',
                        p: 1.5,
                        zIndex: 1,
                    },
                    '& .fc .fc-col-header-cell': {
                        bgcolor: COMMON_COLORS.emerald.main,
                        borderBottom: `2px solid ${COMMON_COLORS.emerald.dark}`,
                        py: 1,
                        '&:first-of-type': {
                            borderTopLeftRadius: 12,
                        },
                        '&:last-of-type': {
                            borderTopRightRadius: 12,
                        },
                    },
                    '& .fc .fc-col-header-cell-cushion': {
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: '#ffffff',
                        padding: '7px 8px',
                        display: 'inline-block',
                    },
                    '& .fc .fc-scrollgrid': {
                        border: `1px solid ${alpha(theme.palette.grey[500], 0.32)}`,
                        borderRadius: 1.5,
                        overflow: 'hidden',
                    },
                    '& .fc .fc-theme-standard td, & .fc .fc-theme-standard th': {
                        borderColor: alpha(theme.palette.grey[500], 0.15),
                    },
                    '& .fc .fc-event': {
                        backgroundColor: 'transparent !important',
                        borderColor: 'transparent !important',
                        boxShadow: 'none !important',
                        cursor: 'default',
                        '&:hover': {
                            backgroundColor: 'transparent !important',
                        }
                    },
                    '& .fc .fc-daygrid-day-frame': {
                        minHeight: { xs: 55, sm: 80 },
                        padding: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                    '& .fc .fc-daygrid-day-top': {
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                    },
                    '& .fc .fc-daygrid-day-events': {
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        margin: 0,
                        padding: 0,
                    },
                    '& .fc .fc-daygrid-event-harness': {
                        width: '100%',
                    },
                    '& .fc .fc-day-today': {
                        '& .fc-daygrid-day-number': {
                            color: theme.palette.primary.main,
                            fontWeight: 800,
                            fontSize: '1rem',
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            m: 0.5,
                        },
                    },
                }}
            >
                {/* Custom Header Controls matching Report Calendar Style */}
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={{ xs: 1.5, sm: 2 }}
                    sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}
                >
                    {/* Left side: Today Button & Navigation */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: { xs: '100%', sm: 'auto' } }}>
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
                                height: 32,
                                fontSize: '0.825rem',
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                                }
                            }}
                        >
                            Today
                        </Button>

                        {/* Right side switcher (on mobile top row) */}
                        <Box
                            sx={{
                                display: { xs: 'inline-flex', sm: 'none' },
                                bgcolor: alpha(theme.palette.grey[500], 0.06),
                                p: 0.5,
                                borderRadius: '24px',
                                border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
                            }}
                        >
                            {[
                                { value: 'dayGridMonth', label: 'Month' },
                                { value: 'listMonth', label: 'List' }
                            ].map((tab) => {
                                const isActive = activeView === tab.value;
                                return (
                                    <Button
                                        key={tab.value}
                                        onClick={() => handleChangeView(tab.value)}
                                        sx={{
                                            borderRadius: '20px',
                                            px: 1.5,
                                            height: 28,
                                            fontSize: '0.75rem',
                                            fontWeight: isActive ? 700 : 600,
                                            color: isActive ? '#fff' : theme.palette.text.secondary,
                                            bgcolor: isActive ? COMMON_COLORS.emerald.main : 'transparent',
                                            boxShadow: isActive ? `0 2px 8px ${alpha(COMMON_COLORS.emerald.main, 0.3)}` : 'none',
                                            textTransform: 'capitalize',
                                            transition: theme.transitions.create(['background-color', 'color', 'box-shadow'], {
                                                duration: theme.transitions.duration.shorter,
                                            }),
                                            '&:hover': {
                                                bgcolor: isActive ? COMMON_COLORS.emerald.dark : alpha(theme.palette.grey[500], 0.08),
                                            }
                                        }}
                                    >
                                        {tab.label}
                                    </Button>
                                );
                            })}
                        </Box>
                    </Stack>

                    {/* Center: Prev Arrow + Title + Next Arrow */}
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
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
                                flexShrink: 0,
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

                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                color: 'text.primary',
                                letterSpacing: -0.5,
                                fontSize: { xs: '1.05rem', sm: '1.25rem' },
                                textAlign: 'center',
                                px: 1,
                            }}
                        >
                            {calendarTitle}
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
                                flexShrink: 0,
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

                    {/* Right side: Month / List Switcher (Desktop) */}
                    <Box
                        sx={{
                            display: { xs: 'none', sm: 'inline-flex' },
                            bgcolor: alpha(theme.palette.grey[500], 0.06),
                            p: 0.5,
                            borderRadius: '24px',
                            border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
                        }}
                    >
                        {[
                            { value: 'dayGridMonth', label: 'Month' },
                            { value: 'listMonth', label: 'List' }
                        ].map((tab) => {
                            const isActive = activeView === tab.value;
                            return (
                                <Button
                                    key={tab.value}
                                    onClick={() => handleChangeView(tab.value)}
                                    sx={{
                                        borderRadius: '20px',
                                        px: 2.5,
                                        height: 30,
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

                <FullCalendar
                    ref={fullCalendarRef}
                    plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    events={events}
                    headerToolbar={false}
                    height="auto"
                    stickyHeaderDates
                    displayEventTime={false}
                    datesSet={(arg) => {
                        setCalendarTitle(arg.view.title);
                        if (onDateChange) {
                            onDateChange(arg.view.currentStart);
                        }
                    }}
                    dayCellDidMount={(arg) => {
                        const date = arg.date;
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;

                        const event = events.find((e) => e.start === dateStr);
                        if (event) {
                            const isHolidayCell = isHoliday(event.title);

                            if (isHolidayCell) {
                                arg.el.style.backgroundColor = alpha(theme.palette.error.main, 0.08);
                                arg.el.style.removeProperty('box-shadow');
                                arg.el.style.removeProperty('border');
                            } else if (event.color) {
                                arg.el.style.backgroundColor = 'transparent';
                                arg.el.style.boxShadow = `inset 0 0 12px 2px ${alpha(event.color, 0.24)}`;
                                arg.el.style.border = 'none';
                            }

                            const dayNumber = arg.el.querySelector('.fc-daygrid-day-number') as HTMLElement | null;
                            if (dayNumber && (isHolidayCell || shouldShowRedDayNumber(event?.title))) {
                                dayNumber.style.color = theme.palette.error.main;
                            }
                        }
                    }}
                    eventContent={(arg) => (
                        <Box sx={{
                            color: arg.event.backgroundColor,
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            whiteSpace: 'normal',
                            lineHeight: 1.2,
                            width: '100%',
                            wordBreak: 'break-word',
                            px: 0.5
                        }}>
                            {arg.event.title}
                        </Box>
                    )}
                />
            </Box>
        </Card>
    );
}
