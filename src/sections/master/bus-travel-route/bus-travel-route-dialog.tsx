import type { BusRoutePoint, BusTravelRoute } from 'src/api/masters';

import dayjs from 'dayjs';
import { MuiTelInput } from 'mui-tel-input';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
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

import { getDoctypeList } from 'src/api/leads';
import { getBusTravelRoute, createBusTravelRoute, updateBusTravelRoute, renameBusTravelRoute } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    id?: string | null;
};

const parseTimeString = (timeStr?: string) => {
    if (!timeStr) return null;
    const normalized = timeStr.includes(':') && timeStr.split(':')[0].length === 1 ? `0${timeStr}` : timeStr;
    const parsed = dayjs(`2000-01-01T${normalized.length === 5 ? `${normalized}:00` : normalized}`);
    return parsed.isValid() ? parsed : null;
};

export function BusTravelRouteDialog({ open, onClose, onSuccess, id }: Props) {
    const [routeName, setRouteName] = useState('');
    const [busNumber, setBusNumber] = useState('');
    const [driverContact, setDriverContact] = useState('');
    const [status, setStatus] = useState('Active');
    const [description, setDescription] = useState('');
    const [points, setPoints] = useState<BusRoutePoint[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [existingRoutes, setExistingRoutes] = useState<any[]>([]);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

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
        return existingRoutes.some((r) => {
            if (id && (r.name === id || r.route_name === id)) return false;
            return (r.bus_number || '').trim().toLowerCase() === trimmed;
        });
    };

    const isDuplicateDriverContact = (contactToCheck: string) => {
        if (!contactToCheck || isDialCodeOnlyPhone(contactToCheck)) return false;
        const key = normalizePhoneComparisonKey(contactToCheck) || contactToCheck.replace(/\D/g, '').trim();
        if (!key) return false;
        return existingRoutes.some((r) => {
            if (id && (r.name === id || r.route_name === id)) return false;
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
        const loadRoutes = async () => {
            try {
                const res = await getDoctypeList('Bus Travel Route', ['name', 'route_name', 'bus_number', 'driver_contact'], undefined, 1000);
                setExistingRoutes(res || []);
            } catch (err) {
                console.error('Failed to fetch bus travel routes:', err);
            }
        };

        const fetchData = async () => {
            if (open) {
                await loadRoutes();
                if (id) {
                    try {
                        setLoading(true);
                        const data = await getBusTravelRoute(id);
                        setRouteName(data.route_name || data.name || '');
                        setBusNumber(data.bus_number || '');
                        setDriverContact(data.driver_contact ? cleanPhoneForDisplay(data.driver_contact) : '');
                        setStatus(data.status || 'Active');
                        setDescription(data.description || '');
                        setPoints(data.points || []);
                    } catch (err) {
                        console.error('Failed to fetch bus travel route:', err);
                        setSnackbar({ open: true, message: 'Failed to fetch details', severity: 'error' });
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setRouteName('');
                    setBusNumber('');
                    setDriverContact('');
                    setStatus('Active');
                    setDescription('');
                    setPoints([]);
                }
                setError('');
            }
        };

        fetchData();
    }, [open, id]);

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
        const errs: string[] = [];
        if (!routeName.trim()) errs.push('required');
        if (busNumber.trim() && isDuplicateBusNumber(busNumber)) errs.push('bus_number_duplicate');

        const hasContact = Boolean(driverContact && !isDialCodeOnlyPhone(driverContact));
        let contactFormatErr: string | null = null;
        if (hasContact) {
            contactFormatErr = validatePhoneNumber(driverContact, 'Driver Contact');
            if (contactFormatErr) {
                errs.push('driver_contact_invalid');
            } else if (isDuplicateDriverContact(driverContact)) {
                errs.push('driver_contact_duplicate');
            }
        }

        // Check for duplicate point names
        const seenPointNames = new Set<string>();
        let dupPointName = '';
        for (const pt of points) {
            const pName = (pt.point_name || '').trim();
            if (!pName) continue;
            const lowerP = pName.toLowerCase();
            if (seenPointNames.has(lowerP)) {
                dupPointName = pName;
                break;
            }
            seenPointNames.add(lowerP);
        }
        if (dupPointName) {
            errs.push('point_name_duplicate');
        }

        if (errs.length > 0) {
            setError(errs.join(','));
            let msg = 'Please fill in all required fields';
            if (errs.includes('required')) {
                msg = 'Route Name is required';
            } else if (errs.includes('bus_number_duplicate')) {
                msg = 'Bus / Vehicle Number already exists. Vehicle number must be unique.';
            } else if (errs.includes('driver_contact_invalid')) {
                msg = contactFormatErr || 'Driver Contact is invalid';
            } else if (errs.includes('driver_contact_duplicate')) {
                msg = 'Driver Contact already exists. Driver contact must be unique.';
            } else if (errs.includes('point_name_duplicate')) {
                msg = `Point / Stop Name '${dupPointName}' already exists in Route Points. Duplicate point names are not allowed.`;
            }
            setSnackbar({ open: true, message: msg, severity: 'error' });
            return;
        }

        try {
            setLoading(true);
            setError('');

            let currentId = id;
            const trimmedRouteName = routeName.trim();

            if (id && trimmedRouteName !== id) {
                await renameBusTravelRoute(id, trimmedRouteName);
                currentId = trimmedRouteName;
            }

            const validPoints = points
                .map((p) => ({
                    name: p.name,
                    point_name: (p.point_name || '').trim(),
                    pickup_time: p.pickup_time || undefined,
                    drop_time: p.drop_time || undefined,
                }))
                .filter((p) => p.point_name);

            const finalDriverContact = hasContact ? normalizePhoneForStorage(driverContact) : '';

            const data: Partial<BusTravelRoute> = {
                route_name: trimmedRouteName,
                bus_number: busNumber.trim(),
                driver_contact: finalDriverContact,
                status,
                description: description.trim(),
                points: validPoints,
            };

            if (currentId) {
                await updateBusTravelRoute(currentId, data);
            } else {
                await createBusTravelRoute(data);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            const msg = err.message || 'Failed to save';
            const lower = msg.toLowerCase();
            const newErrs: string[] = [];
            if (lower.includes('vehicle number') || lower.includes('bus_number') || (lower.includes('vehicle') && lower.includes('unique'))) {
                newErrs.push('bus_number_duplicate');
            }
            if (lower.includes('driver contact') || lower.includes('driver_contact') || (lower.includes('contact') && lower.includes('unique')) || (lower.includes('mobile') && lower.includes('unique'))) {
                newErrs.push('driver_contact_duplicate');
            }
            if (lower.includes('point / stop name') || lower.includes('duplicated in route points') || lower.includes('duplicate point name')) {
                newErrs.push('point_name_duplicate');
            }
            if (newErrs.length > 0) {
                setError((prev) => {
                    const list = prev ? prev.split(',') : [];
                    newErrs.forEach((e) => {
                        if (!list.includes(e)) list.push(e);
                    });
                    return list.join(',');
                });
            } else {
                setError(msg);
            }
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
            maxWidth="md"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                },
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{id ? 'Edit Bus - Travel Route' : 'New Bus - Travel Route'}</Typography>
                <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={3} sx={{ py: 2 }}>
                    <TextField
                        required
                        fullWidth
                        label="Route Name"
                        placeholder="e.g. Route 1 - Avadi, Route 2 - Tambaram"
                        value={routeName}
                        onChange={(e) => {
                            setRouteName(e.target.value);
                            if (error === 'required') setError('');
                        }}
                        error={error === 'required'}
                        helperText={error === 'required' ? 'Route Name is required' : ''}
                        disabled={loading}
                        autoFocus
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
                                if (error.split(',').includes('bus_number_duplicate')) {
                                    setError(error.split(',').filter((err) => err !== 'bus_number_duplicate').join(','));
                                }
                            }}
                            error={error.split(',').includes('bus_number_duplicate') || (busNumber.trim() !== '' && isDuplicateBusNumber(busNumber))}
                            helperText={
                                (error.split(',').includes('bus_number_duplicate') || (busNumber.trim() !== '' && isDuplicateBusNumber(busNumber)))
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
                                const errList = error.split(',').filter(Boolean);
                                const nextErrs = errList.filter(
                                    (err) => err !== 'driver_contact_duplicate' && err !== 'driver_contact_invalid'
                                );
                                setError(nextErrs.join(','));
                            }}
                            onBlur={() => {
                                if (isDialCodeOnlyPhone(driverContact)) {
                                    setDriverContact('');
                                    return;
                                }
                                const err = validatePhoneNumber(driverContact, 'Driver Contact');
                                if (err) {
                                    setError((prev) => {
                                        const list = prev ? prev.split(',').filter(Boolean) : [];
                                        if (!list.includes('driver_contact_invalid')) list.push('driver_contact_invalid');
                                        return list.join(',');
                                    });
                                } else {
                                    setError((prev) => prev.split(',').filter((e) => e !== 'driver_contact_invalid').join(','));
                                }
                            }}
                            error={
                                error.split(',').includes('driver_contact_duplicate') ||
                                error.split(',').includes('driver_contact_invalid') ||
                                (!isDialCodeOnlyPhone(driverContact) && isDuplicateDriverContact(driverContact))
                            }
                            helperText={
                                error.split(',').includes('driver_contact_invalid')
                                    ? (validatePhoneNumber(driverContact, 'Driver Contact') || 'Driver Contact is invalid')
                                    : (error.split(',').includes('driver_contact_duplicate') || (!isDialCodeOnlyPhone(driverContact) && isDuplicateDriverContact(driverContact)))
                                    ? 'Driver Contact already exists'
                                    : ''
                            }
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>

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
                        rows={2}
                        label="Description"
                        placeholder="Add a brief description (Optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                    />

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    {/* Route Points / Stops Section */}
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
                                sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                            >
                                Add Point
                            </Button>
                        </Box>

                        {points.length === 0 ? (
                            <Paper
                                variant="outlined"
                                sx={{
                                    py: 3,
                                    px: 2,
                                    textAlign: 'center',
                                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                    borderStyle: 'dashed',
                                    borderRadius: 1.5,
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    No points configured for this route yet. Click &quot;Add Point&quot; to add stops.
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
                                                                if (error.split(',').includes('point_name_duplicate')) {
                                                                    setError(error.split(',').filter((err) => err !== 'point_name_duplicate').join(','));
                                                                }
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
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
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
