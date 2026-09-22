import { useSnackbar } from 'notistack';
import { MdContentCopy } from 'react-icons/md';
import { IoMdArrowBack } from 'react-icons/io';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    getHRDocumentTemplate,
    updateHRDocumentTemplate,
    fetchHRDocumentTemplateVariables,
    fetchHRDocumentCategories,
    createHRDocumentCategory,
    HRDocumentTemplateVariable,
    HRDocumentCategory,
} from 'src/api/hr-document-template';

import { Iconify } from 'src/components/iconify';
import { RichTextEditor } from 'src/components/rich-text-editor/rich-text-editor';

import { CustomSwitch } from 'src/sections/reminders/reminders-settings-view';

type Props = {
    id: string;
};

const isPlainTextEmpty = (val: string) => {
    if (!val) return true;
    const doc = new DOMParser().parseFromString(val, 'text/html');
    const text = doc.body.textContent || '';
    return text.replace(/\s/g, '').trim() === '';
};

export function HRDocumentTemplateEditView({ id }: Props) {
    const router = useRouter();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(true);
    const [templateName, setTemplateName] = useState('');
    const [category, setCategory] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [description, setDescription] = useState('');
    const [subject, setSubject] = useState('');
    const [templateContent, setTemplateContent] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<{
        templateName?: boolean;
        category?: boolean;
        subject?: boolean;
        templateContent?: boolean;
    }>({});

    const [variables, setVariables] = useState<HRDocumentTemplateVariable[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<HRDocumentCategory[]>([]);
    const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const filter = createFilterOptions<any>();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [doc, cats, vars] = await Promise.all([
                getHRDocumentTemplate(id),
                fetchHRDocumentCategories(),
                fetchHRDocumentTemplateVariables('Employee'),
            ]);

            setTemplateName(doc.template_name || '');
            setCategory(doc.category || '');
            setDocumentType(doc.document_type || doc.category || '');
            setDescription(doc.description || '');
            setSubject(doc.subject || '');
            setTemplateContent(doc.template_content || '');
            setIsActive(!!doc.is_active);

            setCategoryOptions(cats);
            setVariables(vars);
        } catch (err: any) {
            console.error(err);
            enqueueSnackbar('Failed to load HR document template details', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [id, enqueueSnackbar]);

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id, loadData]);

    const handleCreateCategorySubmit = async () => {
        if (!newCategoryName.trim()) return;
        setCreatingCategory(true);
        try {
            const created = await createHRDocumentCategory(newCategoryName.trim());
            const categories = await fetchHRDocumentCategories();
            setCategoryOptions(categories);
            setCategory(created.name);
            setDocumentType(created.category_name || created.name);
            setCreateCategoryOpen(false);
            setNewCategoryName('');
            enqueueSnackbar('Category created successfully', { variant: 'success' });
        } catch (error: any) {
            enqueueSnackbar(error.message || 'Failed to create category', { variant: 'error' });
        } finally {
            setCreatingCategory(false);
        }
    };

    const handleCopyVariable = (variableStr: string) => {
        navigator.clipboard.writeText(variableStr);
        enqueueSnackbar(`Copied ${variableStr} to clipboard`, { variant: 'success' });
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

        if (!subject.trim()) {
            newErrors.subject = true;
            missingFields.push('Subject');
        }

        if (!templateContent || templateContent === '<p><br></p>' || templateContent.trim() === '') {
            newErrors.templateContent = true;
            missingFields.push('Template Content');
        }

        setErrors(newErrors);

        if (missingFields.length) {
            enqueueSnackbar(`Please fill in: ${missingFields.join(', ')}`, { variant: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            await updateHRDocumentTemplate(id, {
                template_name: templateName.trim(),
                category,
                document_type: documentType || category,
                is_active: isActive ? 1 : 0,
                description: description.trim(),
                subject: subject.trim(),
                template_content: templateContent,
            });

            sessionStorage.setItem('hr_document_template_success_message', 'HR Document Template updated successfully.');
            router.push('/hr-document-templates');
        } catch (error: any) {
            enqueueSnackbar(error.message || 'Failed to update HR document template', { variant: 'error' });
            setIsSaving(false);
        } finally {
            setIsSaving(false);
        }
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

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
                <Stack spacing={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Edit HR Document Template
                    </Typography>
                </Stack>
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
                        }}
                    >
                        Go Back
                    </Button>
                    <LoadingButton
                        variant="contained"
                        onClick={handleSave}
                        loading={isSaving}
                        sx={{
                            borderRadius: 1.5,
                            bgcolor: '#059669',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#047857' },
                        }}
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
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Basic Information
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                            <FormControlLabel
                                control={
                                    <CustomSwitch
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                    />
                                }
                                label="Is Active"
                                sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
                            />
                        </Stack>
                        <Stack spacing={3}>
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
                                        setDocumentType(newValue);
                                    } else if (newValue && newValue.isNew) {
                                        setNewCategoryName(newValue.inputValue);
                                        setCreateCategoryOpen(true);
                                    } else {
                                        setCategory(newValue?.name || '');
                                        setDocumentType(newValue?.category_name || newValue?.name || '');
                                        setErrors((prev) => ({ ...prev, category: false }));
                                    }
                                }}
                                filterOptions={(options, params) => {
                                    const filtered = filter(options, params) as any[];
                                    const { inputValue } = params;

                                    const isExisting = options.some(
                                        (option: any) =>
                                            (option.category_name || option.name || '').toLowerCase() ===
                                            inputValue.toLowerCase()
                                    );

                                    if (inputValue !== '' && !isExisting) {
                                        filtered.push({
                                            inputValue,
                                            category_name: `+ Create "${inputValue}"`,
                                            isNew: true,
                                        });
                                    } else if (inputValue === '') {
                                        filtered.push({
                                            inputValue: '',
                                            category_name: '+ Create Category',
                                            isNew: true,
                                        });
                                    }

                                    return filtered;
                                }}
                                getOptionLabel={(option: any) => {
                                    if (typeof option === 'string') return option;
                                    if (option.inputValue) return option.inputValue;
                                    return option.category_name || option.name || '';
                                }}
                                isOptionEqualToValue={(option, value) => option.name === value.name}
                                renderOption={(props, option: any) => {
                                    const { key, ...optionProps } = props as any;

                                    return (
                                        <Box
                                            component="li"
                                            key={key || option.name || option.category_name}
                                            {...optionProps}
                                            sx={{
                                                typography: 'body2',
                                                ...(option.isNew && {
                                                    color: 'primary.main',
                                                    fontWeight: 600,
                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                                    mt: 0.5,
                                                    '&:hover': {
                                                        bgcolor: (theme) =>
                                                            alpha(theme.palette.primary.main, 0.16),
                                                    },
                                                }),
                                            }}
                                        >
                                            {option.isNew ? (
                                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.5 }}>
                                                    <Iconify icon={"solar:add-circle-bold" as any} width={22} />
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                        {option.inputValue ? `Create "${option.inputValue}"` : 'Create Category'}
                                                    </Typography>
                                                </Stack>
                                            ) : (
                                                option.category_name || option.name
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

                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </Stack>
                    </Card>

                    <Card sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Document Content
                        </Typography>
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                label="Subject"
                                required
                                value={subject}
                                onChange={(e) => {
                                    setSubject(e.target.value);
                                    if (e.target.value) setErrors((prev) => ({ ...prev, subject: false }));
                                }}
                                error={errors.subject}
                                helperText={errors.subject ? 'This field is required' : ''}
                            />

                            <Box>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        color: errors.templateContent ? 'error.main' : 'text.secondary',
                                        mb: 1,
                                    }}
                                >
                                    Template Content <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                                </Typography>

                                <RichTextEditor
                                    value={templateContent}
                                    onChange={(val: string) => {
                                        setTemplateContent(val);
                                        if (val && val !== '<p><br></p>')
                                            setErrors((prev) => ({ ...prev, templateContent: false }));
                                    }}
                                    placeholder="Enter document template content..."
                                    error={errors.templateContent}
                                    helperText={errors.templateContent ? 'This field is required' : undefined}
                                    minHeight={500}
                                />
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
                                '&::-webkit-scrollbar': { width: 6 },
                                '&::-webkit-scrollbar-thumb': {
                                    bgcolor: 'grey.400',
                                    borderRadius: 3,
                                },
                                '&::-webkit-scrollbar-thumb:hover': {
                                    bgcolor: 'grey.500',
                                },
                            }}
                        >
                            {variables.map((item) => (
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
                                                {item.label || item.fieldname}
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
                                </Button>
                            ))}
                        </Stack>
                    </Card>
                </Box>
            </Box>

            <Dialog
                open={createCategoryOpen}
                onClose={() => setCreateCategoryOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>New HR Document Category</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        margin="dense"
                        label="Category Name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateCategoryOpen(false)}>Cancel</Button>
                    <LoadingButton
                        onClick={handleCreateCategorySubmit}
                        variant="contained"
                        loading={creatingCategory}
                    >
                        Create
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </DashboardContent>
    );
}
