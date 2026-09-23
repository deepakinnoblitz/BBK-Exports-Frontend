import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import { createDesignation } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onCreate: (newDesignation: string) => void;
    currentDesignationName?: string;
    defaultDepartment?: string;
};

export function DesignationCreateDialog({
    open,
    onClose,
    onCreate,
    currentDesignationName = '',
    defaultDepartment = ''
}: Props) {
    const [designationName, setDesignationName] = useState(currentDesignationName);
    const [department, setDepartment] = useState<any>(defaultDepartment || null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [departmentOptions, setDepartmentOptions] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            setDesignationName(currentDesignationName);
            setDepartment(defaultDepartment || null);
            setDescription('');
            setError('');

            // Fetch departments
            getDoctypeList('Department', ['name', 'department_name'])
                .then(setDepartmentOptions)
                .catch(console.error);
        }
    }, [open, currentDesignationName, defaultDepartment]);

    const handleSubmit = async () => {
        if (!designationName.trim()) {
            setError('Designation Name is required');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const deptName = typeof department === 'object' && department ? (department.department_name || department.name) : department;
            await createDesignation({
                designation_name: designationName.trim(),
                department: deptName || undefined,
                description: description.trim() || undefined,
                status: 'Active'
            });
            onCreate(designationName.trim());
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create designation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">New Designation</Typography>
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
                        label="Designation Name"
                        placeholder="e.g. Senior Merchandiser, Quality Checker, Tailor"
                        value={designationName}
                        onChange={(e) => {
                            setDesignationName(e.target.value);
                            if (error) setError('');
                        }}
                        error={!!error}
                        helperText={error}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                    />

                    <Autocomplete
                        fullWidth
                        options={departmentOptions}
                        value={department}
                        onChange={(_, newValue) => setDepartment(newValue)}
                        getOptionLabel={(option) => {
                            if (typeof option === 'string') return option;
                            return option.department_name || option.name || '';
                        }}
                        isOptionEqualToValue={(option, val) => {
                            const optVal = typeof option === 'string' ? option : (option.department_name || option.name);
                            const currentVal = typeof val === 'string' ? val : (val?.department_name || val?.name);
                            return optVal === currentVal;
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Department"
                                placeholder="Select Department (Optional)"
                                InputLabelProps={{ shrink: true }}
                            />
                        )}
                        disabled={loading}
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Description"
                        placeholder="Add a brief description (Optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                    />
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
