import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    IoMdArrowBack, IoMdSettings, IoMdMail, IoMdCalendar, IoMdStats, IoMdCreate
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

import { DashboardContent } from 'src/layouts/dashboard';
import { getEmailTemplate } from 'src/api/email-template';
import { getEmailAutomation } from 'src/api/email-automation';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

export function EmailAutomationsDetailsView() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [automation, setAutomation] = useState<any>(null);
    const [templateName, setTemplateName] = useState<string>('');
    const [fetching, setFetching] = useState(true);

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.email_automations;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.email_automations?.edit : true;

    useEffect(() => {
        if (id) {
            getEmailAutomation(id)
                .then((data) => {
                    setAutomation(data);
                    if (data.email_template) {
                        getEmailTemplate(data.email_template)
                            .then((templateData) => setTemplateName(templateData.template_name || templateData.name))
                            .catch(() => setTemplateName(data.email_template));
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
        status,
        email_template,
        subject_override,
        target_type,
        frequency,
        run_time,
        start_date,
        end_date,
        week_day,
        day_of_month,
        last_run_on,
        next_run_on,
        last_campaign,
        total_runs,
        total_failed,
        total_recipients,
        open_count,
        total_emails_sent,
        click_count,
        for_status_change,
        for_campaigns,
        trigger_event,
        workflow_state,
        previous_workflow_state,
        current_deal_stage,
        previous_deal_stage,
        show_confirmation_dialog,
        dialog_title,
        dialog_message,
        auto_send,
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
                            onClick={() => navigate(`/email-automations/${encodeURIComponent(id || '')}/edit`)}
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
                         <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                             <Stack spacing={1.5}>
                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Automation Name</Typography>
                                     <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{automation_name || '-'}</Typography>
                                 </Stack>
                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Automation Type</Typography>
                                     <Chip 
                                         label={for_status_change === 1 ? 'For Status Change' : 'For Campaigns'} 
                                         size="small" 
                                         color="primary" 
                                         sx={{ borderRadius: 1, bgcolor: '#059669', p: 1 }} 
                                     />
                                 </Stack>
                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Description</Typography>
                                     <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold', textAlign: 'right', maxWidth: '60%' }}>{description || '-'}</Typography>
                                 </Stack>
                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Is Active</Typography>
                                     <Chip label={is_active ? 'Yes' : 'No'} size="small" color={is_active ? 'success' : 'default'} sx={{ borderRadius: 1,  p: 1  }} />
                                 </Stack>
                                 {for_campaigns === 1 && (
                                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                                         <Typography variant="caption" color="text.secondary">Status</Typography>
                                         <Box
                                             sx={{
                                                 display: 'inline-flex',
                                                 justifyContent: 'center',
                                                 alignItems: 'center',
                                                 fontWeight: 700,
                                                 fontSize: 11,
                                                 textTransform: 'uppercase',
                                                 borderRadius: '6px',
                                                 padding: '4px 12px',
                                                 ...(is_active
                                                     ? {
                                                           bgcolor: 'rgba(34, 197, 94, 0.25)',
                                                           border: '1px solid rgba(34, 197, 94, 0.45)',
                                                           color: '#15803d',
                                                       }
                                                     : {
                                                           bgcolor: 'rgba(156, 163, 175, 0.25)',
                                                           border: '1px solid rgba(156, 163, 175, 0.45)',
                                                           color: '#374151',
                                                       }),
                                             }}
                                         >
                                             {status || (is_active ? 'Active' : 'Inactive')}
                                         </Box>
                                     </Stack>
                                 )}
                             </Stack>
                         </Box>
                     </Stack>
 
                     {/* Email Configuration */}
                     <Stack spacing={1.5}>
                         <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                             <IoMdMail size={20} />
                             <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 13 }}>Email Configuration</Typography>
                         </Stack>
                         <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                             <Stack spacing={1.5}>
                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Email Template</Typography>
                                     <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{templateName || email_template || '-'}</Typography>
                                 </Stack>
                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Subject Override</Typography>
                                     <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold', textAlign: 'right', maxWidth: '60%' }}>{subject_override || '-'}</Typography>
                                 </Stack>
                                 {for_campaigns === 1 && (
                                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                                         <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }} >Target Type</Typography>
                                         <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{target_type || '-'}</Typography>
                                     </Stack>
                                 )}
                                 {for_status_change === 1 && (
                                     <>
                                         <Stack direction="row" justifyContent="space-between" alignItems="center">
                                             <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Trigger Event</Typography>
                                             <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{trigger_event || '-'}</Typography>
                                         </Stack>
                                         {trigger_event === 'Lead Workflow State Change' && (
                                             <>
                                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Previous Workflow State</Typography>
                                                     <Typography variant="body2" sx={{ fontWeight: 900, color: 'primary.main', fontSize: 14 }}>{previous_workflow_state || '-'}</Typography>
                                                 </Stack>
                                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Workflow State</Typography>
                                                     <Typography variant="body2" sx={{ fontWeight: 900, color: 'primary.main', fontSize: 14 }}>{workflow_state || '-'}</Typography>
                                                 </Stack>
                                             </>
                                         )}
                                         {trigger_event === 'Deal Stage Change' && (
                                             <>
                                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Previous Deal Stage</Typography>
                                                     <Typography variant="body2" sx={{ fontWeight: 900, color: 'primary.main', fontSize: 14 }}>{previous_deal_stage || '-'}</Typography>
                                                 </Stack>
                                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Current Deal Stage</Typography>
                                                     <Typography variant="body2" sx={{ fontWeight: 900, color: 'primary.main', fontSize: 14 }}>{current_deal_stage || '-'}</Typography>
                                                 </Stack>
                                             </>
                                         )}
                                         <Stack direction="row" justifyContent="space-between" alignItems="center">
                                             <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Show Confirmation Dialog</Typography>
                                             <Chip label={show_confirmation_dialog === 1 ? 'Yes' : 'No'} size="small" color={show_confirmation_dialog === 1 ? 'primary' : 'default'} sx={{ borderRadius: 1,  p: 1  }} />
                                         </Stack>
                                         {show_confirmation_dialog === 1 && (
                                             <>
                                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Dialog Title</Typography>
                                                     <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{dialog_title || '-'}</Typography>
                                                 </Stack>
                                                 <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                     <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Dialog Message</Typography>
                                                     <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold', textAlign: 'right', maxWidth: '60%' }}>{dialog_message || '-'}</Typography>
                                                 </Stack>
                                             </>
                                         )}
                                         <Stack direction="row" justifyContent="space-between" alignItems="center">
                                             <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600, pb: 1 }}>Auto Send</Typography>
                                             <Chip label={auto_send === 1 ? 'Yes' : 'No'} size="small" color={auto_send === 1 ? 'primary' : 'default'} sx={{ borderRadius: 1,  p: 1  }} />
                                         </Stack>
                                     </>
                                 )}
                             </Stack>
                         </Box>
                     </Stack>
 
                     {/* Audience Filters */}
                     {for_campaigns === 1 && (
                         <Stack spacing={1.5} sx={{ gridColumn: { xs: 'span 1', md: 'span 2' } }}>
                             <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                 <Iconify icon="solar:users-group-rounded-bold" width={20} />
                                 <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Audience Filters</Typography>
                             </Stack>
                             <Box sx={{ borderRadius: 1.5, border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}`, overflow: 'hidden' }}>
                                 {automation.filters && automation.filters.length > 0 ? (
                                     <Table size="small">
                                         <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04) }}>
                                             <TableRow>
                                                 <TableCell width={60}>No.</TableCell>
                                                 <TableCell>Field</TableCell>
                                                 <TableCell>Operator</TableCell>
                                                 <TableCell>Value</TableCell>
                                             </TableRow>
                                         </TableHead>
                                         <TableBody>
                                             {automation.filters.map((filter: any, index: number) => (
                                                 <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                     <TableCell>{index + 1}</TableCell>
                                                     <TableCell sx={{ fontWeight: 'fontWeightSemiBold' }}>{filter.field_name}</TableCell>
                                                     <TableCell><Chip size="small" label={filter.operator} sx={{ borderRadius: 1,  p: 1  }} /></TableCell>
                                                     <TableCell>{filter.value}</TableCell>
                                                 </TableRow>
                                             ))}
                                         </TableBody>
                                     </Table>
                                 ) : (
                                     <Box sx={{ p: 3, textAlign: 'center' }}>
                                         <Typography variant="body2" color="text.secondary">No filters added</Typography>
                                     </Box>
                                 )}
                             </Box>
                         </Stack>
                     )}
 
                     {/* Schedule Configuration */}
                     {for_campaigns === 1 && (
                         <Stack spacing={1.5}>
                             <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                 <IoMdCalendar size={20} />
                                 <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Schedule Configuration</Typography>
                             </Stack>
                             <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                 <Stack spacing={1.5}>
                                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                                         <Typography variant="caption" color="text.secondary">Frequency</Typography>
                                         <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{frequency || '-'}</Typography>
                                     </Stack>
                                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                                         <Typography variant="caption" color="text.secondary">Run Time</Typography>
                                         <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{run_time || '-'}</Typography>
                                     </Stack>
                                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                                         <Typography variant="caption" color="text.secondary">Start Date</Typography>
                                         <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{start_date || '-'}</Typography>
                                     </Stack>
                                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                                         <Typography variant="caption" color="text.secondary">End Date</Typography>
                                         <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{end_date || '-'}</Typography>
                                     </Stack>
                                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                                         <Typography variant="caption" color="text.secondary">Week Day</Typography>
                                         <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{week_day || '-'}</Typography>
                                     </Stack>
                                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                                         <Typography variant="caption" color="text.secondary">Day of Month</Typography>
                                         <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{day_of_month || '-'}</Typography>
                                     </Stack>
                                 </Stack>
                             </Box>
                         </Stack>
                     )}

                    {/* Statistics */}
                    {for_campaigns === 1 && (
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                <IoMdStats size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Statistics</Typography>
                            </Stack>
                            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.info.main, 0.04), border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.12)}` }}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">Last Run</Typography>
                                        <Typography variant="subtitle2" color="info.main">{last_run_on || '-'}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">Next Run</Typography>
                                        <Typography variant="subtitle2" color="info.main">{next_run_on || '-'}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">Last Campaign</Typography>
                                        <Typography variant="subtitle2">{last_campaign || '-'}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">Total Runs</Typography>
                                        <Typography variant="h6">{total_runs || 0}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">Total Recipients</Typography>
                                        <Typography variant="subtitle2">{total_recipients || 0}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">Total Emails Sent</Typography>
                                        <Typography variant="h6" color="success.main">{total_emails_sent || 0}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">Total Failed</Typography>
                                        <Typography variant="subtitle2" color="error.main">{total_failed || 0}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">Open Count</Typography>
                                        <Typography variant="subtitle2">{open_count || 0}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">Click Count</Typography>
                                        <Typography variant="subtitle2">{click_count || 0}</Typography>
                                    </Stack>
                                </Stack>
                            </Box>
                        </Stack>
                    )}

                </Box>
            </Card>
        </DashboardContent>
    );
}