import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { 
    createDesignation, 
    updateDesignation, 
    renameDesignation, 
    getDesignation, 
    Designation,
    fetchDepartments
} from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    id?: string | null;
};

const LEVEL_OPTIONS = ['Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

export function DesignationDialog({ open, onClose, onSuccess, id }: Props) {
    const [designationName, setDesignationName] = useState('');
    const [designationCode, setDesignationCode] = useState('');
    const [department, setDepartment] = useState<string | null>(null);
    const [level, setLevel] = useState<string>('Junior');
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
    const [description, setDescription] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [departments, setDepartments] = useState<any[]>([]);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        const loadDepartments = async () => {
            try {
                const res = await fetchDepartments({ page_size: 100 });
                setDepartments(res.data || []);
            } catch (err) {
                console.error('Failed to fetch departments:', err);
            }
        };

        const fetchData = async () => {
            if (open) {
                await loadDepartments();
                if (id) {
                    try {
                        setLoading(true);
                        const data = await getDesignation(id);
                        setDesignationName(data.designation_name || data.name || '');
                        setDesignationCode(data.designation_code || '');
                        setDepartment(data.department || null);
                        setLevel(data.level || 'Junior');
                        setStatus(data.status || 'Active');
                        setDescription(data.description || '');
                    } catch (err) {
                        console.error('Failed to fetch designation:', err);
                        setSnackbar({ open: true, message: 'Failed to fetch details', severity: 'error' });
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setDesignationName('');
                    setDesignationCode('');
                    setDepartment(null);
                    setLevel('Junior');
                    setStatus('Active');
                    setDescription('');
                }
                setError('');
            }
        };

        fetchData();
    }, [open, id]);

    const handleSubmit = async () => {
        const errs: string[] = [];
        if (!designationName.trim()) errs.push('name');
        if (!department) errs.push('department');

        if (errs.length > 0) {
            setError(errs.join(','));
            setSnackbar({ 
                open: true, 
                message: errs.length > 1 ? 'Please fill in all required fields' : (errs[0] === 'name' ? 'Designation name is required' : 'Department is required'), 
                severity: 'error' 
            });
            return;
        }

        try {
            setLoading(true);
            setError('');

            if (id) {
                let currentId = id;
                // Handle renaming if the designation name has changed
                if (designationName !== id) {
                    await renameDesignation(id, designationName);
                    currentId = designationName;
                }

                const data: Partial<Designation> = {
                    designation_name: designationName,
                    designation_code: designationCode,
                    department: department!,
                    level: level as any,
                    status,
                    description,
                };
                await updateDesignation(currentId, data);
            } else {
                const data: Partial<Designation> = {
                    designation_name: designationName,
                    designation_code: designationCode,
                    department: department!,
                    level: level as any,
                    status,
                    description,
                };
                await createDesignation(data);
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
                <Typography variant="h6">{id ? 'Edit Designation' : 'New Designation'}</Typography>
                <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={3}>
                        <TextField
                            required
                            fullWidth
                            label="Designation Name"
                            value={designationName}
                            onChange={(e) => {
                                 setDesignationName(e.target.value);
                                 if (error.split(',').includes('name')) {
                                     setError(error.split(',').filter(err => err !== 'name').join(','));
                                 }
                            }}
                            error={error.split(',').includes('name')}
                            helperText={error.split(',').includes('name') ? 'Designation name is required' : ''}
                            disabled={loading}
                            autoFocus
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                        />
                        <TextField
                            fullWidth
                            label="Designation Code"
                            value={designationCode}
                            onChange={(e) => setDesignationCode(e.target.value)}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Autocomplete
                            fullWidth
                            options={departments.map((dept) => dept.name)}
                            value={department}
                            onChange={(event, newValue) => {
                                setDepartment(newValue);
                                if (error.split(',').includes('department')) {
                                    setError(error.split(',').filter(err => err !== 'department').join(','));
                                }
                            }}
                            disabled={loading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Department"
                                    required
                                    error={error.split(',').includes('department')}
                                    helperText={error.split(',').includes('department') ? 'Department is required' : ''}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                                />
                            )}
                        />
                        <TextField
                            select
                            fullWidth
                            label="Level"
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        >
                            {LEVEL_OPTIONS.map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            fullWidth
                            label="Status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>
                    </Box>

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Description"
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
