import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import { createDepartment } from 'src/api/hr-management';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onCreate: (newDepartment: string) => void;
    currentDepartmentName?: string;
};

export function DepartmentCreateDialog({ open, onClose, onCreate, currentDepartmentName = '' }: Props) {
    const [departmentName, setDepartmentName] = useState(currentDepartmentName);
    const [departmentCode, setDepartmentCode] = useState('');
    const [departmentHead, setDepartmentHead] = useState<any>(null);
    const [status, setStatus] = useState('Active');
    const [description, setDescription] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            setDepartmentName(currentDepartmentName);
            setDepartmentCode('');
            setDepartmentHead(null);
            setStatus('Active');
            setDescription('');
            setError('');

            // Fetch employees for Department Head
            getDoctypeList('Employee', ['name', 'employee_name'])
                .then(setEmployeeOptions)
                .catch(console.error);
        }
    }, [open, currentDepartmentName]);

    const handleSubmit = async () => {
        if (!departmentName.trim()) {
            setError('Department name is required');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await createDepartment({
                department_name: departmentName,
                department_code: departmentCode,
                department_head: departmentHead?.name,
                status,
                description
            });
            onCreate(departmentName);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create department');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">New Department</Typography>
                </Box>
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
                            label="Department Name"
                            value={departmentName}
                            onChange={(e) => {
                                setDepartmentName(e.target.value);
                                if (error) setError('');
                            }}
                            error={!!error && error.includes('name')}
                            helperText={error && error.includes('name') ? error : ''}
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
                            error={!!error && error.includes('code')}
                            helperText={error && error.includes('code') ? error : ''}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Autocomplete
                            fullWidth
                            options={employeeOptions}
                            getOptionLabel={(option) => option.employee_name || option.name || ''}
                            value={departmentHead}
                            onChange={(event, newValue) => {
                                setDepartmentHead(newValue);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Department Head"
                                    placeholder="Select Employee"
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        />
                        <TextField
                            select
                            fullWidth
                            label="Status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
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

            <DialogActions>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{ bgcolor: COMMON_COLORS.emerald.main, color: 'common.white', '&:hover': { bgcolor: COMMON_COLORS.emerald.dark } }}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
