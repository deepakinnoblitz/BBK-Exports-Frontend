import type { BusRoutePoint } from 'src/api/masters';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { createBusTravelRoute } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onCreate: (newRoute: string) => void;
    currentRouteName?: string;
};

const parseTimeString = (timeStr?: string) => {
    if (!timeStr) return null;
    const normalized = timeStr.includes(':') && timeStr.split(':')[0].length === 1 ? `0${timeStr}` : timeStr;
    const parsed = dayjs(`2000-01-01T${normalized.length === 5 ? `${normalized}:00` : normalized}`);
    return parsed.isValid() ? parsed : null;
};

export function BusRouteCreateDialog({ open, onClose, onCreate, currentRouteName = '' }: Props) {
    const [routeName, setRouteName] = useState(currentRouteName);
    const [busNumber, setBusNumber] = useState('');
    const [driverContact, setDriverContact] = useState('');
    const [description, setDescription] = useState('');
    const [points, setPoints] = useState<BusRoutePoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setRouteName(currentRouteName);
            setBusNumber('');
            setDriverContact('');
            setDescription('');
            setPoints([]);
            setError('');
        }
    }, [open, currentRouteName]);

    const handleAddPoint = () => {
        setPoints((prev) => [...prev, { point_name: '', pickup_time: '', drop_time: '' }]);
    };

    const handlePointChange = (index: number, field: keyof BusRoutePoint, value: string) => {
        setPoints((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleDeletePoint = (index: number) => {
        setPoints((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!routeName.trim()) {
            setError('Route Name is required');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const validPoints = points
                .map((p) => ({
                    point_name: (p.point_name || '').trim(),
                    pickup_time: p.pickup_time || undefined,
                    drop_time: p.drop_time || undefined,
                }))
                .filter((p) => p.point_name);

            await createBusTravelRoute({
                route_name: routeName.trim(),
                bus_number: busNumber.trim() || undefined,
                driver_contact: driverContact.trim() || undefined,
                description: description.trim() || undefined,
                status: 'Active',
                points: validPoints,
            });
            onCreate(routeName.trim());
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create bus travel route');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">New Bus - Travel Route</Typography>
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
                        label="Route Name"
                        placeholder="e.g. Route 1 - Avadi, Route 2 - Tambaram"
                        value={routeName}
                        onChange={(e) => {
                            setRouteName(e.target.value);
                            if (error) setError('');
                        }}
                        error={!!error}
                        helperText={error}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                    />

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Bus / Vehicle Number"
                            placeholder="e.g. TN-05-AB-1234"
                            value={busNumber}
                            onChange={(e) => setBusNumber(e.target.value)}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />

                        <TextField
                            fullWidth
                            label="Driver Contact"
                            placeholder="e.g. 9876543210"
                            value={driverContact}
                            onChange={(e) => setDriverContact(e.target.value)}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>

                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Description"
                        placeholder="Add a brief description (Optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                    />

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    {/* Route Points Section */}
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    Route Points / Stops
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<Iconify icon="solar:add-circle-bold" />}
                                onClick={handleAddPoint}
                                sx={{ bgcolor: '#08a3cd', '&:hover': { bgcolor: '#068fb3' } }}
                            >
                                Add Point
                            </Button>
                        </Box>

                        {points.length === 0 ? (
                            <Paper
                                variant="outlined"
                                sx={{
                                    py: 2.5,
                                    px: 2,
                                    textAlign: 'center',
                                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                    borderStyle: 'dashed',
                                    borderRadius: 1.5,
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    No points configured yet. Click &quot;Add Point&quot; to add stops.
                                </Typography>
                            </Paper>
                        ) : (
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <TableContainer
                                    component={Paper}
                                    variant="outlined"
                                    sx={{
                                        borderRadius: 1.5,
                                        overflow: 'hidden',
                                        borderColor: 'divider',
                                        boxShadow: (theme) => theme.customShadows?.z1,
                                    }}
                                >
                                    <Table size="small">
                                        <TableHead
                                            sx={{
                                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                                '& th': {
                                                    color: 'text.secondary',
                                                    fontWeight: 700,
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase',
                                                    py: 1.25,
                                                    borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                                                },
                                            }}
                                        >
                                            <TableRow>
                                                <TableCell align="center" sx={{ width: 64 }}>S.No</TableCell>
                                                <TableCell>Point / Stop Name *</TableCell>
                                                <TableCell sx={{ width: 140, minWidth: 140 }}>Pickup Time</TableCell>
                                                <TableCell sx={{ width: 140, minWidth: 140 }}>Drop Time</TableCell>
                                                <TableCell align="center" sx={{ width: 64 }}>Action</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {points.map((pt, idx) => (
                                                <TableRow
                                                    key={idx}
                                                    hover
                                                    sx={{
                                                        '& td': {
                                                            py: 1.25,
                                                            borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                                        },
                                                        '&:last-child td': { borderBottom: 0 },
                                                    }}
                                                >
                                                    <TableCell align="center">
                                                        <Box
                                                            sx={{
                                                                width: 28,
                                                                height: 28,
                                                                display: 'flex',
                                                                borderRadius: '50%',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                color: 'primary.main',
                                                                typography: 'subtitle2',
                                                                fontWeight: 800,
                                                                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                                                                mx: 'auto',
                                                            }}
                                                        >
                                                            {idx + 1}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            placeholder="e.g. Ambattur OT"
                                                            value={pt.point_name}
                                                            onChange={(e) => handlePointChange(idx, 'point_name', e.target.value)}
                                                            disabled={loading}
                                                            sx={{ bgcolor: 'background.paper' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ width: 140, minWidth: 140 }}>
                                                        <TimePicker
                                                            value={parseTimeString(pt.pickup_time)}
                                                            onChange={(newValue) => {
                                                                handlePointChange(
                                                                    idx,
                                                                    'pickup_time',
                                                                    newValue && newValue.isValid() ? newValue.format('HH:mm:ss') : ''
                                                                );
                                                            }}
                                                            disabled={loading}
                                                            slotProps={{
                                                                textField: {
                                                                    size: 'small',
                                                                    sx: {
                                                                        width: 128,
                                                                        bgcolor: 'background.paper',
                                                                        '& .MuiInputBase-input': { fontSize: '0.8125rem', px: 1 },
                                                                        '& .MuiInputAdornment-root': { ml: 0 },
                                                                        '& .MuiIconButton-root': { p: 0.5 },
                                                                    },
                                                                    placeholder: 'hh:mm AM/PM',
                                                                },
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ width: 140, minWidth: 140 }}>
                                                        <TimePicker
                                                            value={parseTimeString(pt.drop_time)}
                                                            onChange={(newValue) => {
                                                                handlePointChange(
                                                                    idx,
                                                                    'drop_time',
                                                                    newValue && newValue.isValid() ? newValue.format('HH:mm:ss') : ''
                                                                );
                                                            }}
                                                            disabled={loading}
                                                            slotProps={{
                                                                textField: {
                                                                    size: 'small',
                                                                    sx: {
                                                                        width: 128,
                                                                        bgcolor: 'background.paper',
                                                                        '& .MuiInputBase-input': { fontSize: '0.8125rem', px: 1 },
                                                                        '& .MuiInputAdornment-root': { ml: 0 },
                                                                        '& .MuiIconButton-root': { p: 0.5 },
                                                                    },
                                                                    placeholder: 'hh:mm AM/PM',
                                                                },
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeletePoint(idx)}
                                                            disabled={loading}
                                                            sx={{
                                                                color: 'error.main',
                                                                '&:hover': { bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) },
                                                            }}
                                                        >
                                                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </LocalizationProvider>
                        )}
                    </Box>
                </Box>
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
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
