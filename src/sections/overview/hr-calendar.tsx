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
    }[];
    onDateChange?: (date: Date) => void;
};

export function HRCalendar({ title, subheader, events, onDateChange, ...other }: Props) {
    const theme = useTheme();
    const calendarRef = useRef<HTMLDivElement>(null);
    const fullCalendarRef = useRef<FullCalendar>(null);
    const [calendarTitle, setCalendarTitle] = useState('');
    const [activeView, setActiveView] = useState('dayGridMonth');

    const applyHolidayStyle = (cellEl: HTMLElement, holidayTitle: string) => {
        cellEl.style.backgroundColor = alpha(theme.palette.error.main, 0.05);
        cellEl.style.removeProperty('box-shadow');
        cellEl.style.removeProperty('border');

        const dayNumber = cellEl.querySelector('.fc-daygrid-day-number') as HTMLElement | null;
        if (dayNumber) {
            dayNumber.style.color = theme.palette.error.main;
            dayNumber.style.fontWeight = '700';
        }

        const frameEl = cellEl.querySelector('.fc-daygrid-day-frame');
        if (frameEl) {
            const existing = frameEl.querySelector('.holiday-desc-label');
            if (existing) {
                existing.remove();
            }

            const descEl = document.createElement('div');
            descEl.className = 'holiday-desc-label';
            descEl.innerText = holidayTitle;
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
    };

    const clearHolidayStyle = (cellEl: HTMLElement) => {
        cellEl.style.backgroundColor = '';
        cellEl.style.removeProperty('box-shadow');
        cellEl.style.removeProperty('border');
        const dayNumber = cellEl.querySelector('.fc-daygrid-day-number') as HTMLElement | null;
        if (dayNumber) {
            dayNumber.style.removeProperty('color');
            dayNumber.style.removeProperty('font-weight');
        }
        const existing = cellEl.querySelector('.holiday-desc-label');
        if (existing) {
            existing.remove();
        }
    };

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
                applyHolidayStyle(cell as HTMLElement, event.title);
            }
        });
    }, [events, theme.palette.error.main]);

    return (
        <Card
            {...other}
            sx={{
                background: alpha(theme.palette.background.paper, 0.9),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                borderRadius: 3,
                boxShadow: `0 8px 24px ${alpha(theme.palette.grey[500], 0.12)}`,
                overflow: 'hidden',
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
                    p: 3,
                    '& .fc': {
                        '--fc-border-color': alpha(theme.palette.grey[500], 0.12),
                        '--fc-today-bg-color': alpha(theme.palette.primary.main, 0.08),
                        '--fc-page-bg-color': 'transparent',
                        '--fc-neutral-bg-color': alpha(theme.palette.grey[500], 0.04),
                        '--fc-list-event-hover-bg-color': alpha(theme.palette.primary.lighter, 0.5),
                        fontFamily: theme.typography.fontFamily,
                    },
                    '& .fc .fc-toolbar-title': {
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: theme.palette.text.primary,
                        letterSpacing: -0.5,
                        textTransform: 'capitalize',
                    },
                    '& .fc .fc-toolbar.fc-header-toolbar': {
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(20px)',
                        p: 2,
                        mx: -3,
                        mt: -3,
                        mb: 3,
                        borderRadius: '16px 16px 0 0',
                        boxShadow: `0 2px 8px ${alpha(theme.palette.grey[500], 0.08)}`,
                    },
                    '& .fc .fc-button': {
                        bgcolor: alpha(theme.palette.grey[500], 0.08),
                        border: 'none',
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        textTransform: 'capitalize',
                        borderRadius: '10px',
                        px: 2,
                        py: 1,
                        transition: 'all 0.2s ease-in-out',
                        boxShadow: 'none',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            color: theme.palette.primary.main,
                            transform: 'translateY(-1px)',
                            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                        },
                        '&:focus': {
                            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
                        },
                        '&:disabled': {
                            opacity: 0.4,
                            cursor: 'not-allowed',
                        },
                    },
                    '& .fc .fc-button-primary:not(:disabled).fc-button-active': {
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                        '&:hover': {
                            bgcolor: theme.palette.primary.dark,
                            transform: 'translateY(-1px)',
                        },
                    },
                    '& .fc .fc-button-group': {
                        gap: 0.5,
                    },
                    '& .fc .fc-daygrid-day': {
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                        },
                    },
                    '& .fc .fc-daygrid-day-number': {
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        padding: '8px',
                    },
                    '& .fc .fc-daygrid-day.fc-day-today': {
                        bgcolor: COMMON_COLORS.emerald.lighter,
                        '& .fc-daygrid-day-number': {
                            bgcolor: COMMON_COLORS.emerald.main,
                            color: '#fff',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                        },
                    },
                    '& .fc .fc-col-header-cell': {
                        bgcolor: COMMON_COLORS.emerald.main,
                        borderBottom: `2px solid ${COMMON_COLORS.emerald.dark}`,
                        py: 1.5,
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
                        color: '#ffffffff', // Neutral professional color
                        padding: '10px 8px',
                        display: 'inline-block',
                    },
                    '& .fc .fc-daygrid-day-frame': {
                        minHeight: 120,
                        padding: '4px',
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
                    '& .fc .fc-list': {
                        borderRadius: '12px',
                        overflow: 'hidden',
                    },
                    '& .fc .fc-list-day-cushion': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        py: 1.5,
                    },
                    '& .fc .fc-list-event': {
                        borderRadius: '8px',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            transform: 'translateX(4px)',
                            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`,
                        },
                        '&:hover td': {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                        },
                    },
                    '& .fc .fc-list-event-dot': {
                        borderColor: theme.palette.primary.main,
                        borderWidth: 3,
                    },
                    '& .fc-theme-standard td, & .fc-theme-standard th': {
                        borderColor: alpha(theme.palette.grey[500], 0.38),
                    },
                    '& .fc-scrollgrid': {
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: `0 1px 3px ${alpha(theme.palette.grey[500], 0.08)}`,
                        border: '1px solid rgb(0 0 0 / 12%);',
                    },
                }}
            >
                {/* Custom Header Controls matching Report Calendar Style */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                    {/* Left side: Today Button */}
                    <Stack direction="row" alignItems="center" spacing={1}>
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
                    </Stack>

                    {/* Center: Prev Arrow + Title + Next Arrow */}
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

                    {/* Right side: Month / Week / List Switcher */}
                    <Box
                        sx={{
                            display: 'inline-flex',
                            bgcolor: alpha(theme.palette.grey[500], 0.06),
                            p: 0.5,
                            borderRadius: '24px',
                            border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
                        }}
                    >
                        {[
                            { value: 'dayGridMonth', label: 'Month' },
                            { value: 'dayGridWeek', label: 'Week' },
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

                <FullCalendar
                    ref={fullCalendarRef}
                    plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    events={events}
                    headerToolbar={false}
                    height={800}
                    stickyHeaderDates
                    eventColor={theme.palette.primary.main}
                    eventTextColor={theme.palette.primary.contrastText}
                    displayEventTime={false}
                    dayHeaderFormat={{ weekday: 'long' }}
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
                            applyHolidayStyle(arg.el, event.title);
                        } else {
                            clearHolidayStyle(arg.el);
                        }
                    }}
                    eventContent={() => null}
                />
            </Box>
        </Card >
    );
}
