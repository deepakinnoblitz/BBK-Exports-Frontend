import { useState, useEffect } from 'react';
import { ImAttachment } from "react-icons/im";
import { HiOutlineDocumentText } from 'react-icons/hi2';
import { useParams, useNavigate } from 'react-router-dom';
import { IoMdArrowBack, IoMdCreate, IoMdDocument } from 'react-icons/io';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { frappeRequest } from 'src/utils/csrf';

import { DashboardContent } from 'src/layouts/dashboard';
import { getWhatsAppTemplate, fetchWhatsAppTemplateCategories } from 'src/api/whatsapp-template';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

const formatFileSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ----------------------------------------------------------------------

export function WhatsAppTemplateDetailsView() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [template, setTemplate] = useState<any>(null);
    const [fetching, setFetching] = useState(true);
    const [viewAttachment, setViewAttachment] = useState<any>(null);
    const [attachmentsMeta, setAttachmentsMeta] = useState<Record<string, any>>({});

    const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.whatsapp_templates;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.whatsapp_templates?.edit : true;

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const categories = await fetchWhatsAppTemplateCategories();
                setCategoryMap(
                    Object.fromEntries(
                        categories.map((item) => [item.name, item.category])
                    )
                );
            } catch (err) {
                console.error('Failed to load categories:', err);
            }
        };
        loadCategories();
    }, []);

    useEffect(() => {
        if (id) {
            setFetching(true);
            getWhatsAppTemplate(id)
                .then(async (data) => {
                    setTemplate(data);

                    const attachments = data.default_attachment || [];
                    if (attachments.length > 0) {
                        const fileUrls = attachments.map((att: any) => att.file).filter(Boolean);
                        if (fileUrls.length > 0) {
                            const getRelativePath = (url: string) => {
                                try {
                                    if (url.startsWith('http://') || url.startsWith('https://')) {
                                        const parsed = new URL(url);
                                        return parsed.pathname;
                                    }
                                    return url;
                                } catch (e) {
                                    return url;
                                }
                            };
                            const relativePaths = fileUrls.map(getRelativePath);
                            const allUrls = Array.from(new Set([...fileUrls, ...relativePaths]));

                            try {
                                const query = new URLSearchParams({
                                    doctype: 'File',
                                    fields: JSON.stringify(['file_name', 'file_url', 'file_size', 'creation', 'owner']),
                                    filters: JSON.stringify([['File', 'file_url', 'in', allUrls]]),
                                    limit_page_length: '999',
                                });
                                const response = await frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`);
                                if (response.ok) {
                                    const resData = await response.json();
                                    const files = resData.message || [];
                                    const metaMap: Record<string, any> = {};
                                    files.forEach((f: any) => {
                                        metaMap[f.file_url] = f;
                                        const filename = f.file_url.split('/').pop();
                                        if (filename) {
                                            metaMap[filename] = f;
                                        }
                                    });
                                    setAttachmentsMeta(metaMap);
                                }
                            } catch (metaErr) {
                                console.error('Failed to fetch file metadata:', metaErr);
                            }
                        }
                    }
                })
                .catch((err) => console.error('Failed to fetch template details:', err))
                .finally(() => setFetching(false));
        }
    }, [id]);

    if (fetching) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!template) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Template not found</Typography>
                <Button onClick={() => navigate(-1)} sx={{ mt: 3 }}>
                    Go back to list
                </Button>
            </DashboardContent>
        );
    }

    const getFileMeta = (fileUrl: string) => {
        if (!fileUrl) return null;
        if (attachmentsMeta[fileUrl]) return attachmentsMeta[fileUrl];

        // Check relative path
        try {
            if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
                const pathname = new URL(fileUrl).pathname;
                if (attachmentsMeta[pathname]) return attachmentsMeta[pathname];
            }
        } catch (e) {
            // Ignore invalid URL format
        }

        // Check filename match
        const filename = fileUrl.split('/').pop();
        if (filename && attachmentsMeta[filename]) return attachmentsMeta[filename];

        return null;
    };

    const {
        template_name,
        category,
        language,
        status,
        used_for,
        message_body,
        header_text,
        footer_text,
        allow_attachment,
        default_attachment = [],
        meta_template_name,
        meta_template_id,
        meta_status,
        last_synced_on,
    } = template;

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>Template: {template_name || id}</Typography>
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
                            onClick={() => navigate(`/whatsapp-templates/${encodeURIComponent(id || '')}/edit`)}
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

            <Stack spacing={3}>
                {/* Basic Information Card */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                        <Iconify icon={"ic:baseline-whatsapp" as any} width={18} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                            Basic Information
                        </Typography>
                    </Stack>
                    <Box
                        sx={{
                            display: 'grid',
                            columnGap: 4,
                            rowGap: 2,
                            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                        }}
                    >
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>Template Name</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{template_name || '-'}</Typography>
                        </Stack>
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>Category</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{categoryMap[category] || category || '-'}</Typography>
                        </Stack>
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>Status</Typography>
                            <Box>
                                <Chip
                                    label={status || 'Draft'}
                                    size="small"
                                    color={
                                        status === 'Active'
                                            ? 'success'
                                            : status === 'Inactive'
                                            ? 'default'
                                            : 'warning'
                                    }
                                    sx={{ borderRadius: 1, p: 1 }}
                                />
                            </Box>
                        </Stack>
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13, fontWeight: 600 }}>Used For</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{used_for || '-'}</Typography>
                        </Stack>
                    </Box>
                </Card>

                {/* Template Content Card */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                        <IoMdDocument size={18} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                            Template Content
                        </Typography>
                    </Stack>

                    <Stack spacing={3}>
                        <Box sx={{ p: 3, borderRadius: 1.5, bgcolor: (themeVar) => alpha(themeVar.palette.primary.main, 0.03), border: (themeVar) => `1px solid ${alpha(themeVar.palette.primary.main, 0.16)}` }}>
                            <Stack spacing={3}>
                                <Stack spacing={1}>
                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600 }}>Header Text</Typography>
                                    <Box
                                        sx={{
                                            p: 2,
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                            minHeight: 80,
                                        }}
                                    >
                                        {header_text ? (
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{header_text}</Typography>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>No header content</Typography>
                                        )}
                                    </Box>
                                </Stack>

                                <Stack spacing={1}>
                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600 }}>Message Body</Typography>
                                    <Box
                                        sx={{
                                            p: 2,
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                            minHeight: 120,
                                        }}
                                    >
                                        {message_body ? (
                                            <Typography
                                                variant="body2"
                                                dangerouslySetInnerHTML={{ __html: message_body }}
                                                sx={{
                                                    '& p': { m: 0 },
                                                    whiteSpace: 'pre-wrap',
                                                }}
                                            />
                                        ) : (
                                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>No message content</Typography>
                                        )}
                                    </Box>
                                </Stack>

                                <Stack spacing={1}>
                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600 }}>Footer Text</Typography>
                                    <Box
                                        sx={{
                                            p: 2,
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                            minHeight: 80,
                                        }}
                                    >
                                        {footer_text ? (
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{footer_text}</Typography>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>No footer content</Typography>
                                        )}
                                    </Box>
                                </Stack>
                            </Stack>
                        </Box>

                    </Stack>
                </Card>

                {/* Attachments Card */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                        <ImAttachment size={18} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            Attachments
                        </Typography>
                    </Stack>

                    <Stack spacing={2}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Total Attachments: {default_attachment.length}
                        </Typography>

                        {default_attachment.length === 0 ? (
                            <Box sx={{ py: 4, textAlign: 'center', bgcolor: (theme) => alpha(theme.palette.grey[500], 0.02), borderRadius: 1.5, border: (theme) => `1px dashed ${alpha(theme.palette.grey[500], 0.16)}` }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    No files attached
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1.5 }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: (t) => alpha(t.palette.grey[500], 0.08), '& th': { fontWeight: 700, fontSize: 13 } }}>
                                        <TableRow>
                                            <TableCell width={50} align="center">S.No</TableCell>
                                            <TableCell>File Name</TableCell>
                                            <TableCell>Description</TableCell>
                                            <TableCell>File Size</TableCell>
                                            <TableCell>Uploaded On</TableCell>
                                            <TableCell>Uploaded By</TableCell>
                                            <TableCell align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {default_attachment.map((row: any, index: number) => {
                                            const meta = getFileMeta(row.file);
                                            const fileSize = meta ? formatFileSize(meta.file_size) : '—';
                                            const uploadedOn = meta && meta.creation ? new Date(meta.creation.replace(' ', 'T')).toLocaleDateString() : '—';
                                            const uploadedBy = meta ? (meta.owner || '—') : '—';

                                            return (
                                                <TableRow key={index} hover>
                                                    <TableCell align="center">{index + 1}</TableCell>
                                                    <TableCell>
                                                        {row.file ? (
                                                            <Chip
                                                                label={row.file.split('/').pop() || '—'}
                                                                size="small"
                                                                icon={<HiOutlineDocumentText size={16} style={{ color: '#ffffff', marginLeft: 8, marginRight: 2 }} />}
                                                                sx={{
                                                                    height: 'auto',
                                                                    p: 0.3,
                                                                    bgcolor: '#22c55e',
                                                                    color: '#ffffff',
                                                                    fontWeight: 500,
                                                                    '& .MuiChip-icon': {
                                                                        ml: 0.5,
                                                                        color: '#ffffff',
                                                                    },
                                                                    '& .MuiChip-label': {
                                                                        whiteSpace: 'normal',
                                                                        wordBreak: 'break-all',
                                                                        display: 'inline-block',
                                                                        py: 0.5,
                                                                        lineHeight: 1.2,
                                                                    },
                                                                }}
                                                            />
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                            {row.description || '—'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                            {fileSize}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                            {uploadedOn}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                            {uploadedBy}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setViewAttachment(row)}
                                                                sx={{ color: 'info.main' }}
                                                                title="View Details"
                                                            >
                                                                <Iconify icon="solar:eye-bold" width={18} />
                                                            </IconButton>
                                                            {row.file && (
                                                                <IconButton
                                                                    size="small"
                                                                    component="a"
                                                                    href={row.file}
                                                                    download={row.file.split('/').pop() || 'attachment'}
                                                                    sx={{ color: 'success.main' }}
                                                                    title="Download"
                                                                >
                                                                    <Iconify icon="solar:download-bold" width={18} />
                                                                </IconButton>
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Stack>
                </Card>

                {/* Meta Information Card */}
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                        <Iconify icon={"solar:info-circle-bold" as any} width={18} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                            Meta Information
                        </Typography>
                    </Stack>
                    <Box
                        sx={{
                            display: 'grid',
                            columnGap: 4,
                            rowGap: 2,
                            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
                        }}
                    >
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">Meta Template Name</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{meta_template_name || '-'}</Typography>
                        </Stack>
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">Meta Template ID</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{meta_template_id || '-'}</Typography>
                        </Stack>
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">Language</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{language || '-'}</Typography>
                        </Stack>
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">Meta Status</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{meta_status || '-'}</Typography>
                        </Stack>
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">Last Synced On</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{last_synced_on || '-'}</Typography>
                        </Stack>
                    </Box>
                </Card>
            </Stack>

            <Dialog
                open={!!viewAttachment}
                onClose={() => setViewAttachment(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Attachment Details</Typography>
                    <IconButton
                        onClick={() => setViewAttachment(null)}
                        sx={{
                            color: (theme) => theme.palette.grey[500],
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'background.default' },
                        }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ px: 3, pb: 4, pt: 3 }}>
                    {viewAttachment && (() => {
                        const viewAttachmentMeta = getFileMeta(viewAttachment.file);
                        const viewFileSize = viewAttachmentMeta ? formatFileSize(viewAttachmentMeta.file_size) : '—';
                        const viewUploadedOn = viewAttachmentMeta && viewAttachmentMeta.creation ? new Date(viewAttachmentMeta.creation.replace(' ', 'T')).toLocaleString() : '—';
                        const viewUploadedBy = viewAttachmentMeta ? (viewAttachmentMeta.owner || '—') : '—';

                        return (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* Document Info Card */}
                                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: (t) => alpha(t.palette.grey[500], 0.04), border: (t) => `1px dashed ${alpha(t.palette.grey[500], 0.2)}` }}>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
                                                <Iconify icon="solar:document-bold" width={14} />
                                                File Name
                                            </Typography>
                                            <Typography variant="subtitle2" sx={{ wordBreak: 'break-all' }}>{viewAttachment.file?.split('/').pop() || '—'}</Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
                                                <Iconify icon={"solar:diskette-bold" as any} width={14} />
                                                File Size
                                            </Typography>
                                            <Typography variant="subtitle2">{viewFileSize}</Typography>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
                                            <Iconify icon="solar:notes-bold" width={14} />
                                            Description
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: viewAttachment.description ? 'text.primary' : 'text.disabled' }}>
                                            {viewAttachment.description || 'No description provided.'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Meta Info */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, px: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.success.main, 0.1), color: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Iconify icon="solar:calendar-date-bold" width={16} />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Uploaded On</Typography>
                                            <Typography variant="subtitle2" sx={{ fontSize: 13 }}>{viewUploadedOn}</Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.warning.main, 0.1), color: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Iconify icon={"solar:user-circle-bold" as any} width={16} />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Uploaded By</Typography>
                                            <Typography variant="subtitle2" sx={{ fontSize: 13 }}>{viewUploadedBy}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })()}
                </DialogContent>
                <DialogActions sx={{ m: 1 }}>
                    <Button
                        onClick={() => {
                            if (viewAttachment?.file) {
                                window.open(viewAttachment.file, '_blank');
                            }
                        }}
                        variant="contained"
                        disabled={!viewAttachment?.file}
                        startIcon={<Iconify icon="solar:eye-bold" />}
                    >
                        View File
                    </Button>
                </DialogActions>
            </Dialog>
        </DashboardContent>
    );
}
