import type { EmployeeEvaluationTrait} from 'src/api/employee-evaluation';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { useEmployeeEvaluationPoints, useEmployeeEvaluationTraitCategories } from 'src/hooks/useEmployeeEvaluation';

import { createEmployeeEvaluationTrait, updateEmployeeEvaluationTrait } from 'src/api/employee-evaluation';

import { Iconify } from 'src/components/iconify';

import { EvaluationTraitCategoryFormDialog } from './evaluation-trait-category-form-dialog';

const filter = createFilterOptions<any>();

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: VoidFunction;
    onSuccess: VoidFunction;
    onError?: (message: string) => void;
    selectedTrait?: EmployeeEvaluationTrait | null;
};



export function EmployeeEvaluationTraitFormDialog({ open, onClose, onSuccess, onError, selectedTrait }: Props) {
    const { data: evaluationPoints } = useEmployeeEvaluationPoints();
    const { data: traitCategories, refetch: refetchCategories } = useEmployeeEvaluationTraitCategories();
    const [loading, setLoading] = useState(false);
    const [openAddCategory, setOpenAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const [formData, setFormData] = useState<{
        trait_name: string;
        category: string;
        description: string;
        how_to_improve: string;
        evaluation_scores: { evaluation_point: string; score: number }[];
    }>({
        trait_name: '',
        category: 'Behavior',
        description: '',
        how_to_improve: '',
        evaluation_scores: [],
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (selectedTrait) {
            setFormData({
                trait_name: selectedTrait.trait_name || '',
                category: selectedTrait.category || 'Behavior',
                description: selectedTrait.description || '',
                how_to_improve: selectedTrait.how_to_improve || '',
                evaluation_scores: selectedTrait.evaluation_scores || [],
            });
        } else {
            setFormData({
                trait_name: '',
                category: 'Behavior',
                description: '',
                how_to_improve: '',
                evaluation_scores: evaluationPoints.map(p => ({
                    evaluation_point: p.name,
                    score: p.default_score
                })),
            });
        }
    }, [selectedTrait, open, evaluationPoints]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.trait_name) newErrors.trait_name = 'Criteria Name is required';
        if (!formData.category) newErrors.category = 'Category is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            const errs: string[] = [];
            if (!formData.trait_name) errs.push('trait_name');
            if (!formData.category) errs.push('category');

            if (errs.length > 1) {
                onError?.('Please fill in all required fields');
            } else if (errs[0] === 'trait_name') {
                onError?.('Criteria Name is required');
            } else {
                onError?.('Category is required');
            }
            return;
        }

        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
            };

            if (selectedTrait) {
                await updateEmployeeEvaluationTrait(selectedTrait.name, dataToSave);
            } else {
                await createEmployeeEvaluationTrait(dataToSave);
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
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: (themeVar) => themeVar.customShadows.z24,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                        {selectedTrait ? 'Edit Performance Criteria' : 'New Performance Criteria'}
                    </Typography>
                    <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                    <Stack spacing={3} sx={{ pt: 1 }}>
                        <TextField
                            fullWidth
                            label="Criteria Name"
                            required
                            value={formData.trait_name}
                            onChange={(e) => {
                                setFormData({ ...formData, trait_name: e.target.value });
                                if (errors.trait_name) setErrors({ ...errors, trait_name: '' });
                            }}
                            error={!!errors.trait_name}
                            helperText={errors.trait_name}
                        />

                        <Autocomplete
                            fullWidth
                            options={traitCategories as any[]}
                            value={traitCategories.find((c: any) => c.category_name === formData.category) || null}
                            onChange={(_e, newVal: any) => {
                                if (newVal?.isNew) {
                                    setNewCategoryName(newVal.inputValue || '');
                                    setOpenAddCategory(true);
                                } else {
                                    const value = typeof newVal === 'string' ? newVal : newVal?.category_name || '';
                                    setFormData({ ...formData, category: value });
                                    if (errors.category) setErrors({ ...errors, category: '' });
                                }
                            }}
                            filterOptions={(currentOptions, params) => {
                                const filtered = filter(currentOptions, params);
                                const hasCreate = filtered.some((o: any) => o.isNew);
                                if (!hasCreate) {
                                    filtered.push({
                                        inputValue: params.inputValue,
                                        category_name: 'Create Category',
                                        isNew: true,
                                    });
                                }
                                return filtered;
                            }}
                            getOptionLabel={(option: any) => {
                                if (typeof option === 'string') return option;
                                if (option?.isNew) return option.inputValue || '';
                                return option?.category_name || '';
                            }}
                            isOptionEqualToValue={(option: any, value: any) =>
                                option?.category_name === value?.category_name
                            }
                            renderOption={(props, option: any) => (
                                <Box
                                    component="li"
                                    {...props}
                                    sx={{
                                        typography: 'body2',
                                        ...(option.isNew && {
                                            color: 'primary.main',
                                            fontWeight: 600,
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                            mt: 0.5,
                                            py: 1.5,
                                            minHeight: '48px',
                                            '&:hover': {
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                            },
                                        }),
                                    }}
                                >
                                    {option.isNew ? (
                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                            <Iconify icon="solar:add-circle-bold" width={22} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Create Category</Typography>
                                        </Stack>
                                    ) : (
                                        option.category_name
                                    )}
                                </Box>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Category"
                                    required
                                    error={!!errors.category}
                                    helperText={errors.category}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                                />
                            )}
                            selectOnFocus
                            clearOnBlur
                            handleHomeEndKeys
                        />

                        <Typography variant="subtitle1" sx={{ mt: 2 }}>
                            Score Overrides (Optional)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Leave empty to use global default scores.
                        </Typography>

                        {evaluationPoints.map((point) => {
                            const scoreRow = formData.evaluation_scores.find(s => s.evaluation_point === point.name);
                            return (
                                <Stack key={point.name} direction="row" spacing={2} alignItems="center">
                                    <Typography sx={{ minWidth: 100 }}>{point.point_name}</Typography>
                                    <TextField
                                        size="small"
                                        type="number"
                                        placeholder={`Default: ${point.default_score}`}
                                        value={scoreRow?.score ?? ''}
                                        onChange={(e) => {
                                            const newScore = e.target.value === '' ? undefined : Number(e.target.value);
                                            let newScores = [...formData.evaluation_scores];
                                            if (newScore === undefined) {
                                                newScores = newScores.filter(s => s.evaluation_point !== point.name);
                                            } else {
                                                const existingIndex = newScores.findIndex(s => s.evaluation_point === point.name);
                                                if (existingIndex > -1) {
                                                    newScores[existingIndex].score = newScore;
                                                } else {
                                                    newScores.push({ evaluation_point: point.name, score: newScore });
                                                }
                                            }
                                            setFormData({ ...formData, evaluation_scores: newScores });
                                        }}
                                    />
                                </Stack>
                            );
                        })}

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="How to Improve"
                            value={formData.how_to_improve}
                            onChange={(e) => setFormData({ ...formData, how_to_improve: e.target.value })}
                        />
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 1.5 }}>
                    <LoadingButton
                        variant="contained"
                        onClick={handleSave}
                        loading={loading}
                        sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
                    >
                        {selectedTrait ? 'Update' : 'Create'}
                    </LoadingButton>
                </DialogActions>
            </Dialog>

            <EvaluationTraitCategoryFormDialog
                open={openAddCategory}
                onClose={() => setOpenAddCategory(false)}
                onSuccess={async () => {
                    await refetchCategories();
                    // Auto-select the newly created category
                    setFormData((prev: any) => ({ ...prev, category: newCategoryName || prev.category }));
                    setOpenAddCategory(false);
                }}
            />
        </>
    );
}
