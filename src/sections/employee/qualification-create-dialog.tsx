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

import { createQualification } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onCreate: (newQualification: string) => void;
    currentQualificationName?: string;
};

export function QualificationCreateDialog({ open, onClose, onCreate, currentQualificationName = '' }: Props) {
    const [qualification, setQualification] = useState(currentQualificationName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setQualification(currentQualificationName);
            setError('');
        }
    }, [open, currentQualificationName]);

    const handleSubmit = async () => {
        if (!qualification.trim()) {
            setError('Qualification is required');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await createQualification({
                qualification: qualification.trim(),
            });
            onCreate(qualification.trim());
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create qualification');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">New Qualification</Typography>
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
                        label="Qualification"
                        value={qualification}
                        onChange={(e) => {
                            setQualification(e.target.value);
                            if (error) setError('');
                        }}
                        error={!!error}
                        helperText={error}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
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
