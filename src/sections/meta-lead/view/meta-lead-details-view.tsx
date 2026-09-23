import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { IoMdArrowBack } from 'react-icons/io';
import { useParams, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchMetaApps, getMetaApp } from 'src/api/meta-app';
import { fetchMetaPages, getMetaPage } from 'src/api/meta-page';
import { fetchMetaForms, getMetaForm } from 'src/api/meta-form';
import { getMetaLeadItem, retryMetaLead } from 'src/api/meta-lead';

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
                    wordBreak: 'break-all',
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

function KeyValueTable({ title, jsonString, isLeadJson = false }: { title: string; jsonString?: string; isLeadJson?: boolean }) {
    const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');

    if (!jsonString) {
        return (
            <Card sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 2 }}>
                    <Iconify icon={"solar:code-bold" as any} width={18} sx={{ color: '#059669' }} />
                    <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>{title}</Typography>
                </Stack>
                <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>— empty payload —</Typography>
                </Box>
            </Card>
        );
    }

    // Helper function to format keys into readable labels
    const formatKeyLabel = (keyStr: string): string => {
        // Strip entry and change path prefixes like "entry[0].changes[0].value." or "entry[0]."
        let cleanKey = keyStr
            .replace(/^entry\[\d+\]\.changes\[\d+\]\.value\./g, '')
            .replace(/^entry\[\d+\]\.changes\[\d+\]\./g, '')
            .replace(/^entry\[\d+\]\./g, '');

        // Convert snake_case or dot notation suffix to human readable Title Case
        cleanKey = cleanKey.split(/[._]/).map(word => {
            if (!word) return '';
            if (word.toLowerCase() === 'id') return 'ID';
            if (word.toLowerCase() === 'leadgen') return 'Leadgen';
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ').trim();

        return cleanKey || keyStr;
    };

    let rows: { key: string; value: string }[] = [];
    let prettyJson = jsonString;
    try {
        let cleanJsonString = jsonString.trim();
        let prefixMessage = '';

        // Check if string format matches: prefix message followed by a JSON block
        const jsonMatch = cleanJsonString.match(/^(.*?):\s*(\{[\s\S]*\}|\[[\s\S]*\])$/);
        if (jsonMatch) {
            prefixMessage = jsonMatch[1].trim();
            cleanJsonString = jsonMatch[2].trim();
        }

        const parsed = JSON.parse(cleanJsonString);
        prettyJson = JSON.stringify(parsed, null, 2);
        if (prefixMessage) {
            prettyJson = `${prefixMessage}:\n${prettyJson}`;
        }

        // General flat key-value payload list extraction helper
        const extract = (obj: any, prefix = ''): { key: string; value: string }[] => {
            let res: { key: string; value: string }[] = [];
            if (obj === null || obj === undefined) return res;

            if (Array.isArray(obj)) {
                // If it is an array, check if it contains objects or primitives
                obj.forEach((item, index) => {
                    const arrayPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
                    if (typeof item === 'object' && item !== null) {
                        res = res.concat(extract(item, arrayPrefix));
                    } else {
                        res.push({
                            key: formatKeyLabel(arrayPrefix),
                            value: String(item ?? '—')
                        });
                    }
                });
            } else if (typeof obj === 'object') {
                Object.keys(obj).forEach(k => {
                    const keyName = prefix ? `${prefix}.${k}` : k;
                    if (typeof obj[k] === 'object' && obj[k] !== null) {
                        res = res.concat(extract(obj[k], keyName));
                    } else {
                        res.push({
                            key: formatKeyLabel(keyName),
                            value: String(obj[k] ?? '—')
                        });
                    }
                });
            } else {
                res.push({
                    key: formatKeyLabel(prefix) || 'Content',
                    value: String(obj)
                });
            }
            return res;
        };

        if (prefixMessage) {
            rows.push({ key: 'Response Message', value: prefixMessage });
        }

        if (isLeadJson && parsed.field_data && Array.isArray(parsed.field_data)) {
            // Facebook specific payload field mapping extraction
            rows = rows.concat(parsed.field_data.map((item: any) => ({
                key: formatKeyLabel(item.name || '—'),
                value: Array.isArray(item.values) ? item.values.join(', ') : String(item.values || '—')
            })));

            // Append other root meta parameters
            Object.keys(parsed).forEach(k => {
                if (k !== 'field_data') {
                    rows.push({
                        key: formatKeyLabel(k),
                        value: typeof parsed[k] === 'object' ? JSON.stringify(parsed[k]) : String(parsed[k] ?? '—')
                    });
                }
            });
        } else {
            rows = rows.concat(extract(parsed));
        }
    } catch {
        rows = [{ key: formatKeyLabel('Error Message'), value: jsonString }];
    }


    return (
        <Card sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                    <Iconify icon={"solar:code-bold" as any} width={18} sx={{ color: '#059669' }} />
                    <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2, fontWeight: 700 }}>
                        {title}
                    </Typography>
                </Stack>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(e, val) => val && setViewMode(val)}
                    size="small"
                    sx={{
                        bgcolor: 'background.neutral',
                        p: 0.3,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        '& .MuiToggleButtonGroup-grouped': {
                            border: 0,
                            borderRadius: '20px !important',
                            mx: 0.5,
                        }
                    }}
                >
                    <ToggleButton
                        value="table"
                        sx={{
                            py: 0.5,
                            px: 2,
                            textTransform: 'none',
                            fontWeight: 700,
                            color: 'text.secondary',
                            '&.Mui-selected': {
                                bgcolor: '#00a5d1',
                                color: 'common.white',
                                '&:hover': {
                                    bgcolor: '#0083a7',
                                }
                            }
                        }}
                    >
                        Table View
                    </ToggleButton>
                    <ToggleButton
                        value="raw"
                        sx={{
                            py: 0.5,
                            px: 2,
                            textTransform: 'none',
                            fontWeight: 700,
                            color: 'text.secondary',
                            '&.Mui-selected': {
                                bgcolor: '#00a5d1',
                                color: 'common.white',
                                '&:hover': {
                                    bgcolor: '#0083a7',
                                }
                            }
                        }}
                    >
                        Raw View
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            {viewMode === 'table' ? (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                    <Table size="small">
                        <TableBody>
                            {rows.map((row, idx) => (
                                <TableRow key={idx} hover>
                                    <TableCell sx={{ fontWeight: 600, width: '30%', bgcolor: 'background.neutral', borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}>
                                        {row.key}
                                    </TableCell>
                                    <TableCell sx={{ wordBreak: 'break-all', py: 1.5, color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' }}>
                                        {row.value}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            ) : (
                <Box
                    component="pre"
                    sx={{
                        m: 0,
                        p: 2,
                        bgcolor: 'background.neutral',
                        borderRadius: 1.5,
                        fontSize: 12,
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        color: 'text.primary',
                        border: '1px solid',
                        borderColor: 'divider',
                        maxHeight: 350,
                        overflowY: 'auto',
                    }}
                >
                    {prettyJson}
                </Box>
            )}
        </Card>
    );
}

const STATUS_COLORS: Record<string, { bg: string; border: string; color: string }> = {
    Success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.35)', color: '#15803d' },
    Completed: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.35)', color: '#15803d' },
    Failed: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)', color: '#b91c1c' },
    Processing: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', color: '#1d4ed8' },
    Pending: { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.35)', color: '#374151' },
};


function formatDatetime(val?: string) {
    if (!val) return undefined;
    return new Date(val).toLocaleString();
}

// ----------------------------------------------------------------------

export function MetaLeadDetailsView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [item, setItem] = useState<any>(null);
    const [fetching, setFetching] = useState(true);
    const [retrying, setRetrying] = useState(false);
    const [appName, setAppName] = useState<string>('');
    const [pageName, setPageName] = useState<string>('');
    const [formName, setFormName] = useState<string>('');
    const [reloadTrigger, setReloadTrigger] = useState(0);

    useEffect(() => {
        if (id) {
            setFetching(true);
            getMetaLeadItem(decodeURIComponent(id))
                .then(async (leadData) => {
                    setItem(leadData);

                    const [appsRes, pagesRes, formsRes] = await Promise.allSettled([
                        fetchMetaApps({ page: 1, page_size: 1000 }),
                        fetchMetaPages({ page: 1, page_size: 1000 }),
                        fetchMetaForms({ page: 1, page_size: 1000 }),
                    ]);

                    const apps = appsRes.status === 'fulfilled' ? appsRes.value.data : [];
                    const pages = pagesRes.status === 'fulfilled' ? pagesRes.value.data : [];
                    const forms = formsRes.status === 'fulfilled' ? formsRes.value.data : [];

                    // Resolve App Name
                    let resolvedApp = leadData.meta_app || '';
                    if (leadData.meta_app) {
                        const match = apps.find((a: any) => a.name === leadData.meta_app || a.app_id === leadData.meta_app || a.app_name === leadData.meta_app);
                        if (match?.app_name) {
                            resolvedApp = match.app_name;
                        } else {
                            try {
                                const appDoc = await getMetaApp(leadData.meta_app);
                                if (appDoc?.app_name) resolvedApp = appDoc.app_name;
                            } catch { /* fallback to raw id */ }
                        }
                    }
                    setAppName(resolvedApp);

                    // Resolve Page Name
                    let resolvedPage = leadData.meta_page || '';
                    if (leadData.meta_page) {
                        const match = pages.find((p: any) => p.name === leadData.meta_page || p.page_id === leadData.meta_page || p.page_name === leadData.meta_page);
                        if (match?.page_name) {
                            resolvedPage = match.page_name;
                        } else {
                            try {
                                const pageDoc = await getMetaPage(leadData.meta_page);
                                if (pageDoc?.page_name) resolvedPage = pageDoc.page_name;
                            } catch { /* fallback to raw id */ }
                        }
                    }
                    setPageName(resolvedPage);

                    // Resolve Form Name
                    let resolvedForm = leadData.meta_form || '';
                    if (leadData.meta_form) {
                        const match = forms.find((f: any) => f.name === leadData.meta_form || f.form_id === leadData.meta_form || f.form_name === leadData.meta_form);
                        if (match?.form_name) {
                            resolvedForm = match.form_name;
                        } else {
                            try {
                                const formDoc = await getMetaForm(leadData.meta_form);
                                if (formDoc?.form_name) resolvedForm = formDoc.form_name;
                            } catch { /* fallback to raw id */ }
                        }
                    }
                    setFormName(resolvedForm);
                })
                .catch(() => enqueueSnackbar('Failed to load Meta Lead details.', { variant: 'error' }))
                .finally(() => setFetching(false));
        }
    }, [id, reloadTrigger, enqueueSnackbar]);

    const handleRetry = async () => {
        if (!item?.name) return;
        setRetrying(true);
        try {
            await retryMetaLead(item.name);
            enqueueSnackbar('Meta Lead processing retried successfully', { variant: 'success' });
            setReloadTrigger((prev) => prev + 1);
        } catch (err: any) {
            enqueueSnackbar(err.message || 'Failed to retry Meta Lead', { variant: 'error' });
        } finally {
            setRetrying(false);
        }
    };

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
                <Typography variant="h4">Lead record not found</Typography>
                <Button onClick={() => navigate('/lead-integration/meta-leads')} sx={{ mt: 3 }}>Go back to list</Button>
            </DashboardContent>
        );
    }

    const sc = STATUS_COLORS[item.processing_status] || STATUS_COLORS.Pending;

    return (
        <DashboardContent maxWidth={false}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2' }}>
                        <Iconify icon={"logos:meta-icon" as any} width={28} />
                    </Box>
                    <Stack spacing={0.3}>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>{item.meta_lead_id}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>
                                CRM Meta Lead details
                            </Typography>
                            <Divider orientation="vertical" flexItem sx={{ height: 14, alignSelf: 'center', mx: 1.5 }} />
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', borderRadius: '6px', px: 1.5, py: 0.5, bgcolor: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                                {item.processing_status}
                            </Box>
                        </Stack>
                    </Stack>
                </Stack>
                <Stack direction="row" spacing={1.5}>
                    {item.processing_status === 'Failed' && (
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={retrying}
                            onClick={handleRetry}
                            startIcon={retrying ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:refresh-bold" />}
                            sx={{ borderRadius: 1.5, fontWeight: 700, textTransform: 'none', px: 2.5 }}
                        >
                            {retrying ? 'Retrying...' : 'Retry Processing'}
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => navigate('/lead-integration/meta-leads')}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5 }}
                    >
                        Back to List
                    </Button>
                </Stack>
            </Stack>

            <Stack spacing={3}>
                {/* Integration Details */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={3} sx={{ color: 'text.secondary' }}>
                        <Iconify icon={"solar:settings-bold" as any} width={18} sx={{ color: '#059669' }} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>Integration Details</Typography>
                    </Stack>
                    <Box sx={{ display: 'grid', columnGap: 4, rowGap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
                        <DetailRow label="Meta Lead ID" value={item.meta_lead_id} />
                        <DetailRow label="Meta App" value={appName || item.meta_app} />
                        <DetailRow label="Meta Page" value={pageName || item.meta_page} />
                        <DetailRow label="Meta Form" value={formName || item.meta_form} />
                        <DetailRow label="Campaign Name" value={item.campaign_name} />
                        <DetailRow label="Ad Set Name" value={item.ad_set_name} />
                        <DetailRow label="Ad Name" value={item.ad_name} />
                    </Box>
                </Card>

                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={3} sx={{ color: 'text.secondary' }}>
                        <Iconify icon={"solar:info-circle-bold" as any} width={18} sx={{ color: '#059669' }} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>Information Details</Typography>
                    </Stack>
                    <Box sx={{ display: 'grid', columnGap: 4, rowGap: 3, mt: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
                        <DetailRow label="Received Time" value={formatDatetime(item.received_time)} />
                        <DetailRow label="Processed Time" value={formatDatetime(item.processed_time)} />
                        <DetailRow label="Created Lead" value={item.created_lead} />
                        <DetailRow label="Retry Count" value={item.retry_count ?? 0} />
                    </Box>
                </Card>

                {/* KeyValue Tables for Webhook Payload & Lead JSON */}
                <KeyValueTable title="Webhook Raw Payload" jsonString={item.webhook_payload} />
                <KeyValueTable title="Meta Lead details JSON" jsonString={item.lead_json} isLeadJson />

                {/* Error Log */}
                {item.processing_status === 'Failed' && (
                    <KeyValueTable title="Error Log" jsonString={item.error_message} />
                )}
            </Stack>
        </DashboardContent>
    );
}
