import dayjs from 'dayjs';
import {  IoMdTrash } from "react-icons/io";
import { useState, useEffect } from 'react';

import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, styled } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { createFilterOptions } from '@mui/material/Autocomplete';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Box, Grid, Stack, Alert, Button, Switch, Snackbar, IconButton, Typography, Autocomplete, FormControlLabel, Card } from '@mui/material';

import { stripHtml } from 'src/utils/string';
import { getFriendlyErrorMessage } from 'src/utils/error-handler';

import { getDoctypeList } from 'src/api/leads';
import { createMeetingStatus, fetchMeetingStatuses } from 'src/api/masters';
import { type Meeting, createMeeting, updateMeeting, deleteMeeting, getMeeting } from 'src/api/meetings';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import MeetingNoteDialog from './meeting-note-dialog';

// ----------------------------------------------------------------------

const filter = createFilterOptions<any>();

const Android12Switch = styled(Switch)(({ theme }) => ({
    padding: 8,
    '& .MuiSwitch-track': {
        borderRadius: 22 / 2,
        '&::before, &::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 16,
            height: 16,
        },
        '&::before': {
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
                '#fff',
            )}" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>')`,
            left: 12,
        }
    },
    '& .MuiSwitch-thumb': {
        boxShadow: 'none',
        width: 16,
        height: 16,
        margin: 2,
    },
}));

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    selectedMeeting?: Meeting | null;
    initialData?: Partial<Meeting>;
    onSuccess?: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
};

const INITIAL_MEETING_STATE: Partial<Meeting> = {
    title: '',
    meet_for: 'Lead',
    lead_name: '',
    accounts_name: '',
    enter_id: '',
    outgoing_call_status: 'Scheduled',
    completed_meet_status: '',
    from: '',
    to: '',
    meeting_venue: 'In Office',
    location: '',
    completed_meet_notes: '',
    enable_reminder: 0,
    remind_before_minutes: 60,
    host: '',
    participants: [],
};

export default function MeetingDialog({ open, onClose, selectedMeeting, initialData, onSuccess, canEdit = true, canDelete = true }: Props) {
    const [meetingData, setMeetingData] = useState<Partial<Meeting>>(INITIAL_MEETING_STATE);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [openNoteDialog, setOpenNoteDialog] = useState(false);
    const [selectedNote, setSelectedNote] = useState<any>(null);

    const handleSaveNote = async (noteTitle: string, noteDescription: string) => {
        if (!selectedMeeting) return;

        let updatedNotes = [];
        const currentNotes = meetingData.meeting_notes || [];
        if (selectedNote && selectedNote.name) {
            // Edit mode
            updatedNotes = currentNotes.map((n: any) =>
                n.name === selectedNote.name ? { ...n, title: noteTitle, description: noteDescription } : n
            );
        } else {
            // Create mode
            updatedNotes = [...currentNotes, { title: noteTitle, description: noteDescription }];
        }

        const payload = {
            ...meetingData,
            meeting_notes: updatedNotes,
        };

        const formattedPayload = {
            ...payload,
            from: payload.from?.replace('T', ' '),
            to: payload.to?.replace('T', ' ') || undefined,
        };

        await updateMeeting(selectedMeeting.name, formattedPayload);
        
        // Refresh meeting details
        const refreshedMeeting = await getMeeting(selectedMeeting.name);
        setMeetingData({
            ...refreshedMeeting,
            from: refreshedMeeting.from.replace(' ', 'T'),
            to: refreshedMeeting.to?.replace(' ', 'T') || '',
            completed_meet_notes: stripHtml(refreshedMeeting.completed_meet_notes || ''),
            meeting_notes: refreshedMeeting.meeting_notes || [],
        });

        setSnackbar({
            open: true,
            message: selectedNote ? 'Note updated successfully' : 'Note added successfully',
            severity: 'success'
        });
    };

    const handleDeleteNote = async (noteToDelete: any) => {
        if (!selectedMeeting) return;

        const currentNotes = meetingData.meeting_notes || [];
        const updatedNotes = currentNotes.filter((n: any) => n.name !== noteToDelete.name);

        const payload = {
            ...meetingData,
            meeting_notes: updatedNotes,
        };

        const formattedPayload = {
            ...payload,
            from: payload.from?.replace('T', ' '),
            to: payload.to?.replace('T', ' ') || undefined,
        };

        await updateMeeting(selectedMeeting.name, formattedPayload);
        
        // Refresh meeting details
        const refreshedMeeting = await getMeeting(selectedMeeting.name);
        setMeetingData({
            ...refreshedMeeting,
            from: refreshedMeeting.from.replace(' ', 'T'),
            to: refreshedMeeting.to?.replace(' ', 'T') || '',
            completed_meet_notes: stripHtml(refreshedMeeting.completed_meet_notes || ''),
            meeting_notes: refreshedMeeting.meeting_notes || [],
        });

        setSnackbar({
            open: true,
            message: 'Note deleted successfully',
            severity: 'success'
        });
    };

    const [confirmDelete, setConfirmDelete] = useState(false);

    const [formErrors, setFormErrors] = useState<{ [key: string]: boolean }>({});

    const [leadOptions, setLeadOptions] = useState<any[]>([]);
    const [contactOptions, setContactOptions] = useState<any[]>([]);
    const [accountOptions, setAccountOptions] = useState<any[]>([]);
    const [userOptions, setUserOptions] = useState<any[]>([]);
    const [meetingStatusOptions, setMeetingStatusOptions] = useState<string[]>([]);
    const [createMeetingStatusOpen, setCreateMeetingStatusOpen] = useState(false);
    const [newMeetingStatusName, setNewMeetingStatusName] = useState('');
    const [creatingMeetingStatus, setCreatingMeetingStatus] = useState(false);

    const handleCreateMeetingStatusSubmit = async () => {
        if (!newMeetingStatusName.trim()) return;
        try {
            setCreatingMeetingStatus(true);
            await createMeetingStatus({ meeting_status: newMeetingStatusName.trim(), status: 'Active' });
            setMeetingStatusOptions((prev) => [...prev, newMeetingStatusName.trim()]);
            setMeetingData((prev) => ({ ...prev, completed_meet_status: newMeetingStatusName.trim() }));
            setCreateMeetingStatusOpen(false);
            setSnackbar({ open: true, message: 'Meeting Status created successfully', severity: 'success' });
        } catch (err: any) {
            console.error(err);
            const friendlyMsg = getFriendlyErrorMessage(err);
            setSnackbar({ open: true, message: friendlyMsg, severity: 'error' });
        } finally {
            setCreatingMeetingStatus(false);
        }
    };

    useEffect(() => {
        if (open) {
            getDoctypeList('Lead', ['name', 'lead_name', 'converted_contact', 'converted_account']).then(setLeadOptions);
            getDoctypeList('Contacts', ['name', 'first_name', 'last_name']).then(setContactOptions);
            getDoctypeList('Accounts', ['name', 'account_name']).then(setAccountOptions);
            getDoctypeList('User', ['name', 'full_name']).then((users) => {
                setUserOptions(users.filter((u: any) => u.name !== 'Administrator' && u.name !== 'Guest'));
            });
            fetchMeetingStatuses({
                page: 1,
                page_size: 1000,
                filters: [['Meeting Status', 'status', '=', 'Active']]
            }).then((res) => {
                const options = (res.data || []).map((item: any) => item.meeting_status);
                setMeetingStatusOptions(options);
            }).catch(console.error);
        }
    }, [open]);

    useEffect(() => {
        if (selectedMeeting) {
            getMeeting(selectedMeeting.name)
                .then((fullMeeting) => {
                    setMeetingData({
                        title: fullMeeting.title,
                        meet_for: fullMeeting.meet_for || 'Lead',
                        outgoing_call_status: fullMeeting.outgoing_call_status || 'Scheduled',
                        completed_meet_status: fullMeeting.completed_meet_status || '',
                        enter_id: fullMeeting.enter_id || '',
                        from: fullMeeting.from.replace(' ', 'T'),
                        to: fullMeeting.to?.replace(' ', 'T') || '',
                        meeting_venue: fullMeeting.meeting_venue || 'In Office',
                        location: fullMeeting.location || '',
                        completed_meet_notes: stripHtml(fullMeeting.completed_meet_notes || ''),
                        lead_name: fullMeeting.lead_name || '',
                        contact_name: fullMeeting.contact_name || '',
                        accounts_name: fullMeeting.accounts_name || '',
                        enable_reminder: fullMeeting.enable_reminder || 0,
                        remind_before_minutes: fullMeeting.remind_before_minutes || 60,
                        host: fullMeeting.host || '',
                        participants: fullMeeting.participants || [],
                        meeting_notes: fullMeeting.meeting_notes || [],
                    });
                })
                .catch(console.error);
        } else if (initialData) {
            setMeetingData({
                ...INITIAL_MEETING_STATE,
                ...initialData,
            });
        } else {
            setMeetingData({
                ...INITIAL_MEETING_STATE,
                from: dayjs().format('YYYY-MM-DDTHH:mm')
            });
        }
    }, [selectedMeeting, initialData, open]);

    const handleSaveMeeting = async () => {
        const errors: { [key: string]: boolean } = {};
        if (!meetingData.title) errors.title = true;

        if (meetingData.meet_for === 'Lead' && !meetingData.lead_name) errors.lead_name = true;
        if (meetingData.meet_for === 'Contact' && !meetingData.contact_name) errors.contact_name = true;
        if (meetingData.meet_for === 'Accounts' && !meetingData.accounts_name) errors.accounts_name = true;

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
            return;
        }

        try {
            setIsSubmitting(true);
            const formattedData = {
                ...meetingData,
                from: meetingData.from?.replace('T', ' '),
                to: meetingData.to?.replace('T', ' ') || undefined,
            };

            if (selectedMeeting) {
                await updateMeeting(selectedMeeting.name, formattedData);
            } else {
                await createMeeting(formattedData);
            }

            onClose();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('Failed to save meeting:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to save meeting', severity: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedMeeting) return;
        try {
            await deleteMeeting(selectedMeeting.name);
            setConfirmDelete(false);
            onClose();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('Failed to delete meeting:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to delete meeting', severity: 'error' });
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth={selectedMeeting ? "lg" : "md"} PaperProps={{ sx: { borderRadius: 2, boxShadow: (theme) => theme.customShadows.z24,}}}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {selectedMeeting ? 'Edit Meeting' : 'New Meeting'}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ borderBottom: 'none', px: 4, pb: 0 }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Grid container spacing={4} sx={{ py: 2 }}>
                            <Grid size={{ xs: 12, md: selectedMeeting ? 8 : 12 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {/* General Section */}
                            <Box>
                                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                    General Information
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                    <TextField
                                        required
                                        fullWidth
                                        error={!!formErrors.title}
                                        helperText={formErrors.title ? 'Title is required' : ''}
                                        label="Title"
                                        placeholder="Enter meeting title"
                                        value={meetingData.title}
                                        onChange={(e) => {
                                            setMeetingData({ ...meetingData, title: e.target.value });
                                            if (formErrors.title) setFormErrors({ ...formErrors, title: false });
                                        }}
                                    />

                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <FormControl fullWidth required>
                                                <InputLabel>Meet For</InputLabel>
                                                <Select
                                                    required
                                                    label="Meet For"
                                                    value={meetingData.meet_for}
                                                    MenuProps={{
                                                        PaperProps: {
                                                            sx: { '& .MuiMenuItem-root': { fontSize: '0.9rem' } }
                                                        }
                                                    }}
                                                    onChange={(e) => setMeetingData({
                                                        ...meetingData,
                                                        meet_for: e.target.value as string,
                                                        lead_name: '',
                                                        contact_name: '',
                                                        accounts_name: ''
                                                    })}
                                                >
                                                    <MenuItem value="Lead">Lead</MenuItem>
                                                    <MenuItem value="Contact">Client</MenuItem>
                                                    <MenuItem value="Accounts">Company</MenuItem>
                                                    <MenuItem value="Others">Others</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        {meetingData.meet_for === 'Others' && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Enter ID"
                                                    placeholder="Enter other ID"
                                                    value={meetingData.enter_id}
                                                    onChange={(e) => setMeetingData({ ...meetingData, enter_id: e.target.value })}
                                                />
                                            </Grid>
                                        )}

                                        {meetingData.meet_for === 'Lead' && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    fullWidth
                                                    options={leadOptions}
                                                    ListboxProps={{
                                                        sx: { '& .MuiAutocomplete-option': { fontSize: '0.9rem' } }
                                                    }}
                                                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.lead_name} (${option.name})`}
                                                    value={leadOptions.find(opt => opt.name === meetingData.lead_name) || null}
                                                    onChange={(_, newValue) => {
                                                        setMeetingData({
                                                            ...meetingData,
                                                            lead_name: newValue?.name || '',
                                                            contact_name: newValue?.converted_contact || '',
                                                            accounts_name: newValue?.converted_account || ''
                                                        });
                                                    }}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Select Lead"
                                                            required
                                                            error={!!formErrors.lead_name}
                                                            helperText={formErrors.lead_name ? 'Lead is required' : ''}
                                                        />
                                                    )}
                                                    renderOption={(props, option) => (
                                                        <li {...props} key={typeof option === 'string' ? option : option.name}>
                                                            <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                                                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                                                    {typeof option === 'string' ? option : option.lead_name}
                                                                </Typography>
                                                                {typeof option !== 'string' && option.name && (
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                        ID: {option.name}
                                                                    </Typography>
                                                                )}
                                                            </Stack>
                                                        </li>
                                                    )}
                                                />
                                            </Grid>
                                        )}

                                        {meetingData.meet_for === 'Contact' && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    fullWidth
                                                    options={contactOptions}
                                                    ListboxProps={{
                                                        sx: { '& .MuiAutocomplete-option': { fontSize: '0.9rem' } }
                                                    }}
                                                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.first_name || ''} ${option.last_name || ''} (${option.name})`.trim()}
                                                    value={contactOptions.find(opt => opt.name === meetingData.contact_name) || null}
                                                    onChange={(_, newValue) => setMeetingData({ ...meetingData, contact_name: newValue?.name || '' })}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Select Client"
                                                            required
                                                            error={!!formErrors.contact_name}
                                                            helperText={formErrors.contact_name ? 'Client is required' : ''}
                                                        />
                                                    )}
                                                    renderOption={(props, option) => (
                                                        <li {...props} key={typeof option === 'string' ? option : option.name}>
                                                            <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                                                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                                                    {typeof option === 'string' ? option : `${option.first_name || ''} ${option.last_name || ''}`.trim()}
                                                                </Typography>
                                                                {typeof option !== 'string' && option.name && (
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                        ID: {option.name}
                                                                    </Typography>
                                                                )}
                                                            </Stack>
                                                        </li>
                                                    )}
                                                />
                                            </Grid>
                                        )}

                                        {meetingData.meet_for === 'Accounts' && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    fullWidth
                                                    options={accountOptions}
                                                    ListboxProps={{
                                                        sx: { '& .MuiAutocomplete-option': { fontSize: '0.9rem' } }
                                                    }}
                                                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.account_name} (${option.name})`}
                                                    value={accountOptions.find(opt => opt.name === meetingData.accounts_name) || null}
                                                    onChange={(_, newValue) => setMeetingData({ ...meetingData, accounts_name: newValue?.name || '' })}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Select Company"
                                                            required
                                                            error={!!formErrors.accounts_name}
                                                            helperText={formErrors.accounts_name ? 'Company is required' : ''}
                                                        />
                                                    )}
                                                    renderOption={(props, option) => (
                                                        <li {...props} key={typeof option === 'string' ? option : option.name}>
                                                            <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                                                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                                                    {typeof option === 'string' ? option : option.account_name}
                                                                </Typography>
                                                                {typeof option !== 'string' && option.name && (
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                        ID: {option.name}
                                                                    </Typography>
                                                                )}
                                                            </Stack>
                                                        </li>
                                                    )}
                                                />
                                            </Grid>
                                        )}

                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <FormControl fullWidth>
                                                <InputLabel>Status</InputLabel>
                                                <Select
                                                    label="Status"
                                                    value={meetingData.outgoing_call_status}
                                                    MenuProps={{
                                                        PaperProps: {
                                                            sx: { '& .MuiMenuItem-root': { fontSize: '0.9rem' } }
                                                        }
                                                    }}
                                                    onChange={(e) => setMeetingData({ ...meetingData, outgoing_call_status: e.target.value as string })}
                                                >
                                                    <MenuItem value="Scheduled">Scheduled</MenuItem>
                                                    <MenuItem value="Completed">Completed</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        {meetingData.outgoing_call_status === 'Completed' && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    fullWidth
                                                    options={meetingStatusOptions}
                                                    value={meetingData.completed_meet_status || null}
                                                    onChange={(_, newValue: any) => {
                                                        if (typeof newValue === 'string') {
                                                            setMeetingData({ ...meetingData, completed_meet_status: newValue });
                                                        } else if (newValue && newValue.isNew) {
                                                            setNewMeetingStatusName(newValue.inputValue);
                                                            setCreateMeetingStatusOpen(true);
                                                        } else {
                                                            setMeetingData({ ...meetingData, completed_meet_status: newValue || '' });
                                                        }
                                                    }}
                                                    filterOptions={(options, params) => {
                                                        const filtered = filter(options, params) as any[];
                                                        const { inputValue } = params;
                                                        const isExisting = options.some((option) => inputValue === option);

                                                        if (inputValue !== '' && !isExisting) {
                                                            filtered.push({
                                                                inputValue,
                                                                label: `+ Create "${inputValue}"`,
                                                                isNew: true,
                                                            });
                                                        } else if (inputValue === '') {
                                                            filtered.push({
                                                                inputValue: '',
                                                                label: '+ Create Meeting Status',
                                                                isNew: true,
                                                            });
                                                        }
                                                        return filtered;
                                                    }}
                                                    getOptionLabel={(option: any) => {
                                                        if (typeof option === 'string') return option;
                                                        if (option.inputValue) return option.inputValue;
                                                        return option.label || '';
                                                    }}
                                                    renderOption={(props, option: any) => {
                                                        const { key, ...optionProps } = props as any;
                                                        return (
                                                            <Box component="li" key={key || (typeof option === 'string' ? option : option.label)} {...optionProps} sx={{
                                                                typography: 'body2',
                                                                ...(option.isNew && {
                                                                    color: 'primary.main',
                                                                    fontWeight: 600,
                                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                                                    mt: 0.5,
                                                                    '&:hover': {
                                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                                                    }
                                                                })
                                                            }}>
                                                                {option.isNew ? (
                                                                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
                                                                        <Iconify icon="solar:add-circle-bold" width={24} />
                                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                                            {option.inputValue ? `Create "${option.inputValue}"` : 'Create Meeting Status'}
                                                                        </Typography>
                                                                    </Stack>
                                                                ) : (
                                                                    option.label || option
                                                                )}
                                                            </Box>
                                                        );
                                                    }}
                                                    renderInput={(params) => <TextField {...params} label="Meeting Status" />}
                                                />
                                            </Grid>
                                        )}
                                    </Grid>
                                </Box>
                            </Box>

                            {/* Schedule Section */}
                            <Box>
                                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                    Time Schedule
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <DateTimePicker
                                            label="From"
                                            format="DD-MM-YYYY hh:mm A"
                                            value={meetingData.from ? dayjs(meetingData.from) : null}
                                            onChange={(newValue) => setMeetingData({ ...meetingData, from: newValue ? newValue.format('YYYY-MM-DD HH:mm:ss') : '' })}
                                            sx={{ width: '100%' }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <DateTimePicker
                                            label="To"
                                            format="DD-MM-YYYY hh:mm A"
                                            value={meetingData.to ? dayjs(meetingData.to) : null}
                                            onChange={(newValue) => setMeetingData({ ...meetingData, to: newValue ? newValue.format('YYYY-MM-DD HH:mm:ss') : '' })}
                                            sx={{ width: '100%' }}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Location Section */}
                            <Box>
                                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                    Location & Venue
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <FormControl fullWidth>
                                            <InputLabel>Venue</InputLabel>
                                            <Select
                                                label="Venue"
                                                value={meetingData.meeting_venue}
                                                onChange={(e) => setMeetingData({ ...meetingData, meeting_venue: e.target.value as string })}
                                            >
                                                <MenuItem value="In Office">In Office</MenuItem>
                                                <MenuItem value="Client Location">Client Location</MenuItem>
                                                <MenuItem value="Online">Online</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="Location"
                                            placeholder="Enter address or link"
                                            value={meetingData.location}
                                            onChange={(e) => setMeetingData({ ...meetingData, location: e.target.value })}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Reminder Section */}
                            {!selectedMeeting && (
                            <Box>
                                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                    Reminder Settings
                                </Typography>
                                <Stack spacing={2}>
                                    <FormControlLabel
                                        control={
                                            <Android12Switch
                                                checked={meetingData.enable_reminder === 1}
                                                onChange={(e) => setMeetingData({ ...meetingData, enable_reminder: e.target.checked ? 1 : 0 })}
                                            />
                                        }
                                        label="Enable Reminder"
                                    />
                                    {meetingData.enable_reminder === 1 && (
                                        <Box>
                                            <TimePicker
                                                label="Remind Before (Time)"
                                                value={dayjs().startOf('day').add(meetingData.remind_before_minutes || 60, 'minutes')}
                                                onChange={(newValue: dayjs.Dayjs | null) => {
                                                    if (newValue) {
                                                        const hours = newValue.hour();
                                                        const minutes = newValue.minute();
                                                        const totalMinutes = hours * 60 + minutes;
                                                        setMeetingData({ ...meetingData, remind_before_minutes: totalMinutes });
                                                    }
                                                }}
                                                ampm={false}
                                                views={['hours', 'minutes']}
                                                format="HH:mm"
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        helperText: 'Set hours and minutes before the meeting'
                                                    }
                                                }}
                                            />
                                        </Box>
                                    )}
                                </Stack>
                            </Box>
                            )}

                            {/* Notes Section */}
                            <Box>
                                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                    Meeting Notes
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="Notes"
                                    placeholder="Write summary or observations..."
                                    value={meetingData.completed_meet_notes}
                                    onChange={(e) => setMeetingData({ ...meetingData, completed_meet_notes: e.target.value })}
                                />
                            </Box>
                                </Box>
                            </Grid>

                            {/* Right Side: Meeting Notes Panel (only in edit mode) */}
                            {selectedMeeting && (
                                <Grid size={{ xs: 12, md: 4 }} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.divider}`, pl: 3 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                                Notes
                                            </Typography>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="info"
                                                startIcon={<Iconify icon="mingcute:add-line" width={18} height={18} />}
                                                onClick={() => { setSelectedNote(null); setOpenNoteDialog(true); }}
                                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                            >
                                                Add Note
                                            </Button>
                                        </Box>

                                        <Box sx={{ overflowY: 'auto', maxHeight: 500, pr: 0.5 }}>
                                            {!meetingData.meeting_notes || meetingData.meeting_notes.length === 0 ? (
                                                <Box sx={{ py: 8, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Iconify icon="solar:notes-bold-duotone" width={56} sx={{ color: 'text.disabled', mb: 2, opacity: 0.6 }} />
                                                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                                                        No Notes Yet
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, maxWidth: 200 }}>
                                                        Click &quot;Add Note&quot; to create your first meeting note.
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Stack spacing={1.5}>
                                                    {[...meetingData.meeting_notes].reverse().map((note: any, index: number) => (
                                                        <Card
                                                            key={note.name || index}
                                                            sx={(() => {
                                                                const palettes = [
                                                                    { light: '#FFFBEB', dark: 'rgba(251,191,36,0.10)', border: '#FDE68A' },
                                                                    { light: '#EFF6FF', dark: 'rgba(96,165,250,0.10)', border: '#BFDBFE' },
                                                                    { light: '#F0FDF4', dark: 'rgba(74,222,128,0.10)', border: '#BBF7D0' },
                                                                    { light: '#FAF5FF', dark: 'rgba(192,132,252,0.10)', border: '#E9D5FF' },
                                                                ];
                                                                const p = palettes[index % palettes.length];
                                                                return {
                                                                    p: 2,
                                                                    borderRadius: 1.5,
                                                                    position: 'relative',
                                                                    boxShadow: 'none',
                                                                    border: (themeVar: any) => `1px solid ${themeVar.palette.mode === 'light' ? p.border : 'rgba(255,255,255,0.08)'}`,
                                                                    bgcolor: (themeVar: any) => themeVar.palette.mode === 'light' ? p.light : p.dark,
                                                                };
                                                            })()}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, flex: 1 }}>
                                                                    {note.title}
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', gap: 0.25, ml: 1 }}>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => { setSelectedNote(note); setOpenNoteDialog(true); }}
                                                                        sx={{ p: 0.5, color: 'primary.main' }}
                                                                    >
                                                                        <Iconify icon="solar:pen-bold" width={16} />
                                                                    </IconButton>
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        onClick={() => handleDeleteNote(note)}
                                                                        sx={{ p: 0.5 }}
                                                                    >
                                                                        <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                                                                    </IconButton>
                                                                </Box>
                                                            </Box>
                                                            <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                                                                {stripHtml(note.description)}
                                                            </Typography>
                                                        </Card>
                                                    ))}
                                                </Stack>
                                            )}
                                        </Box>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </LocalizationProvider>
                </DialogContent>

                <DialogActions sx={{ p: 2.5, pt: 2, gap: 1.5 }}>
                    {selectedMeeting && canDelete && (
                        <Button
                            color="error"
                            variant="contained"
                            onClick={() => setConfirmDelete(true)}
                            startIcon={<IoMdTrash size={20} />}
                            sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', mr:'auto' }}
                        >
                            Delete
                        </Button>
                    )}
                    {((!selectedMeeting && canEdit) || (selectedMeeting && canEdit)) && (
                        <Button
                            variant="contained"
                            color="info"
                            onClick={handleSaveMeeting}
                            disabled={isSubmitting}
                            sx={{ borderRadius: 1, px: 3 }}
                        >
                            {isSubmitting 
                                ? (selectedMeeting ? 'Saving...' : 'Creating...') 
                                : (selectedMeeting ? 'Save Changes' : 'Create Meeting')}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                title="Confirm Delete"
                content="Are you sure you want to delete this meeting?"
                action={
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />

            <Dialog
                open={createMeetingStatusOpen}
                onClose={() => !creatingMeetingStatus && setCreateMeetingStatusOpen(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: { borderRadius: 2 }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Create Meeting Status</Typography>
                    <IconButton
                        onClick={() => !creatingMeetingStatus && setCreateMeetingStatusOpen(false)}
                        sx={{ color: 'text.secondary' }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pb: 2, pt: 1 }}>
                    <TextField
                        fullWidth
                        label="Meeting Status"
                        value={newMeetingStatusName}
                        onChange={(e) => setNewMeetingStatusName(e.target.value)}
                        required
                        autoFocus
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        variant="contained"
                        onClick={handleCreateMeetingStatusSubmit}
                        disabled={creatingMeetingStatus || !newMeetingStatusName.trim()}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        {creatingMeetingStatus ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                style={{ zIndex: 99999 }}
                sx={{ zIndex: 99999 }}
                slotProps={{
                    root: {
                        style: { zIndex: 99999 }
                    }
                }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%', zIndex: 99999 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <MeetingNoteDialog
                open={openNoteDialog}
                onClose={() => { setOpenNoteDialog(false); setSelectedNote(null); }}
                selectedNote={selectedNote}
                onSave={handleSaveNote}
            />
        </>
    );
}
