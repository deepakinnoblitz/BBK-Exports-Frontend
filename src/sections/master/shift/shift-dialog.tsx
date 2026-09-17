import type { Dayjs } from 'dayjs';
import type { Shift } from 'src/api/masters';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { getShift, createShift, updateShift } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    id?: string | null;
};

export function ShiftDialog({ open, onClose, onSuccess, id }: Props) {
    const [shiftName, setShiftName] = useState('');
    const [startTime, setStartTime] = useState<Dayjs | null>(null);
    const [endTime, setEndTime] = useState<Dayjs | null>(null);
    const [status, setStatus] = useState('Active');
    const [description, setDescription] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        const fetchData = async () => {
            if (open) {
                if (id) {
                    try {
                        setLoading(true);
                        const data = await getShift(id);
                        setShiftName(data.shift_name || data.name || '');
                        setStartTime(data.start_time ? dayjs(`2000-01-01T${data.start_time}`) : null);
                        setEndTime(data.end_time ? dayjs(`2000-01-01T${data.end_time}`) : null);
                        setStatus(data.status || 'Active');
                        setDescription(data.description || '');
                    } catch (err) {
                        console.error('Failed to fetch shift:', err);
                        setSnackbar({ open: true, message: 'Failed to fetch details', severity: 'error' });
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setShiftName('');
                    setStartTime(null);
                    setEndTime(null);
                    setStatus('Active');
                    setDescription('');
                }
                setError('');
            }
        };

        fetchData();
    }, [open, id]);

    const handleSubmit = async () => {
        if (!shiftName.trim()) {
            setError('required');
            setSnackbar({ open: true, message: 'Shift Name is required', severity: 'error' });
            return;
        }

        try {
            setLoading(true);
            setError('');

            const data: Partial<Shift> = {
                shift_name: shiftName.trim(),
                start_time: startTime ? startTime.format('HH:mm:ss') : undefined,
                end_time: endTime ? endTime.format('HH:mm:ss') : undefined,
                status,
                description: description.trim() || undefined,
            };

            if (id) {
                await updateShift(id, data);
            } else {
                await createShift(data);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            const msg = err.message || 'Failed to save';
            setError(msg);
            setSnackbar({ open: true, message: msg, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                },
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{id ? 'Edit Shift' : 'New Shift'}</Typography>
                <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={3} sx={{ py: 2 }}>
                    <TextField
                        required
                        fullWidth
                        label="Shift Name"
                        placeholder="e.g. General Shift, Morning Shift, Night Shift"
                        value={shiftName}
                        onChange={(e) => {
                            setShiftName(e.target.value);
                            if (error === 'required') setError('');
                        }}
                        error={error === 'required'}
                        helperText={error === 'required' ? 'Shift Name is required' : ''}
                        disabled={loading}
                        autoFocus
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                    />

                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TimePicker
                                label="Start Time"
                                value={startTime}
                                onChange={(newValue) => setStartTime(newValue)}
                                disabled={loading}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        InputLabelProps: { shrink: true }
                                    }
                                }}
                            />

                            <TimePicker
                                label="End Time"
                                value={endTime}
                                onChange={(newValue) => setEndTime(newValue)}
                                disabled={loading}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        InputLabelProps: { shrink: true }
                                    }
                                }}
                            />
                        </Box>
                    </LocalizationProvider>

                    <FormControl fullWidth disabled={loading}>
                        <InputLabel shrink>Status</InputLabel>
                        <Select
                            value={status}
                            label="Status"
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="Inactive">Inactive</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Description"
                        placeholder="Add a brief description (Optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                    />
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{ bgcolor: '#08a3cd', '&:hover': { bgcolor: '#068fb3' } }}
                >
                    {id ? 'Save Changes' : 'Create'}
                </Button>
            </DialogActions>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Dialog>
    );
}
