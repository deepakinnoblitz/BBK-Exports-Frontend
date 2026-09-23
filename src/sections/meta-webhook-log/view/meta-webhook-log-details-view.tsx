import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { IoMdArrowBack } from 'react-icons/io';
import { useParams, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';
import { getMetaWebhookLog } from 'src/api/meta-webhook-log';

import { Iconify } from 'src/components/iconify';

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
                    fontSize: mono ? 13 : 'inherit',
                    color: value !== undefined && value !== null && value !== '' ? 'text.primary' : 'text.disabled',
                    fontStyle: (value === undefined || value === null || value === '') ? 'italic' : 'normal',
                    fontFamily: mono ? 'monospace' : 'inherit',
                }}
            >
                {value !== undefined && value !== null && value !== '' ? String(value) : '—'}
            </Typography>
        </Stack>
    );
}

function JsonBlock({ label, value }: { label: string; value?: string }) {
    let pretty = value || '';
    try {
        if (value) pretty = JSON.stringify(JSON.parse(value), null, 2);
    } catch { /* not valid JSON, show raw */ }

    return (
        <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Box
                component="pre"
                sx={{
                    m: 0,
                    p: 2,
                    bgcolor: 'background.neutral',
                    borderRadius: 1.5,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    color: pretty ? 'text.primary' : 'text.disabled',
                    fontStyle: !pretty ? 'italic' : 'normal',
                    border: '1px solid',
                    borderColor: 'divider',
                    maxHeight: 320,
                    overflowY: 'auto',
                }}
            >
                {pretty || '— empty —'}
            </Box>
        </Stack>
    );
}

const STATUS_COLORS: Record<string, { bg: string; border: string; color: string }> = {
    Verified:   { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.35)',  color: '#15803d' },
    Failed:     { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)',  color: '#b91c1c' },
    Unverified: { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.35)', color: '#374151' },
};

// ----------------------------------------------------------------------

export function MetaWebhookLogDetailsView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [log, setLog] = useState<any>(null);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (id) {
            setFetching(true);
            getMetaWebhookLog(decodeURIComponent(id))
                .then(setLog)
                .catch(() => enqueueSnackbar('Failed to load Webhook Log details.', { variant: 'error' }))
                .finally(() => setFetching(false));
        }
    }, [id, enqueueSnackbar]);

    if (fetching) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <CircularProgress sx={{ color: '#059669' }} />
            </DashboardContent>
        );
    }

    if (!log) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Webhook Log not found</Typography>
                <Button onClick={() => navigate('/lead-integration/webhook-logs')} sx={{ mt: 3 }}>Go back to list</Button>
            </DashboardContent>
        );
    }

    const sc = STATUS_COLORS[log.status] || STATUS_COLORS.Unverified;

    return (
        <DashboardContent maxWidth={false}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2' }}>
                        <Iconify icon={"logos:meta-icon" as any} width={28} />
                    </Box>
                    <Stack spacing={0.3}>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>{log.name}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>
                                CRM Meta Webhook Log
                            </Typography>
                            <Divider orientation="vertical" flexItem sx={{ height: 14, alignSelf: 'center', mx: 1.5 }} />
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', borderRadius: '6px', px: 1.5, py: 0.5, bgcolor: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                                {log.status}
                            </Box>
                        </Stack>
                    </Stack>
                </Stack>
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => navigate('/lead-integration/webhook-logs')}
                    startIcon={<IoMdArrowBack size={20} />}
                    sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5 }}
                >
                    Back to List
                </Button>
            </Stack>

            <Stack spacing={3}>
                {/* Summary */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={3} sx={{ color: 'text.secondary' }}>
                        <Iconify icon={"solar:settings-bold" as any} width={18} sx={{ color: '#059669' }} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>Summary</Typography>
                    </Stack>
                    <Box sx={{ display: 'grid', columnGap: 4, rowGap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
                        <DetailRow label="Log ID" value={log.name} />
                        <DetailRow label="HTTP Status" value={log.http_status} />
                        <DetailRow label="Execution Time" value={log.execution_time != null ? `${log.execution_time}s` : undefined} />
                        <DetailRow label="Retry Count" value={log.retry_count ?? 0} />
                        <DetailRow label="Status" value={log.status} />
                        <DetailRow label="Created" value={log.creation ? new Date(log.creation).toLocaleString() : undefined} />
                    </Box>
                </Card>

                {/* Payload & Headers */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={3} sx={{ color: 'text.secondary' }}>
                        <Iconify icon={"solar:letter-bold" as any} width={18} sx={{ color: '#059669' }} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>Request Details</Typography>
                    </Stack>
                    <Stack spacing={3}>
                        <JsonBlock label="Headers" value={log.headers} />
                        <JsonBlock label="Payload" value={log.payload} />
                    </Stack>
                </Card>

                {/* Response */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={3} sx={{ color: 'text.secondary' }}>
                        <Iconify icon={"solar:chat-round-dots-bold" as any} width={18} sx={{ color: '#059669' }} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>Response</Typography>
                    </Stack>
                    <JsonBlock label="Response Body" value={log.response} />
                </Card>
            </Stack>
        </DashboardContent>
    );
}
