import type { Department } from 'src/api/masters';

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
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { filterEmployeeOptions } from 'src/utils/filter-employees';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import { getDepartment, createDepartment, updateDepartment, renameDepartment } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    id?: string | null;
};

export function DepartmentDialog({ open, onClose, onSuccess, id }: Props) {
    const [departmentName, setDepartmentName] = useState('');
    const [departmentCode, setDepartmentCode] = useState('');
    const [departmentHead, setDepartmentHead] = useState<any>(null);
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
    const [description, setDescription] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
    const [existingDepartments, setExistingDepartments] = useState<any[]>([]);

    const isDuplicateCode = (codeToCheck: string) => {
        const trimmed = codeToCheck.trim().toLowerCase();
        if (!trimmed) return false;
        return existingDepartments.some((d) => {
            if (id && (d.name === id || d.department_name === id)) return false;
            return (d.department_code || '').trim().toLowerCase() === trimmed;
        });
    };

    useEffect(() => {
        const loadDepartments = async () => {
            try {
                const res = await getDoctypeList('Department', ['name', 'department_name', 'department_code'], undefined, 1000);
                setExistingDepartments(res || []);
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
                        const department = await getDepartment(id);
                        // Use department.name (the ID) to ensure it's not blank in edit mode
                        setDepartmentName(department.name || department.department_name || '');
                        setDepartmentCode(department.department_code || '');
                        setDepartmentHead(department.department_head ? { name: department.department_head, employee_name: department.department_head } : null);
                        setStatus(department.status || 'Active');
                        setDescription(department.description || '');
                    } catch (err) {
                        console.error('Failed to fetch department:', err);
                        setSnackbar({ open: true, message: 'Failed to fetch department details', severity: 'error' });
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setDepartmentName('');
                    setDepartmentCode('');
                    setDepartmentHead(null);
                    setStatus('Active');
                    setDescription('');
                }
                setError('');

                // Fetch employees for Department Head
                getDoctypeList('Employee', ['name', 'employee_name'])
                    .then(setEmployeeOptions)
                    .catch(console.error);
            }
        };

        fetchData();
    }, [open, id]);

    const handleSubmit = async () => {
        const nameTrimmed = departmentName.trim();
        const errs: string[] = [];
        if (!nameTrimmed) {
            errs.push('name');
        } else if (nameTrimmed.length > 140 || departmentName.length > 140) {
            errs.push('name_max_length');
        }
        if (departmentCode.trim() && isDuplicateCode(departmentCode)) errs.push('code_duplicate');

        if (errs.length > 0) {
            setError(errs.join(','));
            let msg = 'Please fill in all required fields';
            if (errs.includes('name_max_length')) {
                msg = 'Maximum character limit is 140 characters for Department Name.';
            } else if (errs.includes('code_duplicate')) {
                msg = 'Department code already exists. Please enter a unique department code.';
            } else if (errs.includes('name')) {
                msg = 'Department name is required';
            }
            setSnackbar({ open: true, message: msg, severity: 'error' });
            return;
        }

        try {
            setLoading(true);
            setError('');

            if (id) {
                let currentId = id;
                // Handle renaming if the department name has changed
                if (departmentName !== id) {
                    await renameDepartment(id, departmentName);
                    currentId = departmentName;
                }

                const data: Partial<Department> = {
                    department_name: departmentName,
                    department_code: departmentCode.trim(),
                    department_head: departmentHead?.name || "",
                    status,
                    description
                };
                await updateDepartment(currentId, data);
            } else {
                const data: Partial<Department> = {
                    department_name: departmentName,
                    department_code: departmentCode.trim(),
                    department_head: departmentHead?.name || "",
                    status,
                    description
                };
                await createDepartment(data);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            const msg = err.message || 'Failed to save department';
            const lowerMsg = msg.toLowerCase();
            if (lowerMsg.includes('department code') && (lowerMsg.includes('unique') || lowerMsg.includes('already exists'))) {
                setError((prev) => {
                    const list = prev ? prev.split(',') : [];
                    if (!list.includes('code_duplicate')) list.push('code_duplicate');
                    return list.join(',');
                });
                setSnackbar({ open: true, message: 'Department code already exists. Please enter a unique department code.', severity: 'error' });
            } else if (
                lowerMsg.includes('max characters allowed is 140') ||
                lowerMsg.includes('will get truncated') ||
                lowerMsg.includes('character limit is 140')
            ) {
                setError((prev) => {
                    const list = prev ? prev.split(',') : [];
                    if (!list.includes('name_max_length')) list.push('name_max_length');
                    return list.join(',');
                });
                setSnackbar({ open: true, message: 'Maximum character limit is 140 characters for Department Name.', severity: 'error' });
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
            maxWidth="md"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: (theme) => theme.customShadows.z24,
                    maxHeight: '90vh',
                },
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {id ? 'Edit Department' : 'New Department'}
                </Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: 'text.disabled' }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
                <Box sx={{ py: 1, display: 'flex', flexDirection: 'column', gap: 3, pt: 4 }}>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={3}>
                        <TextField
                            required
                            fullWidth
                            label="Department Name"
                            value={departmentName}
                            onChange={(e) => {
                                const val = e.target.value;
                                setDepartmentName(val);
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
                                error === 'required' ||
                                error.split(',').includes('name_max_length') ||
                                departmentName.length > 140 ||
                                departmentName.trim().length > 140
                            }
                            helperText={
                                (error.split(',').includes('name') || error === 'required')
                                    ? 'Department name is required'
                                    : (error.split(',').includes('name_max_length') || departmentName.length > 140 || departmentName.trim().length > 140)
                                    ? 'Maximum character limit is 140 characters'
                                    : ''
                            }
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                        />
                        <TextField
                            fullWidth
                            label="Department Code"
                            value={departmentCode}
                            onChange={(e) => {
                                setDepartmentCode(e.target.value);
                                if (error.split(',').includes('code_duplicate')) {
                                    setError(error.split(',').filter((err) => err !== 'code_duplicate').join(','));
                                }
                            }}
                            error={error.split(',').includes('code_duplicate') || (departmentCode.trim() !== '' && isDuplicateCode(departmentCode))}
                            helperText={
                                (error.split(',').includes('code_duplicate') || (departmentCode.trim() !== '' && isDuplicateCode(departmentCode)))
                                    ? 'Department code already exists'
                                    : ''
                            }
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Autocomplete
                            fullWidth
                            options={employeeOptions}
                            filterOptions={filterEmployeeOptions}
                            getOptionLabel={(option) => option.employee_name || option.name || ''}
                            value={departmentHead}
                            isOptionEqualToValue={(option, value) => option?.name === value?.name}
                            onChange={(event, newValue) => {
                                setDepartmentHead(newValue);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Department Head"
                                    placeholder="Search Employee..."
                                    InputLabelProps={{ shrink: true }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1.5,
                                            bgcolor: 'background.neutral',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                        },
                                    }}
                                />
                            )}
                            renderOption={(props, option) => {
                                const { key, ...optionProps } = props as any;
                                return (
                                    <li key={key} {...optionProps}>
                                        <Stack spacing={0.5}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                {option.employee_name || option.name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                ID: {option.name}
                                            </Typography>
                                        </Stack>
                                    </li>
                               );
                            }}
                        />
                        <TextField
                            select
                            fullWidth
                            label="Status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                            InputLabelProps={{ shrink: true }}
                        >
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="Inactive">Inactive</MenuItem>
                        </TextField>
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>Description</Typography>
                        <TextField
                            fullWidth
                            multiline
                            minRows={4}
                            label=""
                            placeholder=""
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.100' : 'grey.900',
                                }
                            }}
                        />
                    </Box>

                    {error &&
                        !error.split(',').some((err) => ['name', 'required', 'name_max_length', 'code_duplicate'].includes(err)) &&
                        !error.toLowerCase().includes('max characters') &&
                        !error.toLowerCase().includes('truncated') && (
                            <Typography color="error" variant="body2">{error}</Typography>
                        )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 1.5, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{ bgcolor: COMMON_COLORS.emerald.main, color: 'common.white', '&:hover': { bgcolor: COMMON_COLORS.emerald.dark } }}
                >
                    {id ? 'Save Changes' : 'Create'}
                </Button>
            </DialogActions>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', whiteSpace: 'pre-line' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Dialog>
    );
}
