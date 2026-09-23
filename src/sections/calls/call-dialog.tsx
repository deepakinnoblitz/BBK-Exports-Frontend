import dayjs from 'dayjs';
import { IoMdTrash } from "react-icons/io";
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
import { createCallStatus, fetchCallStatuses } from 'src/api/masters';
import { type Call, createCall, updateCall, deleteCall, getCall } from 'src/api/calls';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import CallNoteDialog from './call-note-dialog';
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
    selectedCall?: Call | null;
    initialData?: Partial<Call>;
    onSuccess?: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
};

const INITIAL_CALL_STATE: Partial<Call> = {
    title: '',
    call_purpose: '',
    call_agenda: '',
    call_for: 'Lead',
    outgoing_call_status: 'Scheduled',
    completed_call_status: '',
    call_start_time: '',
    call_end_time: '',
    lead_name: '',
    account_name: '',
    enter_id: '',
    enable_reminder: 0,
    remind_before_minutes: 60,
    host: '',
    participants: [],
};

export default function CallDialog({ open, onClose, selectedCall, initialData, onSuccess, canEdit = true, canDelete = true }: Props) {
    const [callData, setCallData] = useState<Partial<Call>>(INITIAL_CALL_STATE);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [confirmDelete, setConfirmDelete] = useState(false);

    const [openNoteDialog, setOpenNoteDialog] = useState(false);
    const [selectedNote, setSelectedNote] = useState<any>(null);

    const handleSaveNote = async (noteTitle: string, noteDescription: string) => {
        if (!selectedCall) return;

        let updatedNotes = [];
        const currentNotes = callData.call_notes || [];
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
            ...callData,
            call_notes: updatedNotes,
        };

        await updateCall(selectedCall.name, payload);
        
        // Refresh call details
        const refreshedCall = await getCall(selectedCall.name);
        setCallData({
            ...refreshedCall,
            call_start_time: refreshedCall.call_start_time.replace(' ', 'T'),
            call_end_time: refreshedCall.call_end_time?.replace(' ', 'T') || '',
            call_agenda: stripHtml(refreshedCall.call_agenda || ''),
            call_notes: refreshedCall.call_notes || [],
        });

        setSnackbar({
            open: true,
            message: selectedNote ? 'Note updated successfully' : 'Note added successfully',
            severity: 'success'
        });
    };

    const handleDeleteNote = async (noteToDelete: any) => {
        if (!selectedCall) return;

        const currentNotes = callData.call_notes || [];
        const updatedNotes = currentNotes.filter((n: any) => n.name !== noteToDelete.name);

        const payload = {
            ...callData,
            call_notes: updatedNotes,
        };

        await updateCall(selectedCall.name, payload);
        
        // Refresh call details
        const refreshedCall = await getCall(selectedCall.name);
        setCallData({
            ...refreshedCall,
            call_start_time: refreshedCall.call_start_time.replace(' ', 'T'),
            call_end_time: refreshedCall.call_end_time?.replace(' ', 'T') || '',
            call_agenda: stripHtml(refreshedCall.call_agenda || ''),
            call_notes: refreshedCall.call_notes || [],
        });

        setSnackbar({
            open: true,
            message: 'Note deleted successfully',
            severity: 'success'
        });
    };

    const [formErrors, setFormErrors] = useState<{ [key: string]: boolean }>({});

    const [leadOptions, setLeadOptions] = useState<any[]>([]);
    const [contactOptions, setContactOptions] = useState<any[]>([]);
    const [accountOptions, setAccountOptions] = useState<any[]>([]);
    const [userOptions, setUserOptions] = useState<any[]>([]);
    const [callStatusOptions, setCallStatusOptions] = useState<string[]>([]);
    const [createCallStatusOpen, setCreateCallStatusOpen] = useState(false);
    const [newCallStatusName, setNewCallStatusName] = useState('');
    const [creatingCallStatus, setCreatingCallStatus] = useState(false);

    const handleCreateCallStatusSubmit = async () => {
        if (!newCallStatusName.trim()) return;
        try {
            setCreatingCallStatus(true);
            await createCallStatus({ call_status: newCallStatusName.trim(), status: 'Active' });
            setCallStatusOptions((prev) => [...prev, newCallStatusName.trim()]);
            setCallData((prev) => ({ ...prev, completed_call_status: newCallStatusName.trim() }));
            setCreateCallStatusOpen(false);
            setSnackbar({ open: true, message: 'Call Status created successfully', severity: 'success' });
        } catch (err: any) {
            console.error(err);
            const friendlyMsg = getFriendlyErrorMessage(err);
            setSnackbar({ open: true, message: friendlyMsg, severity: 'error' });
        } finally {
            setCreatingCallStatus(false);
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
            fetchCallStatuses({
                page: 1,
                page_size: 1000,
                filters: [['Call Status', 'status', '=', 'Active']]
            }).then((res) => {
                const options = (res.data || []).map((item: any) => item.call_status);
                setCallStatusOptions(options);
            }).catch(console.error);
        }
    }, [open]);

    useEffect(() => {
        if (selectedCall) {
            getCall(selectedCall.name).then((fullCall) => {
                setCallData({
                    ...fullCall,
                    call_start_time: fullCall.call_start_time.replace(' ', 'T'),
                    call_end_time: fullCall.call_end_time?.replace(' ', 'T') || '',
                    call_agenda: stripHtml(fullCall.call_agenda || ''),
                    call_notes: fullCall.call_notes || [],
                });
            }).catch((err) => {
                console.error("Failed to fetch full call details", err);
                setCallData({
                    title: selectedCall.title,
                    call_purpose: selectedCall.call_purpose || '',
                    call_agenda: stripHtml(selectedCall.call_agenda || ''),
                    call_for: selectedCall.call_for || 'Lead',
                    outgoing_call_status: selectedCall.outgoing_call_status || 'Scheduled',
                    completed_call_status: selectedCall.completed_call_status || '',
                    call_start_time: selectedCall.call_start_time.replace(' ', 'T'),
                    call_end_time: selectedCall.call_end_time?.replace(' ', 'T') || '',
                    lead_name: selectedCall.lead_name || '',
                    contact_name: selectedCall.contact_name || '',
                    account_name: selectedCall.account_name || '',
                    enter_id: selectedCall.enter_id || '',
                    enable_reminder: selectedCall.enable_reminder || 0,
                    remind_before_minutes: selectedCall.remind_before_minutes || 60,
                    host: selectedCall.host || '',
                    participants: selectedCall.participants || [],
                    call_notes: selectedCall.call_notes || [],
                });
            });
        } else if (initialData) {
            setCallData({
                ...INITIAL_CALL_STATE,
                ...initialData,
            });
        } else {
            setCallData({
                ...INITIAL_CALL_STATE,
                call_start_time: dayjs().format('YYYY-MM-DDTHH:mm'),
            });
        }
    }, [selectedCall, initialData, open]);

    const handleSaveCall = async () => {
        const errors: { [key: string]: boolean } = {};
        if (!callData.title) errors.title = true;

        if (callData.call_for === 'Lead' && !callData.lead_name) errors.lead_name = true;
        if (callData.call_for === 'Contact' && !callData.contact_name) errors.contact_name = true;
        if (callData.call_for === 'Accounts' && !callData.account_name) errors.account_name = true;

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
            return;
        }

        try {
            setIsSubmitting(true);
            const formattedData = {
                ...callData,
                call_start_time: callData.call_start_time?.replace('T', ' '),
                call_end_time: callData.call_end_time?.replace('T', ' ') || undefined,
            };

            if (selectedCall) {
                await updateCall(selectedCall.name, formattedData);
            } else {
                await createCall(formattedData);
            }

            onClose();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('Failed to save call:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to save call', severity: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedCall) return;
        try {
            await deleteCall(selectedCall.name);
            setConfirmDelete(false);
            onClose();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('Failed to delete call:', error);
            setSnackbar({ open: true, message: error.message || 'Failed to delete call', severity: 'error' });
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth={selectedCall ? "lg" : "md"} PaperProps={{ sx: { borderRadius: 2, boxShadow: (theme) => theme.customShadows.z24, } }}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {selectedCall ? 'Edit Call' : 'New Call'}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ borderBottom: 'none', px: 4, pb: 0 }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Grid container spacing={4}>
                            <Grid size={{ xs: 12, md: selectedCall ? 8 : 12 }}>
                                <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {/* General Section */}
                            <Box>
                                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                    General Information
                                </Typography>
                                <Stack spacing={2.5}>
                                    <TextField
                                        required
                                        fullWidth
                                        error={!!formErrors.title}
                                        helperText={formErrors.title ? 'Title is required' : ''}
                                        label="Title"
                                        placeholder="Enter call title"
                                        value={callData.title}
                                        onChange={(e) => {
                                            setCallData({ ...callData, title: e.target.value });
                                            if (formErrors.title) setFormErrors({ ...formErrors, title: false });
                                        }}
                                    />

                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <FormControl fullWidth required>
                                                <InputLabel>Call For</InputLabel>
                                                <Select
                                                    required
                                                    label="Call For"
                                                    value={callData.call_for}
                                                    MenuProps={{
                                                        PaperProps: {
                                                            sx: { '& .MuiMenuItem-root': { fontSize: '0.9rem' } }
                                                        }
                                                    }}
                                                    onChange={(e) => setCallData({
                                                        ...callData,
                                                        call_for: e.target.value as string,
                                                        lead_name: '',
                                                        contact_name: '',
                                                        account_name: ''
                                                    })}
                                                >
                                                    <MenuItem value="Lead">Lead</MenuItem>
                                                    <MenuItem value="Contact">Client</MenuItem>
                                                    <MenuItem value="Accounts">Company</MenuItem>
                                                    <MenuItem value="Others">Others</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        {callData.call_for === 'Others' && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Enter ID"
                                                    placeholder="Enter other ID"
                                                    value={callData.enter_id}
                                                    onChange={(e) => setCallData({ ...callData, enter_id: e.target.value })}
                                                />
                                            </Grid>
                                        )}

                                        {callData.call_for === 'Lead' && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    fullWidth
                                                    options={leadOptions}
                                                    ListboxProps={{
                                                        sx: { '& .MuiAutocomplete-option': { fontSize: '0.9rem' } }
                                                    }}
                                                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.lead_name} (${option.name})`}
                                                    value={leadOptions.find(opt => opt.name === callData.lead_name) || null}
                                                    onChange={(_, newValue) => {
                                                        setCallData({
                                                            ...callData,
                                                            lead_name: newValue?.name || '',
                                                            contact_name: newValue?.converted_contact || '',
                                                            account_name: newValue?.converted_account || ''
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

                                        {callData.call_for === 'Contact' && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    fullWidth
                                                    options={contactOptions}
                                                    ListboxProps={{
                                                        sx: { '& .MuiAutocomplete-option': { fontSize: '0.9rem' } }
                                                    }}
                                                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.first_name || ''} ${option.last_name || ''} (${option.name})`.trim()}
                                                    value={contactOptions.find(opt => opt.name === callData.contact_name) || null}
                                                    onChange={(_, newValue) => setCallData({ ...callData, contact_name: newValue?.name || '' })}
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

                                        {callData.call_for === 'Accounts' && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    fullWidth
                                                    options={accountOptions}
                                                    ListboxProps={{
                                                        sx: { '& .MuiAutocomplete-option': { fontSize: '0.9rem' } }
                                                    }}
                                                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.account_name} (${option.name})`}
                                                    value={accountOptions.find(opt => opt.name === callData.account_name) || null}
                                                    onChange={(_, newValue) => setCallData({ ...callData, account_name: newValue?.name || '' })}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Select Company"
                                                            required
                                                            error={!!formErrors.account_name}
                                                            helperText={formErrors.account_name ? 'Company is required' : ''}
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
                                                    value={callData.outgoing_call_status}
                                                    MenuProps={{
                                                        PaperProps: {
                                                            sx: { '& .MuiMenuItem-root': { fontSize: '0.9rem' } }
                                                        }
                                                    }}
                                                    onChange={(e) => setCallData({ ...callData, outgoing_call_status: e.target.value as string })}
                                                >
                                                    <MenuItem value="Scheduled">Scheduled</MenuItem>
                                                    <MenuItem value="Completed">Completed</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        {callData.outgoing_call_status === 'Completed' && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    fullWidth
                                                    options={callStatusOptions}
                                                    value={callData.completed_call_status || null}
                                                    onChange={(_, newValue: any) => {
                                                        if (typeof newValue === 'string') {
                                                            setCallData({ ...callData, completed_call_status: newValue });
                                                        } else if (newValue && newValue.isNew) {
                                                            setNewCallStatusName(newValue.inputValue);
                                                            setCreateCallStatusOpen(true);
                                                        } else {
                                                            setCallData({ ...callData, completed_call_status: newValue || '' });
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
                                                                label: '+ Create Call Status',
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
                                                                            {option.inputValue ? `Create "${option.inputValue}"` : 'Create Call Status'}
                                                                        </Typography>
                                                                    </Stack>
                                                                ) : (
                                                                    option.label || option
                                                                )}
                                                            </Box>
                                                        );
                                                    }}
                                                    renderInput={(params) => <TextField {...params} label="Call Status" />}
                                                />
                                            </Grid>
                                        )}
                                    </Grid>
                                </Stack>
                            </Box>

                            {/* Schedule Section */}
                            <Box>
                                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                    Time Schedule
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ md: 12, lg: 6 }}>
                                        <DateTimePicker
                                            label="Start Time"
                                            format="DD-MM-YYYY hh:mm A"
                                            value={callData.call_start_time ? dayjs(callData.call_start_time) : null}
                                            onChange={(newValue) => setCallData({ ...callData, call_start_time: newValue ? newValue.format('YYYY-MM-DD HH:mm:ss') : '' })}
                                            sx={{ width: '100%' }}
                                        />
                                    </Grid>
                                    <Grid size={{ md: 12, lg: 6 }}>
                                        <DateTimePicker
                                            label="End Time"
                                            format="DD-MM-YYYY hh:mm A"
                                            value={callData.call_end_time ? dayjs(callData.call_end_time) : null}
                                            onChange={(newValue) => setCallData({ ...callData, call_end_time: newValue ? newValue.format('YYYY-MM-DD HH:mm:ss') : '' })}
                                            sx={{ width: '100%' }}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Reminder Section */}
                            {!selectedCall && (
                                <Box>
                                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                        Reminder Settings
                                    </Typography>
                                    <Stack spacing={2}>
                                        <FormControlLabel
                                            control={
                                                <Android12Switch
                                                    checked={callData.enable_reminder === 1}
                                                    onChange={(e) => setCallData({ ...callData, enable_reminder: e.target.checked ? 1 : 0 })}
                                                />
                                            }
                                            label="Enable Reminder"
                                        />
                                        {callData.enable_reminder === 1 && (
                                            <Box>
                                                <TimePicker
                                                    label="Remind Before (Time)"
                                                    value={dayjs().startOf('day').add(callData.remind_before_minutes || 60, 'minutes')}
                                                    onChange={(newValue: dayjs.Dayjs | null) => {
                                                        if (newValue) {
                                                            const hours = newValue.hour();
                                                            const minutes = newValue.minute();
                                                            const totalMinutes = hours * 60 + minutes;
                                                            setCallData({ ...callData, remind_before_minutes: totalMinutes });
                                                        }
                                                    }}
                                                    ampm={false}
                                                    views={['hours', 'minutes']}
                                                    format="HH:mm"
                                                    slotProps={{
                                                        textField: {
                                                            fullWidth: true,
                                                            helperText: 'Set hours and minutes before the call'
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        )}
                                    </Stack>
                                </Box>
                            )}

                            {/* Agenda Section */}
                            <Box>
                                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, display: 'block' }}>
                                    Details & Agenda
                                </Typography>
                                <Stack spacing={2.5}>
                                    <TextField
                                        fullWidth
                                        label="Purpose"
                                        placeholder="Reason for the call"
                                        value={callData.call_purpose}
                                        onChange={(e) => setCallData({ ...callData, call_purpose: e.target.value })}
                                    />
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        label="Agenda"
                                        placeholder="Points to discuss..."
                                        value={callData.call_agenda}
                                        onChange={(e) => setCallData({ ...callData, call_agenda: e.target.value })}
                                    />
                                </Stack>
                            </Box>
                        </Box>
                    </Grid>

                    {/* Right Side: Call Notes Panel (Only in Edit Mode) */}
                    {selectedCall && (
                        <Grid size={{ xs: 12, md: 4 }} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.divider}`, pl: 4, py: 2 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    Call Notes
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<Iconify icon="mingcute:add-line" width={18} height={18} />}
                                    onClick={() => {
                                        setSelectedNote(null);
                                        setOpenNoteDialog(true);
                                    }}
                                    sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}
                                >
                                    Add Note
                                </Button>
                            </Stack>

                            <Box sx={{ overflowY: 'auto', maxHeight: 500, pr: 0.5 }}>
                                {!callData.call_notes || callData.call_notes.length === 0 ? (
                                    <Box sx={{ py: 12, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <Iconify icon="solar:notes-bold-duotone" width={64} sx={{ color: 'text.disabled', mb: 2, opacity: 0.6 }} />
                                        <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 700 }}>
                                            No Notes Added Yet
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, maxWidth: 220 }}>
                                            Click &quot;Add Note&quot; to keep track of details for this call.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={2}>
                                        {[...callData.call_notes].reverse().map((note: any, index: number) => (
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
                                                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                        {note.title}
                                                    </Typography>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setSelectedNote(note);
                                                                setOpenNoteDialog(true);
                                                            }}
                                                        >
                                                            <Iconify icon="solar:pen-bold" width={16} sx={{ color: 'primary.main' }} />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeleteNote(note)}
                                                        >
                                                            <Iconify icon="solar:trash-bin-trash-bold" width={16} sx={{ color: 'error.main' }} />
                                                        </IconButton>
                                                    </Stack>
                                                </Stack>
                                                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                                                    {stripHtml(note.description)}
                                                </Typography>
                                            </Card>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </LocalizationProvider>
        </DialogContent>

                <DialogActions sx={{ p: 2.5, pt: 2, gap: 1.5 }}>
                    {selectedCall && canDelete && (
                        <Button
                            color="error"
                            variant="contained"
                            onClick={() => setConfirmDelete(true)}
                            startIcon={<IoMdTrash size={20} />}
                            sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', mr: 'auto' }}
                        >
                            Delete
                        </Button>
                    )}
                    {((!selectedCall && canEdit) || (selectedCall && canEdit)) && (
                        <Button
                            variant="contained"
                            color="info"
                            onClick={handleSaveCall}
                            disabled={isSubmitting}
                            sx={{ borderRadius: 1, px: 3 }}
                        >
                            {isSubmitting
                                ? (selectedCall ? 'Saving...' : 'Creating...')
                                : (selectedCall ? 'Save Changes' : 'Create Call')}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                title="Confirm Delete"
                content="Are you sure you want to delete this call?"
                action={
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />

            <Dialog
                open={createCallStatusOpen}
                onClose={() => !creatingCallStatus && setCreateCallStatusOpen(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: { borderRadius: 2 }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Create Call Status</Typography>
                    <IconButton
                        onClick={() => !creatingCallStatus && setCreateCallStatusOpen(false)}
                        sx={{ color: 'text.secondary' }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pb: 2, pt: 1 }}>
                    <TextField
                        fullWidth
                        label="Call Status"
                        value={newCallStatusName}
                        onChange={(e) => setNewCallStatusName(e.target.value)}
                        required
                        autoFocus
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        variant="contained"
                        onClick={handleCreateCallStatusSubmit}
                        disabled={creatingCallStatus || !newCallStatusName.trim()}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        {creatingCallStatus ? 'Creating...' : 'Create'}
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

            <CallNoteDialog
                open={openNoteDialog}
                onClose={() => {
                    setOpenNoteDialog(false);
                    setSelectedNote(null);
                }}
                selectedNote={selectedNote}
                onSave={handleSaveNote}
            />
        </>
    );
}
