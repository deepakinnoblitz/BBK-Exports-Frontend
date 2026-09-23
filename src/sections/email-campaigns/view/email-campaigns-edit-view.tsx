import dayjs from 'dayjs';
import { enqueueSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { IoMdArrowBack } from "react-icons/io";
import { CiCalculator2 } from "react-icons/ci";
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useRouter } from 'src/routes/hooks';

import { getFriendlyErrorMessage } from 'src/utils/error-handler';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchEmailTemplates } from 'src/api/email-template';
import { updateEmailCampaign, getEmailCampaign, EmailCampaign, previewRecipients, getFilterFields, getFilterValueOptions } from 'src/api/email-campaign';

import { Iconify } from 'src/components/iconify';

import { CustomSwitch } from 'src/sections/reminders/reminders-settings-view';

// ----------------------------------------------------------------------

const FILTER_OPERATOR_OPTIONS = [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: 'Like', label: 'Like' },
    { value: 'Not Like', label: 'Not Like' },
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
];

// ----------------------------------------------------------------------

export function EmailCampaignsEditView() {
    const router = useRouter();
    const navigate = useNavigate();
    const { id } = useParams();

    const [campaignName, setCampaignName] = useState('');
    const [emailTemplate, setEmailTemplate] = useState('');
    const [subject, setSubject] = useState('');
    const [targetType, setTargetType] = useState('');
    const [sendImmediately, setSendImmediately] = useState(true);
    const [scheduleDate, setScheduleDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [status, setStatus] = useState('Draft');
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: boolean }>({});

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [templateOptions, setTemplateOptions] = useState<any[]>([]);
    const [filters, setFilters] = useState<any[]>([{ field_name: '', operator: '=', value: '' }]);
    const [fieldOptions, setFieldOptions] = useState<{ value: string; label: string }[]>([]);
    const [filterValueOptions, setFilterValueOptions] = useState<Record<number, string[]>>({});

    const TARGET_TYPE_OPTIONS = [
        { value: 'Lead', label: 'Lead' },
        { value: 'Contact', label: 'Contact' },
        { value: 'Account', label: 'Account' },
    ];

    useEffect(() => {
        fetchEmailTemplates({ page: 1, page_size: 1000 }).then((res) => {
            setTemplateOptions(res.data);
        }).catch((err) => {
            console.error('Failed to fetch email templates:', err);
        });
    }, []);


    useEffect(() => {
        if (id) {
            getEmailCampaign(id)
                .then((data) => {
                    setCampaignName(data.campaign_name || '');
                    setEmailTemplate(data.email_template || '');
                    setSubject(data.subject || '');
                    setTargetType(data.target_type || '');
                    setSendImmediately(data.send_immediately === 1);
                    setScheduleDate(data.schedule_date || '');
                    setStatus(data.status || 'Draft');
                    setFilters(data.filters || [{ field_name: '', operator: '=', value: '' }]);
                })
                .catch((err) => {
                    console.error('Failed to fetch email campaign:', err);
                    setSnackbar({ open: true, message: 'Failed to load email campaign', severity: 'error' });
                })
                .finally(() => setFetching(false));
        }
    }, [id]);

    useEffect(() => {
        if (targetType) {
            getFilterFields(targetType)
                .then((fields) => {
                    setFieldOptions(fields);
                })
                .catch((err) => {
                    console.error('Failed to fetch filter fields:', err);
                });
        } else {
            setFieldOptions([]);
        }
    }, [targetType]);

    useEffect(() => {
        if (targetType && filters && filters.length > 0) {
            filters.forEach(async (filter, idx) => {
                if (filter.field_name && !filterValueOptions[idx]) {
                    try {
                        const opts = await getFilterValueOptions(targetType, filter.field_name);
                        setFilterValueOptions(prev => ({
                            ...prev,
                            [idx]: opts || []
                        }));
                    } catch (err) {
                        console.error(err);
                    }
                }
            });
        }
    }, [targetType, filters]);


    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const validateForm = () => {
        const newErrors: { [key: string]: boolean } = {};
        const missingFields: string[] = [];

        if (!campaignName) {
            newErrors.campaignName = true;
            missingFields.push('Campaign Name');
        }
        if (!emailTemplate) {
            newErrors.emailTemplate = true;
            missingFields.push('Email Template');
        }
        if (!targetType) {
            newErrors.targetType = true;
            missingFields.push('Target Type');
        }

        setValidationErrors(newErrors);

        if (missingFields.length > 0) {
            setSnackbar({
                open: true,
                message: `Please fill in mandatory fields: ${missingFields.join(', ')}`,
                severity: 'error',
            });
            return false;
        }
        return true;
    };

    const handleUpdate = async () => {
        if (!validateForm() || !id) return;

        try {
            setSaving(true);

            const campaignData = {
                campaign_name: campaignName,
                email_template: emailTemplate,
                subject: subject,
                target_type: targetType,
                send_immediately: sendImmediately ? 1 : 0,
                schedule_date: sendImmediately ? '' : scheduleDate,
                status: status,
                filters: filters.filter(f => f.field_name || f.value),
            };

            await updateEmailCampaign(id, campaignData);
            setSnackbar({ open: true, message: 'Email Campaign updated successfully', severity: 'success' });
            
            sessionStorage.setItem(
            'email_campaign_edit_success',
            'Email Campaign Edited successfully'
            );

            router.push('/email-campaigns');
            
        } catch (err: any) {
            console.error(err);
            const friendlyMsg = getFriendlyErrorMessage(err);
            setSnackbar({ open: true, message: friendlyMsg || 'Failed to update Email Campaign', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        router.push('/email-campaigns');
    };

    const handleAddFilter = () => {
        if (!targetType) {
            enqueueSnackbar('Please select Target Type first', { variant: 'warning' });
            return;
        }
        setFilters([...filters, { field_name: '', operator: '=', value: '' }]);
    };

    const handleRemoveFilter = (index: number) => {
        setFilters(filters.filter((_, i) => i !== index));
        setFilterValueOptions(prev => {
            const updated = { ...prev };
            delete updated[index];
            const newOptions: Record<number, string[]> = {};
            let newIdx = 0;
            for (let i = 0; i < filters.length; i++) {
                if (i !== index) {
                    if (updated[i]) {
                        newOptions[newIdx] = updated[i];
                    }
                    newIdx++;
                }
            }
            return newOptions;
        });
    };

    const handleFilterChange = async (index: number, field: string, value: string) => {
        const newFilters = [...filters];
        newFilters[index] = { ...newFilters[index], [field]: value };
        
        if (field === 'field_name') {
            newFilters[index].value = '';
            setFilters(newFilters);
            if (value && targetType) {
                try {
                    const options = await getFilterValueOptions(targetType, value);
                    setFilterValueOptions(prev => ({
                        ...prev,
                        [index]: options || []
                    }));
                } catch (err) {
                    console.error(err);
                }
            } else {
                setFilterValueOptions(prev => {
                    const updated = { ...prev };
                    delete updated[index];
                    return updated;
                });
            }
        } else {
            setFilters(newFilters);
        }
    };


    const [previewOpen, setPreviewOpen] = useState(false);
    const [recipientPreview, setRecipientPreview] = useState<any[]>([]);
    const [totalRecipients, setTotalRecipients] = useState(0);
    const [previewSearch, setPreviewSearch] = useState('');
    const [previewPage, setPreviewPage] = useState(0);
    const [previewRowsPerPage, setPreviewRowsPerPage] = useState(10);

    const handlePreviewRecipients = async () => {
        if (!targetType) {
            enqueueSnackbar(
                'Please select Target Type',
                { variant: 'warning' }
            );
            return;
        }

        const hasValidFilter = filters.some(
            (filter) =>
                filter.field_name?.trim() &&
                filter.operator?.trim() &&
                filter.value?.trim()
        );

        if (!hasValidFilter) {
            enqueueSnackbar(
                'Please add at least one filter before previewing recipients',
                { variant: 'warning' }
            );
            return;
        }

        try {
            const result = await previewRecipients(
                targetType,
                filters
            );

            setTotalRecipients(result.count);
            setRecipientPreview(result.recipients);
            setPreviewSearch('');
            setPreviewPage(0);
            setPreviewOpen(true);

            enqueueSnackbar(
                `Found ${result.count} recipients`,
                { variant: 'success' }
            );
        } catch (error: any) {
            enqueueSnackbar(
                error?.message || 'Failed to preview recipients',
                { variant: 'error' }
            );
        }
    };

    return (
        <>
            {fetching && (
                <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <CircularProgress />
                </DashboardContent>
            )}

            {!fetching && (
                <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={4}
                mt={2}
            >
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    Edit Email Campaign
                </Typography>

                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleCancel}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            },
                        }}
                    >
                        Go Back
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleUpdate}
                        disabled={saving || fetching}
                        sx={{
                            height: 36,
                            px: 3,
                            borderRadius: 1.5,
                            fontWeight: 700,
                            textTransform: 'none',
                            bgcolor: '#2081C3',
                            color: 'common.white',
                            minWidth: 130,
                            '&:hover': { bgcolor: '#1a699f' },
                            '&:disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' }
                        }}
                    >
                        {saving ? <CircularProgress size={20} color="inherit" /> : 'Update Campaign'}
                    </Button>
                </Stack>
            </Stack>

            <Card sx={{ p: 3, mb: 3 }}>
                <Typography sx={{ mb: 3, ml: 1, mt: 1, fontWeight: 700, fontSize: 16 }}>Campaign Information</Typography>
                <Box
                    sx={{
                        display: 'grid',
                        columnGap: 2,
                        rowGap: 3,
                        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                    }}
                >
                    <TextField
                        fullWidth
                        label="Campaign Name"
                        value={campaignName}
                        onChange={(e) => {
                            setCampaignName(e.target.value);
                            if (e.target.value) setValidationErrors(prev => ({ ...prev, campaignName: false }));
                        }}
                        required
                        error={!!validationErrors.campaignName}
                        helperText={validationErrors.campaignName ? 'Campaign Name is required' : ''}
                    />

                    <Autocomplete
                        fullWidth
                        options={templateOptions}
                        getOptionLabel={(option) => option.template_name || ''}
                        value={templateOptions.find((opt) => opt.name === emailTemplate) || null}
                        onChange={(_e, newValue) => {
                            setEmailTemplate(newValue?.name || '');
                            if (newValue?.name) setValidationErrors(prev => ({ ...prev, emailTemplate: false }));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Email Template"
                                required
                                error={!!validationErrors.emailTemplate}
                                helperText={validationErrors.emailTemplate ? 'Email Template is required' : ''}
                            />
                        )}
                        renderOption={(props, option) => {
                            const { key, ...optionProps } = props as any;
                            return (
                                <li key={key || option.name} {...optionProps}>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontSize: '14px' }}>
                                            {option.template_name || option.name}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                                            {option.subject || ''}
                                        </Typography>
                                    </Box>
                                </li>
                            );
                        }}
                    />

                    <TextField
                        fullWidth
                        label="Subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                    />

                    <TextField
                        fullWidth
                        select
                        label="Status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <MenuItem value="Draft">Draft</MenuItem>
                        <MenuItem value="Scheduled">Scheduled</MenuItem>
                        <MenuItem value="Running">Running</MenuItem>
                        <MenuItem value="Paused">Paused</MenuItem>
                        <MenuItem value="Completed">Completed</MenuItem>
                        <MenuItem value="Cancelled">Cancelled</MenuItem>
                    </TextField>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Typography sx={{ mb: 3, ml: 1, mt: 4, fontWeight: 700, fontSize: 16 }}>
                    Audience
                    </Typography>

                    <Button
                    variant="contained"
                    onClick={handlePreviewRecipients}
                    startIcon={<CiCalculator2 size={24} />}
                    sx={{
                        background: 'linear-gradient(135deg,#059669,#059669)',
                        borderRadius: 3,
                        px: 2,
                        py: 0.6,
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': {
                            background: 'linear-gradient(135deg,#059669,#059669)',
                            boxShadow: '0 8px 10px rgba(124,58,237,.25)',
                        },
                    }}
                    >
                        Preview Recipients
                    </Button>
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gap: 3,
                        mb: 4,
                        gridTemplateColumns: {
                        xs: '1fr',
                        md: '1fr 1fr',
                        },
                    }}
                    >
                    <TextField
                        fullWidth
                        select
                        label="Target Type"
                        value={targetType}
                        onChange={(e) => {
                        setTargetType(e.target.value);
                        setFilters([{ field_name: '', operator: '=', value: '' }]);
                        setFilterValueOptions({});

                        if (e.target.value) {
                            setValidationErrors((prev) => ({
                            ...prev,
                            targetType: false,
                            }));
                        }
                        }}
                        error={!!validationErrors.targetType}
                        helperText={
                        validationErrors.targetType
                            ? 'Target Type is required'
                            : ''
                        }
                    >
                        {TARGET_TYPE_OPTIONS.map((option) => (
                        <MenuItem
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Total Recipients"
                        value={totalRecipients}
                        disabled
                        fullWidth
                    />
                </Box>

                <Box
                sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E5E7EB',
                }}
                >
                <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{ mb: 3 }}
                >
                    Filters
                </Typography>

                {filters.map((filter, index) => (
                    <Box
                    key={index}
                    sx={{
                        display: 'grid',
                        gap: 2,
                        mb: 2,
                        alignItems: 'center',
                        gridTemplateColumns: {
                        xs: '1fr',
                        md: '2fr 1.5fr 2fr auto',
                        },
                    }}
                    >
                    <Autocomplete
                        size="small"
                        options={fieldOptions}
                        getOptionLabel={(option) => option.label || option.value || ''}
                        value={fieldOptions.find((opt) => opt.value === filter.field_name) || null}
                        onChange={(_e, newValue) => {
                            handleFilterChange(index, 'field_name', newValue?.value || '');
                        }}
                        onOpen={() => {
                            if (!targetType) {
                                enqueueSnackbar('Please select Target Type first', { variant: 'warning' });
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Select Field"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                            />
                        )}
                    />

                    <TextField
                        select
                        size="small"
                        value={filter.operator}
                        onChange={(e) =>
                        handleFilterChange(
                            index,
                            'operator',
                            e.target.value
                        )
                        }
                        onClick={() => {
                            if (!targetType) {
                                enqueueSnackbar('Please select Target Type first', { variant: 'warning' });
                            }
                        }}
                        sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                        },
                        }}
                    >
                        {FILTER_OPERATOR_OPTIONS.map((option) => (
                        <MenuItem
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </MenuItem>
                        ))}
                    </TextField>

                    {filterValueOptions[index] && filterValueOptions[index].length > 0 ? (
                        <Autocomplete
                            fullWidth
                            size="small"
                            options={filterValueOptions[index]}
                            value={filter.value || ''}
                            onChange={(_e, newValue) => {
                                handleFilterChange(index, 'value', newValue || '');
                            }}
                            onOpen={() => {
                                if (!targetType) {
                                    enqueueSnackbar('Please select Target Type first', { variant: 'warning' });
                                }
                            }}
                            freeSolo
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Enter or select value"
                                    onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                        },
                                    }}
                                />
                            )}
                        />
                    ) : (
                        <TextField
                            size="small"
                            placeholder="Enter value"
                            value={filter.value}
                            onClick={() => {
                                if (!targetType) {
                                    enqueueSnackbar('Please select Target Type first', { variant: 'warning' });
                                }
                            }}
                            onChange={(e) =>
                            handleFilterChange(
                                index,
                                'value',
                                e.target.value
                            )
                            }
                            sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            },
                            }}
                        />
                    )}


                    <IconButton
                        color="error"
                        onClick={() =>
                        handleRemoveFilter(index)
                        }
                        disabled={filters.length <= 1}
                    >
                        <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                    </Box>
                ))}

                <Button
                    variant="contained"
                    startIcon={
                    <Iconify icon="mingcute:add-line" />
                    }
                    onClick={handleAddFilter}
                    sx={{
                        background: 'linear-gradient(135deg,#059669,#059669)',
                        borderRadius: 3,
                        px: 1.5,
                        py: 0.6,
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': {
                            background: 'linear-gradient(135deg,#059669,#059669)',
                            boxShadow: '0 8px 10px rgba(124,58,237,.25)',
                        },
                    }}
                >
                    Add Filter
                </Button>
                </Box>
            </Card>

            <Card sx={{ p: 3, mb: 3 }}>
            <Typography
                sx={{ ml: 1, mt: 1, mb: 3, fontWeight: 700, fontSize: 16 }}
            >
                Scheduling
            </Typography>

            <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                flexWrap: 'wrap',
            }}
            >
            <FormControlLabel
                sx={{
                m: 0,
                minWidth: 220,
                '& .MuiFormControlLabel-label': {
                    ml: 1.5, // gap between switch and label
                    fontSize: '15px',
                    fontWeight: 500,
                },
                }}
                control={
                <CustomSwitch
                    checked={sendImmediately}
                    onChange={(e) => setSendImmediately(e.target.checked)}
                />
                }
                label="Send Immediately"
            />

            {!sendImmediately && (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                    label="Schedule Date"
                    value={scheduleDate ? dayjs(scheduleDate) : null}
                    onChange={(newValue) =>
                    setScheduleDate(
                        newValue ? newValue.format('YYYY-MM-DD') : ''
                    )
                    }
                    slotProps={{
                    textField: {
                        size: 'small',
                        sx: {
                        minWidth: 380,
                        },
                    },
                    }}
                />
                </LocalizationProvider>
            )}
            </Box>
            </Card>

            <Dialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                fullWidth
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: (theme) => theme.customShadows.z24,
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        p: 2.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: (theme) =>
                            `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Box>
                        <Typography
                            variant="h6"
                            sx={{ fontWeight: 800 }}
                        >
                            Recipients Preview
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Preview matching recipients before creating the campaign
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                        }}
                    >
                        <Chip
                            label={`${totalRecipients} Recipients`}
                            color="primary"
                            variant="filled"
                        />

                        <IconButton
                            onClick={() => setPreviewOpen(false)}
                            sx={{
                                color: (theme) => theme.palette.grey[500],
                                bgcolor: 'background.paper',
                                boxShadow: (theme) =>
                                    theme.customShadows?.z1,
                            }}
                        >
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', minHeight: 450 }}>
                    <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'flex-start' }}>
                        <OutlinedInput
                            size="small"
                            placeholder="Search recipient..."
                            value={previewSearch}
                            onChange={(e: any) => {
                                setPreviewSearch(e.target.value);
                                setPreviewPage(0);
                            }}
                            startAdornment={
                                <InputAdornment position="start">
                                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                                </InputAdornment>
                            }
                            sx={{ width: 320 }}
                        />
                    </Box>

                    <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow
                                    sx={{
                                        bgcolor: (theme) =>
                                            alpha(
                                                theme.palette.primary.main,
                                                0.04
                                            ),
                                    }}
                                >
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            py: 2,
                                            pl: 4,
                                        }}
                                    >
                                        S.No
                                    </TableCell>

                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                        }}
                                    >
                                        Recipient Name
                                    </TableCell>

                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                        }}
                                    >
                                        Email Address
                                    </TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {recipientPreview.filter((r) => {
                                    const name = (r.name || '').toLowerCase();
                                    const email = (r.email || '').toLowerCase();
                                    const search = previewSearch.toLowerCase();
                                    return name.includes(search) || email.includes(search);
                                }).length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={3}
                                            align="center"
                                            sx={{ py: 8 }}
                                        >
                                            <Typography
                                                variant="subtitle1"
                                                color="text.secondary"
                                            >
                                                No recipients found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recipientPreview
                                        .filter((r) => {
                                            const name = (r.name || '').toLowerCase();
                                            const email = (r.email || '').toLowerCase();
                                            const search = previewSearch.toLowerCase();
                                            return name.includes(search) || email.includes(search);
                                        })
                                        .slice(
                                            previewPage * previewRowsPerPage,
                                            previewPage * previewRowsPerPage + previewRowsPerPage
                                        )
                                        .map((row, index) => (
                                            <TableRow
                                                key={index}
                                                hover
                                            >
                                                <TableCell>
                                                    <Typography
                                                        sx={{
                                                            width: 28,
                                                            height: 28,
                                                            display: 'flex',
                                                            borderRadius: '50%',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                            color: 'primary.main',
                                                            typography: 'subtitle2',
                                                            fontWeight: 800,
                                                            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                                                            ml: 2,
                                                            transition: (theme) => theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
                                                            '&:hover': {
                                                                bgcolor: 'primary.main',
                                                                color: 'primary.contrastText',
                                                                transform: 'scale(1.1)',
                                                            },
                                                        }}
                                                    >
                                                        {previewPage * previewRowsPerPage + index + 1}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell>
                                                    <Typography
                                                        fontWeight={600}
                                                    >
                                                        {row.name}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell>
                                                    <Typography
                                                        color="text.secondary"
                                                    >
                                                        {row.email}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={
                            recipientPreview.filter((r) => {
                                const name = (r.name || '').toLowerCase();
                                const email = (r.email || '').toLowerCase();
                                const search = previewSearch.toLowerCase();
                                return name.includes(search) || email.includes(search);
                            }).length
                        }
                        rowsPerPage={previewRowsPerPage}
                        page={previewPage}
                        onPageChange={(_e: any, newPage: number) => setPreviewPage(newPage)}
                        onRowsPerPageChange={(e: any) => {
                            setPreviewRowsPerPage(parseInt(e.target.value, 10));
                            setPreviewPage(0);
                        }}
                    />
                </DialogContent>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardContent>
        )}
        </>
    );
}