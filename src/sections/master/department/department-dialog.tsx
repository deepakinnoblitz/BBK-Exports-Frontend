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

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import { createDepartment, updateDepartment, renameDepartment, getDepartment, Department } from 'src/api/masters';

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

    useEffect(() => {
        const fetchData = async () => {
            if (open) {
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
        if (!departmentName.trim()) {
            setError('required');
            setSnackbar({ open: true, message: 'Department name is required', severity: 'error' });
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
                    department_code: departmentCode,
                    department_head: departmentHead?.name || "",
                    status,
                    description
                };
                await updateDepartment(currentId, data);
            } else {
                const data: Partial<Department> = {
                    department_name: departmentName,
                    department_code: departmentCode,
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
                                setDepartmentName(e.target.value);
                                if (error === 'required') setError('');
                            }}
                            error={error === 'required'}
                            helperText={error === 'required' ? 'Department name is required' : ''}
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
                                if (error) setError('');
                            }}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Autocomplete
                            fullWidth
                            options={employeeOptions}
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

                    {error && !error.includes('name') && !error.includes('code') && (
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
