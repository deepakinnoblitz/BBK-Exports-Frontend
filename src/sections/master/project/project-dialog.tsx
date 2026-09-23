import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { getDoctypeList } from 'src/api/leads';
import { createProject, updateProject, deleteProject, renameProject, getProject, Project } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    id?: string | null;
};

export function ProjectDialog({ open, onClose, onSuccess, id }: Props) {
    const [projectName, setProjectName] = useState('');
    const [customer, setCustomer] = useState<any>(null);
    const [customerOptions, setCustomerOptions] = useState<any[]>([]);

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
                        const project = await getProject(id);
                        // Use project.name (the ID) as the project name in our field to fix the "blank in edit" issue
                        setProjectName(project.name || project.project_name || '');
                        setCustomer(project.customer ? { name: project.customer, customer_name: project.customer } : null);
                    } catch (err) {
                        console.error('Failed to fetch project:', err);
                        setSnackbar({ open: true, message: 'Failed to fetch project details', severity: 'error' });
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setProjectName('');
                    setCustomer(null);
                }
                setError('');

                // Fetch customer options
                getDoctypeList('Customer', ['name', 'customer_name'])
                    .then(setCustomerOptions)
                    .catch(console.error);
            }
        };

        fetchData();
    }, [open, id]);

    const handleSubmit = async () => {
        if (!projectName.trim()) {
            setError('required');
            setSnackbar({ open: true, message: 'Project name is required', severity: 'error' });
            return;
        }

        try {
            setLoading(true);
            setError('');

            if (id) {
                let currentId = id;
                // Handle renaming if the project name has changed
                if (projectName !== id) {
                    await renameProject(id, projectName);
                    currentId = projectName; // Use the new name for the subsequent update
                }

                const data: Partial<Project> = {
                    project_name: projectName,
                    customer: customer?.name || "",
                };
                await updateProject(currentId, data);
            } else {
                const data: Partial<Project> = {
                    project_name: projectName,
                    customer: customer?.name || "",
                };
                await createProject(data);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            const msg = err.message || 'Failed to save project';
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
            maxWidth="xs"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                },
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">{id ? 'Edit Project' : 'New Project'}</Typography>
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
                        label="Project Name"
                        value={projectName}
                        onChange={(e) => {
                            setProjectName(e.target.value);
                            if (error === 'required') setError('');
                        }}
                        error={error === 'required'}
                        helperText={error === 'required' ? 'Project name is required' : ''}
                        disabled={loading}
                        autoFocus
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                    />

                    {/* <Autocomplete
                        fullWidth
                        options={customerOptions}
                        getOptionLabel={(option) => option.customer_name || option.name || ''}
                        value={customer}
                        isOptionEqualToValue={(option, value) => option?.name === value?.name}
                        onChange={(event, newValue) => setCustomer(newValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Client"
                                placeholder="Search Client..."
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
                                            {option.customer_name || option.name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            ID: {option.name}
                                        </Typography>
                                    </Stack>
                                </li>
                            );
                        }}
                        disabled={loading}
                    /> */}

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
                    {id ? 'Save Changes' : 'Create Project'}
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
