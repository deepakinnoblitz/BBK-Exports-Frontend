import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import {
    createHRDocumentCategoryMaster,
    updateHRDocumentCategoryMaster,
    renameHRDocumentCategoryMaster,
    getHRDocumentCategoryMaster,
    HRDocumentCategoryMaster,
} from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

import { CustomSwitch } from 'src/sections/reminders/reminders-settings-view';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    id?: string | null;
};

export function HRDocumentCategoryDialog({ open, onClose, onSuccess, id }: Props) {
    const [categoryName, setCategoryName] = useState('');
    const [isActive, setIsActive] = useState(true);
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
                        const data = await getHRDocumentCategoryMaster(id);
                        setCategoryName(data.category_name || data.name || '');
                        setIsActive(data.is_active === undefined ? true : Boolean(data.is_active));
                        setDescription(data.description || '');
                    } catch (err) {
                        console.error('Failed to fetch HR document category details:', err);
                        setSnackbar({ open: true, message: 'Failed to fetch details', severity: 'error' });
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setCategoryName('');
                    setIsActive(true);
                    setDescription('');
                }
                setError('');
            }
        };

        fetchData();
    }, [open, id]);

    const handleSubmit = async () => {
        if (!categoryName.trim()) {
            setError('required');
            setSnackbar({ open: true, message: 'Category name is required', severity: 'error' });
            return;
        }

        try {
            setLoading(true);
            setError('');

            if (id) {
                let currentId = id;
                if (categoryName.trim() !== id) {
                    await renameHRDocumentCategoryMaster(id, categoryName.trim());
                    currentId = categoryName.trim();
                }

                const data: Partial<HRDocumentCategoryMaster> = {
                    category_name: categoryName.trim(),
                    is_active: isActive ? 1 : 0,
                    description: description.trim(),
                };
                await updateHRDocumentCategoryMaster(currentId, data);
            } else {
                const data: Partial<HRDocumentCategoryMaster> = {
                    category_name: categoryName.trim(),
                    is_active: isActive ? 1 : 0,
                    description: description.trim(),
                };
                await createHRDocumentCategoryMaster(data);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            const msg = err.message || 'Failed to save category';
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
                    boxShadow: (themeVar: any) => themeVar.customShadows.z24,
                },
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{id ? 'Edit HR Document Category' : 'New HR Document Category'}</Typography>
                <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={3} sx={{ py: 2 }}>
                    <TextField
                        required
                        fullWidth
                        label="Category Name"
                        value={categoryName}
                        onChange={(e) => {
                            setCategoryName(e.target.value);
                            if (error === 'required') setError('');
                        }}
                        error={error === 'required'}
                        helperText={error === 'required' ? 'Category name is required' : ''}
                        disabled={loading}
                        autoFocus
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                    />

                    <FormControlLabel
                        control={
                            <CustomSwitch
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                disabled={loading}
                            />
                        }
                        label="Is Active"
                        sx={{
                            m: 0,
                            '& .MuiFormControlLabel-label': {
                                ml: 1,
                            },
                        }}
                    />

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
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                >
                    {loading ? (id ? 'Updating...' : 'Creating...') : id ? 'Update' : 'Create'}
                </Button>
            </DialogActions>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                message={snackbar.message}
            />
        </Dialog>
    );
}
