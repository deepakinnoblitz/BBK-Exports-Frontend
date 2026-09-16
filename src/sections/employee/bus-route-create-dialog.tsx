import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { createBusTravelRoute } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onCreate: (newRoute: string) => void;
    currentRouteName?: string;
};

export function BusRouteCreateDialog({ open, onClose, onCreate, currentRouteName = '' }: Props) {
    const [routeName, setRouteName] = useState(currentRouteName);
    const [busNumber, setBusNumber] = useState('');
    const [driverContact, setDriverContact] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setRouteName(currentRouteName);
            setBusNumber('');
            setDriverContact('');
            setDescription('');
            setError('');
        }
    }, [open, currentRouteName]);

    const handleSubmit = async () => {
        if (!routeName.trim()) {
            setError('Route Name is required');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await createBusTravelRoute({
                route_name: routeName.trim(),
                bus_number: busNumber.trim() || undefined,
                driver_contact: driverContact.trim() || undefined,
                description: description.trim() || undefined,
                status: 'Active'
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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
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
