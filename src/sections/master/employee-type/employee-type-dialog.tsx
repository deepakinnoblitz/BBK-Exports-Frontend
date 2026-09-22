import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { 
    createEmployeeType, 
    updateEmployeeType, 
    renameEmployeeType, 
    getEmployeeType, 
    EmployeeType 
} from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    id?: string | null;
};

const CATEGORY_OPTIONS = [
    'CTC',
    'Non CTC',
    'Skilled',
    'Semi Skilled',
    'Unskilled',
    'General',
];

export function EmployeeTypeDialog({ open, onClose, onSuccess, id }: Props) {
    const [employeeType, setEmployeeType] = useState('');
    const [categoryType, setCategoryType] = useState('General');
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
                        const data = await getEmployeeType(id);
                        setEmployeeType(data.employee_type || data.name || '');
                        setCategoryType(data.category_type || 'General');
                        setDescription(data.description || '');
                    } catch (err) {
                        console.error('Failed to fetch employee type:', err);
                        setSnackbar({ open: true, message: 'Failed to fetch details', severity: 'error' });
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setEmployeeType('');
                    setCategoryType('General');
                    setDescription('');
                }
                setError('');
            }
        };

        fetchData();
    }, [open, id]);

    const previewName = employeeType.trim()
        ? (categoryType && categoryType !== 'General' && !employeeType.toLowerCase().includes(`- ${categoryType.toLowerCase()}`)
            ? `${employeeType.trim()} - ${categoryType}`
            : employeeType.trim())
        : '';

    const handleSubmit = async () => {
        if (!employeeType.trim()) {
            setError('required');
            setSnackbar({ open: true, message: 'Employee Type name is required', severity: 'error' });
            return;
        }

        try {
            setLoading(true);
            setError('');

            const finalName = previewName || employeeType.trim();

            if (id) {
                let currentId = id;
                if (finalName !== id) {
                    await renameEmployeeType(id, finalName);
                    currentId = finalName;
                }

                const data: Partial<EmployeeType> = {
                    employee_type: finalName,
                    category_type: categoryType,
                    description: description.trim() || undefined,
                };
                await updateEmployeeType(currentId, data);
            } else {
                const data: Partial<EmployeeType> = {
                    employee_type: employeeType.trim(),
                    category_type: categoryType,
                    description: description.trim() || undefined,
                };
                await createEmployeeType(data);
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
                <Typography variant="h6">{id ? 'Edit Employee Type' : 'New Employee Type'}</Typography>
                <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                        required
                        fullWidth
                        label="Employee Type"
                        placeholder="e.g. Staff, Workers"
                        value={employeeType}
                        onChange={(e) => {
                            setEmployeeType(e.target.value);
                            if (error === 'required') setError('');
                        }}
                        error={error === 'required'}
                        helperText={error === 'required' ? 'Employee Type is required' : ''}
                        disabled={loading}
                        autoFocus
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
