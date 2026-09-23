import { useState, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    IoMdArrowBack, IoMdSettings, IoMdCalendar, IoMdCreate
} from "react-icons/io";

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { frappeRequest } from 'src/utils/csrf';

import { DashboardContent } from 'src/layouts/dashboard';
import { getWhatsAppTemplate } from 'src/api/whatsapp-template';
import { getWhatsAppAutomation } from 'src/api/whatsapp-automation';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

export function WhatsAppAutomationsDetailsView() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [automation, setAutomation] = useState<any>(null);
    const [templateName, setTemplateName] = useState<string>('');
    const [fetching, setFetching] = useState(true);

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.whatsapp_automations;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.whatsapp_automations?.edit : true;

    useEffect(() => {
        if (id) {
            getWhatsAppAutomation(id)
                .then((data) => {
                    setAutomation(data);
                    if (data.whatsapp_template) {
                        getWhatsAppTemplate(data.whatsapp_template)
                            .then((templateData) => setTemplateName(templateData.template_name || templateData.name))
                            .catch(() => setTemplateName(data.whatsapp_template));
                    }
                })
                .catch((err) => console.error('Failed to fetch automation details:', err))
                .finally(() => setFetching(false));
        }
    }, [id]);

    if (fetching) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!automation) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Automation not found</Typography>
                <Button onClick={() => navigate(-1)} sx={{ mt: 3 }}>
                    Go back to list
                </Button>
            </DashboardContent>
        );
    }

    const {
        automation_name,
        description,
        is_active,
        document_type,
        trigger_event,
        workflow_state,
        previous_workflow_state,
        deal_stage,
        previous_deal_stage,
        show_confirmation_dialog,
        dialog_title,
        dialog_message,
        auto_send,
        conditions,
    } = automation;

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Typography variant="h4">Automation: {automation_name || id}</Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => navigate(-1)}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            }
                        }}
                    >
                        Go Back
                    </Button>
                    {displayEdit &&(
                        <Button
                            variant="contained"
                            onClick={() => navigate(`/whatsapp-automation/${encodeURIComponent(id || '')}/edit`)}
                            startIcon={<IoMdCreate size={20} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                bgcolor: '#059669',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#047857' }
                            }}
                        >
                            Edit
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Card sx={{ p: 4, borderRadius: 2 }}>
                <Box
                    sx={{
                        display: 'grid',
                        columnGap: 4,
                        rowGap: 4,
                        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
                    }}
                >
                    {/* Basic Information */}
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                            <IoMdSettings size={20} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Basic Information</Typography>
                        </Stack>
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.18)}` }}>
                            <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Automation Name</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold', fontSize: 14 }}>{automation_name || '-'}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Description</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold', fontSize: 14, textAlign: 'right', maxWidth: '60%' }}>{description || '-'}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Is Active</Typography>
                                    <Chip label={is_active ? 'Yes' : 'No'} size="small" color={is_active ? 'success' : 'default'} sx={{ borderRadius: 1, p: 1 }} />
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>

                    {/* WhatsApp Configuration */}
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                            <FaWhatsapp size={20} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>WhatsApp Configuration</Typography>
                        </Stack>
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.18)}` }}>
                            <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>WhatsApp Template</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold', fontSize: 14 }}>{templateName || '-'}</Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>

                    {/* Trigger Configuration */}
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                            <IoMdCalendar size={20} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Trigger Configuration</Typography>
                        </Stack>
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.18)}` }}>
                            <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Document Type</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{document_type || '-'}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Trigger Event</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{trigger_event || '-'}</Typography>
                                </Stack>
                                {trigger_event === 'Lead Workflow State Change' && (
                                    <>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Previous Workflow State</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{previous_workflow_state || '-'}</Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Workflow State</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{workflow_state || '-'}</Typography>
                                        </Stack>
                                    </>
                                )}
                                {trigger_event === 'Deal Stage Change' && (
                                    <>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Previous Deal Stage</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{previous_deal_stage || '-'}</Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Current Deal Stage</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{deal_stage || '-'}</Typography>
                                        </Stack>
                                    </>
                                )}
                            </Stack>
                        </Box>
                    </Stack>

                    {/* Execution Settings */}
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                            <Iconify icon={"solar:programming-bold" as any} width={20} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Execution Settings</Typography>
                        </Stack>
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.18)}` }}>
                            <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Show Confirmation Dialog</Typography>
                                    <Chip label={show_confirmation_dialog ? 'Yes' : 'No'} size="small" color={show_confirmation_dialog ? 'info' : 'default'} sx={{ borderRadius: 1, p: 1 }} />
                                </Stack>
                                {show_confirmation_dialog && (
                                    <>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Dialog Title</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{dialog_title || '-'}</Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Dialog Message</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold', textAlign: 'right', maxWidth: '60%' }}>{dialog_message || '-'}</Typography>
                                        </Stack>
                                    </>
                                )}
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>Auto Send</Typography>
                                    <Chip label={auto_send ? 'Yes' : 'No'} size="small" color={auto_send ? 'success' : 'default'} sx={{ borderRadius: 1, p: 1 }} />
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>
                </Box>
            </Card>
        </DashboardContent>
    );
}
