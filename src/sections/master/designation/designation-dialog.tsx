import type { 
    Designation} from 'src/api/masters';

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
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { getDoctypeList } from 'src/api/leads';
import { 
    getDesignation, 
    fetchDepartments, 
    createDesignation, 
    updateDesignation,
    renameDesignation
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
    const [existingDesignations, setExistingDesignations] = useState<any[]>([]);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const isDuplicateCode = (codeToCheck: string) => {
        const trimmed = codeToCheck.trim().toLowerCase();
        if (!trimmed) return false;
        return existingDesignations.some((d) => {
            if (id && (d.name === id || d.designation_name === id)) return false;
            return (d.designation_code || '').trim().toLowerCase() === trimmed;
        });
    };

    useEffect(() => {
        const loadDepartments = async () => {
            try {
                const res = await fetchDepartments({ 
                    page_size: 500,
                    filters: [['Department', 'status', '=', 'Active']]
                });
                const activeDepts = (res.data || []).filter(
                    (dept: any) => (dept.status || '').toLowerCase() !== 'inactive'
                );
                setDepartments(activeDepts);
            } catch (err) {
                console.error('Failed to fetch departments:', err);
            }
        };

        const loadDesignations = async () => {
            try {
                const res = await getDoctypeList('Designation', ['name', 'designation_name', 'designation_code'], undefined, 1000);
                setExistingDesignations(res || []);
            } catch (err) {
                console.error('Failed to fetch designations:', err);
            }
        };

        const fetchData = async () => {
            if (open) {
                await Promise.all([loadDepartments(), loadDesignations()]);
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
        const nameTrimmed = designationName.trim();
        const codeTrimmed = designationCode.trim();
        const errs: string[] = [];
        if (!nameTrimmed) {
            errs.push('name');
        } else if (nameTrimmed.length > 140 || designationName.length > 140) {
            errs.push('name_max_length');
        }
        if (!department) errs.push('department');
        if (codeTrimmed.length > 140 || designationCode.length > 140) {
            errs.push('code_max_length');
        } else if (codeTrimmed && isDuplicateCode(designationCode)) {
            errs.push('code_duplicate');
        }

        if (errs.length > 0) {
            setError(errs.join(','));
            let msg = 'Please fill in all required fields';
            if (errs.includes('code_max_length')) {
                msg = 'Maximum character limit is 140 characters for Designation Code.';
            } else if (errs.includes('name_max_length')) {
                msg = 'Maximum character limit is 140 characters for Designation Name.';
            } else if (errs.includes('code_duplicate')) {
                msg = 'Designation code already exists. Please enter a unique designation code.';
            } else if (errs.length === 1) {
                if (errs[0] === 'name') msg = 'Designation name is required';
                if (errs[0] === 'department') msg = 'Department is required';
            }
            setSnackbar({ 
                open: true, 
                message: msg, 
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
                    designation_code: designationCode.trim(),
                    department: department!,
                    level: level as any,
                    status,
                    description,
                };
                await updateDesignation(currentId, data);
            } else {
                const data: Partial<Designation> = {
                    designation_name: designationName,
                    designation_code: designationCode.trim(),
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
            const lowerMsg = msg.toLowerCase();
            if (lowerMsg.includes('designation code') && (lowerMsg.includes('unique') || lowerMsg.includes('already exists'))) {
                setError((prev) => {
                    const list = prev ? prev.split(',') : [];
                    if (!list.includes('code_duplicate')) list.push('code_duplicate');
                    return list.join(',');
                });
                setSnackbar({ open: true, message: 'Designation code already exists. Please enter a unique designation code.', severity: 'error' });
            } else if (
                lowerMsg.includes('max characters allowed is 140') ||
                lowerMsg.includes('will get truncated') ||
                lowerMsg.includes('character limit is 140')
            ) {
                if (lowerMsg.includes('designation name') || (!lowerMsg.includes('designation code') && !lowerMsg.includes('code') && (designationName.length > 140 || designationName.trim().length > 140))) {
                    setError((prev) => {
                        const list = prev ? prev.split(',') : [];
                        if (!list.includes('name_max_length')) list.push('name_max_length');
                        return list.join(',');
                    });
                    setSnackbar({ open: true, message: 'Maximum character limit is 140 characters for Designation Name.', severity: 'error' });
                } else {
                    setError((prev) => {
                        const list = prev ? prev.split(',') : [];
                        if (!list.includes('code_max_length')) list.push('code_max_length');
                        return list.join(',');
                    });
                    setSnackbar({ open: true, message: 'Maximum character limit is 140 characters for Designation Code.', severity: 'error' });
                }
            } else {
                setError(msg);
                setSnackbar({ open: true, message: msg, severity: 'error' });
            }
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
                                const val = e.target.value;
                                setDesignationName(val);
                                const errList = error.split(',').filter(Boolean);
                                const nextErrs = errList.filter((err) => {
                                    if (err === 'name' || err === 'required') return false;
                                    if (err === 'name_max_length' && val.trim().length <= 140 && val.length <= 140) return false;
                                    return true;
                                });
                                setError(nextErrs.join(','));
                            }}
                            error={
                                error.split(',').includes('name') ||
                                error.split(',').includes('name_max_length') ||
                                designationName.length > 140 ||
                                designationName.trim().length > 140
                            }
                            helperText={
                                error.split(',').includes('name')
                                    ? 'Designation name is required'
                                    : (error.split(',').includes('name_max_length') || designationName.length > 140 || designationName.trim().length > 140)
                                    ? 'Maximum character limit is 140 characters'
                                    : ''
                            }
                            disabled={loading}
                            autoFocus
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                        />
                        <TextField
                            fullWidth
                            label="Designation Code"
                            value={designationCode}
                            onChange={(e) => {
                                const val = e.target.value;
                                setDesignationCode(val);
                                const errList = error.split(',').filter(Boolean);
                                const nextErrs = errList.filter((err) => {
                                    if (err === 'code_duplicate') return false;
                                    if (err === 'code_max_length' && val.trim().length <= 140 && val.length <= 140) return false;
                                    return true;
                                });
                                setError(nextErrs.join(','));
                            }}
                            error={
                                error.split(',').includes('code_duplicate') ||
                                error.split(',').includes('code_max_length') ||
                                designationCode.length > 140 ||
                                designationCode.trim().length > 140 ||
                                (designationCode.trim() !== '' && isDuplicateCode(designationCode))
                            }
                            helperText={
                                (designationCode.length > 140 || designationCode.trim().length > 140 || error.split(',').includes('code_max_length'))
                                    ? 'Maximum character limit is 140 characters'
                                    : (error.split(',').includes('code_duplicate') || (designationCode.trim() !== '' && isDuplicateCode(designationCode)))
                                    ? 'Designation code already exists'
                                    : ''
                            }
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
