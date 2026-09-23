import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoMdArrowBack, IoMdCreate } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { getMetaForm } from 'src/api/meta-form';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchMetaPages, getMetaPage } from 'src/api/meta-page';

import { Label } from 'src/components/label';
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

export function MetaFormsDetailsView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.meta_forms;
    const canEdit = hasCustomPerms && user?.permissions?.actions?.meta_forms ? !!user?.permissions?.actions?.meta_forms?.edit : true;

    const [form, setForm] = useState<any>(null);
    const [pageName, setPageName] = useState<string>('');
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (id) {
            setFetching(true);
            getMetaForm(id)
                .then(async (formData) => {
                    setForm(formData);
                    let resolvedPage = formData.meta_page || '';
                    if (formData.meta_page) {
                        try {
                            const pagesRes = await fetchMetaPages({ page: 1, page_size: 1000 });
                            const match = pagesRes.data.find(
                                (p: any) => p.name === formData.meta_page || p.page_id === formData.meta_page || p.page_name === formData.meta_page
                            );
                            if (match?.page_name) {
                                resolvedPage = match.page_name;
                            } else {
                                const pageDoc = await getMetaPage(formData.meta_page);
                                if (pageDoc?.page_name) resolvedPage = pageDoc.page_name;
                            }
                        } catch (err) {
                            console.error('Failed to resolve Meta Page name:', err);
                        }
                    }
                    setPageName(resolvedPage);
                })
                .catch((err) => {
                    console.error('Failed to fetch Meta Form details:', err);
                    enqueueSnackbar('Failed to load Meta Form details.', { variant: 'error' });
                })
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

    if (!form) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Meta Form not found</Typography>
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
                            {form.form_name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>
                                Form ID: {form.form_id}
                            </Typography>
                            <Divider orientation="vertical" flexItem sx={{ height: 14, alignSelf: 'center', mx: 1.5 }} />
                            <Iconify
                                icon={(form.is_active ? "eva:checkmark-circle-2-fill" : "eva:close-circle-fill") as any}
                                sx={{ color: form.is_active ? 'success.main' : 'text.disabled' }}
                                width={16}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: form.is_active ? 'success.main' : 'text.disabled', fontSize: 13 }}>
                                {form.is_active ? 'Active' : 'Inactive'}
                            </Typography>
                            <Divider orientation="vertical" flexItem sx={{ height: 14, alignSelf: 'center', mx: 1.5 }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 13 }}>
                                Duplicates: {form.allow_duplicates ? 'Enabled' : 'Disabled'}
                            </Typography>
                        </Stack>
                    </Stack>
                </Stack>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => navigate('/lead-integration/meta-forms')}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5 }}
                    >
                        Back to List
                    </Button>
                    {canEdit && (
                        <Button
                            variant="contained"
                            onClick={() => navigate(`/lead-integration/meta-forms/${form.name}/edit`)}
                            startIcon={<IoMdCreate size={20} />}
                            sx={{
                                borderRadius: 1.5,
                                bgcolor: '#059669',
                                color: 'common.white',
                                fontWeight: 600,
                                textTransform: 'none',
                                px: 2.5,
                                '&:hover': { bgcolor: '#047857' }
                            }}
                        >
                            Edit Form
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Stack spacing={3}>
                {/* Credentials & Configuration Status */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                            <Iconify icon={"solar:settings-bold" as any} width={18} sx={{ color: '#059669' }} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                                Form settings
                            </Typography>
                        </Stack>
                    </Stack>

                    <Box sx={{ display: 'grid', columnGap: 4, rowGap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
                        <DetailRow label="Form Name" value={form.form_name} />
                        <DetailRow label="Form ID" value={form.form_id} mono />
                        <DetailRow label="Meta Page" value={pageName || form.meta_page} />
                        <DetailRow label="Form Status" value={form.form_status} />
                        <DetailRow label="Locale" value={form.locale} />
                        <DetailRow label="Duplicate limits filter" value={form.allow_duplicates ? form.duplicate_limit_by : 'No limits filter'} />
                    </Box>
                </Card>

                {/* Tracking Details */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                        <Iconify icon={"solar:info-circle-bold" as any} width={18} sx={{ color: '#059669' }} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                            Campaign & Ad Info
                        </Typography>
                    </Stack>
                    <Box sx={{ display: 'grid', columnGap: 4, rowGap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
                        <DetailRow label="Campaign ID" value={form.campaign_id} mono />
                        <DetailRow label="Campaign Name" value={form.campaign_name} />
                        <DetailRow label="Ad Set ID" value={form.ad_set_id} mono />
                        <DetailRow label="Ad Set Name" value={form.ad_set_name} />
                        <DetailRow label="Ad ID" value={form.ad_id} mono />
                        <DetailRow label="Ad Name" value={form.ad_name} />
                    </Box>
                </Card>

                {/* Field Mappings Grid */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                        <Iconify icon={"solar:link-bold" as any} width={18} sx={{ color: '#059669' }} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                            Field Mappings List
                        </Typography>
                    </Stack>

                    <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1.5 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'background.neutral' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Meta Field (Facebook Key)</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>CRM Field (Target Lead column)</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Required</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Default Value</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Transform Function</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {!form.field_mappings || form.field_mappings.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.disabled' }}>
                                            No fields mapped. Click &quot;Edit Form&quot; to map fields.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    form.field_mappings.map((row: any, idx: number) => (
                                        <TableRow key={idx} sx={{ '&:not(:last-child) td': { borderBottom: (theme) => `1px solid ${theme.palette.divider}` } }}>
                                            <TableCell>
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{
                                                        color: row.meta_field ? 'text.primary' : 'text.disabled',
                                                        fontStyle: !row.meta_field ? 'italic' : 'normal',
                                                    }}
                                                >
                                                    {row.meta_field || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {row.crm_field}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Label
                                                    variant="soft"
                                                    color={row.required ? 'info' : 'default'}
                                                >
                                                    {row.required ? 'Yes' : 'No'}
                                                </Label>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ color: row.default_value ? 'text.primary' : 'text.disabled', fontStyle: row.default_value ? 'normal' : 'italic' }}>
                                                    {row.default_value || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Label
                                                    variant="soft"
                                                    color={row.transform_function && row.transform_function !== 'None' ? 'info' : 'default'}
                                                >
                                                    {row.transform_function || 'None'}
                                                </Label>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>

                {/* Metadata */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                        <Iconify icon={"solar:info-circle-bold" as any} width={18} sx={{ color: '#059669' }} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                            Record Information
                        </Typography>
                    </Stack>
                    <Box sx={{ display: 'grid', columnGap: 4, rowGap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
                        <DetailRow label="Created By" value={form.owner} />
                        <DetailRow label="Created On" value={form.creation ? new Date(form.creation).toLocaleDateString() : undefined} />
                        <DetailRow label="Last Modified" value={form.modified ? new Date(form.modified).toLocaleDateString() : undefined} />
                    </Box>
                </Card>
            </Stack>
        </DashboardContent>
    );
}
