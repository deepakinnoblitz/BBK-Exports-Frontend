import type {
    EvaluationAutomationRule} from 'src/api/employee-evaluation';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormHelperText from '@mui/material/FormHelperText';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import {
    fetchEmployeeEvaluationPoints,
    createEvaluationAutomationRule,
    updateEvaluationAutomationRule,
} from 'src/api/employee-evaluation';

import { Iconify } from 'src/components/iconify';

// Android 12 Switch Style
const Android12Switch = styled(Switch)(({ theme }) => ({
    width: 36,
    height: 20,
    padding: 0,
    marginRight: 8,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 3,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: '#00A5D1',
                opacity: 1,
                border: 0,
            },
            '& .MuiSwitch-thumb': {
                backgroundColor: '#fff',
                width: 14,
                height: 14,
            },
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 14,
        height: 14,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[600],
    },
    '& .MuiSwitch-track': {
        borderRadius: 20 / 2,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 300,
        }),
    },
}));

// ----------------------------------------------------------------------

const EVENT_TYPES = [
    { value: 'Late Login', label: 'Late Login' },
    { value: 'Early Exit', label: 'Early Exit' },
    { value: 'Task Delayed', label: 'Task Delayed' },
    { value: 'Daily Log Submission', label: 'Daily Log Submission' },
    { value: 'Specific Day Leave', label: 'Specific Day Leave' },
    { value: 'Specific Date Leave', label: 'Specific Date Leave' },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedRule?: EvaluationAutomationRule | null;
    traits: { name: string; trait_name: string }[];
    setSnackbar: (snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }) => void;
}

export function EvaluationAutomationRuleFormDialog({ open, onClose, onSuccess, selectedRule, traits, setSnackbar }: Props) {
    const isEdit = !!selectedRule;

    const [ruleName, setRuleName] = useState('');
    const [eventType, setEventType] = useState<string>('Late Login');
    const [trait, setTrait] = useState<string>('');
    const [evaluationPoint, setEvaluationPoint] = useState<string>('');
    const [enabled, setEnabled] = useState(true);
    const [autoSubmit, setAutoSubmit] = useState(true);
    const [lateLoginAfter, setLateLoginAfter] = useState('');
    const [earlyExitBefore, setEarlyExitBefore] = useState('');
    const [breakDurationAfter, setBreakDurationAfter] = useState<string | number>('');
    const [specificDay, setSpecificDay] = useState<string>('Monday');
    const [specificDate, setSpecificDate] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [howToImprove, setHowToImprove] = useState('');
    const [points, setPoints] = useState<{ name: string; point_name: string; default_score: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            fetchEmployeeEvaluationPoints().then(setPoints).catch(console.error);
        }
    }, [open]);

    useEffect(() => {
        if (selectedRule) {
            setRuleName(selectedRule.rule_name || '');
            setEventType(selectedRule.event_type || 'Late Login');
            setTrait(selectedRule.trait || '');
            setEvaluationPoint(selectedRule.evaluation_point || '');
            setEnabled(!!selectedRule.enabled);
            setAutoSubmit(!!selectedRule.auto_submit);
            setLateLoginAfter(selectedRule.late_login_after || '');
            setEarlyExitBefore(selectedRule.early_exit_before || '');
            setBreakDurationAfter(selectedRule.break_duration_after || '');
            setSpecificDay(selectedRule.specific_day || 'Monday');
            setSpecificDate(selectedRule.specific_date || null);
            setDescription(selectedRule.description || '');
            setHowToImprove(selectedRule.how_to_improve || '');
        } else {
            setRuleName('');
            setEventType('Late Login');
            setTrait('');
            setEvaluationPoint('');
            setEnabled(true);
            setAutoSubmit(true);
            setLateLoginAfter('');
            setEarlyExitBefore('');
            setBreakDurationAfter('');
            setSpecificDay('Monday');
            setSpecificDate(null);
            setDescription('');
            setHowToImprove('');
        }
        setErrors({});
    }, [selectedRule, open]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!ruleName.trim()) newErrors.ruleName = 'Rule name is required';
        if (!trait) newErrors.trait = 'Evaluation Trait is required';
        if (!evaluationPoint) newErrors.evaluationPoint = 'Evaluation Point is required';
        if (eventType === 'Late Login' && !lateLoginAfter) newErrors.lateLoginAfter = 'Late Login After time is required';
        if (eventType === 'Early Exit' && !earlyExitBefore) newErrors.earlyExitBefore = 'Early Exit Before time is required';
        if (eventType === 'Specific Day Leave' && !specificDay) newErrors.specificDay = 'Specific Day is required';
        if (eventType === 'Specific Date Leave' && !specificDate) newErrors.specificDate = 'Specific Date is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            const errs: string[] = [];
            if (!ruleName.trim()) errs.push('ruleName');
            if (!trait) errs.push('trait');
            if (!evaluationPoint) errs.push('evaluationPoint');
            if (eventType === 'Late Login' && !lateLoginAfter) errs.push('lateLoginAfter');
            if (eventType === 'Early Exit' && !earlyExitBefore) errs.push('earlyExitBefore');
            if (eventType === 'Specific Day Leave' && !specificDay) errs.push('specificDay');
            if (eventType === 'Specific Date Leave' && !specificDate) errs.push('specificDate');

            if (errs.length > 1) {
                setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
            } else if (errs[0] === 'ruleName') {
                setSnackbar({ open: true, message: 'Rule name is required', severity: 'error' });
            } else if (errs[0] === 'trait') {
                setSnackbar({ open: true, message: 'Evaluation Trait is required', severity: 'error' });
            } else if (errs[0] === 'evaluationPoint') {
                setSnackbar({ open: true, message: 'Evaluation Point is required', severity: 'error' });
            } else if (errs[0] === 'lateLoginAfter') {
                setSnackbar({ open: true, message: 'Late Login After time is required', severity: 'error' });
            } else if (errs[0] === 'earlyExitBefore') {
                setSnackbar({ open: true, message: 'Early Exit Before time is required', severity: 'error' });
            } else if (errs[0] === 'specificDay') {
                setSnackbar({ open: true, message: 'Specific Day is required', severity: 'error' });
            } else if (errs[0] === 'specificDate') {
                setSnackbar({ open: true, message: 'Specific Date is required', severity: 'error' });
            }
            return;
        }
        setLoading(true);
        try {
            const payload: Partial<EvaluationAutomationRule> = {
                rule_name: ruleName,
                event_type: eventType as any,
                trait,
                evaluation_point: evaluationPoint,
                enabled: enabled ? 1 : 0,
                auto_submit: autoSubmit ? 1 : 0,
                late_login_after: (eventType === 'Late Login' || eventType === 'Daily Log Submission') ? lateLoginAfter : undefined,
                early_exit_before: (eventType === 'Early Exit' || eventType === 'Daily Log Submission') ? earlyExitBefore : undefined,
                break_duration_after: eventType === 'Daily Log Submission' ? Number(breakDurationAfter) || 0 : undefined,
                specific_day: eventType === 'Specific Day Leave' ? specificDay : undefined,
                specific_date: (eventType === 'Specific Date Leave' && specificDate) ? specificDate : undefined,
                description,
                how_to_improve: howToImprove,
            };

            if (isEdit) {
                await updateEvaluationAutomationRule(selectedRule!.name, payload);
                setSnackbar({ open: true, message: 'Automation Rule updated successfully', severity: 'success' });
            } else {
                await createEvaluationAutomationRule(payload);
                setSnackbar({ open: true, message: 'Automation Rule created successfully', severity: 'success' });
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            const message = err.message || 'An error occurred';
            setErrors({ submit: message });
            setSnackbar({ open: true, message, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const selectedTrait = traits.find(t => t.name === trait) || null;
    const selectedPoint = points.find(p => p.name === evaluationPoint) || null;
    const selectedPointScore = selectedPoint?.default_score;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
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
                    {isEdit ? 'Edit Automation Rule' : 'New Automation Rule'}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack direction="row" spacing={3} sx={{ py: 1.5, pb: 3.5 }}>
                        <FormControlLabel
                            control={
                                    <Android12Switch
                                        checked={enabled}
                                        onChange={(e) => setEnabled(e.target.checked)}
                                    />
                            }
                            label="Enabled"
                        />
                        <FormControlLabel
                            control={
                                    <Android12Switch
                                        checked={autoSubmit}
                                        onChange={(e) => setAutoSubmit(e.target.checked)}
                                    />
                            }
                            label="Auto Submit"
                        />
                    </Stack>

                    <Stack spacing={3} sx={{ pt: 1 }}>

                        <TextField
                            label="Rule Name"
                            value={ruleName}
                            onChange={(e) => {
                                setRuleName(e.target.value);
                                if (errors.ruleName) setErrors({ ...errors, ruleName: '' });
                            }}
                            disabled={isEdit}
                            fullWidth
                            required
                            error={!!errors.ruleName}
                            helperText={errors.ruleName}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Enter rule name"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />

                        <FormControl fullWidth required>
                            <InputLabel>Event Type</InputLabel>
                            <Select
                                value={eventType}
                                label="Event Type"
                                onChange={(e) => setEventType(e.target.value)}
                            >
                                {EVENT_TYPES.map((et) => (
                                    <MenuItem key={et.value} value={et.value}>{et.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {(eventType === 'Late Login' || eventType === 'Daily Log Submission') && (
                            <TimePicker
                                label="Late Login After (Time)"
                                value={lateLoginAfter ? dayjs(`2000-01-01 ${lateLoginAfter}`) : null}
                                onChange={(newValue) => {
                                    const val = newValue?.format('HH:mm:ss') || '';
                                    setLateLoginAfter(val);
                                    if (errors.lateLoginAfter) setErrors({ ...errors, lateLoginAfter: '' });
                                }}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        required: eventType === 'Late Login',
                                        error: !!errors.lateLoginAfter,
                                        helperText: errors.lateLoginAfter || 'Trigger evaluation if login is after this time',
                                        InputLabelProps: { shrink: true },
                                        sx: { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }
                                    }
                                }}
                            />
                        )}

                        {(eventType === 'Early Exit' || eventType === 'Daily Log Submission') && (
                            <TimePicker
                                label="Early Exit Before (Time)"
                                value={earlyExitBefore ? dayjs(`2000-01-01 ${earlyExitBefore}`) : null}
                                onChange={(newValue) => {
                                    const val = newValue?.format('HH:mm:ss') || '';
                                    setEarlyExitBefore(val);
                                    if (errors.earlyExitBefore) setErrors({ ...errors, earlyExitBefore: '' });
                                }}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        required: eventType === 'Early Exit',
                                        error: !!errors.earlyExitBefore,
                                        helperText: errors.earlyExitBefore || 'Trigger evaluation if logout is before this time',
                                        InputLabelProps: { shrink: true },
                                        sx: { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }
                                    }
                                }}
                            />
                        )}

                        {eventType === 'Daily Log Submission' && (
                            <TextField
                                label="Break Duration After (Hours)"
                                type="number"
                                value={breakDurationAfter}
                                onChange={(e) => setBreakDurationAfter(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                placeholder="e.g. 1.5"
                                helperText="Optional: Trigger evaluation if total break hours exceed this value"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                            />
                        )}

                        {eventType === 'Specific Day Leave' && (
                            <FormControl fullWidth required error={!!errors.specificDay}>
                                <InputLabel>Specific Day</InputLabel>
                                <Select
                                    value={specificDay}
                                    label="Specific Day"
                                    onChange={(e) => {
                                        setSpecificDay(e.target.value);
                                        if (errors.specificDay) setErrors({ ...errors, specificDay: '' });
                                    }}
                                >
                                    {DAYS_OF_WEEK.map((day) => (
                                        <MenuItem key={day} value={day}>{day}</MenuItem>
                                    ))}
                                </Select>
                                {errors.specificDay && <FormHelperText>{errors.specificDay}</FormHelperText>}
                            </FormControl>
                        )}

                        {eventType === 'Specific Date Leave' && (
                            <DatePicker
                                label="Specific Date"
                                value={specificDate ? dayjs(specificDate) : null}
                                onChange={(newValue) => {
                                    const val = newValue?.format('YYYY-MM-DD') || '';
                                    setSpecificDate(val);
                                    if (errors.specificDate) setErrors({ ...errors, specificDate: '' });
                                }}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        required: true,
                                        error: !!errors.specificDate,
                                        helperText: errors.specificDate,
                                        InputLabelProps: { shrink: true },
                                        sx: { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }
                                    }
                                }}
                            />
                        )}

                        <Autocomplete
                            options={traits}
                            getOptionLabel={(o) => o.trait_name}
                            value={selectedTrait}
                            onChange={(_, val) => {
                                setTrait(val?.name || '');
                                if (errors.trait) setErrors({ ...errors, trait: '' });
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Evaluation Trait"
                                    required
                                    error={!!errors.trait}
                                    helperText={errors.trait}
                                    InputLabelProps={{ shrink: true }}
                                    placeholder="Select Trait"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                />
                            )}
                        />

                        <Autocomplete
                            options={points}
                            getOptionLabel={(o) => `${o.point_name} (${o.default_score >= 0 ? '+' : ''}${o.default_score} pts)`}
                            value={selectedPoint}
                            onChange={(_, val) => {
                                setEvaluationPoint(val?.name || '');
                                if (errors.evaluationPoint) setErrors({ ...errors, evaluationPoint: '' });
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Evaluation Point"
                                    required
                                    error={!!errors.evaluationPoint}
                                    helperText={errors.evaluationPoint}
                                    InputLabelProps={{ shrink: true }}
                                    placeholder="Select Evaluation Point"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                />
                            )}
                        />

                        {selectedPointScore !== undefined && (
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: -1, pl: 1, color: selectedPointScore >= 0 ? 'success.main' : 'info.main' }}>
                                <Iconify icon={selectedPointScore >= 0 ? "solar:add-circle-bold" : "solar:info-circle-bold"} width={16} />
                                <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                                    This will apply {selectedPointScore >= 0 ? '+' : ''}{selectedPointScore} points to the employee&apos;s score.
                                </Typography>
                            </Stack>
                        )}

                        <TextField
                            label="How to Improve (optional)"
                            value={howToImprove}
                            onChange={(e) => setHowToImprove(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Provide suggestions for improvement..."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />

                        <TextField
                            label="Description (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Describe when this rule triggers..."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />

                        {errors.submit && (
                            <FormHelperText error>{errors.submit}</FormHelperText>
                        )}
                    </Stack>
                </LocalizationProvider>
            </DialogContent>

            <DialogActions sx={{ p: 1.5 }}>
                <LoadingButton
                    variant="contained"
                    loading={loading}
                    onClick={handleSubmit}
                    sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
                >
                    {isEdit ? 'Update' : 'Create Rule'}
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
}
