
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

import { LuFilter } from "react-icons/lu";
import { useNavigate, useLocation } from 'react-router-dom';
import { FiPhoneCall, FiCalendar, FiCheckSquare } from 'react-icons/fi';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Box, Card, Grid, Stack, Alert, Button, Snackbar, IconButton, Typography, CircularProgress, Popover, Divider, InputAdornment, Badge } from '@mui/material';

import { stripHtml } from 'src/utils/string';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';
import { getToDo, deleteToDo, type ToDo } from 'src/api/todo';
import { getCall, deleteCall, type Call } from 'src/api/calls';
import { getMeeting, deleteMeeting, type Meeting } from 'src/api/meetings';
import { fetchEvents, updateEvent, createEvent, deleteEvent, type CalendarEvent } from 'src/api/events';

import { Loader } from 'src/components/loader';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import TodoDialog from 'src/sections/todo/todo-dialog';
import CallDialog from 'src/sections/calls/call-dialog';
import MeetingDialog from 'src/sections/meetings/meeting-dialog';
import { EventDetailsDialog } from 'src/sections/events/event-details-dialog';

import { useAuth } from 'src/auth/auth-context';

import { CustomCalendar } from '../components/custom-calendar';
import { getEventChipColor, getEventStatus, getEventType } from '../utils/event-color';
// ----------------------------------------------------------------------

const INITIAL_EVENT_STATE: Partial<CalendarEvent> = {
    subject: '',
    description: '',
    event_category: 'Event',
    event_type: 'Private',
    starts_on: '',
    ends_on: '',
    status: 'Open',
};

const getLocalDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes(' ') || dateStr.includes('T')) {
        return dayjs.utc(dateStr).local().format('YYYY-MM-DD');
    }
    return dayjs(dateStr).format('YYYY-MM-DD');
};

let isCalendarInitialized = false;

export function EventsView() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.events;
    const canCreateEvent = hasCustomPerms ? !!user?.permissions?.actions?.events?.create : true;
    const canEditEvent = hasCustomPerms ? !!user?.permissions?.actions?.events?.edit : true;
    const canDeleteEvent = hasCustomPerms ? !!user?.permissions?.actions?.events?.delete : true;

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!isCalendarInitialized);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [eventData, setEventData] = useState<Partial<CalendarEvent>>(INITIAL_EVENT_STATE);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Event Type Selection Dialog
    const [openTypeDialog, setOpenTypeDialog] = useState(false);
    const [openCallDialog, setOpenCallDialog] = useState(false);
    const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
    const [openTodoDialog, setOpenTodoDialog] = useState(false);
    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
    const [selectedDetailsEvent, setSelectedDetailsEvent] = useState<CalendarEvent | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedCallDoc, setSelectedCallDoc] = useState<Call | null>(null);
    const [selectedMeetingDoc, setSelectedMeetingDoc] = useState<Meeting | null>(null);
    const [selectedTodoDoc, setSelectedTodoDoc] = useState<ToDo | null>(null);

    const location = useLocation();
    const [popoverAnchorEl, setPopoverAnchorEl] = useState<HTMLElement | null>(null);
    const [clickedEvent, setClickedEvent] = useState<CalendarEvent | null>(null);
    const [miniCalDate, setMiniCalDate] = useState<any>(dayjs());
    const [eventTypeFilter, setEventTypeFilter] = useState<string>('All');
    const [calendarKey, setCalendarKey] = useState(0);

    const [restoreNavState, setRestoreNavState] = useState<{
        openContactId?: string | null;
        activeTab?: string;
        openEventDetails?: boolean;
        eventId: string | null;
        eventRefType: string | null;
        eventRefName: string | null;
    } | null>(null);

    useEffect(() => {
        let navState: any = null;
        if (location.state?.openContactId || location.state?.openEventDetails || location.state?.eventId) {
            navState = location.state;
        } else {
            const saved = sessionStorage.getItem('calendar_nav_state');
            if (saved) {
                try {
                    navState = JSON.parse(saved);
                } catch (e) {
                    // ignore
                }
            }
        }

        if (navState && (navState.openContactId || navState.openEventDetails || navState.eventId)) {
            sessionStorage.removeItem('calendar_nav_state');
            window.history.replaceState({}, document.title);

            setRestoreNavState({
                openContactId: navState.openContactId || null,
                activeTab: navState.activeTab || 'deals',
                openEventDetails: Boolean(navState.openEventDetails),
                eventId: navState.eventId || null,
                eventRefType: navState.eventRefType || null,
                eventRefName: navState.eventRefName || null,
            });

            const targetEvent = {
                name: navState.eventId || null,
                reference_doctype: navState.eventRefType || null,
                reference_docname: navState.eventRefName || null,
            } as any;

            setSelectedDetailsEvent(targetEvent);
            setClickedEvent(targetEvent);
            setOpenDetailsDialog(true);
        }
    }, [location.state]);

    useEffect(() => {
        if (restoreNavState?.eventId && events.length > 0) {
            const foundEvent = events.find((e) => e.name === restoreNavState.eventId);
            if (foundEvent) {
                setClickedEvent(foundEvent);
                setSelectedDetailsEvent(foundEvent);
            }
        }
    }, [events, restoreNavState]);

    const handleClosePopover = () => {
        setPopoverAnchorEl(null);
    };

    const handleOpenEditDialog = async (event: CalendarEvent) => {
        setPopoverAnchorEl(null);
        if (event.reference_doctype === 'Calls' && event.reference_docname) {
            try {
                const call = await getCall(event.reference_docname);
                setSelectedCallDoc(call);
                setOpenCallDialog(true);
            } catch (error) {
                console.error('Failed to fetch call:', error);
                setSnackbar({ open: true, message: 'Failed to fetch call details', severity: 'error' });
            }
            return;
        }

        if (event.reference_doctype === 'Meeting' && event.reference_docname) {
            try {
                const meeting = await getMeeting(event.reference_docname);
                setSelectedMeetingDoc(meeting);
                setOpenMeetingDialog(true);
            } catch (error) {
                console.error('Failed to fetch meeting:', error);
                setSnackbar({ open: true, message: 'Failed to fetch meeting details', severity: 'error' });
            }
            return;
        }

        if (event.reference_doctype === 'ToDo' && event.reference_docname) {
            try {
                const todo = await getToDo(event.reference_docname);
                setSelectedTodoDoc(todo);
                setOpenTodoDialog(true);
            } catch (error) {
                console.error('Failed to fetch todo:', error);
                setSnackbar({ open: true, message: 'Failed to fetch task details', severity: 'error' });
            }
            return;
        }

        setSelectedEvent(event);
        setEventData({
            subject: event.subject,
            description: stripHtml(event.description || ''),
            event_category: event.event_category && event.event_category.trim() !== '' ? event.event_category : 'Event',
            event_type: event.event_type || 'Private',
            starts_on: event.starts_on.replace(' ', 'T'),
            ends_on: event.ends_on?.replace(' ', 'T') || '',
            status: event.status || 'Open',
        });
        setOpenDialog(true);
    };

    const handleDeleteClick = () => {
        if (clickedEvent) {
            setSelectedEvent(clickedEvent);
            setConfirmDelete({ open: true, id: clickedEvent.name });
            setPopoverAnchorEl(null);
        }
    };

    const loadEvents = useCallback(async (start?: Date, end?: Date) => {
        setLoadingEvents(true);
        try {
            const startStr = start?.toISOString();
            const endStr = end?.toISOString();
            const data = await fetchEvents(startStr, endStr);

            setEvents(data);
            console.log('Fetched events count:', data.length);
        } catch (error: any) {
            console.error('Failed to load events:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to load events', severity: 'error' });
        } finally {
            setLoadingEvents(false);
            isCalendarInitialized = true;
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    useEffect(() => {
        if (!miniCalDate) return () => { };

        const dateStr = miniCalDate.format('YYYY-MM-DD');

        const applyHighlight = () => {
            document.querySelectorAll('.crm-main-selected-date').forEach(el => {
                el.classList.remove('crm-main-selected-date');
            });
            const cell = document.querySelector(`[data-date="${dateStr}"]`);
            if (cell) {
                cell.classList.add('crm-main-selected-date');
            }
        };

        const timer = setTimeout(applyHighlight, 50);
        return () => clearTimeout(timer);
    }, [miniCalDate, events]);

    const handleDatesSet = (arg: any) => {
        loadEvents(arg.start, arg.end);
    };

    // Handler to open type selection dialog
    const handleOpenTypeDialog = useCallback((date?: string) => {
        if (date) setSelectedDate(date);
        else setSelectedDate(null);
        setOpenTypeDialog(true);
    }, []);

    // Handlers for opening specific dialogs
    const handleOpenCallDialog = () => {
        setOpenTypeDialog(false);
        setOpenCallDialog(true);
    };

    const handleOpenMeetingDialog = () => {
        setOpenTypeDialog(false);
        setOpenMeetingDialog(true);
    };

    const handleOpenTodoDialog = () => {
        setOpenTypeDialog(false);
        setOpenTodoDialog(true);
    };

    const handleOpenEventDialog = () => {
        setOpenTypeDialog(false);
        setSelectedEvent(null);
        setEventData({
            ...INITIAL_EVENT_STATE,
            starts_on: selectedDate ? selectedDate.replace(' ', 'T') : dayjs().format('YYYY-MM-DDTHH:mm:ss'),
            ends_on: selectedDate ? dayjs(selectedDate).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss') : dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
        });
        setOpenDialog(true);
    };

    const handleCloseCallDialog = () => {
        setOpenCallDialog(false);
        setSelectedCallDoc(null);
        setSelectedDate(null);
    };

    const handleCloseMeetingDialog = () => {
        setOpenMeetingDialog(false);
        setSelectedMeetingDoc(null);
        setSelectedDate(null);
    };

    const handleCloseTodoDialog = () => {
        setOpenTodoDialog(false);
        setSelectedTodoDoc(null);
        setSelectedDate(null);
    };

    const handleEventClick = async (info: any) => {
        console.log('handleEventClick ignored to prevent opening full edit dialogs directly', info);
    };


    const handleEventDrop = async (info: any) => {
        const { event } = info;
        const eventId = event.extendedProps?.realDocName || event.extendedProps?.originalEventName || event.id || event.name;
        try {
            await updateEvent(eventId, {
                starts_on: dayjs(event.start).format('YYYY-MM-DD HH:mm:ss'),
                ends_on: event.end ? dayjs(event.end).format('YYYY-MM-DD HH:mm:ss') : undefined
            });
            // Refresh events
            await loadEvents();
            setCalendarKey((prev) => prev + 1);
        } catch (error: any) {
            console.error('Failed to update event position:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to update event position', severity: 'error' });
            info.revert();
            await loadEvents();
            setCalendarKey((prev) => prev + 1);
        }
    };

    const handleEventResize = async (info: any) => {
        const { event } = info;
        const eventId = event.extendedProps?.realDocName || event.extendedProps?.originalEventName || event.id || event.name;
        try {
            await updateEvent(eventId, {
                starts_on: dayjs(event.start).format('YYYY-MM-DD HH:mm:ss'),
                ends_on: event.end ? dayjs(event.end).format('YYYY-MM-DD HH:mm:ss') : undefined
            });
            // Refresh events
            loadEvents();
        } catch (error: any) {
            console.error('Failed to update event duration:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to update event duration', severity: 'error' });
            info.revert();
        }
    };

    const handleSaveEvent = async () => {
        const formattedData = {
            ...eventData,
            starts_on: eventData.starts_on?.replace('T', ' '),
            ends_on: eventData.ends_on ? eventData.ends_on.replace('T', ' ') : undefined,
        };

        setLoadingEvents(true);
        try {
            if (selectedEvent) {
                const eventId = (selectedEvent.realDocName || selectedEvent.originalEventName || selectedEvent.name || selectedEvent.id || '') as string;
                const response = await updateEvent(eventId, formattedData);
                console.log('Updated event response:', response);
                setSnackbar({ open: true, message: 'Event updated successfully', severity: 'success' });
            } else {
                const response = await createEvent(formattedData);
                console.log('Created event response:', response);
                setSnackbar({ open: true, message: 'Event created successfully', severity: 'success' });
            }
            setOpenDialog(false);
            loadEvents();
        } catch (error: any) {
            console.error('Failed to save event:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to save event', severity: 'error' });
        } finally {
            setLoadingEvents(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedEvent) return;
        setLoadingEvents(true);
        try {
            if (selectedEvent.reference_doctype === 'Calls' && selectedEvent.reference_docname) {
                await deleteCall(selectedEvent.reference_docname);
            } else if (selectedEvent.reference_doctype === 'Meeting' && selectedEvent.reference_docname) {
                await deleteMeeting(selectedEvent.reference_docname);
            } else if (selectedEvent.reference_doctype === 'ToDo' && selectedEvent.reference_docname) {
                await deleteToDo(selectedEvent.reference_docname);
            } else {
                const eventId = (selectedEvent.realDocName || selectedEvent.originalEventName || selectedEvent.name || selectedEvent.id || '') as string;
                await deleteEvent(eventId);
            }
            console.log('Deleted event response:', selectedEvent.name);
            setOpenDialog(false);
            setConfirmDelete({ open: false, id: null });
            loadEvents();
            setSnackbar({ open: true, message: 'Event deleted successfully', severity: 'success' });
        } catch (error: any) {
            console.error('Failed to delete event:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to delete event', severity: 'error' });
        } finally {
            setLoadingEvents(false);
        }
    };


    const calendarEvents = events.map((event) => {
        let eventColor = event.color || '#059669';

        if (!event.color) {
            switch (event.status) {
                case 'Completed':
                case 'Closed':
                    eventColor = theme.palette.success.main;
                    break;
                case 'Cancelled':
                    eventColor = theme.palette.error.main;
                    break;
                case 'Scheduled':
                    eventColor = '#059669';
                    break;
                case 'Open':
                    eventColor = theme.palette.warning.main;
                    break;
                default:
                    eventColor = '#059669';
            }
        }

        return {
            id: event.name,
            title: event.subject,
            start: event.starts_on,
            end: event.ends_on || event.starts_on,
            allDay: event.all_day === 1,
            color: eventColor,
            extendedProps: {
                eventType: event.event_type,
                status: event.status,
                category: event.event_category,
            },
        };
    });

    // Calendar ref (New Custom Calendar UI)
    const calendarRef = useRef<any>(null);
    const initialDateRef = useRef(new Date());

    useEffect(() => {
        const savedDateStr = sessionStorage.getItem('calendar_saved_date');
        const savedMode = sessionStorage.getItem('calendar_saved_mode');
        const savedFilter = sessionStorage.getItem('calendar_saved_filter');
        const reopenEventId = sessionStorage.getItem('calendar_reopen_event_id');

        if (savedFilter) {
            setEventTypeFilter(savedFilter);
            sessionStorage.removeItem('calendar_saved_filter');
        }

        if (savedMode && calendarRef.current?.instance) {
            calendarRef.current.instance.mode = savedMode;
            sessionStorage.removeItem('calendar_saved_mode');
        }

        if (savedDateStr) {
            const date = new Date(savedDateStr);
            if (calendarRef.current?.instance) {
                calendarRef.current.instance.date = date;
            } else {
                initialDateRef.current = date;
            }
            setMiniCalDate(dayjs(date));
            sessionStorage.removeItem('calendar_saved_date');
        }

        if (reopenEventId && events.length > 0) {
            const foundEvent = events.find(e => e.name === reopenEventId);
            if (foundEvent) {
                setClickedEvent(foundEvent);
                if (!restoreNavState && !location.state?.openContactId && !location.state?.openEventDetails && !location.state?.eventId && !sessionStorage.getItem('calendar_nav_state')) {
                    setTimeout(() => {
                        const element = document.querySelector(`.b-cal-event-wrap[data-event-id="${reopenEventId}"]`) || document.querySelector(`[data-event-id="${reopenEventId}"]`);
                        if (element) {
                            setPopoverAnchorEl(element as HTMLElement);
                        }
                    }, 300);
                }
            }
            sessionStorage.removeItem('calendar_reopen_event_id');
        }
    }, [events, calendarRef.current?.instance]);

    const stateRef = useRef<any>({});
    stateRef.current = {
        events,
        loadEvents,
        setSelectedCallDoc,
        setOpenCallDialog,
        setSelectedMeetingDoc,
        setOpenMeetingDialog,
        setSelectedTodoDoc,
        setOpenTodoDialog,
        setSelectedEvent,
        setEventData,
        setOpenDialog,
        setSnackbar,
        handleOpenTypeDialog,
        handleOpenEventDialog,
        setClickedEvent,
        setPopoverAnchorEl,
    };

    const handlersRef = useRef({
        eventClick: async ({ eventRecord, eventElement, domEvent }: any) => {
            const {
                events: latestEvents,
                setClickedEvent: stateSetClickedEvent,
                setPopoverAnchorEl: stateSetPopoverAnchorEl
            } = stateRef.current;

            const eventId = eventRecord.id;
            const event = latestEvents.find((e: any) => e.name === eventId);
            if (event) {
                setClickedEvent(event);
                setPopoverAnchorEl(domEvent?.target || domEvent?.currentTarget || null);
            }
        },
        beforeEventCreate: ({ date }: any) => {
            const { handleOpenTypeDialog: stateHandleOpenTypeDialog } = stateRef.current;
            if (!canCreateEvent) {
                setSnackbar({
                    open: true,
                    message: 'You do not have permission to add events.',
                    severity: 'error',
                });
                return false;
            }
            const dateStr = dayjs(date).format('YYYY-MM-DDTHH:mm:ss');
            stateHandleOpenTypeDialog(dateStr);
            return false;
        },
        beforeDragMoveEnd: async ({ eventRecord, newStartDate, newEndDate }: any): Promise<boolean> => {
            const { loadEvents: stateLoadEvents, setSnackbar: stateSetSnackbar } = stateRef.current;
            try {
                console.log('eventDrop fired');
                console.log('Dropped locked check', eventRecord.data);

                const isLocked =
                    eventRecord.get?.('isCompletedLocked') === true ||
                    eventRecord.data?.isCompletedLocked === true;

                if (!canEditEvent) {
                    stateSetSnackbar({
                        open: true,
                        message: 'You do not have permission to edit events.',
                        severity: 'error',
                    });
                    stateLoadEvents();
                    return false;
                }

                if (isLocked) {
                    stateSetSnackbar({
                        open: true,
                        message: 'Completed events cannot be rescheduled.',
                        severity: 'error',
                    });
                    stateLoadEvents();
                    return false;
                }

                const eventId = eventRecord.id || eventRecord.data?.id || (typeof eventRecord.get === 'function' ? eventRecord.get('id') : undefined);
                await updateEvent(eventId, {
                    starts_on: dayjs(newStartDate).format('YYYY-MM-DD HH:mm:ss'),
                    ends_on: newEndDate ? dayjs(newEndDate).format('YYYY-MM-DD HH:mm:ss') : undefined
                });
                stateLoadEvents();
                return true;
            } catch (error: any) {
                console.error('Failed to update event position:', error);
                stateSetSnackbar({ open: true, message: error.message || 'Failed to update event position', severity: 'error' });
                stateLoadEvents();
                return false;
            }
        },
        eventResizeEnd: async ({ eventRecord, startDate, endDate }: any) => {
            const { loadEvents: reload, setSnackbar: stateSetSnackbar } = stateRef.current;
            try {
                if (!canEditEvent) {
                    stateSetSnackbar({
                        open: true,
                        message: 'You do not have permission to edit events.',
                        severity: 'error',
                    });
                    reload();
                    return;
                }
                await updateEvent(eventRecord.id, {
                    starts_on: dayjs(startDate).format('YYYY-MM-DD HH:mm:ss'),
                    ends_on: endDate ? dayjs(endDate).format('YYYY-MM-DD HH:mm:ss') : undefined
                });
                reload();
            } catch (error: any) {
                console.error('Failed to update event duration:', error);
                stateSetSnackbar({ open: true, message: error.message || 'Failed to update event duration', severity: 'error' });
                reload();
            }
        }
    });

    const calendarPropsRef = useRef({
        date: initialDateRef.current,
        mode: 'month',
        eventRenderer: ({ eventRecord, renderData, element }: any) => {
            const color = eventRecord.data?.eventColor || eventRecord.eventColor || '#059669';

            if (renderData) {
                renderData.eventColor = color;
                renderData.style = `background-color: ${color}; color: white;`;
            }

            return eventRecord.name || eventRecord.title || '';
        },
        modes: {
            day: true,
            week: true,
            month: {
                showWeekNumber: false
            },
            year: true,
            agenda: true
        },
        features: {
            eventEdit: false, // disable built-in event editor
            eventTooltip: false, // disable default event tooltip
            eventMenu: false // disable default event context menu
        },
        sidebar: false, // disable built-in sidebar; we render our own React sidebar
        listeners: {
            eventClick: (args: any) => handlersRef.current.eventClick(args),
            beforeEventCreate: (args: any) => handlersRef.current.beforeEventCreate(args),
            beforeDragMoveEnd: (args: any) => handlersRef.current.beforeDragMoveEnd(args),
            eventResizeEnd: (args: any) => handlersRef.current.eventResizeEnd(args)
        }
    });

    const todayEvents = useMemo(() => {
        const todayStart = dayjs().startOf('day');
        const todayEnd = dayjs().endOf('day');
        return events.filter((event) => {
            if (!event.starts_on) return false;
            const start = dayjs(event.starts_on);
            const end = dayjs(event.ends_on || event.starts_on);
            return (start.isBefore(todayEnd) || start.isSame(todayEnd)) &&
                (end.isAfter(todayStart) || end.isSame(todayStart));
        });
    }, [events]);

    const filteredTodayEvents = useMemo(() => {
        if (!searchQuery) return todayEvents;
        return todayEvents.filter(evt =>
            evt.subject.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [todayEvents, searchQuery]);

    useEffect(() => {
        if (calendarRef.current?.instance) {
            const calendar = calendarRef.current.instance;
            // Programmatically disable built-in features to prevent duplicate/unwanted popups
            if (calendar.features?.eventTooltip) calendar.features.eventTooltip.disabled = true;
            if (calendar.features?.eventEdit) calendar.features.eventEdit.disabled = true;
            if (calendar.features?.eventMenu) calendar.features.eventMenu.disabled = true;
        }
    }, [loadingEvents]);



    const bryntumEvents = useMemo(() => {
        console.log('BRYNTUM EVENTS USEMEMO RUNNING', events?.length);
        if (!events) return [];

        let filtered = events;
        if (eventTypeFilter && eventTypeFilter !== 'All') {
            filtered = events.filter((event) => {
                const type = event.reference_doctype;
                const evCat = event.event_category || (event as any).eventOriginalData?.event_category;
                const subjectLower = (event.subject || '').toLowerCase();

                if (eventTypeFilter === 'Calls') {
                    return type === 'Call' || type === 'Calls' || evCat === 'Call' || evCat === 'Calls' || subjectLower.includes('call');
                } else if (eventTypeFilter === 'Meetings') {
                    return type === 'Meeting';
                } else if (eventTypeFilter === 'To-Do') {
                    return type === 'ToDo' || type === 'Todo' || type === 'To-do';
                }
                return true;
            });
        }

        return filtered.map((event) => {
            const type = getEventType(event);
            const status = getEventStatus(event);
            const eventColor = getEventChipColor(type, status, event.color);

            const rawStatus = String(
                (event as any).status ||
                (event as any).workflow_state ||
                (event as any).call_status ||
                (event as any).meeting_status ||
                (event as any).event_status ||
                ''
            ).trim().toLowerCase();

            const isCompletedLocked = rawStatus === 'completed' || rawStatus === 'closed';

            console.log("Calendar event mapping:", event.name, event.subject, event.status, event.reference_doctype, event.reference_docname, "rawStatus:", rawStatus, "isCompletedLocked:", isCompletedLocked);

            const startDate = event.starts_on ? dayjs(event.starts_on).toDate() : new Date();
            let endDate = event.ends_on ? dayjs(event.ends_on).toDate() : startDate;

            // Fix for events (like CRM Meetings) that have missing or identical ends_on,
            // which causes Bryntum to treat them as 0-duration milestones (b-milestone).
            if (startDate.getTime() === endDate.getTime()) {
                endDate = dayjs(startDate).add(1, 'hour').toDate();
            }

            const realDocName = event.name || (event as any).id || (event as any).originalEventName;

            const finalBryntumEvent = {
                id: realDocName,
                name: realDocName,
                realDocName,
                subject: event.subject,
                title: event.subject,
                start: event.starts_on,
                end: event.ends_on || event.starts_on,
                starts_on: event.starts_on,
                ends_on: event.ends_on || event.starts_on,
                startDate,
                endDate,
                allDay: event.all_day === 1,
                eventColor,
                color: eventColor,
                backgroundColor: eventColor,
                status: event.status,
                eventStatus: event.status,
                eventOriginalData: event,
                reference_doctype: event.reference_doctype,
                reference_docname: event.reference_docname,
                event_category: (event as any).event_category,
                event_type: (event as any).event_type,
                isCompletedLocked,
                rawStatus,
                originalEventName: realDocName,
            };

            if (
                finalBryntumEvent.name?.includes('meeting') ||
                finalBryntumEvent.name?.includes('Meeting') ||
                finalBryntumEvent.reference_doctype === 'Meeting'
            ) {
                console.log(`===== FINAL MEETING DEBUG: ${finalBryntumEvent.name} =====`);
                console.table({
                    id: finalBryntumEvent.id,
                    name: finalBryntumEvent.name,
                    startDate: finalBryntumEvent.startDate,
                    endDate: finalBryntumEvent.endDate,
                    allDay: finalBryntumEvent.allDay,
                    durationMS:
                        (finalBryntumEvent.startDate as any) instanceof Date && (finalBryntumEvent.endDate as any) instanceof Date
                            ? (finalBryntumEvent.endDate as any).getTime() - (finalBryntumEvent.startDate as any).getTime()
                            : 'invalid date',
                    durationUnit: (finalBryntumEvent as any).durationUnit,
                    milestone: (finalBryntumEvent as any).milestone,
                    isMilestone: (finalBryntumEvent as any).isMilestone,
                    eventStyle: (finalBryntumEvent as any).eventStyle,
                    cls: (finalBryntumEvent as any).cls,
                    eventColor: finalBryntumEvent.eventColor
                });
            }

            return finalBryntumEvent;
        });
    }, [events, theme, eventTypeFilter]);



    return (
        <>
            <style>{`
                /* Hide any watermark or trial indicators */
                .b-watermark,
                [class*="b-watermark"],
                .b-sch-watermark,
                .b-trial,
                .b-sch-trial,
                [class*="trial"],
                [class*="trial"]::before,
                [class*="trial"]::after,
                .b-calendar::before,
                .b-calendar::after,
                .b-calendar-content::before,
                .b-calendar-content::after,
                .b-grid-panel-body::before,
                .b-grid-panel-body::after,
                .b-timeline-subgrid::before,
                .b-timeline-subgrid::after,
                /* Override inline background SVGs used for watermarks specifically */
                [style*="data:image/svg+xml"] {
                    background-image: none !important;
                }
                /* Hide element-level watermarks completely */
                .b-watermark,
                [class*="watermark"],
                .b-sch-watermark,
                .b-trial,
                .b-sch-trial,
                [class*="trial"] {
                    display: none !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                }
                /* Hide week number column */
                .b-week-num {
                    display: none !important;
                    width: 0px !important;
                }
                /* Hide 'other' resource item from the sidebar resourceFilter checklist */
                .b-list-item[data-id="other"],
                .b-resourcefilter .b-list-item[data-id="other"] {
                    display: none !important;
                    height: 0 !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                }
                /* Hide Bryntum default event dot icon */
                .b-cal-event-icon {
                    display: none !important;
                }
                /* Keep existing event background color visible after click/selection */
                .b-cal-event-bar-container .b-cal-event-wrap:not(.b-solid-bar) .b-cal-event {
                    background: var(--b-calendar-event-color) !important;
                }
                .b-cal-event-bar-container .b-cal-event-wrap:not(.b-solid-bar) .b-cal-event .b-cal-event-icon,
                .b-cal-event-bar-container .b-cal-event-wrap:not(.b-solid-bar) .b-cal-event .b-cal-recurrence-icon,
                .b-cal-event-bar-container .b-cal-event-wrap:not(.b-solid-bar) .b-cal-event .b-cal-event-body {
                    color: var(--b-calendar-event-reveal-color) !important;
                }
                .b-cal-event-bar-container .b-cal-event-wrap .b-cal-event {
                    background: var(--b-calendar-event-color) !important;
                }
                /* Prevent intraday events from dimming when another event is selected */
                .b-calendar .b-cal-event-wrap.b-colorize.b-intraday {
                    opacity: 1 !important;
                }

                /* Fix multi-day Bryntum solid-bar text visibility */
                .b-cal-event-wrap.b-solid-bar .b-cal-event-desc {
                    color: #ffffff !important;
                    opacity: 1 !important;
                    filter: none !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }

                .b-cal-event-wrap.b-solid-bar .b-cal-event-desc *,
                .b-cal-event-wrap.b-solid-bar .crm-inline-event-icon,
                .b-cal-event-wrap.b-solid-bar svg {
                    color: #ffffff !important;
                    stroke: #ffffff !important;
                    opacity: 1 !important;
                    filter: none !important;
                }

                .b-has-selection .b-cal-event-wrap.b-solid-bar .b-cal-event-desc,
                .b-has-selection .b-cal-event-wrap.b-solid-bar .b-cal-event-desc * {
                   color: #ffffff !important;
                   opacity: 1 !important;
                   filter: none !important;
                }
                .crm-event-content {
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                  width: 100%;
                  overflow: hidden;
                }

                .crm-event-icon {
                  display: inline-flex;
                  align-items: center;
                  flex-shrink: 0;
                }

                .crm-event-icon svg {
                  width: 12px;
                  height: 12px;
                  stroke: currentColor;
                }

                .crm-event-title {
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }

                /* Layout overrides for full-width toolbar */
                .b-top-toolbar,
                .b-toolbar,
                .b-calendar-tbar {
                    height: 64px !important;
                    padding-left: 16px !important;
                    border-bottom: 1px solid ${theme.palette.divider} !important;
                    box-sizing: border-box !important;
                }
                .b-calendar-panel-body {
                    position: relative !important;
                    margin-left: 260px !important;
                    width: calc(100% - 260px) !important;
                    border-top: none !important;
                    box-sizing: border-box !important;
                    background-color: var(--b-calendar-background, #fff) !important;
                }

                /* Inset the view container to create proper visual breathing space on all sides of the grid */
                .b-calendar-view-container {
                    position: absolute !important;
                    top: 0px !important;
                    left: 250px !important;
                    right: 0px !important;
                    bottom: 0px !important;
                    width: auto !important;
                    height: auto !important;
                    padding: 0 !important;
                    box-sizing: border-box !important;
                }

                /* Styling view grids as premium floating cards with soft shadows and borders */
                .b-month-view,
                .b-day-view,
                .b-week-view,
                .b-year-view,
                .b-agenda-view {
                    border: 0px solid ${theme.palette.divider} !important;
                    border-radius: 0px !important;
                    overflow: hidden !important;
                    background-color: var(--b-calendar-background, #fff) !important;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
                }

                /* Center column headers for balanced, modern, and aligned alignment */
                .b-month-view .b-calendar-day-header {
                    justify-content: center !important;
                    padding-bottom: 8px !important;
                    font-weight: 600 !important;
                    font-size: 0.85rem !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                }
                .b-day-column-header-cell {
                    justify-content: center !important;
                    align-items: center !important;
                    padding: 8px 0 !important;
                    font-weight: 600 !important;
                    font-size: 0.85rem !important;
                }

                /* Overall calendar event padding, gap, and text presentation */
                .crm-event-content {
                  display: inline-flex;
                  align-items: center;
                  gap: 8px !important; /* Visual separation between icon and text */
                  width: 100%;
                  overflow: hidden;
                }
                .b-cal-event {
                    padding: 0px 05px !important; /* Balanced internal padding for text breathing room */
                }

                /* Overall calendar event border radius for premium modern feel */
                .b-cal-event-wrap,
                .b-cal-event {
                    border-radius: 6px !important;
                }

                /* Month View Spacing & Positioning Overrides */
                .b-month-view {
                    --b-month-view-event-padding: 12px !important; /* Spacing from cell borders */
                    --bi-event-spacing: 8px !important; /* Space between stacked events */
                    --b-month-view-cell-header-padding: 12px 12px 0 0 !important; /* Spacing for day numbers */
                    --b-month-view-padding: 2.6em 0 0 0 !important; /* Breathing space below day numbers */
                }

                /* Day/Week View spacing */
                .b-day-view {
                    --b-day-view-event-body-padding: 2px 10px !important; /* Spacing inside event cards */
                    --b-day-view-event-border-radius: 6px !important;
                }
                .b-day-view-day-detail .b-cal-event-wrap {
                    padding: 5px 6px !important; /* Margin around event cards from grid borders */
                }

                /* Year View spacing & typography hierarchy */
                .b-year-view {
                    --b-year-view-row-gap: 2.0em !important; /* Open layout spacing */
                    --b-year-view-column-gap: 2.em !important;
                    --b-year-view-content-padding: 24px !important;
                }
                .b-year-view .b-week-number-cell {
                    display: none !important;
                    width: 0px !important;
                    flex: 0 0 0px !important;
                }
                .b-year-view-month-name {
                    font-weight: 700 !important;
                    font-size: 1.15rem !important;
                    color: var(--b-neutral-10, #212B36) !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                    padding-bottom: 8px !important;
                }

                /* Agenda View spacing and alignment */
                .b-agenda-view {
                    --b-agenda-view-cell-padding-block: 16px !important; /* Comfortable vertical cell spacing */
                    --b-agenda-view-cell-padding-inline: 20px !important;
                }
                .b-cal-agenda-event-row {
                    padding: 2px 1 !important; /* Balanced internal event line height/spacing */
                }
                .b-agenda-view .b-cal-event-wrap {
                    margin-block: 2px !important;
                }

                /* Selected Date Highlight */
                .crm-main-selected-date {
                  background: rgba(0, 145, 255, 0.08) !important;
                  outline: 1px solid #c3dcfaff !important;
                  outline-offset: -2px;
                }
            `}</style>
            <DashboardContent maxWidth="xl">
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} mt={2}>
                    <Box>
                        <Typography variant="h4">Events Calendar</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Manage your schedule and important events
                        </Typography>
                    </Box>
                    {canCreateEvent && (
                        <Button
                            variant="contained"
                            color="info"
                            startIcon={<Iconify icon="mingcute:add-line" />}
                            onClick={() => handleOpenTypeDialog()}
                        >
                            Add Events
                        </Button>
                    )}
                </Stack>

                {/* 1. Full width Event Types Legend */}


                {/* Calendar Layout: custom sidebar + Bryntum calendar */}
                <Card sx={{
                    mb: 3,
                    overflow: 'visible',
                    position: 'relative',
                    height: 850,
                    borderRadius: 2,
                    boxShadow: '0 8px 24px -4px rgba(145, 158, 171, 0.2), 0 0 2px 0 rgba(145, 158, 171, 0.24)',
                    border: '1px solid rgba(145, 158, 171, 0.12)',
                }}>

                    {/* ---- Custom Left Sidebar ---- */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 72, // starts below 72px full-width toolbar
                            left: 0,
                            bottom: 0,
                            width: 290,
                            display: 'flex',
                            flexDirection: 'column',
                            borderRight: `1px solid ${theme.palette.divider}`,
                            bgcolor: 'background.paper',
                            overflowY: 'auto',
                            zIndex: 20
                        }}
                    >
                        {/* Mini month calendar */}
                        <Box
                            sx={{
                                '& .MuiDateCalendar-root': {
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: 'none',
                                    minHeight: 285,
                                    mt: 0.5,
                                    px: 1,
                                },
                                '& .MuiPickersCalendarHeader-root': {
                                    pl: 1.5, pr: 1, mt: 0.5, mb: 0.5,
                                },
                                '& .MuiPickersCalendarHeader-label': {
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                },
                                '& .MuiDayCalendar-header': {
                                    justifyContent: 'space-around',
                                },
                                '& .MuiDayCalendar-weekContainer': {
                                    justifyContent: 'space-around',
                                    my: 0.25,
                                },
                                '& .MuiDayCalendar-weekDayLabel': {
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    width: 32,
                                    height: 28,
                                },
                                '& .MuiPickersDay-root': {
                                    width: 32,
                                    height: 32,
                                    fontSize: '0.82rem',
                                    '&.Mui-selected': {
                                        bgcolor: '#059669',
                                        color: '#fff',
                                        '&:hover': { bgcolor: '#068eb1' },
                                    },
                                    '&.MuiPickersDay-today:not(.Mui-selected)': {
                                        borderColor: '#059669',
                                    },
                                },
                                '& .MuiDayCalendar-slideTransition': {
                                    minHeight: 235,
                                    overflowY: 'hidden',
                                },
                                '& .MuiYearCalendar-root': {
                                    width: '100%',
                                    maxHeight: 240,
                                    px: 1,
                                },
                                '& .MuiPickersYear-yearButton': {
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    px: 1,
                                    py: 0.5,
                                    height: 32,
                                },
                            }}
                        >
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DateCalendar
                                    value={miniCalDate}
                                    onChange={(newVal: any) => setMiniCalDate(newVal)}
                                    showDaysOutsideCurrentMonth
                                    slots={{
                                        day: (props) => {
                                            const { day, outsideCurrentMonth, ...other } = props;

                                            // Find all events for this date
                                            const dayEvents = outsideCurrentMonth ? [] : events.filter((event) => {
                                                if (!event.starts_on) return false;
                                                const start = dayjs(event.starts_on).startOf('day');
                                                const end = dayjs(event.ends_on || event.starts_on).startOf('day');
                                                const target = day.startOf('day');
                                                return (target.isAfter(start) || target.isSame(start)) && (target.isBefore(end) || target.isSame(end));
                                            });

                                            // Determine dots (max 3)
                                            const dots = dayEvents.slice(0, 3).map((event, index) => {
                                                const type = getEventType(event);
                                                const status = getEventStatus(event);
                                                const bgColor = getEventChipColor(type, status, event.color);
                                                return <Box key={`${event.name || index}-${index}`} sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: bgColor }} />;
                                            });

                                            return (
                                                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                                    <PickersDay {...other} outsideCurrentMonth={outsideCurrentMonth} day={day} />
                                                    {dots.length > 0 && (
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                bottom: 2,
                                                                left: '50%',
                                                                transform: 'translateX(-50%)',
                                                                display: 'flex',
                                                                gap: '2px',
                                                                pointerEvents: 'none'
                                                            }}
                                                        >
                                                            {dots}
                                                        </Box>
                                                    )}
                                                </Box>
                                            );
                                        }
                                    }}
                                />
                            </LocalizationProvider>
                        </Box>

                        <Divider />
                        {/* Search box */}
                        <Box sx={{ p: 2, pb: 1.5 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search events..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', width: 18, height: 18 }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        fontSize: '0.875rem',
                                    }
                                }}
                            />
                        </Box>

                        <Divider />

                        {/* Today Events categorised list */}
                        <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2 }}>
                            {(() => {
                                const calls = filteredTodayEvents.filter(evt => {
                                    const t = evt.reference_doctype;
                                    const ec = evt.event_category;
                                    const sl = (evt.subject || '').toLowerCase();
                                    return t === 'Call' || t === 'Calls' || ec === 'Call' || ec === 'Calls' || sl.includes('call');
                                });
                                const meetings = filteredTodayEvents.filter(evt => {
                                    const t = evt.reference_doctype;
                                    const ec = evt.event_category;
                                    const sl = (evt.subject || '').toLowerCase();
                                    const isCall = t === 'Call' || t === 'Calls' || ec === 'Call' || ec === 'Calls' || sl.includes('call');
                                    return !isCall && (t === 'Meeting' || ec === 'Meeting');
                                });
                                const todos = filteredTodayEvents.filter(evt => {
                                    const t = evt.reference_doctype;
                                    const ec = evt.event_category;
                                    const sl = (evt.subject || '').toLowerCase();
                                    const isCall = t === 'Call' || t === 'Calls' || ec === 'Call' || ec === 'Calls' || sl.includes('call');
                                    const isMeeting = !isCall && (t === 'Meeting' || ec === 'Meeting');
                                    return !isCall && !isMeeting && (t === 'ToDo' || t === 'Todo' || t === 'To-do' || ec === 'ToDo' || ec === 'Todo');
                                });

                                const renderCard = (evt: any) => {
                                    const type = getEventType(evt);
                                    const status = getEventStatus(evt);
                                    const chipColor = getEventChipColor(type, status, evt.color);

                                    return (
                                        <Box
                                            key={evt.name}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                px: 1.5,
                                                py: 1,
                                                mx: 0.5,
                                                borderRadius: '8px',
                                                bgcolor: '#FFFFFF',
                                                border: '1px solid #E2E8F0',
                                                borderLeft: `4px solid ${chipColor}`,
                                                color: '#1E293B',
                                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    bgcolor: '#F8FAFC',
                                                    borderColor: '#CBD5E1',
                                                    borderLeftColor: chipColor,
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                                                    transform: 'translateY(-1px)',
                                                },
                                            }}
                                            onClick={(e) => {
                                                setClickedEvent(evt);
                                                setPopoverAnchorEl(e.currentTarget);
                                            }}
                                        >
                                            <Box sx={{ minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: '0.8125rem',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        lineHeight: 1.35,
                                                        color: '#1E293B',
                                                    }}
                                                >
                                                    {evt.subject.replace(/\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*$/i, '')}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: '#637381', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}
                                                >
                                                    {(() => {
                                                        if (!evt.starts_on) return '';
                                                        const start = dayjs(evt.starts_on);
                                                        const end = dayjs(evt.ends_on || evt.starts_on);
                                                        const isMultiDay = !start.isSame(end, 'day');

                                                        if (isMultiDay) {
                                                            return `${start.format('MMM D, hh:mm A')} - ${end.format('MMM D, hh:mm A')}`;
                                                        }
                                                        if (!evt.ends_on || start.isSame(end, 'minute')) {
                                                            return start.format('hh:mm A');
                                                        }
                                                        return `${start.format('hh:mm A')} - ${end.format('hh:mm A')}`;
                                                    })()}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    );
                                };

                                const renderSection = (title: string, icon: any, color: string, items: any[], emptyMsg: string) => (
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25, px: 0.75 }}>
                                            <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
                                            <Typography
                                                sx={{
                                                    fontWeight: 800,
                                                    fontSize: '0.78125rem',
                                                    color: '#39444eff',
                                                    letterSpacing: '0.5px',
                                                    textTransform: 'uppercase',
                                                    lineHeight: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {title}
                                            </Typography>
                                        </Box>
                                        {items.length === 0 ? (
                                            <Box
                                                sx={{
                                                    mx: 0.5,
                                                    px: 2,
                                                    py: 1.5,
                                                    textAlign: 'center',
                                                    borderRadius: 2,
                                                    bgcolor: theme.palette.grey[100],
                                                    border: `1px dashed ${theme.palette.divider}`,
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        fontSize: '0.825rem',
                                                        fontWeight: 500,
                                                        lineHeight: 1.5,
                                                    }}
                                                >
                                                    {emptyMsg}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Stack spacing={1}>
                                                {items.map(renderCard)}
                                            </Stack>
                                        )}
                                    </Box>
                                );

                                return (
                                    <Box sx={{ mt: 2 }}>
                                        {renderSection('TODAY CALLS', <Iconify icon={"solar:phone-calling-bold" as any} width={16} />, '#12A8D6', calls, 'No Calls Today')}
                                        <Divider sx={{ my: 2.25 }} />
                                        {renderSection('TODAY MEETINGS', <Iconify icon={"solar:calendar-bold" as any} width={16} />, '#12A8D6', meetings, 'No Meetings Today')}
                                        <Divider sx={{ my: 2.25 }} />
                                        {renderSection('TODAY TO-DOS', <Iconify icon={"solar:check-square-bold" as any} width={16} />, '#12A8D6', todos, 'No To-Dos Today')}
                                    </Box>
                                );
                            })()}
                        </Box>
                    </Box>

                    {/* ---- Custom Calendar grid ---- */}
                    <Box sx={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <CustomCalendar
                            calendarKey={calendarKey}
                            events={bryntumEvents}
                            loading={loadingEvents}
                            selectedDate={miniCalDate}
                            eventTypeFilter={eventTypeFilter}
                            onFilterChange={(newFilter) => setEventTypeFilter(newFilter)}
                            onDateChange={(newDate) => setMiniCalDate(newDate)}
                            onEventClick={(evt, el, jsEvent) => {
                                setClickedEvent(evt);
                                setPopoverAnchorEl(el || (jsEvent?.currentTarget as HTMLElement) || (jsEvent?.target as HTMLElement) || null);
                            }}
                            onDateSelect={(selectInfo) => {
                                if (canCreateEvent) {
                                    let startDate = dayjs(selectInfo.startStr || selectInfo.start);
                                    if (selectInfo.allDay) {
                                        const now = dayjs();
                                        startDate = startDate.hour(now.hour()).minute(now.minute()).second(0);
                                    }
                                    const startStr = startDate.format('YYYY-MM-DDTHH:mm');
                                    let endDate = selectInfo.end ? dayjs(selectInfo.endStr || selectInfo.end) : startDate.add(1, 'hour');
                                    if (selectInfo.allDay) {
                                        endDate = startDate.add(1, 'hour');
                                    }
                                    const endStr = endDate.format('YYYY-MM-DDTHH:mm');

                                    setEventData({
                                        subject: '',
                                        starts_on: startStr,
                                        ends_on: endStr,
                                        status: 'Open',
                                        event_category: 'Event',
                                        color: '#059669',
                                        description: '',
                                    });
                                    handleOpenTypeDialog(startStr);
                                }
                            }}
                            onEventDrop={async (dropInfo) => {
                                setLoadingEvents(true);
                                try {
                                    if (!canEditEvent) {
                                        setSnackbar({ open: true, message: 'You do not have permission to edit events.', severity: 'error' });
                                        dropInfo.revert();
                                        await loadEvents();
                                        setCalendarKey((prev) => prev + 1);
                                        return;
                                    }
                                    const evt = dropInfo.event;
                                    const eventId = evt.extendedProps?.realDocName || evt.extendedProps?.originalEventName || evt.id;
                                    await updateEvent(eventId, {
                                        starts_on: dayjs(evt.start).format('YYYY-MM-DD HH:mm:ss'),
                                        ends_on: evt.end ? dayjs(evt.end).format('YYYY-MM-DD HH:mm:ss') : undefined,
                                    });
                                    await loadEvents();
                                    setCalendarKey((prev) => prev + 1);
                                } catch (err: any) {
                                    console.error('Failed to update event position', err);
                                    dropInfo.revert();
                                    setSnackbar({ open: true, message: err.message || 'Failed to update event', severity: 'error' });
                                    await loadEvents();
                                    setCalendarKey((prev) => prev + 1);
                                } finally {
                                    setLoadingEvents(false);
                                }
                            }}
                            onEventResize={async (resizeInfo) => {
                                setLoadingEvents(true);
                                try {
                                    if (!canEditEvent) {
                                        setSnackbar({ open: true, message: 'You do not have permission to edit events.', severity: 'error' });
                                        resizeInfo.revert();
                                        await loadEvents();
                                        setCalendarKey((prev) => prev + 1);
                                        return;
                                    }
                                    const evt = resizeInfo.event;
                                    const eventId = evt.extendedProps?.realDocName || evt.extendedProps?.originalEventName || evt.id;
                                    await updateEvent(eventId, {
                                        starts_on: dayjs(evt.start).format('YYYY-MM-DD HH:mm:ss'),
                                        ends_on: evt.end ? dayjs(evt.end).format('YYYY-MM-DD HH:mm:ss') : undefined,
                                    });
                                    await loadEvents();
                                    setCalendarKey((prev) => prev + 1);
                                } catch (err: any) {
                                    console.error('Failed to update event duration', err);
                                    resizeInfo.revert();
                                    setSnackbar({ open: true, message: err.message || 'Failed to update event duration', severity: 'error' });
                                    await loadEvents();
                                    setCalendarKey((prev) => prev + 1);
                                } finally {
                                    setLoadingEvents(false);
                                }
                            }}
                        />
                    </Box>

                </Card>

                {/* Old Events Calendar Component (Hidden / Commented out safely) */}

                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2, boxShadow: (t) => t.customShadows.z24, } }}>
                    <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {selectedEvent ? 'Edit Event' : 'New Event'}
                            </Typography>
                        </Box>
                        <IconButton onClick={() => setOpenDialog(false)} sx={{ color: 'text.secondary' }}>
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent dividers sx={{ borderBottom: 'none', px: 3, pb: 0 }}>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {/* Event Overview Section */}
                                <Box>
                                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                        Event Overview
                                    </Typography>
                                    <Stack spacing={2.5}>
                                        <TextField
                                            fullWidth
                                            label="Subject"
                                            placeholder="Enter event subject"
                                            value={eventData.subject}
                                            onChange={(e) => setEventData({ ...eventData, subject: e.target.value })}
                                        />

                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <FormControl fullWidth>
                                                    <InputLabel>Event Category</InputLabel>
                                                    <Select
                                                        label="Event Category"
                                                        value={eventData.event_category}
                                                        onChange={(e) => setEventData({ ...eventData, event_category: e.target.value as string })}
                                                    >
                                                        <MenuItem value="Event">Event</MenuItem>
                                                        <MenuItem value="Meeting">Meeting</MenuItem>
                                                        <MenuItem value="Call">Call</MenuItem>
                                                        <MenuItem value="Todo">Todo</MenuItem>
                                                        <MenuItem value="Email">Email</MenuItem>
                                                        <MenuItem value="Other">Other</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <FormControl fullWidth>
                                                    <InputLabel>Status</InputLabel>
                                                    <Select
                                                        label="Status"
                                                        value={eventData.status}
                                                        onChange={(e) => setEventData({ ...eventData, status: e.target.value as string })}
                                                    >
                                                        <MenuItem value="Open">Open</MenuItem>
                                                        <MenuItem value="Scheduled">Scheduled</MenuItem>
                                                        <MenuItem value="Completed">Completed</MenuItem>
                                                        <MenuItem value="Closed">Closed</MenuItem>
                                                        <MenuItem value="Cancelled">Cancelled</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                        </Grid>
                                    </Stack>
                                </Box>

                                {/* Schedule Details Section */}
                                <Box>
                                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                        Schedule Details
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <DateTimePicker
                                                label="Starts On"
                                                value={eventData.starts_on ? dayjs(eventData.starts_on) : null}
                                                onChange={(newValue) => setEventData({ ...eventData, starts_on: newValue ? newValue.format('YYYY-MM-DD HH:mm:ss') : '' })}
                                                slotProps={{ textField: { fullWidth: true } }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <DateTimePicker
                                                label="Ends On"
                                                value={eventData.ends_on ? dayjs(eventData.ends_on) : null}
                                                onChange={(newValue) => setEventData({ ...eventData, ends_on: newValue ? newValue.format('YYYY-MM-DD HH:mm:ss') : '' })}
                                                slotProps={{ textField: { fullWidth: true } }}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Description Section */}
                                <Box>
                                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                        Description
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        label="Details"
                                        placeholder="Enter event details..."
                                        value={eventData.description}
                                        onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                                    />
                                </Box>
                            </Box>
                        </LocalizationProvider>
                    </DialogContent>

                    <DialogActions sx={{ p: 3, pt: 2, gap: 1.5 }}>
                        {selectedEvent && canDeleteEvent && (
                            <Button color="error" variant="outlined" onClick={() => setConfirmDelete({ open: true, id: selectedEvent.name })} sx={{ mr: 'auto', borderRadius: 1 }}>
                                Delete
                            </Button>
                        )}
                        {((!selectedEvent && canCreateEvent) || (selectedEvent && canEditEvent)) && (
                            <Button
                                variant="contained"
                                color="info"
                                onClick={handleSaveEvent}
                                sx={{ borderRadius: 1, px: 3 }}
                            >
                                {selectedEvent ? 'Save Changes' : 'Create Event'}
                            </Button>
                        )}
                    </DialogActions>
                </Dialog>

                <ConfirmDialog
                    open={confirmDelete.open}
                    onClose={() => setConfirmDelete({ open: false, id: null })}
                    title="Confirm Delete"
                    content="Are you sure you want to delete this event?"
                    action={
                        <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                            Delete
                        </Button>
                    }
                />

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={(event, reason) => {
                        if (reason === 'clickaway') return;
                        setSnackbar((prev) => ({ ...prev, open: false }));
                    }}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    sx={{ pointerEvents: 'none' }}
                >
                    <Alert
                        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                        severity={snackbar.severity}
                        sx={{ width: '100%', pointerEvents: 'auto' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>

                {/* Event Type Selection Dialog */}
                <Dialog open={openTypeDialog} onClose={() => setOpenTypeDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2, boxShadow: (t) => t.customShadows.z24, } }}>
                    <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Choose Event Type
                        <IconButton onClick={() => setOpenTypeDialog(false)} sx={{ color: 'text.secondary' }}>
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ py: 2 }}>
                            {[
                                {
                                    label: 'Calls',
                                    icon: `${CONFIG.assetsDir}/images/calls-3d-white.png`,
                                    color: 'primary',
                                    sub: 'Schedule a call',
                                    handler: handleOpenCallDialog,
                                },
                                {
                                    label: 'Meeting',
                                    icon: `${CONFIG.assetsDir}/images/meeting-3d-white.png`,
                                    color: 'success',
                                    sub: 'Schedule a meeting',
                                    handler: handleOpenMeetingDialog,
                                },
                                {
                                    label: 'To-do',
                                    icon: `${CONFIG.assetsDir}/images/todo-3d-white.png`,
                                    color: 'warning',
                                    sub: 'Create a task',
                                    handler: handleOpenTodoDialog,
                                },
                            ].map((item) => (
                                <Grid key={item.label} size={{ xs: 12, md: 4 }}>
                                    <Box
                                        onClick={item.handler}
                                        sx={{
                                            p: 3,
                                            borderRadius: 2.5,
                                            cursor: 'pointer',
                                            transition: theme.transitions.create(['all'], {
                                                duration: theme.transitions.duration.shorter,
                                            }),
                                            textAlign: 'center',
                                            bgcolor: alpha(theme.palette[item.color as 'primary' | 'success' | 'warning' | 'info'].main, 0.04),
                                            border: `1px solid ${alpha(theme.palette[item.color as 'primary' | 'success' | 'warning' | 'info'].main, 0.1)}`,
                                            backdropFilter: 'blur(12px) saturate(160%)',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette[item.color as 'primary' | 'success' | 'warning' | 'info'].main, 0.08),
                                                borderColor: theme.palette[item.color as 'primary' | 'success' | 'warning' | 'info'].main,
                                                transform: 'translateY(-6px)',
                                                boxShadow: `0 12px 24px -4px ${alpha(theme.palette[item.color as 'primary' | 'success' | 'warning' | 'info'].main, 0.16)}`,
                                                '& img': {
                                                    transform: 'scale(1.1) rotate(5deg)',
                                                }
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                mb: 1,
                                                display: 'inline-flex',
                                                transition: theme.transitions.create(['transform']),
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={item.icon}
                                                sx={{
                                                    width: 80,
                                                    height: 80,
                                                    objectFit: 'contain',
                                                    mixBlendMode: 'multiply',
                                                    filter: 'contrast(1.2) brightness(1.1)',
                                                    transition: theme.transitions.create(['transform']),
                                                }}
                                            />
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{item.label}</Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.813rem' }}>
                                            {item.sub}
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </DialogContent>
                </Dialog>

                <CallDialog
                    open={openCallDialog}
                    onClose={handleCloseCallDialog}
                    selectedCall={selectedCallDoc}
                    initialData={selectedDate ? { call_start_time: selectedDate } : undefined}
                    onSuccess={loadEvents}
                    canEdit={canEditEvent}
                    canDelete={canDeleteEvent}
                />

                <MeetingDialog
                    open={openMeetingDialog}
                    onClose={handleCloseMeetingDialog}
                    selectedMeeting={selectedMeetingDoc}
                    initialData={selectedDate ? { from: selectedDate, to: dayjs(selectedDate).add(1, 'hour').format('YYYY-MM-DDTHH:mm') } : undefined}
                    onSuccess={loadEvents}
                    canEdit={canEditEvent}
                    canDelete={canDeleteEvent}
                />

                <TodoDialog
                    open={openTodoDialog}
                    onClose={handleCloseTodoDialog}
                    selectedTodo={selectedTodoDoc}
                    initialData={selectedDate ? { date: selectedDate.split('T')[0] } : undefined}
                    onSuccess={loadEvents}
                    canEdit={canEditEvent}
                    canDelete={canDeleteEvent}
                />

                <EventDetailsDialog
                    open={openDetailsDialog}
                    onClose={() => {
                        setOpenDetailsDialog(false);
                        const eventIdToReopen = clickedEvent?.name || selectedDetailsEvent?.name || restoreNavState?.eventId;
                        setSelectedDetailsEvent(null);
                        setRestoreNavState(null);
                        if (eventIdToReopen) {
                            setTimeout(() => {
                                const element = document.querySelector(`.b-cal-event-wrap[data-event-id="${eventIdToReopen}"]`) || document.querySelector(`[data-event-id="${eventIdToReopen}"]`);
                                if (element) {
                                    setPopoverAnchorEl(element as HTMLElement);
                                } else {
                                    setTimeout(() => {
                                        const retryEl = document.querySelector(`.b-cal-event-wrap[data-event-id="${eventIdToReopen}"]`) || document.querySelector(`[data-event-id="${eventIdToReopen}"]`);
                                        if (retryEl) {
                                            setPopoverAnchorEl(retryEl as HTMLElement);
                                        }
                                    }, 200);
                                }
                            }, 100);
                        }
                    }}
                    eventId={selectedDetailsEvent ? selectedDetailsEvent.name : null}
                    eventRefType={selectedDetailsEvent ? selectedDetailsEvent.reference_doctype : null}
                    eventRefName={selectedDetailsEvent ? selectedDetailsEvent.reference_docname : null}
                    initialOpenClientDetails={Boolean(restoreNavState?.openContactId)}
                    initialClientTab={restoreNavState?.activeTab}
                    initialContactId={restoreNavState?.openContactId}
                />

                <Popover
                    open={Boolean(popoverAnchorEl)}
                    anchorEl={popoverAnchorEl}
                    onClose={handleClosePopover}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    PaperProps={{
                        sx: {
                            p: 2.5,
                            width: 380,
                            borderRadius: 3,
                            boxShadow: (t) => t.customShadows?.z24 || '0 12px 24px -4px rgba(0,0,0,0.12)',
                            border: '1px solid',
                            borderColor: 'divider',
                            backdropFilter: 'blur(8px)',
                        },
                    }}
                >
                    {clickedEvent && (() => {
                        const isCompleted = (clickedEvent.status || '').toLowerCase() === 'completed' || (clickedEvent.status || '').toLowerCase() === 'closed';
                        const showDuration = isCompleted;

                        return (
                            <Stack spacing={2}>
                                {/* Header */}
                                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                                    <Typography variant="subtitle1" sx={{
                                        fontWeight: 700,
                                        flexGrow: 1,
                                        wordBreak: 'break-word'
                                    }}>
                                        {clickedEvent.subject}
                                    </Typography>
                                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ pt: 0.25 }}>
                                        <IconButton size="small" onClick={() => {
                                            if (calendarRef.current?.instance) {
                                                const calendar = calendarRef.current.instance;
                                                const dateObj = calendar.date instanceof Date ? calendar.date : new Date(calendar.date);
                                                sessionStorage.setItem('calendar_saved_date', dateObj.toISOString());
                                                sessionStorage.setItem('calendar_saved_mode', calendar.mode || 'month');
                                            }
                                            sessionStorage.setItem('calendar_saved_filter', eventTypeFilter || 'All');
                                            sessionStorage.setItem('calendar_reopen_event_id', clickedEvent?.name || '');

                                            setPopoverAnchorEl(null);
                                            setSelectedDetailsEvent(clickedEvent);
                                            setOpenDetailsDialog(true);
                                        }} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                                            <Iconify icon="solar:eye-bold" width={20} />
                                        </IconButton>
                                        {canEditEvent && (
                                            <IconButton size="small" onClick={() => handleOpenEditDialog(clickedEvent)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                                                <Iconify icon="solar:pen-bold" width={20} />
                                            </IconButton>
                                        )}
                                        {canDeleteEvent && (
                                            <IconButton size="small" onClick={handleDeleteClick} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                                                <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                                            </IconButton>
                                        )}
                                        <IconButton size="small" onClick={handleClosePopover} sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}>
                                            <Iconify icon="mingcute:close-line" width={20} />
                                        </IconButton>
                                    </Stack>
                                </Stack>

                                {/* Start Date */}
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Box sx={{ width: 44, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', textAlign: 'center', flexShrink: 0 }}>
                                        <Box sx={{ bgcolor: 'info.main', color: 'common.white', fontSize: '0.688rem', fontWeight: 700, py: 0.25, textTransform: 'uppercase' }}>
                                            {dayjs(clickedEvent.starts_on).format('MMM')}
                                        </Box>
                                        <Box sx={{ bgcolor: 'background.neutral', color: 'text.primary', fontSize: '0.938rem', fontWeight: 700, py: 0.5 }}>
                                            {dayjs(clickedEvent.starts_on).format('D')}
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                        {dayjs(clickedEvent.starts_on).format('MMM D, YYYY h:mm A')}
                                    </Typography>
                                </Stack>

                                {/* End Date */}
                                {clickedEvent.ends_on && clickedEvent.ends_on !== clickedEvent.starts_on && (
                                    <Stack direction="row" alignItems="center" spacing={2}>
                                        <Box sx={{ width: 44, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', textAlign: 'center', flexShrink: 0 }}>
                                            <Box sx={{ bgcolor: 'info.main', color: 'common.white', fontSize: '0.688rem', fontWeight: 700, py: 0.25, textTransform: 'uppercase' }}>
                                                {dayjs(clickedEvent.ends_on).format('MMM')}
                                            </Box>
                                            <Box sx={{ bgcolor: 'background.neutral', color: 'text.primary', fontSize: '0.938rem', fontWeight: 700, py: 0.5 }}>
                                                {dayjs(clickedEvent.ends_on).format('D')}
                                            </Box>
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                            {dayjs(clickedEvent.ends_on).format('MMM D, YYYY h:mm A')}
                                        </Typography>
                                    </Stack>
                                )}

                                {/* Duration */}
                                {showDuration && (
                                    <Stack direction="row" alignItems="center" spacing={2} sx={{ pl: 0.5 }}>
                                        <Iconify icon="solar:clock-circle-bold" sx={{ color: 'text.secondary', width: 24, height: 24, flexShrink: 0 }} />
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                            {(() => {
                                                const start = dayjs(clickedEvent.starts_on);
                                                const end = dayjs(clickedEvent.ends_on || clickedEvent.starts_on);
                                                const diffMinutes = end.diff(start, 'minute');
                                                const hours = Math.floor(diffMinutes / 60);
                                                const minutes = diffMinutes % 60;
                                                let durationStr = '';
                                                if (hours > 0) {
                                                    durationStr += `${hours} hour${hours > 1 ? 's' : ''}`;
                                                }
                                                if (minutes > 0) {
                                                    if (durationStr) durationStr += ', ';
                                                    durationStr += `${minutes} minute${minutes > 1 ? 's' : ''}`;
                                                }
                                                return durationStr || '0 minutes';
                                            })()}
                                        </Typography>
                                    </Stack>
                                )}
                            </Stack>
                        );
                    })()}
                </Popover>
            </DashboardContent>
        </>
    );
}
