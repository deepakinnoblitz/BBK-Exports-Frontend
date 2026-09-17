import type { BusTravelRoute } from 'src/api/masters';

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
import CircularProgress from '@mui/material/CircularProgress';

import { getBusTravelRoute, createBusTravelRoute, updateBusTravelRoute } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    id?: string | null;
};

export function BusTravelRouteDialog({ open, onClose, onSuccess, id }: Props) {
    const [routeName, setRouteName] = useState('');
    const [busNumber, setBusNumber] = useState('');
    const [driverContact, setDriverContact] = useState('');
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
                        const data = await getBusTravelRoute(id);
                        setRouteName(data.route_name || data.name || '');
                        setBusNumber(data.bus_number || '');
                        setDriverContact(data.driver_contact || '');
                        setStatus(data.status || 'Active');
                        setDescription(data.description || '');
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
                }
                setError('');
            }
        };

        fetchData();
    }, [open, id]);

    const handleSubmit = async () => {
        if (!routeName.trim()) {
            setError('required');
            setSnackbar({ open: true, message: 'Route Name is required', severity: 'error' });
            return;
        }

        try {
            setLoading(true);
            setError('');

            const data: Partial<BusTravelRoute> = {
                route_name: routeName.trim(),
                bus_number: busNumber.trim() || undefined,
                driver_contact: driverContact.trim() || undefined,
                status,
                description: description.trim() || undefined,
            };

            if (id) {
                await updateBusTravelRoute(id, data);
            } else {
                await createBusTravelRoute(data);
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
