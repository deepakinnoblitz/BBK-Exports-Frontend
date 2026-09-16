import type { Dayjs } from 'dayjs';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { createShift } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onCreate: (newShift: string) => void;
    currentShiftName?: string;
};

export function ShiftCreateDialog({ open, onClose, onCreate, currentShiftName = '' }: Props) {
    const [shiftName, setShiftName] = useState(currentShiftName);
    const [startTime, setStartTime] = useState<Dayjs | null>(null);
    const [endTime, setEndTime] = useState<Dayjs | null>(null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setShiftName(currentShiftName);
            setStartTime(null);
            setEndTime(null);
            setDescription('');
            setError('');
        }
    }, [open, currentShiftName]);

    const handleSubmit = async () => {
        if (!shiftName.trim()) {
            setError('Shift Name is required');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await createShift({
                shift_name: shiftName.trim(),
                start_time: startTime ? startTime.format('HH:mm:ss') : undefined,
                end_time: endTime ? endTime.format('HH:mm:ss') : undefined,
                description: description.trim() || undefined,
                status: 'Active'
            });
            onCreate(shiftName.trim());
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create shift');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">New Shift</Typography>
                </Box>
                <Iconify
                    icon="mingcute:close-line"
                    onClick={onClose}
                    sx={{ cursor: 'pointer', color: 'text.disabled' }}
                />
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                        required
                        fullWidth
                        label="Shift Name"
                        placeholder="e.g. General Shift, Morning Shift, Night Shift"
                        value={shiftName}
                        onChange={(e) => {
                            setShiftName(e.target.value);
                            if (error) setError('');
                        }}
                        error={!!error}
                        helperText={error}
                        disabled={loading}
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
                </Box>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{ bgcolor: '#08a3cd', '&:hover': { bgcolor: '#068fb3' } }}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
