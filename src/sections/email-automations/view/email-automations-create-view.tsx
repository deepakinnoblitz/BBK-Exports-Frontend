import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { IoMdArrowBack } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchEmailTemplates } from 'src/api/email-template';
import { getFilterFields, getFilterValueOptions } from 'src/api/email-campaign';
import { createEmailAutomation, getAutomationOptions } from 'src/api/email-automation';

import { Iconify } from 'src/components/iconify';

import { CustomSwitch } from 'src/sections/reminders/reminders-settings-view';


export function EmailAutomationsCreateView() {
    const router = useRouter();

    const [templateOptions, setTemplateOptions] = useState<any[]>([]);

    useEffect(() => {
        fetchEmailTemplates({ page: 1, page_size: 1000 }).then((res) => {
            setTemplateOptions(res.data);
        }).catch((err) => {
            console.error('Failed to fetch email templates:', err);
        });
    }, []);

    const [automationName, setAutomationName] = useState('');
    const [status, setStatus] = useState('Draft');
    const [emailTemplate, setEmailTemplate] = useState('');
    const [targetType, setTargetType] = useState('Lead');
    const [triggerEvent, setTriggerEvent] = useState('Lead Workflow State Change');
    const [frequency, setFrequency] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [runTime, setRunTime] = useState('');
    const [weekDay, setWeekDay] = useState('');
    const [dayOfMonth, setDayOfMonth] = useState<number | ''>('');
    const [filters, setFilters] = useState<{ field_name: string; operator: string; value: string; }[]>([]);
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isForStatusChange, setIsForStatusChange] = useState(true);
    const [isForCampaigns, setIsForCampaigns] = useState(false);
    const [subjectOverride, setSubjectOverride] = useState('');
    const [createSeparateCampaign, setCreateSeparateCampaign] = useState(true);
    const [sendImmediately, setSendImmediately] = useState(false);
    const [autoPauseOnError, setAutoPauseOnError] = useState(true);
    const [maxRetryCount, setMaxRetryCount] = useState<number | ''>(3);
    const [workflowState, setWorkflowState] = useState('');
    const [previousWorkflowState, setPreviousWorkflowState] = useState('');
    const [currentDealStage, setCurrentDealStage] = useState('');
    const [previousDealStage, setPreviousDealStage] = useState('');
    const [workflowStates, setWorkflowStates] = useState<string[]>([]);
    const [dealStages, setDealStages] = useState<string[]>([]);
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(true);
    const [dialogTitle, setDialogTitle] = useState("Send Email?");
    const [dialogMessage, setDialogMessage] = useState("Do you want to send the Email?");
    const [autoSend, setAutoSend] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [filterFieldOptions, setFilterFieldOptions] = useState<any[]>([]);
    const [filterValueOptions, setFilterValueOptions] = useState<Record<number, string[]>>({});

    useEffect(() => {
        if (!isForStatusChange) return;

        getAutomationOptions(targetType, triggerEvent)
            .then((res) => {
                console.log(res);

                setWorkflowStates(res.lead_workflow_states || []);
                setDealStages(res.deal_stages || []);
            })
            .catch(console.error);
    }, [targetType, triggerEvent, isForStatusChange]);

    const handleStatusChange = (checked: boolean) => {
        if (checked) {
            setIsForStatusChange(true);
            setIsForCampaigns(false);
        }
    };

    const handleCampaignChange = (checked: boolean) => {
        if (checked) {
            setIsForCampaigns(true);
            setIsForStatusChange(false);
        }
    };

    const [errors, setErrors] = useState<{
        automationName?: boolean;
        emailTemplate?: boolean;
        targetType?: boolean;
        triggerEvent?: boolean;
        frequency?: boolean;
        runTime?: boolean;
        startDate?: boolean;
        weekDay?: boolean;
        dayOfMonth?: boolean;
        workflowState?: boolean;
        previousWorkflowState?: boolean;
        currentDealStage?: boolean;
        previousDealStage?: boolean;
        dialogTitle?: boolean;
        dialogMessage?: boolean;
    }>({});

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const triggerEventOptions = [
        {
            value: 'Lead Workflow State Change',
            label: 'Lead Workflow State Change',
        },
        {
            value: 'Deal Stage Change',
            label: 'Prospects Stage Change',
        },
    ];

    const handleSave = () => {
        const newErrors: typeof errors = {};
        const missingFields: string[] = [];

        if (!automationName) {
            newErrors.automationName = true;
            missingFields.push('Automation Name');
        }
        if (!emailTemplate) {
            newErrors.emailTemplate = true;
            missingFields.push('Email Template');
        }
        if (isForCampaigns) {
            if (!targetType) {
                newErrors.targetType = true;
                missingFields.push('Target Type');
            }
            if (!frequency) {
                newErrors.frequency = true;
                missingFields.push('Frequency');
            }

            if (!startDate) {
                newErrors.startDate = true;
                missingFields.push('Start Date');
            }

            if (!runTime) {
                newErrors.runTime = true;
                missingFields.push('Run Time');
            }

            if (frequency === 'Weekly' && !weekDay) {
                newErrors.weekDay = true;
                missingFields.push('Week Day');
            }

            if (frequency === 'Monthly' && !dayOfMonth) {
                newErrors.dayOfMonth = true;
                missingFields.push('Day Of Month');
            }
        }

        if (isForStatusChange) {

            if (!triggerEvent) {
                newErrors.triggerEvent = true;
                missingFields.push("Trigger Event");
            }

            if (triggerEvent === "Lead Workflow State Change") {

                if (!previousWorkflowState) {
                    newErrors.previousWorkflowState = true;
                    missingFields.push("Previous Workflow State");
                }

                if (!workflowState) {
                    newErrors.workflowState = true;
                    missingFields.push("Workflow State");
                }

                if (previousWorkflowState && workflowState && previousWorkflowState === workflowState) {
                    newErrors.previousWorkflowState = true;
                    newErrors.workflowState = true;
                    setSnackbar({
                        open: true,
                        message: "Previous Workflow State and Target Workflow State cannot be the same.",
                        severity: 'error',
                    });
                    setErrors(newErrors);
                    return;
                }

            } else if (triggerEvent === "Deal Stage Change") {

                if (!previousDealStage) {
                    newErrors.previousDealStage = true;
                    missingFields.push("Previous Deal Stage");
                }

                if (!currentDealStage) {
                    newErrors.currentDealStage = true;
                    missingFields.push("Current Deal Stage");
                }

                if (previousDealStage && currentDealStage && previousDealStage === currentDealStage) {
                    newErrors.previousDealStage = true;
                    newErrors.currentDealStage = true;
                    setSnackbar({
                        open: true,
                        message: "Previous Deal Stage and Current Deal Stage cannot be the same.",
                        severity: 'error',
                    });
                    setErrors(newErrors);
                    return;
                }
            }

            if (showConfirmationDialog) {

                if (!dialogTitle) {
                    newErrors.dialogTitle = true;
                    missingFields.push("Dialog Title");
                }

                if (!dialogMessage) {
                    newErrors.dialogMessage = true;
                    missingFields.push("Dialog Message");
                }
            }
        }

        setErrors(newErrors);

        if (missingFields.length > 0) {
            setSnackbar({
                open: true,
                message: `Please fill in mandatory fields: ${missingFields.join(', ')}`,
                severity: 'error',
            });
            return;
        }

        setIsSaving(true);
        const data = {
            automation_name: automationName,
            status,
            description,

            email_template: emailTemplate,
            subject_override: subjectOverride,

            target_type: targetType,
            trigger_event: triggerEvent,

            workflow_state: workflowState,
            previous_workflow_state: previousWorkflowState,

            current_deal_stage: currentDealStage,
            previous_deal_stage: previousDealStage,

            show_confirmation_dialog: showConfirmationDialog ? 1 : 0,
            dialog_title: dialogTitle,
            dialog_message: dialogMessage,
            auto_send: autoSend ? 1 : 0,

            filters,

            frequency,
            start_date: startDate,
            end_date: endDate,
            run_time: runTime,
            week_day: frequency === 'Weekly' ? weekDay : '',
            day_of_month: frequency === 'Monthly' ? Number(dayOfMonth) : undefined,

            create_separate_campaign: createSeparateCampaign ? 1 : 0,
            send_immediately: sendImmediately ? 1 : 0,
            auto_pause_on_error: autoPauseOnError ? 1 : 0,
            max_retry_count: Number(maxRetryCount) || 0,

            is_active: isActive ? 1 : 0,
            for_status_change: isForStatusChange ? 1 : 0,
            for_campaigns: isForCampaigns ? 1 : 0,
        };
        createEmailAutomation(data)
            .then(() => {
                setSnackbar({ open: true, message: 'Automation created successfully!', severity: 'success' });
                sessionStorage.setItem('email_automation_success_message', 'Automation created successfully!');
                setTimeout(() => {
                    router.push('/email-automations');
                }, 1000);
            })
            .catch((error) => {
                console.error('Failed to save automation:', error);
                setSnackbar({ open: true, message: parseServerError(error), severity: 'error' });
                setIsSaving(false);
            });
    };

    // Parses Frappe's raw _server_messages JSON into a readable string
    function parseServerError(error: any): string {
        try {
            if (error?._server_messages) {
                const msgs = JSON.parse(error._server_messages);
                if (Array.isArray(msgs) && msgs.length > 0) {
                    const first = JSON.parse(msgs[0]);
                    return first.message || 'An error occurred';
                }
            }
        } catch (_) { /* ignore parse errors */ }
        return error?.message || error?.exc_type || 'An error occurred';
    }

    useEffect(() => {
        if (!targetType) return;

        getFilterFields(targetType)
            .then(setFilterFieldOptions)
            .catch(console.error);
    }, [targetType]);

    const handleFilterChange = async (
        index: number,
        field: string,
        value: string
    ) => {
        const newFilters = [...filters];

        newFilters[index] = {
            ...newFilters[index],
            [field]: value,
        };

        if (field === "field_name") {
            newFilters[index].value = "";
            setFilters(newFilters);

            if (value && targetType) {
                try {
                    const options = await getFilterValueOptions(
                        targetType,
                        value
                    );

                    setFilterValueOptions((prev) => ({
                        ...prev,
                        [index]: options || [],
                    }));
                } catch (err) {
                    console.error(err);
                }
            }
        } else {
            setFilters(newFilters);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                    <Stack spacing={0.5}>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                            Create New Automation
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={() => router.back()}
                            startIcon={<IoMdArrowBack size={20} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                px: 2.5,
                            }}
                        >
                            Go Back
                        </Button>
                        <LoadingButton
                            variant="contained"
                            onClick={handleSave}
                            loading={isSaving}
                            sx={{
                                borderRadius: 1.5,
                                bgcolor: '#059669',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#047857' },
                            }}
                        >
                            Save Automation
                        </LoadingButton>
                    </Stack>
                </Stack>

                <Box>
                    <Card sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>Basic Information</Typography>
                        <Stack direction="row" spacing={4} alignItems="center" sx={{ mb: 3 }}>
                            <FormControlLabel
                                control={<CustomSwitch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                                label="Is Active"
                                sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
                            />
                            <FormControlLabel
                                control={<CustomSwitch checked={isForStatusChange} onChange={(e) => handleStatusChange(e.target.checked)} />}
                                label="For Status Change"
                                sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
                            />
                            <FormControlLabel
                                control={<CustomSwitch checked={isForCampaigns} onChange={(e) => handleCampaignChange(e.target.checked)} />}
                                label="For Campaigns"
                                sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
                            />
                        </Stack>
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                label="Automation Name"
                                required
                                value={automationName}
                                onChange={(e) => {
                                    setAutomationName(e.target.value);
                                    if (e.target.value) setErrors((prev) => ({ ...prev, automationName: false }));
                                }}
                                error={errors.automationName}
                                helperText={errors.automationName ? 'This field is required' : ''}
                            />
                            {isForCampaigns && (
                                <TextField
                                    select
                                    fullWidth
                                    label="Status"
                                    disabled
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    {['Draft', 'Active', 'Paused', 'Completed', 'Cancelled', 'Failed'].map(opt => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            )}
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </Stack>
                    </Card>

                    <Card sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>Email Configuration</Typography>
                        <Stack spacing={3}>
                            <Autocomplete
                                fullWidth
                                options={templateOptions}
                                getOptionLabel={(option) => option.template_name || option.name || ''}
                                value={templateOptions.find((opt) => opt.name === emailTemplate) || null}
                                onChange={(_e, newValue) => {
                                    setEmailTemplate(newValue?.name || '');
                                    setSubjectOverride(newValue?.subject || '');

                                    if (newValue?.name) {
                                        setErrors((prev) => ({ ...prev, emailTemplate: false }));
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Email Template"
                                        required
                                        error={errors.emailTemplate}
                                        helperText={errors.emailTemplate ? 'This field is required' : ''}
                                    />
                                )}
                                renderOption={(props, option) => {
                                    const { key, ...optionProps } = props as any;
                                    return (
                                        <li key={key || option.name} {...optionProps}>
                                            <Box>
                                                <Typography variant="subtitle2">
                                                    {option.template_name || option.name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {option.subject || 'No Category'}
                                                </Typography>
                                            </Box>
                                        </li>
                                    );
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Subject Override"
                                value={subjectOverride}
                                onChange={(e) => setSubjectOverride(e.target.value)}
                            />
                            <TextField
                                select
                                fullWidth
                                label="Target Type"
                                required
                                value={targetType}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    setTargetType(value);

                                    if (isForStatusChange) {
                                        if (value === 'Lead') {
                                            setTriggerEvent('Lead Workflow State Change');
                                        } else if (value === 'Deals') {
                                            setTriggerEvent('Deal Stage Change');
                                        } else {
                                            setTriggerEvent('');
                                        }
                                    }

                                    if (value) {
                                        setErrors((prev) => ({
                                            ...prev,
                                            targetType: false,
                                            triggerEvent: false,
                                        }));
                                    }
                                }}
                                error={errors.targetType}
                                helperText={errors.targetType ? 'This field is required' : ''}
                            >
                                {(isForStatusChange
                                    ? [
                                        { value: 'Lead', label: 'Lead' },
                                        { value: 'Deals', label: 'Prospects' },
                                    ]
                                    : [
                                        { value: 'Lead', label: 'Lead' },
                                        { value: 'Contact', label: 'Clients' },
                                        { value: 'Account', label: 'Company' }
                                    ]
                                ).map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                            {isForStatusChange && (
                                <TextField
                                    select
                                    fullWidth
                                    label="Trigger Event"
                                    required
                                    disabled
                                    value={triggerEvent}
                                    error={errors.triggerEvent}
                                    helperText={errors.triggerEvent ? 'This field is required' : ''}
                                >
                                    {triggerEventOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                            {isForStatusChange && triggerEvent === 'Lead Workflow State Change' && (
                                <Stack direction="row" spacing={3}>
                                    <TextField
                                        select
                                        fullWidth
                                        required
                                        label="Previous Workflow State"
                                        value={previousWorkflowState}
                                        onChange={(e) => setPreviousWorkflowState(e.target.value)}
                                        error={errors.previousWorkflowState}
                                        helperText={errors.previousWorkflowState ? 'This field is required' : ''}
                                    >
                                        {workflowStates.map((state) => (
                                            <MenuItem key={state} value={state}>
                                                {state}
                                            </MenuItem>
                                        ))}
                                    </TextField>

                                    <TextField
                                        select
                                        fullWidth
                                        required
                                        label="Workflow State"
                                        value={workflowState}
                                        onChange={(e) => setWorkflowState(e.target.value)}
                                        error={errors.workflowState}
                                        helperText={errors.workflowState ? 'This field is required' : ''}
                                    >
                                        {workflowStates.map((state) => (
                                            <MenuItem key={state} value={state}>
                                                {state}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                            )}

                            {isForStatusChange && triggerEvent === 'Deal Stage Change' && (
                                <Stack direction="row" spacing={3}>
                                    <TextField
                                        select
                                        fullWidth
                                        required
                                        label="Previous Deal Stage"
                                        value={previousDealStage}
                                        onChange={(e) => setPreviousDealStage(e.target.value)}
                                        error={errors.previousDealStage}
                                        helperText={errors.previousDealStage ? 'This field is required' : ''}
                                    >
                                        {dealStages.map((stage) => (
                                            <MenuItem key={stage} value={stage}>
                                                {stage}
                                            </MenuItem>
                                        ))}
                                    </TextField>

                                    <TextField
                                        select
                                        fullWidth
                                        required
                                        label="Current Deal Stage"
                                        value={currentDealStage}
                                        onChange={(e) => setCurrentDealStage(e.target.value)}
                                        error={errors.currentDealStage}
                                        helperText={errors.currentDealStage ? 'This field is required' : ''}
                                    >
                                        {dealStages.map((stage) => (
                                            <MenuItem key={stage} value={stage}>
                                                {stage}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                            )}

                            {isForStatusChange && (
                                <FormControlLabel
                                    control={
                                        <CustomSwitch
                                            checked={showConfirmationDialog}
                                            onChange={(e) => setShowConfirmationDialog(e.target.checked)}
                                        />
                                    }
                                    label="Show Confirmation Dialog"
                                    sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
                                />
                            )}

                            {isForStatusChange && showConfirmationDialog && (
                                <Stack spacing={3}>
                                    <TextField
                                        fullWidth
                                        required
                                        label="Dialog Title"
                                        value={dialogTitle}
                                        onChange={(e) => setDialogTitle(e.target.value)}
                                        error={errors.dialogTitle}
                                        helperText={errors.dialogTitle ? "This field is required" : ""}
                                    />

                                    <TextField
                                        fullWidth
                                        required
                                        multiline
                                        rows={4}
                                        label="Dialog Message"
                                        value={dialogMessage}
                                        onChange={(e) => setDialogMessage(e.target.value)}
                                        error={errors.dialogMessage}
                                        helperText={errors.dialogMessage ? "This field is required" : ""}
                                    />

                                    <Stack direction="row" spacing={3}>
                                        <FormControlLabel
                                            control={
                                                <CustomSwitch
                                                    checked={autoSend}
                                                    onChange={(e) => setAutoSend(e.target.checked)}
                                                />
                                            }
                                            label="Auto Send"
                                            sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
                                        />
                                    </Stack>
                                </Stack>
                            )}
                        </Stack>
                    </Card>
                    {isForCampaigns && (
                        <Card sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 3 }}>Audience Filters</Typography>
                            <Stack spacing={3}>
                                <TableContainer sx={{
                                    overflow: 'unset',
                                    border: (theme) => `1px solid ${theme.palette.divider}`,
                                    borderRadius: 1.5,
                                    bgcolor: 'background.paper',
                                    boxShadow: (theme) => theme.customShadows.z8,
                                }}>
                                    <Table sx={{ minWidth: 960 }}>
                                        <TableHead sx={{
                                            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                            '& th:first-of-type': { borderTopLeftRadius: 11 },
                                            '& th:last-of-type': { borderTopRightRadius: 11 }
                                        }}>
                                            <TableRow>
                                                <TableCell width={60} sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>No.</TableCell>
                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>Field</TableCell>
                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>Operator</TableCell>
                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>Value</TableCell>
                                                <TableCell width={60} />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filters.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                        <Stack alignItems="center" spacing={1}>
                                                            <Iconify icon={"solar:folder-with-files-outline" as any} width={32} sx={{ color: 'text.secondary' }} />
                                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>No Data</Typography>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filters.map((filter, index) => (
                                                    <TableRow key={index} sx={{
                                                        verticalAlign: 'top',
                                                        transition: (theme) => theme.transitions.create('background-color'),
                                                        '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02) },
                                                        '&:nth-of-type(even)': { bgcolor: (theme) => alpha(theme.palette.grey[500], 0.02) },
                                                    }}>
                                                        <TableCell sx={{ px: 1, py: 1, borderRight: (theme) => `1px solid ${theme.palette.divider}` }}>
                                                            <Box sx={{ py: 1, px: 1 }}>{index + 1}</Box>
                                                        </TableCell>
                                                        <TableCell sx={{ px: 1, py: 1, borderRight: (theme) => `1px solid ${theme.palette.divider}`, transition: (theme) => theme.transitions.create(['background-color', 'box-shadow']), '&:focus-within': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05) } }}>
                                                            <Autocomplete
                                                                size="small"
                                                                options={filterFieldOptions}
                                                                value={
                                                                    filterFieldOptions.find(
                                                                        (x) => x.fieldname === filter.field_name
                                                                    ) || null
                                                                }
                                                                isOptionEqualToValue={(option, value) =>
                                                                    option.fieldname === value.fieldname
                                                                }
                                                                getOptionLabel={(option) => option.label}
                                                                onChange={(_, value) => {
                                                                    handleFilterChange(
                                                                        index,
                                                                        "field_name",
                                                                        value?.value || ""
                                                                    );
                                                                }}
                                                                renderInput={(params) => (
                                                                    <TextField
                                                                        {...params}
                                                                        variant="standard"
                                                                        placeholder="Select Field"
                                                                        InputProps={{
                                                                            ...params.InputProps,
                                                                            disableUnderline: true,
                                                                        }}
                                                                    />
                                                                )}
                                                                renderOption={(props, option) => (
                                                                    <Box component="li" {...props}>
                                                                        <Stack spacing={0}>
                                                                            <Typography variant="body2">
                                                                                {option.label}
                                                                            </Typography>

                                                                            <Typography
                                                                                variant="caption"
                                                                                color="text.secondary"
                                                                            >
                                                                                {option.fieldtype}
                                                                            </Typography>
                                                                        </Stack>
                                                                    </Box>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ px: 1, py: 1, borderRight: (theme) => `1px solid ${theme.palette.divider}`, transition: (theme) => theme.transitions.create(['background-color', 'box-shadow']), '&:focus-within': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05) } }}>
                                                            <TextField
                                                                variant="standard"
                                                                select
                                                                fullWidth
                                                                value={filter.operator}
                                                                onChange={(e) => {
                                                                    const newFilters = [...filters];
                                                                    newFilters[index].operator = e.target.value;
                                                                    setFilters(newFilters);
                                                                }}
                                                                InputProps={{ disableUnderline: true, sx: { typography: 'body2' } }}
                                                            >
                                                                {['=', '!=', '<', '>', '<=', '>=', 'in', 'not in', 'like', 'not like'].map(opt => (
                                                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                                                ))}
                                                            </TextField>
                                                        </TableCell>
                                                        <TableCell sx={{ px: 1, py: 1, borderRight: (theme) => `1px solid ${theme.palette.divider}`, transition: (theme) => theme.transitions.create(['background-color', 'box-shadow']), '&:focus-within': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05) } }}>
                                                            <Autocomplete
                                                                size="small"
                                                                freeSolo
                                                                options={filterValueOptions[index] || []}
                                                                value={filter.value}
                                                                onChange={(_, value) => {
                                                                    handleFilterChange(index, "value", value || "");
                                                                }}
                                                                onInputChange={(_, value) => {
                                                                    handleFilterChange(index, "value", value);
                                                                }}
                                                                renderInput={(params) => (
                                                                    <TextField
                                                                        {...params}
                                                                        variant="standard"
                                                                        placeholder="Value"
                                                                        InputProps={{
                                                                            ...params.InputProps,
                                                                            disableUnderline: true,
                                                                            sx: {
                                                                                typography: "body2",
                                                                            },
                                                                        }}
                                                                    />
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ px: 1, py: 1 }}>
                                                            <IconButton color="error" onClick={() => {
                                                                const newFilters = [...filters];
                                                                newFilters.splice(index, 1);
                                                                setFilters(newFilters);
                                                            }} size="small" sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                                                <Iconify icon="solar:trash-bin-trash-bold" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Button
                                    startIcon={<Iconify icon={"mingcute:add-line" as any} />}
                                    onClick={() => setFilters([...filters, { field_name: '', operator: '=', value: '' }])}
                                    sx={{
                                        alignSelf: 'flex-start',
                                        background: 'linear-gradient(135deg,#059669,#059669)',
                                        borderRadius: 3,
                                        px: 2,
                                        py: 0.6,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        color: 'white',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg,#059669,#059669)',
                                            boxShadow: '0 8px 10px rgba(124,58,237,.25)',
                                        }
                                    }}
                                >
                                    Add Row
                                </Button>
                            </Stack>
                        </Card>
                    )}

                    {isForCampaigns && (
                        <Card sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 3 }}>Schedule</Typography>
                            <Stack spacing={3}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Frequency"
                                    required
                                    value={frequency}
                                    onChange={(e) => {
                                        setFrequency(e.target.value);
                                        if (e.target.value) setErrors((prev) => ({ ...prev, frequency: false }));
                                    }}
                                    error={errors.frequency}
                                    helperText={errors.frequency ? 'This field is required' : ''}
                                >
                                    {['Once', 'Daily', 'Weekly', 'Monthly', 'Yearly'].map(opt => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                                {frequency && (
                                    <>
                                        <Stack direction="row" spacing={2}>
                                            <DatePicker
                                                label="Start Date *"
                                                format="DD-MM-YYYY"
                                                value={startDate ? dayjs(startDate) : null}
                                                onChange={(newValue) => {
                                                    const formatted = newValue ? newValue.format('YYYY-MM-DD') : '';
                                                    setStartDate(formatted);
                                                    if (formatted) setErrors((prev) => ({ ...prev, startDate: false }));
                                                }}
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        error: errors.startDate,
                                                        helperText: errors.startDate ? 'This field is required' : ''
                                                    }
                                                }}
                                            />
                                            {['Daily', 'Weekly', 'Monthly', 'Yearly'].includes(frequency) && (
                                                <DatePicker
                                                    label="End Date"
                                                    format="DD-MM-YYYY"
                                                    value={endDate ? dayjs(endDate) : null}
                                                    onChange={(newValue) => setEndDate(newValue ? newValue.format('YYYY-MM-DD') : '')}
                                                    slotProps={{ textField: { fullWidth: true } }}
                                                />
                                            )}
                                        </Stack>
                                        <TimePicker
                                            label="Run Time *"
                                            value={runTime ? dayjs(`2000-01-01T${runTime}`) : null}
                                            onChange={(newValue) => {
                                                const formatted = newValue ? newValue.format('HH:mm:ss') : '';
                                                setRunTime(formatted);
                                                if (formatted) setErrors((prev) => ({ ...prev, runTime: false }));
                                            }}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    error: errors.runTime,
                                                    helperText: errors.runTime ? 'This field is required' : ''
                                                }
                                            }}
                                        />
                                        {frequency === 'Weekly' && (
                                            <TextField
                                                select
                                                fullWidth
                                                label="Week Day *"
                                                value={weekDay}
                                                onChange={(e) => {
                                                    setWeekDay(e.target.value);
                                                    if (e.target.value) setErrors((prev) => ({ ...prev, weekDay: false }));
                                                }}
                                                error={errors.weekDay}
                                                helperText={errors.weekDay ? 'This field is required' : ''}
                                            >
                                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                                    <MenuItem key={day} value={day}>
                                                        {day}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        )}
                                        {frequency === 'Monthly' && (
                                            <TextField
                                                fullWidth
                                                type="number"
                                                label="Day Of Month *"
                                                value={dayOfMonth}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setDayOfMonth(val ? Number(val) : '');
                                                    if (val) setErrors((prev) => ({ ...prev, dayOfMonth: false }));
                                                }}
                                                inputProps={{ min: 1, max: 31 }}
                                                error={errors.dayOfMonth}
                                                helperText={errors.dayOfMonth ? 'This field is required (1-31)' : ''}
                                            />
                                        )}
                                    </>
                                )}
                            </Stack>
                        </Card>
                    )}

                    {isForCampaigns && (
                        <Card sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 3 }}>Execution Settings</Typography>
                            <Box display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }} gap={3}>
                                <Stack spacing={2}>
                                    <FormControlLabel
                                        control={<CustomSwitch checked={createSeparateCampaign} onChange={(e) => setCreateSeparateCampaign(e.target.checked)} />}
                                        label="Create Separate Campaign"
                                        sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
                                    />
                                    <FormControlLabel
                                        control={<CustomSwitch checked={sendImmediately} onChange={(e) => setSendImmediately(e.target.checked)} />}
                                        label="Send Immediately"
                                        sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
                                    />
                                </Stack>
                                <Stack spacing={2}>
                                    <FormControlLabel
                                        control={<CustomSwitch checked={autoPauseOnError} onChange={(e) => setAutoPauseOnError(e.target.checked)} />}
                                        label="Auto Pause On Error"
                                        sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
                                    />
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Max Retry Count"
                                        value={maxRetryCount}
                                        onChange={(e) => setMaxRetryCount(e.target.value ? Number(e.target.value) : '')}
                                    />
                                </Stack>
                            </Box>
                        </Card>
                    )}
                </Box>

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
        </LocalizationProvider>
    );
}