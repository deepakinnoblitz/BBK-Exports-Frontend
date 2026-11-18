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

import { getDoctypeList } from 'src/api/leads';
import { createDesignation } from 'src/api/hr-management';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onCreate: (newDesignation: string) => void;
    currentDesignationName?: string;
};

export function DesignationCreateDialog({ open, onClose, onCreate, currentDesignationName = '' }: Props) {
    const [designationName, setDesignationName] = useState(currentDesignationName);
    const [department, setDepartment] = useState('');
    const [description, setDescription] = useState('');

    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                setFetching(true);
                const data = await getDoctypeList('Department', ['name', 'status'], { status: 'Active' });
                const activeDepts = (data || []).filter(
                    (dept: any) => (dept.status || '').toLowerCase() !== 'inactive'
                );
                setDepartments(activeDepts);
            } catch (err) {
                console.error('Failed to fetch departments:', err);
            } finally {
                setFetching(false);
            }
        };

        if (open) {
            fetchDepartments();
            setDesignationName(currentDesignationName);
            setDepartment('');
            setDescription('');
            setError('');
        }
    }, [open, currentDesignationName]);

    const handleSubmit = async () => {
        if (!designationName.trim()) {
            setError('Designation name is required');
            return;
        }

        if (!department) {
            setError('Department is required');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await createDesignation({
                designation_name: designationName,
                department,
                description
            });
            onCreate(designationName);
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
                        options={departments}
                        getOptionLabel={(option) => {
                            if (typeof option === 'string') return option;
                            return option?.name || '';
                        }}
                        value={departments.find((d) => d.name === department) || null}
                        onChange={(event, newValue) => {
                            const value = typeof newValue === 'object' ? newValue?.name : newValue;
                            setDepartment(value || '');
                            if (error) setError('');
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                required
                                label="Department"
                                placeholder="Search department..."
                                error={!!error && !department}
                                helperText={!department && error === 'Department is required' ? error : ''}
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                            />
                        )}
                        disabled={loading || fetching}
                        loading={fetching}
                    />

                    <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>Description</Typography>
                        <TextField
                            fullWidth
                            multiline
                            minRows={4}
                            label=""
                            placeholder="Enter description..."
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
                </Box>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
