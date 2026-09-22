import { useSnackbar } from 'notistack';
import Editor from '@monaco-editor/react';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MdContentCopy } from 'react-icons/md';
import { IoMdArrowBack } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormHelperText from '@mui/material/FormHelperText';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useRouter } from 'src/routes/hooks';

import { uploadFile } from 'src/api/data-import';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  getEmailTemplate,
  fetchEmailTemplateVariables,
  updateEmailTemplate,
  EmailTemplateVariable,
  fetchEmailTemplateCategories,
  createEmailTemplateCategory,
  EmailTemplateCategory 
} from 'src/api/email-template';

import { Iconify } from 'src/components/iconify';
import { RichTextEditor } from 'src/components/rich-text-editor/rich-text-editor';

import { CustomSwitch } from 'src/sections/reminders/reminders-settings-view';

const isPlainTextEmpty = (val: string) => {
  if (!val) return true;
  const doc = new DOMParser().parseFromString(val, 'text/html');
  const text = doc.body.textContent || '';
  return text.replace(/\s/g, '').trim() === '';
};

const isHtmlCodeEmpty = (val: string) => {
  if (!val) return true;
  return val.trim() === '';
};

export function EmailTemplateEditView() {
  const router = useRouter();
  const { id } = useParams();
  const [templateFor, setTemplateFor] = useState<string[]>(['Lead']);
  const [variables, setVariables] = useState<EmailTemplateVariable[]>([]);
  const [emailContent, setEmailContent] = useState('');
  const [emailContentHtml, setEmailContentHtml] = useState('');
  const [footerContent, setFooterContent] = useState('');
  const [footerContentHtml, setFooterContentHtml] = useState('');
  const [isHtmlModeEmail, setIsHtmlModeEmail] = useState(false);
  const [isHtmlModeFooter, setIsHtmlModeFooter] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [senderName, setSenderName] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<{
    templateName?: boolean;
    category?: boolean;
    templateFor?: boolean;
    subject?: boolean;
    emailContent?: boolean;
  }>({});

  const [categoryOptions, setCategoryOptions] =  useState<EmailTemplateCategory[]>([]);

  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [fetching, setFetching] = useState(true);

  const { enqueueSnackbar } = useSnackbar();

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSave = async () => {
    const newErrors: typeof errors = {};
    const missingFields: string[] = [];

    if (!templateName) {
      newErrors.templateName = true;
      missingFields.push('Template Name');
    }
    if (!category) {
      newErrors.category = true;
      missingFields.push('Category');
    }
    if (!subject) {
      newErrors.subject = true;
      missingFields.push('Subject');
    }
    const currentEmailContent = isHtmlModeEmail ? emailContentHtml : emailContent;
    const currentFooterContent = isHtmlModeFooter ? footerContentHtml : footerContent;

    if (!currentEmailContent || currentEmailContent === '<p><br></p>' || currentEmailContent.trim() === '') {
      newErrors.emailContent = true;
      missingFields.push('Email Content');
    }

    setErrors(newErrors);

    if (missingFields.length > 0) {
      setSnackbar({
        open: true,
        message: `Please fill in mandatory fields: ${missingFields.join(', ')}`,
        severity: 'error',
      });
      return;
    }

    setIsSaving(true);
    try {
      const uploadedAttachments = await Promise.all(
        attachments.map(async (att) => {
          if (att.isRaw) {
            const result = await uploadFile(att.file, 'CRM Email Template', id!, 'attachments');
            return {
              file: result.file_url,
              description: att.description || '',
            };
          }
          return {
            name: att.name || undefined,
            file: att.file,
            description: att.description || '',
          };
        })
      );

      const finalEmailContent = isHtmlModeEmail
        ? `<!--mode:html-->${emailContentHtml}`
        : `<!--mode:plain-->${emailContent}`;

      let finalFooterContent = '';
      if (isHtmlModeFooter) {
        finalFooterContent = `<!--mode:html-->${footerContentHtml || ''}`;
      } else {
        if (footerContent && footerContent.trim() !== '' && footerContent !== '<p><br></p>' && footerContent !== '<div class="ql-editor read-mode"></div>' && footerContent !== '<div class="ql-editor read-mode"><p><br></p></div>') {
          finalFooterContent = `<!--mode:plain-->${footerContent}`;
        }
      }

      await updateEmailTemplate(id!, {
        template_name: templateName,
        category,
        template_for: templateFor.join(','),
        subject,
        email_content: finalEmailContent,
        footer_content: finalFooterContent,
        description,
        sender_name: senderName,
        reply_to_email: replyToEmail,
        is_active: isActive ? 1 : 0,
        attachments: uploadedAttachments,
      });

      // Reload attachments from backend
      const updatedDoc = await getEmailTemplate(id!);
      setAttachments(updatedDoc.attachments || []);

      setSnackbar({
        open: true,
        severity: 'success',
        message: 'Template updated successfully',
      });

      sessionStorage.setItem('email_template_success_message', 'Template updated successfully');

      setTimeout(() => {
        router.push('/email-templates');
      }, 500);
    } catch (error: any) {
      setSnackbar({
        open: true,
        severity: 'error',
        message: error.message || 'Failed to update email template.',
      });
      setIsSaving(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAttachments((prev) => [
      ...prev,
      {
        file,
        isRaw: true,
        name: file.name,
        description: '',
      },
    ]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const templateForOptions = [
    { label: 'Lead', value: 'Lead' },
    { label: 'Client', value: 'Contact' },
    { label: 'Company', value: 'Account' },
    { label: 'Prospects', value: 'Deal' },
    { label: 'Proposal', value: 'Proposal' },
  ];

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setSnackbar({
      open: true,
      severity: 'success',
      message: `Copied ${variable} to clipboard`,
    });
  };

  const handleTemplateForChange = async (values: string[]) => {
    setTemplateFor(values);

    if (values.length > 0) {
      setErrors((prev) => ({ ...prev, templateFor: false }));
    }

    try {
      const data = await fetchEmailTemplateVariables(values.join(','));
      setVariables(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!id) return;

    const loadTemplate = async () => {
      setFetching(true);

      try {
        const doc = await getEmailTemplate(id);

        setTemplateName(doc.template_name);
        setCategory(doc.category);
        setSubject(doc.subject);
        setDescription(doc.description || '');
        setSenderName(doc.sender_name || '');
        setReplyToEmail(doc.reply_to_email || '');
        setIsActive(!!doc.is_active);

        setTemplateFor(
          doc.template_for
            ? doc.template_for
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : ['Lead']
        );

        const rawEmail = doc.email_content || '';
        const rawFooter = doc.footer_content || '';

        let emailIsHtml = false;
        if (rawEmail.startsWith('<!--mode:html-->')) {
          emailIsHtml = true;
          setEmailContentHtml(rawEmail.slice('<!--mode:html-->'.length));
          setEmailContent('');
        } else if (rawEmail.startsWith('<!--mode:plain-->')) {
          emailIsHtml = false;
          setEmailContent(rawEmail.slice('<!--mode:plain-->'.length));
          setEmailContentHtml('');
        } else {
          // Fallback for legacy documents
          emailIsHtml = false;
          setEmailContent(rawEmail);
          setEmailContentHtml('');
        }
        setIsHtmlModeEmail(emailIsHtml);

        if (rawFooter.startsWith('<!--mode:html-->')) {
          setIsHtmlModeFooter(true);
          setFooterContentHtml(rawFooter.slice('<!--mode:html-->'.length));
          setFooterContent('');
        } else if (rawFooter.startsWith('<!--mode:plain-->')) {
          setIsHtmlModeFooter(false);
          setFooterContent(rawFooter.slice('<!--mode:plain-->'.length));
          setFooterContentHtml('');
        } else {
          // Fallback for legacy / empty documents: match email content mode
          setIsHtmlModeFooter(emailIsHtml);
          setFooterContent(rawFooter);
          setFooterContentHtml('');
        }

        setAttachments(doc.attachments || []);

        const savedFor = doc.template_for || 'Lead';
        const vars = await fetchEmailTemplateVariables(savedFor);
        setVariables(vars);
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };

    loadTemplate();
  }, [id]);

  useEffect(() => {
      loadCategories();
  }, []);

  const loadCategories = async () => {
      try {
          const data = await fetchEmailTemplateCategories();
          setCategoryOptions(data);
      } catch (err) {
          console.error(err);
      }
  };

  const handleCreateCategorySubmit = async () => {
      if (!newCategoryName.trim()) return;

      try {
          setCreatingCategory(true);

          const created = await createEmailTemplateCategory(newCategoryName.trim());

          const data = await fetchEmailTemplateCategories();
          setCategoryOptions(data);

          setCategory(created.name);

          setCreateCategoryOpen(false);
          setNewCategoryName('');

          setSnackbar({
              open: true,
              severity: 'success',
              message: 'Category created successfully',
          });

      } catch (error: any) {
          enqueueSnackbar(
              error.message || 'Failed to create category',
              {
                  variant: 'error',
              }
          );
      } finally {
          setCreatingCategory(false);
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
            <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
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
                  isOptionEqualToValue={(option, value) => option.name === value.name}
                  onChange={(event, newValue: any) => {
                      if (typeof newValue === 'string') {
                          setCategory(newValue);
                      } else if (newValue?.isNew) {
                          setNewCategoryName(newValue.inputValue);
                          setCreateCategoryOpen(true);
                      } else {
                          // Store the document name
                          setCategory(newValue?.name || '');
                      }

                      setErrors((prev) => ({ ...prev, category: false }));
                  }}
                  filterOptions={(options, params) => {
                      const filtered = [...options];
                      const { inputValue } = params;

                      const isExisting = options.some(
                          (option: any) =>
                              option.category.toLowerCase() === inputValue.toLowerCase()
                      );

                      if (inputValue !== '' && !isExisting) {
                          filtered.push({
                              inputValue,
                              name: '',
                              category: inputValue,
                              isNew: true,
                          } as any);
                      } else if (inputValue === '') {
                          filtered.push({
                              inputValue: '',
                              name: '',
                              category: '',
                              isNew: true,
                          } as any);
                      }

                      return filtered;
                  }}
                  getOptionLabel={(option: any) => {
                      if (typeof option === 'string') return option;
                      if (option.inputValue) return option.inputValue;
                      return option.category;
                  }}
                  renderOption={(props, option: any) => {
                      const { key, ...optionProps } = props as any;

                      return (
                          <Box
                              component="li"
                              key={key || option.name || option.category}
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
                                  <Stack direction="row" spacing={1.5} alignItems="center">
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
              <FormControl fullWidth error={errors.templateFor} required>
                <InputLabel id="template-for-label-edit">Template For</InputLabel>
                <Select
                    labelId="template-for-label-edit"
                    multiple
                    value={templateFor}
                    onChange={(e) => handleTemplateForChange(e.target.value as string[])}
                    input={<OutlinedInput label="Template For" />}
                    renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(selected as string[]).map((val) => {
                                const opt = templateForOptions.find((o) => o.value === val);
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
                    {templateForOptions.map((option) => (
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

                            {templateFor.includes(option.value) && (
                                <Iconify
                                    icon="solar:check-circle-bold"
                                    width={20}
                                    sx={{ color: 'primary.main' }}
                                />
                            )}
                        </MenuItem>
                    ))}
                </Select>
                {errors.templateFor && <FormHelperText>This field is required</FormHelperText>}
              </FormControl>

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
              Email Settings
            </Typography>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Subject"
                required
                multiline
                rows={3}
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (e.target.value) setErrors((prev) => ({ ...prev, subject: false }));
                }}
                error={errors.subject}
                helperText={errors.subject ? 'This field is required' : ''}
              />
              <TextField
                fullWidth
                label="Sender Name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
              <TextField
                fullWidth
                label="Reply To Email"
                value={replyToEmail}
                onChange={(e) => setReplyToEmail(e.target.value)}
              />
            </Stack>
          </Card>

          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Content
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: errors.emailContent ? 'error.main' : 'text.secondary',
                    }}
                  >
                    Email Content{' '}
                    <Box component="span" sx={{ color: 'error.main' }}>
                      *
                    </Box>
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        variant={!isHtmlModeEmail ? 'contained' : 'outlined'}
                        onClick={() => setIsHtmlModeEmail(false)}
                        startIcon={<Iconify icon="solar:document-bold" />}
                        disabled={isHtmlModeEmail && !isHtmlCodeEmpty(emailContentHtml)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            ...( !isHtmlModeEmail
                                ? {
                                      bgcolor: '#059669',
                                      color: 'common.white',
                                      '&:hover': {
                                          bgcolor: '#047857',
                                      },
                                  }
                                : { bgcolor: 'transparent', color: '#059669', borderColor: '#059669',
                                      '&:hover': {
                                          borderColor: '#047857',
                                          bgcolor: 'rgba(8, 163, 205, 0.08)',
                                      },
                                  }),
                        }}
                    >
                        Plain Text
                    </Button>
                    <Button
                        size="small"
                        variant={isHtmlModeEmail ? 'contained' : 'outlined'}
                        onClick={() => setIsHtmlModeEmail(true)}
                        startIcon={<Iconify icon={"solar:code-bold" as any} />}
                        disabled={!isHtmlModeEmail && !isPlainTextEmpty(emailContent)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            ...(isHtmlModeEmail
                                ? {
                                      bgcolor: '#059669',
                                      color: 'common.white',
                                      '&:hover': {
                                          bgcolor: '#047857',
                                      },
                                  }
                                : {
                                      bgcolor: 'transparent',
                                      color: '#059669',
                                      borderColor: '#059669',
                                      '&:hover': {
                                          borderColor: '#047857',
                                          bgcolor: 'rgba(8, 163, 205, 0.08)',
                                      },
                                  }),
                        }}
                    >
                        HTML Code
                    </Button>
                  </Stack>
                </Stack>

                {!isHtmlModeEmail ? (
                  <RichTextEditor
                    value={emailContent}
                    onChange={(val: string) => {
                      setEmailContent(val);
                      if (val && val !== '<p><br></p>')
                        setErrors((prev) => ({ ...prev, emailContent: false }));
                    }}
                    placeholder="Enter email content..."
                    error={errors.emailContent}
                    helperText={errors.emailContent ? 'This field is required' : undefined}
                    minHeight={600}
                  />
                ) : (
                  <Box sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: 'hidden' }}>
                    <Editor
                      height="500px"
                      defaultLanguage="html"
                      value={emailContentHtml}
                      onChange={(val) => {
                        const newValue = val || '';
                        setEmailContentHtml(newValue);
                        if (newValue.trim())
                          setErrors((prev) => ({ ...prev, emailContent: false }));
                      }}
                      options={{
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        formatOnPaste: true,
                        formatOnType: true
                      }}
                    />
                  </Box>
                )}
              </Box>
              
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ my: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: 'text.secondary' }}
                  >
                    Footer Content
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant={!isHtmlModeFooter ? 'contained' : 'outlined'}
                      onClick={() => setIsHtmlModeFooter(false)}
                      startIcon={<Iconify icon="solar:document-bold" />}
                      disabled={isHtmlModeFooter && !isHtmlCodeEmpty(footerContentHtml)}
                      sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            ...( !isHtmlModeFooter
                                ? {
                                      bgcolor: '#059669',
                                      color: 'common.white',
                                      '&:hover': {
                                          bgcolor: '#047857',
                                      },
                                  }
                                : { bgcolor: 'transparent', color: '#059669', borderColor: '#059669',
                                      '&:hover': {
                                          borderColor: '#047857',
                                          bgcolor: 'rgba(8, 163, 205, 0.08)',
                                      },
                                  }),
                        }}
                    >
                      Plain Text
                    </Button>
                    <Button
                      size="small"
                      variant={isHtmlModeFooter ? 'contained' : 'outlined'}
                      onClick={() => setIsHtmlModeFooter(true)}
                      startIcon={<Iconify icon={"solar:code-bold" as any} />}
                      disabled={!isHtmlModeFooter && !isPlainTextEmpty(footerContent)}
                      sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            ...(isHtmlModeFooter
                                ? {
                                      bgcolor: '#059669',
                                      color: 'common.white',
                                      '&:hover': {
                                          bgcolor: '#047857',
                                      },
                                  }
                                : { bgcolor: 'transparent', color: '#059669', borderColor: '#059669',
                                      '&:hover': {
                                          borderColor: '#047857',
                                          bgcolor: 'rgba(8, 163, 205, 0.08)',
                                      },
                                  }),
                        }}
                    >
                      HTML Code
                    </Button>
                  </Stack>
                </Stack>

                {!isHtmlModeFooter ? (
                  <RichTextEditor
                    value={footerContent}
                    onChange={(val: string) => setFooterContent(val)}
                    placeholder="Enter footer content..."
                    minHeight={300}
                  />
                ) : (
                  <Box sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: 'hidden' }}>
                    <Editor
                      height="300px"
                      defaultLanguage="html"
                      value={footerContentHtml}
                      onChange={(val) => setFooterContentHtml(val || '')}
                      options={{
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        formatOnPaste: true,
                        formatOnType: true
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Stack>
          </Card>

          <Box
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
              border: (theme) => `1px dashed ${alpha(theme.palette.grey[500], 0.2)}`,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2.5 }}
            >
              <Typography variant="h6">Attachments</Typography>
              <Button
                variant="contained"
                component="label"
                sx={{
                  bgcolor: '#059669',
                  color: 'common.white',
                  '&:hover': { bgcolor: '#047857' },
                }}
                size="small"
                startIcon={<Iconify icon={'solar:upload-bold' as any} />}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload File'}
                <input type="file" hidden onChange={handleFileUpload} />
              </Button>
            </Stack>

            <Stack spacing={1}>
              {attachments.length === 0 ? (
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  sx={{ py: 3, color: 'text.disabled' }}
                >
                  <Iconify
                    icon={'solar:file-bold' as any}
                    width={40}
                    height={40}
                    sx={{ mb: 1, opacity: 0.48 }}
                  />
                  <Typography variant="body2">No attachments yet</Typography>
                </Stack>
              ) : (
                attachments.map((file: any, index) => (
                  <Stack
                    key={index}
                    direction="row"
                    alignItems="center"
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1.5,
                      bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                    }}
                  >
                    <Iconify
                      icon={'solar:link-bold' as any}
                      width={20}
                      sx={{ mr: 1, color: 'text.secondary', flexShrink: 0 }}
                    />
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ flexGrow: 1, fontWeight: 'fontWeightMedium' }}
                    >
                      {typeof file === 'string' ? file.split('/').pop() : (file.file_name || file.name || file.file?.split('/').pop() || file.url?.split('/').pop() || 'Attachment')}
                    </Typography>
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => handleRemoveAttachment(index)}
                      sx={{
                        px: 1.5,
                        py: 0,
                        height: 26,
                        borderRadius: 1.5,
                        minWidth: 'auto',
                        typography: 'caption',
                        bgcolor: 'background.paper',
                        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
                        '&:hover': {
                          bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                        },
                      }}
                    >
                      Clear
                    </Button>
                  </Stack>
                ))
              )}
            </Stack>
          </Box>
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
              {variables.map((item) => {
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
                          icon={'solar:code-bold' as any}
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
                        boxShadow: (theme) =>
                          `0 6px 16px ${alpha(theme.palette.primary.main, 0.15)}`,
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
              })}
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
