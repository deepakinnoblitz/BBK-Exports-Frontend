import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { getEmployee } from 'src/api/employees';
import { getRequest, updateRequestStatus } from 'src/api/requests';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { ClarificationDialog } from './clarification-dialog';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    request: any;
    onRefresh?: () => void;
    socket?: any;
};

export function RequestDetailsDialog({ open, onClose, request, onRefresh, socket }: Props) {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && (user?.permissions?.actions?.request_list || user?.permissions?.actions?.my_request_list);
    const actionPerms = user?.permissions?.actions?.request_list || user?.permissions?.actions?.my_request_list;
    const canEdit = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const [openClarification, setOpenClarification] = useState(false);
    const [clarificationType, setClarificationType] = useState<'HR' | 'Employee'>('HR');
    const [internalRequest, setInternalRequest] = useState<any>(request);
    const [employeeDetails, setEmployeeDetails] = useState<any>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (open && request?.name) {
            setFetching(true);
            setInternalRequest(request);
            setEmployeeDetails(null);

            getRequest(request.name)
                .then((data) => {
                    setInternalRequest(data);
                    const empId = data.employee || data.employee_id;
                    if (empId) {
                        getEmployee(empId)
                            .then(setEmployeeDetails)
                            .catch(console.error)
                            .finally(() => setFetching(false));
                    } else {
                        setFetching(false);
                    }
                })
                .catch((err) => {
                    console.error(err);
                    setFetching(false);
                });
        }
    }, [open, request?.name, request]);

    // Real-time: refresh when this specific request changes
    useEffect(() => {
        if (!socket || !open || !internalRequest?.name) return undefined;

        const handleUpdate = (data: any) => {
            if (data?.name === internalRequest.name) {
                getRequest(internalRequest.name).then(setInternalRequest).catch(console.error);
            }
        };

        socket.on('request_updated', handleUpdate);
        return () => socket.off('request_updated', handleUpdate);
    }, [socket, open, internalRequest?.name]);

    const userRoles = user?.roles || [];
    const isHR = userRoles.some((role: string) =>
        ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
    );
    const isEmployee = user?.email === internalRequest?.owner && !isHR;

    const handleUpdateStatus = async (status: string, message?: string) => {
        if (!internalRequest?.name) return;
        setLoading(status);
        try {
            const updateData: any = { workflow_state: status };

            if (message) {
                if (clarificationType === 'HR') {
                    const fields = ['hr_query', 'hr_query_2', 'hr_query_3', 'hr_query_4', 'hr_query_5'];
                    const nextField = fields.find(f => !internalRequest[f]);
                    if (nextField) updateData[nextField] = message;
                } else {
                    const fields = ['employee_reply', 'employee_reply_2', 'employee_reply_3', 'employee_reply_4', 'employee_reply_5'];
                    const nextField = fields.find(f => !internalRequest[f]);
                    if (nextField) updateData[nextField] = message;
                }
            }

            await updateRequestStatus(internalRequest.name, status, updateData);
            if (onRefresh) onRefresh();

            // For clarify actions, don't close, just refresh local data
            if (status === 'Clarification Requested' || (isEmployee && status === 'Pending')) {
                setOpenClarification(false);
                const latestRequest = await getRequest(internalRequest.name);
                setInternalRequest(latestRequest);
            } else {
                setOpenClarification(false);
                onClose();
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setLoading(null);
        }
    };

    const renderStatus = (status: string) => (
        <Label
            variant="soft"
            color={
                (status === 'Approved' && 'success') ||
                (status === 'Rejected' && 'error') ||
                (status === 'Clarification Requested' && 'info') ||
                'warning'
            }
        >
            {status || 'Pending'}
        </Label>
    );

    const getMessages = () => {
        const msgs: { sender: string; text: string; side: 'left' | 'right' }[] = [];
        for (let i = 1; i <= 5; i++) {
            const hrField = i === 1 ? 'hr_query' : `hr_query_${i}`;
            const empField = i === 1 ? 'employee_reply' : `employee_reply_${i}`;

            if (internalRequest[hrField]) {
                msgs.push({
                    sender: 'HR',
                    text: internalRequest[hrField],
                    side: isEmployee ? 'left' : 'right'
                });
            }
            if (internalRequest[empField]) {
                msgs.push({
                    sender: internalRequest.employee_name || 'Employee',
                    text: internalRequest[empField],
                    side: isEmployee ? 'right' : 'left'
                });
            }
        }
        return msgs;
    };

    const messages = internalRequest ? getMessages() : [];

    const hrQueryCount = ['hr_query', 'hr_query_2', 'hr_query_3', 'hr_query_4', 'hr_query_5'].filter(f => internalRequest?.[f]).length;
    const employeeReplyCount = ['employee_reply', 'employee_reply_2', 'employee_reply_3', 'employee_reply_4', 'employee_reply_5'].filter(f => internalRequest?.[f]).length;

    const hrLimitReached = hrQueryCount >= 5;
    const employeeLimitReached = employeeReplyCount >= 5;

    const renderConversation = (
        <Box sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
            <SectionHeader title="Clarification History" icon="" />
            <Box
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    p: 2.5,
                    bgcolor: 'background.neutral',
                    borderRadius: 2,
                    overflowY: 'auto',
                    minHeight: 400,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
            >
                {messages.length > 0 ? (
                    messages.map((msg, idx) => {
                        const isSelf = msg.side === 'right';

                        return (
                            <Box
                                key={idx}
                                sx={{
                                    position: 'relative',
                                    maxWidth: '85%',
                                    alignSelf: isSelf ? 'flex-end' : 'flex-start',
                                    bgcolor: isSelf ? 'primary.main' : 'background.paper',
                                    color: isSelf ? 'primary.contrastText' : 'text.primary',
                                    p: 1.5,
                                    px: 2,
                                    borderRadius: 1.5,
                                    borderTopRightRadius: isSelf ? 0 : 1.5,
                                    borderTopLeftRadius: !isSelf ? 0 : 1.5,
                                    boxShadow: (theme) => theme.customShadows?.z1 || '0 1px 2px rgba(0,0,0,0.1)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        width: 0,
                                        height: 0,
                                        borderStyle: 'solid',
                                        ...(isSelf
                                            ? {
                                                right: -10,
                                                borderWidth: '0 0 12px 12px',
                                                borderColor: (theme) => `transparent transparent transparent ${theme.palette.primary.main}`,
                                            }
                                            : {
                                                left: -10,
                                                borderWidth: '0 12px 12px 0',
                                                borderColor: (theme) => `transparent ${theme.palette.background.paper} transparent transparent`,
                                            }),
                                    },
                                }}
                            >
                                {!isSelf && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'block',
                                            mb: 0.5,
                                            fontWeight: 700,
                                            color: 'primary.main',
                                            fontSize: '0.7rem',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {msg.sender}
                                    </Typography>
                                )}
                                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                    {msg.text}
                                </Typography>
                            </Box>
                        );
                    })
                ) : (
                    <Box sx={{ height: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                        <Typography variant="body2">No comments yet</Typography>
                    </Box>
                )}
                {isEmployee && employeeLimitReached && internalRequest.workflow_state === 'Clarification Requested' && (
                    <Typography variant="caption" color="error" sx={{ textAlign: 'center', mt: 1, fontWeight: 700 }}>
                        Maximum reply limit (5) reached.
                    </Typography>
                )}
                {!isEmployee && hrLimitReached && (internalRequest.workflow_state === 'Pending' || internalRequest.workflow_state === 'Clarification Requested' || !internalRequest.workflow_state) && (
                    <Typography variant="caption" color="error" sx={{ textAlign: 'center', mt: 1, fontWeight: 700 }}>
                        Maximum clarification limit (5) reached.
                    </Typography>
                )}
            </Box>
        </Box>
    );

    const hasHistory = messages.length > 0;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth={hasHistory ? 'lg' : 'md'}
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: (theme) => theme.customShadows?.z24,
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}`, }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Request Details</Typography>
                </Stack>
                <IconButton onClick={onClose} sx={{ color: 'text.disabled' }}>
                    <Iconify icon="mingcute:close-line" width={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, flexGrow: 1, overflowY: 'auto', mt: 3 }}>
                {fetching ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={40} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : internalRequest ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' },
                            gap: 3,
                        }}
                    >
                        {/* Left Column: Details */}
                        <Box sx={{ gridColumn: { lg: hasHistory ? 'span 8' : 'span 12' } }}>
                            <Stack spacing={3}>
                                {/* Header Summary Card */}
                                <Box sx={{ px: 2 }}>
                                    <Box
                                        sx={{
                                            p: 3,
                                            borderRadius: 2,
                                            bgcolor: 'background.paper',
                                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.26)}`,
                                            boxShadow: (theme) => theme.customShadows?.z4
                                        }}
                                    >
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                                            spacing={2}
                                            sx={{ position: 'relative', zIndex: 1 }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
                                                <Avatar
                                                    src={employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || internalRequest?.profile_picture || internalRequest?.image || internalRequest?.employee_image}
                                                    sx={{
                                                        width: 76,
                                                        height: 76,
                                                        borderRadius: '50%',
                                                        border: '3px solid #FFFFFF',
                                                        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
                                                        bgcolor: (theme: any) => {
                                                            const img = employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || internalRequest?.profile_picture || internalRequest?.image || internalRequest?.employee_image;
                                                            if (img) return 'transparent';
                                                            const colors = ['#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FFB7B2', '#FF9AA2'];
                                                            let hash = 0;
                                                            const name = internalRequest?.employee_name || '';
                                                            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                                                            return colors[Math.abs(hash) % colors.length];
                                                        },
                                                        color: (theme: any) => {
                                                            const img = employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || internalRequest?.profile_picture || internalRequest?.image || internalRequest?.employee_image;
                                                            return img ? 'inherit' : alpha(theme.palette.common.black, 0.6);
                                                        },
                                                        fontSize: '1.75rem',
                                                        fontWeight: 900,
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {internalRequest?.employee_name?.charAt(0) || 'U'}
                                                </Avatar>
                                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                    <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary', wordBreak: 'break-word' }}>
                                                        {internalRequest?.employee_name}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5, display: 'block' }}>
                                                        Employee ID: {internalRequest?.employee || internalRequest?.employee_id || '-'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Label
                                                color={
                                                    (internalRequest.workflow_state === 'Approved' && 'success') ||
                                                    (internalRequest.workflow_state === 'Rejected' && 'error') ||
                                                    (internalRequest.workflow_state === 'Clarification Requested' && 'info') ||
                                                    'warning'
                                                }
                                                variant="soft"
                                                sx={{
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.25,
                                                    px: 1.5,
                                                    py: 2,
                                                    borderRadius: 1,
                                                    fontSize: '0.75rem',
                                                    alignSelf: { xs: 'flex-start', sm: 'center' },
                                                    flexShrink: 0
                                                }}
                                            >
                                                {internalRequest.workflow_state || 'Pending'}
                                            </Label>
                                        </Stack>

                                        <Divider sx={{ borderStyle: 'dashed', my: 2.5 }} />

                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                        >
                                            <Stack spacing={0.5}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>
                                                    Request ID
                                                </Typography>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                                    {internalRequest.name || 'N/A'}
                                                </Typography>
                                            </Stack>

                                            <Stack spacing={0.5} alignItems="flex-end" sx={{ textAlign: 'right' }}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>
                                                    Submitted On
                                                </Typography>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                                    {internalRequest.creation ? dayjs(internalRequest.creation).format('DD/MM/YYYY, HH:mm:ss') : '-'}
                                                </Typography>
                                            </Stack>
                                        </Stack>
                                    </Box>
                                </Box>

                                {/* Subject Section */}
                                <Box sx={{ px: 2, pt: 1.5 }}>
                                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, textTransform: 'uppercase', mb: 1.5, display: 'block', ml: 1.5 }}>
                                        Subject
                                    </Typography>
                                    <Box
                                        sx={{
                                            p: 2,
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                            borderRadius: 1.5,
                                            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                            borderRight: (theme) => `3px solid ${theme.palette.info.main}`,
                                            borderLeft: (theme) => `3px solid ${theme.palette.info.main}`,
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '14.5px' }}>
                                            {internalRequest.subject || 'No subject specified'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Message Section */}
                                <Box sx={{ px: 2 }}>
                                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, textTransform: 'uppercase', mb: 1.5, display: 'block', ml: 1.5 }}>
                                        Message
                                    </Typography>
                                    <Box sx={{ p: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04), borderRadius: 1.5, border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: 'text.primary',
                                                fontWeight: 500,
                                                fontSize: '14.5px',
                                                '& p': { margin: 0, marginBottom: 1 },
                                                '& p:last-child': { marginBottom: 0 }
                                            }}
                                            dangerouslySetInnerHTML={{ __html: internalRequest.message || '-' }}
                                        />
                                    </Box>
                                </Box>
                            </Stack>
                        </Box>

                        {/* Right Column: Conversation */}
                        {hasHistory && (
                            <Box sx={{ gridColumn: { lg: 'span 4' } }}>
                                {renderConversation}
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Request Found</Typography>
                    </Box>
                )}
            </DialogContent>

            {internalRequest && (
                <>
                    <Divider />
                    <DialogActions sx={{ p: 2, justifyContent: 'flex-end', gap: 1.5 }}>
                        {/* HR Actions */}
                        {isHR && canEdit && (internalRequest.workflow_state === 'Pending' || internalRequest.workflow_state === 'Clarification Requested' || !internalRequest.workflow_state) && (
                            <>
                                <LoadingButton
                                    color="success"
                                    variant="contained"
                                    loading={loading === 'Approved'}
                                    disabled={!!loading}
                                    onClick={() => handleUpdateStatus('Approved')}
                                    sx={{ fontWeight: 800, px: 3 }}
                                >
                                    Approve
                                </LoadingButton>

                                <LoadingButton
                                    color="error"
                                    variant="contained"
                                    loading={loading === 'Rejected'}
                                    disabled={!!loading}
                                    onClick={() => handleUpdateStatus('Rejected')}
                                    sx={{ fontWeight: 800, px: 3 }}
                                >
                                    Reject
                                </LoadingButton>

                                <Button
                                    color="info"
                                    variant="contained"
                                    disabled={hrLimitReached || !!loading}
                                    onClick={() => {
                                        setClarificationType('HR');
                                        setOpenClarification(true);
                                    }}
                                    sx={{ fontWeight: 800, px: 3 }}
                                >
                                    Ask Clarification
                                </Button>
                            </>
                        )}

                        {/* Employee Actions */}
                        {isEmployee && internalRequest.workflow_state === 'Clarification Requested' && (
                            <Button
                                color="info"
                                variant="contained"
                                disabled={employeeLimitReached || !!loading}
                                onClick={() => {
                                    setClarificationType('Employee');
                                    setOpenClarification(true);
                                }}
                                sx={{ fontWeight: 800, px: 3 }}
                            >
                                Reply
                            </Button>
                        )}
                    </DialogActions>
                </>
            )}

            <ClarificationDialog
                open={openClarification}
                onClose={() => setOpenClarification(false)}
                onConfirm={(msg) => handleUpdateStatus(clarificationType === 'HR' ? 'Clarification Requested' : 'Pending', msg)}
                title={clarificationType === 'HR' ? 'Ask Clarification' : 'Reply to HR'}
                label={clarificationType === 'HR' ? 'Query' : 'Reply'}
                loading={loading === 'Clarification Requested' || loading === 'Pending'}
            />
        </Dialog>
    );
}

function SectionHeader({ title, icon, noMargin = false }: { title: string; icon: string, noMargin?: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: noMargin ? 0 : 2.5 }}>
            <Iconify icon={icon as any} width={20} sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 16 }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailItem({ label, value, icon }: { label: string; value?: string | null; icon: string }) {
    return (
        <Box sx={{ m: 3 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block', py: 1, fontSize: '13px' }}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Iconify icon={icon as any} width={16} sx={{ color: 'text.disabled' }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}
