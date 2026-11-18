import type { BusRoutePoint } from 'src/api/masters';

import dayjs from 'dayjs';
import { MuiTelInput } from 'mui-tel-input';
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

import {
    isDialCodeOnlyPhone,
    validatePhoneNumber,
    cleanPhoneForDisplay,
    normalizePhoneForStorage,
    normalizePhoneComparisonKey,
} from 'src/utils/employee-validation';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
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
    const [existingRoutes, setExistingRoutes] = useState<any[]>([]);

    const cleanPhoneNumber = (val: string) => {
        if (!val) return '';
        if (val.includes('-') || (val.startsWith('+') && !val.includes(' '))) {
            return cleanPhoneForDisplay(val);
        }
        return val;
    };

    const isDuplicateBusNumber = (numToCheck: string) => {
        const trimmed = numToCheck.trim().toLowerCase();
        if (!trimmed) return false;
        return existingRoutes.some((r) => (r.bus_number || '').trim().toLowerCase() === trimmed);
    };

    const isDuplicateDriverContact = (contactToCheck: string) => {
        if (!contactToCheck || isDialCodeOnlyPhone(contactToCheck)) return false;
        const key = normalizePhoneComparisonKey(contactToCheck) || contactToCheck.replace(/\D/g, '').trim();
        if (!key) return false;
        return existingRoutes.some((r) => {
            const existingKey = normalizePhoneComparisonKey(r.driver_contact) || (r.driver_contact || '').replace(/\D/g, '').trim();
            if (!existingKey) return false;
            return existingKey === key || (key.length >= 10 && existingKey.endsWith(key.slice(-10)));
        });
    };

    const isDuplicatePointName = (index: number, nameToCheck: string) => {
        const trimmed = (nameToCheck || '').trim().toLowerCase();
        if (!trimmed) return false;
        return points.some((p, i) => i !== index && (p.point_name || '').trim().toLowerCase() === trimmed);
    };

    useEffect(() => {
        if (open) {
            setRouteName(currentRouteName);
            setBusNumber('');
            setDriverContact('');
            setDescription('');
            setPoints([]);
            setError('');

            getDoctypeList('Bus Travel Route', ['name', 'route_name', 'bus_number', 'driver_contact'], undefined, 1000)
                .then((data) => setExistingRoutes(data || []))
                .catch(console.error);
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

        if (busNumber.trim() && isDuplicateBusNumber(busNumber)) {
            setError('bus_number_duplicate');
            return;
        }

        const hasContact = Boolean(driverContact && !isDialCodeOnlyPhone(driverContact));
        if (hasContact) {
            const formatErr = validatePhoneNumber(driverContact, 'Driver Contact');
            if (formatErr) {
                setError(formatErr);
                return;
            }
            if (isDuplicateDriverContact(driverContact)) {
                setError('driver_contact_duplicate');
                return;
            }
        }

        // Check for duplicate point names
        const seenPointNames = new Set<string>();
        for (const pt of points) {
            const pName = (pt.point_name || '').trim();
            if (!pName) continue;
            const lowerP = pName.toLowerCase();
            if (seenPointNames.has(lowerP)) {
                setError(`Point / Stop Name '${pName}' already exists in Route Points. Duplicate point names are not allowed.`);
                return;
            }
            seenPointNames.add(lowerP);
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

            const finalDriverContact = hasContact ? normalizePhoneForStorage(driverContact) : undefined;

            await createBusTravelRoute({
                route_name: routeName.trim(),
                bus_number: busNumber.trim() || undefined,
                driver_contact: finalDriverContact,
                description: description.trim() || undefined,
                status: 'Active',
                points: validPoints,
            });
            onCreate(routeName.trim());
            onClose();
        } catch (err: any) {
            console.error(err);
            const msg = err.message || 'Failed to create bus travel route';
            const lower = msg.toLowerCase();
            if (lower.includes('vehicle number') || lower.includes('bus_number') || (lower.includes('vehicle') && lower.includes('unique'))) {
                setError('bus_number_duplicate');
            } else if (lower.includes('driver contact') || lower.includes('driver_contact') || (lower.includes('contact') && lower.includes('unique')) || (lower.includes('mobile') && lower.includes('unique'))) {
                setError('driver_contact_duplicate');
            } else {
                setError(msg);
            }
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
                            onChange={(e) => {
                                setBusNumber(e.target.value);
                                if (error === 'bus_number_duplicate') setError('');
                            }}
                            error={error === 'bus_number_duplicate' || (busNumber.trim() !== '' && isDuplicateBusNumber(busNumber))}
                            helperText={
                                (error === 'bus_number_duplicate' || (busNumber.trim() !== '' && isDuplicateBusNumber(busNumber)))
                                    ? 'Bus / Vehicle Number already exists'
                                    : ''
                            }
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />

                        <MuiTelInput
                            fullWidth
                            defaultCountry="IN"
                            label="Driver Contact"
                            placeholder="e.g. 9876543210"
                            value={cleanPhoneNumber(driverContact)}
                            onChange={(newValue: string) => {
                                setDriverContact(newValue);
                                if (error === 'driver_contact_duplicate' || error.includes('Driver Contact')) setError('');
                            }}
                            onBlur={() => {
                                if (isDialCodeOnlyPhone(driverContact)) {
                                    setDriverContact('');
                                    return;
                                }
                                const err = validatePhoneNumber(driverContact, 'Driver Contact');
                                if (err) {
                                    setError(err);
                                }
                            }}
                            error={error === 'driver_contact_duplicate' || error.includes('Driver Contact') || (!isDialCodeOnlyPhone(driverContact) && isDuplicateDriverContact(driverContact))}
                            helperText={
                                error.includes('Driver Contact')
                                    ? error
                                    : (error === 'driver_contact_duplicate' || (!isDialCodeOnlyPhone(driverContact) && isDuplicateDriverContact(driverContact)))
                                    ? 'Driver Contact already exists'
                                    : ''
                            }
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
                                sx={{ bgcolor: COMMON_COLORS.emerald.main, color: 'common.white', '&:hover': { bgcolor: COMMON_COLORS.emerald.dark } }}
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
                                                            onChange={(e) => {
                                                                handlePointChange(idx, 'point_name', e.target.value);
                                                                if (error.includes('Route Points')) setError('');
                                                            }}
                                                            error={isDuplicatePointName(idx, pt.point_name)}
                                                            helperText={isDuplicatePointName(idx, pt.point_name) ? 'Point name already exists' : ''}
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
                    sx={{ bgcolor: COMMON_COLORS.emerald.main, color: 'common.white', '&:hover': { bgcolor: COMMON_COLORS.emerald.dark } }}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
