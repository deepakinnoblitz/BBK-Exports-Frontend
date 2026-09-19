import type { Dayjs } from 'dayjs';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
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
    const [lunchHours, setLunchHours] = useState<Dayjs | null>(null);
    const [breakHours, setBreakHours] = useState<Dayjs | null>(null);
    const [allowOvertime, setAllowOvertime] = useState(false);
    const [overtimeHours, setOvertimeHours] = useState<number | string>('');
    const [minOvertimeMinutes, setMinOvertimeMinutes] = useState<number | string>(0);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setShiftName(currentShiftName);
            setStartTime(null);
            setEndTime(null);
            setLunchHours(null);
            setBreakHours(null);
            setAllowOvertime(false);
            setOvertimeHours('');
            setMinOvertimeMinutes(0);
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
                lunch_hours: lunchHours ? lunchHours.format('HH:mm:ss') : undefined,
                break_hours: breakHours ? breakHours.format('HH:mm:ss') : undefined,
                allow_overtime: allowOvertime ? 1 : 0,
                overtime_hours: allowOvertime && overtimeHours !== '' ? Number(overtimeHours) : 0,
                min_overtime_minutes: allowOvertime && minOvertimeMinutes !== '' ? Number(minOvertimeMinutes) : 0,
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

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TimePicker
                                label="Lunch Hours"
                                ampm={false}
                                format="HH:mm"
                                value={lunchHours}
                                onChange={(newValue) => setLunchHours(newValue)}
                                disabled={loading}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        InputLabelProps: { shrink: true },
                                        helperText: 'e.g. 01:00 (1 hr lunch)'
                                    }
                                }}
                            />

                            <TimePicker
                                label="Break Hours"
                                ampm={false}
                                format="HH:mm"
                                value={breakHours}
                                onChange={(newValue) => setBreakHours(newValue)}
                                disabled={loading}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        InputLabelProps: { shrink: true },
                                        helperText: 'e.g. 00:30 (30 mins break)'
                                    }
                                }}
                            />
                        </Box>
                    </LocalizationProvider>

                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'background.neutral' }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={allowOvertime}
                                    onChange={(e) => setAllowOvertime(e.target.checked)}
                                    disabled={loading}
                                />
                            }
                            label={<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Allow Overtime</Typography>}
                        />

                        {allowOvertime && (
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Official Overtime (Hours)"
                                    placeholder="e.g. 2.0"
                                    value={overtimeHours}
                                    onChange={(e) => setOvertimeHours(e.target.value)}
                                    disabled={loading}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ min: 0, step: 0.5 }}
                                    helperText="Max official overtime"
                                />
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Min Threshold (Minutes)"
                                    placeholder="e.g. 30"
                                    value={minOvertimeMinutes}
                                    onChange={(e) => setMinOvertimeMinutes(e.target.value)}
                                    disabled={loading}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ min: 0, step: 5 }}
                                    helperText="Min minutes before OT counts"
                                />
                            </Box>
                        )}
                    </Box>

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
