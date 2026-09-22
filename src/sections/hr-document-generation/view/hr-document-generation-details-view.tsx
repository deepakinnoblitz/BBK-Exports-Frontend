import { useState, useEffect, useCallback } from 'react';
import { IoMdArrowBack, IoMdSettings, IoMdMail, IoMdDocument, IoMdCreate, IoMdPrint } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Backdrop from '@mui/material/Backdrop';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';
import { handleDirectPrint } from 'src/utils/print';

import { DashboardContent } from 'src/layouts/dashboard';
import { getHRDocumentGeneration, getHRDocumentGenerationPrintUrl, HRDocumentGeneration } from 'src/api/hr-document-generation';

import { Iconify } from 'src/components/iconify';

type Props = {
    id: string;
};

const getStatusStyle = (status?: string) => {
    switch (status) {
        case 'Generated':
            return {
                bgcolor: 'rgba(34, 197, 94, 0.25)',
                border: '1px solid rgba(34, 197, 94, 0.45)',
                color: '#15803d',
            };
        case 'Printed':
            return {
                bgcolor: 'rgba(59, 130, 246, 0.25)',
                border: '1px solid rgba(59, 130, 246, 0.45)',
                color: '#1d4ed8',
            };
        case 'Cancelled':
            return {
                bgcolor: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                color: '#b91c1c',
            };
        case 'Draft':
        default:
            return {
                bgcolor: 'rgba(156, 163, 175, 0.25)',
                border: '1px solid rgba(156, 163, 175, 0.45)',
                color: '#374151',
            };
    }
};

export function HRDocumentGenerationDetailsView({ id }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [printing, setPrinting] = useState(false);
    const [doc, setDoc] = useState<HRDocumentGeneration | null>(null);

    const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');

    const loadDetails = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getHRDocumentGeneration(id);
            setDoc(res);
        } catch (err) {
            console.error('Failed to load HR document generation details:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            loadDetails();
        }
    }, [id, loadDetails]);

    const handlePrint = () => {
        if (!id) return;
        handleDirectPrint(
            getHRDocumentGenerationPrintUrl(id),
            () => setPrinting(true),
            () => setPrinting(false)
        );
    };

    if (loading) {
        return (
            <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 15 }}>
                    <CircularProgress sx={{ color: '#059669' }} />
                </Box>
            </DashboardContent>
        );
    }

    if (!doc) {
        return (
            <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
                <Typography variant="h6">Document Generation record not found</Typography>
                <Button onClick={() => router.back()} sx={{ mt: 3 }}>
                    Go Back
                </Button>
            </DashboardContent>
        );
    }

    const titleText = doc.employee_name
        ? `${doc.employee_name} - ${doc.document_template}`
        : doc.name;

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    Document: {titleText}
                </Typography>
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
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            },
                        }}
                    >
                        Go Back
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handlePrint}
                        startIcon={<IoMdPrint size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            bgcolor: '#16a34a',
                            color: 'common.white',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: '#15803d',
                            },
                        }}
                    >
                        Print
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => router.push(`/hr-document-generation/${encodeURIComponent(doc.name)}/edit`)}
                        startIcon={<IoMdCreate size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            bgcolor: '#059669',
                            color: 'common.white',
                            px: 3,
                            '&:hover': {
                                bgcolor: '#047857',
                            },
                        }}
                    >
                        Edit
                    </Button>
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
                            <IoMdSettings size={18} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2, color: 'text.secondary', fontWeight: 700 }}>
                                Basic Information
                            </Typography>
                        </Stack>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.06),
                                border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.18)}`,
                            }}
                        >
                            <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 14, fontWeight: 500 }}>
                                        Employee
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>
                                        {doc.employee_name ? `${doc.employee_name} (${doc.employee})` : doc.employee}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 14, fontWeight: 500 }}>
                                        Document Template
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>
                                        {doc.document_template || '-'}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 14, fontWeight: 500 }}>
                                        Status
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'inline-flex',
                                            fontWeight: 700,
                                            fontSize: 11,
                                            textTransform: 'uppercase',
                                            borderRadius: '6px',
                                            padding: '4px 12px',
                                            ...getStatusStyle(doc.status),
                                        }}
                                    >
                                        {doc.status ? doc.status.toUpperCase() : 'DRAFT'}
                                    </Box>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>

                    {/* Generation Settings */}
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                            <IoMdMail size={18} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2, color: 'text.secondary', fontWeight: 700 }}>
                                Generation Settings
                            </Typography>
                        </Stack>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.06),
                                border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.18)}`,
                            }}
                        >
                            <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 14, fontWeight: 500 }}>
                                        Document Type
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>
                                        {doc.document_type || '-'}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 14, fontWeight: 500 }}>
                                        Generated On
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>
                                        {(doc.generated_on || doc.creation) ? fDateTime(doc.generated_on || doc.creation, 'DD-MM-YYYY hh:mm:ss A') : '-'}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 14, fontWeight: 500 }}>
                                        Generated By
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>
                                        {doc.generated_by || doc.owner || '-'}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>

                    {/* Content Section */}
                    <Box sx={{ gridColumn: { md: 'span 2' } }}>
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                    <IoMdDocument size={18} />
                                    <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2, color: 'text.secondary', fontWeight: 700 }}>
                                        Content
                                    </Typography>
                                </Stack>
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                        p: 0.5,
                                        borderRadius: '24px',
                                        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                    }}
                                >
                                    <Button
                                        onClick={() => setViewMode('rendered')}
                                        startIcon={<Iconify icon="solar:eye-bold" width={16} />}
                                        sx={{
                                            borderRadius: '20px',
                                            px: 2.5,
                                            py: 0.6,
                                            fontSize: '0.825rem',
                                            fontWeight: viewMode === 'rendered' ? 700 : 600,
                                            color: viewMode === 'rendered' ? '#fff' : 'text.secondary',
                                            bgcolor: viewMode === 'rendered' ? '#059669' : 'transparent',
                                            boxShadow: viewMode === 'rendered' ? `0 2px 8px ${alpha('#059669', 0.3)}` : 'none',
                                            textTransform: 'capitalize',
                                            transition: 'all 0.2s ease-in-out',
                                            '&:hover': {
                                                bgcolor: viewMode === 'rendered' ? '#059669' : (theme) => alpha(theme.palette.grey[500], 0.12),
                                            },
                                        }}
                                    >
                                        Rendered View
                                    </Button>
                                    <Button
                                        onClick={() => setViewMode('raw')}
                                        startIcon={<Iconify icon="solar:document-text-bold" width={16} />}
                                        sx={{
                                            borderRadius: '20px',
                                            px: 2.5,
                                            py: 0.6,
                                            fontSize: '0.825rem',
                                            fontWeight: viewMode === 'raw' ? 700 : 600,
                                            color: viewMode === 'raw' ? '#fff' : 'text.secondary',
                                            bgcolor: viewMode === 'raw' ? '#059669' : 'transparent',
                                            boxShadow: viewMode === 'raw' ? `0 2px 8px ${alpha('#059669', 0.3)}` : 'none',
                                            textTransform: 'capitalize',
                                            transition: 'all 0.2s ease-in-out',
                                            '&:hover': {
                                                bgcolor: viewMode === 'raw' ? '#059669' : (theme) => alpha(theme.palette.grey[500], 0.12),
                                            },
                                        }}
                                    >
                                        Content Override View
                                    </Button>
                                </Box>
                            </Stack>
                            <Box
                                sx={{
                                    p: 3,
                                    borderRadius: 1.5,
                                    bgcolor: (themeVar) => alpha(themeVar.palette.primary.main, 0.03),
                                    border: (themeVar) => `1px solid ${alpha(themeVar.palette.primary.main, 0.16)}`,
                                }}
                            >
                                <Stack spacing={3}>
                                    {viewMode === 'rendered' ? (
                                        <>
                                            <Stack spacing={1}>
                                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600 }}>
                                                    Rendered Subject
                                                </Typography>
                                                <Box
                                                    sx={{
                                                        p: 2,
                                                        bgcolor: 'background.paper',
                                                        borderRadius: 1,
                                                        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.3)}`,
                                                        minHeight: 60,
                                                    }}
                                                >
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {doc.rendered_subject || doc.subject || '-'}
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            <Stack spacing={1}>
                                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600 }}>
                                                    Rendered Content
                                                </Typography>
                                                <Box
                                                    sx={{
                                                        p: 2.5,
                                                        bgcolor: 'background.paper',
                                                        borderRadius: 1,
                                                        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.3)}`,
                                                        minHeight: 250,
                                                    }}
                                                >
                                                    {doc.rendered_content || doc.template_content ? (
                                                        <Box
                                                            dangerouslySetInnerHTML={{ __html: doc.rendered_content || doc.template_content || '' }}
                                                            sx={{
                                                                '& p': { my: 0.5 },
                                                                '& h1, & h2, & h3': { my: 1 },
                                                            }}
                                                        />
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                                                            No rendered content available.
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Stack>
                                        </>
                                    ) : (
                                        <>
                                            <Stack spacing={1}>
                                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600 }}>
                                                    Subject Override
                                                </Typography>
                                                <Box
                                                    sx={{
                                                        p: 2,
                                                        bgcolor: 'background.paper',
                                                        borderRadius: 1,
                                                        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.3)}`,
                                                        minHeight: 60,
                                                    }}
                                                >
                                                    <Typography variant="body2">
                                                        {doc.subject || '-'}
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            <Stack spacing={1}>
                                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600 }}>
                                                    Content Override
                                                </Typography>
                                                <Box
                                                    sx={{
                                                        p: 2,
                                                        bgcolor: 'background.paper',
                                                        borderRadius: 1,
                                                        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.3)}`,
                                                        minHeight: 200,
                                                    }}
                                                >
                                                    {doc.template_content ? (
                                                        <Box
                                                            dangerouslySetInnerHTML={{ __html: doc.template_content }}
                                                            sx={{
                                                                '& p': { my: 0.5 },
                                                                '& h1, & h2, & h3': { my: 1 },
                                                            }}
                                                        />
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                                                            No content override provided.
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Stack>
                                        </>
                                    )}
                                </Stack>
                            </Box>
                        </Stack>
                    </Box>
                </Box>
            </Card>

            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={printing}
            >
                <Stack spacing={2} alignItems="center">
                    <CircularProgress color="inherit" />
                    <Typography variant="subtitle1">Preparing Document PDF for Printing...</Typography>
                </Stack>
            </Backdrop>
        </DashboardContent>
    );
}
