import type { Dayjs } from 'dayjs';
import type { SalarySlip } from 'src/api/salary-slips';

import dayjs from 'dayjs';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { getDoctypeList } from 'src/api/leads';
import { updateSalarySlip, previewSalarySlip, generateSalarySlipFromEmployee } from 'src/api/salary-slips';

import { Iconify } from 'src/components/iconify';

import { SalarySlipPreviewDialog } from './salary-slip-preview-dialog';

// ----------------------------------------------------------------------

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError: (error: string) => void;
    slip?: SalarySlip | null;
}


export default function SalarySlipCreateDialog({ open, onClose, onSuccess, onError, slip }: Props) {

    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [openPreview, setOpenPreview] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);

    const [formData, setFormData] = useState({
        employee: '',
        pay_period_start: dayjs().startOf('month'),
        pay_period_end: dayjs().endOf('month'),
    });

    useEffect(() => {
        if (slip) {
            setFormData({
                employee: slip.employee,
                pay_period_start: dayjs(slip.pay_period_start),
                pay_period_end: dayjs(slip.pay_period_end),
            });
        } else {
            setFormData({
                employee: '',
                pay_period_start: dayjs().startOf('month'),
                pay_period_end: dayjs().endOf('month'),
            });
        }
    }, [slip, open]);


    const quickPresets = useMemo(
        () => [
            {
                id: 'this_month',
                label: 'This Month',
                start: dayjs().startOf('month'),
                end: dayjs().endOf('month'),
            },
            {
                id: 'last_month',
                label: 'Last Month',
                start: dayjs().subtract(1, 'month').startOf('month'),
                end: dayjs().subtract(1, 'month').endOf('month'),
            },
            {
                id: 'prev_month',
                label: dayjs().subtract(2, 'month').format('MMMM'),
                start: dayjs().subtract(2, 'month').startOf('month'),
                end: dayjs().subtract(2, 'month').endOf('month'),
            },
        ],
        []
    );

    const isPresetSelected = (start: Dayjs, end: Dayjs) =>
        Boolean(
            formData.pay_period_start &&
            formData.pay_period_end &&
            formData.pay_period_start.isSame(start, 'day') &&
            formData.pay_period_end.isSame(end, 'day')
        );

    const handleApplyPreset = (start: Dayjs, end: Dayjs) => {
        setFormData((prev) => ({
            ...prev,
            pay_period_start: start,
            pay_period_end: end,
        }));
    };

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setLoading(true);
                const data = await getDoctypeList('Employee', ['name', 'employee_name', 'employee_id']);
                setEmployees(data);
            } catch (error) {
                console.error('Failed to fetch employees:', error);
            } finally {
                setLoading(false);
            }
        };

        if (open) {
            fetchEmployees();
        }
    }, [open]);

    const handlePreview = async () => {
        try {
            if (!formData.employee) {
                onError('Please select an employee');
                return;
            }

            setPreviewLoading(true);
            const data = await previewSalarySlip(
                formData.employee,
                formData.pay_period_start.format('YYYY-MM-DD'),
                formData.pay_period_end.format('YYYY-MM-DD')
            );
            setPreviewData(data);
            setOpenPreview(true);
        } catch (error: any) {
            onError(error.message || 'Failed to preview salary slip');
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleConfirmCreate = async () => {
        setOpenPreview(false);

        try {
            if (!formData.employee) {
                onError('Please select an employee');
                return;
            }

            setSubmitting(true);

            // Extract year and month from pay_period_start
            const year = formData.pay_period_start.year();
            const month = formData.pay_period_start.month() + 1; // dayjs months are 0-indexed

            const result = await generateSalarySlipFromEmployee(
                formData.employee,
                year,
                month,
                formData.pay_period_start.format('YYYY-MM-DD'),
                formData.pay_period_end.format('YYYY-MM-DD')
            );


            onSuccess(result || 'Salary slip generated successfully');
            handleClose();
        } catch (error: any) {
            onError(error.message || 'Failed to generate salary slip');
        } finally {
            setSubmitting(false);
        }
    }

    const handleSubmit = async () => {
        try {
            if (!formData.employee) {
                onError('Please select an employee');
                return;
            }

            setSubmitting(true);

            if (slip) {
                const data = {
                    employee: formData.employee,
                    pay_period_start: formData.pay_period_start.format('YYYY-MM-DD'),
                    pay_period_end: formData.pay_period_end.format('YYYY-MM-DD'),
                };
                await updateSalarySlip(slip.name, data);
                onSuccess(`Salary slip ${slip.name} updated successfully`);
            } else {
                // For new slips, use the generation API to calculate salary
                const year = formData.pay_period_start.year();
                const month = formData.pay_period_start.month() + 1;

                const result = await generateSalarySlipFromEmployee(
                    formData.employee,
                    year,
                    month,
                    formData.pay_period_start.format('YYYY-MM-DD'),
                    formData.pay_period_end.format('YYYY-MM-DD')
                );


                onSuccess(result || 'Salary slip generated successfully');
            }

            handleClose();
        } catch (error: any) {
            onError(error.message || 'Failed to create salary slip');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            employee: '',
            pay_period_start: dayjs().startOf('month'),
            pay_period_end: dayjs().endOf('month'),
        });
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24 } }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}`, }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{slip ? 'Edit Salary Slip' : 'Create New Salary Slip'}</Typography>
                <IconButton onClick={handleClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>


            <DialogContent sx={{ p: 3 }}>
                <Stack spacing={3} sx={{ mt: 3 }}>
                    <Autocomplete
                        fullWidth
                        options={employees}
                        filterOptions={(options, state) => {
                            const inputValue = state.inputValue.trim().toLowerCase();
                            if (!inputValue) return options;

                            const cleanInput = inputValue.replace(/^(bepl|emp)?0*/i, '');

                            return options.filter((option) => {
                                const name = (option.name || '').toLowerCase();
                                const empName = (option.employee_name || '').toLowerCase();
                                const empId = (option.employee_id || '').toLowerCase();

                                if (name.includes(inputValue) || empName.includes(inputValue) || empId.includes(inputValue)) {
                                    return true;
                                }

                                if (cleanInput) {
                                    const cleanName = name.replace(/^(bepl|emp)?0*/i, '');
                                    const cleanEmpId = empId.replace(/^(bepl|emp)?0*/i, '');
                                    if (cleanName === cleanInput || cleanEmpId === cleanInput) {
                                        return true;
                                    }
                                    if (cleanName.includes(cleanInput) || cleanEmpId.includes(cleanInput)) {
                                        return true;
                                    }
                                }

                                return false;
                            });
                        }}
                        getOptionLabel={(option) => {
                            // Handle both object (when selecting) and string (initial value)
                            if (typeof option === 'string') {
                                const employee = employees.find((e) => e.name === option);
                                return employee ? `${employee.employee_name} (${employee.name})` : option;
                            }
                            return `${option.employee_name} (${option.name})`;
                        }}
                        value={employees.find((e) => e.name === formData.employee) || null}
                        onChange={(event, newValue) => {
                            setFormData({ ...formData, employee: newValue ? newValue.name : '' });
                        }}
                        renderOption={(props, option) => {
                            const { key, ...optionProps } = props as any;
                            return (
                                <li key={key} {...optionProps}>
                                    <Stack spacing={0.5}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                            {option.employee_name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            ID: {option.name} {option.employee_id && option.employee_id !== option.name ? `(${option.employee_id})` : ''}
                                        </Typography>
                                    </Stack>
                                </li>
                            );
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Employee"
                                disabled={loading}
                                placeholder="Search by name or ID..."
                            />
                        )}
                        disabled={loading}
                    />

                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        flexShrink: 0,
                                        py: 2
                                    }}
                                >
                                    Quick Select:
                                </Typography>

                                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                                    {quickPresets.map((preset) => {
                                        const selected = isPresetSelected(preset.start, preset.end);
                                        return (
                                            <Button
                                                key={preset.id}
                                                size="small"
                                                onClick={() => handleApplyPreset(preset.start, preset.end)}
                                                sx={{
                                                    borderRadius: 1,
                                                    py: 0.6,
                                                    px: 1.75,
                                                    fontWeight: 700,
                                                    fontSize: '0.8125rem',
                                                    transition: (theme) =>
                                                        theme.transitions.create(['all'], {
                                                            duration: theme.transitions.duration.shorter,
                                                        }),
                                                    ...(selected
                                                        ? {
                                                            bgcolor: '#059669',
                                                            color: 'common.white',
                                                            boxShadow: '0 2px 8px 0 rgba(5, 150, 105, 0.35)',
                                                            '&:hover': {
                                                                bgcolor: '#047857',
                                                            },
                                                        }
                                                        : {
                                                            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                                            color: 'text.secondary',
                                                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
                                                            '&:hover': {
                                                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.16),
                                                                color: 'text.primary',
                                                            },
                                                        }),
                                                }}
                                            >
                                                {preset.label}
                                            </Button>
                                        );
                                    })}
                                </Stack>
                            </Stack>

                            <Stack direction="row" spacing={2}>
                                <DatePicker
                                    label="Pay Period Start"
                                    format="DD-MM-YYYY"
                                    value={formData.pay_period_start}
                                    onChange={(newValue) => {
                                        if (newValue) {
                                            setFormData({
                                                ...formData,
                                                pay_period_start: newValue,
                                                pay_period_end: newValue.endOf('month'),
                                            });
                                        }
                                    }}
                                    slotProps={{ textField: { fullWidth: true } }}
                                />
                                <DatePicker
                                    label="Pay Period End"
                                    format="DD-MM-YYYY"
                                    value={formData.pay_period_end}
                                    onChange={(newValue) => setFormData({ ...formData, pay_period_end: newValue as Dayjs })}
                                    slotProps={{ textField: { fullWidth: true } }}
                                />
                            </Stack>
                        </Box>
                    </LocalizationProvider>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, pt: 0 }}>
                {!slip && (
                    <LoadingButton
                        variant="outlined"
                        color="primary"
                        loading={previewLoading}
                        onClick={handlePreview}
                        disabled={!formData.employee}
                        startIcon={<Iconify icon="solar:eye-bold" />}
                        sx={{ borderRadius: 1.5, height: 40 }}
                    >
                        Preview
                    </LoadingButton>
                )}
                <LoadingButton
                    variant="contained"
                    loading={submitting}
                    onClick={handleSubmit}
                    disabled={!formData.employee}
                >
                    {slip ? 'Update' : 'Generate'}
                </LoadingButton>
            </DialogActions>

            <SalarySlipPreviewDialog
                open={openPreview}
                onClose={() => setOpenPreview(false)}
                onConfirm={handleConfirmCreate}
                data={previewData}
            />
        </Dialog>
    );
}
