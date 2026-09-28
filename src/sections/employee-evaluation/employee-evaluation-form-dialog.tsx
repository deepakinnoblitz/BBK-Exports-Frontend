import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useEmployeeEvaluationPoints } from 'src/hooks/useEmployeeEvaluation';

import { getForValueOptions } from 'src/api/user-permissions';
import { createEmployeeEvaluationEvent, updateEmployeeEvaluationEvent } from 'src/api/employee-evaluation';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: VoidFunction;
    onSuccess: VoidFunction;
    onError?: (message: string) => void;
    selectedEvent?: any;
};


export function EmployeeEvaluationEventFormDialog({ open, onClose, onSuccess, onError, selectedEvent }: Props) {
    const [employees, setEmployees] = useState<any[]>([]);
    const [traits, setTraits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { data: evaluationPoints } = useEmployeeEvaluationPoints();

    const [formData, setFormData] = useState({
        employee: '',
        trait: '',
        evaluation_type: '',
        evaluation_date: dayjs().format('YYYY-MM-DD'),
        remarks: '',
        how_to_improve: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (selectedEvent) {
            setFormData({
                employee: selectedEvent.employee || '',
                trait: selectedEvent.trait || '',
                evaluation_type: selectedEvent.evaluation_type || 'Neutral',
                evaluation_date: selectedEvent.evaluation_date || dayjs().format('YYYY-MM-DD'),
                remarks: selectedEvent.remarks || '',
                how_to_improve: selectedEvent.how_to_improve || '',
            });
        } else {
            setFormData({
                employee: '',
                trait: '',
                evaluation_type: '',
                evaluation_date: dayjs().format('YYYY-MM-DD'),
                remarks: '',
                how_to_improve: '',
            });
        }
    }, [selectedEvent, open]);

    useEffect(() => {
        if (open) {
            getForValueOptions('Employee')
                .then(setEmployees)
                .catch(console.error);
            
            getForValueOptions('Evaluation Trait')
                .then(setTraits)
                .catch(console.error);
        }
    }, [open]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.employee) newErrors.employee = 'Employee is required';
        if (!formData.trait) newErrors.trait = 'Criteria is required';
        if (!formData.evaluation_type) newErrors.evaluation_type = 'Type is required';
        if (!formData.evaluation_date) newErrors.evaluation_date = 'Date is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            const errs: string[] = [];
            if (!formData.employee) errs.push('employee');
            if (!formData.trait) errs.push('trait');
            if (!formData.evaluation_type) errs.push('evaluation_type');
            if (!formData.evaluation_date) errs.push('evaluation_date');

            if (errs.length > 1) {
                onError?.('Please fill in all required fields');
            } else if (errs[0] === 'employee') {
                onError?.('Employee is required');
            } else if (errs[0] === 'trait') {
                onError?.('Criteria is required');
            } else if (errs[0] === 'evaluation_type') {
                onError?.('Type is required');
            } else {
                onError?.('Date is required');
            }
            return;
        }

        setLoading(true);
        try {
            if (selectedEvent) {
                await updateEmployeeEvaluationEvent(selectedEvent.name, formData);
            } else {
                await createEmployeeEvaluationEvent({
                    ...formData,
                    auto_submit: 1,
                });
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
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: (themeVar: any) => themeVar.customShadows.z24,
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
                    borderBottom: (theme: any) => `1px solid ${theme.palette.divider}`,
                }}
            >
                <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                    {selectedEvent ? 'Edit Employee Evaluation' : 'New Employee Evaluation'}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: (theme: any) => theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack spacing={3} sx={{ pt: 1 }}>
                        <Autocomplete
                            fullWidth
                            options={employees}
                            getOptionLabel={(option) => {
                                if (typeof option === 'string') return option;
                                return option.employee_name ? `${option.employee_name} (${option.name})` : option.name;
                            }}
                            value={employees.find((e) => e.name === formData.employee) || null}
                            onChange={(_, newValue) => {
                                setFormData({ ...formData, employee: newValue?.name || '' });
                                if (errors.employee) setErrors({ ...errors, employee: '' });
                            }}
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
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Employee"
                                    required
                                    error={!!errors.employee}
                                    helperText={errors.employee}
                                    InputLabelProps={{ shrink: true }}
                                    placeholder='Select Employee'
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1.5,
                                        },
                                    }}
                                />
                            )}
                        />

                        <Autocomplete
                            fullWidth
                            options={traits}
                            getOptionLabel={(option) => {
                                if (typeof option === 'string') return option;
                                return option.trait_name || option.name;
                            }}
                            value={traits.find((t) => t.name === formData.trait) || null}
                            onChange={(_, newValue) => {
                                setFormData({ ...formData, trait: newValue?.name || '' });
                                if (errors.trait) setErrors({ ...errors, trait: '' });
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Criteria"
                                    required
                                    error={!!errors.trait}
                                    helperText={errors.trait}
                                    InputLabelProps={{ shrink: true }}
                                    placeholder='Select Criteria'
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1.5,
                                        },
                                    }}
                                />
                            )}
                        />

                        <DatePicker
                            label="Evaluation Date"
                            format="DD-MM-YYYY"
                            value={dayjs(formData.evaluation_date)}
                            onChange={(newValue) => setFormData({ ...formData, evaluation_date: newValue?.format('YYYY-MM-DD') || '' })}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    required: true,
                                    error: !!errors.evaluation_date,
                                    helperText: errors.evaluation_date,
                                },
                            }}
                        />

                        <Autocomplete
                            fullWidth
                            options={evaluationPoints}
                            getOptionLabel={(option) => {
                                if (typeof option === 'string') return option;
                                return option.point_name || option.name;
                            }}
                            value={evaluationPoints.find((p) => p.name === formData.evaluation_type) || null}
                            onChange={(_, newValue) => {
                                setFormData({ ...formData, evaluation_type: newValue?.name || '' });
                                if (errors.evaluation_type) setErrors({ ...errors, evaluation_type: '' });
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Evaluation Type"
                                    required
                                    error={!!errors.evaluation_type}
                                    helperText={errors.evaluation_type}
                                    InputLabelProps={{ shrink: true }}
                                    placeholder='Select Type'
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1.5,
                                        },
                                    }}
                                />
                            )}
                        />

                        {(() => {
                            const selectedPoint = evaluationPoints?.find((p: any) => p.name === formData.evaluation_type);
                            const isNegative = selectedPoint ? selectedPoint.default_score < 0 : false;

                            if (isNegative) {
                                return (
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        label="How to Improve"
                                        value={formData.how_to_improve}
                                        onChange={(e) => setFormData({ ...formData, how_to_improve: e.target.value })}
                                    />
                                );
                            }
                            return null;
                        })()}

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Remarks"
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        />

                        
                    </Stack>
                </LocalizationProvider>
            </DialogContent>

            <DialogActions sx={{ p: 1.5 }}>
                <LoadingButton
                    variant="contained"
                    onClick={handleSave}
                    loading={loading}
                    sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
                >
                    {selectedEvent ? 'Update' : 'Submit'}
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
}
