
import dayjs from 'dayjs';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useState, useEffect, useCallback } from 'react';
import interactionPlugin from '@fullcalendar/interaction';

import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import { Box, Card, Alert, Button, Snackbar } from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';
import { type Meeting, fetchMeetings, updateMeeting, deleteMeeting } from 'src/api/meetings';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import MeetingDialog from '../meeting-dialog';

// ----------------------------------------------------------------------

export function MeetingsView() {
    const theme = useTheme();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const loadMeetings = useCallback(async (start?: Date, end?: Date) => {
        try {
            const startStr = start?.toISOString();
            const endStr = end?.toISOString();
            const data = await fetchMeetings(startStr, endStr);
            setMeetings(data);
        } catch (error) {
            console.error('Failed to load meetings:', error);
        }
    }, []);

    useEffect(() => {
        loadMeetings();
    }, [loadMeetings]);

    const handleDatesSet = (arg: any) => {
        loadMeetings(arg.start, arg.end);
    };

    const handleEventClick = (info: any) => {
        const meetingId = info.event.id;
        const meeting = meetings.find(m => m.name === meetingId);
        if (meeting) {
            setSelectedMeeting(meeting);
            setOpenDialog(true);
        }
    };

    const handleNewMeeting = () => {
        setSelectedMeeting(null);
        setOpenDialog(true);
    };

    const handleEventDrop = async (info: any) => {
        const { event } = info;
        try {
            await updateMeeting(event.id, {
                from: dayjs(event.start).format('YYYY-MM-DD HH:mm:ss'),
                to: event.end ? dayjs(event.end).format('YYYY-MM-DD HH:mm:ss') : undefined
            });
            loadMeetings();
        } catch (error: any) {
            console.error('Failed to update meeting position:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to update meeting position', severity: 'error' });
            info.revert();
        }
    };

    const handleEventResize = async (info: any) => {
        const { event } = info;
        try {
            await updateMeeting(event.id, {
                from: dayjs(event.start).format('YYYY-MM-DD HH:mm:ss'),
                to: event.end ? dayjs(event.end).format('YYYY-MM-DD HH:mm:ss') : undefined
            });
            loadMeetings();
        } catch (error: any) {
            console.error('Failed to update meeting duration:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to update meeting duration', severity: 'error' });
            info.revert();
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedMeeting) return;
        try {
            await deleteMeeting(selectedMeeting.name);
            setOpenDialog(false);
            setConfirmDelete({ open: false, id: null });
            loadMeetings();
            setSnackbar({ open: true, message: 'Meeting deleted successfully', severity: 'success' });
        } catch (error: any) {
            console.error('Failed to delete meeting:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to delete meeting', severity: 'error' });
        }
    };

    const calendarEvents = meetings.map(meeting => ({
        id: meeting.name,
        title: meeting.title || 'Untitled Meeting',
        start: meeting.from,
        end: meeting.to,
        color: meeting.outgoing_call_status === 'Completed' ? theme.palette.success.main : theme.palette.warning.main,
    }));

    return (
        <DashboardContent maxWidth={false} sx={{mt: 2}}>
            <Card
                sx={{
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <CardHeader
                    title="Meetings Calendar"
                    subheader="Manage your scheduled meetings"
                    action={
                        <Button variant="contained" onClick={handleNewMeeting} startIcon={<Iconify icon="mingcute:add-line" />}>
                            New Meeting
                        </Button>
                    }
                    sx={{ mb: 1 }}
                />

                <Box
                    sx={{
                        p: 3,
                        pt: 0,
                        '& .fc': {
                            '--fc-border-color': theme.palette.divider,
                            '--fc-daygrid-event-dot-width': '8px',
                            '--fc-list-event-dot-width': '10px',
                            '--fc-today-bg-color': theme.palette.primary.lighter,
                        },
                        '& .fc .fc-toolbar': {
                            mb: 3,
                            gap: 1.5,
                            flexDirection: { xs: 'column', md: 'row' },
                            '& .fc-toolbar-title': {
                                fontSize: '1.25rem',
                                fontWeight: 700,
                            },
                        },
                        '& .fc .fc-button': {
                            border: 'none',
                            py: '8px',
                            px: '12px',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            backgroundColor: theme.palette.background.neutral,
                            color: theme.palette.text.primary,
                            transition: theme.transitions.create(['background-color', 'color', 'box-shadow']),
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                            },
                            '&:focus': {
                                boxShadow: 'none',
                            },
                            '&.fc-button-active': {
                                backgroundColor: '#059669',
                                color: theme.palette.common.white,
                                '&:hover': {
                                    backgroundColor: '#068eb1',
                                },
                            },
                            '&.fc-today-button': {
                                border: `1px solid #059669`,
                                '&:disabled': {
                                    opacity: 0.48,
                                },
                            },
                        },
                        '& .fc .fc-col-header-cell': {
                            py: 1.5,
                            backgroundColor: '#059669',
                            color: theme.palette.common.white,
                            '&:first-of-type': {
                                borderTopLeftRadius: '12px',
                            },
                            '&:last-of-type': {
                                borderTopRightRadius: '12px',
                            },
                            '& .fc-col-header-cell-cushion': {
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: 700,
                            },
                        },
                        '& .fc-view-harness': {
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: `1px solid ${theme.palette.divider}`,
                        },
                        '& .fc-scrollgrid': {
                            border: 'none',
                        },
                        '& .fc .fc-daygrid-day': {
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                            },
                        },
                        '& .fc .fc-daygrid-day-number': {
                            p: 1.5,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                        },
                        '& .fc .fc-event': {
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            mx: '4px',
                            my: '1px',
                            p: '2px 4px',
                            cursor: 'pointer',
                        },
                        '& .fc .fc-daygrid-event': {
                            boxShadow: 'none',
                        },
                        '& .fc .fc-list': {
                            border: 'none',
                            '& .fc-list-day-cushion': {
                                backgroundColor: theme.palette.background.neutral,
                            },
                        },
                    }}
                >
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                        }}
                        initialView="dayGridMonth"
                        editable
                        selectable
                        selectMirror
                        dayMaxEvents={3}
                        weekends
                        events={calendarEvents}
                        datesSet={handleDatesSet}
                        eventClick={handleEventClick}
                        eventDrop={handleEventDrop}
                        eventResize={handleEventResize}
                        select={(info) => {
                            setSelectedMeeting(null);
                            setOpenDialog(true);
                        }}
                        height="auto"
                        eventDisplay="block"
                        eventTimeFormat={{
                            hour: 'numeric',
                            minute: '2-digit',
                            meridiem: 'short',
                        }}
                        views={{
                            dayGridMonth: {
                                titleFormat: { year: 'numeric', month: 'long' },
                            },
                            timeGridWeek: {
                                titleFormat: { year: 'numeric', month: 'short', day: 'numeric' },
                            },
                            timeGridDay: {
                                titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                            },
                        }}
                    />
                </Box>
            </Card>

            <MeetingDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                selectedMeeting={selectedMeeting}
                onSuccess={loadMeetings}
            />

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this meeting?"
                action={
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}
