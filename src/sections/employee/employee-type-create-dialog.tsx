import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { createEmployeeType } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onCreate: (newEmployeeType: string) => void;
    currentTypeName?: string;
};

const CATEGORY_OPTIONS = [
    'CTC',
    'Non CTC',
    'Skilled',
    'Semi Skilled',
    'Unskilled',
    'General',
];

export function EmployeeTypeCreateDialog({ open, onClose, onCreate, currentTypeName = '' }: Props) {
    const [employeeType, setEmployeeType] = useState(currentTypeName);
    const [categoryType, setCategoryType] = useState('General');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setEmployeeType(currentTypeName);
            setCategoryType('General');
            setDescription('');
            setError('');
        }
    }, [open, currentTypeName]);

    const previewName = employeeType.trim()
        ? (categoryType && categoryType !== 'General' && !employeeType.toLowerCase().includes(`- ${categoryType.toLowerCase()}`)
            ? `${employeeType.trim()} - ${categoryType}`
            : employeeType.trim())
        : '';

    const handleSubmit = async () => {
        if (!employeeType.trim()) {
            setError('Employee Type is required');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const res = await createEmployeeType({
                employee_type: employeeType.trim(),
                category_type: categoryType,
                description: description.trim() || undefined,
            });
            const createdName = res?.name || previewName || employeeType.trim();
            onCreate(createdName);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create employee type');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">New Employee Type</Typography>
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
                        label="Employee Type"
                        placeholder="e.g. Staff - CTC, Workers - Skilled"
                        value={employeeType}
                        onChange={(e) => {
                            setEmployeeType(e.target.value);
                            if (error) setError('');
                        }}
                        error={!!error}
                        helperText={error}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                    />

                    <TextField
                        select
                        fullWidth
                        label="Category Type"
                        value={categoryType}
                        onChange={(e) => setCategoryType(e.target.value)}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                    >
                        {CATEGORY_OPTIONS.map((cat) => (
                            <MenuItem key={cat} value={cat}>
                                {cat}
                            </MenuItem>
                        ))}
                    </TextField>

                    {previewName && (
                        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: (theme) => `1px dashed ${theme.palette.divider}` }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                Resulting Name:
                            </Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {previewName}
                            </Typography>
                        </Box>
                    )}

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Description"
                        placeholder="Optional description..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                >
                    {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
