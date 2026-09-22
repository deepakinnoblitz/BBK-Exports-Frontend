import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { IoMdArrowBack } from 'react-icons/io';
import { useParams, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { getMetaQueueItem } from 'src/api/meta-queue';
import { DashboardContent } from 'src/layouts/dashboard';

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
                    fontFamily: mono ? 'monospace' : 'inherit',
                    color: value !== undefined && value !== null && value !== '' ? 'text.primary' : 'text.disabled',
                    fontStyle: (value === undefined || value === null || value === '') ? 'italic' : 'normal',
                    wordBreak: 'break-all',
                }}
            >
                {value !== undefined && value !== null && value !== '' ? String(value) : '—'}
            </Typography>
        </Stack>
    );
}

function ErrorBlock({ value }: { value?: string }) {
    if (!value) {
        return (
            <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>— no errors —</Typography>
            </Box>
        );
    }

    // Try parsing Facebook Graph API errors from string response
    let parsedContent = value;
    let isFormattedJson = false;

    // Check if the value contains a JSON string like: Facebook Graph API responded with status 400: {"error":...}
    const jsonMatch = value.match(/Facebook Graph API responded with status \d+: (\{.*\})/);
    if (jsonMatch && jsonMatch[1]) {
        try {
            const parsedJson = JSON.parse(jsonMatch[1]);
            parsedContent = `Facebook Graph API Error:\n` + JSON.stringify(parsedJson, null, 2);
            isFormattedJson = true;
        } catch (e) {
            // Fail silently and use original string
        }
    } else {
        // Try parsing the whole value as JSON if possible
        try {
            const parsedJson = JSON.parse(value);
            parsedContent = JSON.stringify(parsedJson, null, 2);
            isFormattedJson = true;
        } catch (e) {
            // Keep original string
        }
    }

    return (
        <Box
            component="pre"
            sx={{
                m: 0, p: 2,
                bgcolor: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 1.5,
                fontSize: 12,
                fontFamily: 'monospace',
                color: '#b91c1c',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: 320,
                overflowY: 'auto',
            }}
        >
            {parsedContent}
        </Box>
    );
}

const STATUS_COLORS: Record<string, { bg: string; border: string; color: string }> = {
    Completed:  { bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.35)',   color: '#15803d' },
    Failed:     { bg: 'rgba(239,68,68,0.15)',    border: 'rgba(239,68,68,0.35)',   color: '#b91c1c' },
    Processing: { bg: 'rgba(59,130,246,0.15)',   border: 'rgba(59,130,246,0.35)', color: '#1d4ed8' },
    Queued:     { bg: 'rgba(156,163,175,0.15)',  border: 'rgba(156,163,175,0.35)', color: '#374151' },
};

function formatDatetime(val?: string) {
    if (!val) return undefined;
    return new Date(val).toLocaleString();
}

// ----------------------------------------------------------------------

export function MetaQueueDetailsView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [item, setItem] = useState<any>(null);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (id) {
            setFetching(true);
            getMetaQueueItem(decodeURIComponent(id))
                .then(setItem)
                .catch(() => enqueueSnackbar('Failed to load Meta Queue details.', { variant: 'error' }))
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

    if (!item) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Queue item not found</Typography>
                <Button onClick={() => navigate('/lead-integration/meta-queue')} sx={{ mt: 3 }}>Go back to list</Button>
            </DashboardContent>
        );
    }

    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.Queued;

    return (
        <DashboardContent maxWidth={false}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2' }}>
                        <Iconify icon={"logos:meta-icon" as any} width={28} />
                    </Box>
                    <Stack spacing={0.3}>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>{item.meta_lead}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>
                                {item.name}
                            </Typography>
                            <Divider orientation="vertical" flexItem sx={{ height: 14, alignSelf: 'center', mx: 1.5 }} />
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', borderRadius: '6px', px: 1.5, py: 0.5, bgcolor: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                                {item.status}
                            </Box>
                        </Stack>
                    </Stack>
                </Stack>
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => navigate('/lead-integration/meta-queue')}
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
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>Job Summary</Typography>
                    </Stack>
                    <Box sx={{ display: 'grid', columnGap: 4, rowGap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
                        <DetailRow label="Queue ID" value={item.name} />
                        <DetailRow label="Meta Lead" value={item.meta_lead} />
                        <DetailRow label="Job ID" value={item.job_id} />
                        <DetailRow label="Attempts" value={item.attempts ?? 0} />
                        <DetailRow label="Started" value={formatDatetime(item.started)} />
                        <DetailRow label="Completed" value={formatDatetime(item.completed)} />
                        <DetailRow label="Created" value={formatDatetime(item.creation)} />
                        <DetailRow label="Status" value={item.status} />
                    </Box>
                </Card>

                {/* Error Log */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={3} sx={{ color: 'text.secondary' }}>
                        <Iconify icon={"solar:danger-triangle-bold" as any} width={18} sx={{ color: item.last_error ? 'error.main' : '#059669' }} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>Last Error</Typography>
                    </Stack>
                    <ErrorBlock value={item.last_error} />
                </Card>
            </Stack>
        </DashboardContent>
    );
}
