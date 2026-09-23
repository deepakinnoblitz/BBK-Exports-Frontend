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
import FormControlLabel from '@mui/material/FormControlLabel';

import { useRouter } from 'src/routes/hooks';

import { getWorkflowStates } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import { createWhatsAppAutomation } from 'src/api/whatsapp-automation';
import { fetchWhatsAppTemplates, fetchWhatsAppTemplateCategories } from 'src/api/whatsapp-template';

import { Iconify } from 'src/components/iconify';

import { CustomSwitch } from 'src/sections/reminders/reminders-settings-view';

const DEAL_STAGES = [
    'Just In',
    'Working',
    'Estimation Created',
    'Estimation Sent',
    'Invoice Created',
    'Invoice Sent',
    'Special Approval',
    'Project Started',
    'Closed'
];

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

export function WhatsAppAutomationsCreateView() {
    const router = useRouter();

    const [templateOptions, setTemplateOptions] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [leadWorkflowStates, setLeadWorkflowStates] = useState<string[]>([]);

    useEffect(() => {
        fetchWhatsAppTemplates({ page: 1, page_size: 1000 }).then((res) => {
            setTemplateOptions((res.data || []).filter((t: any) => t.status !== 'Draft'));
        }).catch((err) => {
            console.error('Failed to fetch WhatsApp templates:', err);
        });

        fetchWhatsAppTemplateCategories().then((res) => {
            setCategories(res);
        }).catch((err) => {
            console.error('Failed to fetch WhatsApp template categories:', err);
        });

        getWorkflowStates('Lead').then((res) => {
            setLeadWorkflowStates(res.states || []);
        }).catch((err) => {
            console.error('Failed to fetch Lead workflow states:', err);
        });
    }, []);

    const [automationName, setAutomationName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [documentType, setDocumentType] = useState('Lead');
    const [triggerEvent, setTriggerEvent] = useState('Lead Workflow State Change');
    const [workflowState, setWorkflowState] = useState('');
    const [previousWorkflowState, setPreviousWorkflowState] = useState('');
    const [dealStage, setDealStage] = useState('');
    const [previousDealStage, setPreviousDealStage] = useState('');
    const [whatsappTemplate, setWhatsappTemplate] = useState('');
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(true);
    const [dialogTitle, setDialogTitle] = useState('Send WhatsApp Message?');
    const [dialogMessage, setDialogMessage] = useState('Do you want to send the WhatsApp message?');
    const [autoSend, setAutoSend] = useState(false);
    
    const [isSaving, setIsSaving] = useState(false);

    const [errors, setErrors] = useState({
        automationName: false,
        documentType: false,
        triggerEvent: false,
        whatsappTemplate: false,
        workflowState: false,
        previousWorkflowState: false,
        dealStage: false,
        previousDealStage: false,
    });

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const handleSave = () => {
        const newErrors = {
            automationName: !automationName,
            documentType: !documentType,
            triggerEvent: !triggerEvent,
            whatsappTemplate: !whatsappTemplate,
            workflowState:
                triggerEvent === "Lead Workflow State Change" && !workflowState,
            previousWorkflowState:
                triggerEvent === "Lead Workflow State Change" &&
                !previousWorkflowState,
            dealStage:
                triggerEvent === "Deal Stage Change" && !dealStage,
            previousDealStage:
                triggerEvent === "Deal Stage Change" && !previousDealStage,
        };

        setErrors(newErrors);

        const missingFields: string[] = [];

        if (newErrors.automationName) missingFields.push("Automation Name");
        if (newErrors.documentType) missingFields.push("Document Type");
        if (newErrors.triggerEvent) missingFields.push("Trigger Event");
        if (newErrors.whatsappTemplate) missingFields.push("WhatsApp Template");
        if (newErrors.workflowState) missingFields.push("Workflow State");
        if (newErrors.previousWorkflowState) missingFields.push("Previous Workflow State");
        if (newErrors.dealStage) missingFields.push("Current Deal Stage");
        if (newErrors.previousDealStage) missingFields.push("Previous Deal Stage");

        if (missingFields.length > 0) {
            setSnackbar({
                open: true,
                message: `Please fill in mandatory fields: ${missingFields.join(", ")}`,
                severity: "error",
            });
            return;
        }

        setIsSaving(true);
        const data = {
            automation_name: automationName,
            description,
            is_active: isActive ? 1 : 0,
            document_type: documentType,
            trigger_event: triggerEvent,
            ...(triggerEvent === 'Lead Workflow State Change' ? {
                workflow_state: workflowState || undefined,
                previous_workflow_state: previousWorkflowState || undefined,
                deal_stage: undefined,
                previous_deal_stage: undefined,
            } : {
                workflow_state: undefined,
                previous_workflow_state: undefined,
                deal_stage: dealStage || undefined,
                previous_deal_stage: previousDealStage || undefined,
            }),
            whatsapp_template: whatsappTemplate,
            show_confirmation_dialog: showConfirmationDialog ? 1 : 0,
            dialog_title: showConfirmationDialog ? dialogTitle : undefined,
            dialog_message: showConfirmationDialog ? dialogMessage : undefined,
            auto_send: autoSend ? 1 : 0,
        };

        createWhatsAppAutomation(data)
            .then(() => {
                setSnackbar({ open: true, message: 'Automation created successfully!', severity: 'success' });
                sessionStorage.setItem('whatsapp_automation_success_message', 'Automation created successfully!');
                setTimeout(() => {
                    router.push('/whatsapp-automation');
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

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Stack spacing={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Create New WhatsApp Automation
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
                {/* Basic Information */}
                <Card sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>Basic Information</Typography>
                    <Stack spacing={3}>
                        <FormControlLabel 
                            control={<CustomSwitch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} 
                            label="Is Active" 
                            sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }} 
                        />
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

                {/* Trigger Configuration */}
                <Card sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>Trigger Configuration</Typography>
                    <Stack spacing={3}>
                        <TextField
                            select
                            fullWidth
                            label="Document Type"
                            required
                            value={documentType}
                            onChange={(e) => {
                                const value = e.target.value;

                                setDocumentType(value);

                                // Auto-select Trigger Event
                                if (value === 'Lead') {
                                    setTriggerEvent('Lead Workflow State Change');
                                } else if (value === 'Deal') {
                                    setTriggerEvent('Deal Stage Change');
                                }
                            }}
                            error={errors.documentType}
                            helperText={errors.documentType ? 'This field is required' : ''}
                        >
                            <MenuItem value="Lead">Lead</MenuItem>
                            <MenuItem value="Deal">Prospects</MenuItem>
                        </TextField>
                        <TextField
                            select
                            fullWidth
                            label="Trigger Event"
                            required
                            value={triggerEvent}
                            disabled
                            error={errors.triggerEvent}
                            helperText={errors.triggerEvent ? 'This field is required' : ''}
                        >
                            {triggerEventOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        {triggerEvent === 'Lead Workflow State Change' && (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField 
                                    select
                                    fullWidth 
                                    label="Previous Workflow State" 
                                    value={previousWorkflowState}
                                    error={errors.previousWorkflowState}
                                    helperText={errors.previousWorkflowState ? "This field is required" : ""}
                                    onChange={(e) => {
                                        setPreviousWorkflowState(e.target.value);
                                        setErrors((prev) => ({
                                            ...prev,
                                            previousWorkflowState: false,
                                        }));
                                    }}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {leadWorkflowStates.map(opt => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                                <TextField 
                                    select
                                    fullWidth 
                                    label="Workflow State" 
                                    value={workflowState}
                                    error={errors.workflowState}
                                    helperText={errors.workflowState ? "This field is required" : ""}
                                    onChange={(e) => { 
                                        setWorkflowState(e.target.value)
                                        setErrors((prev) => ({
                                                ...prev,
                                                workflowState: false,
                                            }));
                                        }   
                                    }
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {leadWorkflowStates.map(opt => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Stack>
                        )}

                        {triggerEvent === 'Deal Stage Change' && (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField 
                                    select
                                    fullWidth 
                                    label="Previous Deal Stage" 
                                    value={previousDealStage}
                                    error={errors.previousDealStage}
                                    helperText={errors.previousDealStage ? "This field is required" : ""}
                                    onChange={(e) => {
                                        setPreviousDealStage(e.target.value);
                                        setErrors((prev) => ({
                                            ...prev,
                                            previousDealStage: false,
                                        }));
                                    }}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {DEAL_STAGES.map(opt => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                                <TextField 
                                    select
                                    fullWidth 
                                    label="Current Deal Stage" 
                                    value={dealStage}
                                    error={errors.dealStage}
                                    helperText={errors.dealStage ? "This field is required" : ""}
                                    onChange={(e) => {
                                        setDealStage(e.target.value)
                                        setErrors((prev) => ({
                                            ...prev,
                                            dealStage: false,
                                        }));
                                    }}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {DEAL_STAGES.map(opt => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Stack>
                        )}
                    </Stack>
                </Card>

                {/* WhatsApp Configuration */}
                <Card sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>WhatsApp Configuration</Typography>
                    <Stack spacing={3}>
                        <Autocomplete
                            fullWidth
                            options={templateOptions}
                            getOptionLabel={(option) => option.template_name || option.name || ''}
                            filterOptions={(options, state) => {
                                const { inputValue } = state;
                                return options.filter((option) =>
                                    (option.template_name || '').toLowerCase().includes(inputValue.toLowerCase()) ||
                                    (option.name || '').toLowerCase().includes(inputValue.toLowerCase())
                                );
                            }}
                            value={templateOptions.find((opt) => opt.name === whatsappTemplate) || null}
                            onChange={(_e, newValue) => {
                                setWhatsappTemplate(newValue?.name || '');
                                if (newValue?.name) setErrors(prev => ({ ...prev, whatsappTemplate: false }));
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="WhatsApp Template"
                                    required
                                    error={errors.whatsappTemplate}
                                    helperText={errors.whatsappTemplate ? 'This field is required' : ''}
                                />
                            )}
                            renderOption={(props, option) => {
                                const { key, ...optionProps } = props as any;
                                const matchedCategory = categories.find((cat) => cat.name === option.category);
                                const categoryLabel = matchedCategory ? matchedCategory.category : (option.category || 'No Category');
                                return (
                                    <li key={key || option.name} {...optionProps}>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontSize: '14px' }}>
                                                {option.template_name || option.name}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                                                {categoryLabel}
                                            </Typography>
                                        </Box>
                                    </li>
                                );
                            }}
                        />
                    </Stack>
                </Card>

                {/* Confirmation Dialog & Execution Settings */}
                <Card sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>Execution Settings</Typography>
                    <Stack spacing={3}>
                        <FormControlLabel 
                            control={<CustomSwitch checked={showConfirmationDialog} onChange={(e) => setShowConfirmationDialog(e.target.checked)} />} 
                            label="Show Confirmation Dialog" 
                            sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }} 
                        />

                        {showConfirmationDialog && (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField 
                                    fullWidth 
                                    label="Dialog Title" 
                                    value={dialogTitle}
                                    onChange={(e) => setDialogTitle(e.target.value)}
                                />
                                <TextField 
                                    fullWidth 
                                    label="Dialog Message" 
                                    value={dialogMessage}
                                    onChange={(e) => setDialogMessage(e.target.value)}
                                />
                            </Stack>
                        )}

                        <FormControlLabel 
                            control={<CustomSwitch checked={autoSend} onChange={(e) => setAutoSend(e.target.checked)} />} 
                            label="Auto Send" 
                            sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }} 
                        />
                    </Stack>
                </Card>
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
    );
}
