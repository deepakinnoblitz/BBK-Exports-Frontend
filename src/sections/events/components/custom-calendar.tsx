import dayjs from 'dayjs';
import { LuFilter } from 'react-icons/lu';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import React, { useRef, useState, useEffect } from 'react';
import { FiCalendar, FiPhoneCall, FiChevronLeft, FiCheckSquare, FiChevronRight } from 'react-icons/fi';

import { Box, Button, Typography, IconButton, CircularProgress } from '@mui/material';

import { getEventType, getEventStatus, getEventChipColor } from '../utils/event-color';


interface CustomCalendarProps {
    events: any[];
    loading?: boolean;
    onEventClick?: (event: any, el?: HTMLElement, jsEvent?: any) => void;
    onDateSelect?: (selectInfo: any) => void;
    onEventDrop?: (dropInfo: any) => void;
    onEventResize?: (resizeInfo: any) => void;
    selectedDate?: dayjs.Dayjs;
    onDateChange?: (date: dayjs.Dayjs) => void;
    eventTypeFilter?: string;
    onFilterChange?: (filter: string) => void;
    calendarKey?: number | string;
}

export function CustomCalendar({
    events,
    loading = false,
    onEventClick,
    onDateSelect,
    onEventDrop,
    onEventResize,
    selectedDate,
    onDateChange,
    eventTypeFilter = 'All',
    onFilterChange,
    calendarKey,
}: CustomCalendarProps) {
    const calendarRef = useRef<FullCalendar>(null);
    const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listMonth'>('dayGridMonth');
    const [title, setTitle] = useState('');

    useEffect(() => {
        if (calendarRef.current) {
            const api = calendarRef.current.getApi();
            setTitle(api.view.title);
        }
    }, [currentView, calendarKey]);

    useEffect(() => {
        if (selectedDate && calendarRef.current) {
            const api = calendarRef.current.getApi();
            api.gotoDate(selectedDate.toDate());
            setTitle(api.view.title);
        }
    }, [selectedDate, calendarKey]);

    const handlePrev = () => {
        if (calendarRef.current) {
            const api = calendarRef.current.getApi();
            api.prev();
            setTitle(api.view.title);
            if (onDateChange) onDateChange(dayjs(api.getDate()));
        }
    };

    const handleNext = () => {
        if (calendarRef.current) {
            const api = calendarRef.current.getApi();
            api.next();
            setTitle(api.view.title);
            if (onDateChange) onDateChange(dayjs(api.getDate()));
        }
    };

    const handleToday = () => {
        if (calendarRef.current) {
            const api = calendarRef.current.getApi();
            api.today();
            setTitle(api.view.title);
            if (onDateChange) onDateChange(dayjs());
        }
    };

    const handleViewChange = (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listMonth') => {
        setCurrentView(view);
        if (calendarRef.current) {
            const api = calendarRef.current.getApi();
            api.changeView(view);
            setTitle(api.view.title);
        }
    };

    // Format events for FullCalendar
    const formattedEvents = events.map((event) => {
        const type = getEventType(event);
        const status = getEventStatus(event);
        const backgroundColor = getEventChipColor(type, status, event.color);

        const subjectLower = (event.subject || '').toLowerCase();
        let iconType: 'call' | 'meeting' | 'todo' | 'other' = 'other';

        if (type === 'Call' || type === 'Calls' || subjectLower.includes('call')) {
            iconType = 'call';
        } else if (type === 'Meeting' || subjectLower.includes('meeting')) {
            iconType = 'meeting';
        } else if (type === 'ToDo' || type === 'Todo' || type === 'To-do' || subjectLower.includes('todo') || subjectLower.includes('to-do')) {
            iconType = 'todo';
        }

        const realDocName = event.realDocName || event.originalEventName || event.docname || event.id || event.name;
        const displayTitle = event.title || event.subject || event.name;

        return {
            id: String(realDocName),
            title: displayTitle,
            start: event.starts_on || event.start,
            end: event.ends_on || event.end,
            backgroundColor,
            borderColor: backgroundColor,
            textColor: '#ffffff',
            extendedProps: {
                ...event,
                realDocName,
                iconType,
                chipColor: backgroundColor,
            },
        };
    });

    const renderEventContent = (eventInfo: any) => {
        const iconType = eventInfo.event.extendedProps.iconType;
        const chipColor = eventInfo.event.backgroundColor || eventInfo.event.extendedProps?.chipColor || '#F5A623';

        let IconComp = null;
        if (iconType === 'call') IconComp = <FiPhoneCall size={13} style={{ marginRight: 6, flexShrink: 0, color: '#ffffff' }} />;
        else if (iconType === 'meeting') IconComp = <FiCalendar size={13} style={{ marginRight: 6, flexShrink: 0, color: '#ffffff' }} />;
        else if (iconType === 'todo') IconComp = <FiCheckSquare size={13} style={{ marginRight: 6, flexShrink: 0, color: '#ffffff' }} />;

        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: '10px',
                    py: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    width: '100%',
                    borderRadius: '6px',
                    bgcolor: chipColor,
                    color: '#ffffff',
                    boxSizing: 'border-box',
                }}
            >
                {IconComp}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#ffffff', minWidth: 0, flex: 1 }}>
                    {eventInfo.event.title}
                </span>
            </Box>
        );
    };

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', position: 'relative' }}>
            {/* Top Toolbar matching Bryntum Layout */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2.5,
                    py: 2,
                    bgcolor: '#FFFFFF', // Clean white background
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px',
                    borderBottom: '1px solid #E2E8F0',
                    height: 72,
                    boxSizing: 'border-box',
                }}
            >
                {/* Left controls: Today button, < >, Title */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Button
                        variant="contained"
                        size="medium"
                        onClick={handleToday}
                        startIcon={<FiCalendar size={20} style={{ color: '#0F172A' }} />}
                        sx={{
                            borderRadius: '10px',
                            bgcolor: '#FFFFFF',
                            color: '#0F172A',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            px: 2.25,
                            py: 0.8,
                        }}
                    >
                        Today
                    </Button>
                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                        <IconButton
                            size="small"
                            onClick={handlePrev}
                            sx={{ color: '#334155', p: 0.5 }}
                        >
                            <FiChevronLeft size={24} />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={handleNext}
                            sx={{ color: '#334155', p: 0.5 }}
                        >
                            <FiChevronRight size={24} />
                        </IconButton>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, ml: 1, color: '#1E293B', fontSize: '1.55rem' }}>
                        {title}
                    </Typography>
                </Box>

                {/* Right controls: View switchers & Event type filter pills */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, flexWrap: 'nowrap' }}>
                    {/* Event Type Filter Pills */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 0.45,
                            bgcolor: '#F4F6F8',
                            border: '1px solid #E5E7EB',
                            borderRadius: '999px',
                            gap: 0.35,
                        }}
                    >
                        {[
                            { label: 'All', icon: <LuFilter size={14.5} /> },
                            { label: 'Calls', icon: <FiPhoneCall size={14.5} /> },
                            { label: 'Meetings', icon: <FiCalendar size={14.5} /> },
                            { label: 'To-Do', icon: <FiCheckSquare size={14.5} /> },
                        ].map((item) => (
                            <Box
                                key={item.label}
                                onClick={() => onFilterChange && onFilterChange(item.label)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.65,
                                    px: 1.9,
                                    py: 0.45,
                                    borderRadius: '999px',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s ease',
                                    bgcolor: eventTypeFilter === item.label ? '#12A8D6' : 'transparent',
                                    color: eventTypeFilter === item.label ? '#fff' : '#637381',
                                    boxShadow: eventTypeFilter === item.label ? '0 3px 10px rgba(18,168,214,0.25)' : 'none',
                                    '&:hover': {
                                        bgcolor: eventTypeFilter === item.label ? '#12A8D6' : 'rgba(18,168,214,0.08)',
                                    },
                                }}
                            >
                                {item.icon}
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontSize: '0.8rem',
                                        fontWeight: eventTypeFilter === item.label ? 700 : 600,
                                    }}
                                >
                                    {item.label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* View Switcher Buttons */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 0.45,
                            bgcolor: '#F4F6F8',
                            border: '1px solid #E5E7EB',
                            borderRadius: '999px',
                            gap: 0.35,
                        }}
                    >
                        {[
                            { label: 'Day', view: 'timeGridDay' },
                            { label: 'Week', view: 'timeGridWeek' },
                            { label: 'Month', view: 'dayGridMonth' },
                            { label: 'Agenda', view: 'listMonth' },
                        ].map((item) => (
                            <Box
                                key={item.label}
                                onClick={() => handleViewChange(item.view as any)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    px: 2.15,
                                    py: 0.45,
                                    borderRadius: '999px',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s ease',
                                    bgcolor: currentView === item.view ? '#105782' : 'transparent',
                                    color: currentView === item.view ? '#fff' : '#637381',
                                    boxShadow: currentView === item.view ? '0 3px 10px rgba(16,87,130,0.25)' : 'none',
                                    '&:hover': {
                                        bgcolor: currentView === item.view ? '#105782' : 'rgba(16,87,130,0.08)',
                                    },
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: currentView === item.view ? 700 : 600,
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {item.label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* Calendar Container */}
            <Box
                sx={{
                    flex: 1,
                    p: 0,
                    pl: '290px', // grid starts after 290px sidebar
                    position: 'relative',
                    overflow: 'visible',
                    '& .fc': {
                        height: '100%',
                        fontFamily: 'inherit',
                    },
                    '& .fc-header-toolbar': {
                        display: 'none',
                    },
                    '& .fc-theme-standard, & .fc-scrollgrid': {
                        border: 'none !important',
                    },
                    '& .fc-theme-standard td, & .fc-theme-standard th': {
                        borderColor: '#E2E8F0',
                    },
                    '& .fc-col-header-cell': {
                        py: 1.75, // Increased height
                        bgcolor: '#FAFAFA',
                        color: '#303538', // Default Blue color for MON, TUE, WED, THU, FRI, SAT
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        borderTop: 'none !important',
                        borderLeft: 'none !important',
                        borderRight: 'none !important',
                    },
                    '& .fc-col-header-cell.fc-day-sun': {
                        color: '#E11D48', // Red color for SUN only
                    },
                    '& .fc-daygrid-day-number': {
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        p: 1,
                    },
                    '& .fc-day-today': {
                        backgroundColor: '#F0F9FF !important',
                    },
                    '& .fc-day-today .fc-daygrid-day-number': {
                        color: '#0284C7',
                        fontWeight: 700,
                    },
                    '& .fc-event': {
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: 'none',
                        bgcolor: 'transparent !important',
                        p: 0,
                        mb: '4px',
                        transition: 'transform 0.15s ease',
                        '&:hover': {
                            transform: 'translateY(-1px)',
                        },
                    },
                    '& .fc-daygrid-event-harness': {
                        mb: '4px',
                    },
                    '& .fc-h-event, & .fc-v-event': {
                        bgcolor: 'transparent !important',
                        border: 'none !important',
                    },
                    '& .fc-daygrid-more-link': {
                        color: '#637381',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        textDecoration: 'none',
                        mt: 0.5,
                        display: 'block',
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                            color: '#105782',
                            textDecoration: 'underline',
                        },
                    },
                    '& .fc-popover, & .fc-more-popover': {
                        borderRadius: '12px !important',
                        border: '1px solid #E2E8F0 !important',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1) !important',
                        overflow: 'hidden !important',
                        zIndex: '999999 !important',
                        minWidth: '220px !important',
                        maxWidth: '290px !important',
                        bgcolor: '#FFFFFF !important',
                    },
                    '& .fc-popover-header': {
                        bgcolor: '#F8FAFC !important',
                        p: '8px 12px !important',
                        fontWeight: '700 !important',
                        color: '#1E293B !important',
                        fontSize: '0.85rem !important',
                        borderBottom: '1px solid #E2E8F0 !important',
                    },
                    '& .fc-popover-body': {
                        p: '8px !important',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        boxSizing: 'border-box !important',
                        width: '100% !important',
                        '& .fc-daygrid-event-harness': {
                            width: '100% !important',
                            mb: '6px',
                        },
                    },
                }}
            >
                {loading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(2px)',
                            zIndex: 99,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <CircularProgress color="info" size={44} thickness={4} />
                    </Box>
                )}

                <FullCalendar
                    key={calendarKey}
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView={currentView}
                    initialDate={selectedDate ? selectedDate.toDate() : undefined}
                    headerToolbar={false}
                    events={formattedEvents}
                    dayMaxEvents={2}
                    editable
                    selectable
                    eventContent={renderEventContent}
                    eventClick={(info) => {
                        if (onEventClick) {
                            onEventClick(info.event.extendedProps, info.el, info.jsEvent);
                        }
                    }}
                    select={(selectInfo) => {
                        if (onDateSelect) {
                            onDateSelect(selectInfo);
                        }
                    }}
                    eventDrop={(dropInfo) => {
                        if (onEventDrop) {
                            onEventDrop(dropInfo);
                        }
                    }}
                    eventResize={(resizeInfo) => {
                        if (onEventResize) {
                            onEventResize(resizeInfo);
                        }
                    }}
                />

                {loading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: 'rgba(255, 255, 255, 0.65)',
                            backdropFilter: 'blur(2px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                        }}
                    >
                        <CircularProgress size={36} sx={{ color: '#105782' }} />
                    </Box>
                )}
            </Box>
        </Box>
    );
}
