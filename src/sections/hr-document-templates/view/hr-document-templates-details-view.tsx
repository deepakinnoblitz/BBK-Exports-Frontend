import { useState, useEffect, useCallback } from 'react';
import { IoMdArrowBack, IoMdSettings, IoMdMail, IoMdDocument, IoMdCreate } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { getHRDocumentTemplate, HRDocumentTemplate } from 'src/api/hr-document-template';

import { useAuth } from 'src/auth/auth-context';

type Props = {
    id: string;
};

export function HRDocumentTemplateDetailsView({ id }: Props) {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [doc, setDoc] = useState<HRDocumentTemplate | null>(null);

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.hr_document_templates;
    const canEdit = hasCustomPerms ? !!user?.permissions?.actions?.hr_document_templates?.edit : true;

    const loadDetails = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getHRDocumentTemplate(id);
            setDoc(res);
        } catch (err) {
            console.error('Failed to load HR document template details:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            loadDetails();
        }
    }, [id, loadDetails]);

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
                <Typography variant="h6">HR Document Template not found</Typography>
                <Button onClick={() => router.back()} sx={{ mt: 3 }}>
                    Go Back
                </Button>
            </DashboardContent>
        );
    }

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    Template: {doc.template_name || id}
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
                    {canEdit && (
                        <Button
                            variant="contained"
                            onClick={() => router.push(`/hr-document-templates/${encodeURIComponent(doc.name)}/edit`)}
                            startIcon={<IoMdCreate size={20} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                bgcolor: '#059669',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#047857' },
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
                            <IoMdSettings size={18} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                                BASIC INFORMATION
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
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 14 }}>
                                        Template Name
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>
                                        {doc.template_name || '-'}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 14 }}>
                                        Category
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>
                                        {doc.category || '-'}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 14 }}>
                                        Description
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 'fontWeightSemiBold', textAlign: 'right', maxWidth: '60%' }}
                                    >
                                        {doc.description || '-'}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>

                    {/* Document Settings */}
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                            <IoMdMail size={18} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                                DOCUMENT SETTINGS
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
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 14 }}>
                                        Status
                                    </Typography>
                                    <Chip
                                        label={doc.is_active ? 'Active' : 'Inactive'}
                                        size="small"
                                        color={doc.is_active ? 'success' : 'default'}
                                        sx={{ borderRadius: 1, p: 1 }}
                                    />
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>

                    {/* Content */}
                    <Box sx={{ gridColumn: { md: 'span 2' } }}>
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                <IoMdDocument size={18} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                                    CONTENT
                                </Typography>
                            </Stack>
                            <Box
                                sx={{
                                    p: 3,
                                    borderRadius: 1.5,
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03),
                                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                }}
                            >
                                <Stack spacing={3}>
                                    <Stack spacing={1}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600 }}
                                        >
                                            SUBJECT
                                        </Typography>
                                        <Box
                                            sx={{
                                                p: 2,
                                                bgcolor: 'background.paper',
                                                borderRadius: 1,
                                                border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.3)}`,
                                                minHeight: 80,
                                            }}
                                        >
                                            <Typography variant="body2">{doc.subject || '-'}</Typography>
                                        </Box>
                                    </Stack>

                                    <Stack spacing={1}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600, mb: 1 }}
                                        >
                                            TEMPLATE CONTENT
                                        </Typography>
                                        <Box
                                            sx={{
                                                p: 2,
                                                bgcolor: 'background.paper',
                                                borderRadius: 1,
                                                border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.3)}`,
                                                minHeight: 150,
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html: doc.template_content || '<p style="color: gray; margin: 0;">No content</p>',
                                            }}
                                        />
                                    </Stack>
                                </Stack>
                            </Box>
                        </Stack>
                    </Box>
                </Box>
            </Card>
        </DashboardContent>
    );
}
