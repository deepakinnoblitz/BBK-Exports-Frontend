import type { EvaluationTraitCategory} from 'src/api/employee-evaluation';

import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { createEmployeeEvaluationTraitCategory, updateEmployeeEvaluationTraitCategory } from 'src/api/employee-evaluation';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: VoidFunction;
    onSuccess: VoidFunction;
    selectedCategory?: EvaluationTraitCategory | null;
};

export function EvaluationTraitCategoryFormDialog({ open, onClose, onSuccess, selectedCategory }: Props) {
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<{
        category_name: string;
    }>({
        category_name: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (selectedCategory) {
            setFormData({
                category_name: selectedCategory.category_name || '',
            });
        } else {
            setFormData({
                category_name: '',
            });
        }
    }, [selectedCategory, open]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.category_name) newErrors.category_name = 'Category Name is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
            };

            if (selectedCategory) {
                await updateEmployeeEvaluationTraitCategory(selectedCategory.name, dataToSave);
            } else {
                await createEmployeeEvaluationTraitCategory(dataToSave);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {selectedCategory ? 'Edit Criteria Category' : 'New Criteria Category'}
                <IconButton onClick={onClose}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={3} sx={{ pt: 1 }}>
                    <TextField
                        fullWidth
                        label="Category Name"
                        required
                        value={formData.category_name}
                        onChange={(e) => {
                            setFormData({ ...formData, category_name: e.target.value });
                            if (errors.category_name) setErrors({ ...errors, category_name: '' });
                        }}
                        error={!!errors.category_name}
                        helperText={errors.category_name}
                    />
                </Stack>
            </DialogContent>

            <DialogActions>
                <LoadingButton
                    variant="contained"
                    onClick={handleSave}
                    loading={loading}
                    sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
                >
                    {selectedCategory ? 'Update' : 'Create'}
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
}
