import { useParams } from 'react-router-dom';
import { FaFileUpload } from 'react-icons/fa';
import { IoMdArrowBack } from 'react-icons/io';
import { MdContentCopy } from 'react-icons/md';
import { useState, useEffect, useRef } from 'react';
import { RiUploadCloud2Line } from 'react-icons/ri';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { useRouter } from 'src/routes/hooks';

import { frappeRequest } from 'src/utils/csrf';

import { DashboardContent } from 'src/layouts/dashboard';
import { uploadWhatsappAttachment } from 'src/api/whatsapp';
import { EmailTemplateVariable } from 'src/api/email-template';
import { getWhatsAppTemplate, updateWhatsAppTemplate, fetchWhatsAppTemplateVariables, fetchWhatsAppTemplateCategories, createWhatsAppTemplateCategory, WhatsAppTemplateCategory } from 'src/api/whatsapp-template';

import { Iconify } from 'src/components/iconify';
import { RichTextEditor } from 'src/components/rich-text-editor/rich-text-editor';

import { CustomSwitch } from 'src/sections/reminders/reminders-settings-view';

// ----------------------------------------------------------------------

const CATEGORY_OPTIONS = [
    'General', 'Welcome', 'Follow Up', 'Proposal', 'Estimation', 'Invoice', 'Payment Reminder', 'Support', 'Marketing'
];

const LANGUAGE_OPTIONS = [
    'English', 'Tamil', 'Hindi', 'Arabic', 'French'
];

const STATUS_OPTIONS = [
    'Draft', 'Active', 'Inactive'
];

const USED_FOR_OPTIONS = [
    { label: 'Lead', value: 'Lead' },
    { label: 'Client', value: 'Contacts' },
    { label: 'Company', value: 'Accounts' },
    { label: 'Prospects', value: 'Deal' },
    { label: 'Proposal', value: 'Proposal' },
    { label: 'Estimation', value: 'Estimation' },
    { label: 'Invoice', value: 'Invoice' },
];

const META_STATUS_OPTIONS = [
    'Draft', 'Pending', 'Approved', 'Rejected', 'Disabled'
];

interface AttachmentRow {
    file: string | null;
    description: string;
    file_name: string;
    file_size: string;
    uploaded_on: string;
}

export function WhatsAppTemplateEditView() {
    const router = useRouter();
    const { id } = useParams();
    const [isSaving, setIsSaving] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [templateName, setTemplateName] = useState('');
    const [category, setCategory] = useState('');
    const [language, setLanguage] = useState('English');
    const [status, setStatus] = useState('Draft');
    const [usedFor, setUsedFor] = useState<string[]>(['Lead']);
    const [headerText, setHeaderText] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [footerText, setFooterText] = useState('');
    const [allowAttachment, setAllowAttachment] = useState(false);
    const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

    // Meta Info states
    const [metaTemplateName, setMetaTemplateName] = useState('');
    const [metaStatus, setMetaStatus] = useState('Draft');

    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const [errors, setErrors] = useState<{
        templateName?: boolean;
        category?: boolean;
        messageBody?: boolean;
    }>({});

    const [categoryOptions, setCategoryOptions] = useState<WhatsAppTemplateCategory[]>([]);
    const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const filter = createFilterOptions<any>();

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await fetchWhatsAppTemplateCategories();
                setCategoryOptions(data);
            } catch (err) {
                console.error('Failed to load categories:', err);
            }
        };
        loadCategories();
    }, []);

    const handleCreateCategorySubmit = async () => {
        try {
            if (!newCategoryName.trim()) return;

            setCreatingCategory(true);

            // Create Category
            const created = await createWhatsAppTemplateCategory(
                newCategoryName.trim()
            );

            // Reload Categories
            const categories = await fetchWhatsAppTemplateCategories();
            setCategoryOptions(categories);

            // Auto Select Newly Created Category
            setCategory(created.name);

            // Close Dialog
            setCreateCategoryOpen(false);
            setNewCategoryName('');

        } catch (error: any) {
            console.error(error);
        } finally {
            setCreatingCategory(false);
        }
    };

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({ open: false, message: '', severity: 'success' });

    const [variables, setVariables] = useState<EmailTemplateVariable[]>([]);

    useEffect(() => {
        const loadVariables = async () => {
            if (!usedFor || usedFor.length === 0) {
                setVariables([]);
                return;
            }
            try {
                const data = await fetchWhatsAppTemplateVariables(usedFor.join(','));
                setVariables(data);
            } catch (err) {
                console.error('Failed to load variables:', err);
                setVariables([]);
            }
        };

        loadVariables();
    }, [usedFor]);

    const handleCopyVariable = (variable: string) => {
        navigator.clipboard.writeText(variable);
        setSnackbar({
            open: true,
            message: `Copied ${variable} to clipboard`,
            severity: 'success',
        });
    };

    const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

    useEffect(() => {
        if (!id) return;
        setFetching(true);
        getWhatsAppTemplate(id)
            .then(async (data) => {
                setTemplateName(data.template_name || '');
                setCategory(data.category || '');
                setLanguage(data.language || 'English');
                setStatus(data.status || 'Draft');
                setUsedFor(
                    data.used_for
                        ? data.used_for.split(',').map((s: string) => s.trim()).filter(Boolean)
                        : ['Lead']
                );
                setMessageBody(data.message_body || '');
                setHeaderText(data.header_text || '');
                setFooterText(data.footer_text || '');
                setAllowAttachment(!!data.allow_attachment);
                setMetaTemplateName(data.meta_template_name || '');
                setMetaStatus(data.meta_status || 'Draft');

                const rawAttachments = data.default_attachment || [];
                const loadedAttachments = rawAttachments.map((item: any) => ({
                    file: item.file || null,
                    description: item.description || '',
                    file_name: item.file ? decodeURIComponent(item.file.split('/').pop() || '') : '',
                    file_size: '—',
                    uploaded_on: '—',
                }));
                setAttachments(loadedAttachments);

                // Fetch file metadata for existing files
                const fileUrls = rawAttachments.map((att: any) => att.file).filter(Boolean);
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

                            const formatFileSizeLocal = (bytes: number) => {
                                if (!bytes) return '—';
                                if (bytes < 1024) return `${bytes} B`;
                                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                                return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                            };

                            setAttachments((prev) =>
                                prev.map((att) => {
                                    if (!att.file) return att;
                                    const meta = metaMap[att.file] || metaMap[getRelativePath(att.file)] || metaMap[att.file.split('/').pop() || ''];
                                    if (meta) {
                                        return {
                                            ...att,
                                            file_size: formatFileSizeLocal(meta.file_size),
                                            uploaded_on: meta.creation ? new Date(meta.creation.replace(' ', 'T')).toLocaleString() : '—',
                                        };
                                    }
                                    return att;
                                })
                            );
                        }
                    } catch (metaErr) {
                        console.error('Failed to fetch file metadata in Edit view:', metaErr);
                    }
                }
            })
            .catch((err) => console.error('Failed to load template:', err))
            .finally(() => setFetching(false));
    }, [id]);

    const createEmptyAttachment = (): AttachmentRow => ({
        file: null,
        description: '',
        file_name: '',
        file_size: '',
        uploaded_on: '',
    });

    const handleAddAttachmentRow = () => {
        setAttachments((prev) => [...prev, createEmptyAttachment()]);
    };

    const handleRemoveAttachmentRow = (idx: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleAttachmentDescriptionChange = (idx: number, desc: string) => {
        setAttachments((prev) =>
            prev.map((row, i) => (i === idx ? { ...row, description: desc } : row))
        );
    };

    const handleFileSelect = async (idx: number, file: File) => {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const sizeFmt =
            file.size < 1024
                ? `${file.size} B`
                : file.size < 1024 * 1024
                ? `${(file.size / 1024).toFixed(1)} KB`
                : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        setUploadingIndex(idx);
        try {
            const fileUrl = await uploadWhatsappAttachment(file);
            setAttachments((prev) =>
                prev.map((row, i) =>
                    i === idx
                        ? {
                              file: fileUrl,
                              description: row.description,
                              file_name: file.name,
                              file_size: sizeFmt,
                              uploaded_on: now,
                          }
                        : row
                )
            );
            setSnackbar({ open: true, severity: 'success', message: 'File uploaded successfully.' });
        } catch (error: any) {
            setSnackbar({ open: true, severity: 'error', message: error.message || 'File upload failed.' });
        } finally {
            setUploadingIndex(null);
        }
    };

    const handlePreviewAttachment = (row: AttachmentRow) => {
        if (row.file) {
            window.open(row.file, '_blank');
        }
    };

    const handleDownloadAttachment = (row: AttachmentRow) => {
        if (row.file) {
            const a = document.createElement('a');
            a.href = row.file;
            a.download = row.file_name || 'attachment';
            a.click();
        }
    };

    const handleSave = async () => {
        const newErrors: typeof errors = {};
        const missingFields: string[] = [];

        if (!templateName.trim()) {
            newErrors.templateName = true;
            missingFields.push('Template Name');
        }
        if (!category) {
            newErrors.category = true;
            missingFields.push('Category');
        }
        if (!messageBody.trim() || messageBody === '<p><br></p>') {
            newErrors.messageBody = true;
            missingFields.push('Message Body');
        }

        setErrors(newErrors);

        if (missingFields.length) {
            setSnackbar({ open: true, severity: 'error', message: `Please fill in: ${missingFields.join(', ')}` });
            return;
        }

        if (allowAttachment && attachments.filter((r) => r.file).length === 0) {
            setSnackbar({ open: true, severity: 'error', message: 'Atleast one attachment is required' });
            return;
        }

        setIsSaving(true);
        try {
            await updateWhatsAppTemplate(id!, {
                template_name: templateName,
                category,
                language,
                status,
                used_for: usedFor.length > 0 ? usedFor.join(',') : undefined,
                header_text: headerText || undefined,
                message_body: messageBody,
                footer_text: footerText || undefined,
                allow_attachment: allowAttachment ? 1 : 0,
                default_attachment: allowAttachment
                    ? attachments
                          .filter((r) => r.file)
                          .map((r) => ({
                              file: r.file!,
                              description: r.description,
                          }))
                    : [],
                meta_template_name: metaTemplateName || undefined,
                meta_status: metaStatus || undefined,
            });

            setSnackbar({ open: true, severity: 'success', message: 'WhatsApp Template updated successfully.' });
            sessionStorage.setItem('whatsapp_template_success_message', 'WhatsApp Template updated successfully.');
            setTimeout(() => router.push('/whatsapp-templates'), 500);
        } catch (error: any) {
            setSnackbar({ open: true, severity: 'error', message: error.message || 'Failed to update WhatsApp template.' });
            setIsSaving(false);
        }
    };

    if (fetching) {
        return (
            <DashboardContent
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                }}
            >
                <CircularProgress />
            </DashboardContent>
        );
    }

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Stack spacing={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Edit Template
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.back()}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5 }}
                    >
                        Go Back
                    </Button>
                    <LoadingButton
                        variant="contained"
                        onClick={handleSave}
                        loading={isSaving}
                        sx={{ borderRadius: 1.5, bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        Save Template
                    </LoadingButton>
                </Stack>
            </Stack>

            <Box
                display="grid"
                gridTemplateColumns={{
                    xs: '1fr',
                    md: 'minmax(0, 2.5fr) 350px',
                }}
                gap={3}
            >
                <Box>
                    <Card sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>Basic Information</Typography>
                        <Stack spacing={3}>
                            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                                <TextField
                                    fullWidth
                                    label="Template Name"
                                    required
                                    value={templateName}
                                    onChange={(e) => {
                                        setTemplateName(e.target.value);
                                        if (e.target.value) setErrors((prev) => ({ ...prev, templateName: false }));
                                    }}
                                    error={errors.templateName}
                                    helperText={errors.templateName ? 'This field is required' : ''}
                                />
                                <Autocomplete
                                    fullWidth
                                    options={categoryOptions}
                                    value={categoryOptions.find((opt) => opt.name === category) || null}
                                    onChange={(event, newValue: any) => {
                                        if (typeof newValue === 'string') {
                                            setCategory(newValue);
                                        } else if (newValue && newValue.isNew) {
                                            setNewCategoryName(newValue.inputValue);
                                            setCreateCategoryOpen(true);
                                        } else {
                                            setCategory(newValue?.name || '');
                                            setErrors((prev) => ({
                                                ...prev,
                                                category: false,
                                            }));
                                        }
                                    }}
                                    filterOptions={(options, params) => {
                                        const filtered = filter(options, params) as any[];

                                        const { inputValue } = params;

                                        const isExisting = options.some(
                                            (option: any) =>
                                                option.category.toLowerCase() === inputValue.toLowerCase()
                                        );

                                        if (inputValue !== '' && !isExisting) {
                                            filtered.push({
                                                inputValue,
                                                category: `+ Create "${inputValue}"`,
                                                isNew: true,
                                            });
                                        } else if (inputValue === '') {
                                            filtered.push({
                                                inputValue: '',
                                                category: '+ Create Category',
                                                isNew: true,
                                            });
                                        }

                                        return filtered;
                                    }}
                                    getOptionLabel={(option: any) => {
                                        if (typeof option === 'string') return option;
                                        if (option.inputValue) return option.inputValue;
                                        return option.category || '';
                                    }}
                                    isOptionEqualToValue={(option, value) =>
                                        option.name === value.name
                                    }
                                    renderOption={(props, option: any) => {
                                        const { key, ...optionProps } = props as any;

                                        return (
                                            <Box
                                                component="li"
                                                key={key || option.category}
                                                {...optionProps}
                                                sx={{
                                                    typography: 'body2',
                                                    ...(option.isNew && {
                                                        color: 'primary.main',
                                                        fontWeight: 600,
                                                        bgcolor: (theme) =>
                                                            alpha(theme.palette.primary.main, 0.08),
                                                        borderTop: (theme) =>
                                                            `1px solid ${theme.palette.divider}`,
                                                        mt: 0.5,
                                                        '&:hover': {
                                                            bgcolor: (theme) =>
                                                                alpha(theme.palette.primary.main, 0.16),
                                                        },
                                                    }),
                                                }}
                                            >
                                                {option.isNew ? (
                                                    <Stack
                                                        direction="row"
                                                        spacing={1.5}
                                                        alignItems="center"
                                                        sx={{ py: 0.5 }}
                                                    >
                                                        <Iconify
                                                            icon="solar:add-circle-bold"
                                                            width={22}
                                                        />

                                                        <Typography
                                                            variant="subtitle2"
                                                            sx={{ fontWeight: 700 }}
                                                        >
                                                            {option.inputValue
                                                                ? `Create "${option.inputValue}"`
                                                                : 'Create Category'}
                                                        </Typography>
                                                    </Stack>
                                                ) : (
                                                    option.category
                                                )}
                                            </Box>
                                        );
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Category"
                                            required
                                            error={errors.category}
                                            helperText={errors.category ? 'This field is required' : ''}
                                        />
                                    )}
                                />
                            </Box>

                            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    {STATUS_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                                <FormControl fullWidth>
                                    <InputLabel id="used-for-label-edit">Used For</InputLabel>
                                    <Select
                                        labelId="used-for-label-edit"
                                        multiple
                                        value={usedFor}
                                        onChange={(e) => setUsedFor(e.target.value as string[])}
                                        input={<OutlinedInput label="Used For" />}
                                        renderValue={(selected) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {(selected as string[]).map((val) => {
                                                    const opt = USED_FOR_OPTIONS.find((o) => o.value === val);
                                                    return (
                                                        <Chip
                                                            key={val}
                                                            label={opt?.label || val}
                                                            size="small"
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        )}
                                        MenuProps={{
                                            PaperProps: {
                                                sx: {
                                                    p: 0.5,
                                                    maxHeight: 350,
                                                    borderRadius: 2,
                                                },
                                            },
                                        }}
                                    >
                                        {USED_FOR_OPTIONS.map((option) => (
                                            <MenuItem
                                                key={option.value}
                                                value={option.value}
                                                sx={{
                                                    py: 1.5,
                                                    px: 2,
                                                    m: 0.5,
                                                    borderRadius: 0.5,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    '&.Mui-selected': {
                                                        bgcolor: 'action.selected',
                                                    },
                                                    '&.Mui-selected:hover': {
                                                        bgcolor: 'action.selected',
                                                    },
                                                }}
                                            >
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: 14,
                                                    }}
                                                >
                                                    {option.label}
                                                </Typography>

                                                {usedFor.includes(option.value) && (
                                                    <Iconify
                                                        icon="solar:check-circle-bold"
                                                        width={20}
                                                        sx={{ color: 'primary.main' }}
                                                    />
                                                )}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        </Stack>
                    </Card>

                    <Card sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>Template Content</Typography>
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4.5}
                                label="Header Text"
                                value={headerText}
                                onChange={(e) => setHeaderText(e.target.value)}
                                placeholder="Header text shown above message"
                            />

                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: errors.messageBody ? 'error.main' : 'text.secondary', mb: 1 }}>
                                    Message Body <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                                </Typography>
                                <RichTextEditor
                                    value={messageBody}
                                    onChange={(val: string) => {
                                        setMessageBody(val);
                                        if (val && val !== '<p><br></p>') setErrors((prev) => ({ ...prev, messageBody: false }));
                                    }}
                                    placeholder="Enter message body..."
                                    error={errors.messageBody}
                                    helperText={errors.messageBody ? 'This field is required' : undefined}
                                    minHeight={250}
                                />
                            </Box>

                            <TextField
                                fullWidth
                                multiline
                                rows={4.5}
                                label="Footer Text"
                                value={footerText}
                                onChange={(e) => setFooterText(e.target.value)}
                                placeholder="Footer text shown below message"
                            />

                            <FormControlLabel
                                control={
                                    <CustomSwitch
                                        checked={allowAttachment}
                                        onChange={(e) => {
                                            setAllowAttachment(e.target.checked);
                                            if (e.target.checked && attachments.length === 0) {
                                                setAttachments([createEmptyAttachment()]);
                                            }
                                        }}
                                    />
                                }
                                label="Allow Attachment"
                                sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
                            />

                            {allowAttachment && (
                                <Box sx={{ mt: 2 }}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: 14 }}>
                                            Attachments ({attachments.filter((a) => a.file).length})
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={handleAddAttachmentRow}
                                            startIcon={<Iconify icon="mingcute:add-line" />}
                                            sx={{
                                                borderRadius: 1,
                                                bgcolor: '#059669',
                                                color: 'common.white',
                                                '&:hover': { bgcolor: '#047857' },
                                            }}
                                        >
                                            Add Row
                                        </Button>
                                    </Stack>

                                    <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1.5 }}>
                                        <Table sx={{ minWidth: 800 }}>
                                            <TableHead sx={{ bgcolor: (t) => alpha(t.palette.grey[500], 0.08), '& th': { fontWeight: 700, fontSize: 13 } }}>
                                                <TableRow>
                                                    <TableCell width={40} align="center">S.No</TableCell>
                                                    <TableCell>Attachment</TableCell>
                                                    <TableCell>Description</TableCell>
                                                    <TableCell>File Name</TableCell>
                                                    <TableCell>File Size</TableCell>
                                                    <TableCell>Uploaded On</TableCell>
                                                    <TableCell align="center">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {attachments.map((row, index) => (
                                                    <TableRow key={index} sx={{ '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.02) } }}>
                                                        <TableCell align="center">
                                                            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, mx: 'auto' }}>
                                                                {index + 1}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <input
                                                                type="file"
                                                                style={{ display: 'none' }}
                                                                ref={(el) => { fileInputRefs.current[index] = el; }}
                                                                onChange={(e) => {
                                                                    const f = e.target.files?.[0];
                                                                    if (f) handleFileSelect(index, f);
                                                                    e.target.value = '';
                                                                }}
                                                            />
                                                            {row.file ? (
                                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                                    <Chip
                                                                        label={row.file_name || 'File'}
                                                                        size="small"
                                                                        icon={<FaFileUpload size={13} />}
                                                                        sx={{
                                                                            maxWidth: 150,
                                                                            bgcolor: '#22c55e',
                                                                            color: '#ffffff',
                                                                            fontWeight: 600,
                                                                            '& .MuiChip-icon': {
                                                                                color: '#ffffff',
                                                                                ml: 0.5,
                                                                            },
                                                                            p: 1
                                                                        }}
                                                                    />
                                                                    <IconButton size="small" onClick={() => fileInputRefs.current[index]?.click()} title="Change file">
                                                                        <Iconify icon="solar:refresh-bold" width={16} />
                                                                    </IconButton>
                                                                </Stack>
                                                            ) : (
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    startIcon={<RiUploadCloud2Line />}
                                                                    onClick={() => fileInputRefs.current[index]?.click()}
                                                                    disabled={uploadingIndex === index}
                                                                    sx={{
                                                                        borderRadius: 1.5,
                                                                        fontWeight: 600,
                                                                        textTransform: 'none',
                                                                        bgcolor: '#36b37e',
                                                                        color: 'common.white',
                                                                        '&:hover': { bgcolor: '#2b9065' }
                                                                    }}
                                                                >
                                                                    {uploadingIndex === index ? 'Uploading...' : 'Upload File'}
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                placeholder="Description..."
                                                                value={row.description}
                                                                onChange={(e) => handleAttachmentDescriptionChange(index, e.target.value)}
                                                                variant="standard"
                                                                InputProps={{ disableUnderline: true, sx: { fontSize: 13 } }}
                                                                fullWidth
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>
                                                                {row.file_name || '—'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>
                                                                {row.file_size || '—'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>
                                                                {row.uploaded_on || '—'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handlePreviewAttachment(row)}
                                                                    sx={{ color: 'info.main' }}
                                                                    disabled={!row.file}
                                                                    title="Preview"
                                                                >
                                                                    <Iconify icon="solar:eye-bold" width={18} />
                                                                </IconButton>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleDownloadAttachment(row)}
                                                                    sx={{ color: 'success.main' }}
                                                                    disabled={!row.file}
                                                                    title="Download"
                                                                >
                                                                    <Iconify icon="solar:download-bold" width={18} />
                                                                </IconButton>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleRemoveAttachmentRow(index)}
                                                                    sx={{ color: 'error.main' }}
                                                                    title="Delete row"
                                                                >
                                                                    <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                                                                </IconButton>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {attachments.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                                                No attachments. Click &quot;Add Row&quot; to start.
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                        </Stack>
                    </Card>

                    <Card sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>Meta Information</Typography>
                        <Stack spacing={3}>
                            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
                                <TextField
                                    fullWidth
                                    label="Meta Template Name"
                                    value={metaTemplateName}
                                    onChange={(e) => setMetaTemplateName(e.target.value)}
                                />
                                <TextField
                                    select
                                    fullWidth
                                    label="Language"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                >
                                    {LANGUAGE_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    select
                                    fullWidth
                                    label="Meta Status"
                                    value={metaStatus || 'Draft'}
                                    onChange={(e) => setMetaStatus(e.target.value)}
                                >
                                    {META_STATUS_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                        </Stack>
                    </Card>
                </Box>

                <Box
                    gridColumn={{ xs: 'span 1', md: 'span 1' }}
                    sx={{
                        position: 'sticky',
                        top: 90,
                        alignSelf: 'start',
                    }}
                >
                    <Card
                        sx={{
                            borderRadius: 2,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: 'calc(100vh - 120px)',
                        }}
                    >
                        <Typography
                            variant="h6"
                            sx={{
                                px: 2,
                                py: 1.5,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                fontWeight: 600,
                            }}
                        >
                            Variables
                        </Typography>

                        <Stack
                            spacing={1}
                            sx={{
                                p: 2,
                                overflowY: 'auto',
                                flex: 1,
                                '&::-webkit-scrollbar': {
                                    width: 6,
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    bgcolor: 'grey.400',
                                    borderRadius: 3,
                                },
                                '&::-webkit-scrollbar-thumb:hover': {
                                    bgcolor: 'grey.500',
                                },
                            }}
                        >
                            {variables.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ py: 8, px: 2, color: 'text.secondary', textAlign: 'center' }}>
                                    <Iconify icon={"solar:folder-with-files-outline" as any} width={32} sx={{ mb: 1, opacity: 0.5 }} />
                                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                        {usedFor.length > 0 ? 'No variables available' : 'Select "Used For" to view variables'}
                                    </Typography>
                                </Stack>
                            ) : (
                                variables.map((item) => {
                                    const label = item.fieldname
                                        .split('_')
                                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                        .join(' ');

                                    return (
                                        <Button
                                            key={item.fieldname}
                                            fullWidth
                                            variant="outlined"
                                            startIcon={
                                                <Box
                                                    sx={{
                                                        width: 34,
                                                        height: 34,
                                                        borderRadius: 1.5,
                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Iconify
                                                        icon={"solar:code-bold" as any}
                                                        width={18}
                                                        sx={{ color: 'primary.main' }}
                                                    />
                                                </Box>
                                            }
                                            endIcon={<MdContentCopy size={16} color="#059669" />}
                                            onClick={() => handleCopyVariable(item.variable)}
                                            sx={{
                                                justifyContent: 'space-between',
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                color: 'text.primary',
                                                bgcolor: 'background.paper',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: 2,
                                                px: 2,
                                                py: 1.3,
                                                minHeight: 58,
                                                transition: 'all .2s ease',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                    transform: 'translateX(2px)',
                                                    boxShadow: (theme) => `0 6px 16px ${alpha(theme.palette.primary.main, 0.15)}`,
                                                },
                                                '& .MuiButton-startIcon': {
                                                    mr: 2,
                                                },
                                                '& .MuiButton-endIcon': {
                                                    ml: 2,
                                                },
                                            }}
                                        >
                                            <Box sx={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        textAlign: 'left',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography
                                                            variant="subtitle2"
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: 'text.primary',
                                                            }}
                                                        >
                                                            {label}
                                                        </Typography>

                                                        <Box
                                                            sx={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <Typography
                                                                sx={{
                                                                    fontFamily: 'monospace',
                                                                    fontSize: 12,
                                                                    color: 'primary.main',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                {item.variable}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Button>
                                    );
                                })
                            )}
                        </Stack>
                    </Card>
                </Box>
            </Box>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
            
            <Dialog
                open={createCategoryOpen}
                onClose={() => !creatingCategory && setCreateCategoryOpen(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: { borderRadius: 2 },
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Create Category
                    </Typography>
        
                    <IconButton
                        onClick={() =>
                            !creatingCategory && setCreateCategoryOpen(false)
                        }
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
        
                <DialogContent sx={{ px: 3, pt: 1 }}>
                    <TextField
                        fullWidth
                        autoFocus
                        required
                        label="Category Name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
        
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        variant="contained"
                        onClick={handleCreateCategorySubmit}
                        disabled={creatingCategory || !newCategoryName.trim()}
                        sx={{
                            bgcolor: '#059669',
                            '&:hover': { bgcolor: '#047857' },
                        }}
                    >
                        {creatingCategory ? (
                            <CircularProgress size={22} color="inherit" />
                        ) : (
                            'Create'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>               
        </DashboardContent>
    );
}
