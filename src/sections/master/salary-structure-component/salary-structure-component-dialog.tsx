import type {
    SalaryStructureComponent} from 'src/api/masters';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { COMMON_COLORS } from 'src/theme';
import {
    fetchSalaryComponents,
} from 'src/api/hr-management';
import {
    getSalaryStructureComponent,
    createSalaryStructureComponent,
    updateSalaryStructureComponent
} from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    id?: string | null;
};

const TYPE_OPTIONS = ['Earning', 'Deduction'];

export function SalaryStructureComponentDialog({ open, onClose, onSuccess, id }: Props) {
    const [componentName, setComponentName] = useState('');
    const [fieldName, setFieldName] = useState('');
    const [type, setType] = useState<string>('Earnings');
    const [percentage, setPercentage] = useState<string>('');
    const [staticAmount, setStaticAmount] = useState<string>('');
    const [isDefault, setIsDefault] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
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
                        const data = await getSalaryStructureComponent(id);
                        setComponentName(data.component_name || data.name || '');
                        setType(data.type || 'Earning');
                        setPercentage(data.percentage != null && Number(data.percentage) > 0 ? String(data.percentage) : '');
                        setStaticAmount(data.static_amount != null && Number(data.static_amount) > 0 ? String(data.static_amount) : '');
                        setIsDefault(!!data.is_default);
                    } catch (err) {
                        console.error('Failed to fetch component:', err);
                        setSnackbar({ open: true, message: 'Failed to fetch details', severity: 'error' });
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setComponentName('');
                    setType('Earning');
                    setPercentage('');
                    setStaticAmount('');
                    setIsDefault(false);
                }
                setError('');
            }
        };

        fetchData();
    }, [open, id]);

    const handleSubmit = async () => {
        if (!componentName.trim()) {
            setError('name');
            setSnackbar({ open: true, message: 'Component name is required', severity: 'error' });
            return;
        }

        try {
            setLoading(true);
            setError('');

            if (isDefault && type === 'Earning') {
                const val = percentage !== '' ? parseFloat(percentage) : 0;
                const allComponents = await fetchSalaryComponents();
                const otherDefaultEarningsTotal = allComponents
                    .filter((c: any) => c.is_default && c.type === 'Earning' && c.name !== id)
                    .reduce((sum: number, c: any) => sum + (parseFloat(c.percentage) || 0), 0);

                if (otherDefaultEarningsTotal + val > 100) {
                    const msg = `Total Default Earnings cannot exceed 100%. Current total with this change: ${(otherDefaultEarningsTotal + val).toFixed(2)}%`;
                    setError(msg);
                    setSnackbar({ open: true, message: msg, severity: 'error' });
                    setLoading(false);
                    return;
                }
            }

            const data: Partial<SalaryStructureComponent> = {
                component_name: componentName,
                type: type as any,
                percentage: percentage !== '' && !Number.isNaN(parseFloat(percentage)) ? parseFloat(percentage) : 0,
                static_amount: staticAmount !== '' && !Number.isNaN(parseFloat(staticAmount)) ? parseFloat(staticAmount) : 0,
                is_default: isDefault ? 1 : 0,
            };

            if (id) {
                await updateSalaryStructureComponent(id, data);
            } else {
                await createSalaryStructureComponent(data);
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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
            <DialogTitle
                sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <Typography variant="h6">
                    {id ? 'Edit Salary Component' : 'New Salary Component'}
                </Typography>
                <Iconify
                    icon="mingcute:close-line"
                    onClick={onClose}
                    sx={{ cursor: 'pointer', color: 'text.disabled' }}
                />
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={3}>
                        <TextField
                            required
                            fullWidth
                            label="Component Name"
                            value={componentName}
                            onChange={(e) => {
                                setComponentName(e.target.value);
                                if (error === 'name') setError('');
                            }}
                            error={error === 'name'}
                            helperText={error === 'name' ? 'Component name is required' : ''}
                            disabled={loading}
                            autoFocus
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                        />


                        <TextField
                            select
                            fullWidth
                            label="Type"
                            value={type}
                            onChange={(e) => {
                                setType(e.target.value);
                                // clear percentage when switching to Deduction
                                if (e.target.value === 'Deduction') setPercentage('');
                            }}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        >
                            {TYPE_OPTIONS.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                    {opt}
                                </MenuItem>
                            ))}
                        </TextField>

                        {type === 'Earning' && (
                            <TextField
                                fullWidth
                                label="Percentage (%)"
                                type="number"
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value)}
                                disabled={loading}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 0, max: 100, step: 0.01 }}
                                helperText="Leave blank if not applicable"
                            />
                        )}

                        <TextField
                            fullWidth
                            label="Static Amount"
                            type="number"
                            value={staticAmount}
                            onChange={(e) => setStaticAmount(e.target.value)}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: 0, step: 0.01 }}
                            helperText="Leave blank if not applicable"
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Is Default"
                            sx={{ mt: 1 }}
                        />
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
                    sx={{ bgcolor: COMMON_COLORS.primaryButton.bg, color: COMMON_COLORS.primaryButton.color, '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg } }}
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
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Dialog>
    );
}
