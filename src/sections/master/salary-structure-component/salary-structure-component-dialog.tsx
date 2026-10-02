import type { SalaryStructureComponent } from 'src/api/masters';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { COMMON_COLORS } from 'src/theme';
import { fetchSalaryComponents } from 'src/api/hr-management';
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
const BASIS_OPTIONS = ['Full (Total Gross / CTC)', 'Selected Component(s)'];

export function SalaryStructureComponentDialog({ open, onClose, onSuccess, id }: Props) {
    const [componentName, setComponentName] = useState('');
    const [type, setType] = useState<string>('Earning');
    const [percentage, setPercentage] = useState<string>('');
    const [percentageBasis, setPercentageBasis] = useState<string>('Full (Total Gross / CTC)');
    const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
    const [availableEarningOptions, setAvailableEarningOptions] = useState<string[]>([]);
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
                try {
                    const allComponents = await fetchSalaryComponents();
                    const earningNames = allComponents
                        .filter((c: any) => c.type === 'Earning')
                        .map((c: any) => c.component_name || c.name || '')
                        .filter(Boolean);
                    setAvailableEarningOptions(earningNames);
                } catch (e) {
                    console.error('Failed to fetch earning components:', e);
                }

                if (id) {
                    try {
                        setLoading(true);
                        const data = await getSalaryStructureComponent(id);
                        setComponentName(data.component_name || data.name || '');
                        setType(data.type || 'Earning');
                        setPercentage(data.percentage != null && Number(data.percentage) > 0 ? String(data.percentage) : '');
                        setPercentageBasis(data.percentage_basis || 'Full (Total Gross / CTC)');
                        
                        let parsedSelected: string[] = [];
                        if (Array.isArray(data.selected_components)) {
                            parsedSelected = data.selected_components;
                        } else if (typeof data.selected_components === 'string' && data.selected_components.trim()) {
                            try {
                                parsedSelected = JSON.parse(data.selected_components);
                            } catch {
                                parsedSelected = data.selected_components.split(',').map((s: string) => s.trim()).filter(Boolean);
                            }
                        }
                        setSelectedComponents(parsedSelected);

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
                    setPercentageBasis('Full (Total Gross / CTC)');
                    setSelectedComponents([]);
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

            const percentNum = percentage !== '' && !Number.isNaN(parseFloat(percentage)) ? parseFloat(percentage) : 0;

            if (isDefault && type === 'Earning' && percentageBasis === 'Full (Total Gross / CTC)') {
                const allComponents = await fetchSalaryComponents();
                const otherDefaultEarningsTotal = allComponents
                    .filter((c: any) => c.is_default && c.type === 'Earning' && c.name !== id && (c.percentage_basis || 'Full (Total Gross / CTC)') === 'Full (Total Gross / CTC)')
                    .reduce((sum: number, c: any) => sum + (parseFloat(c.percentage) || 0), 0);

                if (otherDefaultEarningsTotal + percentNum > 100) {
                    const msg = `Total Default Earnings cannot exceed 100%. Current total with this change: ${(otherDefaultEarningsTotal + percentNum).toFixed(2)}%`;
                    setError(msg);
                    setSnackbar({ open: true, message: msg, severity: 'error' });
                    setLoading(false);
                    return;
                }
            }

            if (percentNum > 0 && percentageBasis === 'Selected Component(s)' && selectedComponents.length === 0) {
                const msg = 'Please select at least one base earning component for percentage calculation';
                setError(msg);
                setSnackbar({ open: true, message: msg, severity: 'error' });
                setLoading(false);
                return;
            }

            const data: any = {
                component_name: componentName.trim(),
                type,
                percentage: percentNum,
                percentage_basis: percentNum > 0 ? percentageBasis : 'Full (Total Gross / CTC)',
                selected_components: percentNum > 0 && percentageBasis === 'Selected Component(s)' ? JSON.stringify(selectedComponents) : '[]',
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

    const hasPercentage = percentage !== '' && parseFloat(percentage) > 0;

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
                            onChange={(e) => setType(e.target.value)}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        >
                            {TYPE_OPTIONS.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                    {opt}
                                </MenuItem>
                            ))}
                        </TextField>

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

                        {hasPercentage ? (
                            <TextField
                                select
                                fullWidth
                                label="Percentage Basis"
                                value={percentageBasis}
                                onChange={(e) => setPercentageBasis(e.target.value)}
                                disabled={loading}
                                InputLabelProps={{ shrink: true }}
                            >
                                {BASIS_OPTIONS.map((opt) => (
                                    <MenuItem key={opt} value={opt}>
                                        {opt}
                                    </MenuItem>
                                ))}
                            </TextField>
                        ) : (
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
                        )}

                        {hasPercentage && percentageBasis === 'Selected Component(s)' && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                                <Autocomplete
                                    multiple
                                    options={availableEarningOptions.filter((opt) => opt !== componentName)}
                                    value={selectedComponents}
                                    onChange={(_, newValue) => setSelectedComponents(newValue)}
                                    renderTags={(tagValue, getTagProps) =>
                                        tagValue.map((option, index) => (
                                            <Chip
                                                label={option}
                                                size="small"
                                                color="primary"
                                                variant="filled"
                                                {...getTagProps({ index })}
                                                key={option}
                                            />
                                        ))
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Base Earning Component(s) *"
                                            placeholder="Select Base Components (e.g. Basic, DA)"
                                            InputLabelProps={{ shrink: true }}
                                            helperText="Deduction percentage will be calculated from the sum of these selected components"
                                        />
                                    )}
                                />
                            </Box>
                        )}

                        {hasPercentage && (
                            <TextField
                                fullWidth
                                label="Static Amount"
                                type="number"
                                value={staticAmount}
                                onChange={(e) => setStaticAmount(e.target.value)}
                                disabled={loading}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 0, step: 0.01 }}
                                helperText="Optional fallback amount"
                            />
                        )}

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                height: 56,
                                gridColumn: hasPercentage ? { xs: '1 / -1', sm: 'auto' } : '1 / -1',
                            }}
                        >
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={isDefault}
                                        onChange={(e) => setIsDefault(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Is Default"
                            />
                        </Box>
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
