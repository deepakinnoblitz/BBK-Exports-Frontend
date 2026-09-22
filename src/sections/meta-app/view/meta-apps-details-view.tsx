import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoMdArrowBack, IoMdCreate } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { getMetaApp } from 'src/api/meta-app';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

function DetailRow({ label, value, mono = false }: { label: string; value?: any; mono?: boolean }) {
    return (
        <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Typography
                variant="body2"
                sx={{
                    fontWeight: 600,
                    fontSize: 'inherit',
                    color: value ? 'text.primary' : 'text.disabled',
                    fontStyle: !value ? 'italic' : 'normal',
                }}
            >
                {value || '—'}
            </Typography>
        </Stack>
    );
}

// ----------------------------------------------------------------------

export function MetaAppsDetailsView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.meta_apps;
    const canEdit = hasCustomPerms && user?.permissions?.actions?.meta_apps ? !!user?.permissions?.actions?.meta_apps?.edit : true;

    const [app, setApp] = useState<any>(null);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (id) {
            setFetching(true);
            getMetaApp(id)
                .then(setApp)
                .catch((err) => console.error('Failed to fetch Meta App:', err))
                .finally(() => setFetching(false));
        }
    }, [id]);

    if (fetching) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <CircularProgress sx={{ color: '#059669' }} />
            </DashboardContent>
        );
    }

    if (!app) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Meta App not found</Typography>
                <Button onClick={() => navigate(-1)} sx={{ mt: 3 }}>Go back to list</Button>
            </DashboardContent>
        );
    }

    return (
        <DashboardContent maxWidth={false}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#1877F2',
                        }}
                    >
                        <Iconify icon={"logos:meta-icon" as any} width={28} />
                    </Box>
                    <Stack spacing={0.3}>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                            {app.app_name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>
                                {app.app_id}
                            </Typography>
                            {app.is_default ? (
                                <Chip label="Default" size="small" sx={{ bgcolor: alpha('#059669', 0.12), color: '#059669', border: `1px solid ${alpha('#059669', 0.3)}`, fontWeight: 700, fontSize: 10, borderRadius: '6px', height: 20 }} />
                            ) : null}
                        </Stack>
                    </Stack>
                </Stack>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => navigate(-1)}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5, '&:hover': { bgcolor: (t) => alpha(t.palette.text.primary, 0.04), borderColor: 'text.primary' } }}
                    >
                        Go Back
                    </Button>
                    {canEdit && (
                        <Button
                            variant="contained"
                            onClick={() => navigate(`/lead-integration/meta-apps/${encodeURIComponent(id || '')}/edit`)}
                            startIcon={<IoMdCreate size={20} />}
                            sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                        >
                            Edit
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Stack spacing={3}>
                {/* Status Banner */}
                <Box
                    sx={{
                        p: 2.5,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        flexWrap: 'wrap',
                        bgcolor: app.app_status === 'Production'
                            ? alpha('#22c55e', 0.06)
                            : alpha('#eab308', 0.06),
                        border: `1px solid ${app.app_status === 'Production' ? alpha('#22c55e', 0.2) : alpha('#eab308', 0.2)}`,
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify
                            icon={(app.app_status === 'Production' ? 'solar:shield-check-bold' : 'solar:settings-bold') as any}
                            sx={{ color: app.app_status === 'Production' ? '#22c55e' : '#eab308' }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {app.app_status || 'Development'} Mode
                        </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon={app.is_active ? 'solar:check-circle-bold' : 'solar:close-circle-bold'} sx={{ color: app.is_active ? 'success.main' : 'text.disabled' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: app.is_active ? 'success.main' : 'text.secondary' }}>
                            {app.is_active ? 'Active' : 'Inactive'}
                        </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon={(app.signature_validation ? 'solar:shield-check-bold' : 'solar:shield-cross-bold') as any} sx={{ color: app.signature_validation ? '#059669' : 'text.disabled' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: app.signature_validation ? '#059669' : 'text.secondary' }}>
                            Signature Validation {app.signature_validation ? 'Enabled' : 'Disabled'}
                        </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip label={app.graph_api_version || 'v23.0'} size="small" sx={{ bgcolor: alpha('#059669', 0.1), color: '#059669', border: `1px solid ${alpha('#059669', 0.3)}`, fontWeight: 700, fontSize: 11, borderRadius: '6px' }} />
                    </Stack>
                </Box>

                {/* Credentials Card */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                        <Iconify icon={"logos:meta-icon" as any} width={18} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                            App Credentials
                        </Typography>
                    </Stack>

                    <Box sx={{ display: 'grid', columnGap: 4, rowGap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
                        <DetailRow label="App Name" value={app.app_name} />
                        <DetailRow label="App ID" value={app.app_id} mono />
                        <DetailRow label="Business Manager ID" value={app.business_manager_id} mono />
                        <DetailRow label="App Secret" value={app.app_secret ? '••••••••••••' : undefined} />
                        <DetailRow label="Verify Token" value={app.verify_token ? '••••••••••••' : undefined} />
                        <DetailRow label="Webhook Secret" value={app.webhook_secret ? '••••••••••••' : undefined} />
                    </Box>
                </Card>

                {/* OAuth Redirect URI Card */}
                {app.oauth_redirect_uri && (
                    <Card sx={{ p: 3 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                            <Iconify icon={"solar:link-bold" as any} width={18} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                                OAuth Configuration
                            </Typography>
                        </Stack>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: (t) => alpha(t.palette.grey[500], 0.04),
                                border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.12)}`,
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                OAuth Redirect URI
                            </Typography>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                <Typography
                                    variant="body2"
                                    sx={{ fontSize: 16, wordBreak: 'break-all' }}
                                >
                                    {app.oauth_redirect_uri}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        navigator.clipboard.writeText(app.oauth_redirect_uri || '');
                                        enqueueSnackbar('OAuth Redirect URI copied to clipboard!', { variant: 'success' });
                                    }}
                                    sx={{ color: '#059669' }}
                                    title="Copy OAuth Redirect URI"
                                >
                                    <Iconify icon={"solar:copy-bold" as any} width={18} />
                                </IconButton>
                            </Stack>
                        </Box>
                    </Card>
                )}

                {/* Webhook URL Card */}
                {app.webhook_url && (
                    <Card sx={{ p: 3 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                            <Iconify icon={"solar:link-bold" as any} width={18} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                                Webhook Configuration
                            </Typography>
                        </Stack>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: (t) => alpha(t.palette.grey[500], 0.04),
                                border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.12)}`,
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                Webhook URL
                            </Typography>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                <Typography
                                    variant="body2"
                                    sx={{ fontSize: 16, wordBreak: 'break-all' }}
                                >
                                    {app.webhook_url}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        navigator.clipboard.writeText(app.webhook_url || '');
                                        enqueueSnackbar('Webhook URL copied to clipboard!', { variant: 'success' });
                                    }}
                                    sx={{ color: '#059669' }}
                                    title="Copy Webhook URL"
                                >
                                    <Iconify icon={"solar:copy-bold" as any} width={18} />
                                </IconButton>
                            </Stack>
                        </Box>
                    </Card>
                )}

                {/* Metadata */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                        <Iconify icon={"solar:info-circle-bold" as any} width={18} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                            Record Information
                        </Typography>
                    </Stack>
                    <Box sx={{ display: 'grid', columnGap: 4, rowGap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
                        <DetailRow label="Created By" value={app.owner} />
                        <DetailRow label="Created On" value={app.creation ? new Date(app.creation).toLocaleDateString() : undefined} />
                        <DetailRow label="Last Modified" value={app.modified ? new Date(app.modified).toLocaleDateString() : undefined} />
                    </Box>
                </Card>
            </Stack>
        </DashboardContent>
    );
}
